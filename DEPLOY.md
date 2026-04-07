# LifeDent CRM — Deploy Guide
# ~30 minutes start to finish

---

## STEP 1 — Supabase project

1. Go to supabase.com → New project
2. Name: `lifedent-crm` | Region: pick closest to Egypt (eu-central-1 Frankfurt)
3. Set a strong DB password — save it somewhere safe
4. Wait ~2 minutes for provisioning

---

## STEP 2 — Run the schema

1. Supabase Dashboard → SQL Editor → New query
2. Paste the entire contents of `schema.sql`
3. Click Run
4. Confirm: you should see 6 tables in Table Editor

---

## STEP 3 — Create your first user (admin)

1. Supabase Dashboard → Authentication → Users → Add user
2. Enter the clinic owner's email + a temp password
3. Go to SQL Editor and run:

```sql
UPDATE profiles
SET role = 'admin', full_name = 'Dr. Kareem Adel'
WHERE email = 'owner@lifedent.com';
```

To add a receptionist later:
```sql
-- After they sign up (or you invite them):
UPDATE profiles
SET role = 'receptionist', full_name = 'Nadia Receptionist'
WHERE email = 'reception@lifedent.com';
```

---

## STEP 4 — Configure WhatsApp secrets

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login
supabase login

# Link to your project (get project ref from dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF

# Set WhatsApp secrets (these NEVER go in .env)
supabase secrets set WA_PHONE_NUMBER_ID=your_phone_number_id
supabase secrets set WA_ACCESS_TOKEN=your_permanent_system_user_token

# Deploy the Edge Function
supabase functions deploy send-whatsapp
```

Verify in Supabase Dashboard → Edge Functions → send-whatsapp → should show "Active"

---

## STEP 5 — Local setup

```bash
# Clone / copy the project folder
cd lifedent-crm

# Install dependencies
npm install

# Set up environment
cp .env.example .env
```

Open `.env` and fill in:
- `VITE_SUPABASE_URL` → from Supabase → Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY` → from Supabase → Settings → API → anon/public key

```bash
# Copy the dental CRM component
# Rename dental-crm.jsx → src/CRM.jsx
# In CRM.jsx, change the last export line to:
#   export default function CRM({ role, canSeeClinical, userFullName }) {
# Then use canSeeClinical to hide clinical sections from receptionists (see note below)

# Test locally
npm run dev
# → opens at http://localhost:5173
```

---

## STEP 6 — Receptionist UI restrictions

In `src/CRM.jsx`, the CRM receives `canSeeClinical` prop.
Use it to conditionally hide clinical data:

```jsx
// In patient profile panel — hide notes from receptionist
{canSeeClinical && (
  <Txta label="Clinical Notes" value={notes} ... />
)}

// In appointment detail panel — hide clinical note
{canSeeClinical && sel.clinicalNote && (
  <div>🩺 {sel.clinicalNote}</div>
)}

// In new appointment — receptionist can't add clinical note at all
// (DB enforces this via appointment_notes RLS anyway)
```

The DB enforces this at Postgres level regardless of UI changes.

---

## STEP 7 — Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (first time — it will ask you to log in)
vercel

# Set environment variables in Vercel
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
# (paste the values when prompted, select all environments)

# Deploy to production
vercel --prod
```

You'll get a URL like `lifedent-crm.vercel.app`
Set a custom domain in Vercel Dashboard if needed (e.g. `crm.lifedent.com`)

---

## STEP 8 — Verify everything works

- [ ] Open the deployed URL → Login page appears
- [ ] Sign in as admin → full CRM visible
- [ ] Create a receptionist account → invite via Supabase Auth → sign in → confirm they CANNOT see clinical notes
- [ ] Create a test appointment → check it appears in Supabase Table Editor
- [ ] Send a test WhatsApp (Settings page) → check Edge Function logs in Supabase

---

## Adding new staff

1. Supabase Dashboard → Authentication → Invite user (sends email)
2. They set their password via the email link
3. You run:
```sql
UPDATE profiles SET role = 'receptionist', full_name = 'Name Here'
WHERE email = 'staff@email.com';
```
Done — they can log in immediately.

---

## Supabase Edge Function logs

Supabase Dashboard → Edge Functions → send-whatsapp → Logs
If a WhatsApp send fails, the error appears here with full detail.

---

## Security summary

| What                        | Protected by             |
|-----------------------------|--------------------------|
| Clinical notes              | Supabase RLS + UI        |
| Patient DOB / medical flags | Supabase RLS + UI        |
| WhatsApp token              | Supabase Edge Fn secrets |
| DB access                   | Supabase RLS (anon key is safe to expose) |
| Route protection            | Auth session check in App.jsx |

The anon key in `.env` is safe to ship in the frontend — it has no power without a valid user session, and RLS limits what each session can see.
