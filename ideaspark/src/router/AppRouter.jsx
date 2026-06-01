// ══════════════════════════════════════════════════════════════════════════
// File: src/router/AppRouter.jsx
// Make sure Login is imported and routed correctly.
// If your file already has this, no changes needed — just verify these
// 3 lines exist:
// ══════════════════════════════════════════════════════════════════════════

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import Welcome         from '../pages/Welcome';
import Login           from '../pages/Login';           // ← THIS LINE MUST EXIST
import Register        from '../pages/Register';
import VerifyOtp       from '../pages/VerifyOtp';
import SelectInterests from '../pages/SelectInterests';
import FollowCreators  from '../pages/FollowCreators';
import Home            from '../pages/Home';
import AddIdea         from '../pages/AddIdea';
import Premium         from '../pages/Premium';
import Membership      from '../pages/Membership';
import Search          from '../pages/Search';
import Profile         from '../pages/Profile';
import EditProfile     from '../pages/EditProfile';
import SavedIdeas      from '../pages/SavedIdeas';
import Settings        from '../pages/Settings';

// ── Protected route wrapper ─────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

// ── Redirect logged-in users away from auth pages ───────────────────────────
function PublicOnly({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/home" replace /> : children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/"          element={<Welcome />} />
        <Route path="/login"     element={<PublicOnly><Login /></PublicOnly>} />       {/* ← LOGIN ROUTE */}
        <Route path="/register"  element={<PublicOnly><Register /></PublicOnly>} />

        {/* Onboarding (protected) — Register → OTP → Interests → Follow → Home */}
        <Route path="/verify-otp"       element={<PrivateRoute><VerifyOtp /></PrivateRoute>} />
        <Route path="/select-interests" element={<PrivateRoute><SelectInterests /></PrivateRoute>} />
        <Route path="/follow-creators"  element={<PrivateRoute><FollowCreators /></PrivateRoute>} />

        {/* Protected routes */}
        <Route path="/home"             element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/add-idea"         element={<PrivateRoute><AddIdea /></PrivateRoute>} />
        <Route path="/premium"          element={<PrivateRoute><Premium /></PrivateRoute>} />
        <Route path="/membership"       element={<PrivateRoute><Membership /></PrivateRoute>} />
        <Route path="/search"           element={<PrivateRoute><Search /></PrivateRoute>} />
        <Route path="/profile"          element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/edit-profile"     element={<PrivateRoute><EditProfile /></PrivateRoute>} />
        <Route path="/saved-ideas"      element={<PrivateRoute><SavedIdeas /></PrivateRoute>} />
        <Route path="/settings"         element={<PrivateRoute><Settings /></PrivateRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
