// ════════════════════════════════════════════════════════════════════════
//  NotificationToasts
//  Fixed, top-right stack of transient toasts for incoming live pushes.
//  Mount once near the app root; reads from NotificationContext.
// ════════════════════════════════════════════════════════════════════════
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import Icon from './Icon';

const TYPE_ICON = {
  message: 'message-square',
  like: 'heart', bookmark: 'bookmark',
  follow: 'user', comment: 'message-square', system: 'bell',
};

export default function NotificationToasts() {
  const navigate = useNavigate();
  const { toasts, dismissToast, markAsRead } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {toasts.map((n) => (
        <div
          key={n.id}
          role="status"
          onClick={() => { markAsRead(n.id); dismissToast(n.id); if (n.link) navigate(n.link); }}
          className="flex gap-3 items-start bg-white rounded-2xl shadow-xl ring-1 ring-black/5
                     px-4 py-3 cursor-pointer"
          style={{ animation: 'slideIn .25s ease-out' }}
        >
          {/* Icon chip — matching NotificationBell style */}
          <span className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-[#EEF4FF] text-[#1565C0]">
            <Icon name={TYPE_ICON[n.type] ?? 'bell'} className="w-4 h-4" />
          </span>

          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-semibold text-[#0D2137] truncate leading-snug"
              style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}
            >
              {n.title}
            </p>
            <p className="text-[12px] text-[#546E7A] line-clamp-2 leading-relaxed mt-0.5">
              {n.message}
            </p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); dismissToast(n.id); }}
            className="w-6 h-6 rounded-full flex items-center justify-center bg-[#F0F6FF] text-[#90A4AE] hover:text-[#546E7A] hover:bg-[#DBEAFE] transition-colors shrink-0 -mt-0.5 text-[13px] leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
