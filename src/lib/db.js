// src/lib/db.js
import { supabase } from "./supabase";

// ── NORMALIZERS ───────────────────────────────────────────────────────────
export function normalizePatient(p) {
  if (!p) return null;
  return {
    id: p.id, name: p.name, phone: p.phone, email: p.email || "",
    age: p.age || null, gender: p.gender || null,
    legacyId: p.legacy_id || "",
    notes: p.notes || "",
    intakeForm: p.intake_form || null,
    intakeCompletedAt: p.intake_completed_at ? new Date(p.intake_completed_at) : null,
    intakeUpdatedAt:   p.intake_updated_at   ? new Date(p.intake_updated_at)   : null,
  };
}
export function normalizeAppt(ap) {
  if (!ap) return null;
  return {
    id: ap.id, patientId: ap.patient_id, dt: new Date(ap.dt),
    service: ap.service, status: ap.status, dentist: ap.dentist,
    receptionNotes: ap.reception_notes || "", clinicalNote: ap.clinical_note || "",
    reminder24hSent: ap.reminder_24h_sent || false,
    patient: ap.patients ? normalizePatient(ap.patients) : null,
  };
}
export function normalizeRecall(r) {
  if (!r) return null;
  return {
    id: r.id, patientId: r.patient_id, dueDate: r.due_date, type: r.type, status: r.status,
    lastSent: r.last_sent ? new Date(r.last_sent) : null,
    patient: r.patients ? normalizePatient(r.patients) : null,
  };
}
export function normalizeMsg(m) {
  if (!m) return null;
  return { id: m.id, time: new Date(m.created_at), channel: m.channel, to: m.to_number, kind: m.kind, body: m.body, status: m.status, wamid: m.wamid };
}
export function normalizeDentist(d) {
  if (!d) return null;
  return {
    id: d.id, name: d.name, specialty: d.specialty || "",
    isActive: d.is_active !== false, sortOrder: d.sort_order || 0,
  };
}
export function normalizeCategory(c) {
  if (!c) return null;
  return { id: c.id, name: c.name, sortOrder: c.sort_order || 0 };
}
export function normalizeService(s) {
  if (!s) return null;
  return {
    id: s.id, categoryId: s.category_id, name: s.name,
    price: Number(s.price) || 0,
    isActive: s.is_active !== false, sortOrder: s.sort_order || 0,
  };
}
export function normalizeInvoice(inv) {
  if (!inv) return null;
  return {
    id: inv.id, number: inv.invoice_number,
    appointmentId: inv.appointment_id, patientId: inv.patient_id,
    patientName: inv.patient_name_snapshot, patientPhone: inv.patient_phone_snapshot,
    patientLegacyId: inv.patient_legacy_id_snapshot,
    dentistName: inv.dentist_name_snapshot,
    subtotal: Number(inv.subtotal) || 0,
    discount: Number(inv.discount) || 0,
    total: Number(inv.total) || 0,
    paymentMethod: inv.payment_method || null,
    paidAt: inv.paid_at ? new Date(inv.paid_at) : null,
    status: inv.status || 'paid',
    submittedAt: inv.submitted_at ? new Date(inv.submitted_at) : null,
    closedBy: inv.closed_by || null,
    createdBy: inv.created_by || null,
    createdAt: inv.created_at ? new Date(inv.created_at) : null,
    notes: inv.notes || "",
    items: (inv.invoice_items || []).map(normalizeInvoiceItem)
                                    .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
export function normalizeInvoiceItem(it) {
  if (!it) return null;
  return {
    id: it.id, invoiceId: it.invoice_id, serviceId: it.service_id,
    category: it.category_snapshot || "",
    name: it.name_snapshot,
    price: Number(it.price_snapshot) || 0,
    quantity: it.quantity || 1,
    lineTotal: Number(it.line_total) || 0,
    sortOrder: it.sort_order || 0,
  };
}
export function normalizeProfile(p) {
  if (!p) return null;
  return {
    id: p.id, email: p.email, fullName: p.full_name || "",
    role: p.role, isActive: p.is_active !== false,
    createdAt: p.created_at ? new Date(p.created_at) : null,
  };
}

// ── AUTH ──────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── PATIENTS ──────────────────────────────────────────────────────────────
export async function getPatients() {
  const { data, error } = await supabase.from("patients").select("*").order("name");
  if (error) throw error;
  return data.map(normalizePatient);
}
export async function createPatient({ name, phone, email = "", age = null, gender = null, legacyId = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("patients")
    .insert({ name, phone, email, age, gender, legacy_id: legacyId, created_by: user.id })
    .select().single();
  if (error) throw error;
  return normalizePatient(data);
}
export async function updatePatient(id, patch) {
  const map = {
    name: "name", phone: "phone", email: "email", age: "age",
    gender: "gender", legacyId: "legacy_id", notes: "notes",
  };
  const dbPatch = Object.fromEntries(
    Object.entries(patch).filter(([k]) => map[k]).map(([k, v]) => [map[k], v])
  );
  // intakeForm is a JSONB — also bump intake_updated_at, and set
  // intake_completed_at the first time the form is saved.
  if (patch.intakeForm !== undefined) {
    dbPatch.intake_form       = patch.intakeForm;
    dbPatch.intake_updated_at = new Date().toISOString();
    // only set completed_at if this is the first save
    const { data: existing } = await supabase.from("patients")
      .select("intake_completed_at").eq("id", id).maybeSingle();
    if (existing && !existing.intake_completed_at) {
      dbPatch.intake_completed_at = dbPatch.intake_updated_at;
    }
  }
  const { data, error } = await supabase.from("patients").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;
  return normalizePatient(data);
}
export async function findPatientByPhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const { data } = await supabase.from("patients").select("*").eq("phone", digits).maybeSingle();
  return data ? normalizePatient(data) : null;
}
export async function findPatientByName(name) {
  if (!name) return null;
  const { data } = await supabase.from("patients").select("*")
    .ilike("name", name.trim()).limit(1).maybeSingle();
  return data ? normalizePatient(data) : null;
}

// Bulk import — phone-first dedup with name fallback. Returns { created, skipped, errors }
export async function bulkImportPatients(rows) {
  const { data: { user } } = await supabase.auth.getUser();
  const result = { created: [], skipped: [], errors: [] };

  const { data: existing } = await supabase.from("patients").select("id, name, phone");
  const phoneMap = new Map();
  const nameMap  = new Map();
  (existing || []).forEach(p => {
    if (p.phone) phoneMap.set(p.phone, p);
    if (p.name)  nameMap.set(p.name.trim().toLowerCase(), p);
  });

  const toInsert = [];
  rows.forEach((row, idx) => {
    const name      = (row.name || "").trim();
    const rawPhone  = (row.phone || "").toString().replace(/\D/g, "");
    const legacyId  = (row.legacyId || "").toString().trim() || null;
    const age       = row.age ? Number(row.age) : null;
    const gender    = row.gender || null;
    const email     = (row.email || "").trim();

    if (!name) {
      result.errors.push({ row: idx + 2, reason: "Missing name" });
      return;
    }
    if (!rawPhone) {
      result.errors.push({ row: idx + 2, reason: "Missing phone" });
      return;
    }
    if (phoneMap.has(rawPhone)) {
      result.skipped.push({ row: idx + 2, name, phone: rawPhone, reason: "Phone already exists" });
      return;
    }
    if (nameMap.has(name.toLowerCase())) {
      result.skipped.push({ row: idx + 2, name, phone: rawPhone, reason: "Name already exists" });
      return;
    }

    toInsert.push({
      name, phone: rawPhone, email,
      age: Number.isFinite(age) ? age : null,
      gender: ["Male", "Female", "Child"].includes(gender) ? gender : null,
      legacy_id: legacyId,
      created_by: user.id,
    });
    phoneMap.set(rawPhone, { name, phone: rawPhone });
    nameMap.set(name.toLowerCase(), { name, phone: rawPhone });
  });

  if (toInsert.length === 0) return result;

  const chunkSize = 200;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    const { data, error } = await supabase.from("patients").insert(chunk).select();
    if (error) {
      result.errors.push({ row: `chunk ${i / chunkSize + 1}`, reason: error.message });
      continue;
    }
    (data || []).forEach(p => result.created.push(normalizePatient(p)));
  }
  return result;
}

// ── PATIENT CLINICAL ──────────────────────────────────────────────────────
export async function getClinical(patientId) {
  const { data, error } = await supabase.from("patient_clinical").select("*").eq("patient_id", patientId).maybeSingle();
  if (error) throw error;
  return data;
}
export async function upsertClinical(patientId, { notes = "", medicalFlags = "" }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("patient_clinical")
    .upsert({ patient_id: patientId, notes, medical_flags: medicalFlags, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: "patient_id" })
    .select().single();
  if (error) throw error;
  return data;
}

// ── APPOINTMENTS ──────────────────────────────────────────────────────────
export async function getAppointments() {
  const { data, error } = await supabase.from("appointments")
    .select("*, patients(id,name,phone,email,age,gender,legacy_id)").order("dt");
  if (error) throw error;
  return data.map(normalizeAppt);
}
export async function createAppointment({ patientId, dt, service, dentist, receptionNotes = "", status = "Scheduled" }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("appointments")
    .insert({ patient_id: patientId, dt: dt instanceof Date ? dt.toISOString() : dt, service, dentist, status, reception_notes: receptionNotes, created_by: user.id })
    .select("*, patients(id,name,phone,email,age,gender,legacy_id)").single();
  if (error) throw error;
  return normalizeAppt(data);
}
export async function updateAppointment(id, patch) {
  const dbPatch = {};
  if (patch.status          !== undefined) dbPatch.status            = patch.status;
  if (patch.receptionNotes  !== undefined) dbPatch.reception_notes   = patch.receptionNotes;
  if (patch.reminder24hSent !== undefined) dbPatch.reminder_24h_sent = patch.reminder24hSent;
  const { data, error } = await supabase.from("appointments").update(dbPatch).eq("id", id)
    .select("*, patients(id,name,phone,email,age,gender,legacy_id)").single();
  if (error) throw error;
  return normalizeAppt(data);
}

// ── APPOINTMENT NOTES ─────────────────────────────────────────────────────
export async function upsertAppointmentNote(appointmentId, clinicalNote) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("appointment_notes")
    .upsert({ appointment_id: appointmentId, clinical_note: clinicalNote, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: "appointment_id" })
    .select().single();
  if (error) throw error;
  return data;
}

// ── RECALLS ───────────────────────────────────────────────────────────────
export async function getRecalls() {
  const { data, error } = await supabase.from("recalls")
    .select("*, patients(id,name,phone)").order("due_date");
  if (error) throw error;
  return data.map(normalizeRecall);
}
export async function createRecall({ patientId, dueDate, type }) {
  const { data, error } = await supabase.from("recalls")
    .insert({ patient_id: patientId, due_date: dueDate, type, status: "Pending" })
    .select("*, patients(id,name,phone)").single();
  if (error) throw error;
  return normalizeRecall(data);
}
export async function updateRecall(id, patch) {
  const dbPatch = {};
  if (patch.status   !== undefined) dbPatch.status    = patch.status;
  if (patch.lastSent !== undefined) dbPatch.last_sent = patch.lastSent instanceof Date ? patch.lastSent.toISOString() : patch.lastSent;
  const { data, error } = await supabase.from("recalls").update(dbPatch).eq("id", id)
    .select("*, patients(id,name,phone)").single();
  if (error) throw error;
  return normalizeRecall(data);
}

// ── MESSAGES ──────────────────────────────────────────────────────────────
export async function getMessages() {
  const { data, error } = await supabase.from("messages").select("*")
    .order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data.map(normalizeMsg);
}
export async function logMessage({ toNumber, kind, body, status = "Mock", wamid = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("messages")
    .insert({ channel: "WhatsApp", to_number: toNumber, kind, body, status, wamid, sent_by: user.id })
    .select().single();
  if (error) throw error;
  return normalizeMsg(data);
}

// ── WHATSAPP ──────────────────────────────────────────────────────────────
export async function sendWhatsApp({ to, body, kind }) {
  const { data, error } = await supabase.functions.invoke("send-whatsapp", { body: { to, body, kind } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── DENTISTS ──────────────────────────────────────────────────────────────
export async function getDentists() {
  const { data, error } = await supabase.from("dentists").select("*")
    .order("sort_order").order("name");
  if (error) throw error;
  return data.map(normalizeDentist);
}
export async function createDentist({ name, specialty = "", sortOrder = 0 }) {
  const { data, error } = await supabase.from("dentists")
    .insert({ name, specialty, sort_order: sortOrder })
    .select().single();
  if (error) throw error;
  return normalizeDentist(data);
}
export async function updateDentist(id, patch) {
  const map = { name: "name", specialty: "specialty", isActive: "is_active", sortOrder: "sort_order" };
  const dbPatch = Object.fromEntries(Object.entries(patch).filter(([k]) => map[k]).map(([k, v]) => [map[k], v]));
  const { data, error } = await supabase.from("dentists").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;
  return normalizeDentist(data);
}
export async function deleteDentist(id) {
  const { error } = await supabase.from("dentists").delete().eq("id", id);
  if (error) throw error;
}

// ── SERVICE CATEGORIES + SERVICES ─────────────────────────────────────────
export async function getCategories() {
  const { data, error } = await supabase.from("service_categories").select("*")
    .order("sort_order").order("name");
  if (error) throw error;
  return data.map(normalizeCategory);
}
export async function createCategory({ name, sortOrder = 0 }) {
  const { data, error } = await supabase.from("service_categories")
    .insert({ name, sort_order: sortOrder }).select().single();
  if (error) throw error;
  return normalizeCategory(data);
}
export async function updateCategory(id, patch) {
  const map = { name: "name", sortOrder: "sort_order" };
  const dbPatch = Object.fromEntries(Object.entries(patch).filter(([k]) => map[k]).map(([k, v]) => [map[k], v]));
  const { data, error } = await supabase.from("service_categories").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;
  return normalizeCategory(data);
}
export async function deleteCategory(id) {
  const { error } = await supabase.from("service_categories").delete().eq("id", id);
  if (error) throw error;
}

export async function getServices() {
  const { data, error } = await supabase.from("services").select("*")
    .order("sort_order").order("name");
  if (error) throw error;
  return data.map(normalizeService);
}
export async function createService({ categoryId, name, price = 0, sortOrder = 0 }) {
  const { data, error } = await supabase.from("services")
    .insert({ category_id: categoryId, name, price, sort_order: sortOrder })
    .select().single();
  if (error) throw error;
  return normalizeService(data);
}
export async function updateService(id, patch) {
  const map = { categoryId: "category_id", name: "name", price: "price", isActive: "is_active", sortOrder: "sort_order" };
  const dbPatch = Object.fromEntries(Object.entries(patch).filter(([k]) => map[k]).map(([k, v]) => [map[k], v]));
  const { data, error } = await supabase.from("services").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;
  return normalizeService(data);
}
export async function deleteService(id) {
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}

// ── INVOICES ──────────────────────────────────────────────────────────────
export async function getInvoices({ from = null, to = null } = {}) {
  let q = supabase.from("invoices")
    .select("*, invoice_items(*)")
    .order("paid_at", { ascending: false })
    .limit(500);
  if (from) q = q.gte("paid_at", from instanceof Date ? from.toISOString() : from);
  if (to)   q = q.lte("paid_at", to   instanceof Date ? to.toISOString()   : to);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(normalizeInvoice);
}

export async function getInvoice(id) {
  const { data, error } = await supabase.from("invoices")
    .select("*, invoice_items(*)").eq("id", id).single();
  if (error) throw error;
  return normalizeInvoice(data);
}

// items: [{ serviceId, name, category, price, quantity }]
// status: 'draft' (doctor submitting) or 'paid' (direct close, admin/receptionist)
export async function createInvoice({
  appointmentId = null,
  patient,
  dentistName = "",
  items = [],
  discount = 0,
  paymentMethod = null,
  notes = "",
  status = "paid",
}) {
  const { data: { user } } = await supabase.auth.getUser();

  const lineItems = items.map((it, idx) => ({
    service_id: it.serviceId || null,
    category_snapshot: it.category || "",
    name_snapshot: it.name,
    price_snapshot: Number(it.price) || 0,
    quantity: Math.max(1, parseInt(it.quantity) || 1),
    line_total: (Number(it.price) || 0) * Math.max(1, parseInt(it.quantity) || 1),
    sort_order: idx,
  }));
  const subtotal = lineItems.reduce((sum, it) => sum + Number(it.line_total), 0);
  const total    = Math.max(0, subtotal - (Number(discount) || 0));

  const isDraft = status === "draft";
  const nowIso  = new Date().toISOString();

  const { data: inv, error: invErr } = await supabase.from("invoices")
    .insert({
      appointment_id: appointmentId,
      patient_id: patient?.id || null,
      patient_name_snapshot: patient?.name || "",
      patient_phone_snapshot: patient?.phone || "",
      patient_legacy_id_snapshot: patient?.legacyId || "",
      dentist_name_snapshot: dentistName,
      subtotal, discount: Number(discount) || 0, total,
      payment_method: isDraft ? null : (paymentMethod || "Cash"),
      paid_at: isDraft ? null : nowIso,
      status: isDraft ? "draft" : "paid",
      submitted_at: isDraft ? nowIso : null,
      notes,
      created_by: user.id,
    })
    .select().single();
  if (invErr) throw invErr;

  if (lineItems.length > 0) {
    const itemsWithId = lineItems.map(it => ({ ...it, invoice_id: inv.id }));
    const { error: itemErr } = await supabase.from("invoice_items").insert(itemsWithId);
    if (itemErr) {
      await supabase.from("invoices").delete().eq("id", inv.id);
      throw itemErr;
    }
  }

  return await getInvoice(inv.id);
}

// Close a draft invoice — only payment_method, paid_at, closed_by are set
export async function closeInvoice(invoiceId, paymentMethod) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("invoices")
    .update({
      status: "paid",
      payment_method: paymentMethod || "Cash",
      paid_at: new Date().toISOString(),
      closed_by: user.id,
    })
    .eq("id", invoiceId)
    .eq("status", "draft"); // safety: only flip drafts
  if (error) throw error;
  return await getInvoice(invoiceId);
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

// ── ADMIN: USER MANAGEMENT ────────────────────────────────────────────────
export async function getProfiles() {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  if (error) throw error;
  return data.map(normalizeProfile);
}

export async function adminCreateUser({ email, password, fullName, role }) {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { action: "create", email, password, fullName, role },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function adminUpdateUserRole(userId, role) {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { action: "update_role", userId, role },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function adminSetUserActive(userId, isActive) {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { action: "set_active", userId, isActive },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function adminResetPassword(userId, password) {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { action: "reset_password", userId, password },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function adminDeleteUser(userId) {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { action: "delete", userId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── REAL-TIME ─────────────────────────────────────────────────────────────
export function subscribeToAppointments(cb) {
  return supabase.channel("appt-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, cb).subscribe();
}
export function subscribeToRecalls(cb) {
  return supabase.channel("recall-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "recalls" }, cb).subscribe();
}
// Invoice subscription now passes the full Realtime payload so the hook can
// inspect eventType + new row (e.g. fire a toast on freshly-inserted drafts).
export function subscribeToInvoices(cb) {
  return supabase.channel("invoice-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, payload => cb(payload))
    .subscribe();
}
export function subscribeToPatients(cb) {
  return supabase.channel("patient-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, cb).subscribe();
}
