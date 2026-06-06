// src/hooks/useClinicData.js
// Central data hook. Fetches from Supabase, provides mutations,
// sets up real-time subscriptions.

import { useState, useEffect, useCallback } from "react";
import * as db from "../lib/db";

export function useClinicData() {
  const [patients,     setPatients]     = useState({});
  const [appointments, setAppointments] = useState({});
  const [recalls,      setRecalls]      = useState({});
  const [messages,     setMessages]     = useState([]);
  const [dentists,     setDentists]     = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [services,     setServices]     = useState([]);
  const [invoices,     setInvoices]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  // ── Load all data ────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [pList, apList, rList, mList, dList, cList, sList, iList] = await Promise.all([
        db.getPatients(),
        db.getAppointments(),
        db.getRecalls(),
        db.getMessages(),
        db.getDentists(),
        db.getCategories(),
        db.getServices(),
        db.getInvoices(),
      ]);
      setPatients(Object.fromEntries(pList.map(p  => [p.id, p])));
      setAppointments(Object.fromEntries(apList.map(ap => [ap.id, ap])));
      setRecalls(Object.fromEntries(rList.map(r  => [r.id, r])));
      setMessages(mList);
      setDentists(dList);
      setCategories(cList);
      setServices(sList);
      setInvoices(iList);
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
    const iSub = db.subscribeToInvoices(() => {
      db.getInvoices().then(setInvoices);
    });
    return () => {
      apSub.unsubscribe?.();
      rSub.unsubscribe?.();
      iSub.unsubscribe?.();
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

  const importPatients = useCallback(async (rows) => {
    const result = await db.bulkImportPatients(rows);
    if (result.created.length) {
      setPatients(prev => {
        const next = { ...prev };
        result.created.forEach(p => { next[p.id] = p; });
        return next;
      });
    }
    return result;
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
  const sendWAMessage = useCallback(async ({ to, body, kind }) => {
    const tempId = "temp_" + Date.now();
    const tempMsg = { id: tempId, time: new Date(), channel: "WhatsApp", to, kind, body, status: "Sending…", wamid: null };
    setMessages(prev => [tempMsg, ...prev]);

    try {
      const result = await db.sendWhatsApp({ to, body, kind });
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "Delivered ✓✓", wamid: result.wamid } : m));
      return result;
    } catch {
      try {
        const logged = await db.logMessage({ toNumber: to, kind, body, status: "Mock" });
        setMessages(prev => prev.map(m => m.id === tempId ? { ...logged } : m));
      } catch { /* ignore */ }
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "Mock" } : m));
    }
  }, []);

  // ── Dentist mutations ────────────────────────────────────────────────
  const addDentist = useCallback(async (data) => {
    const d = await db.createDentist(data);
    setDentists(prev => [...prev, d].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
    return d;
  }, []);
  const patchDentist = useCallback(async (id, patch) => {
    const d = await db.updateDentist(id, patch);
    setDentists(prev => prev.map(x => x.id === id ? d : x));
    return d;
  }, []);
  const removeDentist = useCallback(async (id) => {
    await db.deleteDentist(id);
    setDentists(prev => prev.filter(d => d.id !== id));
  }, []);

  // ── Category mutations ───────────────────────────────────────────────
  const addCategory = useCallback(async (data) => {
    const c = await db.createCategory(data);
    setCategories(prev => [...prev, c].sort((a, b) => a.sortOrder - b.sortOrder));
    return c;
  }, []);
  const patchCategory = useCallback(async (id, patch) => {
    const c = await db.updateCategory(id, patch);
    setCategories(prev => prev.map(x => x.id === id ? c : x));
    return c;
  }, []);
  const removeCategory = useCallback(async (id) => {
    await db.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
    setServices(prev => prev.filter(s => s.categoryId !== id));
  }, []);

  // ── Service mutations ────────────────────────────────────────────────
  const addService = useCallback(async (data) => {
    const s = await db.createService(data);
    setServices(prev => [...prev, s].sort((a, b) => a.sortOrder - b.sortOrder));
    return s;
  }, []);
  const patchService = useCallback(async (id, patch) => {
    const s = await db.updateService(id, patch);
    setServices(prev => prev.map(x => x.id === id ? s : x));
    return s;
  }, []);
  const removeService = useCallback(async (id) => {
    await db.deleteService(id);
    setServices(prev => prev.filter(s => s.id !== id));
  }, []);

  // ── Invoice mutations ────────────────────────────────────────────────
  const addInvoice = useCallback(async (data) => {
    const inv = await db.createInvoice(data);
    setInvoices(prev => [inv, ...prev]);
    return inv;
  }, []);

  const closeInvoice = useCallback(async (invoiceId, paymentMethod) => {
    const inv = await db.closeInvoice(invoiceId, paymentMethod);
    setInvoices(prev => prev.map(i => i.id === invoiceId ? inv : i));
    return inv;
  }, []);

  return {
    // State
    patients, appointments, recalls, messages,
    dentists, categories, services, invoices,
    loading, error,
    // Mutations
    addPatient, patchPatient, importPatients,
    addAppt,    patchAppt,
    addRecall,  patchRecall,
    sendWAMessage,
    addDentist, patchDentist, removeDentist,
    addCategory, patchCategory, removeCategory,
    addService, patchService, removeService,
    addInvoice, closeInvoice,
    reload: loadAll,
  };
}
