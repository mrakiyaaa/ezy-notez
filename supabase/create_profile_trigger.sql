-- =========================================================
-- Auto-create a profiles row whenever a new auth user signs up.
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query
-- =========================================================

-- 1. Function that inserts the profile row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER          -- runs as the function owner (bypasses RLS)
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',   -- set during email/password signUp
      NEW.raw_user_meta_data->>'name',        -- set by Google OAuth
      split_part(NEW.email, '@', 1)           -- fallback: part before @
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- safe to call multiple times
  RETURN NEW;
END;
$$;

-- 2. Trigger that fires after every new row in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
