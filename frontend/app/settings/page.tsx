"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "../../lib/api";

export default function SettingsPage() {
  const auth = useContext(AuthContext);
  const router = useRouter();

  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [github, setGithub] = useState("");
  const [email, setEmail] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth?.user && !auth?.loading) { router.push("/login"); return; }
    if (auth?.user) {
      setBio(auth.user.bio ?? "");
      setWebsite(auth.user.website ?? "");
      setTwitter(auth.user.twitter ?? "");
      setGithub(auth.user.github ?? "");
      setEmail(auth.user.email ?? "");
    }
  }, [auth?.user, auth?.loading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match."); return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = { bio, website, twitter, github, email };
      if (oldPassword && newPassword) {
        body.old_password = oldPassword;
        body.new_password = newPassword;
      }
      const res: any = await api.updateProfile(body);
      auth?.updateUser(res);
      setSuccess("Profile updated successfully!");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      setError(err.message ?? "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("File must be under 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploadingAvatar(true);
    try {
      const res: any = await api.uploadAvatar(file);
      setAvatarPreview(res.avatar);
      auth?.updateUser({ avatar: res.avatar });
      setSuccess("Profile picture updated!");
    } catch (err: any) {
      setError(err.message ?? "Avatar upload failed.");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!auth?.user) return null;

  const displayAvatar = avatarPreview || auth.user.avatar;

  return (
    <div className="animate-fade-in" style={{ maxWidth: "680px", margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>
        Account Settings
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "2.5rem", fontSize: "0.9rem" }}>
        Manage your profile, bio, social links, and password.
      </p>

      {/* Alerts */}
      {error && (
        <div className="animate-slide-down" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.625rem", padding: "0.875rem 1rem", marginBottom: "1.5rem", color: "#ef4444", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="animate-slide-down" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "0.625rem", padding: "0.875rem 1rem", marginBottom: "1.5rem", color: "#10b981", fontSize: "0.875rem" }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        {/* Avatar card */}
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "1rem", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Profile Picture</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ position: "relative", width: "72px", height: "72px", flexShrink: 0 }}>
              {displayAvatar ? (
                <Image src={displayAvatar} alt="avatar" width={72} height={72}
                  style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", opacity: uploadingAvatar ? 0.5 : 1 }} />
              ) : (
                <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", fontWeight: 800, color: "white", opacity: uploadingAvatar ? 0.5 : 1 }}>
                  {auth.user.username[0].toUpperCase()}
                </div>
              )}
              {uploadingAvatar && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
                  <svg style={{ animation: "spin 0.8s linear infinite" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                </div>
              )}
            </div>
            <div>
              <button type="button" className="btn-ghost" onClick={() => fileInputRef.current?.click()}>
                Change photo
              </button>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.5rem" }}>JPG, PNG, GIF up to 5 MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </div>
        </div>

        {/* Profile info */}
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "1rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Profile Info</h2>

          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "0.6rem", border: "1.5px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: "0.9rem" }} />
          </div>

          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell readers about yourself…"
              style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "0.6rem", border: "1.5px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: "0.9rem", resize: "vertical" }} />
          </div>

          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>Website</label>
            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourwebsite.com"
              style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "0.6rem", border: "1.5px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: "0.9rem" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>Twitter / X</label>
              <input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@handle"
                style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "0.6rem", border: "1.5px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: "0.9rem" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>GitHub</label>
              <input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="username"
                style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "0.6rem", border: "1.5px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: "0.9rem" }} />
            </div>
          </div>
        </div>

        {/* Password */}
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "1rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Change Password <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: "0.82rem" }}>(leave blank to keep current)</span></h2>
          {[
            { label: "Current password", value: oldPassword, setter: setOldPassword },
            { label: "New password", value: newPassword, setter: setNewPassword },
            { label: "Confirm new password", value: confirmPassword, setter: setConfirmPassword },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>{label}</label>
              <input type="password" value={value} onChange={(e) => setter(e.target.value)}
                style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "0.6rem", border: "1.5px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: "0.9rem" }} />
            </div>
          ))}
        </div>

        {/* Save */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn-primary" disabled={saving} style={{ padding: "0.7rem 2rem", fontSize: "0.95rem" }}>
            {saving ? (
              <><svg style={{ animation: "spin 0.8s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 0 1 10 10"/></svg> Saving…</>
            ) : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
