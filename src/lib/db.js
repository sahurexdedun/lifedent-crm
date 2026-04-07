// src/lib/db.js
import { supabase } from "./supabase";

// ── NORMALIZERS ───────────────────────────────────────────────────────────
export function normalizePatient(p) {
  if (!p) return null;
  return { id:p.id, name:p.name, phone:p.phone, email:p.email||"", age:p.age||null, gender:p.gender||null };
}
export function normalizeAppt(ap) {
  if (!ap) return null;
  return {
    id:ap.id, patientId:ap.patient_id, dt:new Date(ap.dt),
    service:ap.service, status:ap.status, dentist:ap.dentist,
    receptionNotes:ap.reception_notes||"", clinicalNote:ap.clinical_note||"",
    reminder24hSent:ap.reminder_24h_sent||false,
    patient: ap.patients ? normalizePatient(ap.patients) : null,
  };
}
export function normalizeRecall(r) {
  if (!r) return null;
  return {
    id:r.id, patientId:r.patient_id, dueDate:r.due_date, type:r.type, status:r.status,
    lastSent:r.last_sent ? new Date(r.last_sent) : null,
    patient: r.patients ? normalizePatient(r.patients) : null,
  };
}
export function normalizeMsg(m) {
  if (!m) return null;
  return { id:m.id, time:new Date(m.created_at), channel:m.channel, to:m.to_number, kind:m.kind, body:m.body, status:m.status, wamid:m.wamid };
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
export async function createPatient({ name, phone, email="", age=null, gender=null }) {
  const { data:{ user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("patients")
    .insert({ name, phone, email, age, gender, created_by:user.id }).select().single();
  if (error) throw error;
  return normalizePatient(data);
}
export async function updatePatient(id, patch) {
  const map = { name:"name", phone:"phone", email:"email", age:"age", gender:"gender" };
  const dbPatch = Object.fromEntries(Object.entries(patch).filter(([k])=>map[k]).map(([k,v])=>[map[k],v]));
  const { data, error } = await supabase.from("patients").update(dbPatch).eq("id",id).select().single();
  if (error) throw error;
  return normalizePatient(data);
}
export async function findPatientByPhone(phone) {
  const digits = phone.replace(/\D/g,"");
  const { data } = await supabase.from("patients").select("*").eq("phone",digits).maybeSingle();
  return data ? normalizePatient(data) : null;
}

// ── PATIENT CLINICAL ──────────────────────────────────────────────────────
export async function getClinical(patientId) {
  const { data, error } = await supabase.from("patient_clinical").select("*").eq("patient_id",patientId).maybeSingle();
  if (error) throw error;
  return data;
}
export async function upsertClinical(patientId, { notes="", medicalFlags="" }) {
  const { data:{ user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("patient_clinical")
    .upsert({ patient_id:patientId, notes, medical_flags:medicalFlags, updated_at:new Date().toISOString(), updated_by:user.id }, { onConflict:"patient_id" })
    .select().single();
  if (error) throw error;
  return data;
}

// ── APPOINTMENTS ──────────────────────────────────────────────────────────
export async function getAppointments() {
  const { data, error } = await supabase.from("appointments")
    .select("*, patients(id,name,phone,email,age,gender)").order("dt");
  if (error) throw error;
  return data.map(normalizeAppt);
}
export async function createAppointment({ patientId, dt, service, dentist, receptionNotes="", status="Scheduled" }) {
  const { data:{ user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("appointments")
    .insert({ patient_id:patientId, dt:dt instanceof Date?dt.toISOString():dt, service, dentist, status, reception_notes:receptionNotes, created_by:user.id })
    .select("*, patients(id,name,phone,email,age,gender)").single();
  if (error) throw error;
  return normalizeAppt(data);
}
export async function updateAppointment(id, patch) {
  const dbPatch = {};
  if (patch.status          !== undefined) dbPatch.status            = patch.status;
  if (patch.receptionNotes  !== undefined) dbPatch.reception_notes   = patch.receptionNotes;
  if (patch.reminder24hSent !== undefined) dbPatch.reminder_24h_sent = patch.reminder24hSent;
  const { data, error } = await supabase.from("appointments").update(dbPatch).eq("id",id)
    .select("*, patients(id,name,phone,email,age,gender)").single();
  if (error) throw error;
  return normalizeAppt(data);
}

// ── APPOINTMENT NOTES ─────────────────────────────────────────────────────
export async function upsertAppointmentNote(appointmentId, clinicalNote) {
  const { data:{ user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("appointment_notes")
    .upsert({ appointment_id:appointmentId, clinical_note:clinicalNote, updated_at:new Date().toISOString(), updated_by:user.id }, { onConflict:"appointment_id" })
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
    .insert({ patient_id:patientId, due_date:dueDate, type, status:"Pending" })
    .select("*, patients(id,name,phone)").single();
  if (error) throw error;
  return normalizeRecall(data);
}
export async function updateRecall(id, patch) {
  const dbPatch = {};
  if (patch.status   !== undefined) dbPatch.status    = patch.status;
  if (patch.lastSent !== undefined) dbPatch.last_sent = patch.lastSent instanceof Date ? patch.lastSent.toISOString() : patch.lastSent;
  const { data, error } = await supabase.from("recalls").update(dbPatch).eq("id",id)
    .select("*, patients(id,name,phone)").single();
  if (error) throw error;
  return normalizeRecall(data);
}

// ── MESSAGES ──────────────────────────────────────────────────────────────
export async function getMessages() {
  const { data, error } = await supabase.from("messages").select("*")
    .order("created_at", { ascending:false }).limit(200);
  if (error) throw error;
  return data.map(normalizeMsg);
}
export async function logMessage({ toNumber, kind, body, status="Mock", wamid=null }) {
  const { data:{ user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("messages")
    .insert({ channel:"WhatsApp", to_number:toNumber, kind, body, status, wamid, sent_by:user.id })
    .select().single();
  if (error) throw error;
  return normalizeMsg(data);
}

// ── WHATSAPP ──────────────────────────────────────────────────────────────
export async function sendWhatsApp({ to, body, kind }) {
  const { data, error } = await supabase.functions.invoke("send-whatsapp", { body:{ to, body, kind } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── REAL-TIME ─────────────────────────────────────────────────────────────
export function subscribeToAppointments(cb) {
  return supabase.channel("appt-changes")
    .on("postgres_changes", { event:"*", schema:"public", table:"appointments" }, cb).subscribe();
}
export function subscribeToRecalls(cb) {
  return supabase.channel("recall-changes")
    .on("postgres_changes", { event:"*", schema:"public", table:"recalls" }, cb).subscribe();
}
