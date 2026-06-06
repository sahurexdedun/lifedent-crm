# LifeDent CRM v4 — Deploy Steps

What changes in this release:

- Bilingual dental intake form (English + Arabic) for every patient, six sections covering personal info, medical history, surgical history, women's health, lifestyle, dental history, and chief complaint.
- New Medical tab on the patient card showing a read-only summary of the intake form.
- Clinical-flag chips (red and amber) on the patient card and inside the intake modal: pregnancy, anticoagulants, bisphosphonates, heart disease, hepatitis, HIV, penicillin or anesthesia allergy, bleeding disorder, active cancer, plus amber chips for breastfeeding, recent surgery, diabetes, latex allergy, hypertension, and heavy smoking.
- Two-step new-patient flow. After adding a patient (either from the Patients page or inline from New Appointment), the receptionist is asked "Complete medical intake now?" with options to fill or skip. The Medical tab shows a yellow "Intake form incomplete" banner until the form is filled.
- Receptionist can fill the form once. After the first save, the form becomes read-only for receptionists and only admins, senior doctors, and dentists can edit it.
- Red badge with pending-closure count next to Billing in the sidebar (and the More tab on mobile) for admins, senior doctors, and receptionists.
- Sidebar already shows the existing pending-recalls red badge on Follow-ups, unchanged.

## 1. Database migration

Open Supabase SQL Editor and run `schema_v4.sql` in a single execution. The migration is additive (one JSONB column plus two timestamps and one partial index), no enum changes, safe to run in one go.

```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS intake_form         JSONB;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS intake_completed_at TIMESTAMPTZ;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS intake_updated_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_patients_intake_null
  ON patients(id) WHERE intake_form IS NULL;
```

Existing patients keep working unchanged. Their Medical tab will show the "Intake form incomplete" banner until someone fills it.

## 2. Deploy code

```powershell
cd C:\Users\khale\Desktop\lifedent-crm
Copy-Item .env .env.backup

Expand-Archive -Path "$env:USERPROFILE\Downloads\lifedent-crm-v4.zip" `
               -DestinationPath "$env:USERPROFILE\Desktop" -Force

Get-Content package.json | Select-String version
# -> should show "version": "4.0.0"

npm install
npm run build

git add .
git commit -m "v4: bilingual dental intake form, flag chips, receptionist Billing badge"
git push
```

Vercel rebuilds automatically.

## 3. Smoke test

1. Sign in as receptionist. The sidebar Billing item should show a red badge with the count of draft invoices awaiting closure.
2. Click + New Patient on the Patients page, fill the basic info, save. The "Complete medical intake?" prompt should appear. Choose "Yes, fill now". The full bilingual form opens.
3. Tick "Pregnant" + Trimester 2. Save. The patient card header should now show a red "Pregnant · T2" chip.
4. Sign out, sign back in as receptionist, open the same patient's Medical tab. The form should be read-only. No "Edit" button. A yellow banner inside the form says "Intake already saved. Doctors can edit from here."
5. Sign in as Mohamed (senior_doctor). Same patient's Medical tab now shows an Edit button.
6. Go to New Appointment, choose "New patient", create. After the appointment is saved, the intake prompt should appear again. "Skip for now" should take you to Appointments as before.

## Patient flag colours (for clinical reference)

| Red (clinical danger)        | Amber (caution)              |
|------------------------------|------------------------------|
| Pregnant                     | Breastfeeding                |
| Anticoagulant therapy        | Recent surgery               |
| Bisphosphonates              | Diabetes                     |
| Heart disease                | Latex allergy                |
| Hepatitis B/C                | Hypertension                 |
| HIV+                         | Heavy smoker (>10/day)       |
| Penicillin allergy           |                              |
| Anesthesia allergy           |                              |
| Bleeding disorder            |                              |
| Active cancer treatment      |                              |
