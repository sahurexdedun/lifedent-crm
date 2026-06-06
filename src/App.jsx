// src/App.jsx
// Auth wrapper. The CRM component receives `role` and `canSeeClinical`
// so it knows what to show/hide in the UI.
// The DB enforces the same restrictions at RLS level.

import { AuthProvider, useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import CRM from "./CRM"; // your dental-crm.jsx renamed to CRM.jsx

function AppInner() {
  const auth = useAuth();
  const { loading, session, profile, role, canSeeClinical,
          canBrowsePatients, canSeeRevenue, canCloseInvoices, canCreateInvoices } = auth;

  // Waiting for session check
  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center",
        justifyContent: "center", background: "#F5F0E6", fontFamily: "Sora, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🦷</div>
          <div style={{ fontSize: 14, color: "#8A8480" }}>Loading LifeDent…</div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!session) return <Login />;

  // Profile not yet loaded (rare race condition)
  if (!profile) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center",
        justifyContent: "center", background: "#F5F0E6" }}>
        <div style={{ fontSize: 14, color: "#8A8480" }}>Loading profile…</div>
      </div>
    );
  }

  // CRM receives role + capability flags — hides clinical data for receptionists,
  // restricts patient browsing and revenue to admin + senior_doctor, etc.
  return (
    <CRM
      role={role}
      userId={session.user.id}
      userFullName={profile.full_name}
      canSeeClinical={canSeeClinical}
      canBrowsePatients={canBrowsePatients}
      canSeeRevenue={canSeeRevenue}
      canCloseInvoices={canCloseInvoices}
      canCreateInvoices={canCreateInvoices}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
