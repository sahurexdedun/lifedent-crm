// src/lib/db.js
// All Supabase queries live here. Components never import supabase directly.
// RLS enforces role restrictions — this layer just calls the DB.

import { supabase } from "./supabase";

// ── AUTH ──────────────────────────────────────────────────────────────────

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
}

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
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

export async function createPatient({ name, phone, email = "" }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("patients")
    .insert({ name, phone, email, created_by: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePatient(id, patch) {
  const { data, error } = await supabase
    .from("patients")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── PATIENT CLINICAL (admin + dentist only — RLS blocks receptionists) ────

export async function getClinical(patientId) {
  const { data, error } = await supabase
    .from("patient_clinical")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertClinical(patientId, patch) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("patient_clinical")
    .upsert({
      patient_id: patientId,
      ...patch,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }, { onConflict: "patient_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── APPOINTMENTS ──────────────────────────────────────────────────────────

export async function getAppointments({ from, to } = {}) {
  let q = supabase
    .from("appointments")
    .select(`
      *,
      patients (id, name, phone, email)
    `)
    .order("dt");
  if (from) q = q.gte("dt", from);
  if (to)   q = q.lte("dt", to);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createAppointment(appt) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("appointments")
    .insert({ ...appt, created_by: user.id })
    .select(`*, patients (id, name, phone, email)`)
    .single();
  if (error) throw error;
  return data;
}

export async function updateAppointment(id, patch) {
  const { data, error } = await supabase
    .from("appointments")
    .update(patch)
    .eq("id", id)
    .select(`*, patients (id, name, phone, email)`)
    .single();
  if (error) throw error;
  return data;
}

// ── APPOINTMENT NOTES (admin + dentist only) ──────────────────────────────

export async function getAppointmentNote(appointmentId) {
  const { data, error } = await supabase
    .from("appointment_notes")
    .select("*")
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertAppointmentNote(appointmentId, clinicalNote) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("appointment_notes")
    .upsert({
      appointment_id: appointmentId,
      clinical_note: clinicalNote,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }, { onConflict: "appointment_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── RECALLS ───────────────────────────────────────────────────────────────

export async function getRecalls() {
  const { data, error } = await supabase
    .from("recalls")
    .select(`*, patients (id, name, phone)`)
    .order("due_date");
  if (error) throw error;
  return data;
}

export async function createRecall({ patientId, dueDate, type }) {
  const { data, error } = await supabase
    .from("recalls")
    .insert({ patient_id: patientId, due_date: dueDate, type, status: "Pending" })
    .select(`*, patients (id, name, phone)`)
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecall(id, patch) {
  const { data, error } = await supabase
    .from("recalls")
    .update(patch)
    .eq("id", id)
    .select(`*, patients (id, name, phone)`)
    .single();
  if (error) throw error;
  return data;
}

// ── MESSAGES ──────────────────────────────────────────────────────────────

export async function getMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

// ── WHATSAPP (calls Edge Function — token never in browser) ───────────────

export async function sendWhatsApp({ to, body, kind, patientId, appointmentId }) {
  const { data, error } = await supabase.functions.invoke("send-whatsapp", {
    body: { to, body, kind, patientId, appointmentId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── REAL-TIME SUBSCRIPTIONS ───────────────────────────────────────────────
// Use these in components for live updates across receptionist + dentist screens.

export function subscribeToAppointments(callback) {
  return supabase
    .channel("appointments-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, callback)
    .subscribe();
}

export function subscribeToRecalls(callback) {
  return supabase
    .channel("recalls-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "recalls" }, callback)
    .subscribe();
}
