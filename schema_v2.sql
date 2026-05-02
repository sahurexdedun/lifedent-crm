-- ════════════════════════════════════════════════
-- LifeDent CRM — v2 Migration
-- Adds: legacy patient IDs, dentists table, services + categories,
--       invoices + line items with atomic daily numbering.
-- Run AFTER schema.sql and schema_additions.sql.
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════

-- ─── 1. PATIENTS: legacy clinic ID ───────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS legacy_id TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_legacy_id
  ON patients(legacy_id) WHERE legacy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_phone
  ON patients(phone);

CREATE INDEX IF NOT EXISTS idx_patients_name
  ON patients(lower(name));

-- ─── 2. DENTISTS table ───────────────────────────
CREATE TABLE IF NOT EXISTS dentists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  specialty   TEXT DEFAULT '',
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dentists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dentists_read_all"    ON dentists;
DROP POLICY IF EXISTS "dentists_admin_write" ON dentists;

CREATE POLICY "dentists_read_all" ON dentists
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "dentists_admin_write" ON dentists
  FOR ALL USING (get_user_role() = 'admin');

-- Seed the 6 current doctors
INSERT INTO dentists (name, specialty, sort_order) VALUES
  ('Dr. Mohamed Refaat ElBialy', 'Cosmetic Dentistry Consultant', 1),
  ('Dr. Sara Selim',             '', 2),
  ('Dr. Karim M. Taha',          '', 3),
  ('Dr. Mohamed Talaat',         '', 4),
  ('Dr. Omar Salah',             '', 5),
  ('Dr. Youssef Galal',          '', 6)
ON CONFLICT (name) DO NOTHING;

-- ─── 3. SERVICE CATEGORIES + SERVICES ────────────
CREATE TABLE IF NOT EXISTS service_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  price        NUMERIC(10,2) DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_read_all"    ON service_categories;
DROP POLICY IF EXISTS "categories_admin_write" ON service_categories;
DROP POLICY IF EXISTS "services_read_all"      ON services;
DROP POLICY IF EXISTS "services_admin_write"   ON services;

CREATE POLICY "categories_read_all" ON service_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "categories_admin_write" ON service_categories
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "services_read_all" ON services
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "services_admin_write" ON services
  FOR ALL USING (get_user_role() = 'admin');

-- Seed categories
INSERT INTO service_categories (name, sort_order) VALUES
  ('Aesthetic',    1),
  ('Restorative',  2),
  ('Endodontics',  3),
  ('Implants',     4),
  ('Periodontics', 5),
  ('Orthodontics', 6),
  ('Pediatric',    7),
  ('General',      8)
ON CONFLICT (name) DO NOTHING;

-- Seed services (price=0; admin sets prices via Admin Panel)
INSERT INTO services (category_id, name, price, sort_order)
SELECT sc.id, x.name, 0, x.ord
FROM service_categories sc
JOIN (VALUES
  -- Aesthetic
  ('Aesthetic',    'Smile Makeover',                1),
  ('Aesthetic',    'Emax Veneers',                  2),
  ('Aesthetic',    'Feldspathic Veneers',           3),
  ('Aesthetic',    'Bleaching (In-office)',         4),
  ('Aesthetic',    'Bleaching (At Home)',           5),
  ('Aesthetic',    'Bleaching (Internal)',          6),
  ('Aesthetic',    'Zirconia Crown',                7),
  ('Aesthetic',    'Emax Crown',                    8),
  ('Aesthetic',    'Full Mouth Rehabilitation',     9),
  ('Aesthetic',    'Snap-on Smile',                10),
  -- Restorative
  ('Restorative',  'Composite Filling',             1),
  ('Restorative',  'Amalgam Replacement',           2),
  ('Restorative',  'Diastema Closure',              3),
  ('Restorative',  'Inlay / Onlay / Overlay',       4),
  ('Restorative',  'Posts & Core Build-up',         5),
  ('Restorative',  'Fluoride Application',          6),
  ('Restorative',  'Caries Management',             7),
  -- Endodontics
  ('Endodontics',  'Root Canal Treatment',          1),
  ('Endodontics',  'RCT Retreatment',               2),
  ('Endodontics',  'Abscess Management',            3),
  ('Endodontics',  'Broken File Retrieval',         4),
  -- Implants
  ('Implants',     'Dental Implant (Strauman)',     1),
  ('Implants',     'Dental Implant (European)',     2),
  ('Implants',     'Bone Graft',                    3),
  ('Implants',     'Sinus Lifting',                 4),
  -- Periodontics
  ('Periodontics', 'Scaling & Polishing',           1),
  ('Periodontics', 'Crown Lengthening',             2),
  ('Periodontics', 'Gingivectomy',                  3),
  ('Periodontics', 'Gingival Depigmentation',       4),
  ('Periodontics', 'Simple Extraction',             5),
  ('Periodontics', 'Surgical Extraction',           6),
  ('Periodontics', 'Impaction Removal',             7),
  -- Orthodontics
  ('Orthodontics', 'Clear Aligners',                1),
  ('Orthodontics', 'Fixed Metal Braces',            2),
  -- Pediatric
  ('Pediatric',    'Pediatric Check-up',            1),
  ('Pediatric',    'Pulpotomy',                     2),
  ('Pediatric',    'Pulpectomy',                    3),
  ('Pediatric',    'Zirconia Crown (Child)',        4),
  ('Pediatric',    'Pediatric Extraction',          5),
  -- General
  ('General',      'Check-up',                      1),
  ('General',      'Consultation',                  2),
  ('General',      'Other',                         3)
) AS x(cat, name, ord) ON sc.name = x.cat
ON CONFLICT (category_id, name) DO NOTHING;

-- ─── 4. INVOICE NUMBERING: atomic daily counter ──
CREATE TABLE IF NOT EXISTS invoice_counters (
  date_key  TEXT PRIMARY KEY,
  counter   INTEGER DEFAULT 0
);

ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;

-- Only the function below writes to it; no direct user access
DROP POLICY IF EXISTS "counters_no_direct_access" ON invoice_counters;
CREATE POLICY "counters_no_direct_access" ON invoice_counters
  FOR ALL USING (FALSE);

CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  today_key TEXT;
  next_num INTEGER;
BEGIN
  today_key := to_char(NOW() AT TIME ZONE 'Africa/Cairo', 'YYYYMMDD');
  INSERT INTO invoice_counters (date_key, counter) VALUES (today_key, 1)
  ON CONFLICT (date_key) DO UPDATE
    SET counter = invoice_counters.counter + 1
  RETURNING counter INTO next_num;
  RETURN today_key || '-' || lpad(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 5. INVOICES + LINE ITEMS ────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number              TEXT UNIQUE NOT NULL DEFAULT next_invoice_number(),
  appointment_id              UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id                  UUID REFERENCES patients(id)     ON DELETE SET NULL,
  -- Snapshots so deleting a patient/service doesn't break old invoices
  patient_name_snapshot       TEXT NOT NULL,
  patient_phone_snapshot      TEXT,
  patient_legacy_id_snapshot  TEXT,
  dentist_name_snapshot       TEXT,
  subtotal                    NUMERIC(10,2) DEFAULT 0,
  discount                    NUMERIC(10,2) DEFAULT 0,
  total                       NUMERIC(10,2) DEFAULT 0,
  payment_method              TEXT DEFAULT 'Cash'
                                CHECK (payment_method IN ('Cash','Card','Wallet','Bank Transfer','Other')),
  paid_at                     TIMESTAMPTZ DEFAULT NOW(),
  notes                       TEXT DEFAULT '',
  created_by                  UUID REFERENCES auth.users(id),
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
  category_snapshot TEXT,
  name_snapshot   TEXT NOT NULL,
  price_snapshot  NUMERIC(10,2) NOT NULL,
  quantity        INTEGER DEFAULT 1 CHECK (quantity > 0),
  line_total      NUMERIC(10,2) NOT NULL,
  sort_order      INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoices_paid_at  ON invoices(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_patient  ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_appt     ON invoices(appointment_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON invoice_items(invoice_id);

ALTER TABLE invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select"    ON invoices;
DROP POLICY IF EXISTS "invoices_insert"    ON invoices;
DROP POLICY IF EXISTS "invoices_admin"     ON invoices;
DROP POLICY IF EXISTS "items_select"       ON invoice_items;
DROP POLICY IF EXISTS "items_insert"       ON invoice_items;
DROP POLICY IF EXISTS "items_admin_delete" ON invoice_items;

-- All authenticated staff read invoices (revenue page needs it, billing too)
CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "invoices_admin" ON invoices
  FOR UPDATE USING (get_user_role() = 'admin');

-- Only admin deletes invoices (preserves audit trail)
DROP POLICY IF EXISTS "invoices_delete_admin" ON invoices;
CREATE POLICY "invoices_delete_admin" ON invoices
  FOR DELETE USING (get_user_role() = 'admin');

CREATE POLICY "items_select" ON invoice_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "items_insert" ON invoice_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "items_admin_delete" ON invoice_items
  FOR DELETE USING (get_user_role() = 'admin');

-- ─── 6. PROFILES: deactivation flag ──────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ════════════════════════════════════════════════
-- DONE. Verify tables in Supabase Table Editor:
--   patients (with legacy_id), dentists, service_categories,
--   services, invoices, invoice_items, invoice_counters
-- ════════════════════════════════════════════════
