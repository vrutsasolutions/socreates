// ════════════════════════════════════════════════════════════════════════
//  Real-time notifications.
//  Backend: ⏳ under development (Vishakha). Mock-backed until live.
//  Flip USE_MOCK.notifications → false in config.js when ready.
//
//  Real-time transport (WebSocket/SSE) to be confirmed with Vishakha — see
//  subscribeToNotifications() below. Until then, mocks poll-free / static.
// ════════════════════════════════════════════════════════════════════════
import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';
import { MOCK_NOTIFICATIONS } from './mockData';

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

// ── Real-time subscription ──────────────────────────────────────────────────
// Transport TBD with Vishakha (WebSocket vs SSE). Returns an unsubscribe fn.
// In mock mode it's a no-op so callers can wire it up now without errors.
export const subscribeToNotifications = (onMessage) => {
  if (USE_MOCK.notifications) {
    // Optional: simulate a push after 8s during dev. Comment out if noisy.
    const t = setTimeout(() => {
      onMessage?.({
        id: 'n-live-' + Date.now(),
        type: 'like',
        title: 'New like',
        message: 'Someone just liked your idea',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/home',
      });
    }, 8000);
    return () => clearTimeout(t);
  }

  // ── Live (example, confirm with Vishakha) ──
  // const base = import.meta.env.VITE_WS_URL || 'ws://localhost:8081/ws/notifications';
  // const token = localStorage.getItem('token');
  // const ws = new WebSocket(`${base}?token=${token}`);
  // ws.onmessage = (e) => onMessage?.(JSON.parse(e.data));
  // return () => ws.close();

  // SSE alternative:
  // const es = new EventSource('/api/notifications/stream');
  // es.onmessage = (e) => onMessage?.(JSON.parse(e.data));
  // return () => es.close();

  return () => {};
};
