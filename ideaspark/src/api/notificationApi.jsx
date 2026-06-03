// ════════════════════════════════════════════════════════════════════════
//  Real-time notifications.
//
//  Backend (Vishakha) shipped real-time push but NOT the REST CRUD:
//    ✅ LIVE  — STOMP over SockJS: connect ws://localhost:8081/ws (SockJS
//               handshake), SUBSCRIBE destination /topic/notifications
//               Pushed on every like / bookmark / idea publish.
//    ⏳ MOCK  — GET / , GET /unread-count , POST /{id}/read , POST /read-all
//               do NOT exist server-side yet (only POST /send). They stay
//               mock-backed (USE_MOCK.notifications) until she adds them.
//
//  Backend payload differs from API_CONTRACT.md §7 — normalized below in
//  normalizeNotification(): backend sends
//    { id:UUID, message, readStatus, createdAt, user } (no type/title/link)
//  the UI expects
//    { id, type, title, message, read, createdAt, link }.
// ════════════════════════════════════════════════════════════════════════
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';
import { MOCK_NOTIFICATIONS } from './mockData';

// SockJS handshake endpoint (NOT a raw ws:// URL — backend uses .withSockJS()).
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8081/ws';
const TOPIC  = '/user/queue/notifications';

// Local mutable copy so mock mark-as-read reflects in the UI during dev.
let mockStore = MOCK_NOTIFICATIONS.map((n) => ({ ...n }));

// GET /api/notifications → Notification[]
export const fetchNotifications = () =>
  USE_MOCK.notifications
    ? mockResponse(mockStore.map((n) => ({ ...n })))
    : api.get('/notifications');

// GET /api/notifications/unread-count → { count }
export const fetchUnreadCount = () =>
  USE_MOCK.notifications
    ? mockResponse({ count: mockStore.filter((n) => !n.read).length }, 200)
    : api.get('/notifications/unread-count');

// POST /api/notifications/{id}/read
export const markAsRead = (id) => {
  if (USE_MOCK.notifications) {
    mockStore = mockStore.map((n) => (n.id === id ? { ...n, read: true } : n));
    return mockResponse({}, 200);
  }
  return api.post(`/notifications/${id}/read`);
};

// POST /api/notifications/read-all
export const markAllAsRead = () => {
  if (USE_MOCK.notifications) {
    mockStore = mockStore.map((n) => ({ ...n, read: true }));
    return mockResponse({}, 200);
  }
  return api.post('/notifications/read-all');
};

// ── Payload normalization ───────────────────────────────────────────────────
// Maps the backend Notification entity onto the shape the UI/mock layer use.
// The backend has no `type`/`title`/`link`, so we derive them from the message
// text (the only signal we get) for icon + routing purposes.
export const normalizeNotification = (n = {}) => {
  const message = n.message ?? '';
  const lower = message.toLowerCase();

  let type = 'system';
  if (lower.includes('like')) type = 'like';
  else if (lower.includes('bookmark') || lower.includes('saved') || lower.includes('save')) type = 'bookmark';
  else if (lower.includes('publish') || lower.includes('posted') || lower.includes('idea')) type = 'idea';
  else if (lower.includes('follow')) type = 'follow';
  else if (lower.includes('comment')) type = 'comment';

  const TITLES = {
    like: 'New like', bookmark: 'New bookmark', idea: 'New idea',
    follow: 'New follower', comment: 'New comment', system: 'Notification',
  };

  return {
    id: n.id ?? 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    type,
    title: n.title ?? TITLES[type],
    message,
    // Backend uses `readStatus`; UI/mock use `read`. Accept either.
    read: n.read ?? n.readStatus ?? false,
    createdAt: n.createdAt ?? new Date().toISOString(),
    link: n.link ?? '/home',
  };
};

// ── Real-time subscription ──────────────────────────────────────────────────
// STOMP over SockJS. Calls onMessage(normalizedNotification) on each push.
// Returns an unsubscribe/disconnect fn. In realtime-mock mode it simulates a
// push so the UI can be exercised offline.
export const subscribeToNotifications = (onMessage) => {
  if (USE_MOCK.notificationsRealtime) {
    const t = setTimeout(() => {
      onMessage?.(normalizeNotification({
        id: 'n-live-' + Date.now(),
        message: 'Someone just liked your idea',
        readStatus: false,
        createdAt: new Date().toISOString(),
      }));
    }, 8000);
    return () => clearTimeout(t);
  }

  // ── Live STOMP/SockJS ──
  // NOTE: the backend handshake is currently unauthenticated and broadcasts to a
  // single shared /topic/notifications (not per-user). We still pass the JWT in
  // the CONNECT headers so it keeps working once Vishakha adds auth + per-user
  // queues (e.g. /user/queue/notifications).
  const token = localStorage.getItem('token');
  const client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,        // auto-reconnect on drop
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  });

  client.onConnect = () => {
    client.subscribe(TOPIC, (frame) => {
      try {
        onMessage?.(normalizeNotification(JSON.parse(frame.body)));
      } catch (err) {
        console.error('[notifications] bad STOMP payload', err, frame.body);
      }
    });
  };

  client.onStompError = (frame) =>
    console.error('[notifications] STOMP error', frame.headers['message'], frame.body);

  client.activate();

  return () => { client.deactivate(); };
};
