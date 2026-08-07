// ════════════════════════════════════════════════════════════════════════
//  DeepLinkBridge
//  Renders nothing — exists purely so useDeepLinks (needs useNavigate from
//  React Router) runs as a descendant of BrowserRouter. Mirrors
//  PushNotificationsBridge / BackButtonBridge.
// ════════════════════════════════════════════════════════════════════════
import useDeepLinks from '../../hooks/useDeepLinks';

export default function DeepLinkBridge() {
  useDeepLinks();
  return null;
}
