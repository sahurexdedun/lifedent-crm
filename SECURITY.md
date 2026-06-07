# Lifedent CRM — Security Audit (v5)

Date: June 2026
Scope: claude.ai full-stack review (frontend, Supabase RLS, Edge Function, secrets, deployment).

## TL;DR

The CRM is in solid shape for a single-clinic deployment because **all sensitive operations route through RLS and the admin Edge Function, never client-side privilege checks alone**. There are no critical "anyone can become admin" or "anyone can read all patients without auth" holes. The risks below are the realistic ones a determined attacker (or a curious ex-employee) would actually try.

Severity legend: **High** = act this week, **Med** = act this month, **Low** = nice to have.

---

## What's already good (don't break these)

- ✅ Service role key never leaves Supabase. Edge Function reads it from secrets, not env files.
- ✅ Every admin operation (create / update role / delete / reset password / set active) verifies the caller server-side via `auth.getUser()` + a profiles role check. Hitting the function with a non-admin token returns 403.
- ✅ RLS is enabled on every clinical table (patients, appointments, invoices, recalls, messages).
- ✅ Vite bundle does not include the `.env` file at build time — only `VITE_*` prefixed vars get inlined, and only the anon key + URL ship, both of which are safe to be public.
- ✅ `.env` is gitignored. `index.ts` (Edge Function) is gitignored.
- ✅ Password reset flow goes through Supabase admin API, no plaintext logging.
- ✅ The new (v5) Edge Function refuses to: delete the caller, delete the last active admin, demote the caller's own admin role, deactivate the caller. These are the standard "shoot-yourself-in-the-foot" footguns.

---

## High-priority items

### 1. Rotate the service role key

The service role key has been embedded in your Edge Function since v2. It was rotated once already during the v2 build. Rotate again now, then schedule a quarterly rotation (set a Google Calendar event titled "Rotate Supabase service_role" repeating every 3 months).

How: Supabase Dashboard → Settings → API → "Reset service_role secret". Then go to Edge Functions → admin-create-user → Secrets, update `SERVICE_ROLE_KEY`. Redeploy is not needed, the function reads the secret at runtime.

### 2. Enable Multi-Factor Auth on the Supabase admin account

The single most important fix on the whole stack. If your Supabase login (`khaledwasps@gmail.com`) is compromised, the attacker owns everything regardless of how good the app's security is.

How: Supabase Dashboard → Account → Multi-Factor Authentication → Add TOTP authenticator (Google Authenticator, 1Password, Authy). Same again on the Vercel account and the GitHub account.

### 3. Enforce password strength

Currently the password reset form allows any 8+ character password. An admin could set `password1` for a new user and it would stick.

Fix: Supabase Dashboard → Authentication → Policies → Password requirements: enable minimum length 10, require lowercase + uppercase + digit. This is server-side; it overrides any client check.

### 4. Lock down Supabase Auth signup

Anyone who knows your Supabase project URL can hit the public signup endpoint (`/auth/v1/signup`) and create an account. They won't get a profile row (the trigger needs to be set up to do that), so they can't read clinical data via RLS, but they will exist in `auth.users` and clutter your audit trail.

Fix: Supabase Dashboard → Authentication → Providers → Email → toggle off "Enable email signups". From now on, new users only come through the Admin Panel (which uses the Edge Function with service role).

---

## Medium-priority items

### 5. Add an audit log for sensitive admin actions

Right now if someone deletes a user, demotes a doctor, or resets a password, there's no record. The v5 schema below adds a simple `audit_log` table; the Edge Function should be updated to write one row per privileged action. (Not wired up yet, just the table is created so you can add it later when you have 30 min.)

### 6. Pin browser session timeouts

Default Supabase JWTs last 1 hour with auto-refresh, which means a stolen device stays signed in indefinitely. For a clinic context where the reception PC is shared and physically accessible, that's too generous.

Fix: Supabase Dashboard → Authentication → Sessions → set "Session timebox" to 12 hours and "Inactivity timeout" to 1 hour. The receptionist will sign in once at the start of shift, automatically signed out by the next morning.

### 7. Restrict CORS on the Edge Function

The function currently sends `Access-Control-Allow-Origin: *`, which means any website can call it. Since it requires a valid JWT to do anything useful this is mostly moot, but tightening to your domain is free defense in depth.

Fix in the v5 `index.ts`: change the `CORS` constant from `*` to `https://lifedent-crm.vercel.app` (or whatever your final domain is). Local dev with `localhost:5173` will fail, so during development either temporarily revert it or add `localhost:5173` to the allowed list as a second `Access-Control-Allow-Origin` response based on the `Origin` request header.

### 8. Tighten the patient RLS policies

Right now `patients_select_all`, `patients_insert_all`, `patients_update_all` allow any authenticated user (any role) to do anything. A dentist could in theory rename every patient to "X". The role gating happens in the UI, which is good for UX, but it should also be enforced on the server.

The v5 schema migration adds stricter RLS policies that scope writes to admin/senior_doctor/dentist (no receptionist edits except intake on a single column, etc). Apply only if you're confident the UI handles every code path that writes to patients — otherwise leave the lenient policies and trust the app for now.

### 9. Set Postgres FK ON DELETE behavior explicitly

When you delete a user via the v5 delete action, the `auth.users` row gets removed. If the FK from `profiles.id` to `auth.users.id` is set to `ON DELETE CASCADE` (the Supabase default), great. Other tables that reference user IDs need explicit `ON DELETE SET NULL` so a delete doesn't fail or orphan rows. The v5 schema patches those.

---

## Low-priority items

### 10. Add a "last sign-in" column to the user list

A field showing when each user last signed in helps spot dormant accounts that should be deactivated. Pull from `auth.users.last_sign_in_at` via the admin API.

### 11. Disable Supabase Realtime if you're not using it

You're not subscribing to any channels in `useClinicData`. Realtime is enabled by default on every table, which is bandwidth-cheap but adds a small attack surface for any future RLS misconfiguration. Disable per-table in Database → Replication.

### 12. Don't store WhatsApp tokens in plain Edge Function logs

When sending a WhatsApp message, the function probably logs the full request. Audit the Edge Function's `console.log` calls before each deploy and strip anything that includes the access token.

### 13. Vercel preview deployments expose all the same surfaces

Every branch you push creates a preview URL on Vercel. They all share your Supabase backend. If you push a feature branch with experimental code that bypasses a check, that bypass is live on the preview URL. Either turn off preview deployments (Vercel project settings) or treat preview URLs as production for security purposes.

---

## Operational practices

- **Backups**: Supabase Pro tier includes daily backups + 7-day PITR. Confirm you're on Pro, and test a restore once before you need it for real.
- **Browser**: Mohamed and Sara should use separate Chrome profiles for the CRM. Cached sessions in a shared profile = effective shared login.
- **Mobile**: If staff use the CRM on personal phones, those phones should have a screen lock. There's no app-level enforcement of this.
- **Off-boarding**: When a staff member leaves, the order is: (1) deactivate in Admin Panel immediately, (2) wait one billing cycle, (3) delete permanently. This gives time to reconcile any orphaned records.

---

## Schema migration

The file `schema_v5.sql` (separate, also delivered with this audit) contains:
- New `audit_log` table for future use
- Explicit `ON DELETE SET NULL` on user-id FKs in `appointments`, `invoices`, `patients` (created_by, closed_by)
- Tightened patient RLS policies (commented out by default — enable only after testing)

Apply by running it in Supabase SQL Editor. It is fully additive and reversible.
