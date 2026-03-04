"use client";

import Link from "next/link";
import Image from "next/image";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationsContext";
import { useRouter, usePathname } from "next/navigation";

const VERB_LABEL: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
};

export default function Navbar() {
  const auth = useContext(AuthContext);
  const { resolvedTheme, setTheme } = useTheme();
  const { notifications, unread, markAllRead } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    if (auth) { await auth.logout(); router.push("/login"); }
  };

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openNotifications = () => {
    setNotifOpen((p) => !p);
    if (unread > 0) markAllRead();
  };

  const initials = auth?.user?.username?.[0]?.toUpperCase() ?? "?";

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "linear-gradient(135deg, #4f46e5, #6366f1)", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1rem" }} className="h-14 flex items-center gap-6">

        {/* Brand */}
        <Link href="/" style={{ fontWeight: 800, fontSize: "1.2rem", color: "white", textDecoration: "none", flexShrink: 0 }}>
          ✦ Inkwell
        </Link>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-5 ml-2">
          {[{ href: "/", label: "Home" }, ...(auth?.user ? [{ href: "/dashboard", label: "Dashboard" }] : [])].map(({ href, label }) => (
            <Link key={href} href={href} style={{ color: pathname === href ? "white" : "rgba(255,255,255,0.72)", fontWeight: pathname === href ? 700 : 500, fontSize: "0.875rem", textDecoration: "none" }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center gap-2">

          {/* Theme toggle */}
          <button onClick={toggleTheme} title="Toggle theme"
            style={{ background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
          >
            {resolvedTheme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {auth?.user ? (
            <>
              {/* Write */}
              <Link href="/posts/new" className="hidden sm:flex items-center gap-1"
                style={{ background: "rgba(255,255,255,0.18)", color: "white", border: "none", borderRadius: "0.5rem", padding: "0.35rem 0.875rem", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Write
              </Link>

              {/* Notifications bell */}
              <div ref={notifRef} style={{ position: "relative" }}>
                <button onClick={openNotifications} title="Notifications"
                  style={{ position: "relative", background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {unread > 0 && (
                    <span style={{ position: "absolute", top: "4px", right: "4px", width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", display: "block" }} />
                  )}
                </button>

                {notifOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "320px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "0.875rem", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden", zIndex: 100 }}>
                    <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>Notifications</span>
                      {unread > 0 && <span style={{ fontSize: "0.72rem", background: "#ef4444", color: "white", borderRadius: "999px", padding: "1px 7px", fontWeight: 700 }}>{unread}</span>}
                    </div>
                    <div style={{ maxHeight: "340px", overflowY: "auto" }}>
                      {notifications.length === 0 ? (
                        <p style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>No notifications yet</p>
                      ) : notifications.map((n) => (
                        <div key={n.id}
                          onClick={() => { if (n.post_slug) router.push(`/posts/${n.post_slug}`); setNotifOpen(false); }}
                          style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: n.post_slug ? "pointer" : "default", borderBottom: "1px solid var(--border)", background: n.read ? "transparent" : "rgba(99,102,241,0.04)" }}
                          onMouseEnter={(e) => { if (n.post_slug) (e.currentTarget as HTMLDivElement).style.background = "rgba(99,102,241,0.07)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = n.read ? "transparent" : "rgba(99,102,241,0.04)"; }}
                        >
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: "white", flexShrink: 0 }}>
                            {n.actor.username[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "0.82rem", margin: 0, color: "var(--foreground)", lineHeight: 1.4 }}>
                              <strong>{n.actor.username}</strong> {VERB_LABEL[n.verb] ?? n.verb}
                              {n.post_title && <> — <em style={{ color: "var(--muted)" }}>{n.post_title}</em></>}
                            </p>
                            <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: "0.2rem 0 0" }}>
                              {new Date(n.created).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                          {!n.read && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: "4px" }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings gear */}
              <Link href="/settings" title="Settings"
                style={{ background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "50%", color: "white", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </Link>

              {/* Avatar */}
              <Link href={`/users/${auth.user.username}`}>
                {auth.user.avatar ? (
                  <Image src={auth.user.avatar} alt={auth.user.username} width={32} height={32}
                    title={auth.user.username}
                    style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", cursor: "pointer", border: "2px solid rgba(255,255,255,0.4)" }} />
                ) : (
                  <div title={auth.user.username}
                    style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 800, color: "white", cursor: "pointer", border: "2px solid rgba(255,255,255,0.4)" }}>
                    {initials}
                  </div>
                )}
              </Link>

              {/* Logout */}
              <button onClick={handleLogout} title="Logout"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", fontWeight: 500, padding: "0 4px" }}
                className="hidden sm:block"
                onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none" }}>Sign in</Link>
              <Link href="/register" className="btn-primary" style={{ background: "white", color: "#4f46e5" }}>Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}