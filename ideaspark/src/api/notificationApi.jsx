// ════════════════════════════════════════════════════════════════════════
//  Real-time notifications.
//
//  Backend shipped real-time push + REST CRUD:
//    ✅ LIVE  — STOMP over SockJS: /queue/notifications (per-user)
//               Also /queue/messages (new DM) — both surfaces a toast.
//    ✅ LIVE  — GET /api/notifications, unread-count, mark-read, read-all
// ════════════════════════════════════════════════════════════════════════
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import api from "./axiosInstance";
import { USE_MOCK, mockResponse } from "./config";
import { MOCK_NOTIFICATIONS } from "./mockData";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:8081/ws";

const TOPIC_NOTIFICATIONS = "/user/queue/notifications";
const TOPIC_MESSAGES = "/user/queue/messages";
const TOPIC_READ_RECEIPTS = "/user/queue/read-receipts";

let mockStore = MOCK_NOTIFICATIONS.map((n) => ({ ...n }));

export const fetchNotifications = () =>
  USE_MOCK.notifications
    ? mockResponse(mockStore.map((n) => ({ ...n })))
    : api.get("/notifications");

export const fetchUnreadCount = () =>
  USE_MOCK.notifications
    ? mockResponse({ count: mockStore.filter((n) => !n.read).length }, 200)
    : api.get("/notifications/unread-count");

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
  return api.post("/notifications/read-all");
};

export const normalizeNotification = (n = {}) => {
  const message = n.message ?? "";
  const lower = message.toLowerCase();

  // ── Prefer the backend's real type (LIKE/FOLLOW/COMMENT/BOOKMARK/MESSAGE/SYSTEM) ──
  // Only fall back to guessing from the message text for legacy rows saved
  // before the backend started sending `type` (so old data still renders).
  const backendType =
    typeof n.type === "string" ? n.type.toLowerCase() : null;
  const KNOWN_TYPES = new Set([
    "like",
    "follow",
    "comment",
    "bookmark",
    "message",
    "system",
    "new_idea",
  ]);

  let type = KNOWN_TYPES.has(backendType) ? backendType : null;

  if (!type) {
    if (lower.includes("message") || lower.includes("sent you") || lower.includes("shared an idea"))
      type = "message";
    else if (lower.includes("posted a new idea")) type = "new_idea";
    else if (lower.includes("like")) type = "like";
    else if (lower.includes("bookmark") || lower.includes("saved"))
      type = "bookmark";
    else if (lower.includes("follow")) type = "follow";
    else if (lower.includes("comment")) type = "comment";
    else type = "system";
  }

  const TITLES = {
    message: "New message",
    like: "New like",
    bookmark: "New bookmark",
    follow: "New follower",
    comment: "New comment",
    new_idea: "New idea posted",
    system: "Notification",
  };

  const IDEA_LINK_TYPES = new Set(["like", "bookmark", "comment", "new_idea"]);

  const defaultLink =
    type === "message"
      ? n.conversationId
        ? `/messages/${n.conversationId}`
        : "/messages"
      : IDEA_LINK_TYPES.has(type) && n.referenceId
        ? `/ideas/${n.referenceId}`
        : type === "follow" && n.referenceId
          ? `/users/${n.referenceId}`
          : "/home";

  return {
    id:
      n.id ?? "n-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    type,
    title: n.title ?? TITLES[type],
    message,
    read: n.read ?? n.readStatus ?? false,
    createdAt: n.createdAt ?? new Date().toISOString(),
    referenceId: n.referenceId ?? null,
    conversationId: n.conversationId ?? null,
    link: n.link ?? defaultLink,
  };
};

const messageToNotification = (msgDto) => ({
  id: "n-msg-" + (msgDto.id ?? Date.now()),
  type: "message",
  title: "New message",
  message: msgDto.senderName
    ? `${msgDto.senderName} sent you a message`
    : "You have a new message",
  read: false,
  createdAt: msgDto.createdAt ?? new Date().toISOString(),
  conversationId: msgDto.conversationId ?? null,
  link: msgDto.conversationId
    ? `/messages/${msgDto.conversationId}`
    : "/messages",
});

export const subscribeToNotifications = (onMessage) => {
  if (USE_MOCK.notificationsRealtime) {
    const t = setTimeout(() => {
      onMessage?.(
        normalizeNotification({
          id: "n-live-" + Date.now(),
          message: "Someone just liked your idea",
          readStatus: false,
          createdAt: new Date().toISOString(),
        }),
      );
    }, 8000);

    return () => clearTimeout(t);
  }

  const token = localStorage.getItem("token");

  const client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  });

  client.onConnect = () => {
    client.subscribe("/topic/presence", (frame) => {
      try {
        const presence = JSON.parse(frame.body);

        window.dispatchEvent(
          new CustomEvent("presence-update", {
            detail: presence,
          }),
        );
      } catch (err) {
        console.error("[presence] bad payload", err, frame.body);
      }
    });

    client.subscribe(TOPIC_MESSAGES, (frame) => {
      try {
        const msgDto = JSON.parse(frame.body);

        const myId = (() => {
          try {
            return JSON.parse(localStorage.getItem("user") || "{}").id;
          } catch {
            return null;
          }
        })();

        if (myId && String(msgDto.senderId) === String(myId)) return;

        onMessage?.(messageToNotification(msgDto));
      } catch (err) {
        console.error(
          "[notifications] bad message STOMP payload",
          err,
          frame.body,
        );
      }
    });

    client.subscribe(TOPIC_READ_RECEIPTS, (frame) => {
      try {
        window.dispatchEvent(
          new CustomEvent("message-read-receipt", {
            detail: frame.body,
          }),
        );
      } catch (err) {
        console.error(
          "[notifications] bad read receipt payload",
          err,
          frame.body,
        );
      }
    });
  };

  client.onStompError = (frame) => {
    console.error(
      "[notifications] STOMP error",
      frame.headers["message"],
      frame.body,
    );
  };

  client.onWebSocketError = (event) => {
    console.error("[notifications] WebSocket error", event);
  };

  client.activate();

  return () => {
    client.deactivate();
  };
};
