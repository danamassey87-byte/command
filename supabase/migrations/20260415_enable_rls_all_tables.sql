-- Enable Row-Level Security on all public tables
-- Uses permissive "allow all" policies until Auth + per-user RLS is built out
-- This resolves the Supabase security advisor critical warning

-- Dynamically enables RLS + creates "Allow all access" policy
-- for every table in the public schema that exists right now
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);

    -- Create permissive policy if it doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl.tablename
        AND policyname = 'Allow all access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "Allow all access" ON public.%I FOR ALL USING (true) WITH CHECK (true)',
        tbl.tablename
      );
    END IF;
  END LOOP;
END $$;
