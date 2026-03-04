"use client";

import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";
import dynamic from "next/dynamic";

const TipTapEditor = dynamic(() => import("../../../components/TipTapEditor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        border: "1.5px solid var(--border)", borderRadius: "0.875rem",
        minHeight: "300px", display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--muted)", fontSize: "0.9rem",
      }}
    >
      Loading editor…
    </div>
  ),
});

export default function NewPostPage() {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("draft");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth?.loading && !auth?.user) router.push("/login");
  }, [auth, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/posts/", { title, content, status });
      router.push("/dashboard");
    } catch {
      setError("Failed to create post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { display: "block", fontSize: "0.8rem", fontWeight: 600 as const, marginBottom: "0.5rem", color: "var(--foreground)" };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.875rem", padding: 0 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6"/></svg>
          Back
        </button>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>New Post</h1>
      </div>

      {error && (
        <div style={{ color: "var(--danger)", fontSize: "0.875rem", padding: "0.75rem 1rem", background: "rgba(239,68,68,0.06)", borderRadius: "0.625rem", border: "1px solid rgba(239,68,68,0.2)", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "1.25rem", padding: "2rem", marginBottom: "1.25rem" }}>
          {/* Title */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>Title</label>
            <input
              style={{
                width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem",
                border: "1.5px solid var(--border)", background: "var(--surface-hover)",
                color: "var(--foreground)", fontSize: "1.05rem", fontWeight: 600,
              }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a great title…"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label style={labelStyle}>Content</label>
            <TipTapEditor content={content} onChange={setContent} placeholder="Start writing your post…" />
          </div>
        </div>

        {/* Footer bar */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--surface)", border: "1.5px solid var(--border)",
            borderRadius: "1rem", padding: "1rem 1.5rem", flexWrap: "wrap", gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <label style={{ ...labelStyle, margin: 0 }}>Publish as:</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {["draft", "published"].map((s) => (
                <button
                  key={s} type="button" onClick={() => setStatus(s)}
                  style={{
                    padding: "0.35rem 0.875rem", borderRadius: "0.5rem", fontSize: "0.8rem",
                    fontWeight: 600, cursor: "pointer", border: "1.5px solid",
                    borderColor: status === s ? "var(--primary)" : "var(--border)",
                    background: status === s ? "rgba(99,102,241,0.08)" : "transparent",
                    color: status === s ? "var(--primary)" : "var(--muted)",
                    transition: "all 0.2s", textTransform: "capitalize" as const,
                  }}
                >
                  {s === "published" ? "✨ Publish" : "📝 Draft"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="button" onClick={() => router.back()} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <>
                  <svg style={{ animation: "spin 0.8s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Saving…
                </>
              ) : status === "published" ? "✨ Publish" : "📝 Save Draft"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
