// ════════════════════════════════════════════════════════════════════════
//  Push notifications (FCM device token registration).
//  Backend: ✅ live — POST/DELETE /api/device-token (DeviceTokenController).
// ════════════════════════════════════════════════════════════════════════
import api from './axiosInstance';

// POST /api/device-token — registers/updates this device's FCM token for
// the logged-in user. Safe to call every time the app registers for push
// (e.g. every login) — the backend should upsert on (user_id, device_token),
// not insert duplicates.
export const registerDeviceToken = (deviceToken, platform = 'android') =>
  api.post('/device-token', { deviceToken, platform });

// DELETE /api/device-token — best-effort cleanup so a logged-out device
// stops receiving pushes meant for that account. Not wired to a UI action
// yet (would be called from AuthContext.logout()) — left here so Phase 5
// can implement the matching backend route whenever that's tackled.
export const unregisterDeviceToken = (deviceToken) =>
  api.delete('/device-token', { data: { deviceToken } });