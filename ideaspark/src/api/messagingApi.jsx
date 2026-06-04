// ════════════════════════════════════════════════════════════════════════
//  Messaging API (DM / inbox feature — figma "Messaging System UI").
//
//  Mock-first, like the rest of the under-dev domains. While
//  USE_MOCK.messaging is true these resolve from src/api/mockData.js so the
//  whole inbox/chat/requests/new-chat flow works offline. When Vishakha ships
//  /api/messages/* matching API_CONTRACT.md, flip the flag in config.js — no
//  page code changes needed (pages call these named functions and destructure
//  `const { data } = await ...`).
//
//  Endpoints assumed for the live swap:
//    GET  /messages/active                       → ActiveUser[]
//    GET  /messages/conversations                → Conversation[]
//    GET  /messages/conversations/:id            → Conversation
//    GET  /messages/conversations/:id/messages   → Message[]
//    POST /messages/conversations/:id/messages   → Message   (body: {type,...})
//    GET  /messages/requests                     → Request[]
//    POST /messages/requests/:id/accept          → {}
//    POST /messages/requests/:id/decline         → {}
//    GET  /messages/contacts                      → Contact[]
//    POST /messages/conversations                 → Conversation (body:{userId})
// ════════════════════════════════════════════════════════════════════════
import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';
import {
  MOCK_ACTIVE_USERS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_REQUESTS,
  MOCK_CONTACTS,
} from './mockData';

// Mutable copies so mock mutations (send message, accept request) reflect in UI.
let conversations = MOCK_CONVERSATIONS.map((c) => ({ ...c }));
let requests = MOCK_REQUESTS.map((r) => ({ ...r }));
const threads = Object.fromEntries(
  Object.entries(MOCK_MESSAGES).map(([k, v]) => [k, v.map((m) => ({ ...m }))]),
);

const clock = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ── Active-now rail ──────────────────────────────────────────────────────────
export const fetchActiveUsers = () =>
  USE_MOCK.messaging
    ? mockResponse(MOCK_ACTIVE_USERS.map((u) => ({ ...u })))
    : api.get('/messages/active');

// ── Conversations (inbox list) ───────────────────────────────────────────────
export const fetchConversations = () =>
  USE_MOCK.messaging
    ? mockResponse(conversations.map((c) => ({ ...c })))
    : api.get('/messages/conversations');

export const fetchConversation = (id) =>
  USE_MOCK.messaging
    ? mockResponse({ ...(conversations.find((c) => c.id === id) || { id, name: 'Chat', initial: '?', avatarColor: '#1565C0', online: false }) })
    : api.get(`/messages/conversations/${id}`);

// ── Messages within a thread ─────────────────────────────────────────────────
export const fetchMessages = (conversationId) =>
  USE_MOCK.messaging
    ? mockResponse((threads[conversationId] || []).map((m) => ({ ...m })))
    : api.get(`/messages/conversations/${conversationId}/messages`);

// payload: { type:'text'|'image'|'voice', text?, imageUrl?, duration? }
export const sendMessage = (conversationId, payload) => {
  if (USE_MOCK.messaging) {
    const msg = {
      id: 'm-' + Date.now(),
      conversationId,
      fromMe: true,
      time: clock(),
      ...payload,
    };
    threads[conversationId] = [...(threads[conversationId] || []), msg];
    // bump the inbox preview
    conversations = conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            lastType: payload.type,
            lastMessage:
              payload.type === 'image' ? (payload.isVideo ? 'Shared a video' : 'Shared a photo')
              : payload.type === 'voice' ? `Voice note  ${payload.duration || ''}`.trim()
              : payload.type === 'file' ? `📄 ${payload.fileName || 'File'}`
              : payload.text,
            time: 'now',
            unread: 0,
          }
        : c,
    );
    return mockResponse({ ...msg }, 150);
  }
  return api.post(`/messages/conversations/${conversationId}/messages`, payload);
};

// ── Message requests ─────────────────────────────────────────────────────────
export const fetchRequests = () =>
  USE_MOCK.messaging
    ? mockResponse(requests.map((r) => ({ ...r })))
    : api.get('/messages/requests');

export const acceptRequest = (id) => {
  if (USE_MOCK.messaging) {
    requests = requests.filter((r) => r.id !== id);
    return mockResponse({}, 200);
  }
  return api.post(`/messages/requests/${id}/accept`);
};

export const declineRequest = (id) => {
  if (USE_MOCK.messaging) {
    requests = requests.filter((r) => r.id !== id);
    return mockResponse({}, 200);
  }
  return api.post(`/messages/requests/${id}/decline`);
};

// ── New chat (contacts) ──────────────────────────────────────────────────────
export const fetchContacts = () =>
  USE_MOCK.messaging
    ? mockResponse(MOCK_CONTACTS.map((c) => ({ ...c })))
    : api.get('/messages/contacts');

export const startConversation = (userId) => {
  if (USE_MOCK.messaging) {
    const contact = MOCK_CONTACTS.find((c) => c.id === userId);
    const id = 'c-' + userId;
    if (!conversations.some((c) => c.id === id) && contact) {
      conversations = [
        { id, name: contact.name, initial: contact.initial, avatarColor: contact.avatarColor, lastMessage: '', lastType: 'text', time: 'now', unread: 0, online: contact.online },
        ...conversations,
      ];
      threads[id] = [];
    }
    return mockResponse({ id });
  }
  return api.post('/messages/conversations', { userId });
};

// ── Conversation-level actions (figma action menu / profile) ─────────────────
// DELETE /messages/conversations/:id   (body: { alsoDeleteForRecipient })
export const deleteConversation = (id, alsoDeleteForRecipient = false) => {
  if (USE_MOCK.messaging) {
    conversations = conversations.filter((c) => c.id !== id);
    delete threads[id];
    return mockResponse({ deleted: id, alsoDeleteForRecipient }, 200);
  }
  return api.delete(`/messages/conversations/${id}`, { data: { alsoDeleteForRecipient } });
};

// POST /messages/users/:id/block
export const blockUser = (id) => {
  if (USE_MOCK.messaging) {
    conversations = conversations.filter((c) => c.id !== id);
    delete threads[id];
    return mockResponse({ blocked: id }, 200);
  }
  return api.post(`/messages/users/${id}/block`);
};

// POST /messages/users/:id/report   (body: { reason })
export const reportUser = (id, reason) => {
  if (USE_MOCK.messaging) {
    return mockResponse({ reported: id, reason }, 200);
  }
  return api.post(`/messages/users/${id}/report`, { reason });
};
