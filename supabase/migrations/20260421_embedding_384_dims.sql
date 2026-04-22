-- ============================================================================
-- Alter document_embeddings to use 384 dimensions (sentence-transformers/all-MiniLM-L6-v2)
-- This model is available FREE via HuggingFace Inference API — no API key needed.
-- 384 dims is plenty for semantic search at our scale (<100K rows).
-- ============================================================================

-- Drop the HNSW index first (can't alter a column with an active index)
DROP INDEX IF EXISTS idx_embeddings_vector;

-- Alter the embedding column from 1536 to 384 dimensions
ALTER TABLE document_embeddings
  ALTER COLUMN embedding TYPE vector(384);

-- Recreate the HNSW index for 384-dim vectors
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON document_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─── Update match_documents to use 384-dim input ─────────────────────────────
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(384),
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
    AND de.embedding IS NOT NULL
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── Update match_summaries to use 384-dim input ─────────────────────────────
CREATE OR REPLACE FUNCTION match_summaries(
  query_embedding vector(384),
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
    AND de.embedding IS NOT NULL
    AND de.chunk_index = 0
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
