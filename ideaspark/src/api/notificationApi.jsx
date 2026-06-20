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

let mockStore = MOCK_NOTIFICATIONS.map((n) => ({ ...n }));

export const fetchNotifications = () =>
  USE_MOCK.notifications
    ? mockResponse(mockStore.map((n) => ({ ...n })))
    : api.get('/notifications');

export const fetchUnreadCount = () =>
  USE_MOCK.notifications
    ? mockResponse({ count: mockStore.filter((n) => !n.read).length }, 200)
    : api.get('/notifications/unread-count');

export const markAsRead = (id) => {
  if (USE_MOCK.notifications) {
    mockStore = mockStore.map((n) => (n.id === id ? { ...n, read: true } : n));
    return mockResponse({}, 200);
  }
  return api.post(`/notifications/${id}/read`);
};

export const markAllAsRead = () => {
  if (USE_MOCK.notifications) {
    mockStore = mockStore.map((n) => ({ ...n, read: true }));
    return mockResponse({}, 200);
  }
  return api.post('/notifications/read-all');
};

export const normalizeNotification = (n = {}) => {
  const message = n.message ?? '';
  const lower = message.toLowerCase();

  let type = 'system';
  if (lower.includes('message') || lower.includes('sent you')) type = 'message';
  else if (lower.includes('like')) type = 'like';
  else if (lower.includes('bookmark') || lower.includes('saved')) type = 'bookmark';
  else if (lower.includes('publish') || lower.includes('posted') || lower.includes('idea')) type = 'idea';
  else if (lower.includes('follow')) type = 'follow';
  else if (lower.includes('comment')) type = 'comment';

  const TITLES = {
    message: 'New message',
    like: 'New like',
    bookmark: 'New bookmark',
    idea: 'New idea',
    follow: 'New follower',
    comment: 'New comment',
    system: 'Notification',
  };

  const IDEA_LINK_TYPES = new Set(['like', 'bookmark', 'comment', 'idea']);

  const defaultLink =
    IDEA_LINK_TYPES.has(type) && n.referenceId
      ? `/ideas/${n.referenceId}`
      : type === 'follow' && n.referenceId
        ? `/users/${n.referenceId}`
        : type === 'message'
          ? '/messages'
          : '/home';

  return {
    id: n.id ?? 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    type,
    title: n.title ?? TITLES[type],
    message,
    read: n.read ?? n.readStatus ?? false,
    createdAt: n.createdAt ?? new Date().toISOString(),
    referenceId: n.referenceId ?? null,
    link: n.link ?? defaultLink,
  };
};

export const subscribeToNotifications = (onMessage) => {
  if (USE_MOCK.notificationsRealtime) {
    const t = setTimeout(() => {
      onMessage?.(
        normalizeNotification({
          id: 'n-live-' + Date.now(),
          message: 'Someone just liked your idea',
          readStatus: false,
          createdAt: new Date().toISOString(),
        }),
      );
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
    client.subscribe(TOPIC_NOTIFICATIONS, (frame) => {
      try {
        onMessage?.(normalizeNotification(JSON.parse(frame.body)));
      } catch (err) {
        console.error('[notifications] bad STOMP payload', err, frame.body);
      }
    });
  };

  client.onStompError = (frame) => {
    console.error('[notifications] STOMP error', frame.headers['message'], frame.body);
  };

  client.activate();

  return () => {
    client.deactivate();
  };
};
