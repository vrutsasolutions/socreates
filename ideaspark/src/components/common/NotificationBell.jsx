// ════════════════════════════════════════════════════════════════════════
//  NotificationBell
//  Bell icon + unread badge + dropdown panel. Drop into any header.
//  Reads everything from NotificationContext (useNotifications).
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import Icon from './Icon';

const TYPE_ICON = {
  like: 'heart', bookmark: 'bookmark', idea: 'lightbulb',
  follow: 'user', comment: 'message-square', system: 'bell',
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
  const { items, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 16 });
  const wrapRef = useRef(null);

  // Anchor the portaled panel just under the bell, aligned to its right edge.
  const toggle = () => {
    if (!open && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen((o) => !o);
  };

  // Close on Escape — outside clicks are handled by the scrim.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleItemClick = (n) => {
    if (!n.read) markAsRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={toggle}
        className="w-9 h-9 flex items-center justify-center text-white relative"
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
          {/* Scrim — dims page content so the panel reads as a clean floating layer; tap to close. */}
          <div className="fixed inset-0 z-[60] bg-black/20" onClick={() => setOpen(false)} aria-hidden />
          <div
            style={{ top: pos.top, right: pos.right }}
            className="fixed w-80 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-xl
                       ring-1 ring-black/5 z-[61] text-left">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E3F2FD]">
            <span className="font-bold text-[#0D2137]">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead}
                      className="text-xs font-semibold text-[#1565C0] hover:text-[#0D47A1]">
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-[#90A4AE]">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mb-2 flex justify-center text-[#BBDEFB]"><Icon name="bell" className="w-8 h-8" /></div>
                <p className="text-sm text-[#546E7A]">You're all caught up</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`w-full flex gap-3 px-4 py-3 text-left transition-colors border-b border-[#F0F6FF]
                              hover:bg-[#F0F6FF] ${n.read ? 'bg-white' : 'bg-[#F0F6FF]'}`}
                >
                  <span className="mt-0.5 text-[#1565C0]"><Icon name={TYPE_ICON[n.type] ?? 'bell'} className="w-5 h-5" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-[#0D2137] truncate">{n.title}</span>
                    <span className="block text-xs text-[#546E7A] line-clamp-2">{n.message}</span>
                    <span className="block text-[11px] text-[#90A4AE] mt-0.5">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-[#1565C0] mt-1.5 shrink-0" />}
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
