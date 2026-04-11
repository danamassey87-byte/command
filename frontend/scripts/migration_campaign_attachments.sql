-- ─────────────────────────────────────────────────────────────────────────────
-- Campaign step attachments (PDF upload support)
-- ─────────────────────────────────────────────────────────────────────────────

-- Add attachments JSONB column to campaign_steps
ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Create storage bucket for campaign attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('campaign-attachments', 'campaign-attachments', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
