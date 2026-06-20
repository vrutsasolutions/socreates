// ════════════════════════════════════════════════════════════════════════
//  MessageBell
//  Message icon + unread badge + dropdown panel. Drop into any header.
//  Reads everything from NotificationContext (useNotifications).
//  Shows only message-type notifications — any DM activity (text, photo,
//  voice, file, or a shared idea) sent to the user in a chat. Bell-type
//  activity (likes, follows, comments, bookmarks) is shown separately via
//  NotificationBell. Clicking an item opens that exact conversation.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import Icon from './Icon';

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MessageBell() {
  const navigate = useNavigate();
  const { messageItems, unreadMessages, loading, markAsRead, clearMessageNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 16 });
  const wrapRef = useRef(null);

  const toggle = () => {
    if (!open && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Clicking a specific message notification opens that exact chat —
  // same pattern as the bell deep-linking to an idea/profile.
  const handleItemClick = (n) => {
    if (!n.read) markAsRead(n.id);
    setOpen(false);
    navigate(n.link || (n.conversationId ? `/messages/${n.conversationId}` : '/messages'));
  };

  // "See all" / icon with no items open the inbox and clear the badge,
  // matching the previous one-click-to-inbox behavior.
  const goToInbox = () => {
    clearMessageNotifications();
    setOpen(false);
    navigate('/messages');
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={toggle}
        className="w-9 h-9 flex items-center justify-center text-white relative hover:opacity-80 active:scale-90 transition-all"
        aria-label={`Messages${unreadMessages ? `, ${unreadMessages} unread` : ''}`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83L3 20l1.17-3.5A7.86 7.86 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {unreadMessages > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-[3px] flex items-center justify-center rounded-full bg-[#EF4444] text-white text-[10px] font-bold leading-none ring-1 ring-[#1565C0]">
            {unreadMessages > 99 ? '99+' : unreadMessages}
          </span>
        )}
      </button>

      {open && createPortal(
        <>
          {/* Scrim */}
          <div className="fixed inset-0 z-[60] bg-black/20" onClick={() => setOpen(false)} aria-hidden />
          <div
            style={{ top: pos.top, right: pos.right }}
            className="fixed w-80 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-xl
                       ring-1 ring-black/5 z-[61] text-left overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E3F2FD]">
              <span className="font-bold text-[15px] text-[#0D2137]" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>
                Messages
              </span>
              <button
                onClick={goToInbox}
                className="text-[12px] font-semibold text-[#1565C0] hover:text-[#0D47A1] transition-colors"
              >
                See all
              </button>
            </div>

            {/* Body */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-[13px] text-[#90A4AE]">Loading…</div>
              ) : messageItems.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mb-3 flex justify-center text-[#BBDEFB]">
                    <Icon name="message-square" className="w-9 h-9" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#0D2137]">No new messages</p>
                  <p className="text-[12px] text-[#90A4AE] mt-1">You're all caught up.</p>
                </div>
              ) : (
                messageItems.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`w-full flex gap-3 px-4 py-3 text-left transition-colors border-b border-[#F0F6FF]
                                hover:bg-[#F4F7FF] active:bg-[#EEF4FF] ${n.read ? 'bg-white' : 'bg-[#F4F7FF]'}`}
                  >
                    {/* Icon chip */}
                    <span className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-[#EEF4FF] text-[#1565C0]">
                      <Icon name="message-square" className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-[#0D2137] truncate leading-snug">
                        {n.title}
                      </span>
                      <span className="block text-[12px] text-[#546E7A] line-clamp-2 leading-relaxed mt-0.5">
                        {n.message}
                      </span>
                      <span className="block text-[11px] text-[#90A4AE] mt-1">{timeAgo(n.createdAt)}</span>
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-[#1565C0] mt-2 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
