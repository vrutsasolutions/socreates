// ════════════════════════════════════════════════════════════════════════
//  BackButtonBridge
//  Renders nothing but the exit-confirm toast — exists purely so
//  useAppBackButton (which needs useNavigate/useLocation) runs as a
//  descendant of BrowserRouter. Mirrors PushNotificationsBridge.
// ════════════════════════════════════════════════════════════════════════
import useAppBackButton from '../../hooks/useAppBackButton';

export default function BackButtonBridge() {
  const { showExitToast } = useAppBackButton();

  if (!showExitToast) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100]
                 bg-[#0D2137] text-white text-[13px] font-semibold
                 px-4 py-2.5 rounded-full shadow-xl"
      style={{ animation: 'slideUp .2s ease-out', fontFamily: 'Inter, sans-serif' }}
    >
      Press back again to exit
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}