// ════════════════════════════════════════════════════════════════════════
//  Messaging API (DM / inbox feature — figma "Messaging System UI").
//
//  Mock-first. Flip USE_MOCK.messaging → false in config.js when backend is live.
//
//  KEY FIX: normalizeConversation(), normalizeMessage(), normalizeContact()
//  bridge the gap between backend field names and the frontend's expected shape.
// ════════════════════════════════════════════════════════════════════════
import api from "./axiosInstance";
import { USE_MOCK, mockResponse } from "./config";
import {
  MOCK_ACTIVE_USERS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_REQUESTS,
  MOCK_CONTACTS,
  MOCK_SHARE_TARGETS,
} from "./mockData";

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
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
const clock = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
// ════════════════════════════════════════════════════════════════════════
//  NORMALIZERS — convert backend DTO shapes → frontend shape
// ════════════════════════════════════════════════════════════════════════

/** Get the logged-in user's ID from localStorage */
const getMyId = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    return u.id || u.userId || null;
  } catch {
    return null;
  }
};

/** Derive a 1–2 letter initial from a name string */
const initialFrom = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
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
const normalizeConversation = (dto) => {
  const myId = getMyId();
  return {
    id: String(dto.id),
    name: dto.otherUserName ?? dto.name ?? "Unknown",
    initial: dto.initial ?? initialFrom(dto.otherUserName ?? dto.name ?? ""),
    avatarColor: dto.avatarColor ?? dto.otherUserName ?? "#1565C0",
    // The other participant's set profile photo, if any — Avatar falls back
    // to the initials/gradient circle when this is null/empty.
    profileImage: dto.otherUserAvatar ?? dto.profileImage ?? null,
    online: dto.otherUserOnline ?? dto.online ?? false,
    // False only when the other user has explicitly turned Activity Status
    // off — defaults true so older/mocked payloads without this field still
    // show Online/Offline as before.
    activityVisible: dto.otherUserActivityStatusVisible ?? true,
    otherUserId: dto.otherUserId,
    // True when the "other" participant is actually me — e.g. a self-chat
    // that slipped through (share-to-self, a seeded test row, etc). Flagged
    // here, once, so every page that renders the conversation name can
    // label it "(You)" instead of silently looking like a DM from someone
    // else with the same/similar name.
    isSelf:
      myId != null &&
      dto.otherUserId != null &&
      String(dto.otherUserId) === String(myId),
    lastMessage: dto.lastMessage ?? "",
    lastType: (dto.lastMessageType ?? dto.lastType ?? "TEXT").toLowerCase(),
    time: dto.createdAt ? formatTime(dto.createdAt) : (dto.time ?? ""),
    unread: dto.unreadCount ?? dto.unread ?? 0,
    // Whether the other party is a verified creator. Drives the free-tier
    // messaging limit on the Chat page. Backend may send a single flag or the
    // verified + creator-pro pair; support both, default false.
    verifiedCreator:
      dto.otherUserVerifiedCreator ??
      dto.verifiedCreator ??
      !!((dto.otherUserVerified ?? false) && (dto.otherUserCreatorPro ?? false)),
    // Message-request flow: "PENDING" while waiting on the other person to
    // accept, "ACCEPTED" once you can both talk freely. Older/mocked
    // payloads without this field default to ACCEPTED so nothing locks up.
    status: dto.status ?? "ACCEPTED",
    // True when I'm the one who started this conversation — tells apart
    // "I sent a request, waiting" from "I received one, need to accept".
    iInitiated: dto.iInitiated ?? true,
  };
};

/**
 * Normalize a backend MessageDTO → frontend message shape.
 */
/** Derive a human filename from an R2 upload URL (.../{uuid}-{originalName}) */
const fileNameFromUrl = (url = "") => {
  const seg = String(url).split("/").pop() || "File";
  return decodeURIComponent(seg.replace(/^[0-9a-fA-F-]{36}-/, ""));
};

// For an IDEA message the backend stores a JSON snapshot in `content`:
// { ideaId, title, imageUrl, isPremium }. Parse it into a tidy idea object the
// chat can render as a card; fall back gracefully if it isn't valid JSON.
const parseSharedIdea = (content) => {
  try {
    const o = JSON.parse(content ?? "{}");
    // Cover = explicit imageUrl, else first of an imageUrls[] snapshot.
    const cover =
      o.imageUrl ||
      (Array.isArray(o.imageUrls) ? o.imageUrls.find(Boolean) : "") ||
      "";
    return {
      id: String(o.ideaId ?? o.id ?? ""),
      title: o.title ?? "Shared idea",
      imageUrl: cover,
      isPremium: !!o.isPremium,
    };
  } catch {
    return { id: "", title: "Shared idea", imageUrl: "", isPremium: false };
  }
};

// For a PROFILE message the backend stores the same JSON snapshot Chat.jsx
// built when sending: { id, name, initial, avatarColor, profileImage }.
// Parse it back into an object the profile card can render; fall back to a
// clearly-labeled placeholder (never silently "Unknown") if it's missing or
// isn't valid JSON, so a genuine bad payload is still easy to spot.
const parseSharedProfile = (content) => {
  try {
    const o = JSON.parse(content ?? "{}");
    if (!o || !o.id) throw new Error("empty profile snapshot");
    return {
      id: String(o.id),
      name: o.name || "Unknown",
      initial: o.initial || initialFrom(o.name ?? ""),
      avatarColor: o.avatarColor || "#1565C0",
      profileImage: o.profileImage ?? null,
    };
  } catch {
    return {
      id: "",
      name: "Unknown",
      initial: "?",
      avatarColor: "#1565C0",
      profileImage: null,
    };
  }
};

const normalizeMessage = (dto, myId) => {
  const type = (dto.type ?? "TEXT").toLowerCase();
  return {
    id: String(dto.id),
    conversationId: String(dto.conversationId),
    fromMe: myId ? String(dto.senderId) === String(myId) : false,
    senderName: dto.senderName ?? "",
    senderAvatar: dto.senderAvatar ?? "",
    type,
    text: type === "text" ? (dto.content ?? "") : undefined,
    imageUrl: type === "image" ? (dto.content ?? "") : undefined,
    idea: type === "idea" ? parseSharedIdea(dto.content) : undefined,
    profile: type === "profile" ? parseSharedProfile(dto.content) : undefined,
    content:
      type === "voice" || type === "file" ? (dto.content ?? "") : undefined,
    fileName: type === "file" ? fileNameFromUrl(dto.content) : undefined,
    reaction: dto.reaction ?? undefined,
    isRead: dto.isRead ?? dto.read ?? false,
    createdAt: dto.createdAt ?? null,
    time: dto.createdAt
      ? new Date(dto.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : (dto.time ?? ""),
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
  id: String(dto.id),
  name: dto.name ?? "Unknown",
  initial: initialFrom(dto.name ?? ""),
  // Use name as seed for deterministic gradient color (same as Avatar.jsx)
  avatarColor: dto.name ?? "#1565C0",
  // Use @username if present, else @email prefix
  handle: dto.username
    ? `@${dto.username}`
    : dto.email
      ? `@${dto.email.split("@")[0]}`
      : "",
  online: false, // backend doesn't track online status for contacts
  profileImage: dto.profileImage ?? null,
  // The backend now includes the caller in /messages/contacts (pinned
  // first) so "message yourself" is discoverable — flag it the same way
  // normalizeConversation does, so Suggested/search can label it "(You)".
  isSelf: getMyId() != null && dto.id != null && String(dto.id) === String(getMyId()),
});

/**
 * Normalize a backend MessageRequestDTO → the shape Requests.jsx renders.
 *
 * Backend fields:  id (conversation id), fromUserId, name, avatar,
 *                   preview, createdAt
 * Frontend wants:  id, name, initial, avatarColor, preview, time, mutuals
 */
const normalizeRequest = (dto) => ({
  id: String(dto.id),
  fromUserId: dto.fromUserId != null ? String(dto.fromUserId) : undefined,
  name: dto.name ?? "Unknown",
  initial: dto.initial ?? initialFrom(dto.name ?? ""),
  avatarColor: dto.avatarColor ?? dto.name ?? "#1565C0",
  profileImage: dto.avatar ?? dto.profileImage ?? null,
  preview: dto.preview ?? "",
  time: dto.createdAt ? formatTime(dto.createdAt) : (dto.time ?? ""),
  // Backend doesn't compute mutual connections yet — default to 0 rather
  // than showing a made-up number.
  mutuals: dto.mutuals ?? 0,
});

// ── Active-now rail ──────────────────────────────────────────────────────────
export const fetchActiveUsers = () =>
  USE_MOCK.messaging
    ? mockResponse(MOCK_ACTIVE_USERS.map((u) => ({ ...u })))
    : api.get("/messages/active");

// ── Conversations (inbox list) ───────────────────────────────────────────────
export const fetchConversations = async () => {
  if (USE_MOCK.messaging)
    return mockResponse(conversations.map((c) => ({ ...c })));
  const res = await api.get("/messages/conversations");
  return { data: (res.data ?? []).map(normalizeConversation) };
};

export const fetchConversation = async (id) => {
  if (USE_MOCK.messaging) {
    return mockResponse({
      ...(conversations.find((c) => c.id === id) || {
        id,
        name: "Chat",
        initial: "?",
        avatarColor: "#1565C0",
        online: false,
      }),
    });
  }
  const res = await api.get(`/messages/conversations/${id}`);
  return { data: normalizeConversation(res.data) };
};

// Media, links & docs for a conversation (images, files, voice notes, links)
export const fetchConversationMedia = async (conversationId) => {
  if (USE_MOCK.messaging) {
    return mockResponse({
      images: [],
      files: [],
      voiceNotes: [],
      links: [],
      totalCount: 0,
    });
  }
  const res = await api.get(`/messages/conversations/${conversationId}/media`);
  return { data: res.data };
};

// ── Messages within a thread ─────────────────────────────────────────────────
export const fetchMessages = async (conversationId) => {
  if (USE_MOCK.messaging) {
    return mockResponse((threads[conversationId] || []).map((m) => ({ ...m })));
  }
  const myId = getMyId();
  const res = await api.get(
    `/messages/conversations/${conversationId}/messages`,
  );
  return { data: (res.data ?? []).map((m) => normalizeMessage(m, myId)) };
};

// payload: { type:'text'|'image'|'voice'|'file'|'profile', text?, imageUrl?, content?, duration?, profile? }
export const sendMessage = async (conversationId, payload) => {
  if (USE_MOCK.messaging) {
    const msg = {
      id: "m-" + Date.now(),
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
              payload.type === "image"
                ? payload.isVideo
                  ? "Shared a video"
                  : "Shared a photo"
                : payload.type === "voice"
                  ? `Voice note  ${payload.duration || ""}`.trim()
                  : payload.type === "file"
                    ? `📄 ${payload.fileName || "File"}`
                    : payload.type === "profile"
                      ? `👤 Shared ${payload.profile?.name || "a profile"}`
                      : payload.text,
            time: "now",
            unread: 0,
          }
        : c,
    );
    return mockResponse({ ...msg }, 150);
  }

  // FIX: `content` is what actually gets persisted server-side, so every
  // message type that carries structured data (not plain text) must be
  // serialized into it here. Previously only text/image/voice/file had a
  // `content` field on the payload — `profile` (built as { type, profile })
  // fell through to `content: undefined`, so nothing meaningful was ever
  // saved, and after a refresh the card came back as "Unknown".
  const backendPayload = {
    type: payload.type.toUpperCase(),
    content:
      payload.type === "text"
        ? payload.text
        : payload.type === "profile"
          ? JSON.stringify(payload.profile ?? {})
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
        m.id === messageId
          ? { ...m, reaction: m.reaction === emoji ? undefined : emoji }
          : m,
      );
    });
    return mockResponse({ reaction: emoji }, 120);
  }
  return api.post(`/messages/messages/${messageId}/react`, { emoji });
};

// DELETE /messages/messages/{id}?scope=me|everyone
export const deleteMessage = (messageId, scope = "me") => {
  if (USE_MOCK.messaging) {
    Object.keys(threads).forEach((tid) => {
      threads[tid] = threads[tid].filter((m) => m.id !== messageId);
    });
    return mockResponse({ deleted: messageId, scope }, 120);
  }
  return api.delete(`/messages/messages/${messageId}`, { params: { scope } });
};

// ── Free-tier limit error detection ──────────────────────────────────────────
// Backend throws RuntimeException("LIMIT_REACHED: ...") once the free-tier
// text/file cap is hit on a user→creator chat; GlobalExceptionHandler turns
// that into a 400 with { message: "LIMIT_REACHED: ..." }. Callers use this to
// show the upsell modal instead of a generic error toast.
export const isLimitReachedError = (err) =>
  !!err?.response?.data?.message?.startsWith?.("LIMIT_REACHED");

// ════════════════════════════════════════════════════════════════════════
//  FILE UPLOADS
// ════════════════════════════════════════════════════════════════════════
// conversationId lets the backend enforce the free-tier 1-file cap (user→
// creator chats) BEFORE the file reaches R2. Always pass it on live calls.
export const uploadFile = async (file, conversationId) => {
  if (USE_MOCK.messaging) return Promise.resolve(URL.createObjectURL(file));
  const form = new FormData();
  form.append("file", file);
  if (conversationId) form.append("conversationId", conversationId);
  const { data } = await api.post("/messages/upload/file", form);
  return data.url;
};

export const uploadVoice = async (
  blob,
  mimeType = "audio/webm",
  conversationId,
) => {
  if (USE_MOCK.messaging) return Promise.resolve(URL.createObjectURL(blob));
  const ext = mimeType.includes("ogg")
    ? "ogg"
    : mimeType.includes("mp4")
      ? "mp4"
      : mimeType.includes("wav")
        ? "wav"
        : "webm";
  const form = new FormData();
  form.append("file", blob, `voice-${Date.now()}.${ext}`);
  if (conversationId) form.append("conversationId", conversationId);
  const { data } = await api.post("/messages/upload/voice", form);
  return data.url;
};

export const uploadImage = async (file, conversationId) => {
  if (USE_MOCK.messaging) return Promise.resolve(URL.createObjectURL(file));
  const form = new FormData();
  form.append("file", file);
  if (conversationId) form.append("conversationId", conversationId);
  const { data } = await api.post("/messages/upload/image", form);
  return data.url;
};

// ── Message requests ─────────────────────────────────────────────────────────
export const fetchRequests = async () => {
  if (USE_MOCK.messaging) return mockResponse(requests.map((r) => ({ ...r })));
  const res = await api.get("/messages/requests");
  return { data: (res.data ?? []).map(normalizeRequest) };
};

// Backend throws RuntimeException("REQUEST_PENDING: ...") when the
// recipient of a still-pending message request tries to reply before
// accepting it. Chat.jsx uses this to show the right banner instead of a
// generic "message could not be sent" toast.
export const isRequestPendingError = (err) =>
  !!err?.response?.data?.message?.startsWith?.("REQUEST_PENDING");

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
  if (USE_MOCK.messaging)
    return mockResponse(MOCK_CONTACTS.map((c) => ({ ...c })));
  const res = await api.get("/messages/contacts");
  // FIX: normalize backend UserDTO → frontend contact shape (adds initial, avatarColor, handle)
  return { data: (res.data ?? []).map(normalizeContact) };
};

export const startConversation = async (userId) => {
  if (USE_MOCK.messaging) {
    const contact = MOCK_CONTACTS.find((c) => c.id === userId);
    const id = "c-" + userId;
    if (!conversations.some((c) => c.id === id) && contact) {
      conversations = [
        {
          id,
          name: contact.name,
          initial: contact.initial,
          avatarColor: contact.avatarColor,
          lastMessage: "",
          lastType: "text",
          time: "now",
          unread: 0,
          online: contact.online,
        },
        ...conversations,
      ];
      threads[id] = [];
    }
    return mockResponse({ id });
  }
  const res = await api.post("/messages/conversations", { userId });
  return { data: normalizeConversation(res.data) };
};

// ── Conversation-level actions ────────────────────────────────────────────────
export const deleteConversation = (id, alsoDeleteForRecipient = false) => {
  if (USE_MOCK.messaging) {
    conversations = conversations.filter((c) => c.id !== id);
    delete threads[id];
    return mockResponse({ deleted: id, alsoDeleteForRecipient }, 200);
  }
  return api.delete(`/messages/conversations/${id}`, {
    data: { alsoDeleteForRecipient },
  });
};

// Block a user
export const blockUser = (userId) => {
  if (USE_MOCK.messaging) {
    return mockResponse({ blocked: userId }, 200);
  }

  return api.post(`/messages/block/${userId}`);
};

// Unblock a user
export const unblockUser = (userId) => {
  if (USE_MOCK.messaging) {
    return mockResponse({ unblocked: userId }, 200);
  }

  return api.delete(`/messages/block/${userId}`);
};

// Get blocked users
export const fetchBlockedUsers = async () => {
  if (USE_MOCK.messaging) {
    return mockResponse([]);
  }

  const res = await api.get("/messages/blocked");
  return { data: res.data };
};

// Report a user
export const reportUser = (userId, reason) => {
  if (USE_MOCK.messaging) {
    return mockResponse({ reported: userId, reason }, 200);
  }

  return api.post(`/messages/report/${userId}`, { reason });
};

// ── Share a post ─────────────────────────────────────────────────────────────
export const fetchShareTargets = async () => {
  if (USE_MOCK.messaging)
    return mockResponse(MOCK_SHARE_TARGETS.map((t) => ({ ...t })));
  // ✅ Use user search API instead of missing share-targets endpoint
  const res = await api.get("/users/search?q=");
  return {
    data: (res.data ?? []).map((u) => ({
      id: String(u.id),
      name: u.name ?? "Unknown",
      subtitle: u.username ? `@${u.username}` : (u.email ?? ""),
      initial: u.name ? u.name[0].toUpperCase() : "?",
      avatarColor: u.name ?? "#1565C0",
      profileImage: u.profileImage ?? null,
    })),
  };
};

export const sharePost = (
  { postId, title, imageUrl = "", isPremium = false },
  userIds = [],
) => {
  if (USE_MOCK.messaging) {
    const results = [];
    userIds.forEach((uid) => {
      if (threads[uid]) {
        threads[uid] = [
          ...threads[uid],
          {
            id: "m-" + Date.now() + "-" + uid,
            conversationId: uid,
            fromMe: true,
            type: "text",
            text: `📨 Shared a post: ${title}`,
            time: clock(),
          },
        ];
        conversations = conversations.map((c) =>
          c.id === uid
            ? {
                ...c,
                lastType: "text",
                lastMessage: `📨 ${title}`,
                time: "now",
              }
            : c,
        );
      }
      results.push({ userId: uid, conversationId: uid });
    });
    return mockResponse(
      { shared: postId, count: userIds.length, results },
      250,
    );
  }
  // Send the cover image + premium flag so the backend snapshot
  // ({ ideaId, title, imageUrl, isPremium }) renders with the cover thumbnail.
  return api.post("/messages/share-post", {
    postId,
    title,
    imageUrl,
    isPremium,
    userIds,
  });
};
