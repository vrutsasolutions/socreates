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
          <img src={person.profileImage} alt={person.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-[#BBDEFB]" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#1565C0] flex items-center justify-center text-white font-bold text-lg">
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
    // Keep the URL in sync so the tab is shareable / survives refresh.
    setParams({ tab: key }, { replace: true });
  };

  const people = tab === 'followers' ? followers : following;

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* HEADER — matches the app's blue header pattern */}
      <header className="bg-[#1565C0] px-4 pt-4 pb-8 relative shadow-lg border-b border-white/10">
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
          <h1 className="text-white font-bold text-lg">{user?.name || 'Profile'}</h1>
          <span className="w-9" />
        </div>

        {/* Tab switcher */}
        <div className="relative z-10 mt-6 flex bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => selectTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.key ? 'bg-white text-[#1565C0]' : 'text-white/80'
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs font-bold opacity-80">
                {t.key === 'followers' ? followers.length : following.length}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* CONTENT */}
      <div className="bg-[#1565C0] flex-1">
        <div className="bg-white rounded-t-[32px] pt-5 pb-6 flex flex-col min-h-full">
          <div className="flex-1 px-4 space-y-3">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-[#BBDEFB] rounded-full shrink-0" />
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
                <p className="text-[#1565C0] font-medium text-sm">
                  {tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
