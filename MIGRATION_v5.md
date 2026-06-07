# LifeDent CRM v5 — Deploy Steps

What changes in this release:

- **Bug fix**: Receptionist can now fill the intake form on a new patient. The lock signal switched from "form exists" to "form was completed at least once" (the `intake_completed_at` timestamp). Receptionists keep edit access through their first save; the moment the form is committed they're locked out and only doctors/admins can edit.
- **Hard delete users**: Admin Panel now has a 🗑 button next to each user. Click → confirmation modal that requires typing the user's full name to enable Delete → permanent removal from `auth.users`. Refuses to delete the caller themselves and refuses to delete the last active admin.
- **Bilingual UI (English / العربية)**: Settings → Language card with two buttons. Toggling switches the sidebar nav, mobile bottom-nav, page titles, and Sign Out label. Clinical data, treatments, and dentist names stay in their original language. RTL layout flips automatically when Arabic is picked.
- **Security audit**: `SECURITY.md` ships in the root of the repo with a full risk review, severity-tagged action items, and operational practices for the clinic.
- **Schema hardening**: `schema_v5.sql` adds an `audit_log` table, sets explicit `ON DELETE SET NULL` on user-referencing FKs (so deleting a user doesn't orphan rows), and includes a commented-out stricter patient RLS policy you can enable later when ready.

## 1. Database migration

Open Supabase SQL Editor and run `schema_v5.sql` once. It's additive and safe.

## 2. Update the Edge Function (REQUIRED for delete to work)

Supabase Dashboard → Edge Functions → `admin-create-user` → Edit Code.

Replace the entire file content with the contents of `supabase/functions/admin-create-user/index.ts.v5` (delivered alongside the zip). Click Deploy.

Verify the `SERVICE_ROLE_KEY` secret is still set in the function's Secrets tab. If you rotate the service role key (recommended in SECURITY.md), update it here too.

## 3. Deploy code

```powershell
cd C:\Users\khale\Desktop\lifedent-crm
Copy-Item .env .env.backup

Expand-Archive -Path "$env:USERPROFILE\Downloads\lifedent-crm-v5.zip" `
               -DestinationPath "$env:USERPROFILE\Desktop" -Force

Get-Content package.json | Select-String version
# -> "version": "5.0.0"

npm install
npm run build

git add .
git commit -m "v5: receptionist intake fix + hard delete users + bilingual UI + security audit"
git push
```

## 4. Security action items (do these this week)

From `SECURITY.md`, in priority order:

1. Rotate the Supabase service_role key. Dashboard → Settings → API → Reset.
2. Update Edge Function `SERVICE_ROLE_KEY` secret to the new value.
3. Enable Multi-Factor Auth on Supabase, Vercel, and GitHub accounts.
4. Enforce stronger passwords. Supabase → Authentication → Policies.
5. Disable public email signups. Supabase → Authentication → Providers → Email.

Open `SECURITY.md` for the full list and reasoning.

## 5. Smoke test

1. Sign in as receptionist. Sidebar should still be in English. Go to + New Patient, fill basic info, save. The "Complete intake?" prompt should appear. Click "Yes, fill now". Fill at least the personal section. Save. Toast says "Intake form saved".
2. Without signing out, open the same patient's Medical tab. The Edit button should be **hidden** for receptionist now (since intake_completed_at was stamped on save).
3. Sign out, sign back in as admin. Same patient's Medical tab — Edit button is **visible**.
4. Admin Panel → 🗑 button next to a test user → confirmation modal opens → type the user's name → Delete enables → confirm. Page reloads, user is gone.
5. Try deleting yourself. Should fail with "Cannot delete yourself".
6. Try deleting the only admin (if you have a second admin to delete after). Should refuse with "Refusing to delete the last active admin".
7. Settings → Language → العربية. Sidebar nav, mobile bottom-nav, and Settings page title flip to Arabic. Patient names and clinical text stay in English. Page direction goes RTL.
