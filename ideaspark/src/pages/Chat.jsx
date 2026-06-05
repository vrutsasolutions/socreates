// ════════════════════════════════════════════════════════════════════════
//  Chat  (figma "02 · Chat")
//  Includes the two compose states:
//    • Voice Recording  → figma "02 · Voice Recording"
//    • Image Preview    → figma "05 · Image Preview" (dark compose screen)
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/messaging/Avatar';
import { ChatActionsLayer, ShareAttachSheet } from '../components/messaging/ChatActions';
import {
  fetchConversation,
  fetchMessages,
  sendMessage,
} from '../api/messagingApi';

/* Short label used when a message is quoted in a reply. */
const quotedLabel = (m) => {
  if (!m) return '';
  if (m.type === 'image') return 'Photo';
  if (m.type === 'voice') return 'Voice message';
  return m.text || '';
};

/* Quick reaction chips shown in the reply (updated input) state. */
const QUICK_REACTIONS = [
  { label: 'Like', emoji: '👍' },
  { label: 'Fire', emoji: '🔥' },
  { label: 'Heart', emoji: '❤️' },
  { label: 'Clap', emoji: '👏' },
  { label: 'Launch', emoji: '🚀' },
];

/* ── Waveform bars (decorative) ─────────────────────────────────────────── */
function Waveform({ color = '#1565C0', animated = false }) {
  const heights = [8, 16, 10, 22, 14, 26, 12, 18, 9, 20, 13, 24, 11, 17];
  return (
    <div className="flex items-center gap-[3px] h-7">
      {heights.map((h, i) => (
        <span
          key={i}
          className={animated ? 'sc-wave-bar' : ''}
          style={{
            width: 3, height: h, borderRadius: 3, background: color,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* Quoted snippet rendered inside a bubble when the message is a reply. */
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

/* ── A single message bubble ────────────────────────────────────────────── */
function Bubble({ m, onImageClick, onReply }) {
  if (m.type === 'typing') {
    return (
      <div className="flex justify-start">
        <div className="bg-white rounded-[19px] px-4 py-3 flex items-center gap-1.5 shadow-sm">
          {['#BBDEFB', '#1565C0', '#BBDEFB'].map((c, i) => (
            <span key={i} className="sc-typing-dot w-2.5 h-2.5 rounded-full" style={{ background: c, animationDelay: `${i * 160}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  const mine = m.fromMe;
  const rowCls = `flex items-end gap-1.5 group ${mine ? 'justify-end' : 'justify-start'}`;

  let content;
  if (m.type === 'image') {
    const media = m.isVideo
      ? <video src={m.imageUrl} controls className="w-[200px] h-[130px] object-cover rounded-2xl bg-black" />
      : <img src={m.imageUrl} alt="shared" className="w-[200px] h-[130px] object-cover rounded-2xl" />;
    content = (
      <div className="block">
        {m.replyTo && <QuotedInBubble replyTo={m.replyTo} light={false} />}
        {m.isVideo ? media : <button onClick={() => onImageClick(m.imageUrl)} className="block">{media}</button>}
        {m.text && <p className="mt-1 max-w-[200px] text-[12px] text-[#0D2137]">{m.text}</p>}
      </div>
    );
  } else if (m.type === 'file') {
    content = (
      <div className={`flex items-center gap-3 rounded-[18px] px-4 py-3 max-w-[240px] ${mine ? 'bg-[#1565C0] text-white' : 'bg-white text-[#0D2137] shadow-sm'}`}>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${mine ? 'bg-white/20' : 'bg-[#EAF2FF] text-[#1565C0]'}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M7 3h7l5 5v11a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" /></svg>
        </span>
        <span className="text-[13px] truncate">{m.fileName}</span>
      </div>
    );
  } else if (m.type === 'voice') {
    content = (
      <div className={`flex items-center gap-3 rounded-[18px] px-4 py-3 max-w-[240px] ${mine ? 'bg-[#1565C0]' : 'bg-white shadow-sm'}`}>
        <span className={`w-8 h-8 rounded-full flex items-center justify-center ${mine ? 'bg-white/20 text-white' : 'bg-[#1565C0] text-white'}`}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </span>
        <Waveform color={mine ? '#FFFFFF' : '#1565C0'} />
        <span className={`text-[12px] ${mine ? 'text-white' : 'text-[#90A4AE]'}`}>{m.duration}</span>
      </div>
    );
  } else {
    content = (
      <div
        className={`max-w-[240px] px-4 py-2.5 text-[13px] leading-snug ${
          mine
            ? 'bg-[#1565C0] text-white font-semibold rounded-[18px] rounded-br-md'
            : 'bg-white text-[#0D2137] rounded-[18px] rounded-bl-md shadow-sm'
        }`}
      >
        {m.replyTo && <QuotedInBubble replyTo={m.replyTo} light={mine} />}
        {m.text}
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

export default function Chat() {
  const navigate = useNavigate();
  const { id } = useParams();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const filesRef = useRef(null);
  const scrollRef = useRef(null);

  const [convo, setConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  // compose states
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [compose, setCompose] = useState(null);     // { items:[{url,isVideo,name}], index } being composed
  const [caption, setCaption] = useState('');
  const [viewer, setViewer] = useState(null);        // fullscreen viewer of a sent image
  const [actionView, setActionView] = useState(null); // null|'menu'|'report'|'block'|'delete'
  const [toast, setToast] = useState(null);
  const [replyTo, setReplyTo] = useState(null);      // message being replied to
  const [attachOpen, setAttachOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: c }, { data: msgs }] = await Promise.all([
        fetchConversation(id),
        fetchMessages(id),
      ]);
      if (!alive) return;
      setConvo(c);
      setMessages(msgs);
    })();
    return () => { alive = false; };
  }, [id]);

  // autoscroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // recording timer
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const pushSent = async (payload) => {
    const optimistic = { id: 'tmp-' + Date.now(), conversationId: id, fromMe: true, time: '', ...payload };
    setMessages((prev) => [...prev.filter((m) => m.type !== 'typing'), optimistic]);
    try { await sendMessage(id, payload); } catch (_) { /* keep optimistic in mock mode */ }
  };

  // Build the quoted-reply snippet for an outgoing message, if replying.
  const replySnippet = () =>
    replyTo
      ? { name: replyTo.fromMe ? 'You' : (convo?.name ?? ''), text: quotedLabel(replyTo) }
      : undefined;

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

  // Camera + Photos & Videos → multi-select media, opens the Send Photo preview.
  // If the preview is already open (the "add more" tile), append to it.
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
    setCompose((prev) => (prev ? { ...prev, items: [...prev.items, ...items] } : { items, index: 0 }));
  };

  // Remove one item from the preview; closes the preview if none remain.
  const removeComposeItem = (i) => {
    setCompose((prev) => {
      if (!prev) return prev;
      try { URL.revokeObjectURL(prev.items[i]?.url); } catch (_) { /* noop */ }
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
        isVideo: it.isVideo,
        text: i === 0 ? (caption.trim() || undefined) : undefined,
        replyTo: i === 0 ? replySnippet() : undefined,
      });
    });
    setCompose(null);
    setCaption('');
    setReplyTo(null);
  };

  // Files → send each as a generic file message (no image preview).
  const handleDocs = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    files.forEach((f) => pushSent({ type: 'file', fileName: f.name }));
  };

  const startRecording = () => { setSeconds(0); setRecording(true); };
  const cancelRecording = () => { setRecording(false); setSeconds(0); };
  const sendRecording = () => {
    pushSent({ type: 'voice', duration: fmt(seconds || 1) });
    setRecording(false);
    setSeconds(0);
  };

  return (
    <div className="h-screen flex flex-col bg-[#F4F7FF]">
      <style>{`
        @keyframes scWave { 0%,100%{ transform: scaleY(0.5);} 50%{ transform: scaleY(1);} }
        .sc-wave-bar { animation: scWave 900ms ease-in-out infinite; transform-origin: center; }
        @keyframes scTyping { 0%,60%,100%{ transform: translateY(0); opacity:.5;} 30%{ transform: translateY(-4px); opacity:1;} }
        .sc-typing-dot { animation: scTyping 1.2s ease-in-out infinite; }
        @keyframes scPulse { 0%,100%{ opacity:1;} 50%{ opacity:.35;} }
        .sc-rec-dot { animation: scPulse 1s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <header className="shrink-0 bg-white px-3 py-2.5 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} aria-label="Back" className="w-9 h-9 flex items-center justify-center text-[#1565C0]">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {convo && <Avatar initial={convo.initial} color={convo.avatarColor} size={40} online={convo.online} />}
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-[#0D2137] truncate">{convo?.name ?? 'Chat'}</p>
          <p className="text-[12px] text-[#2ECC70]">{convo?.online ? 'Online' : 'Offline'}</p>
        </div>
        {/* call / video / more */}
        <div className="flex items-center gap-1 text-[#1565C0]">
          <button aria-label="Call" className="w-9 h-9 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1 3a1 1 0 01-.27 1.05L7.6 9.79a14 14 0 006.6 6.6l1.06-1.36a1 1 0 011.05-.27l3 1a1 1 0 01.68.95V19a2 2 0 01-2 2A16 16 0 013 5z" /></svg>
          </button>
          <button aria-label="Video" className="w-9 h-9 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" /></svg>
          </button>
          <button aria-label="More" onClick={() => setActionView('menu')} className="w-9 h-9 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="flex justify-center">
          <span className="px-3 py-1 rounded-[13px] bg-[#DBEAFE] text-[12px] text-[#1565C0]">Today</span>
        </div>
        {messages.map((m) => (
          <Bubble key={m.id} m={m} onImageClick={(url) => setViewer(url)} onReply={(msg) => setReplyTo(msg)} />
        ))}
      </div>

      {/* ── Composer ─────────────────────────────────────────────────────── */}
      {recording ? (
        /* Voice Recording state (figma 02 · Voice Recording) */
        <div className="shrink-0 bg-white border-t border-[#DBEAFE] px-4 py-3 flex items-center gap-3">
          <button onClick={cancelRecording} aria-label="Cancel" className="w-10 h-10 rounded-full bg-[#F4F7FF] flex items-center justify-center text-[#EF4444]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" /></svg>
          </button>
          <div className="flex-1 flex items-center gap-3 bg-[#F4F7FF] rounded-[20px] px-4 py-2">
            <span className="sc-rec-dot w-3 h-3 rounded-full bg-[#EF4444]" />
            <span className="text-[13px] font-semibold text-[#0D2137] tabular-nums">{fmt(seconds)}</span>
            <Waveform color="#1565C0" animated />
          </div>
          <button onClick={sendRecording} aria-label="Send voice" className="w-10 h-10 rounded-full bg-[#1565C0] text-white flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
          </button>
        </div>
      ) : (
        <div className="shrink-0 bg-white border-t border-[#DBEAFE] px-3 pt-2 pb-2.5">
          {/* Reply state — figma "12 · Chat - Updated Input" */}
          {replyTo && (
            <>
              <div className="flex items-center gap-3 bg-[#EAF2FF] border-l-4 border-[#1565C0] rounded-r-lg px-3 py-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#1565C0]">
                    Replying to {replyTo.fromMe ? 'yourself' : (convo?.name ?? '')}
                  </p>
                  <p className="text-[13px] text-[#90A4AE] truncate">{quotedLabel(replyTo)}</p>
                </div>
                <button onClick={() => setReplyTo(null)} aria-label="Cancel reply"
                        className="w-7 h-7 rounded-full bg-[#DBEAFE] text-[#546E7A] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" /></svg>
                </button>
              </div>
              {/* Quick reactions */}
              <div className="flex gap-2 overflow-x-auto mb-2">
                {QUICK_REACTIONS.map((q) => (
                  <button key={q.label} onClick={() => sendQuickReaction(q)}
                          className="shrink-0 px-4 py-1.5 rounded-full bg-[#F0F6FF] text-[#546E7A] text-sm font-medium hover:bg-[#E3F2FD] transition-colors">
                    {q.label}
                  </button>
                ))}
              </div>
              {/* Controls legend */}
              <p className="text-[12px] text-[#90A4AE] mb-2">[+] Attach&nbsp;&nbsp; [:] Emoji&nbsp;&nbsp; [mic] Voice&nbsp;&nbsp; [&gt;] Send</p>
            </>
          )}

          <div className="flex items-center gap-2">
            <button onClick={() => setAttachOpen(true)} aria-label="Attach"
                    className="w-10 h-10 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0 text-2xl leading-none pb-0.5">+</button>
            <button aria-label="Emoji"
                    className="w-10 h-10 rounded-full bg-[#F0F6FF] text-[#1565C0] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M9 10h.01M15 10h.01M8.5 14.5a4 4 0 007 0" /></svg>
            </button>
            <div className="flex-1 flex items-center gap-2 bg-[#F0F6FF] rounded-full px-4 py-2.5">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendText(); }}
                placeholder="Message..."
                className="flex-1 bg-transparent text-[14px] text-[#0D2137] placeholder-[#90A4AE] focus:outline-none"
              />
              <button onClick={startRecording} aria-label="Record voice" className="text-[#1565C0] shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 11a7 7 0 0014 0M12 18v3M8.5 21h7" /></svg>
              </button>
            </div>
            <button onClick={handleSendText} aria-label="Send"
                    className="w-10 h-10 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
            </button>
          </div>
          {/* Camera: capture opens the device camera on mobile. */}
          <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" hidden onChange={handleMedia} />
          {/* Photos & Videos: multi-select from the gallery. */}
          <input ref={galleryRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleMedia} />
          {/* Files: any type, multi-select. */}
          <input ref={filesRef} type="file" multiple hidden onChange={handleDocs} />
        </div>
      )}

      {/* ── Send Photo compose (figma "05 · Image Preview") ──────────────── */}
      {compose && (
        <div className="fixed inset-0 z-50 bg-[#0D2137] flex flex-col">
          {/* Header */}
          <div className="flex items-center px-4 py-3">
            <button onClick={() => { setCompose(null); setCaption(''); }} aria-label="Back" className="w-9 h-9 flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="flex-1 text-center text-white font-bold text-lg">Send Photo</span>
            <button className="w-9 text-right text-[#4F9DF0] text-sm font-medium">Edit</button>
          </div>

          {/* Active media */}
          <div className="flex-1 flex items-center justify-center px-4 min-h-0">
            {compose.items[compose.index].isVideo ? (
              <video src={compose.items[compose.index].url} controls className="max-h-full max-w-full rounded-2xl object-contain" />
            ) : (
              <img src={compose.items[compose.index].url} alt="preview" className="max-h-full max-w-full rounded-2xl object-contain" />
            )}
          </div>
          <p className="text-center text-[12px] text-white/50 py-2">Pinch to zoom</p>

          {/* Caption + send */}
          <div className="px-3 pb-2 flex items-center gap-2">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="flex-1 h-12 px-4 rounded-full bg-white/10 text-white placeholder-white/60 text-sm focus:outline-none"
            />
            <button onClick={handleSendCompose} aria-label="Send" className="w-12 h-12 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
            </button>
          </div>

          {/* Thumbnail filmstrip (multi-select) with remove + add-more */}
          <div className="flex gap-2 px-3 pb-4 overflow-x-auto">
            {compose.items.map((it, i) => (
              <div key={i} className="relative shrink-0">
                <button onClick={() => setCompose((c) => ({ ...c, index: i }))}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${i === compose.index ? 'border-[#1565C0]' : 'border-white/10'}`}>
                  {it.isVideo
                    ? <video src={it.url} className="w-full h-full object-cover" />
                    : <img src={it.url} alt="" className="w-full h-full object-cover" />}
                </button>
                <button onClick={() => removeComposeItem(i)} aria-label="Remove"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#0D2137] border border-white/40 text-white flex items-center justify-center">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" /></svg>
                </button>
              </div>
            ))}
            {/* Add more */}
            <button onClick={() => galleryRef.current?.click()} aria-label="Add more"
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-white/30 text-white/70 flex items-center justify-center shrink-0 hover:border-white/60 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen viewer for already-sent images */}
      {viewer && (
        <div className="fixed inset-0 z-50 bg-[#0D2137]/95 flex items-center justify-center" onClick={() => setViewer(null)}>
          <button aria-label="Close" className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" /></svg>
          </button>
          <img src={viewer} alt="full" className="max-h-[85%] max-w-[92%] rounded-2xl object-contain" />
        </div>
      )}

      {/* Share & Attach sheet (figma chat attachment menu) */}
      {attachOpen && (
        <ShareAttachSheet
          onClose={() => setAttachOpen(false)}
          onPick={(kind) => {
            setAttachOpen(false);
            if (kind === 'camera') cameraRef.current?.click();
            else if (kind === 'gallery') galleryRef.current?.click();
            else if (kind === 'files') filesRef.current?.click();
            else {
              const what = kind === 'idea' ? 'Idea' : 'Profile';
              setToast(`${what} sharing coming soon.`);
              setTimeout(() => setToast(null), 2600);
            }
          }}
        />
      )}

      {/* Action menu + safety flows (figma: action menu / delete / block / report) */}
      <ChatActionsLayer
        convo={convo}
        view={actionView}
        setView={setActionView}
        navigate={navigate}
        onToast={(m) => { setToast(m); setTimeout(() => setToast(null), 2600); }}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] bg-[#0D2137] text-white text-sm px-4 py-2.5 rounded-full shadow-lg max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
