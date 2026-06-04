// ════════════════════════════════════════════════════════════════════════
//  ChatProfile  (figma "Chat Profile" / "Chat Info")
//  Reached from the chat action menu → View Profile.
//  Big avatar, quick actions (Call / Video / Search), media row,
//  notifications toggle, and PRIVACY & SAFETY actions that reuse the
//  shared Block / Report / Delete overlays.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/messaging/Avatar';
import { ChatActionsLayer, ShareProfileSheet, handleFor } from '../components/messaging/ChatActions';
import { fetchConversation } from '../api/messagingApi';

const QuickAction = ({ label, children }) => (
  <button className="flex flex-col items-center gap-1.5">
    <span className="w-12 h-12 rounded-full bg-[#EAF2FF] text-[#1565C0] flex items-center justify-center">{children}</span>
    <span className="text-[12px] text-[#1565C0] font-medium">{label}</span>
  </button>
);

const SafetyRow = ({ title, subtitle, danger, onClick, children }) => (
  <button onClick={onClick} className="w-full flex items-center gap-4 px-5 py-3.5 text-left">
    <span className="w-10 h-10 rounded-full bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center shrink-0">{children}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-[15px] font-semibold" style={{ color: danger ? '#EF4444' : '#0D2137' }}>{title}</span>
      <span className="block text-[12px] text-[#90A4AE]">{subtitle}</span>
    </span>
    <svg className="w-4 h-4 text-[#90A4AE] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /></svg>
  </button>
);

export default function ChatProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [convo, setConvo] = useState(null);
  const [notifications, setNotifications] = useState(true);
  const [view, setView] = useState(null); // null|'report'|'block'|'delete'
  const [toast, setToast] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white px-3 py-3 flex items-center border-b border-[#F0F6FF]">
        <button onClick={() => navigate(-1)} aria-label="Back" className="relative z-10 w-9 h-9 flex items-center justify-center text-[#1565C0]">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="flex-1 text-center text-[18px] font-bold text-[#0D2137] pointer-events-none">Chat Info</h1>
        <button onClick={() => setShareOpen(true)} aria-label="Share profile" className="relative z-10 w-9 h-9 flex items-center justify-center text-[#1565C0]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}><path strokeLinecap="round" strokeLinejoin="round" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13" /></svg>
        </button>
      </header>

      {/* Identity */}
      <div className="flex flex-col items-center pt-8 pb-6">
        {convo && <Avatar initial={convo.initial} color={convo.avatarColor} size={96} online={convo.online} />}
        <h2 className="mt-4 text-2xl font-bold text-[#0D2137]">{convo?.name ?? 'Chat'}</h2>
        <p className="text-[14px] text-[#90A4AE]">{convo ? handleFor(convo.name) : ''}</p>

        {/* Quick actions */}
        <div className="mt-6 flex items-center gap-12">
          <QuickAction label="Call">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1 3a1 1 0 01-.27 1.05L7.6 9.79a14 14 0 006.6 6.6l1.06-1.36a1 1 0 011.05-.27l3 1a1 1 0 01.68.95V19a2 2 0 01-2 2A16 16 0 013 5z" /></svg>
          </QuickAction>
          <QuickAction label="Video">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" /></svg>
          </QuickAction>
          <QuickAction label="Search">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </QuickAction>
        </div>
      </div>

      {/* Media row */}
      <button className="w-full flex items-center justify-between px-5 py-4 border-t border-[#F0F6FF]">
        <span className="text-[15px] font-bold text-[#0D2137]">Media, Links &amp; Docs</span>
        <span className="flex items-center gap-1 text-[#90A4AE] text-sm">24 items
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /></svg>
        </span>
      </button>

      {/* Notifications toggle */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-[#F0F6FF]">
        <span className="text-[15px] font-bold text-[#0D2137]">Notifications</span>
        <button onClick={() => setNotifications((v) => !v)} aria-label="Toggle notifications"
                className={`w-12 h-7 rounded-full p-0.5 transition-colors ${notifications ? 'bg-[#1565C0]' : 'bg-[#DBEAFE]'}`}>
          <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${notifications ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      <p className="text-center text-[12px] text-[#90A4AE] py-4 bg-[#F8FAFF]">Messages are end-to-end encrypted</p>

      {/* Privacy & safety */}
      <p className="px-5 pt-4 pb-1 text-[11px] font-bold tracking-wider text-[#90A4AE] bg-[#F8FAFF]">PRIVACY &amp; SAFETY</p>
      <div className="divide-y divide-[#F0F6FF]">
        <SafetyRow title="Block User" subtitle="They cannot message or view your profile" onClick={() => setView('block')}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M5.6 5.6l12.8 12.8" /></svg>
        </SafetyRow>
        <SafetyRow title="Report User" subtitle="Report inappropriate behavior or content" onClick={() => setView('report')}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7.5v5M12 16h.01" /></svg>
        </SafetyRow>
        <SafetyRow title="Delete Chat" subtitle="Permanently delete all messages" danger onClick={() => setView('delete')}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" /></svg>
        </SafetyRow>
      </div>

      {/* Shared safety overlays. After block/delete, return to the inbox. */}
      <ChatActionsLayer
        convo={convo}
        view={view}
        setView={setView}
        navigate={navigate}
        onAfterDelete={() => navigate('/messages')}
        onAfterBlock={() => navigate('/messages')}
        onToast={flash}
      />

      {/* Share Profile (figma "Share Profile") */}
      {shareOpen && convo && (
        <ShareProfileSheet
          convo={convo}
          onClose={() => setShareOpen(false)}
          onCopyLink={() => {
            const link = `https://ideaspark.app/u/${handleFor(convo.name).replace('@', '')}`;
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
