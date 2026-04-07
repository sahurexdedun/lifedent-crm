// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { signIn } from "../lib/db";

const T = {
  sidebar: "#111028", gold: "#B8832E", goldL: "#D4A84E",
  bg: "#F5F0E6", white: "#FFFFFF", text: "#1A1614",
  muted: "#8A8480", border: "rgba(0,0,0,0.09)",
  red: "#C03838", redBg: "#FAE8E8",
};

const TOOTH = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 6 C20 6 12 13 12 22 C12 30 15 36 18 42 L21 54 C21 55.5 22.5 57 24 57 C25.5 57 27 55.5 27 54 L27 46 C27 44 28.5 42.5 30 42.5 C31.5 42.5 33 44 33 46 L33 54 C33 55.5 34.5 57 36 57 C37.5 57 39 55.5 39 54 L42 42 C45 36 48 30 48 22 C48 13 40 6 30 6Z' fill='white' fill-opacity='0.025'/%3E%3C/svg%3E")`;

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [mobile,   setMobile]   = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // ── Mobile layout ────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <div style={{ minHeight: "100vh", fontFamily: "'Sora', sans-serif",
        background: T.sidebar, backgroundImage: TOOTH, backgroundSize: "60px 60px",
        display: "flex", flexDirection: "column" }}>

        {/* Top brand bar */}
        <div style={{ padding: "48px 28px 32px", textAlign: "center" }}>
          <img src="/logo.png" alt="Lifedent"
            style={{ height: 56, width: "auto", objectFit: "contain",
              filter: "brightness(0) invert(1)", marginBottom: 16 }} />
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
            fontSize: 20, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
            The clinic experience,<br/>beautifully managed.
          </div>
        </div>

        {/* Form card */}
        <div style={{ flex: 1, background: T.bg, borderRadius: "24px 24px 0 0",
          padding: "36px 24px 40px", display: "flex", flexDirection: "column" }}>

          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30,
            fontWeight: 600, color: T.text, marginBottom: 6 }}>Welcome back</div>
          <div style={{ color: T.muted, fontSize: 14, marginBottom: 28 }}>
            Sign in to your clinic account
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.muted,
                textTransform: "uppercase", letterSpacing: "0.08em",
                display: "block", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="doctor@lifedent.com" autoComplete="email"
                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 12,
                  padding: "14px 16px", fontSize: 16, fontFamily: "Sora",
                  color: T.text, background: T.white, outline: "none" }}
                onFocus={e => { e.target.style.borderColor = T.gold; e.target.style.boxShadow = `0 0 0 3px ${T.gold}18`; }}
                onBlur={e =>  { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.muted,
                textTransform: "uppercase", letterSpacing: "0.08em",
                display: "block", marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" autoComplete="current-password"
                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 12,
                  padding: "14px 16px", fontSize: 16, fontFamily: "Sora",
                  color: T.text, background: T.white, outline: "none" }}
                onFocus={e => { e.target.style.borderColor = T.gold; e.target.style.boxShadow = `0 0 0 3px ${T.gold}18`; }}
                onBlur={e =>  { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {error && (
              <div style={{ background: T.redBg, borderLeft: `3px solid ${T.red}`,
                borderRadius: "0 10px 10px 0", padding: "11px 16px",
                fontSize: 14, color: T.red }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ background: `linear-gradient(135deg, ${T.gold}, ${T.goldL})`,
                color: "#fff", border: "none", borderRadius: 12,
                padding: "16px 20px", fontSize: 16, fontWeight: 600,
                fontFamily: "Sora", cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1, boxShadow: `0 4px 16px ${T.gold}40`,
                marginTop: 4 }}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Desktop layout ───────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Sora', sans-serif" }}>

      {/* Left panel */}
      <div style={{ width: 420, background: T.sidebar, backgroundImage: TOOTH,
        backgroundSize: "60px 60px", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "60px 52px", flexShrink: 0 }}>

        <div style={{ marginBottom: 48 }}>
          <img src="/logo.png" alt="Lifedent"
            style={{ width: "100%", height: "auto", objectFit: "contain",
              filter: "brightness(0) invert(1)" }} />
        </div>

        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
          fontSize: 34, fontWeight: 500, color: "#F0EDE6", lineHeight: 1.3, marginBottom: 20 }}>
          The clinic experience,<br/>beautifully managed.
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
          Appointments, patient records,<br/>
          WhatsApp reminders — all in one place.
        </div>

        <div style={{ marginTop: "auto", paddingTop: 48 }}>
          {[
            { role: "Admin",        desc: "Full clinic access" },
            { role: "Dentist",      desc: "Patients + clinical notes" },
            { role: "Receptionist", desc: "Appointments + scheduling" },
          ].map(r => (
            <div key={r.role} style={{ display: "flex", alignItems: "center", gap: 10,
              marginBottom: 12, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%",
                background: T.gold, display: "inline-block", flexShrink: 0 }} />
              <strong style={{ color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>{r.role}</strong>
              — {r.desc}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, background: T.bg, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34,
            fontWeight: 600, color: T.text, marginBottom: 8 }}>
            Welcome back
          </div>
          <div style={{ color: T.muted, fontSize: 14, marginBottom: 36 }}>
            Sign in to your clinic account
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.muted,
                textTransform: "uppercase", letterSpacing: "0.08em",
                display: "block", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="doctor@lifedent.com" autoComplete="email"
                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 12,
                  padding: "13px 16px", fontSize: 15, fontFamily: "Sora",
                  color: T.text, background: T.white, outline: "none",
                  transition: "border 0.15s, box-shadow 0.15s" }}
                onFocus={e => { e.target.style.borderColor = T.gold; e.target.style.boxShadow = `0 0 0 3px ${T.gold}18`; }}
                onBlur={e =>  { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.muted,
                textTransform: "uppercase", letterSpacing: "0.08em",
                display: "block", marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" autoComplete="current-password"
                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 12,
                  padding: "13px 16px", fontSize: 15, fontFamily: "Sora",
                  color: T.text, background: T.white, outline: "none",
                  transition: "border 0.15s, box-shadow 0.15s" }}
                onFocus={e => { e.target.style.borderColor = T.gold; e.target.style.boxShadow = `0 0 0 3px ${T.gold}18`; }}
                onBlur={e =>  { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {error && (
              <div style={{ background: T.redBg, border: `1px solid ${T.red}25`,
                borderLeft: `3px solid ${T.red}`, borderRadius: "0 10px 10px 0",
                padding: "11px 16px", fontSize: 14, color: T.red }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ background: `linear-gradient(135deg, ${T.gold}, ${T.goldL})`,
                color: "#fff", border: "none", borderRadius: 12,
                padding: "14px 20px", fontSize: 15, fontWeight: 600,
                fontFamily: "Sora", cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1, boxShadow: `0 4px 16px ${T.gold}40`,
                transition: "all 0.18s", marginTop: 4 }}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <div style={{ marginTop: 32, padding: "16px 18px", background: T.white,
            border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 13, color: T.muted }}>
            💡 <strong style={{ color: T.text }}>First time?</strong> Ask your admin to create
            your account via Supabase Auth, then assign your role.
          </div>
        </div>
      </div>
    </div>
  );
}