-- ════════════════════════════════════════════════
-- LifeDent CRM — Schema additions
-- Run in Supabase SQL Editor AFTER the original schema.sql
-- ════════════════════════════════════════════════

-- 1. Add age + gender to patients
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS age     INTEGER,
  ADD COLUMN IF NOT EXISTS gender  TEXT CHECK (gender IN ('Male','Female','Child'));

-- 2. Add 'Arrived' to appointment statuses
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('Scheduled','Confirmed','Arrived','Completed','Cancelled','No-show'));

-- 3. Add clinic settings table (for WhatsApp config per clinic)
CREATE TABLE IF NOT EXISTS clinic_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id)
);

ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

-- Only admin can read/write settings
CREATE POLICY "settings_admin_only" ON clinic_settings
  FOR ALL USING (get_user_role() = 'admin');
