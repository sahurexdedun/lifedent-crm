// src/lib/intake.js
// Bilingual labels and clinical-flag logic for the patient intake form.

export const L = {
  // ── Section titles ─────────────────────────
  s_personal:       { en: "Personal Information",   ar: "البيانات الشخصية" },
  s_medical:        { en: "Medical History",        ar: "التاريخ المرضي" },
  s_surgical:       { en: "Surgical History",       ar: "التاريخ الجراحي" },
  s_womens:         { en: "Women's Health",         ar: "صحة المرأة" },
  s_lifestyle:      { en: "Lifestyle",              ar: "نمط الحياة" },
  s_dental:         { en: "Dental History",         ar: "التاريخ السني" },
  s_complaint:      { en: "Chief Complaint",        ar: "الشكوى الرئيسية" },

  // ── Personal ───────────────────────────────
  dob:              { en: "Date of Birth",          ar: "تاريخ الميلاد" },
  gender:           { en: "Gender",                 ar: "النوع" },
  gender_male:      { en: "Male",                   ar: "ذكر" },
  gender_female:    { en: "Female",                 ar: "أنثى" },
  gender_other:     { en: "Other",                  ar: "آخر" },
  nationalId:       { en: "National ID",            ar: "الرقم القومي" },
  occupation:       { en: "Occupation",             ar: "الوظيفة" },
  marital:          { en: "Marital Status",         ar: "الحالة الاجتماعية" },
  mar_single:       { en: "Single",                 ar: "أعزب" },
  mar_married:      { en: "Married",                ar: "متزوج" },
  mar_divorced:     { en: "Divorced",               ar: "مطلق" },
  mar_widowed:      { en: "Widowed",                ar: "أرمل" },
  address:          { en: "Address",                ar: "العنوان" },
  bloodType:        { en: "Blood Type",             ar: "فصيلة الدم" },
  emName:           { en: "Emergency Contact Name", ar: "اسم جهة الاتصال الطارئة" },
  emRel:            { en: "Relation",               ar: "صلة القرابة" },
  emPhone:          { en: "Phone",                  ar: "رقم الهاتف" },

  // ── Medical (allergies) ────────────────────
  allergies:        { en: "Allergies",              ar: "الحساسية" },
  al_pen:           { en: "Penicillin",             ar: "بنسلين" },
  al_otherAb:       { en: "Other antibiotics",      ar: "مضادات حيوية أخرى" },
  al_latex:         { en: "Latex",                  ar: "لاتكس" },
  al_la:            { en: "Local anesthesia",       ar: "بنج موضعي" },
  al_other:         { en: "Other allergies",        ar: "حساسية أخرى" },

  // ── Medical (medications + conditions) ─────
  medications:      { en: "Current Medications",    ar: "الأدوية الحالية" },
  conditions:       { en: "Chronic Conditions",     ar: "الأمراض المزمنة" },
  c_diabetes:       { en: "Diabetes",               ar: "سكري" },
  c_diabetes_type:  { en: "Type (1 / 2)",           ar: "النوع (1 / 2)" },
  c_htn:            { en: "Hypertension",           ar: "ضغط مرتفع" },
  c_heart:          { en: "Heart disease",          ar: "أمراض القلب" },
  c_heart_d:        { en: "Detail",                 ar: "التفاصيل" },
  c_stroke:         { en: "Previous stroke",        ar: "سكتة دماغية سابقة" },
  c_asthma:         { en: "Asthma",                 ar: "ربو" },
  c_epilepsy:       { en: "Epilepsy / seizures",    ar: "صرع / تشنجات" },
  c_thyroid:        { en: "Thyroid disorder",       ar: "اضطراب الغدة الدرقية" },
  c_kidney:         { en: "Kidney disease",         ar: "أمراض الكلى" },
  c_liver:          { en: "Liver disease",          ar: "أمراض الكبد" },
  c_hep:            { en: "Hepatitis",              ar: "فيروس كبدي" },
  c_hep_type:       { en: "Type (B / C / Both)",    ar: "النوع (B / C / كلاهما)" },
  c_hiv:            { en: "HIV+",                   ar: "إيجابي HIV" },
  c_cancer:         { en: "Cancer",                 ar: "سرطان" },
  c_cancer_active:  { en: "Currently in treatment", ar: "تحت العلاج حاليًا" },
  c_cancer_d:       { en: "Detail",                 ar: "التفاصيل" },
  c_osteo:          { en: "Osteoporosis",           ar: "هشاشة العظام" },
  c_bisphos:        { en: "On bisphosphonates",     ar: "يتناول بايفوسفونات" },
  c_bleed:          { en: "Bleeding disorder",      ar: "اضطراب نزيف" },
  c_anticoag:       { en: "Anticoagulant therapy",  ar: "علاج مميع للدم" },
  c_anticoag_drug:  { en: "Drug name",              ar: "اسم الدواء" },

  // ── Surgical ───────────────────────────────
  recentSurgery:    { en: "Surgery in last 3 months", ar: "جراحة خلال آخر 3 شهور" },
  surgeryDetail:    { en: "Surgery detail",         ar: "تفاصيل الجراحة" },
  hospital:         { en: "Hospitalizations (last year)", ar: "دخول مستشفى (آخر سنة)" },

  // ── Women's health ─────────────────────────
  pregnant:         { en: "Pregnant",               ar: "حامل" },
  trimester:        { en: "Trimester (1 / 2 / 3)",  ar: "الثلث (1 / 2 / 3)" },
  breastfeeding:    { en: "Breastfeeding",          ar: "ترضع" },
  hormonal:         { en: "Hormonal contraception", ar: "موانع حمل هرمونية" },

  // ── Lifestyle ──────────────────────────────
  smoking:          { en: "Smoker",                 ar: "مدخن" },
  cigsPerDay:       { en: "Cigarettes / day",       ar: "سجائر / يوم" },
  alcohol:          { en: "Alcohol",                ar: "كحول" },
  al_none:          { en: "None",                   ar: "لا" },
  al_occasional:    { en: "Occasional",             ar: "أحيانًا" },
  al_regular:       { en: "Regular",                ar: "بانتظام" },

  // ── Dental ─────────────────────────────────
  lastVisit:        { en: "Last dental visit",      ar: "آخر زيارة للطبيب" },
  lastXray:         { en: "Last x-ray",             ar: "آخر أشعة" },
  brushing:         { en: "Brushing",               ar: "تنظيف الأسنان" },
  br_twice:         { en: "Twice a day",            ar: "مرتين يوميًا" },
  br_daily:         { en: "Once a day",             ar: "مرة يوميًا" },
  br_weekly:        { en: "Few times a week",       ar: "بضع مرات أسبوعيًا" },
  br_rare:          { en: "Rarely",                 ar: "نادرًا" },
  flossing:         { en: "Flossing",               ar: "استخدام الخيط" },
  fl_daily:         { en: "Daily",                  ar: "يوميًا" },
  fl_sometimes:     { en: "Sometimes",              ar: "أحيانًا" },
  fl_never:         { en: "Never",                  ar: "أبدًا" },
  bleedingGums:     { en: "Gums bleed when brushing", ar: "نزيف اللثة عند التنظيف" },
  sensitivity:      { en: "Tooth sensitivity",      ar: "حساسية الأسنان" },
  sens_hot:         { en: "Hot",                    ar: "ساخن" },
  sens_cold:        { en: "Cold",                   ar: "بارد" },
  sens_sweet:       { en: "Sweet",                  ar: "سكريات" },
  tmj:              { en: "TMJ pain / clicking",    ar: "ألم / طقطقة في الفك" },
  bruxism:          { en: "Teeth grinding",         ar: "صرير الأسنان" },
  prior:            { en: "Previous Dental Work",   ar: "علاج سني سابق" },
  pr_ortho:         { en: "Orthodontics",           ar: "تقويم" },
  pr_extract:       { en: "Extractions",            ar: "خلع" },
  pr_rct:           { en: "Root canals",            ar: "علاج عصب" },
  pr_implants:      { en: "Implants",               ar: "زرعات" },
  pr_gum:           { en: "Gum surgery",            ar: "جراحة لثة" },

  // ── Chief complaint ────────────────────────
  complaint:        { en: "What brings you in today?", ar: "ما الذي أحضرك اليوم؟" },
  painScore:        { en: "Pain (0 = none, 10 = worst)", ar: "الألم (0 = لا يوجد، 10 = أسوأ)" },
  duration:         { en: "Duration of complaint",  ar: "مدة الشكوى" },

  // ── UI ─────────────────────────────────────
  yes:              { en: "Yes",                    ar: "نعم" },
  no:               { en: "No",                     ar: "لا" },
  save:             { en: "Save Intake Form",       ar: "حفظ النموذج" },
  cancel:           { en: "Cancel",                 ar: "إلغاء" },
  edit:             { en: "Edit",                   ar: "تعديل" },
  notFilled:        { en: "Not filled",             ar: "غير مدون" },
  incomplete:       { en: "Intake form incomplete", ar: "النموذج غير مكتمل" },
  completeNow:      { en: "Fill intake form",       ar: "ملء النموذج" },
  completedOn:      { en: "Last updated",           ar: "آخر تحديث" },
  promptTitle:      { en: "Complete medical intake?", ar: "ملء النموذج الطبي؟" },
  promptDesc:       { en: "Filling the intake now gives the doctor full medical context. You can skip and complete it later from the patient's Medical tab.", ar: "ملء النموذج الآن يعطي الطبيب الصورة الكاملة. يمكنك التخطي وملؤه لاحقًا من تبويب البيانات الطبية." },
  fillNow:          { en: "Yes, fill now",          ar: "نعم، املأ الآن" },
  skip:             { en: "Skip for now",           ar: "تخطي الآن" },
  receptionistLocked:{ en: "Intake already saved. Doctors can edit from here.", ar: "تم حفظ النموذج. يمكن للأطباء التعديل." },
};

// Empty starting shape — using a fresh deep clone each time avoids shared refs.
export function defaultIntake() {
  return {
    personal: {
      dob: "", gender: "", nationalId: "", occupation: "",
      maritalStatus: "", address: "", bloodType: "",
      emergencyContact: { name: "", relation: "", phone: "" },
    },
    medical: {
      allergies: { penicillin: false, otherAntibiotics: false, latex: false,
                   localAnesthesia: false, other: "" },
      medications: "",
      conditions: {
        diabetes:        { has: false, type: "" },
        hypertension:    false,
        heartDisease:    { has: false, detail: "" },
        stroke:          false,
        asthma:          false,
        epilepsy:        false,
        thyroid:         false,
        kidney:          false,
        liver:           false,
        hepatitis:       { has: false, type: "" },
        hiv:             false,
        cancer:          { has: false, active: false, detail: "" },
        osteoporosis:    { has: false, bisphosphonates: false },
        bleedingDisorder: false,
        anticoagulants:  { has: false, drug: "" },
      },
    },
    surgical: {
      recentSurgery:    { has: false, detail: "" },
      hospitalizations: "",
    },
    womens: {
      pregnant:              { has: false, trimester: "" },
      breastfeeding:         false,
      hormonalContraception: false,
    },
    lifestyle: {
      smoking: { has: false, cigsPerDay: 0 },
      alcohol: "none",
    },
    dental: {
      lastVisit: "", lastXray: "",
      brushing: "", flossing: "",
      bleedingGums: false,
      sensitivity: { hot: false, cold: false, sweet: false },
      tmjPain: false, bruxism: false,
      prior: { orthodontics: false, extractions: false, rootCanals: false, implants: false, gumSurgery: false },
    },
    complaint: { text: "", painScore: 0, duration: "" },
  };
}

// Merge a saved partial form with defaults so missing keys don't crash the UI.
export function mergeIntake(saved) {
  const def = defaultIntake();
  if (!saved) return def;
  const m = (a, b) => {
    if (b === null || b === undefined) return a;
    if (typeof a !== "object" || Array.isArray(a)) return b;
    const out = { ...a };
    for (const k of Object.keys(a)) if (k in b) out[k] = m(a[k], b[k]);
    return out;
  };
  return m(def, saved);
}

// ── Clinical-flag computation ────────────────
// Returns [{ key, level: 'red'|'amber', en, ar, detail? }]
export function computePatientFlags(intake) {
  if (!intake) return [];
  const f = [];
  const m  = intake.medical || {};
  const c  = m.conditions || {};
  const a  = m.allergies  || {};
  const w  = intake.womens || {};
  const s  = intake.surgical || {};
  const ls = intake.lifestyle || {};

  // ── RED (clinical danger) ──
  if (w.pregnant?.has)
    f.push({key:"pregnant", level:"red", en:"Pregnant", ar:"حامل",
            detail: w.pregnant.trimester ? `T${w.pregnant.trimester}` : ""});
  if (c.anticoagulants?.has)
    f.push({key:"anticoag", level:"red", en:"Anticoagulants", ar:"مميعات دم",
            detail: c.anticoagulants.drug || ""});
  if (c.osteoporosis?.bisphosphonates)
    f.push({key:"bisphos", level:"red", en:"Bisphosphonates", ar:"بايفوسفونات"});
  if (c.heartDisease?.has)
    f.push({key:"heart", level:"red", en:"Heart disease", ar:"أمراض القلب",
            detail: c.heartDisease.detail || ""});
  if (c.hepatitis?.has)
    f.push({key:"hep", level:"red",
            en:`Hepatitis ${c.hepatitis.type || ""}`.trim(), ar:"فيروس كبدي"});
  if (c.hiv)
    f.push({key:"hiv", level:"red", en:"HIV+", ar:"HIV"});
  if (a.penicillin)
    f.push({key:"pen", level:"red", en:"Penicillin allergy", ar:"حساسية بنسلين"});
  if (a.localAnesthesia)
    f.push({key:"la", level:"red", en:"Anesthesia allergy", ar:"حساسية بنج"});
  if (c.bleedingDisorder)
    f.push({key:"bleed", level:"red", en:"Bleeding disorder", ar:"اضطراب نزيف"});
  if (c.cancer?.active)
    f.push({key:"cancer", level:"red", en:"Active cancer Rx", ar:"سرطان نشط"});

  // ── AMBER (caution) ──
  if (w.breastfeeding)
    f.push({key:"breastfeed", level:"amber", en:"Breastfeeding", ar:"رضاعة"});
  if (s.recentSurgery?.has)
    f.push({key:"surg", level:"amber", en:"Recent surgery", ar:"جراحة حديثة",
            detail: s.recentSurgery.detail || ""});
  if (c.diabetes?.has)
    f.push({key:"db", level:"amber",
            en:`Diabetes${c.diabetes.type?` T${c.diabetes.type}`:""}`, ar:"سكري"});
  if (a.latex)
    f.push({key:"latex", level:"amber", en:"Latex allergy", ar:"حساسية لاتكس"});
  if (c.hypertension)
    f.push({key:"htn", level:"amber", en:"Hypertension", ar:"ضغط مرتفع"});
  if ((ls.smoking?.cigsPerDay || 0) > 10)
    f.push({key:"smoker", level:"amber",
            en:`Heavy smoker (${ls.smoking.cigsPerDay}/d)`, ar:"مدخن شره"});

  return f;
}

// True if the form has at least one section filled with something meaningful.
export function intakeIsStarted(intake) {
  if (!intake) return false;
  const p = intake.personal || {};
  if (p.dob || p.gender || p.nationalId || p.occupation || p.address) return true;
  if (intake.medical?.medications) return true;
  if (computePatientFlags(intake).length > 0) return true;
  if (intake.complaint?.text) return true;
  return false;
}
