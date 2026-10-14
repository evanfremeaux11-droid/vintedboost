-- VINTEDBOOST V2 : RESERVATIONS DE GENERATIONS
-- Ne pas executer avant validation du script complet.

CREATE TABLE IF NOT EXISTS public.generation_reservations_v2 (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'refunded')),
    quota_charged boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_generation_reservations_v2_user
ON public.generation_reservations_v2(user_id);

ALTER TABLE public.generation_reservations_v2
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.generation_reservations_v2
FROM PUBLIC, anon, authenticated;

-- Reservation atomique d'une generation
CREATE OR REPLACE FUNCTION public.reserve_generation_v2(
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_profile public.profiles%ROWTYPE;
    v_id uuid;
    v_charged boolean;
BEGIN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Acces interdit';
    END IF;

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profil introuvable';
    END IF;

    IF v_profile.quota_month < date_trunc('month', now())::date THEN
        UPDATE public.profiles
        SET generations_used = 0,
            quota_month = date_trunc('month', now())::date
        WHERE id = p_user_id;

        v_profile.generations_used := 0;
    END IF;

    v_charged := lower(trim(v_profile.plan)) <> 'premium';

    IF v_charged THEN
        IF v_profile.generations_used >= v_profile.generations_limit THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'code', 'QUOTA_REACHED'
            );
        END IF;

        UPDATE public.profiles
        SET generations_used = generations_used + 1
        WHERE id = p_user_id;
    END IF;

    INSERT INTO public.generation_reservations_v2 (
        user_id,
        quota_charged
    )
    VALUES (
        p_user_id,
        v_charged
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'allowed', true,
        'reservation_id', v_id,
        'charged', v_charged
    );
END;
$$;

-- Validation d'une generation reussie
CREATE OR REPLACE FUNCTION public.complete_generation_v2(
    p_reservation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Acces interdit';
    END IF;

    UPDATE public.generation_reservations_v2
    SET status = 'completed',
        completed_at = now()
    WHERE id = p_reservation_id
      AND status = 'pending';

    RETURN FOUND;
END;
$$;

-- Remboursement unique d'une generation echouee
CREATE OR REPLACE FUNCTION public.refund_generation_v2(
    p_reservation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_reservation public.generation_reservations_v2%ROWTYPE;
BEGIN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Acces interdit';
    END IF;

    SELECT * INTO v_reservation
    FROM public.generation_reservations_v2
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND OR v_reservation.status <> 'pending' THEN
        RETURN false;
    END IF;

    UPDATE public.generation_reservations_v2
    SET status = 'refunded',
        completed_at = now()
    WHERE id = p_reservation_id;

    IF v_reservation.quota_charged THEN
        UPDATE public.profiles
        SET generations_used = GREATEST(generations_used - 1, 0)
        WHERE id = v_reservation.user_id
          AND quota_month = date_trunc('month', now())::date;
    END IF;

    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_generation_v2(uuid)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.complete_generation_v2(uuid)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.refund_generation_v2(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_generation_v2(uuid)
TO service_role;

GRANT EXECUTE ON FUNCTION public.complete_generation_v2(uuid)
TO service_role;

GRANT EXECUTE ON FUNCTION public.refund_generation_v2(uuid)
TO service_role;