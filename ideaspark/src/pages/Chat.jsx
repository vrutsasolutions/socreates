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
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/messaging/Avatar';
import { ChatActionsLayer, ShareAttachSheet } from '../components/messaging/ChatActions';
import {
  fetchConversation,
  fetchMessages,
  sendMessage,
  uploadVoice,
} from '../api/messagingApi';

// ── Helpers ───────────────────────────────────────────────────────────────────

const quotedLabel = (m) => {
  if (!m) return '';
  if (m.type === 'image') return 'Photo';
  if (m.type === 'voice') return 'Voice message';
  return m.text || '';
};

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const QUICK_REACTIONS = [
  { label: 'Like',   emoji: '👍' },
  { label: 'Fire',   emoji: '🔥' },
  { label: 'Heart',  emoji: '❤️' },
  { label: 'Clap',   emoji: '👏' },
  { label: 'Launch', emoji: '🚀' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Waveform({ color = '#1565C0', animated = false }) {
  const heights = [8, 16, 10, 22, 14, 26, 12, 18, 9, 20, 13, 24, 11, 17];
  return (
    <div className="flex items-center gap-[3px] h-7">
      {heights.map((h, i) => (
        <span
          key={i}
          className={animated ? 'sc-wave-bar' : ''}
          style={{ width: 3, height: h, borderRadius: 3, background: color, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

// Dense full-width waveform that fills the composer while recording
function FullWaveform({ color = '#1565C0', faded = '#BBDEFB' }) {
  const bars = Array.from({ length: 46 }, (_, i) => 4 + Math.round(Math.abs(Math.sin(i * 1.7)) * 18));
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
    <div className={`mb-1 pl-2 border-l-2 ${light ? 'border-white/70' : 'border-[#1565C0]'}`}>
      <p className={`text-[11px] font-semibold ${light ? 'text-white' : 'text-[#1565C0]'}`}>{replyTo.name}</p>
      <p className={`text-[11px] truncate max-w-[200px] ${light ? 'text-white/80' : 'text-[#90A4AE]'}`}>{replyTo.text}</p>
    </div>
  );
}

function ReplyBtn({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Reply"
      className="self-center shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[#90A4AE] opacity-60 hover:opacity-100 hover:bg-[#EAF2FF] transition">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5M4 9h11a5 5 0 015 5v3" />
      </svg>
    </button>
  );
}

function Bubble({ m, onImageClick, onReply }) {
  // Typing indicator
  if (m.type === 'typing') {
    return (
      <div className="flex justify-start">
        <div className="bg-white rounded-[19px] px-4 py-3 flex items-center gap-1.5 shadow-sm">
          {['#BBDEFB', '#1565C0', '#BBDEFB'].map((c, i) => (
            <span key={i} className="sc-typing-dot w-2.5 h-2.5 rounded-full"
              style={{ background: c, animationDelay: `${i * 160}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  const mine = m.fromMe;
  const rowCls = `flex items-end gap-1.5 group ${mine ? 'justify-end' : 'justify-start'}`;

  let content;

  if (m.type === 'image') {
    // imageUrl set by normalizeMessage() from backend content field
    const src = m.imageUrl || m.content || '';
    const media = m.isVideo
      ? <video src={src} controls className="w-[200px] h-[130px] object-cover rounded-2xl bg-black" />
      : <img src={src} alt="shared" className="w-[200px] h-[130px] object-cover rounded-2xl" />;
    content = (
      <div className="block">
        {m.replyTo && <QuotedInBubble replyTo={m.replyTo} light={false} />}
        {m.isVideo ? media : <button onClick={() => onImageClick(src)} className="block">{media}</button>}
        {m.text && <p className="mt-1 max-w-[200px] text-[12px] text-[#0D2137]">{m.text}</p>}
      </div>
    );

  } else if (m.type === 'file') {
    content = (
      <div className={`flex items-center gap-3 rounded-[18px] px-4 py-3 max-w-[240px] ${mine ? 'bg-[#1565C0] text-white' : 'bg-white text-[#0D2137] shadow-sm'}`}>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${mine ? 'bg-white/20' : 'bg-[#EAF2FF] text-[#1565C0]'}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M7 3h7l5 5v11a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
          </svg>
        </span>
        <span className="text-[13px] truncate">{m.fileName}</span>
      </div>
    );

  } else if (m.type === 'voice') {
    // content holds the R2 URL (set by normalizeMessage or by optimistic push)
    const audioSrc = m.content || '';
    const hasAudio = audioSrc.startsWith('http') || audioSrc.startsWith('blob:');
    content = (
      <div className={`flex flex-col gap-2 rounded-[18px] px-4 py-3 max-w-[260px] ${mine ? 'bg-[#1565C0]' : 'bg-white shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${mine ? 'bg-white/20 text-white' : 'bg-[#1565C0] text-white'}`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
          <Waveform color={mine ? '#FFFFFF' : '#1565C0'} />
          {m.duration && (
            <span className={`text-[12px] shrink-0 ${mine ? 'text-white' : 'text-[#90A4AE]'}`}>{m.duration}</span>
          )}
        </div>
        {hasAudio && (
          <audio
            src={audioSrc}
            controls
            className="w-full h-8"
            style={{ filter: mine ? 'invert(1) hue-rotate(180deg)' : 'none', opacity: 0.85 }}
          />
        )}
      </div>
    );

  } else {
    // TEXT (default)
    const displayText = m.text ?? m.content ?? '';
    content = (
      <div className={`max-w-[240px] px-4 py-2.5 text-[13px] leading-snug ${
        mine
          ? 'bg-[#1565C0] text-white font-semibold rounded-[18px] rounded-br-md'
          : 'bg-white text-[#0D2137] rounded-[18px] rounded-bl-md shadow-sm'
      }`}>
        {m.replyTo && <QuotedInBubble replyTo={m.replyTo} light={mine} />}
        {displayText}
      </div>
    );
  }

  return (
    <div className={rowCls}>
      {mine && <ReplyBtn onClick={() => onReply(m)} />}
      {content}
      {!mine && <ReplyBtn onClick={() => onReply(m)} />}
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
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.5A9 9 0 1121 12z" />
          </svg>
        </span>
      </div>
      <h3 className="text-[17px] font-bold text-[#0D2137]">No messages yet</h3>
      <p className="text-[13px] text-[#90A4AE] mt-1">Start the conversation!</p>
      <button onClick={onSayHello}
        className="mt-5 px-7 py-3 rounded-full bg-[#1565C0] text-white text-[14px] font-bold shadow-md hover:opacity-90 active:scale-95 transition-all">
        Say Hello 👋
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Chat() {
  const navigate = useNavigate();
  const { id } = useParams();

  const cameraRef  = useRef(null);
  const galleryRef = useRef(null);
  const filesRef   = useRef(null);
  const scrollRef  = useRef(null);

  // Voice recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const timerRef         = useRef(null);

  const [convo,        setConvo]        = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [text,         setText]         = useState('');

  // null | 'recording' | 'uploading'
  const [recordingState, setRecordingState] = useState(null);
  const [seconds,      setSeconds]      = useState(0);
  const [micError,     setMicError]     = useState(null);

  const [compose,      setCompose]      = useState(null);
  const [caption,      setCaption]      = useState('');
  const [viewer,       setViewer]       = useState(null);
  const [actionView,   setActionView]   = useState(null);
  const [toast,        setToast]        = useState(null);
  const [replyTo,      setReplyTo]      = useState(null);
  const [attachOpen,   setAttachOpen]   = useState(false);
  const [loading,      setLoading]      = useState(true);

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
      } catch (err) {
        console.error('Chat load error:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // ── Clean up mic on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopTimer();
      try {
        mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      } catch (_) {}
    };
  }, []);

  // ── Timer helpers ───────────────────────────────────────────────────────
  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  // ── Toast helper ────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // ── Optimistic message push ─────────────────────────────────────────────
  const pushSent = async (payload) => {
    const optimistic = {
      id: 'tmp-' + Date.now(),
      conversationId: id,
      fromMe: true,
      time: '',
      ...payload,
    };
    setMessages((prev) => [...prev.filter((m) => m.type !== 'typing'), optimistic]);
    try {
      await sendMessage(id, payload);
    } catch (err) {
      console.error('sendMessage failed:', err);
    }
  };

  const replySnippet = () =>
    replyTo
      ? { name: replyTo.fromMe ? 'You' : (convo?.name ?? ''), text: quotedLabel(replyTo) }
      : undefined;

  const handleSayHello = () => {
    pushSent({ type: 'text', text: 'Hello 👋' });
  };

  // ── Text send ───────────────────────────────────────────────────────────
  const handleSendText = () => {
    const value = text.trim();
    if (!value) return;
    pushSent({ type: 'text', text: value, replyTo: replySnippet() });
    setText('');
    setReplyTo(null);
  };

  const sendQuickReaction = (q) => {
    pushSent({ type: 'text', text: q.emoji, replyTo: replySnippet() });
    setReplyTo(null);
  };

  // ── Media / file ────────────────────────────────────────────────────────
  const handleMedia = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const items = files.map((f) => ({
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith('video'),
      name: f.name,
    }));
    if (!compose) setCaption('');
    setCompose((prev) => prev ? { ...prev, items: [...prev.items, ...items] } : { items, index: 0 });
  };

  const removeComposeItem = (i) => {
    setCompose((prev) => {
      if (!prev) return prev;
      try { URL.revokeObjectURL(prev.items[i]?.url); } catch (_) {}
      const items = prev.items.filter((_, idx) => idx !== i);
      if (items.length === 0) return null;
      return { items, index: Math.min(prev.index, items.length - 1) };
    });
  };

  const handleSendCompose = () => {
    if (!compose) return;
    compose.items.forEach((it, i) => {
      pushSent({
        type: 'image',
        imageUrl: it.url,
        content: it.url,
        isVideo: it.isVideo,
        text: i === 0 ? (caption.trim() || undefined) : undefined,
        replyTo: i === 0 ? replySnippet() : undefined,
      });
    });
    setCompose(null); setCaption(''); setReplyTo(null);
  };

  const handleDocs = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    files.forEach((f) => pushSent({ type: 'file', fileName: f.name }));
  };

  // ════════════════════════════════════════════════════════════════════════
  //  VOICE RECORDING — real MediaRecorder
  // ════════════════════════════════════════════════════════════════════════

  const startRecording = async () => {
    setMicError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Microphone not supported on this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
        .find((t) => MediaRecorder.isTypeSupported(t)) || '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setSeconds(0);
      setRecordingState('recording');
      startTimer();
    } catch (err) {
      setMicError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Allow access and try again.'
          : 'Could not start recording. Please try again.',
      );
    }
  };

  const cancelRecording = () => {
    stopTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try { recorder.stop(); } catch (_) {}
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
    setRecordingState('uploading');

    recorder.onstop = async () => {
      recorder.stream?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;

      const mimeType = recorder.mimeType || 'audio/webm';
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];

      try {
        const url = await uploadVoice(blob, mimeType);
        pushSent({
          type: 'voice',
          content: url,
          duration: durationLabel,
          replyTo: replySnippet(),
        });
        setReplyTo(null);
      } catch (_) {
        showToast('Voice upload failed. Please try again.');
      } finally {
        setRecordingState(null);
        setSeconds(0);
      }
    };

    try { recorder.stop(); } catch (_) {
      setRecordingState(null);
      setSeconds(0);
    }
  };

  const isRecording = recordingState === 'recording';
  const isUploading = recordingState === 'uploading';

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
      `}</style>

      {/* ── HEADER ── */}
      <header className="shrink-0 bg-[#1565C0] px-4 pt-4 pb-4 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button onClick={() => navigate(-1)} aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Identity pill — shows real name + avatar once convo loads */}
          <button onClick={() => navigate(`/messages/${id}/profile`)} aria-label="View profile"
            className="flex-1 min-w-0 flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2 text-left hover:bg-white/15 active:scale-[0.98] transition-all">
            {loading ? (
              // Skeleton while loading
              <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse shrink-0" />
            ) : (
              <Avatar
                initial={convo?.initial ?? '?'}
                color={convo?.avatarColor ?? '#1565C0'}
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
                    {convo?.name ?? 'Chat'}
                  </p>
                  <p className={`text-[12px] font-medium leading-tight ${convo?.online ? 'text-[#A5D6A7]' : 'text-blue-200'}`}>
                    {convo?.online ? '● Online' : 'Offline'}
                  </p>
                </>
              )}
            </div>
          </button>

          <div className="flex items-center gap-1 text-white relative z-10">
            <button onClick={() => navigate(`/messages/${id}/profile`)} aria-label="Chat info"
              className="w-9 h-9 flex items-center justify-center hover:opacity-80 active:scale-90 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v5M12 8h.01" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Messages ── */}
      {loading ? (
        <MessagesSkeleton />
      ) : messages.length === 0 ? (
        <EmptyState onSayHello={handleSayHello} />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="flex justify-center">
            <span className="px-3 py-1 rounded-[13px] bg-[#DBEAFE] text-[12px] text-[#1565C0] font-medium">Today</span>
          </div>
          {messages.map((m) => (
            <Bubble key={m.id} m={m} onImageClick={(url) => setViewer(url)} onReply={(msg) => setReplyTo(msg)} />
          ))}
        </div>
      )}

      {/* ── Mic permission error banner ── */}
      {micError && (
        <div className="shrink-0 bg-[#FEE2E2] border-t border-[#FECACA] px-4 py-2.5 flex items-center gap-3">
          <svg className="w-4 h-4 text-[#EF4444] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="flex-1 text-[12px] text-[#EF4444]">{micError}</p>
          <button onClick={() => setMicError(null)} className="text-[#EF4444] text-[11px] font-semibold">Dismiss</button>
        </div>
      )}

      {/* ── Composer ── */}
      {(isRecording || isUploading) ? (
        /* ── RECORDING / UPLOADING BAR ─────────────────────────────────── */
        <div className="shrink-0 bg-white border-t border-[#DBEAFE] px-4 py-3 flex items-center gap-3">
          <button onClick={cancelRecording} disabled={isUploading} aria-label="Cancel recording"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95
              ${isUploading ? 'bg-[#F0F6FF] text-[#90A4AE] cursor-not-allowed' : 'bg-[#FEE2E2] text-[#EF4444]'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>

          <div className="flex-1 flex items-center gap-3 bg-[#F4F7FF] rounded-[20px] px-4 py-2">
            {isUploading ? (
              <>
                <svg className="w-4 h-4 text-[#1565C0] animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-[13px] font-semibold text-[#1565C0]">Sending voice note…</span>
              </>
            ) : (
              <>
                <span className="sc-rec-dot w-3 h-3 rounded-full bg-[#EF4444] shrink-0" />
                <FullWaveform color="#1565C0" faded="#BBDEFB" />
                <span className="text-[13px] font-semibold text-[#0D2137] tabular-nums shrink-0">{fmt(seconds)}</span>
              </>
            )}
          </div>

          <button onClick={sendRecording} disabled={isUploading} aria-label="Send voice"
            className={`w-10 h-10 rounded-full text-white flex items-center justify-center transition-all active:scale-95
              ${isUploading ? 'bg-[#90A4AE] cursor-not-allowed' : 'bg-[#1565C0]'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
          </button>
        </div>
      ) : (
        /* ── NORMAL COMPOSER ────────────────────────────────────────────── */
        <div className="shrink-0 bg-white border-t border-[#DBEAFE] px-3 pt-2 pb-2.5">

          {replyTo && (
            <>
              <div className="flex items-center gap-3 bg-[#EAF2FF] border-l-4 border-[#1565C0] rounded-r-xl px-3 py-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#1565C0]">
                    Replying to {replyTo.fromMe ? 'yourself' : (convo?.name ?? '')}
                  </p>
                  <p className="text-[13px] text-[#90A4AE] truncate">{quotedLabel(replyTo)}</p>
                </div>
                <button onClick={() => setReplyTo(null)} aria-label="Cancel reply"
                  className="w-7 h-7 rounded-full bg-[#DBEAFE] text-[#546E7A] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 mb-1">
                {QUICK_REACTIONS.map((q) => (
                  <button key={q.label} onClick={() => sendQuickReaction(q)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#F0F6FF] text-[#1565C0] border border-[#BBDEFB] text-[13px] font-semibold hover:bg-[#DBEAFE] hover:border-[#1565C0] active:scale-95 transition-all">
                    <span>{q.emoji}</span><span>{q.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <button onClick={() => setAttachOpen(true)} aria-label="Attach"
              className="w-10 h-10 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0 hover:opacity-90 active:scale-95 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button aria-label="Emoji"
              className="w-10 h-10 rounded-full bg-[#F0F6FF] border border-[#BBDEFB] text-[#1565C0] flex items-center justify-center shrink-0 hover:bg-[#DBEAFE] active:scale-95 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M9 10h.01M15 10h.01M8.5 14.5a4 4 0 007 0" />
              </svg>
            </button>
            <div className="flex-1 flex items-center gap-2 bg-[#F0F6FF] border border-[#BBDEFB] rounded-full px-4 py-2.5">
              <input value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendText(); }}
                placeholder="Message..."
                className="flex-1 bg-transparent text-[14px] text-[#0D2137] placeholder-[#90A4AE] focus:outline-none" />
              <button onClick={startRecording} aria-label="Record voice message"
                className="text-[#1565C0] shrink-0 hover:opacity-70 active:scale-90 transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 11a7 7 0 0014 0M12 18v3M8.5 21h7" />
                </svg>
              </button>
            </div>
            <button onClick={handleSendText} aria-label="Send"
              className="w-10 h-10 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0 hover:opacity-90 active:scale-95 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
            </button>
          </div>

          <input ref={cameraRef}  type="file" accept="image/*,video/*" capture="environment" hidden onChange={handleMedia} />
          <input ref={galleryRef} type="file" accept="image/*,video/*" multiple          hidden onChange={handleMedia} />
          <input ref={filesRef}   type="file" multiple                                   hidden onChange={handleDocs}  />
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
              <button onClick={() => { setCompose(null); setCaption(''); }} aria-label="Back"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="flex-1 text-center text-white font-bold text-lg">Send Photo</span>
              <span className="w-9" />
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center px-4 min-h-0">
            {compose.items[compose.index].isVideo
              ? <video src={compose.items[compose.index].url} controls className="max-h-full max-w-full rounded-2xl object-contain" />
              : <img src={compose.items[compose.index].url} alt="preview" className="max-h-full max-w-full rounded-2xl object-contain" />}
          </div>
          <div className="px-3 pb-2 pt-2 flex items-center gap-2">
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption..."
              className="flex-1 h-12 px-4 rounded-full bg-white/10 text-white placeholder-white/60 text-sm focus:outline-none" />
            <button onClick={handleSendCompose} aria-label="Send"
              className="w-12 h-12 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
            </button>
          </div>
          <div className="flex gap-2 px-3 pb-4 overflow-x-auto">
            {compose.items.map((it, i) => (
              <div key={i} className="relative shrink-0">
                <button onClick={() => setCompose((c) => ({ ...c, index: i }))}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${i === compose.index ? 'border-[#1565C0]' : 'border-white/10'}`}>
                  {it.isVideo ? <video src={it.url} className="w-full h-full object-cover" /> : <img src={it.url} alt="" className="w-full h-full object-cover" />}
                </button>
                <button onClick={() => removeComposeItem(i)} aria-label="Remove"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#0D2137] border border-white/40 text-white flex items-center justify-center">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </button>
              </div>
            ))}
            <button onClick={() => galleryRef.current?.click()} aria-label="Add more"
              className="w-16 h-16 rounded-xl border-2 border-dashed border-white/30 text-white/70 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen image viewer */}
      {viewer && (
        <div className="fixed inset-0 z-50 bg-[#0D2137]/95 flex items-center justify-center" onClick={() => setViewer(null)}>
          <button aria-label="Close" className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
          <img src={viewer} alt="full" className="max-h-[85%] max-w-[92%] rounded-2xl object-contain" />
        </div>
      )}

      {attachOpen && (
        <ShareAttachSheet
          onClose={() => setAttachOpen(false)}
          onPick={(kind) => {
            setAttachOpen(false);
            if (kind === 'camera')       cameraRef.current?.click();
            else if (kind === 'gallery') galleryRef.current?.click();
            else if (kind === 'files')   filesRef.current?.click();
            else showToast(`${kind === 'idea' ? 'Idea' : 'Profile'} sharing coming soon.`);
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

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] bg-[#0D2137] text-white text-sm px-4 py-2.5 rounded-full shadow-lg max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
