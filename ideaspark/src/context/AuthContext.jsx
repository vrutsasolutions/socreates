import { createContext, useContext, useEffect, useState } from 'react'
import { unregisterDeviceToken } from '../api/pushNotificationApi'
import { fetchMe } from '../api/userApi'
import { logoutUser } from '../api/authApi'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user')) || null
  )

  // The cached `user` in localStorage is only ever written at login/payment
  // time and never touched again — so if membership state changes on the
  // server after that (a payment's webhook lands a few seconds late, a
  // subscription renews, an admin comps an account, etc.) the app is stuck
  // showing stale data until the user manually logs out and back in. This
  // was confirmed as the cause of "I paid ₹199 but the app still shows me
  // as free" — the DB was correct, the cached client copy just never
  // resynced. Re-fetch the authoritative user on every app load and merge
  // it in (merge, not replace, so we don't clobber any local-only fields).
  //
  // The JWT itself now lives only in an httpOnly cookie (see axiosInstance's
  // withCredentials + the backend's CookieUtil) — there's no localStorage
  // token to check anymore before deciding whether to call fetchMe(). We
  // always attempt it; a logged-out visitor just gets a 401 here, which is
  // silently swallowed below the same as any other failure (axios's
  // response interceptor only force-logs-out on a 401 from an
  // already-logged-in state, not from this best-effort probe).
  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then(({ data }) => {
        if (cancelled) return
        setUser((prev) => {
          const next = { ...(prev || {}), ...data }
          localStorage.setItem('user', JSON.stringify(next))
          return next
        })
      })
      .catch((err) => {
        // Offline / no session / server hiccup — keep the cached user
        // rather than logging them out; axios interceptors elsewhere
        // already handle hard 401s for a session that WAS active.
        console.error('[auth] failed to refresh user from /users/me', err)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // `token` is only still passed by a couple of call sites for backward
  // compatibility (Capacitor native, which authenticates via the
  // Authorization header rather than the cookie) — the web app itself no
  // longer needs or stores it; the login/register/google endpoints already
  // set the httpOnly cookie server-side as part of that same response.
  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    // Best-effort: stop this device from receiving push notifications for
    // the account that's signing out. Fire-and-forget — a failure here
    // (e.g. offline) shouldn't block logout; the token will just linger
    // until FCM reports it invalid or the next device re-registers.
    const deviceToken = localStorage.getItem('fcm_device_token')
    if (deviceToken) {
      unregisterDeviceToken(deviceToken).catch((err) =>
        console.error('[logout] failed to unregister device token', err)
      )
    }

    // Also best-effort, and also fire-and-forget: this is what actually
    // revokes the token server-side (bumps tokenVersion — see
    // AuthController#logout) and clears the auth cookie. Previously this
    // endpoint didn't even exist, so "logging out" only ever cleared local
    // state; the token itself stayed valid on the server for its full 24h.
    // Clearing local state below doesn't wait on this — a slow/offline
    // logout call shouldn't keep the person stuck on a "logging out" screen.
    logoutUser().catch((err) =>
      console.error('[logout] failed to revoke session server-side', err)
    )

    localStorage.clear()
    setUser(null)
  }

  // Merge a partial patch into the current user and persist it.
  // Used for frontend-only state like profile verification.
  const updateUser = (patch) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...patch }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// This file colocates a context, its provider, and a hook — a very common
// and recommended React pattern, but it means the file exports more than
// just components, which react-refresh's strict rule flags. Splitting the
// hook into its own file would require updating every one of this app's
// many `useAuth` import sites, so we suppress the rule here instead.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)