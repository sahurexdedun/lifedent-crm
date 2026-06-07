-- ════════════════════════════════════════════════
-- LifeDent CRM — Realtime publication patch
-- Enables live updates across sessions for invoices,
-- patients, appointments, and recalls.
-- Run once in Supabase SQL Editor.
-- ════════════════════════════════════════════════

-- Each ALTER is idempotent: if the table is already in the publication
-- the line errors with "is already member" — we catch and ignore it so
-- the script can be re-run safely.
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE invoices;     EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE patients;     EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE appointments; EXCEPTION WHEN duplicate_object THEN END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE recalls;      EXCEPTION WHEN duplicate_object THEN END;
END $$;

-- Confirm: this should list all four tables.
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('invoices','patients','appointments','recalls')
ORDER BY tablename;
