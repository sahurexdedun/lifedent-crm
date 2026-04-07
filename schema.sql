-- ════════════════════════════════════════════════
-- LifeDent CRM — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════

-- ── 1. ROLE ENUM ─────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'dentist', 'receptionist');

-- ── 2. PROFILES ──────────────────────────────────
-- Auto-created when a user signs up via trigger below.
-- Admin sets roles manually in the dashboard or via admin UI.
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT NOT NULL DEFAULT '',
  role        user_role NOT NULL DEFAULT 'receptionist',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: create profile automatically on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 3. PATIENTS (basic info — all roles can read) ─
CREATE TABLE patients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id)
);

-- ── 4. PATIENT CLINICAL (admin + dentist only) ────
-- Separated deliberately. RLS blocks receptionists at DB level.
CREATE TABLE patient_clinical (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  dob           DATE,
  notes         TEXT DEFAULT '',   -- allergies, conditions, preferences
  medical_flags TEXT DEFAULT '',   -- e.g. "Allergic to penicillin"
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_by    UUID REFERENCES auth.users(id)
);

-- ── 5. APPOINTMENTS ───────────────────────────────
CREATE TABLE appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  dt                  TIMESTAMPTZ NOT NULL,
  service             TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'Scheduled'
                        CHECK (status IN ('Scheduled','Confirmed','Completed','Cancelled','No-show')),
  dentist             TEXT NOT NULL,
  reception_notes     TEXT DEFAULT '',
  reminder_24h_sent   BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES auth.users(id)
);

-- ── 6. APPOINTMENT CLINICAL NOTES (admin + dentist only) ─
CREATE TABLE appointment_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  clinical_note   TEXT DEFAULT '',
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_by      UUID REFERENCES auth.users(id)
);

-- ── 7. RECALLS ────────────────────────────────────
CREATE TABLE recalls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  due_date    DATE NOT NULL,
  type        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'Pending'
                CHECK (status IN ('Pending','Completed','Cancelled')),
  last_sent   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. MESSAGES (WhatsApp log) ────────────────────
CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel    TEXT NOT NULL DEFAULT 'WhatsApp',
  to_number  TEXT NOT NULL,
  kind       TEXT NOT NULL,  -- CONFIRMATION | REMINDER | RECALL
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'Mock',
  wamid      TEXT,           -- WhatsApp message ID from Meta API
  sent_by    UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. INDEXES ────────────────────────────────────
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_dt      ON appointments(dt);
CREATE INDEX idx_recalls_patient      ON recalls(patient_id);
CREATE INDEX idx_recalls_due          ON recalls(due_date);
CREATE INDEX idx_patient_clinical     ON patient_clinical(patient_id);
CREATE INDEX idx_appt_notes           ON appointment_notes(appointment_id);
CREATE INDEX idx_messages_created     ON messages(created_at DESC);

-- ════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── PROFILES ─────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admins can read all profiles (for user management)
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (get_user_role() = 'admin');

-- Users can update their own profile (name only, not role)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Only admins can update roles
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (get_user_role() = 'admin');

-- ── PATIENTS ─────────────────────────────────────
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_select_all" ON patients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "patients_insert_all" ON patients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "patients_update_all" ON patients
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Only admin can delete patients
CREATE POLICY "patients_delete_admin" ON patients
  FOR DELETE USING (get_user_role() = 'admin');

-- ── PATIENT CLINICAL (restricted) ────────────────
ALTER TABLE patient_clinical ENABLE ROW LEVEL SECURITY;

-- Receptionists are BLOCKED. Only admin + dentist.
CREATE POLICY "clinical_select_clinical_roles" ON patient_clinical
  FOR SELECT USING (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY "clinical_insert_clinical_roles" ON patient_clinical
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY "clinical_update_clinical_roles" ON patient_clinical
  FOR UPDATE USING (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY "clinical_delete_admin" ON patient_clinical
  FOR DELETE USING (get_user_role() = 'admin');

-- ── APPOINTMENTS ─────────────────────────────────
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appt_select_all" ON appointments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "appt_insert_all" ON appointments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "appt_update_all" ON appointments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "appt_delete_admin" ON appointments
  FOR DELETE USING (get_user_role() = 'admin');

-- ── APPOINTMENT NOTES (restricted) ───────────────
ALTER TABLE appointment_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appt_notes_select" ON appointment_notes
  FOR SELECT USING (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY "appt_notes_insert" ON appointment_notes
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY "appt_notes_update" ON appointment_notes
  FOR UPDATE USING (get_user_role() IN ('admin', 'dentist'));

-- ── RECALLS ──────────────────────────────────────
ALTER TABLE recalls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recalls_all_auth" ON recalls
  FOR ALL USING (auth.role() = 'authenticated');

-- ── MESSAGES ─────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_all" ON messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "messages_insert_all" ON messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only admin can delete message logs
CREATE POLICY "messages_delete_admin" ON messages
  FOR DELETE USING (get_user_role() = 'admin');

-- ════════════════════════════════════════════════
-- SEED: first admin user
-- After running this schema, invite your first user via
-- Supabase Auth, then run:
--
--   UPDATE profiles SET role = 'admin', full_name = 'Dr. Kareem Adel'
--   WHERE email = 'your@email.com';
--
-- ════════════════════════════════════════════════
