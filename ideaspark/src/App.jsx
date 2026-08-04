import { useState } from 'react'
import AppRouter from './router/AppRouter'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import SplashScreen from './components/common/SplashScreen'
import ErrorBoundary from './components/common/ErrorBoundary'

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

  // Log app mount for debugging
  if (typeof window !== 'undefined') {
    console.log('[app] App component mounted')
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        {showSplash && <SplashScreen onFinish={finishSplash} />}
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </NotificationProvider>
    </AuthProvider>
  )
}
