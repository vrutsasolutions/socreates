// ══════════════════════════════════════════════════════════════════════════
// File: src/router/AppRouter.jsx
// Make sure Login is imported and routed correctly.
// If your file already has this, no changes needed — just verify these
// 3 lines exist:
// ══════════════════════════════════════════════════════════════════════════

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationToasts from "../components/common/NotificationToasts";

import Welcome from "../pages/Welcome";
import Login from "../pages/Login";
import Register from "../pages/Register";
import VerifyOtp from "../pages/VerifyOtp";
import SelectInterests from "../pages/SelectInterests";
import FollowCreators from "../pages/FollowCreators";
import Home from "../pages/Home";
import Inbox from "../pages/Inbox";
import ForgotPassword from "../pages/ForgotPassword";
import Chat from "../pages/Chat";
import ChatProfile from "../pages/ChatProfile";
import Requests from "../pages/Requests";
import NewChat from "../pages/NewChat";
import ChatMedia from "../pages/ChatMedia";
import AddIdea from "../pages/AddIdea";
import Premium from "../pages/Premium";
import Membership from "../pages/Membership";
import Checkout from "../pages/Checkout";
import MembershipSuccess from "../pages/MembershipSuccess";
import MembershipFailed from "../pages/MembershipFailed";
import CreatorDashboard from "../pages/CreatorDashboard";
import CreatorPro from "../pages/CreatorPro";
import PayoutSetup from "../pages/PayoutSetup";
import PayoutSettings from "../pages/PayoutSettings";
import PayoutDetail from "../pages/PayoutDetail";
import Search from "../pages/Search";
import Profile from "../pages/Profile";
import UserProfile from "../pages/UserProfile";
import IdeaDetail from "../pages/IdeaDetail";
import PremiumDetail from "../pages/PremiumDetail";
import GetVerified from "../pages/GetVerified";
import CreatePremiumIdea from "../pages/CreatePremiumIdea";
import AccountSubscription from "../pages/AccountSubscription";
import EditProfile from "../pages/EditProfile";
import FollowList from "../pages/FollowList";
import SavedIdeas from "../pages/SavedIdeas";
import Settings from "../pages/Settings";
import TermsOfService from "../pages/TermsOfService";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import RefundPolicy from "../pages/RefundPolicy";
import AIAssistant from "../pages/AIAssistant";
import ImageEditor from "../pages/ImageEditor";
import BlockedUsers from "../pages/BlockedUsers";


function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/home" replace /> : children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <NotificationToasts />

      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />

        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/select-interests" element={<PrivateRoute><SelectInterests /></PrivateRoute>} />
        <Route path="/follow-creators" element={<PrivateRoute><FollowCreators /></PrivateRoute>} />
        <Route path="/get-verified" element={<PrivateRoute><GetVerified /></PrivateRoute>} />

        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/assistant" element={<PrivateRoute><AIAssistant /></PrivateRoute>} />

        <Route path="/messages" element={<PrivateRoute><Inbox /></PrivateRoute>} />
        <Route path="/messages/requests" element={<PrivateRoute><Requests /></PrivateRoute>} />
        <Route path="/messages/new" element={<PrivateRoute><NewChat /></PrivateRoute>} />
        <Route path="/messages/:id/profile" element={<PrivateRoute><ChatProfile /></PrivateRoute>} />
        <Route path="/messages/:id" element={<PrivateRoute><Chat /></PrivateRoute>} />

        <Route path="/add-idea" element={<PrivateRoute><AddIdea /></PrivateRoute>} />
        <Route path="/edit-images" element={<PrivateRoute><ImageEditor /></PrivateRoute>} />
        <Route path="/premium" element={<PrivateRoute><Premium /></PrivateRoute>} />
        <Route path="/premium/:id" element={<PrivateRoute><PremiumDetail /></PrivateRoute>} />
        <Route path="/membership" element={<PrivateRoute><Membership /></PrivateRoute>} />
        <Route path="/membership/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
        <Route path="/membership/success" element={<PrivateRoute><MembershipSuccess /></PrivateRoute>} />
        <Route path="/membership/failure" element={<PrivateRoute><MembershipFailed /></PrivateRoute>} />
        <Route path="/account/subscription" element={<PrivateRoute><AccountSubscription /></PrivateRoute>} />
        

        <Route path="/creator-dashboard" element={<PrivateRoute><CreatorDashboard /></PrivateRoute>} />
        <Route path="/creator-pro" element={<PrivateRoute><CreatorPro /></PrivateRoute>} />
        <Route path="/payout-setup" element={<PrivateRoute><PayoutSetup /></PrivateRoute>} />
        <Route path="/payout-settings" element={<PrivateRoute><PayoutSettings /></PrivateRoute>} />
        <Route path="/payout-detail" element={<PrivateRoute><PayoutDetail /></PrivateRoute>} />
        
        <Route path="/messages/:id/media" element={<PrivateRoute><ChatMedia /></PrivateRoute>}/>

        <Route path="/search" element={<PrivateRoute><Search /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/edit-profile" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
        <Route path="/profile/follows" element={<PrivateRoute><FollowList /></PrivateRoute>} />
        <Route path="/users/:id" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
        <Route path="/saved-ideas" element={<PrivateRoute><SavedIdeas /></PrivateRoute>} />
        <Route path="/ideas/:id" element={<PrivateRoute><IdeaDetail /></PrivateRoute>} />

        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/settings/blocked-users" element={<PrivateRoute><BlockedUsers /></PrivateRoute>} />

        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/refund" element={<RefundPolicy />} />
        <Route path="/create-premium" element={<PrivateRoute><CreatePremiumIdea /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
