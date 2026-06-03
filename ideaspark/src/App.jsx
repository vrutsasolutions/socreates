import AppRouter from './router/AppRouter'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppRouter />
      </NotificationProvider>
    </AuthProvider>
  )
}