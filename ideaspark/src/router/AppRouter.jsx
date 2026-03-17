import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Welcome        from '../pages/Welcome'
import Login          from '../pages/Login'
import Register       from '../pages/Register'
import SelectInterests from '../pages/SelectInterests'
import FollowCreators from '../pages/FollowCreators'
import Home           from '../pages/Home'
import AddIdea        from '../pages/AddIdea'
import Premium        from '../pages/Premium'
import PremiumDetail  from '../pages/PremiumDetail'
import Search         from '../pages/Search'
import Profile        from '../pages/Profile'
import EditProfile    from '../pages/EditProfile'
import Membership     from '../pages/Membership'
import SavedIdeas     from '../pages/SavedIdeas'
import Settings       from '../pages/Settings'

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { user } = useAuth()
  return !user ? children : <Navigate to="/home" replace />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                element={<Navigate to="/welcome" replace />} />
        <Route path="/welcome"         element={<PublicRoute><Welcome /></PublicRoute>} />
        <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/select-interests" element={<ProtectedRoute><SelectInterests /></ProtectedRoute>} />
        <Route path="/follow-creators" element={<ProtectedRoute><FollowCreators /></ProtectedRoute>} />
        <Route path="/home"            element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/add-idea"        element={<ProtectedRoute><AddIdea /></ProtectedRoute>} />
        <Route path="/premium"         element={<ProtectedRoute><Premium /></ProtectedRoute>} />
        <Route path="/premium/:id"     element={<ProtectedRoute><PremiumDetail /></ProtectedRoute>} />
        <Route path="/search"          element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/profile"         element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/edit-profile"    element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/membership"      element={<ProtectedRoute><Membership /></ProtectedRoute>} />
        <Route path="/saved"           element={<ProtectedRoute><SavedIdeas /></ProtectedRoute>} />
        <Route path="/settings"        element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*"                element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  )
}