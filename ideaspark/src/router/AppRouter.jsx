// ══════════════════════════════════════════════════════════════════════════
// File: src/router/AppRouter.jsx
// Make sure Login is imported and routed correctly.
// If your file already has this, no changes needed — just verify these
// 3 lines exist:
// ══════════════════════════════════════════════════════════════════════════

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationToasts from '../components/common/NotificationToasts';

import Welcome         from '../pages/Welcome';
import Login           from '../pages/Login';           // ← THIS LINE MUST EXIST
import Register        from '../pages/Register';
import VerifyOtp       from '../pages/VerifyOtp';
import SelectInterests from '../pages/SelectInterests';
import FollowCreators  from '../pages/FollowCreators';
import Home            from '../pages/Home';
import Inbox           from '../pages/Inbox';
import ForgotPassword from '../pages/ForgotPassword';
import Chat            from '../pages/Chat';
import ChatProfile     from '../pages/ChatProfile';
import Requests        from '../pages/Requests';
import NewChat         from '../pages/NewChat';
import AddIdea         from '../pages/AddIdea';
import Premium         from '../pages/Premium';
import Membership      from '../pages/Membership';
import MembershipSuccess from '../pages/MembershipSuccess';
import MembershipFailed  from '../pages/MembershipFailed';
import CreatorDashboard from '../pages/CreatorDashboard';
import CreatorPro       from '../pages/CreatorPro';
import Search          from '../pages/Search';
import Profile         from '../pages/Profile';
import UserProfile     from '../pages/UserProfile';
import IdeaDetail      from '../pages/IdeaDetail';
import PremiumDetail    from '../pages/PremiumDetail';
import ProfileVerification from '../pages/ProfileVerification';
import CreatePremiumIdea  from '../pages/CreatePremiumIdea';
import EditProfile     from '../pages/EditProfile';
import FollowList      from '../pages/FollowList';
import SavedIdeas      from '../pages/SavedIdeas';
import Settings        from '../pages/Settings';
import AIAssistant     from '../pages/AIAssistant';

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
      {/* Global live-notification toasts (render above all routes) */}
      <NotificationToasts />
      <Routes>
        {/* Public routes */}
        <Route path="/"          element={<Welcome />} />
        <Route path="/login"     element={<PublicOnly><Login /></PublicOnly>} />       {/* ← LOGIN ROUTE */}
        <Route path="/register"  element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />

        {/* Onboarding (protected) — Register → OTP → Interests → Follow → Home */}
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/select-interests" element={<PrivateRoute><SelectInterests /></PrivateRoute>} />
        <Route path="/follow-creators"  element={<PrivateRoute><FollowCreators /></PrivateRoute>} />

        {/* Protected routes */}
        <Route path="/home"             element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/assistant"        element={<PrivateRoute><AIAssistant /></PrivateRoute>} />

        {/* Messaging (figma "Messaging System UI") — static paths before :id.
            Messaging is free for everyone; per-conversation limits with verified
            creators are enforced inside the Chat page, not by route gating. */}
        <Route path="/messages"          element={<PrivateRoute><Inbox /></PrivateRoute>} />
        <Route path="/messages/requests" element={<PrivateRoute><Requests /></PrivateRoute>} />
        <Route path="/messages/new"      element={<PrivateRoute><NewChat /></PrivateRoute>} />
        <Route path="/messages/:id/profile" element={<PrivateRoute><ChatProfile /></PrivateRoute>} />
        <Route path="/messages/:id"      element={<PrivateRoute><Chat /></PrivateRoute>} />

        <Route path="/add-idea"         element={<PrivateRoute><AddIdea /></PrivateRoute>} />
        <Route path="/premium"          element={<PrivateRoute><Premium /></PrivateRoute>} />
        <Route path="/membership"         element={<PrivateRoute><Membership /></PrivateRoute>} />
        <Route path="/membership/success" element={<PrivateRoute><MembershipSuccess /></PrivateRoute>} />
        <Route path="/membership/failure" element={<PrivateRoute><MembershipFailed /></PrivateRoute>} />
        <Route path="/creator-dashboard" element={<PrivateRoute><CreatorDashboard /></PrivateRoute>} />
        <Route path="/creator-pro"       element={<PrivateRoute><CreatorPro /></PrivateRoute>} />
        <Route path="/search"           element={<PrivateRoute><Search /></PrivateRoute>} />
        <Route path="/profile"          element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/edit-profile"     element={<PrivateRoute><EditProfile /></PrivateRoute>} />
        <Route path="/profile/follows"  element={<PrivateRoute><FollowList /></PrivateRoute>} />
        <Route path="/users/:id"        element={<PrivateRoute><UserProfile /></PrivateRoute>} />
        <Route path="/saved-ideas"      element={<PrivateRoute><SavedIdeas /></PrivateRoute>} />
        <Route path="/ideas/:id"        element={<PrivateRoute><IdeaDetail /></PrivateRoute>} />
        <Route path="/premium/:id"      element={<PrivateRoute><PremiumDetail /></PrivateRoute>} />
        <Route path="/settings"         element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/verify-profile"   element={<PrivateRoute><ProfileVerification /></PrivateRoute>} />
        <Route path="/create-premium"   element={<PrivateRoute><CreatePremiumIdea /></PrivateRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
