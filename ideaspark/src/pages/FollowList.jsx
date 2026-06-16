// ════════════════════════════════════════════════════════════════════════
//  FollowList — Followers / Following for the signed-in user.
//
//  One page, two tabs. The tab to open first is read from the URL:
//     /profile/follows?tab=followers   (default)
//     /profile/follows?tab=following
//  Tapped from the Followers / Following counts on the Profile page.
//
//  Data: userApi.fetchFollowers(id) / fetchFollowing(id) →
//        FollowResponse[] { userId, name, username, profileImage }
// ════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchFollowers, fetchFollowing } from '../api/userApi';

const TABS = [
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
];

function PersonRow({ person }) {
  return (
    <div className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 flex items-center gap-3">
      <div className="shrink-0">
        {person.profileImage ? (
          <img
            src={person.profileImage}
            alt={person.name}
            className="w-12 h-12 rounded-2xl object-cover border-2 border-[#BBDEFB]"
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-[#1565C0] flex items-center justify-center text-white font-bold text-lg">
            {person.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[#0D2137] font-semibold text-[15px] truncate">{person.name || 'User'}</div>
        {person.username && (
          <div className="text-[#90A4AE] text-sm mt-0.5 truncate">@{person.username}</div>
        )}
      </div>
    </div>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      fetchFollowers(user.id).catch(() => ({ data: [] })),
      fetchFollowing(user.id).catch(() => ({ data: [] })),
    ])
      .then(([f, g]) => {
        setFollowers(f.data || []);
        setFollowing(g.data || []);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const selectTab = (key) => {
    setTab(key);
    setParams({ tab: key }, { replace: true });
  };

  const people = tab === 'followers' ? followers : following;

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* HEADER — matches app blue header pattern */}
      <header className="bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">

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
      </header>

      {/* CONTENT */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-5 pb-6 flex flex-col min-h-screen">

          {/* Tab switcher — inside white area, matching Profile tab style */}
          <div className="flex gap-2 px-4 mb-5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => selectTab(t.key)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  tab === t.key
                    ? 'bg-[#1565C0] text-white shadow-lg shadow-blue-300/40'
                    : 'bg-[#F0F6FF] text-[#1565C0] border border-[#BBDEFB]'
                }`}
              >
                {t.label}
                <span className={`ml-1.5 text-xs font-bold ${tab === t.key ? 'opacity-80' : 'text-[#90A4AE]'}`}>
                  {t.key === 'followers' ? followers.length : following.length}
                </span>
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 px-4 space-y-3">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-[#BBDEFB] rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-[#BBDEFB] rounded w-32" />
                    <div className="h-3 bg-[#BBDEFB] rounded w-24" />
                  </div>
                </div>
              ))
            ) : people.length > 0 ? (
              people.map((p) => <PersonRow key={p.userId} person={p} />)
            ) : (
              <div className="text-center py-16">
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
        </div>
      </div>
    </div>
  );
}