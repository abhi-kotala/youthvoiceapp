ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_unique ON public.profiles (lower(handle));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_handle_format CHECK (handle IS NULL OR handle ~ '^[a-zA-Z0-9_]{3,20}$');