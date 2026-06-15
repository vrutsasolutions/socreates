// ════════════════════════════════════════════════════════════════════════
//  NotificationContext
//  ----------------------------------------------------------------------
//  Single source of notification state for the bell + toasts.
//    • initial list / unread count / mark-read  → REST (mock for now, §7 gaps)
//    • live pushes                              → STOMP/SockJS (live)
//  On each live push we prepend to the list, bump unread, and surface a toast.
// ════════════════════════════════════════════════════════════════════════
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchNotifications,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  subscribeToNotifications,
} from '../api/notificationApi';

const NotificationContext = createContext(null);

const TOAST_TTL = 5000; // auto-dismiss toast after 5s

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems]   = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const toastTimers = useRef({});

  const unreadCount = items.filter((n) => !n.read).length;
  const unreadMessages = items.filter((n) => !n.read && n.type === 'message').length;

  // ── Toasts ────────────────────────────────────────────────────────────
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(toastTimers.current[id]);
    delete toastTimers.current[id];
  }, []);

  const pushToast = useCallback((n) => {
    setToasts((prev) => [n, ...prev].slice(0, 3)); // cap at 3 stacked
    toastTimers.current[n.id] = setTimeout(() => dismissToast(n.id), TOAST_TTL);
  }, [dismissToast]);

  // ── Initial load (REST, mock for now) ─────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[notifications] failed to load list', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Mark read (optimistic; REST mock for now) ─────────────────────────
  const markAsRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await apiMarkAsRead(id); } catch (err) { console.error('[notifications] markAsRead failed', err); }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await apiMarkAllAsRead(); } catch (err) { console.error('[notifications] markAllAsRead failed', err); }
  }, []);

  // ── Wire up only when logged in ───────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setItems([]);
      setToasts([]);
      return;
    }

    load();

    const unsubscribe = subscribeToNotifications((n) => {
      setItems((prev) => {
        if (prev.some((x) => x.id === n.id)) return prev; // dedupe
        return [n, ...prev];
      });
      pushToast(n);
    });

    return () => {
      unsubscribe?.();
      Object.values(toastTimers.current).forEach(clearTimeout);
      toastTimers.current = {};
    };
  }, [user, load, pushToast]);

  // Mark all message-type notifications as read (call when user opens /messages)
  const clearMessageNotifications = useCallback(async () => {
    const msgIds = items.filter((n) => !n.read && n.type === 'message').map((n) => n.id);
    if (msgIds.length === 0) return;
    setItems((prev) => prev.map((n) => n.type === 'message' ? { ...n, read: true } : n));
    try {
      await Promise.all(msgIds.map((id) => apiMarkAsRead(id)));
    } catch (err) {
      console.error('[notifications] clearMessageNotifications failed', err);
    }
  }, [items]);

  return (
    <NotificationContext.Provider
      value={{ items, unreadCount, unreadMessages, loading, toasts, markAsRead, markAllAsRead, dismissToast, clearMessageNotifications, reload: load }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
