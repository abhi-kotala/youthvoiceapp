ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT 'Fargo';
UPDATE public.issues SET city = 'West Fargo' WHERE title ILIKE '%west fargo%';
UPDATE public.issues SET city = 'Moorhead' WHERE title ILIKE '%moorhead%';
CREATE INDEX IF NOT EXISTS issues_city_idx ON public.issues (city);