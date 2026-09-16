ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length CHECK (char_length(bio) <= 180);

UPDATE public.profiles
SET handle = 'user_' || right(replace(user_id::text, '-', ''), 15)
WHERE handle IS NULL OR btrim(handle) = '';

ALTER TABLE public.profiles
  ALTER COLUMN handle SET NOT NULL;