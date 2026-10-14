-- VINTEDBOOST V2
-- Preparation du systeme de reservations
-- Ce fichier n'est pas execute automatiquement.

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

-- Les fonctions de reservation et remboursement
-- seront ajoutees apres verification de ce schema.
