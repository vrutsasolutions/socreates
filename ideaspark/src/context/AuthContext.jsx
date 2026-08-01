import { createContext, useContext, useEffect, useState } from 'react'
import { unregisterDeviceToken } from '../api/pushNotificationApi'
import { fetchMe } from '../api/userApi'

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
  useEffect(() => {
    if (!localStorage.getItem('token')) return
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
        // Offline / expired token / server hiccup — keep the cached user
        // rather than logging them out; axios interceptors elsewhere
        // already handle hard 401s.
        console.error('[auth] failed to refresh user from /users/me', err)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('token', token)
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