import { useState } from 'react'
import AppRouter from './router/AppRouter'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import SplashScreen from './components/common/SplashScreen'

// Show the launch splash once per browser session (i.e. when the app is
// opened), not on every internal route change or in-session refresh.
const SPLASH_KEY = 'socreates_splash_shown'

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    try { return !sessionStorage.getItem(SPLASH_KEY) }
    catch { return true }
  })

  const finishSplash = () => {
    try { sessionStorage.setItem(SPLASH_KEY, '1') } catch { /* ignore */ }
    setShowSplash(false)
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        {showSplash && <SplashScreen onFinish={finishSplash} />}
        <AppRouter />
      </NotificationProvider>
    </AuthProvider>
  )
}
