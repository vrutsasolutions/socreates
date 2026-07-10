// ════════════════════════════════════════════════════════════════════════
//  NotificationContext
//  ----------------------------------------------------------------------
//  Single source of notification state for the bell + toasts.
//    • initial list / unread count / mark-read  → REST (mock for now, §7 gaps)
//    • live pushes                              → STOMP/SockJS (live)
//  On each live push we prepend to the list, bump unread, and surface a toast.
// ════════════════════════════════════════════════════════════════════════
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchNotifications,
  markAsRead as apiMarkAsRead,
  subscribeToNotifications,
  normalizeNotification,
} from '../api/notificationApi';

const NotificationContext = createContext(null);

const TOAST_TTL = 5000; // auto-dismiss toast after 5s

// Notifications older than this fall out of both dropdowns (bell + message
// icon) automatically — they still exist server-side and are counted in
// history if you ever build a "view all" page, but the dropdown itself
// should feel current rather than accumulating stale weeks-old rows.
const DROPDOWN_RETENTION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

// ── Message-notification clubbing (MessageBell dropdown) ───────────────────
// The backend saves one Notification row per DM event (every text/photo/
// voice/file/idea sent), so a chatty sender produces a run of near-identical
// rows ("Dora Bujji sent you a voice note", "...a message", "...a file").
// Rather than list each one separately, we club everything from the same
// conversation into a single dropdown entry that names the sender once and
// summarizes what came in. This is a pure view-layer grouping — the
// underlying `items` list (and each notification's own id/read state) is
// untouched, so per-item read receipts still work.

// Preview strings are always built server-side (MessageService.sendMessage)
// as "{name} sent you a photo|voice note|file|message: ..." or
// "{name} shared an idea" — split on those separators to recover the name.
const SENDER_SPLIT_RE = / sent you | shared an idea/i;
const extractSenderName = (text = '') => {
  const parts = text.split(SENDER_SPLIT_RE);
  return parts.length > 1 && parts[0].trim() ? parts[0].trim() : null;
};

const KIND_PATTERNS = [
  [/sent you a photo/i, 'photo'],
  [/sent you a voice note/i, 'voice'],
  [/sent you a file/i, 'file'],
  [/shared an idea/i, 'idea'],
];
const classifyKind = (text = '') => {
  const hit = KIND_PATTERNS.find(([re]) => re.test(text));
  return hit ? hit[1] : 'text';
};

const KIND_SINGULAR = { photo: 'a photo', voice: 'a voice note', file: 'a file', idea: 'an idea', text: 'a message' };
const KIND_PLURAL   = { photo: 'photos',  voice: 'voice notes',  file: 'files',  idea: 'ideas',    text: 'messages' };

// Turns a club of raw notifications into one human summary that "defines"
// everything in it, e.g. "Sent you 2 messages, a voice note and a file".
const summarizeGroup = (groupItems) => {
  if (groupItems.length === 1) return groupItems[0].message;

  const counts = {};
  groupItems.forEach((n) => {
    const kind = classifyKind(n.message);
    counts[kind] = (counts[kind] || 0) + 1;
  });

  const parts = Object.entries(counts).map(([kind, count]) =>
    count === 1 ? KIND_SINGULAR[kind] : `${count} ${KIND_PLURAL[kind]}`,
  );

  const joined = parts.length > 1
    ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
    : parts[0];

  return `Sent you ${joined}`;
};

// Groups newest-first `messageItems` by conversation (falling back to the
// extracted sender name, then to a singleton key, for older rows without a
// conversationId). Because the input is already newest-first, the first
// item seen for a given key is always that group's most recent activity —
// so the returned groups come out sorted by recency for free.
const groupMessageNotifications = (messageItems) => {
  const groups = [];
  const byKey = new Map();

  messageItems.forEach((n) => {
    const senderName = extractSenderName(n.message);
    const key = n.conversationId ?? senderName ?? `single-${n.id}`;

    let group = byKey.get(key);
    if (!group) {
      group = { key, conversationId: n.conversationId ?? null, senderName, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(n);
  });

  return groups.map((group) => {
    const latest = group.items[0];
    return {
      id: group.key,
      ids: group.items.map((n) => n.id),
      conversationId: group.conversationId,
      link: latest.link,
      title: group.senderName ?? latest.title,
      message: summarizeGroup(group.items),
      count: group.items.length,
      unreadCount: group.items.filter((n) => !n.read).length,
      read: group.items.every((n) => n.read),
      createdAt: latest.createdAt,
    };
  });
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems]   = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const toastTimers = useRef({});

  // Ticks every few minutes purely to force a re-check of the retention
  // window below — without this, an item wouldn't drop out of the dropdown
  // until *some other* state change (a new notification, a mark-as-read)
  // happened to trigger a re-render, even after it had aged past 2 days.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 5 * 60 * 1000);
    return () => clearInterval(tick);
  }, []);

  // Everything the dropdowns (and their unread badges) read from is scoped
  // to this window — items past it are simply excluded, not deleted, so
  // markAsRead etc. still work fine if a stale id somehow gets referenced.
  const visibleItems = items.filter((n) => {
    const age = now - new Date(n.createdAt).getTime();
    return Number.isNaN(age) || age <= DROPDOWN_RETENTION_MS;
  });

  // ── Split counts: bell = everything except messages, message icon = messages only ──
  const unreadMessages = visibleItems.filter((n) => !n.read && n.type === 'message').length;
  const unreadCount    = visibleItems.filter((n) => !n.read && n.type !== 'message').length;

  // ── Split lists: bell shows idea-related activity, message icon shows DMs ──
  const bellItems    = visibleItems.filter((n) => n.type !== 'message');
  const messageItems = visibleItems.filter((n) => n.type === 'message');

  // Message dropdown, clubbed one-row-per-conversation (see helpers above).
  const groupedMessageItems = useMemo(
    () => groupMessageNotifications(messageItems),
    [messageItems],
  );

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

  // ── Initial load ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchNotifications();
      // ✅ normalize backend payload → { id, type, title, message, read, createdAt, link }
      const list = Array.isArray(data) ? data : [];
      setItems(list.map((n) => normalizeNotification(n)));
    } catch (err) {
      console.error('[notifications] failed to load list', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Mark read (optimistic) ────────────────────────────────────────────
  const markAsRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await apiMarkAsRead(id); } catch (err) { console.error('[notifications] markAsRead failed', err); }
  }, []);

  // Mark every notification in a clubbed MessageBell group as read (called
  // when the person taps a grouped row — opens the chat and clears all the
  // individual unread dots that were rolled up into it).
  const markGroupAsRead = useCallback(async (ids) => {
    const idSet = new Set(ids);
    const unreadIds = items.filter((n) => idSet.has(n.id) && !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setItems((prev) => prev.map((n) => (idSet.has(n.id) ? { ...n, read: true } : n)));
    try {
      await Promise.all(unreadIds.map((id) => apiMarkAsRead(id)));
    } catch (err) {
      console.error('[notifications] markGroupAsRead failed', err);
    }
  }, [items]);

  // Mark all non-message ("bell") notifications as read
  const markAllAsRead = useCallback(async () => {
    const ids = items.filter((n) => !n.read && n.type !== 'message').map((n) => n.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((n) => (n.type !== 'message' ? { ...n, read: true } : n)));
    try {
      await Promise.all(ids.map((id) => apiMarkAsRead(id)));
    } catch (err) {
      console.error('[notifications] markAllAsRead failed', err);
    }
  }, [items]);

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
      value={{
        items, bellItems, messageItems, groupedMessageItems,
        unreadCount, unreadMessages, loading,
        toasts, markAsRead, markGroupAsRead, markAllAsRead, dismissToast,
        clearMessageNotifications, reload: load,
      }}
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
