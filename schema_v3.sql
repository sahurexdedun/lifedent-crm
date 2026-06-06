-- ════════════════════════════════════════════════
-- LifeDent CRM — v3 Migration
-- Adds: senior_doctor role + draft/paid invoice workflow
-- Run AFTER schema_v2.sql.
--
-- ⚠ IMPORTANT: Postgres requires the enum value to be committed
-- before it can be used in policies. Supabase SQL Editor wraps
-- everything in a single transaction, so this file MUST be run
-- in two separate SQL Editor runs.
-- ════════════════════════════════════════════════

-- ─── RUN A: enum value (run this by itself first) ─

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'senior_doctor';


-- ─── RUN B: everything else (run after Run A completes) ─

-- Invoice workflow columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid'
  CHECK (status IN ('draft','paid'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id);

-- Drafts have no payment method or paid_at until closed
ALTER TABLE invoices ALTER COLUMN paid_at DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN payment_method DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_status_draft
  ON invoices(submitted_at) WHERE status = 'draft';

-- Allow receptionist + senior_doctor + admin to close drafts (UPDATE)
DROP POLICY IF EXISTS "invoices_admin" ON invoices;
DROP POLICY IF EXISTS "invoices_update_close" ON invoices;
CREATE POLICY "invoices_update_close" ON invoices
  FOR UPDATE USING (get_user_role() IN ('admin','senior_doctor','receptionist'));

-- ════════════════════════════════════════════════
-- After running both: go to Admin Panel → Users
-- and switch Mohamed Refaat + Sara Selim from
-- 'dentist' to 'senior_doctor' via the dropdown.
-- ════════════════════════════════════════════════
