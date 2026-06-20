// ════════════════════════════════════════════════════════════════════════
//  UserProfile  (public profile — view ANY user by id)
//  Reached from: follow notifications, follower/following lists, search.
//  Mirrors Profile.jsx's layout but for someone else's account:
//    • no Edit Profile / Settings
//    • Follow / Unfollow button instead
//    • only their published ideas (no Saved tab — that's private)
// ════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav.premium';
import IdeaCard from '../components/common/IdeaCard.premium';
import Icon from '../components/common/Icon';
import { useAuth } from '../context/AuthContext';
import { fetchUserById, fetchFollowStats, followUser, unfollowUser } from '../api/userApi';
import { fetchIdeasByUser } from '../api/ideaApi';

export default function UserProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user: me } = useAuth();

  const [profile, setProfile] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0, isFollowing: false });
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

  // If you land on your own id, just show the real (editable) profile instead.
  useEffect(() => {
    if (me?.id && id && me.id === id) {
      navigate('/profile', { replace: true });
    }
  }, [me?.id, id, navigate]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [{ data: userData }, { data: ideaData }, { data: statsData }] = await Promise.all([
        fetchUserById(id),
        fetchIdeasByUser(id).catch(() => ({ data: [] })),
        fetchFollowStats(id).catch(() => ({ data: { followersCount: 0, followingCount: 0, isFollowing: false } })),
      ]);
      setProfile(userData);
      setIdeas(ideaData);
      setFollowStats(statsData);
    } catch (err) {
      console.error('[UserProfile] failed to load', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleFollow = async () => {
    if (followBusy) return;
    setFollowBusy(true);
    const wasFollowing = followStats.isFollowing;
    // Optimistic update
    setFollowStats((prev) => ({
      ...prev,
      isFollowing: !wasFollowing,
      followersCount: prev.followersCount + (wasFollowing ? -1 : 1),
    }));
    try {
      if (wasFollowing) await unfollowUser(id);
      else await followUser(id);
    } catch (err) {
      // Revert on failure
      setFollowStats((prev) => ({
        ...prev,
        isFollowing: wasFollowing,
        followersCount: prev.followersCount + (wasFollowing ? 1 : -1),
      }));
      console.error('[UserProfile] follow toggle failed', err);
    } finally {
      setFollowBusy(false);
    }
  };

  if (!loading && !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex justify-center text-[#BBDEFB]">
          <Icon name="user" className="w-12 h-12" />
        </div>
        <p className="text-[#0D2137] font-semibold">User not found</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-[#1565C0] text-sm font-medium"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* HEADER — matches Profile.jsx */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-8 relative shadow-lg">
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
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg">Profile</h1>
          {/* spacer to balance the back button so the title stays centered */}
          <span className="w-9 h-9" />
        </div>

        <div className="relative z-10 mt-6 flex justify-center">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-5 w-full max-w-sm text-center">
            <div className="flex justify-center">
              {loading ? (
                <div className="w-16 h-16 rounded-2xl bg-white/20 animate-pulse" />
              ) : profile?.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt={profile?.name || 'Profile photo'}
                  className="w-16 h-16 rounded-2xl object-cover bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-[#1565C0] font-bold text-2xl">
                  {profile?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>

            <h2 className="text-white font-bold text-lg mt-3">{loading ? '\u00A0' : profile?.name}</h2>

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
                @{profile?.username || profile?.email?.split('@')[0]}
              </p>
            )}

            {profile?.bio && (
              <p className="text-blue-200 text-xs mt-3 leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>
      </header>

      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] px-4 pt-6">
          {/* STATS */}
          <div className="flex text-center py-4 border-b border-[#BBDEFB]">
            <div className="flex-1">
              <div className="text-[#1565C0] font-bold">{followStats.followersCount}</div>
              <div className="text-xs text-[#90A4AE]">Followers</div>
            </div>
            <div className="flex-1">
              <div className="text-[#1565C0] font-bold">{followStats.followingCount}</div>
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
              followStats.isFollowing
                ? 'bg-[#F0F6FF] border border-[#BBDEFB] text-[#1565C0]'
                : 'bg-[#1565C0] text-white'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Icon name={followStats.isFollowing ? 'check' : 'user-plus'} className="w-4 h-4" />
              {followStats.isFollowing ? 'Following' : 'Follow'}
            </span>
          </button>

          {/* IDEAS */}
          <p className="mt-6 mb-3 text-xs font-bold tracking-wider text-[#90A4AE] uppercase">
            Ideas
          </p>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-[#F0F6FF] rounded-2xl overflow-hidden animate-pulse">
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
              {ideas.map((i) => <IdeaCard key={i.id} idea={i} />)}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="mb-3 flex justify-center text-[#BBDEFB]">
                <Icon name="lightbulb" className="w-12 h-12" />
              </div>
              <p className="text-[#1565C0] font-medium text-sm">No ideas published yet</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
