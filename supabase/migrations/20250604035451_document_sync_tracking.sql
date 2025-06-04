-- Migration to add document sync tracking
-- File: supabase/migrations/[timestamp]_document_sync_tracking.sql

-- Add columns to track SmartAdvocate document sync status
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS sa_document_id bigint UNIQUE,
  ADD COLUMN IF NOT EXISTS sa_case_id bigint,
  ADD COLUMN IF NOT EXISTS sa_modified_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'needs_update', 'error')),
  ADD COLUMN IF NOT EXISTS sync_error text,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS checksum text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_sa_document_id ON documents(sa_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_sa_case_id ON documents(sa_case_id);
CREATE INDEX IF NOT EXISTS idx_documents_sync_status ON documents(sync_status);

-- Create a view for document sync status
CREATE OR REPLACE VIEW document_sync_status AS
SELECT
  d.*,
  CASE
    WHEN d.sync_status = 'synced' AND d.last_sync_at IS NOT NULL THEN 'ready'
    WHEN d.sync_status = 'needs_update' THEN 'needs_update'
    WHEN d.sync_status = 'error' THEN 'error'
    WHEN d.sync_status = 'pending' THEN 'not_synced'
    ELSE 'unknown'
  END as display_status,
  COUNT(ds.id) as section_count,
  COUNT(ds.embedding) as embedded_section_count
FROM documents d
LEFT JOIN document_sections ds ON ds.document_id = d.id
GROUP BY d.id;

-- Function to check if document needs update
CREATE OR REPLACE FUNCTION check_document_needs_update(
  p_sa_document_id bigint,
  p_sa_modified_date timestamp with time zone,
  p_checksum text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_doc documents%ROWTYPE;
BEGIN
  SELECT * INTO v_existing_doc
  FROM documents
  WHERE sa_document_id = p_sa_document_id;

  IF NOT FOUND THEN
    RETURN false; -- Document doesn't exist, needs to be created
  END IF;

  -- Check by checksum if provided
  IF p_checksum IS NOT NULL AND v_existing_doc.checksum IS NOT NULL THEN
    RETURN p_checksum != v_existing_doc.checksum;
  END IF;

  -- Otherwise check by modified date
  RETURN p_sa_modified_date > v_existing_doc.sa_modified_date;
END;
$$;

-- Update RLS policies for new columns
CREATE POLICY "Users can update document sync status"
ON documents FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);
