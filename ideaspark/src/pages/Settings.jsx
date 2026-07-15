import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/common/Icon";
import {
  deleteAccount,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  fetchPrivacyPreferences,
  updatePrivacyPreferences,
} from "../api/userApi";
import { fetchMyFeedback, submitFeedback } from "../api/feedbackApi";

const Toggle = ({ value, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    onClick={() => onChange(!value)}
    className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 shrink-0
      ${value ? "bg-[#1565C0]" : "bg-[#CBD5E1]"}`}
  >
    <span
      className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200
        ${value ? "translate-x-[22px]" : "translate-x-0.5"}`}
    />
  </button>
);

// 5-star rating input for the Feedback popup. Renders its own SVGs (rather
// than the shared <Icon>, which hardcodes fill="none") so each star can be
// filled solid up to `value` (or up to the hovered star while hovering).
const StarRating = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="radiogroup"
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="active:scale-90 transition-transform"
          >
            <svg
              className={`w-9 h-9 transition-colors ${filled ? "text-[#F59E0B]" : "text-[#CBD5E1]"}`}
              viewBox="0 0 24 24"
              fill={filled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5z"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isGoogleUser = user?.authProvider === "google";

  const [notifs, setNotifs] = useState({
    newIdeas: true,
    likes: true,
    comments: true,
  });
  const [privacy, setPrivacy] = useState({
    showActivity: true,
  });
  const [deleting, setDeleting] = useState(false);

  // Load the user's saved notification preferences (defaults above are just
  // the ON-by-default fallback shown while this is in flight / if it fails).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await fetchNotificationPreferences();
        if (!cancelled && data) {
          setNotifs({
            newIdeas: data.newIdeas ?? true,
            likes: data.likes ?? true,
            comments: data.comments ?? true,
          });
        }
      } catch (err) {
        console.error(
          "[settings] failed to load notification preferences",
          err,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Optimistically flip a toggle, persist it, and roll back on failure.
  const toggleNotifPref = (key, value) => {
    const previous = notifs;
    setNotifs({ ...notifs, [key]: value });
    updateNotificationPreferences({ ...notifs, [key]: value }).catch((err) => {
      console.error("[settings] failed to save notification preference", err);
      setNotifs(previous);
    });
  };

  // Load the user's saved Activity Status preference.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await fetchPrivacyPreferences();
        if (!cancelled && data) {
          setPrivacy((p) => ({
            ...p,
            showActivity: data.showActivityStatus ?? true,
          }));
        }
      } catch (err) {
        console.error("[settings] failed to load privacy preferences", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Optimistically flip Activity Status, persist it, and roll back on failure.
  const toggleActivityStatus = (value) => {
    const previous = privacy;
    setPrivacy({ ...privacy, showActivity: value });
    updatePrivacyPreferences({ showActivityStatus: value }).catch((err) => {
      console.error(
        "[settings] failed to save activity status preference",
        err,
      );
      setPrivacy(previous);
    });
  };

  // Delete-account confirmation modal state.
  const [showDelete, setShowDelete] = useState(false);
  const [deletePwd, setDeletePwd] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Contact Support popup state.
  const [showSupport, setShowSupport] = useState(false);
  const SUPPORT_PHONE = "+91 9994586462";
  const SUPPORT_PHONE_TEL = "+919994586462";
  const SUPPORT_EMAIL = "contact@vrutsasolutions.com";

  // Feedback popup state (Settings > Support > Feedback). `feedbackGiven`
  // is null while loading, then a feedback object once submitted (ever),
  // or false if this account hasn't given feedback yet — that null/false
  // split keeps the Support row from flashing "Completed" before the
  // GET /api/feedback/me check resolves.
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackReview, setFeedbackReview] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await fetchMyFeedback();
        if (!cancelled) setFeedbackGiven(data || false);
      } catch (err) {
        console.error("[settings] failed to load feedback status", err);
        if (!cancelled) setFeedbackGiven(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const openDeleteModal = () => {
    setDeletePwd("");
    setDeleteError("");
    setShowDelete(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setShowDelete(false);
  };

  const confirmDeleteAccount = async () => {
    try {
      setDeleting(true);
      setDeleteError("");

      await deleteAccount(isGoogleUser ? null : deletePwd.trim());

      logout();
      navigate("/");
    } catch (err) {
      setDeleteError(
        err?.response?.data?.message ||
          "Failed to delete account. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const openFeedbackModal = () => {
    if (feedbackGiven) return; // one-time — already submitted, can't reopen
    setFeedbackRating(0);
    setFeedbackReview("");
    setFeedbackError("");
    setShowFeedback(true);
  };

  const closeFeedbackModal = () => {
    if (submittingFeedback) return;
    setShowFeedback(false);
  };

  const handleSubmitFeedback = async () => {
    if (feedbackRating < 1) {
      setFeedbackError("Please select a star rating.");
      return;
    }
    try {
      setSubmittingFeedback(true);
      setFeedbackError("");
      const { data } = await submitFeedback({
        rating: feedbackRating,
        review: feedbackReview.trim(),
      });
      setFeedbackGiven(data);
      setShowFeedback(false);
    } catch (err) {
      setFeedbackError(
        err?.response?.data?.message ||
          "Failed to submit feedback. Please try again.",
      );
    } finally {
      setSubmittingFeedback(false);
    }
  };
  const Section = ({ title, children }) => (
    <div className="mb-6">
      <h2 className="text-[#90A4AE] text-xs font-semibold uppercase tracking-widest px-4 mb-2">
        {title}
      </h2>
      <div className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl overflow-hidden card-hover">
        {children}
      </div>
    </div>
  );

  const Row = ({ icon, label, sublabel, right, onClick, danger }) => (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-4 border-b border-[#BBDEFB] last:border-0 drawer-item-hover
      ${onClick && !right ? "cursor-pointer active:bg-[#BBDEFB]/50" : ""}`}
    >
      <span className="w-7 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-medium ${danger ? "text-red-500" : "text-[#1565C0]"}`}
        >
          {label}
        </div>
        {sublabel && (
          <div className="text-xs text-[#90A4AE] mt-0.5">{sublabel}</div>
        )}
      </div>
      {right ||
        (onClick && !right ? (
          <svg
            className="w-4 h-4 text-[#BBDEFB]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        ) : null)}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-24">
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 py-4 flex items-center gap-3 relative overflow-hidden">
        <div className="pointer-events-none absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
        <div className="pointer-events-none absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-white font-bold text-lg">Settings</h1>
      </header>

      <div className="bg-[#1565C0]">
        <div className="flex items-center gap-4 px-4 py-5 bg-[#1565C0]">
          <div className="w-14 h-14 rounded-2xl bg-[#BBDEFB] flex items-center justify-center text-[#1565C0] text-2xl font-bold shrink-0 overflow-hidden">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user?.name || "Profile"}
                className="w-full h-full object-cover"
              />
            ) : (
              user?.name?.[0]?.toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold truncate">
              {user?.name}
            </div>
            <div className="text-blue-200 text-xs truncate">{user?.email}</div>
          </div>
          <button
            onClick={() => navigate("/edit-profile")}
            className="text-white text-xs font-medium border border-blue-300/40 px-3 py-1.5 rounded-2xl hover:bg-white/10 transition btn-hover"
          >
            Edit
          </button>
        </div>

        <div className="bg-white rounded-t-[32px] pt-5 px-0">
          <Section title="Account">
            <Row
              icon={<Icon name="user" className="w-5 h-5 text-[#1565C0]" />}
              label="Edit Profile"
              onClick={() => navigate("/edit-profile")}
            />
            <Row
              icon={<Icon name="gem" className="w-5 h-5 text-[#7C3AED]" />}
              label="Membership"
              sublabel={
                user?.isPremium ? "Active Premium · Verified" : "Free plan"
              }
              right={
                user?.isPremium ? (
                  <span className="text-[#10B981] text-xs font-semibold">
                    Verified ✓
                  </span>
                ) : undefined
              }
              onClick={() => navigate("/membership")}
            />
            {user?.isPremium && (
              <Row
                icon={
                  <svg
                    className="w-5 h-5 text-[#1565C0]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                }
                label="My Subscription"
                sublabel="Plan details · Billing history · Cancel"
                onClick={() => navigate("/account/subscription")}
              />
            )}
            <Row
              icon={<Icon name="bookmark" className="w-5 h-5 text-[#10B981]" />}
              label="Saved Ideas"
              onClick={() => navigate("/saved-ideas")}
            />
          </Section>

          <Section title="Notifications">
            <Row
              icon={
                <Icon name="lightbulb" className="w-5 h-5 text-[#F59E0B]" />
              }
              label="New Idea Alerts"
              sublabel="When creators you follow post"
              right={
                <Toggle
                  value={notifs.newIdeas}
                  onChange={(v) => toggleNotifPref("newIdeas", v)}
                />
              }
            />
            <Row
              icon={<Icon name="heart" className="w-5 h-5 text-[#EF4444]" />}
              label="Likes"
              sublabel="When someone likes your idea"
              right={
                <Toggle
                  value={notifs.likes}
                  onChange={(v) => toggleNotifPref("likes", v)}
                />
              }
            />
            <Row
              icon={
                <Icon
                  name="message-square"
                  className="w-5 h-5 text-[#3B82F6]"
                />
              }
              label="Comments"
              sublabel="When someone comments"
              right={
                <Toggle
                  value={notifs.comments}
                  onChange={(v) => toggleNotifPref("comments", v)}
                />
              }
            />
          </Section>

          <Section title="Privacy">
            <Row
              icon={<Icon name="activity" className="w-5 h-5 text-[#3347E8]" />}
              label="Activity Status"
              sublabel="Show when you're active"
              right={
                <Toggle
                  value={privacy.showActivity}
                  onChange={toggleActivityStatus}
                />
              }
            />
            <Row
              icon={<Icon name="shield" className="w-5 h-5 text-[#EF4444]" />}
              label="Blocked Users"
              sublabel="Manage people you've blocked"
              onClick={() => navigate("/settings/blocked-users")}
            />
          </Section>

          <Section title="Support">
            <Row
              icon={
                <Icon name="file-text" className="w-5 h-5 text-[#546E7A]" />
              }
              label="Terms of Service"
              onClick={() => navigate("/terms")}
            />
            <Row
              icon={<Icon name="lock" className="w-5 h-5 text-[#546E7A]" />}
              label="Privacy Policy"
              onClick={() => navigate("/privacy")}
            />
            <Row
              icon={
                <Icon name="dollar-sign" className="w-5 h-5 text-[#546E7A]" />
              }
              label="Refund Policy"
              onClick={() => navigate("/refund")}
            />
            <Row
              icon={
                <Icon name="headphones" className="w-5 h-5 text-[#546E7A]" />
              }
              label="Contact Support"
              onClick={() => setShowSupport(true)}
            />
            <Row
              icon={<Icon name="star" className="w-5 h-5 text-[#F59E0B]" />}
              label="Feedback"
              sublabel={feedbackGiven ? undefined : "Rate your experience"}
              right={
                feedbackGiven ? (
                  <span className="text-[#10B981] text-xs font-semibold">
                    Completed ✓
                  </span>
                ) : undefined
              }
              onClick={feedbackGiven ? undefined : openFeedbackModal}
            />
          </Section>

          <Section title="Danger Zone">
            <Row
              icon={<Icon name="log-out" className="w-5 h-5 text-red-500" />}
              label="Logout"
              danger
              onClick={handleLogout}
            />
            <Row
              icon={<Icon name="trash" className="w-5 h-5 text-red-500" />}
              label="Delete Account"
              sublabel="Permanently delete your account and data"
              danger
              onClick={openDeleteModal}
            />
          </Section>

          <p className="text-center text-[#90A4AE] text-xs pb-6">
            SoCreate v1.0.0
          </p>
        </div>
      </div>

      {showDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
          onClick={closeDeleteModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div
            className="w-full max-w-sm bg-[#F0F6FF] border-2 border-[#1565C0] rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-[#FEE2E2] flex items-center justify-center mb-4">
              <Icon name="alert-triangle" className="w-5 h-5 text-[#DC2626]" />
            </div>

            <h2
              id="delete-account-title"
              className="text-[#0D2137] text-lg font-bold"
            >
              Delete your account
            </h2>
            <p className="text-[#546E7A] text-sm mt-1.5 leading-relaxed">
              This will permanently delete your account and all associated data.
              This can't be undone.
            </p>

            {!isGoogleUser && (
              <>
                <label
                  htmlFor="delete-password"
                  className="block text-[#90A4AE] text-xs font-medium mt-5 mb-2"
                >
                  Confirm your password
                </label>

                <input
                  id="delete-password"
                  type="password"
                  autoFocus
                  value={deletePwd}
                  onChange={(e) => {
                    setDeletePwd(e.target.value);
                    if (deleteError) setDeleteError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmDeleteAccount();
                  }}
                  placeholder="••••••••"
                  className="w-full bg-white border border-[#BBDEFB] rounded-xl px-4 py-3 text-[#0D2137] text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20 focus:border-[#1565C0] transition"
                />
              </>
            )}

            {deleteError && (
              <p className="text-red-500 text-xs mt-2">{deleteError}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="flex-1 bg-white border border-[#CBD5E1] text-[#0D2137] font-semibold py-3 rounded-xl hover:bg-[#F8FAFF] active:scale-95 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAccount}
                disabled={deleting}
                className="flex-1 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] font-semibold py-3 rounded-xl hover:bg-[#FEE2E2] active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && (
                  <span className="w-4 h-4 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin" />
                )}
                {deleting ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
          onClick={closeFeedbackModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          <div
            className="w-full max-w-sm bg-[#F0F6FF] border-2 border-[#1565C0] rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-[#FFF3E0] flex items-center justify-center mb-4 mx-auto">
              <Icon name="star" className="w-5 h-5 text-[#F59E0B]" />
            </div>

            <h2
              id="feedback-title"
              className="text-[#0D2137] text-lg font-bold text-center"
            >
              Rate Your Experience
            </h2>
            <p className="text-[#546E7A] text-sm mt-1.5 text-center leading-relaxed">
              Your feedback helps us improve SoCreate. This can only be
              submitted once, so take your time.
            </p>

            <div className="mt-5">
              <StarRating value={feedbackRating} onChange={setFeedbackRating} />
            </div>

            <label
              htmlFor="feedback-review"
              className="block text-[#90A4AE] text-xs font-medium mt-5 mb-2"
            >
              Experience, changes, or fixes you'd like to see (optional)
            </label>
            <textarea
              id="feedback-review"
              rows={4}
              value={feedbackReview}
              onChange={(e) => setFeedbackReview(e.target.value)}
              placeholder="Tell us what's working, what's not, and what you'd like to see next..."
              className="w-full bg-white border border-[#BBDEFB] rounded-xl px-4 py-3 text-[#0D2137] text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20 focus:border-[#1565C0] transition resize-none"
            />

            {feedbackError && (
              <p className="text-red-500 text-xs mt-2">{feedbackError}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={closeFeedbackModal}
                disabled={submittingFeedback}
                className="flex-1 bg-white border border-[#CBD5E1] text-[#0D2137] font-semibold py-3 rounded-xl hover:bg-[#F8FAFF] active:scale-95 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitFeedback}
                disabled={submittingFeedback || feedbackRating < 1}
                className="flex-1 bg-[#1565C0] text-white font-semibold py-3 rounded-xl hover:bg-[#0D47A1] active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingFeedback && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {submittingFeedback ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSupport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setShowSupport(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-title"
        >
          <div
            className="w-full max-w-sm bg-[#F0F6FF] rounded-2xl shadow-2xl p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="support-title"
              className="text-[#0D2137] text-2xl font-bold text-center mb-6"
            >
              Contact Support
            </h2>

            <p className="text-[#0D2137] text-base font-medium mb-5">
              Need help?
            </p>

            <div className="space-y-5 mb-6">
              <a
                href={`tel:${SUPPORT_PHONE_TEL}`}
                className="flex items-center gap-3 text-[#0D2137] text-base hover:opacity-70 transition"
              >
                <Icon
                  name="phone"
                  className="w-5 h-5 text-[#546E7A] shrink-0"
                />
                <span>{SUPPORT_PHONE}</span>
              </a>

              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center gap-3 text-[#0D2137] text-base hover:opacity-70 transition"
              >
                <Icon name="mail" className="w-5 h-5 text-[#546E7A] shrink-0" />
                <span>{SUPPORT_EMAIL}</span>
              </a>
            </div>

            <div className="text-[#0D2137] text-base mb-8">
              <p>Mon - Sun</p>
              <p>9:00 AM - 6:00 PM</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSupport(false)}
                className="flex-1 bg-white border border-[#CBD5E1] text-[#0D2137] font-semibold py-3 rounded-xl hover:bg-[#F8FAFF] active:scale-95 transition"
              >
                Close
              </button>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex-1 text-center bg-[#1565C0] hover:bg-[#0D47A1] text-white font-semibold py-3 rounded-xl active:scale-95 transition"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
