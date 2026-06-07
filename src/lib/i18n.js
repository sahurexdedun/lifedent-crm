// src/lib/i18n.js
// Lightweight UI-chrome translation. Treatments, dentist names, and
// patient data stay in their original language by design.

export const STRINGS = {
  // ── Sidebar nav + page titles ────────────────────────
  nav_dashboard:    { en: "Dashboard",        ar: "الرئيسية" },
  nav_appointments: { en: "Appointments",     ar: "المواعيد" },
  nav_newAppt:      { en: "New Appointment",  ar: "موعد جديد" },
  nav_patients:     { en: "Patients",         ar: "المرضى" },
  nav_followups:    { en: "Follow-ups",       ar: "المتابعات" },
  nav_billing:      { en: "Billing",          ar: "الفواتير" },
  nav_revenue:      { en: "Revenue",          ar: "الإيرادات" },
  nav_messages:     { en: "Messages",         ar: "الرسائل" },
  nav_admin:        { en: "Admin Panel",      ar: "لوحة الإدارة" },
  nav_settings:     { en: "Settings",         ar: "الإعدادات" },
  signOut:          { en: "Sign Out",         ar: "تسجيل الخروج" },

  // ── Mobile bottom-nav short labels ───────────────────
  mob_home:     { en: "Home",     ar: "الرئيسية" },
  mob_today:    { en: "Today",    ar: "اليوم" },
  mob_new:      { en: "New",      ar: "جديد" },
  mob_patients: { en: "Patients", ar: "المرضى" },
  mob_more:     { en: "More",     ar: "المزيد" },

  // ── Common buttons + actions ─────────────────────────
  save:    { en: "Save",   ar: "حفظ" },
  cancel:  { en: "Cancel", ar: "إلغاء" },
  edit:    { en: "Edit",   ar: "تعديل" },
  delete:  { en: "Delete", ar: "حذف" },
  add:     { en: "Add",    ar: "إضافة" },
  search:  { en: "Search", ar: "بحث" },
  close:   { en: "Close",  ar: "إغلاق" },
  yes:     { en: "Yes",    ar: "نعم" },
  no:      { en: "No",     ar: "لا" },
  confirm: { en: "Confirm",ar: "تأكيد" },
  reset:   { en: "Reset",  ar: "إعادة" },
  back:    { en: "Back",   ar: "رجوع" },
  next:    { en: "Next",   ar: "التالي" },
  print:   { en: "Print",  ar: "طباعة" },

  // ── Status terms ─────────────────────────────────────
  st_today:       { en: "Today",       ar: "اليوم" },
  st_upcoming:    { en: "Upcoming",    ar: "قادم" },
  st_pending:     { en: "Pending",     ar: "قيد الانتظار" },
  st_completed:   { en: "Completed",   ar: "مكتمل" },
  st_cancelled:   { en: "Cancelled",   ar: "ملغي" },
  st_paid:        { en: "Paid",        ar: "مدفوع" },
  st_draft:       { en: "Draft",       ar: "مسودة" },

  // ── Settings page ────────────────────────────────────
  settings_language:    { en: "Language",            ar: "اللغة" },
  settings_lang_en:     { en: "English",             ar: "إنجليزي" },
  settings_lang_ar:     { en: "العربية (Arabic)",    ar: "العربية" },
  settings_account:     { en: "Account",             ar: "الحساب" },
  settings_signOutAll:  { en: "Sign out of all devices", ar: "تسجيل الخروج من كل الأجهزة" },

  // ── Common page chrome ───────────────────────────────
  loading:           { en: "Loading…",          ar: "جارٍ التحميل…" },
  noResults:         { en: "No results",        ar: "لا توجد نتائج" },
  searchPatients:    { en: "Search patients…",  ar: "ابحث عن مريض…" },
  newPatient:        { en: "+ New Patient",     ar: "+ مريض جديد" },
  newAppt:           { en: "+ New Appointment", ar: "+ موعد جديد" },
};

// Returns the localized string for a key.
// Falls back to English if the AR string is missing.
export function t(key, lang = "en") {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

// Detect if RTL layout should be applied
export function isRTL(lang) { return lang === "ar"; }

// Get / set language preference (localStorage)
export function getStoredLang() {
  try { return localStorage.getItem("lifedent_lang") || "en"; }
  catch { return "en"; }
}
export function setStoredLang(lang) {
  try { localStorage.setItem("lifedent_lang", lang); } catch {}
}
