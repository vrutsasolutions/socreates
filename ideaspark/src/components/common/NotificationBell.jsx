// ════════════════════════════════════════════════════════════════════════
//  NotificationBell
//  Bell icon + unread badge + dropdown panel. Drop into any header.
//  Reads everything from NotificationContext (useNotifications).
//  Shows only non-message ("bell") notifications — likes, bookmarks,
//  follows, comments, system. Message DMs are surfaced via the separate
//  message icon + unreadMessages (see Home.jsx).
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import Icon from './Icon';

const TYPE_ICON = {
  like: 'heart', bookmark: 'bookmark',
  follow: 'user', comment: 'message-square', system: 'bell',
  new_idea: 'lightbulb',
};

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

export default function NotificationBell() {
  const navigate = useNavigate();
  const { bellItems, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
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

  const handleItemClick = (n) => {
    // ✅ Fixed — normalized notifications use `read`, not `readStatus`
    if (!n.read) markAsRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={toggle}
        className="w-9 h-9 flex items-center justify-center text-white relative hover:opacity-80 active:scale-90 transition-all"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center
                           text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-[#1565C0]">
            {unreadCount > 9 ? '9+' : unreadCount}
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
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[12px] font-semibold text-[#1565C0] hover:text-[#0D47A1] transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Body */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-[13px] text-[#90A4AE]">Loading…</div>
              ) : bellItems.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mb-3 flex justify-center text-[#BBDEFB]">
                    <Icon name="bell" className="w-9 h-9" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#0D2137]">You're all caught up</p>
                  <p className="text-[12px] text-[#90A4AE] mt-1">No new notifications yet.</p>
                </div>
              ) : (
                bellItems.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    // ✅ Fixed — using `read` (normalized), not `readStatus`
                    className={`w-full flex gap-3 px-4 py-3 text-left transition-colors border-b border-[#F0F6FF]
                                hover:bg-[#F4F7FF] active:bg-[#EEF4FF] ${n.read ? 'bg-white' : 'bg-[#F4F7FF]'}`}
                  >
                    {/* Icon chip */}
                    <span className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-[#EEF4FF] text-[#1565C0]">
                      <Icon name={TYPE_ICON[n.type] ?? 'bell'} className="w-4 h-4" />
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
                    {/* ✅ Fixed — using `read` (normalized), not `readStatus` */}
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
