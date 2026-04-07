// src/hooks/useClinicData.js
// Central data hook. Fetches from Supabase, provides mutations,
// sets up real-time subscriptions. Components never import db.js directly.

import { useState, useEffect, useCallback } from "react";
import * as db from "../lib/db";

export function useClinicData() {
  const [patients,     setPatients]     = useState({});
  const [appointments, setAppointments] = useState({});
  const [recalls,      setRecalls]      = useState({});
  const [messages,     setMessages]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  // ── Load all data ────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [pList, apList, rList, mList] = await Promise.all([
        db.getPatients(),
        db.getAppointments(),
        db.getRecalls(),
        db.getMessages(),
      ]);
      setPatients(Object.fromEntries(pList.map(p  => [p.id, p])));
      setAppointments(Object.fromEntries(apList.map(ap => [ap.id, ap])));
      setRecalls(Object.fromEntries(rList.map(r  => [r.id, r])));
      setMessages(mList);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Real-time subscriptions ──────────────────────────────────────────
  useEffect(() => {
    // Reload appointments when any change happens (another tab/device)
    const apSub = db.subscribeToAppointments(() => {
      db.getAppointments().then(list =>
        setAppointments(Object.fromEntries(list.map(ap => [ap.id, ap])))
      );
    });
    const rSub = db.subscribeToRecalls(() => {
      db.getRecalls().then(list =>
        setRecalls(Object.fromEntries(list.map(r => [r.id, r])))
      );
    });
    return () => {
      apSub.unsubscribe?.();
      rSub.unsubscribe?.();
    };
  }, []);

  // ── Patient mutations ────────────────────────────────────────────────
  const addPatient = useCallback(async (data) => {
    const p = await db.createPatient(data);
    setPatients(prev => ({ ...prev, [p.id]: p }));
    return p;
  }, []);

  const patchPatient = useCallback(async (id, patch) => {
    const p = await db.updatePatient(id, patch);
    setPatients(prev => ({ ...prev, [id]: p }));
    return p;
  }, []);

  // ── Appointment mutations ────────────────────────────────────────────
  const addAppt = useCallback(async (data) => {
    const ap = await db.createAppointment(data);
    setAppointments(prev => ({ ...prev, [ap.id]: ap }));
    return ap;
  }, []);

  const patchAppt = useCallback(async (id, patch) => {
    const ap = await db.updateAppointment(id, patch);
    setAppointments(prev => ({ ...prev, [id]: ap }));
    return ap;
  }, []);

  // ── Recall mutations ─────────────────────────────────────────────────
  const addRecall = useCallback(async (data) => {
    const r = await db.createRecall(data);
    setRecalls(prev => ({ ...prev, [r.id]: r }));
    return r;
  }, []);

  const patchRecall = useCallback(async (id, patch) => {
    const r = await db.updateRecall(id, patch);
    setRecalls(prev => ({ ...prev, [id]: r }));
    return r;
  }, []);

  // ── WhatsApp send ────────────────────────────────────────────────────
  // Returns { success, wamid } or throws.
  // Optimistically adds to messages list before API call.
  const sendWAMessage = useCallback(async ({ to, body, kind }) => {
    // Optimistic local entry
    const tempId = "temp_" + Date.now();
    const tempMsg = { id:tempId, time:new Date(), channel:"WhatsApp", to, kind, body, status:"Sending…", wamid:null };
    setMessages(prev => [tempMsg, ...prev]);

    try {
      // Try real API (Edge Function)
      const result = await db.sendWhatsApp({ to, body, kind });
      setMessages(prev => prev.map(m => m.id===tempId ? { ...m, status:"Delivered ✓✓", wamid:result.wamid } : m));
      return result;
    } catch {
      // Edge Function not configured yet — log as mock
      try {
        const logged = await db.logMessage({ toNumber:to, kind, body, status:"Mock" });
        setMessages(prev => prev.map(m => m.id===tempId ? { ...logged } : m));
      } catch { /* ignore log failure */ }
      setMessages(prev => prev.map(m => m.id===tempId ? { ...m, status:"Mock" } : m));
    }
  }, []);

  return {
    // State
    patients, appointments, recalls, messages,
    loading, error,
    // Mutations
    addPatient,    patchPatient,
    addAppt,       patchAppt,
    addRecall,     patchRecall,
    sendWAMessage,
    reload: loadAll,
  };
}
