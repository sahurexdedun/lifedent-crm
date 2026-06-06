// src/hooks/useAuth.jsx
import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  }

  const value = {
    session,
    profile,
    user:    session?.user ?? null,
    role:    profile?.role ?? null,
    loading: session === undefined,
    isAdmin:        profile?.role === "admin",
    isSeniorDoctor: profile?.role === "senior_doctor",
    isDentist:      profile?.role === "dentist",
    isReceptionist: profile?.role === "receptionist",
    // Clinical data access = admin, senior_doctor, or dentist
    canSeeClinical: ["admin","senior_doctor","dentist"].includes(profile?.role),
    // Patient list browsing = admin or senior_doctor only
    canBrowsePatients: ["admin","senior_doctor"].includes(profile?.role),
    // Revenue analytics = admin or senior_doctor only
    canSeeRevenue: ["admin","senior_doctor"].includes(profile?.role),
    // Closing draft invoices = admin, senior_doctor, or receptionist
    canCloseInvoices: ["admin","senior_doctor","receptionist"].includes(profile?.role),
    // Creating invoices (drafts) = admin, senior_doctor, or dentist
    canCreateInvoices: ["admin","senior_doctor","dentist"].includes(profile?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
