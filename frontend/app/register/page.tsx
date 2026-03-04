"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../lib/api";

function PasswordStrength({ password }: { password: string }) {
  const score =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);

  if (!password) return null;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#ef4444", "#f59e0b", "#10b981", "#6366f1"];
  return (
    <div style={{ marginTop: "0.4rem" }}>
      <div style={{ display: "flex", gap: "4px", marginBottom: "0.25rem" }}>
        {[1,2,3,4].map((i) => (
          <div
            key={i}
            style={{
              height: "3px", flex: 1, borderRadius: "9999px",
              background: i <= score ? colors[score] : "var(--border)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: "0.72rem", color: colors[score] }}>{labels[score]}</p>
    </div>
  );
}

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/users/", { username, email, password });
      router.push("/login");
    } catch (err: any) {
      try {
        const body = JSON.parse(err.message.replace(/^Request failed \d+: /, ""));
        const first = Object.values(body)[0];
        setError(Array.isArray(first) ? first[0] as string : String(first));
      } catch {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "0.65rem 0.875rem",
    borderRadius: "0.625rem", fontSize: "0.925rem",
    background: "var(--surface-hover)", border: "1.5px solid var(--border)",
    color: "var(--foreground)", transition: "border-color 0.2s",
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 3.5rem)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "2rem 1rem",
        background: "linear-gradient(160deg, rgba(139,92,246,0.06) 0%, rgba(99,102,241,0.04) 60%, transparent 100%)",
      }}
    >
      <div className="animate-fade-in" style={{ width: "100%", maxWidth: "420px" }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link
            href="/"
            style={{
              fontSize: "1.6rem", fontWeight: 800,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              textDecoration: "none",
            }}
          >
            ✦ Inkwell
          </Link>
          <p style={{ color: "var(--muted)", marginTop: "0.5rem", fontSize: "0.9rem" }}>
            Create your free account
          </p>
        </div>

        <div
          style={{
            background: "var(--surface)", border: "1.5px solid var(--border)",
            borderRadius: "1.25rem", padding: "2rem",
            boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
          }}
        >
          {error && (
            <div
              className="animate-slide-down"
              style={{
                display: "flex", alignItems: "flex-start", gap: "0.5rem",
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "0.625rem", padding: "0.75rem 1rem",
                color: "#ef4444", fontSize: "0.875rem", marginBottom: "1.25rem",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ marginTop: "1px", flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>Username</label>
              <input style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="choose_a_username" required autoFocus />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>Email <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
              <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  style={{ ...inputStyle, paddingRight: "2.8rem" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                >
                  {showPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <button
              type="submit" disabled={loading} className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "0.75rem", fontSize: "0.925rem", marginTop: "0.25rem" }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: "spin 0.8s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Creating account…
                </>
              ) : "Create account"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.875rem", color: "var(--muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
