-- ════════════════════════════════════════════════
-- LifeDent CRM — v5 Migration
-- Security hardening + audit log table
-- Run AFTER schema_v4.sql.
--
-- Safe to run in a single Supabase SQL Editor execution.
-- All changes are additive or modify FK behavior (no data loss).
-- ════════════════════════════════════════════════

-- ─── 1. Audit log table for sensitive admin actions ─────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  ts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email  TEXT,
  action       TEXT NOT NULL,            -- 'create_user', 'delete_user', 'update_role', etc.
  target_id    UUID,                     -- target user/patient/invoice id
  target_email TEXT,
  details      JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_ts        ON audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor     ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action    ON audit_log(action);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins read; nobody writes via PostgREST (the Edge Function uses service_role)
DROP POLICY IF EXISTS "audit_log_admin_read" ON audit_log;
CREATE POLICY "audit_log_admin_read" ON audit_log
  FOR SELECT USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "audit_log_no_client_writes" ON audit_log;
CREATE POLICY "audit_log_no_client_writes" ON audit_log
  FOR INSERT WITH CHECK (false);


-- ─── 2. ON DELETE SET NULL on user-referencing FKs ──────────
-- So that deleting a user via the v5 delete action doesn't orphan or break rows.

-- appointments.created_by
DO $$ BEGIN
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_created_by_fkey;
EXCEPTION WHEN undefined_object THEN END $$;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- invoices.created_by, invoices.closed_by
DO $$ BEGIN
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;
EXCEPTION WHEN undefined_object THEN END $$;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_closed_by_fkey;
EXCEPTION WHEN undefined_object THEN END $$;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_closed_by_fkey
  FOREIGN KEY (closed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- patients.created_by (only if it exists — older schemas may not have this column)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='patients' AND column_name='created_by') THEN
    EXECUTE 'ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_created_by_fkey';
    EXECUTE 'ALTER TABLE patients
             ADD CONSTRAINT patients_created_by_fkey
             FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL';
  END IF;
END $$;


-- ─── 3. Profiles cascade on auth.users delete ───────────────
-- Standard Supabase setup, but make it explicit.
DO $$ BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
EXCEPTION WHEN undefined_object THEN END $$;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- ─── 4. (OPTIONAL) Stricter patient RLS ─────────────────────
-- The lines below tighten patient table writes to admin + senior_doctor + dentist.
-- Receptionists still create patients (needed for the intake flow), but can no
-- longer edit other fields. Only enable after testing the full UI thoroughly,
-- otherwise leave commented out.
--
-- DROP POLICY IF EXISTS "patients_update_all" ON patients;
-- CREATE POLICY "patients_update_clinical_or_intake" ON patients
--   FOR UPDATE USING (
--     get_user_role() IN ('admin','senior_doctor','dentist')
--     OR (get_user_role() = 'receptionist' AND intake_completed_at IS NULL)
--   );


-- ════════════════════════════════════════════════
-- After running: rotate the Supabase service_role secret
-- (Dashboard → Settings → API → Reset service_role)
-- and update the Edge Function's SERVICE_ROLE_KEY secret.
-- ════════════════════════════════════════════════
