-- Drop the old overloads first — CREATE OR REPLACE with a new parameter
-- creates a NEW overload, so the un-scoped old version would still be
-- callable. We want every caller routed through the secure version.
DROP FUNCTION IF EXISTS public.match_documents(vector, text, integer, double precision);
DROP FUNCTION IF EXISTS public.match_summaries(vector, text, integer, double precision);

-- H17 from SECURITY_AUDIT_PUNCHLIST: match_documents + match_summaries
-- scan every document_embeddings row regardless of owner. After multi-
-- user Auth lands, user A's AI Assistant queries would surface chunks
-- from user B's voice corpus / past emails / contact knowledge. The fix
-- is a `match_owner_id` parameter defaulting to auth.uid() that filters
-- results to the caller's own rows (plus legacy NULL-owner rows for
-- continuity).
--
-- Pre-Auth (today): auth.uid() returns NULL, so the filter matches
-- only NULL-owner rows — exactly Dana's existing corpus. No behavior
-- change.
--
-- Post-Auth: callers automatically get user-scoped results without
-- changing call sites. Once owner_id is backfilled on legacy rows the
-- `OR de.owner_id IS NULL` clause becomes a no-op.
--
-- Also applies the H11 search_path hardening these two functions
-- missed (they're INVOKER + non-trigger so the H11 sweep skipped them).

CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding  VECTOR,
  match_collection TEXT             DEFAULT NULL,
  match_count      INT              DEFAULT 5,
  match_threshold  DOUBLE PRECISION DEFAULT 0.7,
  match_owner_id   UUID             DEFAULT auth.uid()
)
RETURNS TABLE(
  id          UUID,
  collection  TEXT,
  source_kind TEXT,
  source_id   UUID,
  title       TEXT,
  content     TEXT,
  summary     TEXT,
  metadata    JSONB,
  similarity  DOUBLE PRECISION
)
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.collection,
    de.source_kind,
    de.source_id,
    de.title,
    de.content,
    de.summary,
    de.metadata,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings de
  WHERE
    (match_collection IS NULL OR de.collection = match_collection)
    AND de.embedding IS NOT NULL
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
    AND (
      match_owner_id IS NULL
      OR de.owner_id = match_owner_id
      OR de.owner_id IS NULL    -- legacy rows from pre-multi-user
    )
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


CREATE OR REPLACE FUNCTION public.match_summaries(
  query_embedding  VECTOR,
  match_collection TEXT             DEFAULT NULL,
  match_count      INT              DEFAULT 10,
  match_threshold  DOUBLE PRECISION DEFAULT 0.65,
  match_owner_id   UUID             DEFAULT auth.uid()
)
RETURNS TABLE(
  id         UUID,
  collection TEXT,
  title      TEXT,
  summary    TEXT,
  metadata   JSONB,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.collection,
    de.title,
    de.summary,
    de.metadata,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings de
  WHERE
    (match_collection IS NULL OR de.collection = match_collection)
    AND de.summary IS NOT NULL
    AND de.embedding IS NOT NULL
    AND de.chunk_index = 0
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
    AND (
      match_owner_id IS NULL
      OR de.owner_id = match_owner_id
      OR de.owner_id IS NULL
    )
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
