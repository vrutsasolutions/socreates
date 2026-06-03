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
| POST | `/send-otp` ⏳ | `{ email }` | `{ message }` |
| POST | `/verify-otp` ⏳ | `{ email, code }` | `{ verified: true }` |

`user` = `{ id, name, email, bio?, avatarUrl?, interests?[] }`

OTP ⏳ under development . Frontend: `src/api/authApi.jsx`,
mock-backed via `USE_MOCK.otp` (mock accepts any 6-digit code, e.g. `123456`).
Onboarding order: **Register → /verify-otp → /select-interests → /follow-creators → /home**.

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

---

## 3. Ideas ✅  `/api/ideas`

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/?sort=&category=&page=` | — | `Idea[]` |
| GET | `/premium` | — | `Idea[]` |
| GET | `/mine` | — | `Idea[]` |
| GET | `/saved` | — | `Idea[]` |
| GET | `/{id}` | — | `Idea` |
| POST | `/` | multipart: `idea` (JSON blob) + optional `image` (file) | `Idea` |
| DELETE | `/{id}` | — | 204 |
| POST/DELETE | `/{id}/save` | — | 204 |
| POST/DELETE | `/{id}/like` | — | 204 |

`Idea` = `{ id, title, description, category, isPremium, likeCount,
creatorName, createdAt, imageUrl, savedByCurrentUser }`

> Note: `imageUrl` is the Cloudflare delivery URL once image storage is live (§6).

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


