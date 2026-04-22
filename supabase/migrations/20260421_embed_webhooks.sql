-- ============================================================================
-- Auto-embed webhooks: pg_net triggers → embed-on-insert edge function
--
-- Fires on INSERT/UPDATE for key tables, calling the embed-on-insert edge
-- function via pg_net so new/updated records get vectorized into the RAG
-- knowledge base automatically.
--
-- Tables wired:
--   interactions   → INSERT only
--   contacts       → INSERT + UPDATE
--   listings       → INSERT + UPDATE
--   content_pieces → INSERT only  (mapped to "content_posts" for edge fn)
--   ai_prompts     → INSERT + UPDATE
-- ============================================================================

-- Ensure pg_net is available (should already be on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ─── Trigger function ──────────────────────────────────────────────────────────
-- Uses pg_net to POST to the embed-on-insert edge function asynchronously.
-- The service_role_key is read from vault.secrets if available, otherwise
-- falls back to the SUPABASE_SERVICE_ROLE_KEY env via current_setting.
-- ────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_embed_on_change()
RETURNS trigger AS $$
DECLARE
  _url        TEXT := 'https://lfydlxhfctuiyykuyqnr.supabase.co/functions/v1/embed-on-insert';
  _key        TEXT;
  _table_name TEXT;
BEGIN
  -- Try vault first, fall back to anon key
  BEGIN
    SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    _key := NULL;
  END;

  -- If no vault secret, try the project anon key as fallback
  IF _key IS NULL THEN
    BEGIN
      SELECT decrypted_secret INTO _key
      FROM vault.decrypted_secrets
      WHERE name = 'anon_key'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      _key := NULL;
    END;
  END IF;

  -- Last resort: use current_setting (works in some Supabase setups)
  IF _key IS NULL THEN
    BEGIN
      _key := current_setting('supabase.service_role_key', true);
    EXCEPTION WHEN OTHERS THEN
      -- Cannot authenticate — silently skip to avoid blocking the INSERT/UPDATE
      RAISE WARNING 'embed_on_change: no auth key found, skipping embedding';
      RETURN NEW;
    END;
  END IF;

  IF _key IS NULL OR _key = '' THEN
    RAISE WARNING 'embed_on_change: no auth key found, skipping embedding';
    RETURN NEW;
  END IF;

  -- Map content_pieces → content_posts for the edge function
  _table_name := TG_TABLE_NAME;
  IF _table_name = 'content_pieces' THEN
    _table_name := 'content_posts';
  END IF;

  -- Fire async HTTP POST via pg_net
  PERFORM net.http_post(
    url     := _url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body    := jsonb_build_object(
      'type',   TG_OP,
      'table',  _table_name,
      'record', to_jsonb(NEW)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Triggers ──────────────────────────────────────────────────────────────────

-- interactions: embed on INSERT
DROP TRIGGER IF EXISTS trg_embed_interactions ON interactions;
CREATE TRIGGER trg_embed_interactions
  AFTER INSERT ON interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_embed_on_change();

-- contacts: embed on INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_embed_contacts_insert ON contacts;
CREATE TRIGGER trg_embed_contacts_insert
  AFTER INSERT ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_embed_on_change();

DROP TRIGGER IF EXISTS trg_embed_contacts_update ON contacts;
CREATE TRIGGER trg_embed_contacts_update
  AFTER UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_embed_on_change();

-- listings: embed on INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_embed_listings_insert ON listings;
CREATE TRIGGER trg_embed_listings_insert
  AFTER INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_embed_on_change();

DROP TRIGGER IF EXISTS trg_embed_listings_update ON listings;
CREATE TRIGGER trg_embed_listings_update
  AFTER UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_embed_on_change();

-- content_pieces: embed on INSERT (mapped to content_posts for edge fn)
DROP TRIGGER IF EXISTS trg_embed_content_pieces ON content_pieces;
CREATE TRIGGER trg_embed_content_pieces
  AFTER INSERT ON content_pieces
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_embed_on_change();

-- ai_prompts: embed on INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_embed_ai_prompts_insert ON ai_prompts;
CREATE TRIGGER trg_embed_ai_prompts_insert
  AFTER INSERT ON ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_embed_on_change();

DROP TRIGGER IF EXISTS trg_embed_ai_prompts_update ON ai_prompts;
CREATE TRIGGER trg_embed_ai_prompts_update
  AFTER UPDATE ON ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_embed_on_change();
