ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS impact_status text NOT NULL DEFAULT 'none';
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS impact_note text;