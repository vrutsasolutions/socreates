// ════════════════════════════════════════════════════════════════════════
//  Messaging API (DM / inbox feature — figma "Messaging System UI").
//
//  Mock-first. Flip USE_MOCK.messaging → false in config.js when backend is live.
//
//  KEY FIX: normalizeConversation(), normalizeMessage(), normalizeContact()
//  bridge the gap between backend field names and the frontend's expected shape.
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

// const clock = () =>
//   new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
const clock = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// ════════════════════════════════════════════════════════════════════════
//  NORMALIZERS — convert backend DTO shapes → frontend shape
// ════════════════════════════════════════════════════════════════════════

/** Get the logged-in user's ID from localStorage */
const getMyId = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.id || u.userId || null;
  } catch {
    return null;
  }
};

/** Derive a 1–2 letter initial from a name string */
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
 */
const normalizeConversation = (dto) => ({
  id:           String(dto.id),
  name:         dto.otherUserName  ?? dto.name         ?? 'Unknown',
  initial:      dto.initial        ?? initialFrom(dto.otherUserName ?? dto.name ?? ''),
  avatarColor:  dto.avatarColor    ?? dto.otherUserName ?? '#1565C0',
  online:       dto.otherUserOnline ?? dto.online       ?? false,
  otherUserId:  dto.otherUserId,
  lastMessage:  dto.lastMessage    ?? '',
  lastType:     (dto.lastMessageType ?? dto.lastType ?? 'TEXT').toLowerCase(),
  time: dto.createdAt
  ? formatTime(dto.createdAt)
  : dto.time ?? '',
  unread:       dto.unreadCount    ?? dto.unread        ?? 0,
  // Whether the other party is a verified creator. Drives the free-tier
  // messaging limit on the Chat page. Backend may send a single flag or the
  // verified + creator-pro pair; support both, default false.
  verifiedCreator:
    dto.otherUserVerifiedCreator ??
    dto.verifiedCreator ??
    !!((dto.otherUserVerified ?? false) && (dto.otherUserCreatorPro ?? false)),
});

/**
 * Normalize a backend MessageDTO → frontend message shape.
 */
/** Derive a human filename from an R2 upload URL (.../{uuid}-{originalName}) */
const fileNameFromUrl = (url = '') => {
  const seg = String(url).split('/').pop() || 'File';
  return decodeURIComponent(seg.replace(/^[0-9a-fA-F-]{36}-/, ''));
};

const normalizeMessage = (dto, myId) => {
  const type = (dto.type ?? 'TEXT').toLowerCase();
  return {
    id:             String(dto.id),
    conversationId: String(dto.conversationId),
    fromMe:         myId ? String(dto.senderId) === String(myId) : false,
    senderName:     dto.senderName ?? '',
    senderAvatar:   dto.senderAvatar ?? '',
    type,
    text:           type === 'text'  ? (dto.content ?? '') : undefined,
    imageUrl:       type === 'image' ? (dto.content ?? '') : undefined,
    content:        (type === 'voice' || type === 'file') ? (dto.content ?? '') : undefined,
    fileName:       type === 'file'  ? fileNameFromUrl(dto.content) : undefined,
    reaction:       dto.reaction ?? undefined,
    isRead:         dto.isRead ?? dto.read ?? false,
    time:           dto.createdAt
                      ? new Date(dto.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : dto.time ?? '',
  };
};

/**
 * Normalize a backend UserDTO → frontend contact shape.
 *
 * Backend UserDTO has: id, name, username, email, profileImage, bio, isPremium
 * Frontend expects:    id, name, initial, avatarColor, handle, online
 *
 * FIX: Backend contacts have no initial/avatarColor/handle — derive them.
 */
const normalizeContact = (dto) => ({
  id:          String(dto.id),
  name:        dto.name       ?? 'Unknown',
  initial:     initialFrom(dto.name ?? ''),
  // Use name as seed for deterministic gradient color (same as Avatar.jsx)
  avatarColor: dto.name       ?? '#1565C0',
  // Use @username if present, else @email prefix
  handle:      dto.username
                 ? `@${dto.username}`
                 : dto.email
                   ? `@${dto.email.split('@')[0]}`
                   : '',
  online:      false, // backend doesn't track online status for contacts
  profileImage: dto.profileImage ?? null,
});

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

  const backendPayload = {
    type: payload.type.toUpperCase(),
    content:
      payload.type === 'text'
        ? payload.text
        : payload.content,
  };

  const myId = getMyId();
  const res = await api.post(
    `/messages/conversations/${conversationId}/messages`,
    backendPayload,
  );
  return { data: normalizeMessage(res.data, myId) };
};

// ── Per-message actions (reactions + delete) ─────────────────────────────────
// POST /messages/messages/{id}/react { emoji } — toggles one emoji per user.
export const reactToMessage = (messageId, emoji) => {
  if (USE_MOCK.messaging) {
    Object.keys(threads).forEach((tid) => {
      threads[tid] = threads[tid].map((m) =>
        m.id === messageId ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m,
      );
    });
    return mockResponse({ reaction: emoji }, 120);
  }
  return api.post(`/messages/messages/${messageId}/react`, { emoji });
};

// DELETE /messages/messages/{id}?scope=me|everyone
export const deleteMessage = (messageId, scope = 'me') => {
  if (USE_MOCK.messaging) {
    Object.keys(threads).forEach((tid) => {
      threads[tid] = threads[tid].filter((m) => m.id !== messageId);
    });
    return mockResponse({ deleted: messageId, scope }, 120);
  }
  return api.delete(`/messages/messages/${messageId}`, { params: { scope } });
};

// ════════════════════════════════════════════════════════════════════════
//  FILE UPLOADS
// ════════════════════════════════════════════════════════════════════════
export const uploadFile = async (file) => {
  if (USE_MOCK.messaging) return Promise.resolve(URL.createObjectURL(file));
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/messages/upload/file', form);
  return data.url;
};

export const uploadVoice = async (blob, mimeType = 'audio/webm') => {
  if (USE_MOCK.messaging) return Promise.resolve(URL.createObjectURL(blob));
  const ext = mimeType.includes('ogg') ? 'ogg'
    : mimeType.includes('mp4')         ? 'mp4'
    : mimeType.includes('wav')         ? 'wav'
    : 'webm';
  const form = new FormData();
  form.append('file', blob, `voice-${Date.now()}.${ext}`);
  const { data } = await api.post('/messages/upload/voice', form);
  return data.url;
};

export const uploadImage = async (file) => {
  if (USE_MOCK.messaging) return Promise.resolve(URL.createObjectURL(file));
  const form = new FormData();
  form.append('file', file);
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
export const fetchContacts = async () => {
  if (USE_MOCK.messaging) return mockResponse(MOCK_CONTACTS.map((c) => ({ ...c })));
  const res = await api.get('/messages/contacts');
  // FIX: normalize backend UserDTO → frontend contact shape (adds initial, avatarColor, handle)
  return { data: (res.data ?? []).map(normalizeContact) };
};

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
export const fetchShareTargets = async () => {
  if (USE_MOCK.messaging) return mockResponse(MOCK_SHARE_TARGETS.map((t) => ({ ...t })));
  // ✅ Use user search API instead of missing share-targets endpoint
  const res = await api.get('/users/search?q=');
  return {
    data: (res.data ?? []).map((u) => ({
      id: String(u.id),
      name: u.name ?? 'Unknown',
      subtitle: u.username ? `@${u.username}` : u.email ?? '',
      initial: u.name ? u.name[0].toUpperCase() : '?',
      avatarColor: u.name ?? '#1565C0',
      profileImage: u.profileImage ?? null,
    }))
  };
};

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
