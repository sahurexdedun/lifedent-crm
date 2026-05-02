# Lifedent CRM — v2 Migration Guide

This guide upgrades your existing v1 deployment to v2, which adds:

1. **Bulk Excel patient import** + manual "Add Old Patient" with legacy clinic IDs
2. **Admin Panel** — manage staff users, dentists, and service catalog
3. **Billing** — multi-line invoices with printable Lifedent-branded receipts (date-based numbering: `20260502-001`)
4. **Revenue analytics** (admin only) — date-range filter, breakdowns by category and dentist

---

## ⚠ Run these in order

### 1. Database migration

Open **Supabase Dashboard → SQL Editor** and run the new migration:

```
schema_v2.sql
```

This is **idempotent and additive** — it won't touch existing tables. It adds:

- `patients.legacy_id` column + indexes for phone and name dedup
- `dentists` table (seeded with the 6 current doctors)
- `service_categories` + `services` tables (seeded from the v1 hardcoded list, all prices = 0)
- `invoice_counters` + atomic `next_invoice_number()` function
- `invoices` + `invoice_items` tables (with snapshots so deletes don't break audit trail)
- `profiles.is_active` column for user deactivation
- All RLS policies for the new tables

After running, verify in **Table Editor** that all new tables exist and the dentists table contains 6 rows.

### 2. Deploy the new Edge Function

The new Admin Panel uses a server-side function to invite users (Service Role key never touches the browser).

```bash
# From the project root
supabase functions deploy admin-create-user

# Then set the Service Role secret (one-time)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

You can find the Service Role key under **Supabase Dashboard → Project Settings → API → `service_role`**.

> ⚠ Never paste the Service Role key into frontend code or commit it to git. The Edge Function is the only place it should live.

### 3. Frontend — install + deploy

```bash
npm install      # installs new dep: xlsx
npm run build    # verify it builds
git add .
git commit -m "v2: bulk import, admin panel, billing, revenue"
git push         # Vercel auto-deploys
```

---

## Post-deploy checklist

Walk through these once on production to confirm nothing is broken:

- [ ] Log in as an admin user — sidebar should now show **Billing**, **Revenue**, **Admin Panel**
- [ ] Go to **Admin Panel → Services & Prices** — set real prices on the seeded services (everything starts at 0)
- [ ] Go to **Admin Panel → Dentists** — verify the 6 doctors are there, edit / add / deactivate as needed
- [ ] Go to **Patients** — click **+ Add Old Patient**, enter a sample patient with a legacy ID, verify it appears with the amber `ID #...` badge
- [ ] Click **↥ Import Excel** → **Download Template** — confirm the .xlsx downloads with sample rows
- [ ] Try uploading the template back — verify the preview shows and dedup works (sample rows should be skipped on second import)
- [ ] Go to **Appointments** — mark one as Completed
- [ ] Go to **Billing** — completed appointment appears in left list, click it, verify line items pre-fill from the appointment's service
- [ ] Click **Save & Print** — print preview opens with Lifedent logo, invoice number `20260502-001` format, multi-line items, EGP totals
- [ ] Go to **Revenue** — see the new invoice in the period totals; switch date range presets and confirm filtering works
- [ ] Log in as a **receptionist** user — verify they can see Billing but **NOT** Revenue or Admin Panel; verify no Excel import button is shown on Patients

---

## What's role-gated

| Page             | Admin | Dentist | Receptionist |
|------------------|:-----:|:-------:|:------------:|
| Dashboard        |  ✓    |   ✓     |     ✓        |
| Appointments     |  ✓    |   ✓     |     ✓        |
| New Appointment  |  ✓    |   ✓     |     ✓        |
| Patients         |  ✓    |   ✓     |     ✓        |
| + Add Old Patient|  ✓    |   ✓     |     ✓        |
| ↥ Import Excel   |  ✓    |   —     |     —        |
| Follow-ups       |  ✓    |   ✓     |     ✓        |
| Billing          |  ✓    |   ✓     |     ✓        |
| Revenue          |  ✓    |   —     |     —        |
| Messages         |  ✓    |   ✓     |     ✓        |
| Admin Panel      |  ✓    |   —     |     —        |
| Settings         |  ✓    |   ✓     |     ✓        |

Per Khaled's instruction: **Dr. Refaat = admin role.** No separate "owner" role.

---

## Notes on the design

- **Invoice numbering** is atomic and timezone-aware (Africa/Cairo). The `next_invoice_number()` Postgres function uses `INSERT ... ON CONFLICT DO UPDATE RETURNING` so two simultaneous invoice creations will never collide on the same number.
- **Snapshots** — invoices save the patient name, phone, legacy ID, dentist name, and per-item service name + price + category. So if you later rename a service or delete a dentist, the historical invoice prints unchanged.
- **Dedup logic** for bulk import: phone first (digits only, normalized), then case-insensitive exact name. Duplicates within the same import file are also caught (no double inserts).
- **Falls back gracefully** — if the dentists or services tables are empty, the New Appointment page falls back to the v1 hardcoded list. So even if the migration runs but seeds fail for some reason, the app keeps working.
- **localStorage is NOT used** for storage; everything is Supabase. Print preview opens in a new window (allow popups).

---

## Rollback plan

If anything goes wrong, the migration is purely additive — no v1 columns or data are modified. To roll back, simply revert the frontend deployment (Vercel keeps history) and ignore the new tables. Old code will keep working.

To remove v2 tables entirely (only if needed):

```sql
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS invoice_counters CASCADE;
DROP FUNCTION IF EXISTS next_invoice_number() CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;
DROP TABLE IF EXISTS dentists CASCADE;
ALTER TABLE patients DROP COLUMN IF EXISTS legacy_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_active;
```
