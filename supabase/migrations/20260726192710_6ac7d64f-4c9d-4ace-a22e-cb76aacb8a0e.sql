
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS submitted_by_device text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'official',
  ADD COLUMN IF NOT EXISTS topic_type text NOT NULL DEFAULT 'poll',
  ADD COLUMN IF NOT EXISTS location_scope text NOT NULL DEFAULT 'city',
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved';

CREATE INDEX IF NOT EXISTS issues_source_idx ON public.issues (source);
CREATE INDEX IF NOT EXISTS issues_review_status_idx ON public.issues (review_status);
CREATE INDEX IF NOT EXISTS issues_submitted_by_device_idx ON public.issues (submitted_by_device);

-- Replace public read policy so pending/rejected community topics are hidden
DROP POLICY IF EXISTS "Anyone can read issues" ON public.issues;
CREATE POLICY "Anyone can read approved issues"
  ON public.issues FOR SELECT
  TO anon, authenticated
  USING (source = 'official' OR review_status = 'approved');
