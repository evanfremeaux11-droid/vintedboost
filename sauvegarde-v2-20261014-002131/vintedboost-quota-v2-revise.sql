-- VintedBoost V2 : NE PAS EXECUTER SUR LA BASE PARTAGEE AVANT VALIDATION.
-- Fonctions distinctes de use_generation (V1). Requiert Supabase service_role cote serveur.
BEGIN;
CREATE TABLE IF NOT EXISTS public.generation_reservations_v2 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','refunded')),
 quota_charged boolean NOT NULL DEFAULT false,
 quota_month date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_generation_reservations_v2_user ON public.generation_reservations_v2(user_id);
ALTER TABLE public.generation_reservations_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.generation_reservations_v2 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.generation_reservations_v2 TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_generation_v2(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.profiles%ROWTYPE; rid uuid; charged boolean; m date := date_trunc('month', now())::date;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Acces interdit'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id = p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
 IF p.quota_month IS DISTINCT FROM m THEN
  UPDATE public.profiles SET generations_used=0, quota_month=m WHERE id=p_user_id;
  p.generations_used := 0;
 END IF;
 charged := lower(trim(coalesce(p.plan,'free'))) <> 'premium';
 IF charged AND p.generations_used >= p.generations_limit THEN
  RETURN jsonb_build_object('allowed',false,'code','QUOTA_REACHED','plan',p.plan,'used',p.generations_used,'limit',p.generations_limit);
 END IF;
 IF charged THEN
  UPDATE public.profiles SET generations_used=generations_used+1 WHERE id=p_user_id;
  p.generations_used := p.generations_used+1;
 END IF;
 INSERT INTO public.generation_reservations_v2(user_id,quota_charged,quota_month)
 VALUES(p_user_id,charged,m) RETURNING id INTO rid;
 RETURN jsonb_build_object('allowed',true,'reservation_id',rid,'charged',charged,'plan',p.plan,'used',p.generations_used,'limit',p.generations_limit);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_generation_v2(p_reservation_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Acces interdit'; END IF;
 SELECT user_id INTO uid FROM public.generation_reservations_v2 WHERE id=p_reservation_id;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 UPDATE public.generation_reservations_v2 SET status='completed',completed_at=now()
 WHERE id=p_reservation_id AND user_id=uid AND status='pending';
 RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.refund_generation_v2(p_reservation_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid; r public.generation_reservations_v2%ROWTYPE;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Acces interdit'; END IF;
 SELECT user_id INTO uid FROM public.generation_reservations_v2 WHERE id=p_reservation_id;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 SELECT * INTO r FROM public.generation_reservations_v2 WHERE id=p_reservation_id FOR UPDATE;
 IF NOT FOUND OR r.status <> 'pending' THEN RETURN false; END IF;
 UPDATE public.generation_reservations_v2 SET status='refunded',completed_at=now() WHERE id=p_reservation_id;
 IF r.quota_charged THEN
  UPDATE public.profiles SET generations_used=GREATEST(generations_used-1,0)
  WHERE id=uid AND quota_month=r.quota_month;
 END IF;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_generation_v2(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_generation_v2(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_generation_v2(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_generation_v2(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_generation_v2(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_generation_v2(uuid) TO service_role;
COMMIT;
