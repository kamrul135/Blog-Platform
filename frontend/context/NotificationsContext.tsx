"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AuthContext } from "./AuthContext";
import api from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WsNotification {
  id: number;
  actor: { username: string; avatar: string | null };
  verb: string;
  post_slug: string | null;
  post_title: string | null;
  read: boolean;
  created: string;
}

interface NotificationsCtx {
  notifications: WsNotification[];
  unread: number;
  markAllRead: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const NotificationsContext = createContext<NotificationsCtx>({
  notifications: [],
  unread: 0,
  markAllRead: () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const WS_BASE = "ws://localhost:8000";
const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_DELAY_MS = 60_000;

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useContext(AuthContext);
  const [notifications, setNotifications] = useState<WsNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(RECONNECT_DELAY_MS);
  const destroyed = useRef(false);

  const markAllRead = useCallback(() => {
    api.markNotificationsRead().catch(() => {});
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  useEffect(() => {
    if (!auth?.user) {
      // User logged out – close WS and clear state
      destroyed.current = true;
      wsRef.current?.close();
      wsRef.current = null;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      setNotifications([]);
      setUnread(0);
      return;
    }

    destroyed.current = false;
    reconnectDelay.current = RECONNECT_DELAY_MS;

    // 1. Initial fetch so there's data before WS connects
    api
      .notifications()
      .then((res: any) => {
        if (destroyed.current) return;
        setNotifications(res.results ?? []);
        setUnread(res.unread_count ?? 0);
      })
      .catch(() => {});

    // 2. WebSocket connection with auto-reconnect
    const connect = async () => {
      if (destroyed.current) return;

      try {
        // Get a short-lived token the WS endpoint can validate
        const res: any = await api.get("/auth/ws-token/");
        if (destroyed.current) return;

        const ws = new WebSocket(
          `${WS_BASE}/ws/notifications/?token=${res.token}`
        );
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectDelay.current = RECONNECT_DELAY_MS; // reset backoff on success
        };

        ws.onmessage = (e) => {
          try {
            const data: WsNotification = JSON.parse(e.data);
            setNotifications((prev) => {
              // Deduplicate by id
              if (prev.some((n) => n.id === data.id)) return prev;
              return [data, ...prev];
            });
            setUnread((c) => c + 1);
          } catch {
            // ignore malformed messages
          }
        };

        ws.onerror = () => ws.close();

        ws.onclose = () => {
          wsRef.current = null;
          if (!destroyed.current) {
            reconnectTimer.current = setTimeout(() => {
              reconnectDelay.current = Math.min(
                reconnectDelay.current * 2,
                MAX_RECONNECT_DELAY_MS
              );
              connect();
            }, reconnectDelay.current);
          }
        };
      } catch {
        // ws-token fetch failed (e.g. user not logged in) – retry later
        if (!destroyed.current) {
          reconnectTimer.current = setTimeout(
            connect,
            reconnectDelay.current
          );
          reconnectDelay.current = Math.min(
            reconnectDelay.current * 2,
            MAX_RECONNECT_DELAY_MS
          );
        }
      }
    };

    connect();

    return () => {
      destroyed.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
    // Re-run only when the logged-in user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user?.username]);

  return (
    <NotificationsContext.Provider value={{ notifications, unread, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}
