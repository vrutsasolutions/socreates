import { createContext, useContext, useState } from 'react'
import { unregisterDeviceToken } from '../api/pushNotificationApi'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user')) || null
  )

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

export const useAuth = () => useContext(AuthContext)
