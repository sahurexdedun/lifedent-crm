-- ════════════════════════════════════════════════
-- LifeDent CRM — v4 Migration
-- Adds: dental intake form (JSONB) on patients
-- Run AFTER schema_v3.sql.
--
-- Safe to run in a single Supabase SQL Editor execution
-- (no enum changes, just additive columns).
-- ════════════════════════════════════════════════

ALTER TABLE patients ADD COLUMN IF NOT EXISTS intake_form         JSONB;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS intake_completed_at TIMESTAMPTZ;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS intake_updated_at   TIMESTAMPTZ;

-- Index for "patients missing intake" queries
CREATE INDEX IF NOT EXISTS idx_patients_intake_null
  ON patients(id) WHERE intake_form IS NULL;
