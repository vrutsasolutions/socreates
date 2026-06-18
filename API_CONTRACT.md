# IdeaSpark — API Contract

Single source of truth for the frontend ↔ backend integration.
Frontend builds against this; backend implements to this. **Any change to a
field name, type, or status code goes here first** — never Slack-only.

- **Base URL:** `http://localhost:8081/api`
- **Auth:** `Authorization: Bearer <JWT>` on all protected routes.
- **Errors:** non-2xx returns `{ "message": "human readable" }`.
- **CORS:** backend must allow origin `http://localhost:5173` (Vite dev server),
  methods `GET,POST,PUT,DELETE`, headers `Authorization,Content-Type`.

Legend: ✅ implemented · ⏳ under development

---

## 1. Auth ✅  `/api/auth`

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/register` | `{ name, email, password }` | `{ token, user }` |
| POST | `/login` | `{ email, password }` | `{ token, user }` |
| POST | `/send-otp` ✅ | `{ email }` | `{ message }` |
| POST | `/verify-otp` ✅ | `{ email, otp }` | `{ message }` |
| POST | `/forgot-password/send-otp` ✅ | `{ email }` | `{ message }` |
| POST | `/forgot-password/verify-otp` ✅ | `{ email, otp }` | `{ message, resetToken }` |
| POST | `/forgot-password/reset` ✅ | `{ email, newPassword, resetToken }` | `{ message }` |

`user` = `{ id, name, email, bio?, avatarUrl?, interests?[] }`

OTP ✅ LIVE (`OtpController` + `EmailService`). Frontend: `src/api/authApi.jsx`.
Onboarding order: **Register → /verify-otp → /select-interests → /follow-creators → /home**.

**Forgot-password flow (3 steps):** send-otp → verify-otp → reset. `verify-otp`
returns a single-use **`resetToken`** (15-min TTL); `reset` **requires** it, so the
password cannot be changed without proving OTP ownership. Frontend wizard:
`src/pages/ForgotPassword.jsx`.

---

## 2. Users ✅  `/api/users`

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/me` | — | `User` |
| PUT | `/me` | multipart: `profile` (JSON blob) + optional `avatar` (file) | `User` |
| POST | `/interests` | `{ interests: string[] }` | `{ interests }` |
| GET | `/suggested-creators` | — | `Creator[]` |
| POST | `/follow-bulk` | `{ creatorIds: string[] }` | `{ followed: string[] }` |

`Creator` = `{ id, name, bio, avatarUrl, followed }`

> `GET /suggested-creators` is **auth-scoped** (uses the JWT principal): it
> excludes the signed-in user and anyone they already follow, then **shuffles**
> the remaining users and returns up to 10 — so the rail is dynamic per user /
> per load rather than the same fixed first 10 for everyone. The frontend also
> filters out self + already-following as a safety net (`FollowList.jsx`).

### Follow / social graph ✅  `/api/follow`  — frontend: `src/api/userApi.jsx`

Identifies the acting user via an `X-User-Id` header (current user's UUID), not
the JWT principal — the frontend passes it explicitly on the mutating/stats calls.

| Method | Path | Headers | Response |
|---|---|---|---|
| POST | `/{targetUserId}` | `X-User-Id` | `"Followed successfully"` |
| DELETE | `/{targetUserId}` | `X-User-Id` | `"Unfollowed successfully"` |
| GET | `/{userId}/followers` | — | `FollowResponse[]` |
| GET | `/{userId}/following` | — | `FollowResponse[]` |
| GET | `/{targetUserId}/stats` | `X-User-Id` | `FollowStats` |

`FollowResponse` = `{ userId, name, username, profileImage }`
`FollowStats` = `{ followersCount, followingCount, isFollowing }`

> For the signed-in user's **own** profile, the frontend calls `/stats` with
> `targetUserId == X-User-Id` to get their own follower/following counts.

---

## 3. Ideas ✅  `/api/ideas`

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/?sort=&category=&page=` | — | `Idea[]` |
| GET | `/premium` | — | `Idea[]` |
| GET | `/mine` | — | `Idea[]` |
| GET | `/saved` | — | `Idea[]` |
| GET | `/{id}` | — | `Idea` |
| POST | `/` | multipart: `idea` (JSON blob) + optional `images` (1–5 files, repeated part) | `Idea` |
| DELETE | `/{id}` | — | 204 |
| POST/DELETE | `/{id}/save` | — | 204 |
| POST/DELETE | `/{id}/like` | — | 204 |
| POST | `/{id}/comments` | `{ content }` | `Comment` |
| GET | `/{id}/comments` | — | `Comment[]` |
| DELETE | `/comments/{commentId}` | — | 204 |

`Idea` = `{ id, title, description, category, isPremium, likeCount,
creatorName, createdAt, imageUrl, imageUrls, savedByCurrentUser }`

`Comment` = `{ id, content, userId, userName, userImage, createdAt }`

> Note: `imageUrl` is the Cloudflare delivery URL once image storage is live (§6).
>
> **Multi-image (⏳ pending backend):** the create form now sends every selected
> file as a repeated `images` part (max 5). During the transition the frontend
> *also* sends the first file as a single `image` part, so the current
> single-image backend keeps working unchanged. When ready, the backend should
> accept `MultipartFile[] images`, store all URLs, and return them as
> `imageUrls` (a `string[]`); `imageUrl` should remain set to the cover
> (`imageUrls[0]`) for backward compatibility with existing cards/detail views.

---

## 4. Search ✅  `/api/search`

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/?q=&category=&sort=` | — | `Idea[]` |

---

## 5. AI (Gemini) ⏳  `/api/ai`  — frontend: `src/api/aiApi.jsx`

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/generate` | `{ prompt, category? }` | `{ title, description, category, tags: string[] }` |
| POST | `/enhance` | `{ title, description }` | `{ enhancedDescription, suggestions: string[] }` |
| POST | `/summarize` | `{ description }` | `{ summary }` |
| POST | `/categorize` | `{ title, description }` | `{ category, confidence }` |
| POST | `/chat` | `{ messages: [{ role, content }] }` | `{ reply }` |

---

## 6. Images (Cloudflare) ⏳  `/api/images`  — frontend: `src/api/imageApi.jsx`

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/` | multipart: `image` (file) | `{ id, url }` |
| DELETE | `/{id}` | — | 204 |

- `url` = full Cloudflare delivery URL.
- Optimization variants delivered via URL suffix (e.g. `.../<id>/public`).

---

## 7. Notifications  `/api/notifications`  — frontend: `src/api/notificationApi.jsx`

**Real-time transport — DECIDED & LIVE: STOMP over SockJS** ✅
- SockJS handshake endpoint: `http://localhost:8081/ws` (server uses `.withSockJS()`,
  so a **raw `ws://` socket will NOT work** — use `sockjs-client` + `@stomp/stompjs`).
- Broker prefix `/topic`, app prefix `/app`.
- Subscribe destination: `/topic/notifications` — pushes a `Notification` JSON on every
  like / bookmark / idea-publish.
- Frontend: `subscribeToNotifications()` connects + normalizes the payload.

**Live payload shape** (backend entity — differs from the UI shape below):
`{ id: UUID, message: string, readStatus: boolean, createdAt: LocalDateTime, user: User }`
Frontend `normalizeNotification()` maps this → the UI shape and derives `type`/`title`/`link`
from the message text (backend sends none of those).

**UI shape** (what the bell/toast consume):
`Notification` = `{ id, type, title, message, read, createdAt, link }`
`type` ∈ `like | bookmark | idea | follow | comment | system`

### REST endpoints

| Method | Path | Request | Response | Status |
|---|---|---|---|---|
| POST | `/send` | `Notification` (entity) | `Notification` (saved + broadcast) | ✅ live |
| GET | `/` | — | `Notification[]` | ⏳ **not implemented** |
| GET | `/unread-count` | — | `{ count }` | ⏳ **not implemented** |
| POST | `/{id}/read` | — | 204 | ⏳ **not implemented** |
| POST | `/read-all` | — | 204 | ⏳ **not implemented** |

> **Frontend status:** real-time push is wired LIVE (`USE_MOCK.notificationsRealtime = false`).
> The bell's initial list / unread-count / mark-read still run on **mock**
> (`USE_MOCK.notifications = true`) because the GET/read endpoints above don't exist yet.
>
> **Gaps for Vishakha to close** (so the bell is fully live, not just real-time):
> 1. Add `GET /`, `GET /unread-count`, `POST /{id}/read`, `POST /read-all`.
> 2. The WS handshake is currently **unauthenticated** (`setAllowedOriginPatterns("*")`,
>    no JWT check) — add a STOMP `ChannelInterceptor`/handshake auth.
> 3. Pushes go to one **shared** `/topic/notifications` (every client gets every
>    notification). For per-user delivery, send to `/user/queue/notifications`
>    via `convertAndSendToUser(...)`.
> 4. Consider adding `type`/`title`/`link` to the `Notification` entity so the
>    frontend doesn't have to infer `type` from message text.

---

## 8. Payment & Membership ⏳  `/api/payment`  — frontend: `src/api/paymentApi.jsx`

Drives the Membership page (`/membership`), the success/failure result pages, and
the Active-membership status view. Mock-backed via `USE_MOCK.payment = true` until
these endpoints ship; flip to `false` to go live.

| Method | Path | Request | Response | Status |
|---|---|---|---|---|
| POST | `/create-order` | `Checkout` | `{ orderId, amount, currency }` | ⏳ |
| POST | `/subscribe` | `Checkout` + `{ paymentId, orderId, signature }` | `{ user }` | ⏳ |
| POST | `/stripe/checkout` | `Checkout` | `{ checkoutUrl }` | ⏳ |
| POST | `/cancel` | `{}` | `{ user }` | ⏳ |

**`Checkout`** (what the frontend sends to start a purchase) =
`{ plan, billing, gateway, planLabel, price }`
- `plan` ∈ `reader | creator`  (Go Premium / Creators Pro)
- `billing` ∈ `monthly | yearly`
- `gateway` ∈ `razorpay | stripe`
- `planLabel` — display string, e.g. `"Creators Pro"`
- `price` — display string, e.g. `"₹999"` (server is source of truth for the real amount)

**`amount`** on `/create-order` is in **paise** (₹799 → `79900`) for the Razorpay order.

**`/subscribe`** is called after a successful gateway charge:
- **Razorpay:** sent from the in-browser `handler` with `paymentId` / `orderId` /
  `signature` — backend **must verify the signature** before granting premium.
- **Stripe:** the live flow redirects to `checkoutUrl`; confirmation happens via the
  Stripe **webhook**, after which the user returns premium. (`/subscribe` is the
  mock/Razorpay path.)

**`/cancel`** ends the active membership and returns the user with `isPremium: false`
and `membership: null`.

### Shapes

`Membership` = `{ plan, billing, gateway, planLabel, price, status, startedAt, renewsAt, stats }`
- `status` ∈ `active | canceled | expired`
- `startedAt`, `renewsAt` — ISO‑8601 timestamps
- `stats` = `{ read, saved, shared }` — counts shown on the Active view
  (premium ideas read / saved / shared)

> **User shape gain:** all four endpoints return `{ user }` where `User` now also
> carries `isPremium: boolean` and `membership: Membership | null`. The frontend
> persists this via `login(user, token)` — `isPremium` flips the Membership page to
> the Active status view and unlocks premium content (§3 `/ideas/premium`).

**Gaps for the backend to close:**
1. Implement the four endpoints above; verify the Razorpay signature server-side.
2. Add a Stripe webhook to confirm async payments and set `isPremium`/`membership`.
3. Add `isPremium` + `membership` to the `User` returned by **all** auth/user
   endpoints (§1, §2 `/me`), not just payment — so a returning user's premium state
   is correct on login/refresh, not only right after purchase.
4. Populate `membership.stats` from real engagement data (currently mock placeholders).

---

## 9. Messaging / DM ✅  `/api/messages`  — frontend: `src/api/messagingApi.jsx`

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/conversations` | — | `ConversationDTO[]` |
| GET | `/conversations/{id}` | — | `ConversationDTO` |
| POST | `/conversations` | `{ userId }` | `ConversationDTO` |
| GET | `/conversations/{id}/messages` | — | `MessageDTO[]` |
| POST | `/conversations/{id}/messages` | `{ type, content }` | `MessageDTO` |
| POST | `/messages/{id}/react` ✅ | `{ emoji }` | `MessageDTO` (toggles; same emoji clears) |
| DELETE | `/messages/{id}?scope=me\|everyone` ✅ | — | `{ message }` |
| GET | `/contacts` | — | `UserDTO[]` |
| POST | `/upload/image` · `/upload/voice` · `/upload/file` ✅ | multipart `file` | `{ url }` |
| POST | `/share-post` | `{ postId, title, userIds[] }` | `{ shared, count }` |

`MessageDTO` = `{ id, conversationId, senderId, senderName, senderAvatar, type, content, isRead, reaction, createdAt }`
- `type` ∈ `TEXT | IMAGE | VOICE | FILE`. `content` = text for TEXT, else the R2 URL.
- `reaction` = the **viewing** user's emoji on this message (null if none); one emoji per user.
- **Delete:** `everyone` is sender-only (hard delete); `me` hides it just for the caller
  (per-user `deletedFor` set, filtered out of `GET …/messages`).
- **Forward** reuses `POST …/messages` per target conversation (client-side fan-out).

**Realtime:** new messages push over STOMP `/user/queue/messages` (sender gets no echo).
Reactions and deletes are **not** pushed yet — the other party sees them on next load.

**Still missing in backend (frontend mock/stub or 404):** message **Requests** inbox
(`/requests`, accept/decline), **block**/**report** users, **delete conversation**
(`DELETE /conversations/{id}`), and the `/active` rail (returns `[]`). These are wired
in `messagingApi.jsx` but have no backend route yet.

---


