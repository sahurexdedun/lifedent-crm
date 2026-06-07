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
  optional:{ en: "(optional)", ar: "(اختياري)" },
  required:{ en: "*",      ar: "*" },

  // ── Greetings + dashboard chrome ─────────────────────
  greet_morning:     { en: "Good morning",    ar: "صباح الخير" },
  greet_afternoon:   { en: "Good afternoon",  ar: "مساء الخير" },
  greet_evening:     { en: "Good evening",    ar: "مساء الخير" },
  dash_today_stat:   { en: "TODAY",           ar: "اليوم" },
  dash_patients_stat:{ en: "PATIENTS",        ar: "المرضى" },
  dash_pending_recalls:{ en: "PENDING RECALLS", ar: "متابعات معلقة" },
  dash_completed:    { en: "COMPLETED",       ar: "مكتمل" },
  dash_appointments_lc:{ en: "appointments",  ar: "موعد" },
  dash_upcoming:     { en: "Upcoming Appointments", ar: "المواعيد القادمة" },
  dash_recall_alerts:{ en: "Recall Alerts",   ar: "تنبيهات المتابعة" },
  dash_no_upcoming:  { en: "No upcoming appointments.", ar: "لا توجد مواعيد قادمة." },
  dash_invoices_pending: { en: "invoices awaiting reception closure", ar: "فواتير في انتظار الإغلاق من الاستقبال" },
  dash_oldest_submitted: { en: "Oldest submitted",  ar: "الأقدم منذ" },
  dash_h_ago:        { en: "h ago",           ar: "ساعة" },
  dash_check_with_reception: { en: "Check with reception so patients aren't waiting.", ar: "تواصل مع الاستقبال حتى لا ينتظر المرضى." },

  // ── Status badges (appointments, invoices) ───────────
  st_today:       { en: "Today",       ar: "اليوم" },
  st_upcoming:    { en: "Upcoming",    ar: "قادم" },
  st_pending:     { en: "Pending",     ar: "قيد الانتظار" },
  st_scheduled:   { en: "Scheduled",   ar: "مجدول" },
  st_confirmed:   { en: "Confirmed",   ar: "مؤكد" },
  st_completed:   { en: "Completed",   ar: "مكتمل" },
  st_cancelled:   { en: "Cancelled",   ar: "ملغي" },
  st_noShow:      { en: "No-show",     ar: "لم يحضر" },
  st_sent:        { en: "Sent",        ar: "مرسل" },
  st_resolved:    { en: "Resolved",    ar: "تم" },
  st_paid:        { en: "Paid",        ar: "مدفوع" },
  st_draft:       { en: "Draft",       ar: "مسودة" },

  // ── New Appointment page ─────────────────────────────
  na_title:       { en: "New Appointment", ar: "موعد جديد" },
  na_patient:     { en: "Patient",         ar: "المريض" },
  na_existing:    { en: "Existing Patient",ar: "مريض موجود" },
  na_new:         { en: "New Patient",     ar: "مريض جديد" },
  na_selectPatient:{en: "SELECT PATIENT",  ar: "اختر المريض" },
  na_fullName:    { en: "FULL NAME",       ar: "الاسم بالكامل" },
  na_phone:       { en: "PHONE",           ar: "الهاتف" },
  na_age:         { en: "AGE",             ar: "العمر" },
  na_gender:      { en: "GENDER",          ar: "النوع" },
  na_g_male:      { en: "Male",            ar: "ذكر" },
  na_g_female:    { en: "Female",          ar: "أنثى" },
  na_g_child:     { en: "Child",           ar: "طفل" },
  na_notes:       { en: "NOTES",           ar: "ملاحظات" },
  na_apptDetails: { en: "Appointment Details", ar: "تفاصيل الموعد" },
  na_date:        { en: "DATE",            ar: "التاريخ" },
  na_time:        { en: "TIME",            ar: "الوقت" },
  na_service:     { en: "SERVICE",         ar: "الخدمة" },
  na_dentist:     { en: "DENTIST",         ar: "الطبيب" },
  na_recNotes:    { en: "RECEPTION NOTES", ar: "ملاحظات الاستقبال" },
  na_sendWA:      { en: "Also send WhatsApp confirmation", ar: "أرسل أيضًا تأكيد عبر واتساب" },
  na_saveAppt:    { en: "Save Appointment",ar: "حفظ الموعد" },

  // ── Appointments page ────────────────────────────────
  ap_title:        { en: "Appointments",      ar: "المواعيد" },
  ap_today:        { en: "Today's Appointments", ar: "مواعيد اليوم" },
  ap_upcoming:     { en: "Upcoming Appointments", ar: "المواعيد القادمة" },
  ap_past:         { en: "Past Appointments", ar: "المواعيد السابقة" },
  ap_none:         { en: "No appointments.",  ar: "لا توجد مواعيد." },
  ap_filter_all:   { en: "All",               ar: "الكل" },
  ap_sendReminder: { en: "Send Reminder",     ar: "إرسال تذكير" },
  ap_markCompleted:{ en: "Mark Completed",    ar: "تم الإنجاز" },

  // ── Patients page chrome ─────────────────────────────
  pa_title:        { en: "Patients",          ar: "المرضى" },
  pa_search:       { en: "Search patients…",  ar: "ابحث عن مريض…" },
  pa_addOld:       { en: "+ Add Old Patient", ar: "+ إضافة مريض قديم" },
  pa_import:       { en: "+ Import CSV",      ar: "+ استيراد من ملف" },
  pa_tab_overview: { en: "Overview",          ar: "نظرة عامة" },
  pa_tab_medical:  { en: "Medical",           ar: "البيانات الطبية" },
  pa_tab_visits:   { en: "Visits",            ar: "الزيارات" },
  pa_tab_recalls:  { en: "Recalls",           ar: "المتابعات" },
  pa_clinicalNotes:{ en: "Clinical Notes",    ar: "ملاحظات إكلينيكية" },
  pa_saveNotes:    { en: "Save Notes",        ar: "حفظ الملاحظات" },
  pa_createRecall: { en: "+ Create Recall",   ar: "+ إنشاء متابعة" },
  pa_noVisits:     { en: "No visits yet.",    ar: "لا توجد زيارات بعد." },
  pa_noRecalls:    { en: "No recalls.",       ar: "لا توجد متابعات." },

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
  saving:            { en: "Saving…",           ar: "جارٍ الحفظ…" },
  saved:             { en: "Saved",             ar: "تم الحفظ" },

  // ── Follow-ups page ──────────────────────────────────
  fu_title:        { en: "Follow-ups & Recalls", ar: "المتابعات" },
  fu_pending:      { en: "Pending",      ar: "قيد الانتظار" },
  fu_sent:         { en: "Sent",         ar: "تم الإرسال" },
  fu_resolved:     { en: "Resolved",     ar: "تم" },
  fu_dueSoon:      { en: "due soon",     ar: "قريبًا" },
  fu_overdue:      { en: "overdue",      ar: "متأخر" },
  fu_dueIn:        { en: "due in",       ar: "خلال" },
  fu_days:         { en: "days",         ar: "يوم" },
  fu_day:          { en: "day",          ar: "يوم" },
  fu_sendReminder: { en: "Send reminder",ar: "إرسال تذكير" },
  fu_markSent:     { en: "Mark sent",    ar: "تم الإرسال" },
  fu_markResolved: { en: "Mark resolved",ar: "تم الإنجاز" },
  fu_due:          { en: "Due",          ar: "موعد" },
  fu_type:         { en: "Type",         ar: "النوع" },
  fu_none:         { en: "No follow-ups in this view.", ar: "لا توجد متابعات." },
  fu_filter_all:   { en: "All",          ar: "الكل" },

  // ── Appointments detail rows ─────────────────────────
  ap_send:         { en: "Send WhatsApp",   ar: "إرسال واتساب" },
  ap_complete:     { en: "Complete",        ar: "إنجاز" },
  ap_cancel:       { en: "Cancel appt",     ar: "إلغاء الموعد" },
  ap_addNote:      { en: "Add note",        ar: "إضافة ملاحظة" },
  ap_at:           { en: "at",              ar: "في" },
  ap_with:         { en: "with",            ar: "مع" },
  ap_dateTime:     { en: "Date & Time",     ar: "التاريخ والوقت" },
  ap_serviceLbl:   { en: "Service",         ar: "الخدمة" },
  ap_dentistLbl:   { en: "Dentist",         ar: "الطبيب" },
  ap_statusLbl:    { en: "Status",          ar: "الحالة" },
  ap_recNotesLbl:  { en: "Reception notes", ar: "ملاحظات الاستقبال" },
  ap_clinNotesLbl: { en: "Clinical notes",  ar: "ملاحظات إكلينيكية" },
  ap_minutesAgo:   { en: "min ago",         ar: "دقيقة" },
  ap_hoursAgo:     { en: "h ago",           ar: "ساعة" },

  // ── Patient card chrome (the right detail panel) ─────
  pc_clinicalNotes:{ en: "Clinical Notes",  ar: "ملاحظات إكلينيكية" },
  pc_visits:       { en: "Visits",          ar: "الزيارات" },
  pc_recalls:      { en: "Recalls",         ar: "المتابعات" },
  pc_recallType:   { en: "Recall Type",     ar: "نوع المتابعة" },
  pc_label:        { en: "Label",           ar: "العنوان" },
  pc_dueDate:      { en: "Due Date",        ar: "تاريخ الاستحقاق" },
  pc_saveNotes:    { en: "Save Notes",      ar: "حفظ الملاحظات" },
  pc_createRecall: { en: "+ Create Recall", ar: "+ إنشاء متابعة" },
  pc_noVisits:     { en: "No visits yet.",  ar: "لا توجد زيارات بعد." },
  pc_noRecalls:    { en: "No recalls.",     ar: "لا توجد متابعات." },
  pc_legacyId:     { en: "Old ID",          ar: "الرقم القديم" },
  pc_close:        { en: "Close",           ar: "إغلاق" },

  // ── Billing page ─────────────────────────────────────
  bi_title:        { en: "Billing",                ar: "الفواتير" },
  bi_pendingClose: { en: "Pending Closure",        ar: "في انتظار الإغلاق" },
  bi_createNew:    { en: "Create New",             ar: "إنشاء جديد" },
  bi_submitNew:    { en: "Submit New Invoice",     ar: "إرسال فاتورة جديدة" },
  bi_completedAppts:{en: "Completed Appointments", ar: "المواعيد المكتملة" },
  bi_noCompleted:  { en: "No completed appointments awaiting invoice.", ar: "لا توجد مواعيد مكتملة بانتظار فاتورة." },
  bi_noPending:    { en: "No drafts awaiting closure.", ar: "لا توجد فواتير في انتظار الإغلاق." },
  bi_walkIn:       { en: "+ Walk-in",              ar: "+ مريض عابر" },
  bi_invoiceDetails:{en: "Invoice Details",        ar: "تفاصيل الفاتورة" },
  bi_services:     { en: "Services",               ar: "الخدمات" },
  bi_addLine:      { en: "+ Add line",             ar: "+ إضافة بند" },
  bi_discount:     { en: "Discount (EGP)",         ar: "خصم (جنيه)" },
  bi_notesOpt:     { en: "Notes (optional)",       ar: "ملاحظات (اختياري)" },
  bi_subtotal:     { en: "Subtotal",               ar: "المجموع الفرعي" },
  bi_total:        { en: "TOTAL",                  ar: "الإجمالي" },
  bi_submitToReception:{en:"Submit to Reception",  ar: "إرسال للاستقبال" },
  bi_submitting:   { en: "Submitting…",            ar: "جارٍ الإرسال…" },
  bi_closeAndPrint:{ en: "Close & Print",          ar: "إغلاق وطباعة" },
  bi_closeNoPrint: { en: "Close (no print)",       ar: "إغلاق فقط" },
  bi_closeInvoice: { en: "Close Invoice",          ar: "إغلاق فاتورة" },
  bi_closing:      { en: "Closing…",               ar: "جارٍ الإغلاق…" },
  bi_payMethod:    { en: "Payment Method",         ar: "طريقة الدفع" },
  bi_viewItems:    { en: "View items",             ar: "عرض البنود" },
  bi_recentPaid:   { en: "Recent Paid Invoices",   ar: "الفواتير المدفوعة الأخيرة" },
  bi_draftSubmitted:{en: "Draft Submitted",        ar: "تم إرسال المسودة" },
  bi_draftHash:    { en: "Draft #",                ar: "مسودة #" },
  bi_waitingClose: { en: "Waiting for reception to close.", ar: "في انتظار الاستقبال لإغلاق الفاتورة." },
  bi_newDraft:     { en: "+ New Draft",            ar: "+ مسودة جديدة" },
  bi_pmNote:       { en: "💡 Payment method is set by reception when closing the invoice.", ar: "💡 يتم تحديد طريقة الدفع من قبل الاستقبال عند إغلاق الفاتورة." },
  bi_hSubtitle_doctor:    { en: "Submit invoices to reception for closing.", ar: "إرسال الفواتير للاستقبال للإغلاق." },
  bi_hSubtitle_reception: { en: "Close pending invoices submitted by doctors.", ar: "إغلاق الفواتير المعلقة المرسلة من الأطباء." },
  bi_hSubtitle_both:      { en: "Create new invoices or close pending ones.", ar: "إنشاء فواتير جديدة أو إغلاق المعلقة." },
  bi_pendingHours: { en: "h pending",              ar: "ساعة معلقة" },
  bi_pickAppt:     { en: "Pick a completed appointment from the left, or click \"+ Walk-in\" to start.", ar: "اختر موعدًا مكتملًا من اليسار، أو اضغط \"+ مريض عابر\" للبدء." },

  // ── Common errors / toasts ───────────────────────────
  err_required:    { en: "Required",       ar: "إلزامي" },
  err_invalidPhone:{ en: "Enter a valid number", ar: "أدخل رقمًا صحيحًا" },
  toast_saved:     { en: "Saved",          ar: "تم الحفظ" },
  toast_error:     { en: "Error",          ar: "خطأ" },
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
