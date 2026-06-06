# LifeDent CRM v3 — Deploy Steps

What changes in this release:

- New role `senior_doctor` for Mohamed Refaat ElBialy and Sara Selim. Senior doctors see the full Patients page and the Revenue analytics. Regular dentists no longer see these two pages.
- Two-step invoice workflow. Doctors create a draft and submit it to reception. Reception picks the payment method and closes the invoice. No edits after submission.
- Revenue counts only paid invoices. Drafts are excluded.
- Dashboard alert for the doctor when one of their drafts has been pending closure for 24h or more.

## 1. Database migration

Open Supabase SQL Editor and run `schema_v3.sql` in two separate runs. Postgres will not let you add an enum value and use it in the same transaction, so the file is split.

**Run A** (by itself first):
```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'senior_doctor';
```

**Run B** (after Run A succeeds):
```sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid'
  CHECK (status IN ('draft','paid'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id);

ALTER TABLE invoices ALTER COLUMN paid_at DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN payment_method DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_status_draft
  ON invoices(submitted_at) WHERE status = 'draft';

DROP POLICY IF EXISTS "invoices_admin" ON invoices;
DROP POLICY IF EXISTS "invoices_update_close" ON invoices;
CREATE POLICY "invoices_update_close" ON invoices
  FOR UPDATE USING (get_user_role() IN ('admin','senior_doctor','receptionist'));
```

Already-paid invoices stay paid (default value backfills the new `status` column). No data is touched.

## 2. Promote Mohamed and Sara to senior_doctor

After deploying the v3 code, sign in as admin, go to Admin Panel, find each user, and switch their role dropdown from Dentist to Senior Doctor. That is the only role change needed.

## 3. Deploy code

```powershell
cd C:\Users\khale\Desktop\lifedent-crm
# Replace files from the v3 zip, keep your local .env and the admin-create-user function
npm install
git add .
git commit -m "v3: senior_doctor role + draft/close invoice workflow + 24h stale alert"
git push
```

Vercel rebuilds automatically. The admin-create-user Edge Function deployed in v2 stays as-is; v3 does not change it.

## 4. Smoke test

1. Sign in as a regular dentist. Confirm Patients and Revenue are gone from the sidebar.
2. Sign in as Mohamed (now senior_doctor). Confirm Patients and Revenue are back.
3. As a dentist, create an invoice in Billing. Confirm the button reads "Submit to Reception" and there is no payment-method picker.
4. Sign in as receptionist. The new draft appears under "Pending Closure" on the Billing page. Close it with a payment method and confirm it prints.
5. Force a stale alert by inserting a draft with `submitted_at = now() - interval '25 hours'` and signing in as that draft's creator. The Dashboard should show the red banner.

## Role matrix (for reference)

|                    | Admin | Senior Doctor | Dentist | Receptionist |
|--------------------|:-----:|:-------------:|:-------:|:------------:|
| Dashboard          |   ✓   |       ✓       |    ✓    |       ✓      |
| Appointments       |   ✓   |       ✓       |    ✓    |       ✓      |
| New Appointment    |   ✓   |       ✓       |    ✓    |       ✓      |
| Patients (full)    |   ✓   |       ✓       |   ✗     |      ✗       |
| Follow-ups         |   ✓   |       ✓       |    ✓    |       ✓      |
| Billing — create   |   ✓   |       ✓       |    ✓    |      ✗       |
| Billing — close    |   ✓   |       ✓       |   ✗     |       ✓      |
| Revenue            |   ✓   |       ✓       |   ✗     |      ✗       |
| Messages           |   ✓   |       ✓       |    ✓    |       ✓      |
| Admin Panel        |   ✓   |      ✗        |   ✗     |      ✗       |
| Settings           |   ✓   |       ✓       |    ✓    |       ✓      |
