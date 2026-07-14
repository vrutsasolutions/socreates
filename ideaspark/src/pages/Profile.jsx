import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/common/BottomNav.premium";
import IdeaCard from "../components/common/IdeaCard.premium";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import { fetchFollowStats } from "../api/userApi";
import { hasCreatorPro, isVerified } from "../api/paymentApi";
import Icon from "../components/common/Icon";
import ProfileShareButton from "../components/common/ProfileShareButton";

const TABS = ["My Ideas", "Saved"];

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState("My Ideas");
  const [myIdeas, setMyIdeas] = useState([]);
  const [saved, setSaved] = useState([]);
  const [followStats, setFollowStats] = useState({
    followersCount: 0,
    followingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/ideas/mine").catch(() => ({ data: [] })),
      api.get("/ideas/saved").catch(() => ({ data: [] })),
    ])
      .then(([mine, saved]) => {
        setMyIdeas(mine.data);
        setSaved(saved.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Follower / following counts for the signed-in user's own profile.
  // Uses useCallback so the same function ref can be passed to the
  // visibilitychange listener without re-registering on every render.
  const refreshFollowStats = useCallback(() => {
    if (!user?.id) return;
    fetchFollowStats(user.id)
      .then(({ data }) => setFollowStats(data))
      .catch(() => {});
  }, [user?.id]);

  // Fetch on mount + whenever user id changes (login/switch).
  useEffect(() => { refreshFollowStats(); }, [refreshFollowStats]);

  // Re-fetch when the user returns to this tab/page (e.g. navigating back
  // from FollowCreators after following several creators). The
  // visibilitychange event fires on every tab-focus and on React-router
  // back-navigation when the SPA resurfaces the page.
  useEffect(() => {
    document.addEventListener("visibilitychange", refreshFollowStats);
    return () => document.removeEventListener("visibilitychange", refreshFollowStats);
  }, [refreshFollowStats]);

  const ideas = tab === "My Ideas" ? myIdeas : saved;

  const handleDeleteIdea = async (ideaId) => {
    if (!window.confirm("Are you sure you want to delete this idea?")) return;
    try {
      await api.delete(`/ideas/${ideaId}`);
      setMyIdeas((prev) => prev.filter((idea) => idea.id !== ideaId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete idea");
    }
  };

  return (
    <div className="min-h-screen  pb-24">
      {/* HEADER (RINGS KEPT, STRUCTURE FIXED ONLY) */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-8 relative shadow-lg">
        {/* rings */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        {/* top bar (UNCHANGED) */}
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

          <div className="flex items-center gap-4">
            {user?.id && <ProfileShareButton userId={user.id} name={user?.name} />}

            <button
              onClick={() => navigate("/settings")}
              className="w-9 h-9 flex items-center justify-center text-white"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex justify-center">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-5 w-full max-w-sm text-center">
            <div className="flex justify-center">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user?.name || "Profile photo"}
                  className="w-16 h-16 rounded-2xl object-cover bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-[#1565C0] font-bold text-2xl">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>

            <h2 className="text-white font-bold text-lg mt-3">{user?.name}</h2>

            {/* Status badges — verified (any paid membership) + tier pill */}
            {isVerified(user) && (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {isVerified(user) && (
                  <span className="inline-flex items-center gap-1 bg-[#E7F8EE] text-[#15803D] text-xs font-bold px-3 py-1 rounded-full">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Verified 
                  </span>
                )}

                {hasCreatorPro(user) ? (
                  // Creator Pro is the higher tier — show it instead of the plain Premium pill.
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    <Icon name="star" className="w-3.5 h-3.5" />
                    Creator Pro
                  </span>
                ) : (
                  user?.isPremium && (
                    <span className="inline-flex items-center gap-1 bg-[#FEF3C7] text-[#92400E] text-xs font-bold px-3 py-1 rounded-full">
                      <Icon name="star" className="w-3.5 h-3.5" />
                      Premium
                    </span>
                  )
                )}
              </div>
            )}

            <p className="text-blue-200 text-sm">
              @{user?.username || user?.email?.split("@")[0]}
            </p>

            {/* bio */}
            {user?.bio && (
              <p className="text-blue-200 text-xs mt-3 leading-relaxed">
                {user.bio}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] px-4 pt-6">
          {/* STATS */}
          <div className="flex text-center py-4 border-b border-[#BBDEFB]">
            <button
              type="button"
              onClick={() => navigate("/profile/follows?tab=followers")}
              className="flex-1 active:scale-95 transition-transform"
            >
              <div className="text-[#1565C0] font-bold">
                {followStats.followersCount}
              </div>
              <div className="text-xs text-[#90A4AE]">Followers</div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/profile/follows?tab=following")}
              className="flex-1 active:scale-95 transition-transform"
            >
              <div className="text-[#1565C0] font-bold">
                {followStats.followingCount}
              </div>
              <div className="text-xs text-[#90A4AE]">Following</div>
            </button>

            <div className="flex-1">
              <div className="text-[#1565C0] font-bold">
                {myIdeas.reduce((a, i) => a + (i.likeCount || 0), 0)}
              </div>
              <div className="text-xs text-[#90A4AE]">Likes</div>
            </div>
          </div>

          {/* EDIT BUTTON */}
          <button
            onClick={() => navigate("/edit-profile")}
            className="mt-4 w-full bg-[#F0F6FF] border border-[#BBDEFB] text-[#1565C0] font-medium text-sm py-3 rounded-xl"
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Icon name="edit" className="w-4 h-4" />
              Edit Profile
            </span>
          </button>

          {/* TABS */}
          <div className="flex gap-2 mt-4 mb-4">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${
                  tab === t
                    ? "bg-[#1565C0] text-white"
                    : "bg-[#F0F6FF] text-[#1565C0]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Ideas grid */}
          <div>
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
            ) : ideas.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {ideas.map((i) => (
                  <div key={i.id}>
                    <IdeaCard idea={i} />

                    {tab === "My Ideas" && (
                      <button
                        onClick={() => handleDeleteIdea(i.id)}
                        className="mt-2 w-full bg-red-400 text-white text-sm font-semibold py-2 rounded-lg shadow active:scale-[0.98] transition"
                      >
                        Delete Idea
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="mb-3 flex justify-center text-[#BBDEFB]">
                  {tab === "My Ideas" ? (
                    <Icon name="lightbulb" className="w-12 h-12" />
                  ) : (
                    <Icon name="bookmark" className="w-12 h-12" />
                  )}
                </div>
                <p className="text-[#1565C0] font-medium text-sm">
                  {tab === "My Ideas"
                    ? "No ideas published yet"
                    : "No saved ideas yet"}
                </p>
                {tab === "My Ideas" && (
                  <button
                    onClick={() => navigate("/add-idea")}
                    className="mt-3 text-[#1565C0] text-xs hover:text-[#BBDEFB] transition"
                  >
                    + Share your first idea
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}