// ════════════════════════════════════════════════════════════════════════
//  UserProfile  (public profile — view ANY user by id)
//  Reached from: follow notifications, follower/following lists, search.
//  Mirrors Profile.jsx's layout but for someone else's account:
//    • no Edit Profile / Settings
//    • Follow / Unfollow button instead
//    • only their published ideas (no Saved tab — that's private)
// ════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BottomNav from "../components/common/BottomNav.premium";
import IdeaCard from "../components/common/IdeaCard.premium";
import Icon from "../components/common/Icon";
import ProfileShareButton from "../components/common/ProfileShareButton";
import BanUserModal from "../components/common/BanUserModal";
import { useAuth } from "../context/AuthContext";
import {
  fetchUserById,
  fetchFollowStats,
  followUser,
  unfollowUser,
} from "../api/userApi";
import { fetchIdeasByUser } from "../api/ideaApi";

export default function UserProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user: me } = useAuth();

  const [profile, setProfile] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [followStats, setFollowStats] = useState({
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
    // Private-profile fields, all server-computed (see FollowStatsResponse):
    //   requestPending — I've asked to follow and they haven't answered
    //   isPublicProfile — false means private account
    //   canViewIdeas   — whether the idea grid should render at all
    requestPending: false,
    isPublicProfile: true,
    canViewIdeas: true,
  });
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  // null = ok | 'notfound' = user genuinely gone (404) | 'error' = load failed
  const [loadError, setLoadError] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);

  // If you land on your own id, just show the real (editable) profile instead.
  useEffect(() => {
    if (me?.id && id && me.id === id) {
      navigate("/profile", { replace: true });
    }
  }, [me?.id, id, navigate]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [{ data: userData }, { data: ideaData }, { data: statsData }] =
        await Promise.all([
          fetchUserById(id),
          fetchIdeasByUser(id).catch(() => ({ data: [] })),
          fetchFollowStats(id).catch(() => ({
            data: {
              followersCount: 0,
              followingCount: 0,
              isFollowing: false,
              requestPending: false,
              // Fail CLOSED on a stats error: assume private and hide the
              // grid rather than flashing a private account's ideas because
              // one request happened to fail. The ideas call is gated
              // server-side regardless, so this only affects what's drawn.
              isPublicProfile: false,
              canViewIdeas: false,
            },
          })),
        ]);
      setProfile(userData);
      setIdeas(ideaData);
      setFollowStats({
        followersCount: statsData?.followersCount ?? 0,
        followingCount: statsData?.followingCount ?? 0,
        // Defensive fallback to `following` — some API responses/older
        // caches may serialize the boolean under that key instead.
        isFollowing: Boolean(statsData?.isFollowing ?? statsData?.following),
        requestPending: Boolean(statsData?.requestPending),
        // ?? not || : an explicit false must survive, and only a genuinely
        // absent key should fall back to the permissive default.
        isPublicProfile: statsData?.isPublicProfile ?? true,
        canViewIdeas: statsData?.canViewIdeas ?? true,
      });
    } catch (err) {
      console.error("[UserProfile] failed to load", err);
      setProfile(null);
      // A 401/403 from an expired session is handled globally by the axios
      // response interceptor (redirect to /login), so it won't normally reach
      // here. Only a real 404 means the user is gone; anything else is a
      // transient load failure worth retrying.
      setLoadError(err?.response?.status === 404 ? "notfound" : "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // One handler covers all three button states — Follow / Requested /
  // Following — because the backend folds them into two endpoints: POST
  // follows or raises a request depending on the target's privacy, and
  // DELETE unfollows or withdraws a pending request, whichever applies.
  //
  // Not optimistic any more. Tapping Follow on a private account produces
  // "Requested", not "Following", and guessing wrong would flash the wrong
  // label plus a phantom +1 on the follower count. Instead the response's
  // `status` decides, and only then does the UI move.
  const toggleFollow = async () => {
    if (followBusy || loading) return;
    setFollowBusy(true);

    const { isFollowing, requestPending } = followStats;
    const undoing = isFollowing || requestPending;

    try {
      const { data } = undoing ? await unfollowUser(id) : await followUser(id);
      const status = data?.status;

      setFollowStats((prev) => {
        switch (status) {
          case "FOLLOWING":
            return {
              ...prev,
              isFollowing: true,
              requestPending: false,
              followersCount: prev.followersCount + (prev.isFollowing ? 0 : 1),
            };
          case "REQUESTED":
          case "ALREADY_REQUESTED":
            return { ...prev, isFollowing: false, requestPending: true };
          case "UNFOLLOWED":
            return {
              ...prev,
              isFollowing: false,
              requestPending: false,
              followersCount: Math.max(0, prev.followersCount - 1),
            };
          case "REQUEST_CANCELLED":
          case "NOT_FOLLOWING":
            return { ...prev, isFollowing: false, requestPending: false };
          case "ALREADY_FOLLOWING":
            return { ...prev, isFollowing: true, requestPending: false };
          default:
            return prev;
        }
      });

      // Going from not-following to following on a private account unlocks
      // the grid (when PRIVATE_PROFILE_SHOWS_IDEAS_TO_FOLLOWERS is on) — and
      // an approved follow changes what /api/ideas/by-user returns either
      // way, so re-fetch rather than trying to predict it client-side.
      if (status === "FOLLOWING") load();
    } catch (err) {
      console.error("[UserProfile] follow toggle failed", err);
    } finally {
      setFollowBusy(false);
    }
  };

  // Label + styling for the tri-state follow button.
  const followButton = followStats.isFollowing
    ? { label: "Following", icon: "check", subdued: true }
    : followStats.requestPending
      ? { label: "Requested", icon: "user", subdued: true }
      : { label: "Follow", icon: "user-plus", subdued: false };

  if (!loading && !profile) {
    const isNotFound = loadError === "notfound";
    return (
      <div className="min-h-screen bg-[#1565C0] flex flex-col">
        <div className="bg-white rounded-t-[32px] flex flex-col items-center justify-center flex-1 px-6 text-center py-20">
          <div className="mb-3 flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[#EAF2FF] border border-[#DBEAFE] flex items-center justify-center">
              <Icon
                name={isNotFound ? "user" : "alert-triangle"}
                className="w-8 h-8 text-[#1565C0]"
              />
            </div>
          </div>
          <p className="text-[#0D2137] font-semibold text-base">
            {isNotFound ? "User not found" : "Couldn't load profile"}
          </p>
          <p className="text-[#90A4AE] text-sm mt-1">
            {isNotFound
              ? "This profile doesn't exist or was removed."
              : "Something went wrong. Please try again."}
          </p>
          <div className="mt-5 flex items-center gap-2">
            {!isNotFound && (
              <button
                onClick={load}
                className="px-6 py-2.5 rounded-xl bg-[#1565C0] text-white text-sm font-semibold hover:bg-[#0D47A1] transition-colors shadow-sm"
              >
                Retry
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm ${
                isNotFound
                  ? "bg-[#1565C0] text-white hover:bg-[#0D47A1]"
                  : "bg-[#EAF2FF] text-[#1565C0] hover:bg-[#DBEAFE]"
              }`}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* HEADER — matches Profile.jsx */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <div className="flex items-center justify-between relative z-10">
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
          <h1 className="text-white font-bold text-lg">Profile</h1>
          {/* was a plain spacer to balance the back button — now the share
              button doubles as that balance, so the title stays centered */}
          <div className="w-9 h-9 flex items-center justify-center">
            {id && <ProfileShareButton userId={id} name={profile?.name} />}
          </div>
        </div>

        <div className="relative z-10 mt-6 flex justify-center">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-5 w-full max-w-sm text-center">
            <div className="flex justify-center">
              {loading ? (
                <div className="w-16 h-16 rounded-2xl bg-white/20 animate-pulse" />
              ) : profile?.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt={profile?.name || "Profile photo"}
                  className="w-16 h-16 rounded-2xl object-cover bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-[#1565C0] font-bold text-2xl">
                  {profile?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>

            <h2 className="text-white font-bold text-lg mt-3">
              {loading ? "\u00A0" : profile?.name}
            </h2>

            {profile?.premium && (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                <span className="inline-flex items-center gap-1 bg-[#FEF3C7] text-[#92400E] text-xs font-bold px-3 py-1 rounded-full">
                  <Icon name="star" className="w-3.5 h-3.5" />
                  Premium
                </span>
              </div>
            )}

            {!loading && (
              <p className="text-blue-200 text-sm">
                @{profile?.username || profile?.email?.split("@")[0]}
              </p>
            )}

            {profile?.bio && (
              <p className="text-blue-200 text-xs mt-3 leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] px-4 pt-6">
          {/* STATS */}
          <div className="flex text-center py-4 border-b border-[#BBDEFB]">
            <div className="flex-1">
              <div className="text-[#1565C0] font-bold">
                {followStats.followersCount}
              </div>
              <div className="text-xs text-[#90A4AE]">Followers</div>
            </div>
            <div className="flex-1">
              <div className="text-[#1565C0] font-bold">
                {followStats.followingCount}
              </div>
              <div className="text-xs text-[#90A4AE]">Following</div>
            </div>
            <div className="flex-1">
              <div className="text-[#1565C0] font-bold">
                {ideas.reduce((a, i) => a + (i.likeCount || 0), 0)}
              </div>
              <div className="text-xs text-[#90A4AE]">Likes</div>
            </div>
          </div>

          {/* FOLLOW BUTTON */}
          <button
            onClick={toggleFollow}
            disabled={followBusy || loading}
            className={`mt-4 w-full font-medium text-sm py-3 rounded-xl transition-colors disabled:opacity-60 ${
              followButton.subdued
                ? "bg-[#F0F6FF] border border-[#BBDEFB] text-[#1565C0]"
                : "bg-[#1565C0] text-white"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Icon name={followButton.icon} className="w-4 h-4" />
              {followButton.label}
            </span>
          </button>

          {/* Only shown pre-request, so it reads as an explanation of what the
              button will do rather than a status message about what it did. */}
          {!loading &&
            !followStats.isPublicProfile &&
            !followStats.isFollowing &&
            !followStats.requestPending && (
              <p className="mt-2 text-xs text-[#90A4AE] text-center">
                This account is private. They'll need to approve your request.
              </p>
            )}

          {!loading && followStats.requestPending && (
            <p className="mt-2 text-xs text-[#90A4AE] text-center">
              Request sent — waiting for approval. Tap again to withdraw it.
            </p>
          )}

          {/* ADMIN-ONLY: ban + delete this user's account. Only rendered for
              the logged-in admin (me.isAdmin), never for regular users viewing
              someone else's profile. Server independently enforces ROLE_ADMIN
              on the actual delete call regardless of this client-side check. */}
          {/* ADMIN-ONLY: Ban User */}
          {me?.isAdmin && !loading && profile && (
            <>
              <div className="mt-4 rounded-xl bg-[#FFF8E1] border border-[#FFE082] p-3">
                <p className="text-xs text-[#B26A00] font-semibold">
                  Admin Action
                </p>

                <p className="text-xs text-[#795548] mt-1 leading-relaxed">
                  Banning permanently deletes this account and blocks the user's
                  email from creating a new account in the future.
                </p>
              </div>

              <button
                onClick={() => setShowBanModal(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#DC2626] hover:bg-[#FEE2E2] hover:shadow-md active:scale-[0.98] transition-all"
              >
                <Icon name="trash" className="w-4 h-4" />
                Delete Account &amp; Block Email
              </button>
            </>
          )}

          {/* IDEAS */}
          <p className="mt-6 mb-3 text-xs font-bold tracking-wider text-[#90A4AE] uppercase">
            Ideas
          </p>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="bg-[#F0F6FF] rounded-2xl overflow-hidden animate-pulse"
                  >
                    <div className="h-32 bg-[#BBDEFB]" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-[#BBDEFB] rounded w-3/4" />
                      <div className="h-2.5 bg-[#BBDEFB] rounded" />
                    </div>
                  </div>
                ))}
            </div>
          ) : !followStats.canViewIdeas ? (
            /* Private account, viewer isn't an approved follower. The grid is
               empty because the server withheld it, not because there's
               nothing to show — say so explicitly, or the profile just looks
               like an inactive account. Follower/following counts above stay
               visible by design.

               isFollowing shouldn't be true here in normal operation — an
               approved follower's canViewIdeas comes back true (see
               ProfilePrivacyService.canViewProfileIdeas), so they render the
               real grid below instead of hitting this branch. The fallback
               text stays only in case stats and the ideas list momentarily
               disagree (e.g. right after an accept, before a re-fetch). */
            <div className="text-center py-14 px-6">
              <div className="w-16 h-16 rounded-full bg-[#E3F2FD] flex items-center justify-center mx-auto">
                <Icon name="lock" className="w-7 h-7 text-[#1565C0]" />
              </div>
              <p className="mt-4 text-[#0D2137] font-bold text-[15px]">
                This account is private
              </p>
              <p className="mt-1.5 text-sm text-[#90A4AE] leading-relaxed">
                {followStats.isFollowing
                  ? "Their ideas will appear here shortly."
                  : "Follow this account to see their ideas."}
              </p>
            </div>
          ) : ideas.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {ideas.map((i) => (
                <IdeaCard key={i.id} idea={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="mb-3 flex justify-center text-[#BBDEFB]">
                <Icon name="lightbulb" className="w-12 h-12" />
              </div>
              <p className="text-[#1565C0] font-medium text-sm">
                No ideas published yet
              </p>
            </div>
          )}
        </div>
      </div>
      <BottomNav />

      {showBanModal && (
        <BanUserModal
          userId={id}
          userName={profile?.name}
          onClose={() => setShowBanModal(false)}
          onBanned={() => {
            setShowBanModal(false);

            alert("User has been permanently banned.");

            navigate(-1);
          }}
        />
      )}
    </div>
  );
}
