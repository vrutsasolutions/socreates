// ════════════════════════════════════════════════════════════════════════
//  ChatProfile  (figma "Chat Profile" / "Chat Info")
//  Reached from the chat action menu → View Profile.
//  Big avatar, media row, notifications toggle, and PRIVACY & SAFETY
//  actions that reuse the
//  shared Block / Report / Delete overlays.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/messaging/Avatar';
import { ChatActionsLayer, ShareProfileSheet, handleFor } from '../components/messaging/ChatActions';
import { fetchConversation } from '../api/messagingApi';

const SafetyRow = ({ title, subtitle, danger, onClick, children }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors
      ${danger ? 'hover:bg-red-50 active:bg-red-100' : 'hover:bg-[#F0F6FF] active:bg-[#E3F2FD]'}`}
  >
    <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0
      ${danger ? 'bg-[#FEE2E2] text-[#EF4444]' : 'bg-[#E3F2FD] text-[#1565C0]'}`}>
      {children}
    </span>
    <span className="flex-1 min-w-0">
      <span className={`block text-[15px] font-semibold ${danger ? 'text-red-500' : 'text-[#0D2137]'}`}>{title}</span>
      <span className="block text-sm text-[#90A4AE] mt-0.5">{subtitle}</span>
    </span>
    <svg className="w-4 h-4 text-[#BBDEFB] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  </button>
);

export default function ChatProfile() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const [convo, setConvo]                   = useState(null);
  const [notifications, setNotifications]   = useState(true);
  const [view, setView]                     = useState(null);
  const [toast, setToast]                   = useState(null);
  const [shareOpen, setShareOpen]           = useState(false);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await fetchConversation(id);
      if (alive) setConvo(data);
    })();
    return () => { alive = false; };
  }, [id]);

  return (
    <div className="min-h-screen">

      {/* HEADER — matches Home */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-bold text-lg flex-1 text-center">Chat Info</span>
          <button
            onClick={() => setShareOpen(true)}
            className="w-9 h-9 flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all"
            aria-label="Share profile"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13" />
            </svg>
          </button>
        </div>

        {/* floating identity card */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-5 shadow-md flex flex-col items-center text-center">
            {convo && <Avatar initial={convo.initial} color={convo.avatarColor} size={72} online={convo.online} />}
            <h2 className="mt-3 text-white text-xl font-bold">{convo?.name ?? 'Chat'}</h2>
            <p className="text-blue-200 text-sm mt-0.5">{convo ? handleFor(convo.name) : ''}</p>
          </div>
        </div>
      </header>

      {/* CONTENT WRAPPER — matches Home */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6">

          {/* Profile Page row */}
          <button
            onClick={() => convo?.otherUserId && navigate(`/users/${convo.otherUserId}`)}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-[#F0F6FF] hover:bg-[#F0F6FF] active:bg-[#E3F2FD] transition-colors"
          >
            <span className="text-[15px] font-semibold text-[#0D2137]">Profile Page</span>
            <svg className="w-4 h-4 text-[#90A4AE]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
            </svg>
          </button>

          {/* Media row */}
          <button className="w-full flex items-center justify-between px-5 py-4 border-b border-[#F0F6FF] hover:bg-[#F0F6FF] active:bg-[#E3F2FD] transition-colors">
            <span className="text-[15px] font-semibold text-[#0D2137]">Media, Links &amp; Docs</span>
            <span className="flex items-center gap-1 text-[#90A4AE] text-sm">
              24 items
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
              </svg>
            </span>
          </button>

          {/* Notifications toggle */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F6FF]">
            <span className="text-[15px] font-semibold text-[#0D2137]">Notifications</span>
            <button
              onClick={() => setNotifications((v) => !v)}
              aria-label="Toggle notifications"
              className={`w-12 h-7 rounded-full p-0.5 transition-colors active:scale-95 ${notifications ? 'bg-[#1565C0]' : 'bg-[#DBEAFE]'}`}
            >
              <span className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${notifications ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* E2E note */}
          <div className="px-5 py-3 bg-[#F8FAFF] border-b border-[#F0F6FF]">
            <p className="text-center text-xs text-[#90A4AE]">🔒 Messages are end-to-end encrypted</p>
          </div>

          {/* Privacy & Safety */}
          <p className="px-5 pt-5 pb-2 text-xs font-bold tracking-wider text-[#90A4AE] uppercase">Privacy &amp; Safety</p>
          <div className="divide-y divide-[#F0F6FF]">
            <SafetyRow title="Block User" subtitle="They cannot message or view your profile" onClick={() => setView('block')}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M5.6 5.6l12.8 12.8" />
              </svg>
            </SafetyRow>
            <SafetyRow title="Report User" subtitle="Report inappropriate behavior or content" onClick={() => setView('report')}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7.5v5M12 16h.01" />
              </svg>
            </SafetyRow>
            <SafetyRow title="Delete Chat" subtitle="Permanently delete all messages" danger onClick={() => setView('delete')}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
              </svg>
            </SafetyRow>
          </div>

          <div className="pb-10" />
        </div>
      </div>

      <ChatActionsLayer
        convo={convo}
        view={view}
        setView={setView}
        navigate={navigate}
        onAfterDelete={() => navigate('/messages')}
        onAfterBlock={() => navigate('/messages')}
        onToast={flash}
      />

      {shareOpen && convo && (
        <ShareProfileSheet
          convo={convo}
          onClose={() => setShareOpen(false)}
          onCopyLink={() => {
            const link = `https://socreates.app/u/${handleFor(convo.name).replace('@', '')}`;
            navigator.clipboard?.writeText(link).catch(() => {});
            flash('Profile link copied');
          }}
          onSendDM={() => { setShareOpen(false); navigate(`/messages/${id}`); }}
          onToast={flash}
        />
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-10 z-[60] bg-[#0D2137] text-white text-sm px-4 py-2.5 rounded-full shadow-lg max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
