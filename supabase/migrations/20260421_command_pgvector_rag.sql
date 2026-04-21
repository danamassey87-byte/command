-- ============================================================================
-- Command · pgvector RAG (replaces Pinecone — $0/mo)
-- Four conceptual indexes in one table, partitioned by collection:
--   brain       = business docs, SOPs, playbooks
--   compliance  = ADRE rules, REAL handbook, Fair Housing, NAR
--   voice       = Dana's past writing, email templates, social captions
--   performance = what content/campaigns performed well
-- ============================================================================

-- Enable pgvector (Supabase free tier includes this)
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Document embeddings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection    TEXT NOT NULL,
    -- brain · compliance · voice · performance
  source_kind   TEXT NOT NULL,
    -- library · email-template · content-draft · call-script · sop
    -- compliance-rule · handbook · social-post · campaign-result
  source_id     UUID,                           -- nullable for imported docs
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,                  -- full text chunk
  summary       TEXT,                           -- AI-generated summary card
    -- summary cards cut query tokens ~80% per the Command spec
  embedding     vector(1536),                   -- OpenAI text-embedding-3-small dimension
  metadata      JSONB DEFAULT '{}',
    -- {category, tags[], property_id?, date, performance_metrics?}
  chunk_index   INT DEFAULT 0,                  -- for multi-chunk docs
  token_count   INT,
  owner_id      UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partition-aware indexes for fast filtered similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_collection ON document_embeddings(collection);
CREATE INDEX IF NOT EXISTS idx_embeddings_source     ON document_embeddings(source_kind, source_id);

-- HNSW index for fast vector similarity search (cosine distance)
-- Supabase free tier supports this; much faster than brute-force for <100K rows
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON document_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─── Helper function: similarity search with collection filter ───────────────
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_collection TEXT DEFAULT NULL,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  collection TEXT,
  source_kind TEXT,
  source_id UUID,
  title TEXT,
  content TEXT,
  summary TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
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
  FROM document_embeddings de
  WHERE
    (match_collection IS NULL OR de.collection = match_collection)
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── Helper: search with summary cards first (cheaper RAG) ──────────────────
-- Returns summaries for initial context; caller fetches full content only if needed
CREATE OR REPLACE FUNCTION match_summaries(
  query_embedding vector(1536),
  match_collection TEXT DEFAULT NULL,
  match_count INT DEFAULT 10,
  match_threshold FLOAT DEFAULT 0.65
)
RETURNS TABLE (
  id UUID,
  collection TEXT,
  title TEXT,
  summary TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
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
  FROM document_embeddings de
  WHERE
    (match_collection IS NULL OR de.collection = match_collection)
    AND de.summary IS NOT NULL
    AND de.chunk_index = 0    -- only first chunk's summary
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all document_embeddings" ON document_embeddings
  FOR ALL USING (true) WITH CHECK (true);
