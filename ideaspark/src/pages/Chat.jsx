// ════════════════════════════════════════════════════════════════════════
//  Chat  (figma "02 · Chat")
//
//  FIXES:
//  1. Reads convo.name / convo.online / convo.initial correctly from the
//     normalised object returned by messagingApi (works mock + live).
//  2. Voice recording uses real MediaRecorder → uploads to R2 via
//     uploadVoice() before calling sendMessage.
//  3. Message bubble handles backend field shapes: m.text for TEXT,
//     m.imageUrl for IMAGE, m.content (URL) for VOICE.
//  4. Graceful mic-permission error banner instead of silent failure.
//  5. "Uploading…" state disables cancel/send to prevent double-sends.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/messaging/Avatar";
import {
  ChatActionsLayer,
  ShareAttachSheet,
} from "../components/messaging/ChatActions";
import {
  fetchConversation,
  fetchContacts,
  startConversation,
  fetchMessages,
  sendMessage,
  uploadVoice,
  uploadFile,
  uploadImage,
  reactToMessage,
  deleteMessage,
  isLimitReachedError,
} from "../api/messagingApi";
import { isVerifiedCreatorPartner } from "../config/messagingLimits";

// ── Helpers ───────────────────────────────────────────────────────────────────

const quotedLabel = (m) => {
  if (!m) return "";
  if (m.type === "image") return "Photo";
  if (m.type === "voice") return "Voice message";
  return m.text || "";
};

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const formatMessageTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getDateLabel = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : new Date();

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
const QUICK_REACTIONS = [
  { label: "Like", emoji: "👍" },
  { label: "Fire", emoji: "🔥" },
  { label: "Heart", emoji: "❤️" },
  { label: "Clap", emoji: "👏" },
  { label: "Launch", emoji: "🚀" },
];

// Emoji reaction bar shown when exactly one message is selected
const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

// Free-tier messaging allowance when chatting with a verified creator
// (non-Premium users only). Premium accounts and user↔user chats are unlimited.
const TEXT_MSG_LIMIT = 5; // text messages
const FILE_SHARE_LIMIT = 1; // file / media / voice shares

// Attachment validation (mirrors the backend upload limits)
const MAX_MEDIA_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
];
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB

// ── Sub-components ────────────────────────────────────────────────────────────

function Waveform({ color = "#1565C0", animated = false }) {
  const heights = [8, 16, 10, 22, 14, 26, 12, 18, 9, 20, 13, 24, 11, 17];
  return (
    <div className="flex items-center gap-[3px] h-7">
      {heights.map((h, i) => (
        <span
          key={i}
          className={animated ? "sc-wave-bar" : ""}
          style={{
            width: 3,
            height: h,
            borderRadius: 3,
            background: color,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

// Dense full-width waveform that fills the composer while recording
function FullWaveform({ color = "#1565C0", faded = "#BBDEFB" }) {
  const bars = Array.from(
    { length: 46 },
    (_, i) => 4 + Math.round(Math.abs(Math.sin(i * 1.7)) * 18),
  );
  return (
    <div className="flex-1 flex items-center justify-between gap-[2px] h-7 overflow-hidden">
      {bars.map((h, i) => (
        <span
          key={i}
          className="sc-wave-bar"
          style={{
            width: 3,
            height: h,
            borderRadius: 3,
            background: i % 3 === 0 ? color : faded,
            animationDelay: `${(i % 10) * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

function QuotedInBubble({ replyTo, light }) {
  return (
    <div
      className={`mb-1 pl-2 border-l-2 ${light ? "border-white/70" : "border-[#1565C0]"}`}
    >
      <p
        className={`text-[11px] font-semibold ${light ? "text-white" : "text-[#1565C0]"}`}
      >
        {replyTo.name}
      </p>
      <p
        className={`text-[11px] truncate max-w-[200px] ${light ? "text-white/80" : "text-[#90A4AE]"}`}
      >
        {replyTo.text}
      </p>
    </div>
  );
}

function ReplyBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Reply"
      className="self-center shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[#90A4AE] opacity-60 hover:opacity-100 hover:bg-[#EAF2FF] transition"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 14L4 9l5-5M4 9h11a5 5 0 015 5v3"
        />
      </svg>
    </button>
  );
}

function Bubble({
  m,
  onImageClick,
  onReply,
  selectMode,
  selected,
  onToggleSelect,
  onLongPress,
  reaction,
  showReactionBar,
  onReact,
  onOpenIdea,
}) {
  const pressTimer = useRef(null);
  const startPress = () => {
    if (selectMode) return;
    pressTimer.current = setTimeout(() => onLongPress?.(m), 480);
  };
  const endPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // Typing indicator
  if (m.type === "typing") {
    return (
      <div className="flex justify-start">
        <div className="bg-white rounded-[19px] px-4 py-3 flex items-center gap-1.5 shadow-sm">
          {["#BBDEFB", "#1565C0", "#BBDEFB"].map((c, i) => (
            <span
              key={i}
              className="sc-typing-dot w-2.5 h-2.5 rounded-full"
              style={{ background: c, animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const mine = m.fromMe;
  const rowCls = `flex items-end gap-1.5 group ${mine ? "justify-end" : "justify-start"}`;

  let content;

  if (m.type === "image") {
    // imageUrl set by normalizeMessage() from backend content field
    const src = m.imageUrl || m.content || "";
    const media = m.isVideo ? (
      <video
        src={src}
        controls
        className="w-[200px] h-[130px] object-cover rounded-2xl bg-black"
      />
    ) : (
      <img
        src={src}
        alt="shared"
        className="w-[200px] h-[130px] object-cover rounded-2xl"
      />
    );
    content = (
      <div className="block">
        {m.replyTo && <QuotedInBubble replyTo={m.replyTo} light={false} />}
        {m.isVideo ? (
          media
        ) : (
          <button
            onClick={() => {
              if (!selectMode) onImageClick(src);
            }}
            className="block"
          >
            {media}
          </button>
        )}
        {m.text && (
          <p className="mt-1 max-w-[200px] text-[12px] text-[#0D2137]">
            {m.text}
          </p>
        )}
      </div>
    );
  } else if (m.type === "file") {
    content = (
      <div
        onClick={() => {
          if (!selectMode && m.content)
            window.open(m.content, "_blank", "noopener");
        }}
        className={`flex items-center gap-3 rounded-[18px] px-4 py-3 max-w-[240px] ${m.content && !selectMode ? "cursor-pointer" : ""} ${mine ? "bg-[#1565C0] text-white" : "bg-white text-[#0D2137] shadow-sm"}`}
      >
        <span
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${mine ? "bg-white/20" : "bg-[#EAF2FF] text-[#1565C0]"}`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 3v5h5M7 3h7l5 5v11a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
            />
          </svg>
        </span>
        <span className="text-[13px] truncate">{m.fileName}</span>
      </div>
    );
  } else if (m.type === "voice") {
    // content holds the R2 URL (set by normalizeMessage or by optimistic push)
    const audioSrc = m.content || "";
    const hasAudio =
      audioSrc.startsWith("http") || audioSrc.startsWith("blob:");
    content = (
      <div
        className={`flex flex-col gap-2 rounded-[18px] px-4 py-3 max-w-[260px] ${mine ? "bg-[#1565C0]" : "bg-white shadow-sm"}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${mine ? "bg-white/20 text-white" : "bg-[#1565C0] text-white"}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <Waveform color={mine ? "#FFFFFF" : "#1565C0"} />
          {m.duration && (
            <span
              className={`text-[12px] shrink-0 ${mine ? "text-white" : "text-[#90A4AE]"}`}
            >
              {m.duration}
            </span>
          )}
        </div>
        {hasAudio && (
          <audio
            src={audioSrc}
            controls
            className="w-full h-8"
            style={{
              filter: mine ? "invert(1) hue-rotate(180deg)" : "none",
              opacity: 0.85,
            }}
          />
        )}
      </div>
    );
  } else if (m.type === "idea") {
    // Shared idea — a tappable card that opens the idea detail page.
    const idea = m.idea || {};
    content = (
      <button
        onClick={() => {
          if (!selectMode) onOpenIdea?.(idea);
        }}
        className="block w-[230px] overflow-hidden rounded-2xl bg-white text-left shadow-sm border border-[#E3F2FD] active:scale-[0.99] transition-transform"
      >
        {idea.imageUrl ? (
          <img src={idea.imageUrl} alt="" className="w-full h-[120px] object-cover" />
        ) : (
          <div className="w-full h-[88px] bg-[#EAF2FF] flex items-center justify-center text-[#1565C0] text-[11px] font-bold tracking-widest">
            IDEA
          </div>
        )}
        <div className="px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1565C0]">
            Shared an idea
          </p>
          <p className="mt-0.5 text-[13px] font-bold text-[#0D2137] leading-snug line-clamp-2">
            {idea.title || "Untitled idea"}
          </p>
          <p className="mt-1.5 text-[12px] font-semibold text-[#1565C0]">
            View idea →
          </p>
        </div>
      </button>
    );
  } else {
    // TEXT (default)
    const displayText = m.text ?? m.content ?? "";
    content = (
      <div
        className={`max-w-[240px] px-4 py-2.5 text-[13px] leading-snug ${
          mine
            ? "bg-[#1565C0] text-white font-semibold rounded-[18px] rounded-br-md"
            : "bg-white text-[#0D2137] rounded-[18px] rounded-bl-md shadow-sm"
        }`}
      >
        {m.replyTo && <QuotedInBubble replyTo={m.replyTo} light={mine} />}

        <div className="flex items-end gap-2">
          <span className="break-words">{displayText}</span>

          {mine && (
            <span className="flex items-center gap-1 text-[10px] text-white/80 font-normal whitespace-nowrap">
              <span>{m.time || "now"}</span>

              <span
                className={`inline-flex ${
                  m.isRead || m.read ? "text-sky-300" : "text-white/80"
                }`}
              >
                <span>✓</span>
                {(m.isRead || m.read) && <span className="-ml-1">✓</span>}
              </span>
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.(m);
      }}
      className={`-mx-4 px-4 py-1 transition-colors ${selected ? "bg-[#DBEAFE]/70" : ""} ${selectMode ? "cursor-pointer select-none" : ""}`}
    >
      {/* Emoji reaction bar — only when this is the single selected message */}
      {showReactionBar && (
        <div
          className={`flex ${mine ? "justify-end" : "justify-start"} mb-1.5`}
        >
          <div className="flex items-center gap-0.5 bg-white rounded-full shadow-md px-2 py-1.5 border border-[#E3F2FD]">
            {REACTION_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onReact?.(m, e)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 active:scale-110 transition-transform"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className={rowCls}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onClick={selectMode ? () => onToggleSelect?.(m) : undefined}
      >
        {mine && (
          <ReplyBtn
            onClick={() => {
              if (!selectMode) onReply(m);
            }}
          />
        )}
        <div className="relative">
          {content}

        
          {reaction && (
            <span
              className={`absolute -bottom-2.5 ${
                mine ? "left-1" : "right-1"
              } bg-white rounded-full shadow px-1 py-0.5 text-[13px] leading-none border border-[#E3F2FD]`}
            >
              {reaction}
            </span>
          )}
        </div>

        {!mine && (
          <ReplyBtn
            onClick={() => {
              if (!selectMode) onReply(m);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Loading placeholder — mirrors the bubble layout while the thread loads
function MessagesSkeleton() {
  return (
    <div className="flex-1 overflow-hidden px-4 py-4 space-y-4">
      <div className="flex justify-center">
        <span className="h-6 w-16 rounded-[13px] bg-[#DBEAFE] animate-pulse" />
      </div>
      <div className="flex justify-start">
        <div className="h-9 w-44 rounded-[18px] rounded-bl-md bg-white shadow-sm animate-pulse" />
      </div>
      <div className="flex justify-start">
        <div className="h-28 w-52 rounded-2xl bg-white shadow-sm animate-pulse" />
      </div>
      <div className="flex justify-end">
        <div className="h-10 w-40 rounded-[18px] rounded-br-md bg-[#1565C0]/30 animate-pulse" />
      </div>
      <div className="flex justify-start">
        <div className="h-7 w-28 rounded-[18px] rounded-bl-md bg-white shadow-sm animate-pulse" />
      </div>
    </div>
  );
}

// Shown when a conversation has no messages yet
function EmptyState({ onSayHello }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="relative w-40 h-40 flex items-center justify-center mb-2">
        <span className="absolute inset-0 rounded-full bg-[#1565C0]/5" />
        <span className="absolute inset-5 rounded-full bg-[#1565C0]/10" />
        <span className="w-16 h-16 rounded-full bg-[#1565C0] flex items-center justify-center shadow-lg">
          <svg
            className="w-7 h-7 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.5A9 9 0 1121 12z"
            />
          </svg>
        </span>
      </div>
      <h3 className="text-[17px] font-bold text-[#0D2137]">No messages yet</h3>
      <p className="text-[13px] text-[#90A4AE] mt-1">Start the conversation!</p>
      <button
        onClick={onSayHello}
        className="mt-5 px-7 py-3 rounded-full bg-[#1565C0] text-white text-[14px] font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
      >
        Say Hello 👋
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Chat() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const filesRef = useRef(null);
  const scrollRef = useRef(null);

  // Voice recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const [convo, setConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // null | 'recording' | 'uploading'
  const [recordingState, setRecordingState] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState(null);

  const [compose, setCompose] = useState(null);
  const [caption, setCaption] = useState("");
  const [viewer, setViewer] = useState(null);
  const [actionView, setActionView] = useState(null);
  const [toast, setToast] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Message selection / per-message actions
  const [menuOpen, setMenuOpen] = useState(false); // header 3-dot dropdown
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reactions, setReactions] = useState({}); // messageId → emoji
  const [deletePrompt, setDeletePrompt] = useState(false);

  // Menu features: search, media & docs, forward
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaTab, setMediaTab] = useState("media");
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardContacts, setForwardContacts] = useState(null); // null = loading
  const [forwardPicked, setForwardPicked] = useState([]); // selected contact ids
  const [forwardSearch, setForwardSearch] = useState("");

  // Free-tier messaging limit upsell modal
  const [showLimitModal, setShowLimitModal] = useState(false);

  // ── Free-tier messaging limit (verified creators only) ───────────────────
  // Chatting is free for everyone. When the other party is a *verified creator*
  // and the current user is not Premium, a free allowance applies:
  //   • 5 text messages   • 1 file / media / voice share
  // Premium removes the cap; user↔user chats are always unlimited.
  // Who counts as a verified creator is decided in config/messagingLimits.js
  // (frontend override until the backend exposes the flag).
  const isPremium = !!(user?.isPremium ?? user?.premium);
  const partnerIsCreator = isVerifiedCreatorPartner(convo);
  const limited = partnerIsCreator && !isPremium;
  const textUsed = messages.filter((m) => m.fromMe && m.type === "text").length;
  const fileUsed = messages.filter(
    (m) => m.fromMe && ["image", "file", "voice"].includes(m.type),
  ).length;
  const textRemaining = Math.max(0, TEXT_MSG_LIMIT - textUsed);
  const textLimitReached = limited && textUsed >= TEXT_MSG_LIMIT;
  const fileLimitReached = limited && fileUsed >= FILE_SHARE_LIMIT;
  const limitLocked = textLimitReached; // composer fully locked once text is exhausted

  const goPremium = () => {
    setShowLimitModal(false);
    navigate("/membership");
  };

  // ── Load conversation + messages ────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [{ data: c }, { data: msgs }] = await Promise.all([
          fetchConversation(id),
          fetchMessages(id),
        ]);
        if (!alive) return;
        setConvo(c);
        setMessages(msgs);

        // Seed reactions saved on the server so they persist across reloads
        const seeded = {};
        msgs.forEach((m) => {
          if (m.reaction) seeded[m.id] = m.reaction;
        });
        setReactions(seeded);
      } catch (err) {
        console.error("Chat load error:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const handleReadReceipt = (event) => {
      const readMessageId = event.detail;

      setMessages((prev) =>
        prev.map((msg) =>
          String(msg.id) === String(readMessageId)
            ? { ...msg, isRead: true, read: true }
            : msg,
        ),
      );
    };

    window.addEventListener("message-read-receipt", handleReadReceipt);

    return () => {
      window.removeEventListener("message-read-receipt", handleReadReceipt);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // ── Clean up mic on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopTimer();
      try {
        mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      } catch (error) {
        console.error(error);
      }
    };
  }, []);

  // ── Timer helpers ───────────────────────────────────────────────────────
  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ── Toast helper ────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // ── Optimistic message push ─────────────────────────────────────────────
  const pushSent = async (payload) => {
    const optimistic = {
      id: "tmp-" + Date.now(),
      conversationId: id,
      fromMe: true,
      time: "",
      ...payload,
    };
    setMessages((prev) => [
      ...prev.filter((m) => m.type !== "typing"),
      optimistic,
    ]);
    try {
      await sendMessage(id, payload);
    } catch (err) {
      console.error("sendMessage failed:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      if (isLimitReachedError(err)) {
        setShowLimitModal(true);
      } else {
        showToast("Message could not be sent.");
      }
    }
  };

  useEffect(() => {
  const handlePresence = (event) => {
    const presence = event.detail;

    setConvo((prev) => {
      if (!prev) return prev;

      if (String(prev.otherUserId) !== String(presence.userId)) {
        return prev;
      }

      return {
        ...prev,
        online: presence.online,
        otherUserOnline: presence.online,
        lastSeen: presence.lastSeen,
      };
    });
  };

  window.addEventListener("presence-update", handlePresence);

  return () => {
    window.removeEventListener("presence-update", handlePresence);
  };
}, []);

  const replySnippet = () =>
    replyTo
      ? {
          name: replyTo.fromMe ? "You" : (convo?.name ?? ""),
          text: quotedLabel(replyTo),
        }
      : undefined;

  const handleSayHello = () => {
    pushSent({ type: "text", text: "Hello 👋" });
  };

  // ── Message selection / per-message actions ─────────────────────────────
  const enterSelect = (m) => {
    setMenuOpen(false);
    setSelectMode(true);
    setSelectedIds(m ? [m.id] : []);
  };

  const toggleSelect = (m) => {
    setSelectedIds((ids) =>
      ids.includes(m.id) ? ids.filter((x) => x !== m.id) : [...ids, m.id],
    );
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  // Reactions only apply to a single selected message (one emoji per user)
  const applyReaction = (m, emoji) => {
    const next = reactions[m.id] === emoji ? undefined : emoji;
    setReactions((r) => ({ ...r, [m.id]: next })); // optimistic
    exitSelect();
    reactToMessage(m.id, emoji).catch(() => {
      // revert on failure
      setReactions((r) => ({ ...r, [m.id]: reactions[m.id] }));
      showToast("Could not save reaction.");
    });
  };

  const selectedMessages = () =>
    messages.filter((m) => selectedIds.includes(m.id));

  const copySelected = async () => {
    const txt = selectedMessages()
      .map((m) => m.text ?? m.content ?? quotedLabel(m))
      .join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      showToast(selectedIds.length > 1 ? "Messages copied" : "Message copied");
    } catch {
      showToast("Could not copy.");
    }
    exitSelect();
  };

  // Build a sendMessage payload from an existing message
  const toPayload = (m) => {
    if (m.type === "image")
      return {
        type: "image",
        imageUrl: m.imageUrl || m.content,
        content: m.content || m.imageUrl,
        isVideo: m.isVideo,
        text: m.text,
      };
    if (m.type === "voice")
      return { type: "voice", content: m.content, duration: m.duration };
    if (m.type === "file")
      return { type: "file", content: m.content, fileName: m.fileName };
    return { type: "text", text: m.text ?? m.content ?? "" };
  };

  const openForward = async () => {
    setForwardOpen(true);
    setForwardContacts(null);
    setForwardPicked([]);
    setForwardSearch("");
    try {
      const { data } = await fetchContacts();
      setForwardContacts(data || []);
    } catch {
      setForwardContacts([]);
    }
  };

  const toggleForwardPick = (cid) =>
    setForwardPicked((p) =>
      p.includes(cid) ? p.filter((x) => x !== cid) : [...p, cid],
    );

  const doForward = async () => {
    const targets = (forwardContacts || []).filter((c) =>
      forwardPicked.includes(c.id),
    );
    if (!targets.length) return;
    const msgs = selectedMessages();
    setForwardOpen(false);
    exitSelect();
    try {
      for (const t of targets) {
        const { data: conv } = await startConversation(t.id); // existing or new conversation
        for (const m of msgs) await sendMessage(conv.id, toPayload(m));
      }
      showToast(
        targets.length === 1
          ? `Forwarded to ${targets[0].name}`
          : `Forwarded to ${targets.length} chats`,
      );
    } catch (err) {
      console.error("Forward failed:", err);
      showToast("Could not forward. Please try again.");
    }
  };

  // scope: 'me' | 'everyone' — persisted via DELETE /messages/messages/{id}
  const confirmDeleteMessages = (scope) => {
    const ids = [...selectedIds];
    setMessages((prev) => prev.filter((m) => !ids.includes(m.id))); // optimistic
    setDeletePrompt(false);
    exitSelect();
    Promise.allSettled(ids.map((mid) => deleteMessage(mid, scope))).then(
      (res) => {
        if (res.some((r) => r.status === "rejected"))
          showToast("Some messages could not be deleted.");
        else
          showToast(
            scope === "everyone" ? "Deleted for everyone" : "Deleted for you",
          );
      },
    );
  };

  // ── Text send ───────────────────────────────────────────────────────────
  const handleSendText = () => {
    const value = text.trim();
    if (!value) return;
    if (limitLocked) {
      setShowLimitModal(true);
      return;
    }
    pushSent({ type: "text", text: value, replyTo: replySnippet() });
    setText("");
    setReplyTo(null);
  };

  const sendQuickReaction = (q) => {
    if (limitLocked) {
      setShowLimitModal(true);
      return;
    }
    pushSent({ type: "text", text: q.emoji, replyTo: replySnippet() });
    setReplyTo(null);
  };

  // ── Media / file ────────────────────────────────────────────────────────
  const handleMedia = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    for (const file of files) {
      if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
        showToast("Only JPG, PNG, WEBP images and MP4 videos are supported.");
        return;
      }
      if (file.size > MAX_MEDIA_SIZE) {
        showToast("Media file size must be less than 5MB.");
        return;
      }
    }
    const items = files.map((f) => ({
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith("video"),
      name: f.name,
      file: f,
    }));
    if (!compose) setCaption("");
    setCompose((prev) =>
      prev
        ? { ...prev, items: [...prev.items, ...items] }
        : { items, index: 0 },
    );
  };

  const removeComposeItem = (i) => {
    setCompose((prev) => {
      if (!prev) return prev;
      try {
        URL.revokeObjectURL(prev.items[i]?.url);
      } catch (error) {
        console.error(error);
      }
      const items = prev.items.filter((_, idx) => idx !== i);
      if (items.length === 0) return null;
      return { items, index: Math.min(prev.index, items.length - 1) };
    });
  };

  const handleSendCompose = async () => {
    if (!compose) return;
    if (fileLimitReached) { setShowLimitModal(true); return; }

    const items = compose.items;
    setCompose(null); setCaption(''); setReplyTo(null);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const tmpId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      // Optimistic bubble using the local blob preview (fine for the sender's
      // own screen only — never persisted or sent to the backend/receiver).
      setMessages((prev) => [
        ...prev.filter((m) => m.type !== 'typing'),
        {
          id: tmpId, conversationId: id, fromMe: true, time: '', type: 'image',
          imageUrl: it.url, isVideo: it.isVideo,
          text: i === 0 ? (caption.trim() || undefined) : undefined,
          replyTo: i === 0 ? replySnippet() : undefined,
        },
      ]);
      try {
        // Upload the real file to R2 first — sending the blob: URL directly
        // is what was breaking images for both sender and receiver, since
        // blob: URLs only resolve inside the tab that created them.
        const url = await uploadImage(it.file, id);
        const sent = await sendMessage(id, {
          type: 'image',
          content: url,
          isVideo: it.isVideo,
          text: i === 0 ? (caption.trim() || undefined) : undefined,
          replyTo: i === 0 ? replySnippet() : undefined,
        });
        // Swap the optimistic bubble over to the permanent R2 url (and the
        // server's real message id, when available) *before* revoking the
        // blob — the bubble is still mounted and pointing at it.id/imageUrl,
        // so revoking first left it referencing a dead blob: URL, which is
        // what produced the "Failed to load resource… ERR_FILE_NOT_FOUND"
        // console error on every successful image send.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tmpId
              ? { ...m, id: sent?.data?.id ?? m.id, imageUrl: url }
              : m,
          ),
        );
        try { URL.revokeObjectURL(it.url); } catch (_) {}
      } catch (err) {
        console.error('Image send failed:', err);
        setMessages((prev) => prev.filter((m) => m.id !== tmpId));
        if (isLimitReachedError(err)) {
          setShowLimitModal(true);
        } else {
          showToast('Could not send image.');
        }
      }
    }
  };

  // Upload each picked file to R2, then send it as a persisted FILE message
  const handleDocs = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (fileLimitReached) {
      setShowLimitModal(true);
      return;
    }
    for (const file of files) {
      if (file.size > MAX_DOC_SIZE) {
        showToast("File size must be less than 10MB.");
        return;
      }
    }
    for (const f of files) {
      const tmpId =
        "tmp-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      setMessages((prev) => [
        ...prev.filter((m) => m.type !== "typing"),
        {
          id: tmpId,
          conversationId: id,
          fromMe: true,
          time: "",
          type: "file",
          fileName: f.name,
        },
      ]);
      try {
        const url = await uploadFile(f, id);
        await sendMessage(id, { type: "file", content: url, fileName: f.name });
      } catch (err) {
        console.error("File send failed:", err);
        setMessages((prev) => prev.filter((m) => m.id !== tmpId));
        if (isLimitReachedError(err)) {
          setShowLimitModal(true);
        } else {
          showToast(`Could not send ${f.name}.`);
        }
      }
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  //  VOICE RECORDING — real MediaRecorder
  // ════════════════════════════════════════════════════════════════════════

  const startRecording = async () => {
    setMicError(null);

    if (fileLimitReached) {
      setShowLimitModal(true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("Microphone not supported on this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType =
        ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"].find(
          (t) => MediaRecorder.isTypeSupported(t),
        ) || "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setSeconds(0);
      setRecordingState("recording");
      startTimer();
    } catch (err) {
      setMicError(
        err.name === "NotAllowedError"
          ? "Microphone permission denied. Allow access and try again."
          : "Could not start recording. Please try again.",
      );
    }
  };

  const cancelRecording = () => {
    stopTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch (err) {
        console.warn("Failed to stop recorder:", err);
      }
      recorder.stream?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    setRecordingState(null);
    setSeconds(0);
    setMicError(null);
  };

  const sendRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    const durationLabel = fmt(seconds || 1);
    stopTimer();
    setRecordingState("uploading");

    recorder.onstop = async () => {
      recorder.stream?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;

      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];

      try {
        const url = await uploadVoice(blob, mimeType, id);
        pushSent({
          type: "voice",
          content: url,
          duration: durationLabel,
          replyTo: replySnippet(),
        });
        setReplyTo(null);
      } catch (err) {
        if (isLimitReachedError(err)) {
          setShowLimitModal(true);
        } else {
          showToast("Voice upload failed. Please try again.");
        }
      } finally {
        setRecordingState(null);
        setSeconds(0);
      }
    };

    try {
      recorder.stop();
    } catch {
      setRecordingState(null);
      setSeconds(0);
    }
  };

  const isRecording = recordingState === "recording";
  const isUploading = recordingState === "uploading";

  // Search filter over the thread
  const q = searchQuery.trim().toLowerCase();
  const visibleMessages =
    searchMode && q
      ? messages.filter((m) =>
          (m.text ?? m.content ?? "").toLowerCase().includes(q),
        )
      : messages;

  const getDateLabel = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : new Date();

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString();
};

  // Shared media / docs for the Media & Docs sheet
  const mediaItems = messages.filter((m) => m.type === "image");
  const docItems = messages.filter((m) => m.type === "file");

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#F4F7FF]">
      <style>{`
        @keyframes scWave   { 0%,100%{ transform:scaleY(0.5);} 50%{ transform:scaleY(1);} }
        .sc-wave-bar        { animation:scWave 900ms ease-in-out infinite; transform-origin:center; }
        @keyframes scTyping { 0%,60%,100%{ transform:translateY(0);opacity:.5;} 30%{ transform:translateY(-4px);opacity:1;} }
        .sc-typing-dot      { animation:scTyping 1.2s ease-in-out infinite; }
        @keyframes scPulse  { 0%,100%{ opacity:1;} 50%{ opacity:.35;} }
        .sc-rec-dot         { animation:scPulse 1s ease-in-out infinite; }
        @keyframes scSlideIn { from{ transform:translateX(100%);} to{ transform:translateX(0);} }
        .sc-slide-in        { animation:scSlideIn 260ms cubic-bezier(0.32,0.72,0,1); }
      `}</style>

      {/* ── HEADER ── */}
      <header className="shrink-0 bg-[#1565C0] px-4 pt-4 pb-4 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        {selectMode ? (
          /* ── SELECTION HEADER ── */
          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={exitSelect}
              aria-label="Cancel selection"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <span className="w-9 h-9 rounded-full bg-white/15 text-white font-bold flex items-center justify-center">
              {selectedIds.length}
            </span>

            <div className="flex-1" />

            <button
              onClick={copySelected}
              disabled={!selectedIds.length}
              aria-label="Copy"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-white/30 text-white hover:bg-white/15 active:scale-90 transition-all disabled:opacity-40"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"
                />
              </svg>
            </button>
            <button
              onClick={() => setDeletePrompt(true)}
              disabled={!selectedIds.length}
              aria-label="Delete"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-white/30 text-white hover:bg-white/15 active:scale-90 transition-all disabled:opacity-40"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"
                />
              </svg>
            </button>
            <button
              onClick={openForward}
              disabled={!selectedIds.length}
              aria-label="Forward"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-white/30 text-white hover:bg-white/15 active:scale-90 transition-all disabled:opacity-40"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12h13M13 6l6 6-6 6"
                />
              </svg>
            </button>
          </div>
        ) : searchMode ? (
          /* ── SEARCH HEADER ── */
          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={() => {
                setSearchMode(false);
                setSearchQuery("");
              }}
              aria-label="Close search"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all shrink-0"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search...."
              className="flex-1 min-w-0 bg-white/15 text-white placeholder-white/70 rounded-full px-4 py-2.5 text-[14px] focus:outline-none focus:bg-white/20"
            />
          </div>
        ) : (
          /* ── NORMAL HEADER ── */
          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Identity pill — tapping the name opens the chat info / profile */}
            <button onClick={() => navigate(`/messages/${id}/profile`)} aria-label="View profile"
              className="flex-1 min-w-0 flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2 text-left hover:bg-white/15 active:scale-[0.98] transition-all">
              {loading ? (
                <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse shrink-0" />
              ) : (
                <Avatar
                  initial={convo?.initial ?? "?"}
                  color={convo?.avatarColor ?? "#1565C0"}
                  size={36}
                  online={convo?.online ?? false}
                />
              )}
              <div className="min-w-0">
                {loading ? (
                  <>
                    <div className="h-3.5 w-28 bg-white/20 rounded animate-pulse mb-1" />
                    <div className="h-3 w-16 bg-white/15 rounded animate-pulse" />
                  </>
                ) : (
                  <>
                    <p className="text-[15px] font-bold text-white truncate leading-tight">
                      {convo?.name ?? "Chat"}
                    </p>
                    <p
                      className={`text-[12px] font-medium leading-tight ${convo?.online ? "text-[#A5D6A7]" : "text-blue-200"}`}
                    >
                      {convo?.online ? "● Online" : "Offline"}
                    </p>
                  </>
                )}
              </div>
            </button>

            {/* 3-dot overflow menu */}
            <div className="relative z-20">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More options"
                className="w-9 h-9 flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-11 z-20 w-60 bg-white rounded-2xl shadow-xl border border-[#F0F6FF] overflow-hidden py-1">
                    {[
                      {
                        key: "search",
                        title: "Search",
                        sub: "Search in this chat",
                        icon: (
                          <>
                            <circle cx="11" cy="11" r="7" />
                            <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
                          </>
                        ),
                      },
                      {
                        key: "media",
                        title: "Media & Docs",
                        sub: "View shared files",
                        icon: (
                          <>
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 15l-5-5L5 21"
                            />
                          </>
                        ),
                      },
                      {
                        key: "select",
                        title: "Select Message",
                        sub: "Choose messages",
                        icon: (
                          <>
                            <rect x="3" y="3" width="18" height="18" rx="4" />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8 12l3 3 5-6"
                            />
                          </>
                        ),
                      },
                    ].map((it) => (
                      <button
                        key={it.key}
                        onClick={() => {
                          setMenuOpen(false);
                          if (it.key === "select") enterSelect(null);
                          else if (it.key === "media") {
                            setMediaTab("media");
                            setMediaOpen(true);
                          } else {
                            setSearchQuery("");
                            setSearchMode(true);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F8FAFF] transition-colors"
                      >
                        <svg
                          className="w-5 h-5 text-[#1565C0] shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.8}
                        >
                          {it.icon}
                        </svg>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-[#0D2137]">
                            {it.title}
                          </span>
                          <span className="block text-[11px] text-[#90A4AE]">
                            {it.sub}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Messages ── */}
      {loading ? (
        <MessagesSkeleton />
      ) : messages.length === 0 ? (
        <EmptyState onSayHello={handleSayHello} />
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        >
          <div className="flex justify-center">
            <span className="px-3 py-1 rounded-[13px] bg-[#DBEAFE] text-[12px] text-[#1565C0] font-medium">
              {getDateLabel(messages[0]?.createdAt)}
            </span>
          </div>
          {searchMode && q && visibleMessages.length === 0 ? (
            <p className="text-center text-[13px] text-[#90A4AE] pt-10">
              No messages match “{searchQuery.trim()}”.
            </p>
          ) : (
            visibleMessages.map((m) => (
              <Bubble
                key={m.id}
                m={m}
                onImageClick={(url) => setViewer(url)}
                onReply={(msg) => setReplyTo(msg)}
                selectMode={selectMode}
                selected={selectedIds.includes(m.id)}
                onToggleSelect={toggleSelect}
                onLongPress={enterSelect}
                reaction={reactions[m.id]}
                showReactionBar={
                  selectMode &&
                  selectedIds.length === 1 &&
                  selectedIds[0] === m.id
                }
                onReact={applyReaction}
                onOpenIdea={(idea) => {
                  if (!idea?.id) return;
                  navigate(idea.isPremium ? `/premium/${idea.id}` : `/ideas/${idea.id}`);
                }}
              />
            ))
          )}
        </div>
      )}

      {/* ── Mic permission error banner ── */}
      {micError && (
        <div className="shrink-0 bg-[#FEE2E2] border-t border-[#FECACA] px-4 py-2.5 flex items-center gap-3">
          <svg
            className="w-4 h-4 text-[#EF4444] shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <p className="flex-1 text-[12px] text-[#EF4444]">{micError}</p>
          <button
            onClick={() => setMicError(null)}
            className="text-[#EF4444] text-[11px] font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Messaging-limit banner (verified-creator free tier) ── */}
      {limited && textLimitReached ? (
        <div className="shrink-0 bg-[#FEF2F2] border-t border-[#FECACA] px-4 py-2.5 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-[#EF4444] shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 018 0v4" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#DC2626]">
              Message limit reached
            </p>
            <p className="text-[11px] text-[#EF4444]">
              Upgrade to continue this conversation
            </p>
          </div>
          <button
            onClick={goPremium}
            className="shrink-0 bg-[#EF4444] hover:bg-[#DC2626] text-white text-[13px] font-bold px-4 py-1.5 rounded-full active:scale-95 transition-all flex items-center gap-1"
          >
            <span></span> Go Premium
          </button>
        </div>
      ) : limited && textRemaining > 0 && textRemaining <= 3 ? (
        <div className="shrink-0 bg-[#FEF3C7] border-t border-[#FDE68A] px-4 py-2.5 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-[#D97706] shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#92400E]">
              Only {textRemaining} message{textRemaining === 1 ? "" : "s"} left
            </p>
            <p className="text-[11px] text-[#B45309]">
              Upgrade to Premium for unlimited messaging
            </p>
          </div>
          <button
            onClick={goPremium}
            className="shrink-0 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-bold px-4 py-1.5 rounded-full active:scale-95 transition-all"
          >
            Upgrade ✨
          </button>
        </div>
      ) : null}

      {/* ── Composer ── */}
      {isRecording || isUploading ? (
        /* ── RECORDING / UPLOADING BAR ─────────────────────────────────── */
        <div className="shrink-0 bg-white border-t border-[#DBEAFE] px-4 py-3 flex items-center gap-3">
          <button
            onClick={cancelRecording}
            disabled={isUploading}
            aria-label="Cancel recording"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95
              ${isUploading ? "bg-[#F0F6FF] text-[#90A4AE] cursor-not-allowed" : "bg-[#FEE2E2] text-[#EF4444]"}`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6l12 12M6 18L18 6"
              />
            </svg>
          </button>

          <div className="flex-1 flex items-center gap-3 bg-[#F4F7FF] rounded-[20px] px-4 py-2">
            {isUploading ? (
              <>
                <svg
                  className="w-4 h-4 text-[#1565C0] animate-spin shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span className="text-[13px] font-semibold text-[#1565C0]">
                  Sending voice note…
                </span>
              </>
            ) : (
              <>
                <span className="sc-rec-dot w-3 h-3 rounded-full bg-[#EF4444] shrink-0" />
                <FullWaveform color="#1565C0" faded="#BBDEFB" />
                <span className="text-[13px] font-semibold text-[#0D2137] tabular-nums shrink-0">
                  {fmt(seconds)}
                </span>
              </>
            )}
          </div>

          <button
            onClick={sendRecording}
            disabled={isUploading}
            aria-label="Send voice"
            className={`w-10 h-10 rounded-full text-white flex items-center justify-center transition-all active:scale-95
              ${isUploading ? "bg-[#90A4AE] cursor-not-allowed" : "bg-[#1565C0]"}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
      ) : limitLocked ? (
        /* ── LOCKED COMPOSER (free-tier limit reached) ───────────────────── */
        <div className="shrink-0 bg-white border-t border-[#DBEAFE] px-3 pt-2 pb-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLimitModal(true)}
              aria-label="Upgrade to send"
              className="w-10 h-10 rounded-full bg-[#F0F6FF] text-[#90A4AE] flex items-center justify-center shrink-0 active:scale-95 transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 5v14M5 12h14"
                />
              </svg>
            </button>
            <button
              onClick={() => setShowLimitModal(true)}
              className="flex-1 flex items-center gap-2 bg-[#F0F6FF] border border-[#BBDEFB] rounded-full px-4 py-2.5 text-left active:scale-[0.99] transition-all"
            >
              <svg
                className="w-4 h-4 text-[#90A4AE] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
              <span className="flex-1 text-[14px] text-[#90A4AE]">
                Messaging limit reached
              </span>
            </button>
            <button
              disabled
              aria-label="Send disabled"
              className="w-10 h-10 rounded-full bg-[#90A4AE] text-white flex items-center justify-center shrink-0 opacity-70 cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        /* ── NORMAL COMPOSER ────────────────────────────────────────────── */
        <div className="shrink-0 bg-white border-t border-[#DBEAFE] px-3 pt-2 pb-2.5">
          {replyTo && (
            <>
              <div className="flex items-center gap-3 bg-[#EAF2FF] border-l-4 border-[#1565C0] rounded-r-xl px-3 py-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#1565C0]">
                    Replying to{" "}
                    {replyTo.fromMe ? "yourself" : (convo?.name ?? "")}
                  </p>
                  <p className="text-[13px] text-[#90A4AE] truncate">
                    {quotedLabel(replyTo)}
                  </p>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  aria-label="Cancel reply"
                  className="w-7 h-7 rounded-full bg-[#DBEAFE] text-[#546E7A] flex items-center justify-center shrink-0"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 6l12 12M6 18L18 6"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 mb-1">
                {QUICK_REACTIONS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => sendQuickReaction(q)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#F0F6FF] text-[#1565C0] border border-[#BBDEFB] text-[13px] font-semibold hover:bg-[#DBEAFE] hover:border-[#1565C0] active:scale-95 transition-all"
                  >
                    <span>{q.emoji}</span>
                    <span>{q.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (fileLimitReached) setShowLimitModal(true);
                else setAttachOpen(true);
              }}
              aria-label="Attach"
              className="w-10 h-10 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0 hover:opacity-90 active:scale-95 transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 5v14M5 12h14"
                />
              </svg>
            </button>
            <button
              aria-label="Emoji"
              className="w-10 h-10 rounded-full bg-[#F0F6FF] border border-[#BBDEFB] text-[#1565C0] flex items-center justify-center shrink-0 hover:bg-[#DBEAFE] active:scale-95 transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  strokeLinecap="round"
                  d="M9 10h.01M15 10h.01M8.5 14.5a4 4 0 007 0"
                />
              </svg>
            </button>
            <div className="flex-1 flex items-center gap-2 bg-[#F0F6FF] border border-[#BBDEFB] rounded-full px-4 py-2.5">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendText();
                }}
                placeholder="Message..."
                className="flex-1 bg-transparent text-[14px] text-[#0D2137] placeholder-[#90A4AE] focus:outline-none"
              />
              <button
                onClick={startRecording}
                aria-label="Record voice message"
                className="text-[#1565C0] shrink-0 hover:opacity-70 active:scale-90 transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 11a7 7 0 0014 0M12 18v3M8.5 21h7"
                  />
                </svg>
              </button>
            </div>
            <button
              onClick={handleSendText}
              aria-label="Send"
              className="w-10 h-10 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0 hover:opacity-90 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            hidden
            onChange={handleMedia}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={handleMedia}
          />
          <input
            ref={filesRef}
            type="file"
            multiple
            hidden
            onChange={handleDocs}
          />
        </div>
      )}

      {/* ── Send Photo compose ── */}
      {compose && (
        <div className="fixed inset-0 z-50 bg-[#0D2137] flex flex-col">
          <header className="shrink-0 bg-[#1565C0] px-4 py-4 relative shadow-lg">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -top-12 -right-6" />
              <div className="absolute w-24 h-24 rounded-full border-[20px] border-white/5 -bottom-8 -left-4" />
            </div>
            <div className="flex items-center relative z-10">
              <button
                onClick={() => {
                  setCompose(null);
                  setCaption("");
                }}
                aria-label="Back"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <span className="flex-1 text-center text-white font-bold text-lg">
                Send Photo
              </span>
              <span className="w-9" />
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center px-4 min-h-0">
            {compose.items[compose.index].isVideo ? (
              <video
                src={compose.items[compose.index].url}
                controls
                className="max-h-full max-w-full rounded-2xl object-contain"
              />
            ) : (
              <img
                src={compose.items[compose.index].url}
                alt="preview"
                className="max-h-full max-w-full rounded-2xl object-contain"
              />
            )}
          </div>
          <div className="px-3 pb-2 pt-2 flex items-center gap-2">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="flex-1 h-12 px-4 rounded-full bg-white/10 text-white placeholder-white/60 text-sm focus:outline-none"
            />
            <button
              onClick={handleSendCompose}
              aria-label="Send"
              className="w-12 h-12 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 px-3 pb-4 overflow-x-auto">
            {compose.items.map((it, i) => (
              <div key={i} className="relative shrink-0">
                <button
                  onClick={() => setCompose((c) => ({ ...c, index: i }))}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${i === compose.index ? "border-[#1565C0]" : "border-white/10"}`}
                >
                  {it.isVideo ? (
                    <video
                      src={it.url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={it.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
                <button
                  onClick={() => removeComposeItem(i)}
                  aria-label="Remove"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#0D2137] border border-white/40 text-white flex items-center justify-center"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 6l12 12M6 18L18 6"
                    />
                  </svg>
                </button>
              </div>
            ))}
            <button
              onClick={() => galleryRef.current?.click()}
              aria-label="Add more"
              className="w-16 h-16 rounded-xl border-2 border-dashed border-white/30 text-white/70 flex items-center justify-center shrink-0"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 5v14M5 12h14"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen image viewer */}
      {viewer && (
        <div
          className="fixed inset-0 z-50 bg-[#0D2137]/95 flex items-center justify-center"
          onClick={() => setViewer(null)}
        >
          <button
            aria-label="Close"
            className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center text-white"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6l12 12M6 18L18 6"
              />
            </svg>
          </button>
          <img
            src={viewer}
            alt="full"
            className="max-h-[85%] max-w-[92%] rounded-2xl object-contain"
          />
        </div>
      )}

      {attachOpen && (
        <ShareAttachSheet
          onClose={() => setAttachOpen(false)}
          onPick={(kind) => {
            setAttachOpen(false);
            if (kind === "camera") cameraRef.current?.click();
            else if (kind === "gallery") galleryRef.current?.click();
            else if (kind === "files") filesRef.current?.click();
            else
              showToast(
                `${kind === "idea" ? "Idea" : "Profile"} sharing coming soon.`,
              );
          }}
        />
      )}

      <ChatActionsLayer
        convo={convo}
        view={actionView}
        setView={setActionView}
        navigate={navigate}
        onToast={showToast}
      />

      {/* ── Delete Message? confirmation ── */}
      {/* "Delete for Everyone" only when every selected message is your own. */}
      {deletePrompt &&
        (() => {
          const allOwn =
            selectedMessages().length > 0 &&
            selectedMessages().every((m) => m.fromMe);
          const btn =
            "h-12 rounded-xl border border-[#FECACA] text-[#EF4444] font-semibold hover:bg-[#FEF2F2] active:scale-[0.98] transition-all";
          const cancelBtn =
            "h-12 rounded-xl bg-[#F0F6FF] text-[#90A4AE] font-semibold hover:bg-[#E3F2FD] active:scale-[0.98] transition-all";
          return (
            <div className="fixed inset-0 z-[55] flex items-center justify-center px-6">
              <div
                className="absolute inset-0 bg-[#0D2137]/45"
                onClick={() => setDeletePrompt(false)}
              />
              <div className="relative w-full max-w-[340px] bg-white rounded-3xl shadow-xl p-5">
                <h2 className="text-lg font-bold text-[#0D2137]">
                  Delete Message?
                </h2>
                <p className="text-[12px] text-[#90A4AE] mt-0.5">
                  This will delete the message for:
                </p>
                {allOwn ? (
                  <div className="mt-4 flex flex-col gap-2.5">
                    <button
                      onClick={() => confirmDeleteMessages("me")}
                      className={`w-full ${btn}`}
                    >
                      Delete for Me
                    </button>
                    <button
                      onClick={() => confirmDeleteMessages("everyone")}
                      className={`w-full ${btn}`}
                    >
                      Delete for Everyone
                    </button>
                    <button
                      onClick={() => setDeletePrompt(false)}
                      className={`w-full ${cancelBtn}`}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => confirmDeleteMessages("me")}
                      className={btn}
                    >
                      Delete for Me
                    </button>
                    <button
                      onClick={() => setDeletePrompt(false)}
                      className={cancelBtn}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* ── Media & Docs ── */}
      {mediaOpen && (
        <div className="fixed inset-0 z-50 bg-[#F4F7FF] flex flex-col">
          <header className="shrink-0 bg-white border-b border-[#F0F6FF] px-3 py-3 flex items-center gap-2">
            <button
              onClick={() => setMediaOpen(false)}
              aria-label="Back"
              className="w-9 h-9 flex items-center justify-center rounded-full text-[#546E7A] hover:bg-[#F0F6FF] active:scale-90 transition-all shrink-0"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            {[
              ["media", "Media"],
              ["docs", "Docs"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMediaTab(key)}
                className={`px-4 py-1.5 rounded-full text-[14px] font-semibold transition-colors ${mediaTab === key ? "bg-[#1565C0] text-white" : "text-[#546E7A] hover:bg-[#F0F6FF]"}`}
              >
                {label}
              </button>
            ))}
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            {mediaTab === "media" ? (
              mediaItems.length === 0 ? (
                <p className="text-center text-[13px] text-[#90A4AE] pt-16">
                  No shared media yet.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {mediaItems.map((m) => {
                    const src = m.imageUrl || m.content || "";
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setMediaOpen(false);
                          setViewer(src);
                        }}
                        className="relative aspect-square rounded-2xl overflow-hidden bg-[#E3F2FD] active:scale-[0.98] transition-transform"
                      >
                        {m.isVideo ? (
                          <video
                            src={src}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={src}
                            alt="shared"
                            className="w-full h-full object-cover"
                          />
                        )}
                        {m.time && (
                          <span className="absolute bottom-1.5 left-1.5 text-[11px] text-white drop-shadow">
                            {m.time}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )
            ) : docItems.length === 0 ? (
              <p className="text-center text-[13px] text-[#90A4AE] pt-16">
                No shared documents yet.
              </p>
            ) : (
              <div className="space-y-2.5 max-w-lg mx-auto">
                {docItems.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-[#F0F6FF] px-4 py-3 shadow-sm"
                  >
                    <span className="w-10 h-10 rounded-lg bg-[#EAF2FF] text-[#1565C0] flex items-center justify-center shrink-0">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14 3v5h5M7 3h7l5 5v11a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
                        />
                      </svg>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-semibold text-[#0D2137] truncate">
                        {m.fileName || "File"}
                      </span>
                      {m.time && (
                        <span className="block text-[11px] text-[#90A4AE]">
                          {m.time}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Forward Message panel ── */}
      {forwardOpen &&
        (() => {
          const q = forwardSearch.trim().toLowerCase();
          const list = (forwardContacts || []).filter(
            (c) =>
              !q ||
              c.name.toLowerCase().includes(q) ||
              (c.handle || "").toLowerCase().includes(q),
          );
          const picked = (forwardContacts || []).filter((c) =>
            forwardPicked.includes(c.id),
          );
          const sendLabel =
            forwardPicked.length === 0
              ? "Select contacts"
              : forwardPicked.length === 1
                ? `Send to ${picked[0]?.name ?? ""}`
                : `Send to ${forwardPicked.length} contacts`;
          return (
            <div className="fixed inset-0 z-[55] flex">
              <div className="flex-1" onClick={() => setForwardOpen(false)} />
              <div className="sc-slide-in w-full max-w-[380px] h-full bg-white shadow-2xl flex flex-col">
                {/* Header */}
                <div className="shrink-0 bg-[#1565C0] px-5 py-4 flex items-center justify-between">
                  <h2 className="text-white text-lg font-bold">
                    Forward Message
                  </h2>
                  <button
                    onClick={() => setForwardOpen(false)}
                    aria-label="Close"
                    className="w-8 h-8 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:scale-90 transition-all"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 6l12 12M6 18L18 6"
                      />
                    </svg>
                  </button>
                </div>

                {/* Search */}
                <div className="shrink-0 px-4 pt-4">
                  <div className="flex items-center gap-2 bg-[#F0F6FF] border border-[#E3F2FD] rounded-full px-4 py-2.5">
                    <svg
                      className="w-4 h-4 text-[#90A4AE] shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
                    </svg>
                    <input
                      value={forwardSearch}
                      onChange={(e) => setForwardSearch(e.target.value)}
                      placeholder="Search contacts..."
                      className="flex-1 min-w-0 bg-transparent text-[14px] text-[#0D2137] placeholder-[#90A4AE] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Selected chips */}
                {picked.length > 0 && (
                  <div className="shrink-0 px-4 pt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] text-[#90A4AE]">
                      Forwarding:
                    </span>
                    {picked.map((c) => (
                      <span
                        key={c.id}
                        className="flex items-center gap-1.5 bg-[#E3F2FD] text-[#1565C0] rounded-full pl-1 pr-2 py-0.5 text-[13px] font-semibold"
                      >
                        <Avatar
                          initial={c.initial}
                          color={c.avatarColor}
                          size={20}
                        />
                        {c.name}
                        <button
                          onClick={() => toggleForwardPick(c.id)}
                          aria-label={`Remove ${c.name}`}
                          className="hover:opacity-70"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 6l12 12M6 18L18 6"
                            />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="border-b border-[#F0F6FF] mt-3" />

                {/* Contacts */}
                <div className="flex-1 overflow-y-auto">
                  <p className="px-5 pt-3 pb-1 text-[12px] font-semibold text-[#90A4AE]">
                    Contacts
                  </p>
                  {forwardContacts === null ? (
                    <p className="text-center text-[13px] text-[#90A4AE] py-10">
                      Loading contacts…
                    </p>
                  ) : list.length === 0 ? (
                    <p className="text-center text-[13px] text-[#90A4AE] py-10">
                      No contacts found.
                    </p>
                  ) : (
                    list.map((c) => {
                      const on = forwardPicked.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleForwardPick(c.id)}
                          className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${on ? "bg-[#EAF2FF]" : "hover:bg-[#F8FAFF]"}`}
                        >
                          <Avatar
                            initial={c.initial}
                            color={c.avatarColor}
                            size={42}
                            online={c.online}
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-[15px] font-semibold text-[#0D2137] truncate">
                              {c.name}
                            </span>
                            <span className="block text-[12px] text-[#90A4AE] truncate">
                              {c.handle || ""}
                            </span>
                          </span>
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${on ? "bg-[#1565C0] border-[#1565C0]" : "border-[#BBDEFB]"}`}
                          >
                            {on && (
                              <svg
                                className="w-3.5 h-3.5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Send */}
                <div className="shrink-0 p-4">
                  <button
                    onClick={doForward}
                    disabled={!forwardPicked.length}
                    className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-300/40 text-[15px] flex items-center justify-center gap-2"
                  >
                    {sendLabel}
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── Message-limit upsell modal ── */}
      {showLimitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-[#0D2137]/45"
            onClick={() => setShowLimitModal(false)}
          />
          <div className="relative w-full max-w-[360px] bg-white rounded-3xl shadow-2xl p-6 text-center">
      
            <div className="w-20 h-20 rounded-full bg-[#FEF3C7] border-4 border-[#FDE68A] flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-9 h-9 text-[#D97706]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
            </div>
            <h2 className="text-[20px] font-bold text-[#0D2137]">
              Message Limit Reached
            </h2>
            <p className="text-[13px] text-[#90A4AE] mt-1 leading-snug">
              You've used all your free messages.
              <br />
              Upgrade to Premium to keep chatting.
            </p>
            <div className="mt-4 h-2 rounded-full bg-[#FEE2E2] overflow-hidden">
              <div className="h-full bg-[#EF4444]" style={{ width: "100%" }} />
            </div>
            <p className="text-[12px] font-bold text-[#EF4444] mt-1.5 text-left">
              {Math.min(textUsed, TEXT_MSG_LIMIT)} / {TEXT_MSG_LIMIT} messages
              used
            </p>
            <button
              onClick={goPremium}
              className="mt-4 w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Upgrade to Premium
            </button>
           
            <button
              onClick={() => setShowLimitModal(false)}
              className="mt-3 text-[13px] font-semibold text-[#90A4AE] hover:text-[#546E7A]"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] bg-[#0D2137] text-white text-sm px-4 py-2.5 rounded-full shadow-lg max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
