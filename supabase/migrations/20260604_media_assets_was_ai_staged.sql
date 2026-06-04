-- L8 from SECURITY_AUDIT_PUNCHLIST. media_assets.staged_from_id is a self-FK
-- with `ON DELETE SET NULL`. The intent was "this staged photo was derived
-- from media_asset X". If X gets deleted later, staged_from_id goes NULL
-- and the AI-staging lineage is lost. The only remaining marker would be
-- the "Virtually Staged" watermark in the image itself — which can be
-- cropped on social re-share.
--
-- Denormalize: add a sticky `was_ai_staged BOOLEAN NOT NULL DEFAULT FALSE`
-- column that's set when the row is created with a non-NULL staged_from_id
-- and never gets demoted. Even after the original is deleted, compliance
-- queries 6 months later can still answer "was this photo AI-edited?".

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS was_ai_staged BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill existing AI-staged rows.
UPDATE public.media_assets
   SET was_ai_staged = TRUE
 WHERE staged_from_id IS NOT NULL
   AND was_ai_staged = FALSE;

-- Trigger keeps the flag sticky: any INSERT with a non-NULL staged_from_id
-- promotes was_ai_staged to TRUE. UPDATE that NULLs staged_from_id leaves
-- was_ai_staged alone (TRUE stays TRUE).
CREATE OR REPLACE FUNCTION public.fn_media_assets_mark_staged()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.staged_from_id IS NOT NULL THEN
    NEW.was_ai_staged := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_assets_mark_staged ON public.media_assets;

CREATE TRIGGER trg_media_assets_mark_staged
  BEFORE INSERT OR UPDATE OF staged_from_id
  ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_media_assets_mark_staged();
