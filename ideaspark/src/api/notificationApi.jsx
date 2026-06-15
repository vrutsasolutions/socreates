// ════════════════════════════════════════════════════════════════════════
//  Real-time notifications.
//
//  Backend shipped real-time push + REST CRUD:
//    ✅ LIVE  — STOMP over SockJS: /queue/notifications (per-user)
//               Also /queue/messages (new DM) — both surfaces a toast.
//    ✅ LIVE  — GET /api/notifications, unread-count, mark-read, read-all
// ════════════════════════════════════════════════════════════════════════
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';
import { MOCK_NOTIFICATIONS } from './mockData';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8081/ws';
const TOPIC_NOTIFICATIONS = '/user/queue/notifications';
const TOPIC_MESSAGES      = '/user/queue/messages'; // new DM pushes

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
// Maps the backend Notification entity → shape the UI expects.
// Backend sends: { id, message, readStatus, createdAt, user }
// UI expects:    { id, type, title, message, read, createdAt, link }
export const normalizeNotification = (n = {}) => {
  const message = n.message ?? '';
  const lower = message.toLowerCase();

  let type = 'system';
  if (lower.includes('message') || lower.includes('sent you'))  type = 'message';
  else if (lower.includes('like'))                              type = 'like';
  else if (lower.includes('bookmark') || lower.includes('saved')) type = 'bookmark';
  else if (lower.includes('publish') || lower.includes('posted') || lower.includes('idea')) type = 'idea';
  else if (lower.includes('follow'))                            type = 'follow';
  else if (lower.includes('comment'))                           type = 'comment';

  const TITLES = {
    message:  'New message',
    like:     'New like',
    bookmark: 'New bookmark',
    idea:     'New idea',
    follow:   'New follower',
    comment:  'New comment',
    system:   'Notification',
  };

  // Types that point at an idea — deep-link via referenceId when available.
  const IDEA_LINK_TYPES = new Set(['like', 'bookmark', 'comment', 'idea']);
  const defaultLink = IDEA_LINK_TYPES.has(type) && n.referenceId
    ? `/ideas/${n.referenceId}`
    : (type === 'message' ? '/messages' : '/home');

  return {
    id:        n.id ?? 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    type,
    title:     n.title ?? TITLES[type],
    message,
    read:      n.read ?? n.readStatus ?? false,
    createdAt: n.createdAt ?? new Date().toISOString(),
    referenceId: n.referenceId ?? null,
    // For idea-related notifications, link straight to the idea page;
    // message notifications go to the inbox; everything else to home.
    link:      n.link ?? defaultLink,
  };
};

/**
 * Synthesize a notification object from a live MessageDTO push.
 * When the backend pushes to /queue/messages, it sends a MessageDTO,
 * not a Notification. We convert it so NotificationContext can surface a toast.
 */
const messageToNotification = (msgDto) => ({
  id:        'n-msg-' + (msgDto.id ?? Date.now()),
  type:      'message',
  title:     'New message',
  message:   msgDto.senderName
               ? `${msgDto.senderName} sent you a message`
               : 'You have a new message',
  read:      false,
  createdAt: msgDto.createdAt ?? new Date().toISOString(),
  link:      msgDto.conversationId
               ? `/messages/${msgDto.conversationId}`
               : '/messages',
});

// ── Real-time subscription ──────────────────────────────────────────────────
// Subscribes to BOTH /queue/notifications AND /queue/messages.
// Calls onMessage(normalizedNotification) for each push.
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

  const token = localStorage.getItem('token');
  const client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  });

  client.onConnect = () => {
    // ── Standard notification push (likes, follows, etc.) ──────────────────
    client.subscribe(TOPIC_NOTIFICATIONS, (frame) => {
      try {
        onMessage?.(normalizeNotification(JSON.parse(frame.body)));
      } catch (err) {
        console.error('[notifications] bad STOMP payload', err, frame.body);
      }
    });

    // ── New DM push — surface as a toast notification ───────────────────────
    client.subscribe(TOPIC_MESSAGES, (frame) => {
      try {
        const msgDto = JSON.parse(frame.body);
        // Only show toast for messages FROM others (backend pushes to recipient only,
        // but guard anyway to avoid self-notification on the sender's tab)
        const myId = (() => {
          try { return JSON.parse(localStorage.getItem('user') || '{}').id; } catch { return null; }
        })();
        if (myId && String(msgDto.senderId) === String(myId)) return;
        onMessage?.(messageToNotification(msgDto));
      } catch (err) {
        console.error('[notifications] bad message STOMP payload', err, frame.body);
      }
    });
  };

  client.onStompError = (frame) =>
    console.error('[notifications] STOMP error', frame.headers['message'], frame.body);

  client.activate();

  return () => { client.deactivate(); };
};
