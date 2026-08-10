# SoCreate — API Contract

Single source of truth for the frontend ↔ backend integration.
Frontend builds against this; backend implements to this. **Any change to a
field name, type, or status code goes here first** — never Slack-only.

- **Base URL (prod):** `https://api.socreate.in/api`
- **Base URL (dev):** `http://localhost:8081/api`
- **Auth:** HttpOnly cookie (`auth_token`) set by backend on login/register/google.
  Frontend sends `withCredentials: true`; no manual `Authorization` header needed.
  WebSocket `CONNECT` frames include the JWT via `Authorization` header for
  `WebSocketAuthConfig` validation.
- **Errors:** non-2xx returns `{ "message": "human readable" }`.
- **Rate limiting:** Per-user `ConcurrentHashMap` (single-instance only). Affected
  endpoints return `429` with an `ApiResponse` body.

Legend: ✅ implemented · ⏳ planned/stub

---

## 1. Auth ✅  `/api/auth`

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/register` | `{ name, email, password }` | `{ token, user }` + sets `auth_token` cookie |
| POST | `/login` | `{ email, password }` | `{ token, user }` + sets `auth_token` cookie |
| POST | `/google` | `{ token }` (Google ID token) | `{ token, user }` + sets `auth_token` cookie |
| POST | `/logout` | — | clears cookie, invalidates all tokens |
| GET | `/session-token` | — | `{ token }` (short-lived, never in localStorage) |
| GET | `/check-username?username=` | — | `{ success, message }` |
| POST | `/send-otp` | `{ email }` | `{ message }` |
| POST | `/verify-otp` | `{ email, otp }` | `{ message }` |
| POST | `/forgot-password/send-otp` | `{ email }` | `{ message }` |
| POST | `/forgot-password/verify-otp` | `{ email, otp }` | `{ message, resetToken }` |
| POST | `/forgot-password/reset` | `{ email, newPassword, resetToken }` | `{ message }` |

`user` = `{ id, name, email, username, bio, profileImage, interests[], isPremium, isVerified, membership }`

`/register`, `/login`, and `/google` embed the full `membership` shape (see §8)
or `null` when no active membership exists. `isPremium` + `membership` survive
logout → login cycles.

Onboarding order: Register → /verify-otp → /select-interests → /follow-creators → /home.

Forgot-password flow (3 steps): send-otp → verify-otp (returns single-use
`resetToken`, 15-min TTL) → reset (requires `resetToken`).

Login is rate-limited per email address (429 on excess attempts).

---

## 2. Users ✅  `/api/users`

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/me` | — | `UserDTO` |
| PUT | `/me` | multipart: `profile` (JSON blob) + optional `avatar` (file) | `UserDTO` |
| PUT | `/me/password` | `{ currentPassword, newPassword }` | `{ message }` |
| DELETE | `/me` | `{ password }` | `{ message }` (permanent account deletion) |
| GET | `/me/privacy-preferences` | — | `PrivacyPreferencesDTO` |
| PUT | `/me/privacy-preferences` | `PrivacyPreferencesDTO` | `PrivacyPreferencesDTO` |
| GET | `/me/notification-preferences` | — | `NotificationPreferencesDTO` |
| PUT | `/me/notification-preferences` | `NotificationPreferencesDTO` | `NotificationPreferencesDTO` |
| POST | `/interests` | `{ interests: string[] }` | `{ success, message }` |
| GET | `/suggested-creators` | — | `UserDTO[]` (up to 10, shuffled, excludes self + already following) |
| POST | `/follow-bulk` | `{ creatorIds: string[] }` | `{ success, message }` |
| GET | `/search?q=` | — | `UserDTO[]` |
| GET | `/{id}` | — | `UserDTO` |

`PrivacyPreferencesDTO` = `{ activityStatus, privateProfile }`
`NotificationPreferencesDTO` = `{ likesEnabled, commentsEnabled, followsEnabled, messagesEnabled, newIdeaAlertsEnabled }`

---

## 3. Follow ✅  `/api/follow`

Uses `X-User-Id` header (current user's UUID) on mutating/stats calls.

| Method | Path | Headers | Response |
|---|---|---|---|
| POST | `/{targetUserId}` | `X-User-Id` | `{ message }` |
| DELETE | `/{targetUserId}` | `X-User-Id` | `{ message }` |
| DELETE | `/followers/{followerUserId}` | — | `{ message }` (remove a follower) |
| GET | `/{userId}/followers` | — | `FollowResponse[]` |
| GET | `/{userId}/following` | — | `FollowResponse[]` |
| GET | `/{targetUserId}/stats` | `X-User-Id` | `FollowStats` |
| GET | `/requests` | — | `FollowRequest[]` (pending follow requests for private accounts) |
| GET | `/requests/count` | — | `{ count }` |
| POST | `/requests/{requestId}/accept` | — | `{ message }` |
| POST | `/requests/{requestId}/decline` | — | `{ message }` |

`FollowResponse` = `{ userId, name, username, profileImage }`
`FollowStats` = `{ followersCount, followingCount, isFollowing }`

When a target user has `privateProfile: true`, `POST /{targetUserId}` creates a
pending `FollowRequest` instead of a direct follow. The target sees it in
`GET /requests` and can accept/decline.

---

## 4. Ideas ✅  `/api/ideas`

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/?sort=&category=&page=` | — | `Idea[]` |
| GET | `/of-the-day` | — | `Idea` |
| GET | `/premium` | — | `Idea[]` |
| GET | `/mine` | — | `Idea[]` |
| GET | `/saved` | — | `Idea[]` |
| GET | `/by-user/{userId}` | — | `Idea[]` |
| GET | `/{id}` | — | `Idea` |
| POST | `/` | multipart: `idea` (JSON blob) + optional `images` (1–5 files) | `Idea` |
| DELETE | `/{id}` | — | 204 |
| POST | `/{id}/save` | — | `{ message }` |
| DELETE | `/{id}/save` | — | `{ message }` |
| POST | `/{id}/like` | — | `{ message }` |
| DELETE | `/{id}/like` | — | `{ message }` |
| POST | `/{id}/comments` | `{ content }` | `Comment` |
| GET | `/{id}/comments` | — | `Comment[]` |
| DELETE | `/comments/{commentId}` | — | 204 |

`Idea` = `{ id, title, description, category, isPremium, likeCount, creatorName, creatorId, createdAt, imageUrl, imageUrls[], savedByCurrentUser, likedByCurrentUser }`

`Comment` = `{ id, content, userId, userName, userImage, createdAt }`

Multi-image: the create form sends every selected file as a repeated `images`
part (max 5). `imageUrl` = cover image (`imageUrls[0]`), kept for backward
compatibility. Idea creation runs a plagiarism check via `PlagiarismService`
and rejects plagiarized content.

Free-plan users can fully read a limited number of distinct premium ideas
(lifetime cap). Premium/Creator Pro users have unlimited access.

---

## 5. Search ✅  `/api/search`

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/?q=&category=&sort=` | — | `Idea[]` |

---

## 6. AI (Groq) ✅  `/api/ai`

Powered by Groq API (`llama-3.3-70b-versatile`). Text-only, no image generation.
Rate-limited per user.

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/refine` or `/enhance` | `{ title, description, mode? }` | `{ title, description }` |
| POST | `/chat` | `{ message, mode? }` | `{ reply }` |

`mode` for refine: `"enhance"` (default) or `"grammar"`.
`mode` for chat: `"chat"` (default).

---

## 7. Plagiarism ✅  `/api/plagiarism`

Cosine-similarity scan against all existing ideas in the database. Authenticated
and rate-limited per user (daily cap).

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/check` | `{ description }` | `PlagiarismResult` |

`PlagiarismResult` = `{ plagiarized, message, matchPercentage?, matchedIdeaId? }`

---

## 8. Images (Cloudflare R2) ✅  `/api/images`

Handled internally by `CloudflareImageService`. Image upload is part of idea
creation (multipart `images` in `POST /api/ideas`) and profile avatar update
(multipart `avatar` in `PUT /api/users/me`). No standalone image endpoint is
exposed — uploads flow through the parent entity's endpoints.

Image URLs are Cloudflare R2 delivery URLs (e.g. `https://<bucket>.r2.dev/...`).

---

## 9. Notifications ✅  `/api/notifications`

### REST endpoints

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/` | — | `Notification[]` (all, ordered by createdAt desc) |
| GET | `/unread-count` | — | `{ count }` |
| POST | `/{id}/read` | — | `{ message }` |
| POST | `/read-all` | — | `{ message }` |
| POST | `/send` | `NotificationRequest` | `Notification` (admin/system use) |

### Notification model

`Notification` = `{ id, message, readStatus, type, referenceId, conversationId, imageUrl, createdAt }`

`type` ∈ `LIKE | COMMENT | BOOKMARK | NEW_IDEA | FOLLOW | FOLLOW_REQUEST | MESSAGE | PRIVACY_CHANGE | SYSTEM`

`imageUrl` — HTTPS URL shown as a big-picture in FCM push notifications:
idea cover image for LIKE/COMMENT/BOOKMARK/NEW_IDEA; actor's profile pic for
FOLLOW/FOLLOW_REQUEST/MESSAGE/PRIVACY_CHANGE. Null for SYSTEM notifications.

`referenceId` — UUID of the related entity: idea ID for LIKE/COMMENT/BOOKMARK/NEW_IDEA;
user ID for FOLLOW/FOLLOW_REQUEST/PRIVACY_CHANGE. Null for MESSAGE (uses `conversationId` instead).

### Push notifications (FCM)

Backend sends push notifications via Firebase Cloud Messaging for all notification
types when the recipient's app is backgrounded/closed. The device's FCM token is
registered via the Device Token API (§14). Push notifications include the `imageUrl`
as a big-picture attachment on Android.

### Real-time (WebSocket)

Per-user delivery via `convertAndSendToUser(email, "/queue/notifications", notification)`.
Frontend subscribes after STOMP CONNECT.

### Notification preferences

Users can toggle individual notification types on/off via
`PUT /api/users/me/notification-preferences`. When a toggle is off,
`NotificationService.sendNotification()` skips creating the notification
for that type. Email notifications (milestones, new idea alerts) are
unaffected by these toggles.

---

## 10. Payment & Membership ✅  `/api/payment`

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/create-order` | `Checkout` | `{ orderId, amount, currency }` |
| POST | `/subscribe` | `{ plan, billing, gateway, planLabel, price, paymentId, orderId, signature }` | `{ user }` |
| POST | `/cancel` | — | `{ user }` |
| POST | `/refund` | — | `{ user }` |
| GET | `/status` | — | `MembershipDTO` or `{ success: false, message }` |

### Plans & pricing

| Plan | Billing | Price |
|---|---|---|
| Reader Premium | Monthly | ₹99 |
| Reader Premium | Yearly | ₹799 |
| Creator Pro | Monthly | ₹199 |
| Creator Pro | Yearly | ₹999 |

`Checkout` = `{ plan, billing, gateway, planLabel, price }`
- `plan` ∈ `reader | creator`
- `billing` ∈ `monthly | yearly`
- `gateway` — always `razorpay`
- `amount` on `/create-order` is in **paise** (₹799 → `79900`)

`/subscribe` is called after a successful Razorpay charge. Backend verifies
the Razorpay signature before granting premium. Uses Razorpay Orders API
(one-time charges), NOT Subscriptions API — no auto-renewal.

`/refund` (self-service) reverses the most recent captured payment via Razorpay.
Access is revoked synchronously; money is refunded asynchronously via webhook.

### Membership shapes

`MembershipDTO` = `{ plan, billing, gateway, planLabel, price, status, startedAt, renewsAt }`
- `status` ∈ `active | canceled | expired`

`User.membership` — embedded in all auth responses (`/register`, `/login`, `/google`)
and `GET /api/payment/status`.

### Membership expiry

`MembershipExpiryService` runs daily at 2:30 AM IST. Expires lapsed memberships
where `renewsAt` has passed and revokes `isPremium`.

---

## 11. Creator ✅  `/api/creator`

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/dashboard` | — | `CreatorDashboardDTO` |
| GET | `/earnings` | — | `CreatorEarningDTO[]` |
| POST | `/ideas/{id}/read` | — | `{ success, message }` (increments read count) |
| GET | `/payout-details` | — | `PayoutDetails` |
| PUT | `/payout-details` | `PayoutDetailsRequest` | `PayoutDetails` |

### Payout details

`PayoutDetailsRequest` = `{ accountName, accountNumber, ifsc }`
(bank-only; UPI/VPA not supported)

Saving creates a RazorpayX contact + fund account server-side and persists
their IDs on the user (`razorpay_contact_id`, `razorpay_fund_account_id`).

`PayoutDetails` (response) = `{ configured, method, destination, accountName }`
- `configured: false` when nothing saved yet
- `destination` — masked, e.g. `"HDFC ****4321"`

### Automated payouts

Creator self-withdrawal has been **removed**. Payouts are fully automated:

1. **Revenue distribution** (`RevenueDistributionService`): runs on the 1st of
   each month at 12:30 AM IST. Sums captured membership payments, splits the
   creator pool, and writes `Scheduled` `creator_earnings` rows per eligible
   creator (Creator Pro + verified + engagement score > 0). Earnings use weighted
   engagement score: views ×0.25, saves ×0.40, likes ×0.20, comments ×0.15.
2. **Payout scheduling**: runs on the 15th of each month at 1:00 AM IST. Picks
   up `Scheduled` earnings and initiates RazorpayX payouts.
3. **Payout processing** (`ScheduledPayoutRunner`): runs daily at 2:00 AM IST.
   Processes scheduled payouts via RazorpayX, with 3-day daily retry on failure.
   ₹500 rollover threshold — amounts below this carry forward to next month.

Revenue split: Reader Premium 50/50 platform/creator pool; Creator Pro 25%
creator pool / 75% SoCreate.

---

## 12. Messaging ✅  `/api/messages`

### Conversations & messages

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/conversations` | — | `ConversationDTO[]` |
| GET | `/conversations/{id}` | — | `ConversationDTO` |
| POST | `/conversations` | `{ userId }` | `ConversationDTO` |
| GET | `/conversations/{id}/messages` | — | `MessageDTO[]` |
| POST | `/conversations/{id}/messages` | `{ type, content }` | `MessageDTO` |
| GET | `/conversations/{id}/media` | — | `ConversationMediaDTO` |
| DELETE | `/conversations/{id}` | — | `{ message }` |
| POST | `/messages/{id}/react` | `{ emoji }` | `MessageDTO` (toggles; same emoji clears) |
| DELETE | `/messages/{id}?scope=me\|everyone` | — | `{ message }` |

### Contacts & presence

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/contacts` | — | `UserDTO[]` |
| GET | `/active` | — | `[{ userId, name, profileImage, ... }]` |

### Message requests (for private accounts)

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/requests` | — | `MessageRequestDTO[]` |
| POST | `/requests/{id}/accept` | — | `{ message }` |
| POST | `/requests/{id}/decline` | — | `{ message }` |

### Block & report (within messaging)

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/blocked` | — | `UserDTO[]` |
| POST | `/block/{userId}` | — | `{ message }` |
| DELETE | `/block/{userId}` | — | `{ message }` |
| POST | `/report/{userId}` | `{ reason }` | `{ message }` |

### Media uploads

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/upload/image` | multipart `file` | `{ url }` |
| POST | `/upload/voice` | multipart `file` | `{ url }` |
| POST | `/upload/file` | multipart `file` | `{ url }` |

### Share an idea

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/share-post` | `{ postId, title, imageUrl?, isPremium?, userIds[] }` | `{ shared, count }` |

Persists one `IDEA` message per recipient. Content is a JSON snapshot
`{ ideaId, title, imageUrl, isPremium }` rendered as a tappable card in chat.

### Message types & shapes

`MessageDTO` = `{ id, conversationId, senderId, senderName, senderAvatar, type, content, isRead, reaction, createdAt }`
- `type` ∈ `TEXT | IMAGE | VOICE | FILE | IDEA | PROFILE`
- `content` = text for TEXT, R2 URL for media, JSON snapshot for IDEA/PROFILE

### Real-time (WebSocket)

| Destination | Payload | Description |
|---|---|---|
| `/user/queue/messages` | `MessageDTO` | New message (sender gets no echo) |
| `/user/queue/notifications` | `Notification` | Message notification (bell + push) |
| `/user/queue/chat-events` | event object | Conversation status changes (accept/delete/block) |
| `/user/queue/read-receipts` | receipt object | Bulk read receipts |
| `/topic/presence` | `{ userId, status, email }` | Online/offline broadcast (gated by Activity Status toggle) |

### Free-tier messaging limit

When chatting with a verified creator, non-Premium users get 5 text messages +
1 file/media/voice share per conversation. Enforcement is currently UI-only;
server-side counter is pending.

---

## 13. Block ✅  `/api/blocks`

Standalone block/unblock (separate from messaging-scoped block in §12).

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/{userId}` | — | `{ message }` |
| DELETE | `/{userId}` | — | `{ message }` |
| GET | `/me` | — | `[{ id, name, username, profileImage }]` |

Blocked users cannot send messages to the blocker (enforced in `MessageService`).

---

## 14. Device Token ✅  `/api/device-token`

FCM token registration for push notifications. Called by `usePushNotifications`
hook after `PushNotifications.register()` succeeds.

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/` | `{ deviceToken, platform }` | 204 |
| DELETE | `/` | `{ deviceToken }` | 204 (called on logout) |

`platform` ∈ `android | web | ios`

---

## 15. Feedback ✅  `/api/feedback`

One-time app feedback (rating + review). Enforced one submission per user
(409 Conflict on duplicate). Emails the feedback to `vrutsasolutions@gmail.com`.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/me` | — | `FeedbackResponse` or 204 (no submission yet) |
| POST | `/` | `{ rating (1-5), review }` | `FeedbackResponse` |

---

## 16. Webhooks ✅  `/api/webhooks`

Signature-verified webhook receivers. Not called by the frontend.

| Method | Path | Source | Events handled |
|---|---|---|---|
| POST | `/razorpay` | Razorpay | `payment.captured`, `refund.created`, `refund.processed`, `refund.failed` |
| POST | `/razorpayx` | RazorpayX | `payout.processed`, `payout.reversed`, `payout.failed`, `payout.rejected` |

Note: Do NOT enable `payment.authorized` in the Razorpay dashboard — it creates
duplicate audit entries alongside `payment.captured`.

---

## 17. Admin ✅  `/api/admin`

All admin endpoints require `ROLE_ADMIN` (`@PreAuthorize`).

### User management  `/api/admin/users`

| Method | Path | Request | Response |
|---|---|---|---|
| DELETE | `/{id}` | `{ reason }` | `{ message }` (ban + permanent delete + email blocklist) |

### Revenue & payouts  `/api/admin/pools`

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/{month}/distribute` | — | `{ message, month, totalRevenuePaise, creatorPoolPaise, socreateSharePaise, earningsCreated }` |
| GET | `/payouts/failed` | — | `[{ earningId, creatorName, month, amount, status, failureReason }]` |
| GET | `/payouts/setup-missing` | — | same shape as failed |
| GET | `/payouts/scheduled` | — | same shape |
| GET | `/payouts/processing` | — | same shape |
| POST | `/payouts/{earningId}/reschedule` | — | `{ message, earningId, status, scheduledFor }` |
| POST | `/payouts/run` | — | `{ message }` (manually triggers the scheduled payout job) |
| GET | `/payouts/summary` | — | `{ scheduled, processing, paid, failed, setupMissing, ... }` |

`{month}` format: ISO 1st-of-month, e.g. `2026-07-01`.

---

## 18. WebSocket ✅

- **SockJS handshake:** `/ws` (must use `sockjs-client` + `@stomp/stompjs`; raw `ws://` will NOT work)
- **Broker prefixes:** `/topic`, `/queue`
- **App prefix:** `/app`
- **User prefix:** `/user`
- **Auth:** JWT validated on STOMP `CONNECT` frame (`WebSocketAuthConfig`). Rejects with
  `BadCredentialsException` if token is missing/invalid.

### Destinations

| Destination | Type | Description |
|---|---|---|
| `/user/queue/notifications` | Per-user | New notification (bell icon) |
| `/user/queue/messages` | Per-user | New chat message |
| `/user/queue/chat-events` | Per-user | Conversation status changes |
| `/user/queue/read-receipts` | Per-user | Bulk read receipts |
| `/topic/presence` | Broadcast | Online/offline status (gated by Activity Status toggle per user) |

---

## 19. Scheduled Jobs

| Job | Schedule | Service |
|---|---|---|
| Revenue distribution | 1st of month, 12:30 AM IST | `RevenueDistributionService` |
| Payout scheduling | 15th of month, 1:00 AM IST | `RevenueDistributionService` |
| Payout processing + retry | Daily, 2:00 AM IST | `ScheduledPayoutRunner` |
| Membership expiry | Daily, 2:30 AM IST | `MembershipExpiryService` |
| Rate limiter cleanup | Hourly | `RateLimiterService` |

All scheduled jobs run in-process on the single backend instance. Horizontal
scaling requires Redis/RabbitMQ relay + distributed locking (ShedLock) to prevent
duplicate execution and financial double-processing.

---

## Infrastructure Notes

- **Frontend:** React/Vite + Capacitor (Android), Tailwind CSS, deployed on AWS S3 + CloudFront
- **Backend:** Spring Boot (Java), AWS Elastic Beanstalk (`SoCreate-backend-env`), `ap-south-1`
- **Database:** Supabase (PostgreSQL), `ddl-auto=validate` — all schema changes must be applied via SQL in Supabase before backend deployment
- **Storage:** Cloudflare R2 (images, voice, files)
- **Payments:** Razorpay (memberships) + RazorpayX (creator payouts)
- **Push notifications:** Firebase Cloud Messaging (with big-picture image support)
- **AI:** Groq API (`llama-3.3-70b-versatile`, text-only)
- **Monitoring:** New Relic
- **Single-instance constraint:** In-memory WebSocket broker + `@Scheduled` cron jobs require single-instance deployment
