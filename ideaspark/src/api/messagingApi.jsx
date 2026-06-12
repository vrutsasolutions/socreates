// ════════════════════════════════════════════════════════════════════════
//  Messaging API (DM / inbox feature — figma "Messaging System UI").
//
//  Mock-first. Flip USE_MOCK.messaging → false in config.js when backend is live.
//
//  KEY FIX: normalizeConversation() and normalizeMessage() bridge the gap
//  between backend field names (otherUserName, senderId, content, etc.)
//  and the frontend's mock-shaped objects (name, fromMe, text, etc.).
//  This keeps all page/component code unchanged regardless of mock vs live.
//
//  Endpoints:
//    GET  /messages/active                       → ActiveUser[]
//    GET  /messages/conversations                → ConversationDTO[]
//    GET  /messages/conversations/:id            → ConversationDTO
//    GET  /messages/conversations/:id/messages   → MessageDTO[]
//    POST /messages/conversations/:id/messages   → MessageDTO  (body:{type,content})
//    POST /messages/upload/voice                 → { url }
//    POST /messages/upload/image                 → { url }
//    GET  /messages/requests                     → Request[]
//    POST /messages/requests/:id/accept          → {}
//    POST /messages/requests/:id/decline         → {}
//    GET  /messages/contacts                     → UserDTO[]
//    POST /messages/conversations                → ConversationDTO (body:{userId})
// ════════════════════════════════════════════════════════════════════════
import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';
import {
  MOCK_ACTIVE_USERS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_REQUESTS,
  MOCK_CONTACTS,
  MOCK_SHARE_TARGETS,
} from './mockData';

// Mutable copies so mock mutations (send message, accept request) reflect in UI.
let conversations = MOCK_CONVERSATIONS.map((c) => ({ ...c }));
let requests = MOCK_REQUESTS.map((r) => ({ ...r }));
const threads = Object.fromEntries(
  Object.entries(MOCK_MESSAGES).map(([k, v]) => [k, v.map((m) => ({ ...m }))]),
);

const clock = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ════════════════════════════════════════════════════════════════════════
//  NORMALIZERS — convert backend DTO shapes → frontend shape
// ════════════════════════════════════════════════════════════════════════

/**
 * Get the logged-in user's ID from localStorage (set during login).
 * Backend stores the user object as JSON under the key "user".
 */
const getMyId = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.id || u.userId || null;
  } catch {
    return null;
  }
};

/**
 * Derive a 1–2 letter initial from a name string.
 */
const initialFrom = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/**
 * Normalize a backend ConversationDTO → frontend conversation shape.
 *
 * Backend fields:   id, otherUserId, otherUserName, otherUserAvatar,
 *                   otherUserOnline, lastMessage, lastMessageType,
 *                   lastMessageAt, unreadCount
 *
 * Frontend expects: id, name, initial, avatarColor, online,
 *                   lastMessage, lastType, time, unread
 */
const normalizeConversation = (dto) => ({
  id:           String(dto.id),
  name:         dto.otherUserName  ?? dto.name         ?? 'Unknown',
  initial:      dto.initial        ?? initialFrom(dto.otherUserName ?? dto.name ?? ''),
  // avatarColor is used as a gradient seed in Avatar.jsx — use the name as seed
  avatarColor:  dto.avatarColor    ?? dto.otherUserName ?? '#1565C0',
  online:       dto.otherUserOnline ?? dto.online       ?? false,
  otherUserId:  dto.otherUserId,
  lastMessage:  dto.lastMessage    ?? '',
  lastType:     (dto.lastMessageType ?? dto.lastType ?? 'TEXT').toLowerCase(),
  time:         dto.lastMessageAt
                  ? new Date(dto.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : dto.time ?? '',
  unread:       dto.unreadCount    ?? dto.unread        ?? 0,
});

/**
 * Normalize a backend MessageDTO → frontend message shape.
 *
 * Backend fields:   id, conversationId, senderId, senderName, senderAvatar,
 *                   type (TEXT|IMAGE|VOICE), content, isRead, createdAt
 *
 * Frontend expects: id, conversationId, fromMe, type (text|image|voice),
 *                   text (for TEXT), imageUrl (for IMAGE), content (for VOICE),
 *                   duration (voice — not in backend, omitted), time
 */
const normalizeMessage = (dto, myId) => {
  const type = (dto.type ?? 'TEXT').toLowerCase(); // 'TEXT' → 'text'

  return {
    id:             String(dto.id),
    conversationId: String(dto.conversationId),
    fromMe:         myId ? String(dto.senderId) === String(myId) : false,
    senderName:     dto.senderName ?? '',
    senderAvatar:   dto.senderAvatar ?? '',
    type,
    // TEXT: put content in `text` so the Bubble component's `m.text` works
    text:           type === 'text'  ? (dto.content ?? '') : undefined,
    // IMAGE: put content in `imageUrl`
    imageUrl:       type === 'image' ? (dto.content ?? '') : undefined,
    // VOICE: keep in `content` (Bubble checks m.content.startsWith('http'))
    content:        type === 'voice' ? (dto.content ?? '') : undefined,
    isRead:         dto.isRead ?? dto.read ?? false,
    time:           dto.createdAt
                      ? new Date(dto.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : dto.time ?? '',
  };
};

// ── Active-now rail ──────────────────────────────────────────────────────────
export const fetchActiveUsers = () =>
  USE_MOCK.messaging
    ? mockResponse(MOCK_ACTIVE_USERS.map((u) => ({ ...u })))
    : api.get('/messages/active');

// ── Conversations (inbox list) ───────────────────────────────────────────────
export const fetchConversations = async () => {
  if (USE_MOCK.messaging) return mockResponse(conversations.map((c) => ({ ...c })));
  const res = await api.get('/messages/conversations');
  return { data: (res.data ?? []).map(normalizeConversation) };
};

export const fetchConversation = async (id) => {
  if (USE_MOCK.messaging) {
    return mockResponse({
      ...(conversations.find((c) => c.id === id) || {
        id, name: 'Chat', initial: '?', avatarColor: '#1565C0', online: false,
      }),
    });
  }
  const res = await api.get(`/messages/conversations/${id}`);
  return { data: normalizeConversation(res.data) };
};

// ── Messages within a thread ─────────────────────────────────────────────────
export const fetchMessages = async (conversationId) => {
  if (USE_MOCK.messaging) {
    return mockResponse((threads[conversationId] || []).map((m) => ({ ...m })));
  }
  const myId = getMyId();
  const res = await api.get(`/messages/conversations/${conversationId}/messages`);
  return { data: (res.data ?? []).map((m) => normalizeMessage(m, myId)) };
};

// payload: { type:'text'|'image'|'voice', text?, imageUrl?, content?, duration? }
export const sendMessage = async (conversationId, payload) => {
  if (USE_MOCK.messaging) {
    const msg = {
      id: 'm-' + Date.now(),
      conversationId,
      fromMe: true,
      time: clock(),
      ...payload,
    };
    threads[conversationId] = [...(threads[conversationId] || []), msg];
    conversations = conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            lastType: payload.type,
            lastMessage:
              payload.type === 'image' ? (payload.isVideo ? 'Shared a video' : 'Shared a photo')
              : payload.type === 'voice' ? `Voice note  ${payload.duration || ''}`.trim()
              : payload.type === 'file'  ? `📄 ${payload.fileName || 'File'}`
              : payload.text,
            time: 'now',
            unread: 0,
          }
        : c,
    );
    return mockResponse({ ...msg }, 150);
  }

  // ── Live: map frontend payload → backend contract ────────────────────────
  // Backend expects: { type: 'TEXT'|'IMAGE'|'VOICE', content: string }
  const backendPayload = {
    type: payload.type.toUpperCase(),
    content:
      payload.type === 'text'
        ? payload.text          // text message body
        : payload.content,      // R2 URL for image / voice
  };

  const myId = getMyId();
  const res = await api.post(
    `/messages/conversations/${conversationId}/messages`,
    backendPayload,
  );
  return { data: normalizeMessage(res.data, myId) };
};

// ════════════════════════════════════════════════════════════════════════
//  FILE UPLOADS — call BEFORE sendMessage to obtain an R2 URL.
// ════════════════════════════════════════════════════════════════════════

/**
 * Upload a voice recording Blob to R2.
 * @param {Blob}   blob     — audio blob from MediaRecorder
 * @param {string} mimeType — e.g. 'audio/webm;codecs=opus', 'audio/ogg'
 * @returns {Promise<string>} public R2 URL
 *
 * FIX (Bug 3): Do NOT manually set 'Content-Type': 'multipart/form-data'.
 * When set manually, the browser cannot append the required boundary parameter,
 * causing the server to fail parsing the multipart body. Let axios set it automatically.
 */
export const uploadVoice = async (blob, mimeType = 'audio/webm') => {
  if (USE_MOCK.messaging) {
    // In mock mode return a local object URL so the audio player still works
    return Promise.resolve(URL.createObjectURL(blob));
  }
  const ext = mimeType.includes('ogg') ? 'ogg'
    : mimeType.includes('mp4')         ? 'mp4'
    : mimeType.includes('wav')         ? 'wav'
    : 'webm';
  const form = new FormData();
  form.append('file', blob, `voice-${Date.now()}.${ext}`);
  // ✅ FIX: No manual Content-Type header — axios sets it with the correct boundary
  const { data } = await api.post('/messages/upload/voice', form);
  return data.url;
};

/**
 * Upload an image File to R2.
 * @param {File} file
 * @returns {Promise<string>} public R2 URL
 *
 * FIX (Bug 3): Same fix as uploadVoice — no manual Content-Type header.
 */
export const uploadImage = async (file) => {
  if (USE_MOCK.messaging) {
    return Promise.resolve(URL.createObjectURL(file));
  }
  const form = new FormData();
  form.append('file', file);
  // ✅ FIX: No manual Content-Type header — axios sets it with the correct boundary
  const { data } = await api.post('/messages/upload/image', form);
  return data.url;
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

export const startConversation = async (userId) => {
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
  const res = await api.post('/messages/conversations', { userId });
  return { data: normalizeConversation(res.data) };
};

// ── Conversation-level actions ────────────────────────────────────────────────
export const deleteConversation = (id, alsoDeleteForRecipient = false) => {
  if (USE_MOCK.messaging) {
    conversations = conversations.filter((c) => c.id !== id);
    delete threads[id];
    return mockResponse({ deleted: id, alsoDeleteForRecipient }, 200);
  }
  return api.delete(`/messages/conversations/${id}`, { data: { alsoDeleteForRecipient } });
};

export const blockUser = (id) => {
  if (USE_MOCK.messaging) {
    conversations = conversations.filter((c) => c.id !== id);
    delete threads[id];
    return mockResponse({ blocked: id }, 200);
  }
  return api.post(`/messages/users/${id}/block`);
};

export const reportUser = (id, reason) => {
  if (USE_MOCK.messaging) return mockResponse({ reported: id, reason }, 200);
  return api.post(`/messages/users/${id}/report`, { reason });
};

// ── Share a post ─────────────────────────────────────────────────────────────
export const fetchShareTargets = () =>
  USE_MOCK.messaging
    ? mockResponse(MOCK_SHARE_TARGETS.map((t) => ({ ...t })))
    : api.get('/messages/share-targets');

export const sharePost = ({ postId, title }, userIds = []) => {
  if (USE_MOCK.messaging) {
    userIds.forEach((uid) => {
      if (threads[uid]) {
        threads[uid] = [
          ...threads[uid],
          { id: 'm-' + Date.now() + '-' + uid, conversationId: uid, fromMe: true, type: 'text', text: `📨 Shared a post: ${title}`, time: clock() },
        ];
        conversations = conversations.map((c) =>
          c.id === uid ? { ...c, lastType: 'text', lastMessage: `📨 ${title}`, time: 'now' } : c,
        );
      }
    });
    return mockResponse({ shared: postId, count: userIds.length }, 250);
  }
  return api.post('/messages/share-post', { postId, title, userIds });
};
