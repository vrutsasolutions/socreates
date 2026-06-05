import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav.premium';
import IdeaCard, { IdeaCardSkeleton } from '../components/common/IdeaCard.premium';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';

const TABS = ['My Ideas', 'Saved'];

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab]         = useState('My Ideas');
  const [myIdeas, setMyIdeas] = useState([]);
  const [saved, setSaved]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/ideas/mine').catch(() => ({ data: [] })),
      api.get('/ideas/saved').catch(() => ({ data: [] })),
    ])
      .then(([mine, saved]) => {
        setMyIdeas(mine.data);
        setSaved(saved.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const ideas = tab === 'My Ideas' ? myIdeas : saved;

  const handleDeleteIdea = async (ideaId) => {
    if (!window.confirm('Are you sure you want to delete this idea?')) return;
    try {
      await api.delete(`/ideas/${ideaId}`);
      setMyIdeas((prev) => prev.filter((idea) => idea.id !== ideaId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete idea');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-24 overflow-x-hidden">

      {/* HEADER — matches Home */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">

        {/* decorative circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        {/* top bar */}
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <span className="text-white font-bold text-lg flex-1">Profile</span>
          <button
            onClick={() => navigate('/settings')}
            className="w-9 h-9 flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>
        </div>

        {/* floating profile card */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-5 shadow-md flex flex-col items-center text-center">
            <div className="relative mb-3">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/20">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
              {user?.isPremium && (
                <div className="absolute -bottom-1.5 -right-1.5 bg-white/90 rounded-full w-6 h-6 flex items-center justify-center text-xs border-2 border-[#1565C0]">
                  ⭐
                </div>
              )}
            </div>
            <h2 className="text-white text-lg font-bold leading-tight">{user?.name}</h2>
            <p className="text-blue-200 text-sm mt-0.5">@{user?.email?.split('@')[0]}</p>
          </div>
        </div>
      </header>

      {/* CONTENT WRAPPER — matches Home */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6 px-4">

          {/* Stats */}
          <div className="flex justify-center gap-8 pb-5 border-b border-[#BBDEFB]">
            {[
              { label: 'Ideas',  value: myIdeas.length },
              { label: 'Saved',  value: saved.length },
              { label: 'Likes',  value: myIdeas.reduce((a, i) => a + (i.likeCount || 0), 0) },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-[#1565C0] font-bold text-xl">{value}</div>
                <div className="text-[#90A4AE] text-sm mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Edit profile button */}
          <button
            onClick={() => navigate('/edit-profile')}
            className="mt-5 w-full bg-[#F0F6FF] border border-[#BBDEFB] text-[#1565C0] font-semibold text-[15px] py-3.5 rounded-2xl hover:bg-[#DBEAFE] hover:border-[#1565C0] active:scale-[0.97] transition-all shadow-sm"
          >
            ✏️ Edit Profile
          </button>

          {/* Tabs */}
          <div className="flex gap-3 mt-5 mb-5">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 rounded-2xl text-[15px] font-semibold transition-all active:scale-95
                  ${tab === t
                    ? 'bg-[#1565C0] text-white shadow-md shadow-blue-300/40'
                    : 'bg-[#F0F6FF] text-[#1565C0] border border-[#BBDEFB] hover:bg-[#DBEAFE] hover:border-[#1565C0]'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Ideas grid */}
          <div className="pb-6">
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {Array(4).fill(0).map((_, i) => (
                  <IdeaCardSkeleton key={i} />
                ))}
              </div>
            ) : ideas.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {ideas.map((i) => (
                  <div key={i.id} className="relative transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <IdeaCard idea={i} />
                    {tab === 'My Ideas' && (
                      <button
                        onClick={() => handleDeleteIdea(i.id)}
                        className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white text-xs px-2.5 py-1 rounded-lg shadow active:scale-95 transition-all"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">{tab === 'My Ideas' ? '💡' : '🔖'}</div>
                <p className="text-[#0D2137] font-semibold text-base">
                  {tab === 'My Ideas' ? 'No ideas published yet' : 'No saved ideas yet'}
                </p>
                <p className="text-[#90A4AE] text-sm mt-1">
                  {tab === 'My Ideas' ? 'Share your first idea with the world' : 'Bookmark ideas you love to find them here'}
                </p>
                {tab === 'My Ideas' && (
                  <button
                    onClick={() => navigate('/add-idea')}
                    className="mt-4 bg-[#1565C0] hover:bg-[#0D47A1] text-white font-semibold px-6 py-3 rounded-2xl text-sm active:scale-95 transition-all shadow-md shadow-blue-200"
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