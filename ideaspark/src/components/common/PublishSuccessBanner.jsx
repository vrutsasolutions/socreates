// ════════════════════════════════════════════════════════════════════════
//  PublishSuccessBanner
//  Fixed bottom banner (sits above BottomNav) shown briefly after a user is
//  redirected to the home screen following a successful publish.
//  Auto-dismisses after 5s.
// ════════════════════════════════════════════════════════════════════════
import { useEffect } from 'react';
import Icon from './Icon';

const AUTO_DISMISS_MS = 5000;

export default function PublishSuccessBanner({
  show,
  onDismiss,
  message = 'Your idea has been published successfully!',
}) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [show, onDismiss]);

  if (!show) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[100] px-4 pointer-events-none"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--sc-bottom-nav-height, 72px) + 12px)',
      }}
    >
      <div
        role="status"
        className="w-full flex items-center gap-3 bg-[#16A34A] text-white
                   rounded-2xl shadow-xl shadow-green-900/20 px-4 py-3 pointer-events-auto"
        style={{ animation: 'publishBannerIn .3s ease-out' }}
      >
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Icon name="check" className="w-4 h-4" />
        </span>

        <p className="flex-1 text-[14px] font-semibold leading-snug">
          {message}
        </p>

        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="w-6 h-6 rounded-full flex items-center justify-center bg-white/15
                     hover:bg-white/25 transition-colors shrink-0 text-[13px] leading-none"
        >
          ×
        </button>
      </div>

      <style>{`
        @keyframes publishBannerIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
