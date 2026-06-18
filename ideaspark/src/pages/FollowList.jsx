// ════════════════════════════════════════════════════════════════════════
//  FollowList — Followers / Following for the signed-in user.
//
//  One page, two tabs. The tab to open first is read from the URL:
//     /profile/follows?tab=followers   (default)
//     /profile/follows?tab=following
//  Tapped from the Followers / Following counts on the Profile page.
//
//  Each row carries an inline action:
//     • Followers → "Remove"   (drops them from your followers)
//     • Following → "Unfollow"  (DELETE /api/follow/{id})
//  A "Suggested for you" rail sits below the list with "+ Follow" actions
//  (POST /api/follow/{id}).
//
//  Data: userApi.fetchFollowers(id) / fetchFollowing(id) →
//        FollowResponse[] { userId, name, username, profileImage }
//        userApi.fetchSuggestedCreators() → { id, name, bio, avatarUrl }[]
// ════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchFollowers,
  fetchFollowing,
  fetchSuggestedCreators,
  followUser,
  unfollowUser,
} from '../api/userApi';

const TABS = [
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
];

// Deterministic avatar tint per user so initials-only avatars stay colourful.
const AVATAR_COLORS = ['#C2185B', '#00897B', '#1565C0', '#6A1B9A', '#EF6C00', '#2E7D32'];
function colorFor(key = '') {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Avatar({ name, image, seed }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="w-12 h-12 rounded-2xl object-cover border-2 border-[#BBDEFB] shrink-0"
      />
    );
  }
  return (
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0"
      style={{ background: colorFor(seed || name) }}
    >
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function PersonRow({ person, variant = 'card', action }) {
  const wrap =
    variant === 'card'
      ? 'bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-3.5'
      : 'px-1 py-3 border-b border-[#EAF2FF] last:border-0';
  return (
    <div className={`flex items-center gap-3 ${wrap}`}>
      <Avatar name={person.name} image={person.profileImage} seed={person.id || person.userId} />
      <div className="flex-1 min-w-0">
        <div className="text-[#0D2137] font-semibold text-[15px] truncate">{person.name || 'User'}</div>
        {(person.username || person.bio) && (
          <div className="text-[#90A4AE] text-sm mt-0.5 truncate">
            {person.username ? `@${person.username}` : person.bio}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

/* ── Inline action buttons ─────────────────────────────────────────────── */
function RemoveBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-4 py-2 rounded-xl bg-[#FEE2E2] text-[#EF4444] text-sm font-semibold hover:bg-[#FECACA] active:scale-95 transition-all"
    >
      Remove
    </button>
  );
}

function UnfollowBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-4 py-2 rounded-xl bg-white border border-[#BBDEFB] text-[#1565C0] text-sm font-semibold hover:bg-[#F0F6FF] active:scale-95 transition-all"
    >
      Unfollow
    </button>
  );
}

function FollowBtn({ followed, onClick }) {
  if (followed) {
    return (
      <button
        disabled
        className="shrink-0 px-4 py-2 rounded-xl bg-[#F0F6FF] border border-[#BBDEFB] text-[#90A4AE] text-sm font-semibold"
      >
        Following
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-4 py-2 rounded-xl bg-[#1565C0] text-white text-sm font-semibold hover:bg-[#0D47A1] active:scale-95 transition-all flex items-center gap-1"
    >
      <span className="text-base leading-none -mt-px">+</span> Follow
    </button>
  );
}

export default function FollowList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const initialTab = params.get('tab') === 'following' ? 'following' : 'followers';
  const [tab, setTab] = useState(initialTab);

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [followedIds, setFollowedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      fetchFollowers(user.id).catch(() => ({ data: [] })),
      fetchFollowing(user.id).catch(() => ({ data: [] })),
      fetchSuggestedCreators().catch(() => ({ data: [] })),
    ])
      .then(([f, g, s]) => {
        const followersList = f.data || [];
        const followingList = g.data || [];
        // Don't suggest yourself or people you already follow. The backend
        // already excludes these, but filter here too as a safety net in case
        // its data is stale.
        const followingIds = new Set(followingList.map((p) => p.userId));
        const suggestions = (s.data || []).filter(
          (c) => c.id !== user.id && !followingIds.has(c.id),
        );
        setFollowers(followersList);
        setFollowing(followingList);
        setSuggested(suggestions);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const selectTab = (key) => {
    setTab(key);
    setParams({ tab: key }, { replace: true });
  };

  // Drop a follower from your list. No backend "remove follower" endpoint
  // exists yet, so this is an optimistic, local-only removal.
  const handleRemove = (person) => {
    setFollowers((prev) => prev.filter((p) => p.userId !== person.userId));
  };

  // Unfollow someone you follow — optimistic, reverted if the call fails.
  const handleUnfollow = (person) => {
    setFollowing((prev) => prev.filter((p) => p.userId !== person.userId));
    unfollowUser(person.userId).catch(() => setFollowing((prev) => [person, ...prev]));
  };

  // Follow a suggested creator — optimistic, reverted if the call fails.
  const handleFollow = (creator) => {
    setFollowedIds((prev) => new Set(prev).add(creator.id));
    followUser(creator.id).catch(() =>
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(creator.id);
        return next;
      }),
    );
  };

  const people = tab === 'followers' ? followers : following;

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* HEADER — matches app blue header pattern */}
      <header className="bg-[#1565C0] px-4 pt-4 pb-6 relative shadow-lg border-b border-white/10">

        {/* decorative rings */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        {/* top bar */}
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
          <h1 className="text-white font-bold text-lg">{user?.name || 'Profile'}</h1>
          <span className="w-9" />
        </div>

        {/* floating card with avatar + stats */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4 shadow-md flex items-center gap-3">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user?.name || 'You'}
                className="w-12 h-12 rounded-2xl object-cover border border-white/20 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-white font-bold text-base truncate">{user?.name || 'Your profile'}</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-blue-200 text-xs">
                  <span className="text-white font-semibold">{followers.length}</span> followers
                </span>
                <span className="text-white/30">·</span>
                <span className="text-blue-200 text-xs">
                  <span className="text-white font-semibold">{following.length}</span> following
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Segmented tab control — white active pill on the blue header */}
        <div className="relative z-10 mt-6 flex gap-1 p-1 rounded-2xl bg-white/15 backdrop-blur-md border border-white/15">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => selectTab(t.key)}
                className={`flex-1 py-2.5 rounded-xl text-[15px] font-semibold transition-all active:scale-[0.98] ${
                  active
                    ? 'bg-white text-[#1565C0] shadow-md'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* CONTENT */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-5 pb-10 flex flex-col min-h-screen">

          {/* List */}
          <div className="px-4 space-y-3">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-3.5 flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-[#BBDEFB] rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-[#BBDEFB] rounded w-32" />
                    <div className="h-3 bg-[#BBDEFB] rounded w-24" />
                  </div>
                  <div className="h-8 w-20 bg-[#BBDEFB] rounded-xl" />
                </div>
              ))
            ) : people.length > 0 ? (
              people.map((p) => (
                <PersonRow
                  key={p.userId}
                  person={p}
                  action={
                    tab === 'followers'
                      ? <RemoveBtn onClick={() => handleRemove(p)} />
                      : <UnfollowBtn onClick={() => handleUnfollow(p)} />
                  }
                />
              ))
            ) : (
              <div className="text-center py-14">
                <div className="w-14 h-14 rounded-2xl bg-[#F0F6FF] border border-[#BBDEFB] flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-[#BBDEFB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.768-.231-1.48-.631-2.066M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.768.231-1.48.631-2.066M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-[#1565C0] font-medium text-sm">
                  {tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                </p>
                <p className="text-[#90A4AE] text-xs mt-1">
                  {tab === 'followers' ? 'Share your ideas to grow your audience' : 'Explore creators to follow'}
                </p>
              </div>
            )}
          </div>

          {/* Suggested for you */}
          {!loading && suggested.length > 0 && (
            <div className="mt-8 px-4">
              <div className="border-t border-[#EAF2FF] pt-5">
                <h2 className="text-[#1565C0] font-bold text-[15px] mb-1.5">Suggested for you</h2>
                <div>
                  {suggested.map((c) => (
                    <PersonRow
                      key={c.id}
                      variant="plain"
                      person={{ ...c, profileImage: c.profileImage || c.avatarUrl }}
                      action={
                        <FollowBtn
                          followed={followedIds.has(c.id)}
                          onClick={() => handleFollow(c)}
                        />
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
