import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav';
import IdeaCard from '../components/common/IdeaCard';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';

const TABS = ['My Ideas', 'Saved'];

export default function Profile() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const [tab, setTab]             = useState('My Ideas');
  const [myIdeas, setMyIdeas]     = useState([]);
  const [saved, setSaved]         = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/ideas/mine').catch(() => ({ data: [] })),
      api.get('/ideas/saved').catch(() => ({ data: [] })),
    ]).then(([mine, saved]) => {
      setMyIdeas(mine.data); setSaved(saved.data);
    }).finally(() => setLoading(false));
  }, []);

  const ideas = tab === 'My Ideas' ? myIdeas : saved;

  return (
    <div className="min-h-screen bg-[#0f0f1a] pb-24">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-white font-bold text-lg">Profile</h1>
        <button onClick={() => navigate('/settings')} className="text-slate-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>
      </header>

      {/* Profile info */}
      <div className="px-4 pb-6 text-center">
        {/* Avatar */}
        <div className="mx-auto mb-4 relative w-24 h-24">
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user.name} className="w-24 h-24 rounded-3xl object-cover"/>
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}
          {user?.isPremium && (
            <div className="absolute -bottom-2 -right-2 bg-amber-400 rounded-full w-7 h-7 flex items-center justify-center text-sm border-2 border-[#0f0f1a]">⭐</div>
          )}
        </div>

        <h2 className="text-white text-xl font-bold">{user?.name}</h2>
        <p className="text-violet-400 text-sm">@{user?.email?.split('@')[0]}</p>
        {user?.bio && <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-xs mx-auto">{user.bio}</p>}

        {/* Stats */}
        <div className="flex justify-center gap-8 mt-4 py-4 border-y border-[#2a2a3e]">
          {[
            { label: 'Ideas', value: myIdeas.length },
            { label: 'Saved',  value: saved.length },
            { label: 'Likes',  value: myIdeas.reduce((a, i) => a + (i.likeCount || 0), 0) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-white font-bold text-lg">{value}</div>
              <div className="text-slate-500 text-xs">{label}</div>
            </div>
          ))}
        </div>

        {/* Edit button */}
        <button onClick={() => navigate('/edit-profile')}
          className="mt-4 w-full bg-[#1a1a2e] border border-[#2a2a3e] text-slate-300 font-medium text-sm py-3 rounded-xl hover:border-violet-500/50 hover:text-white transition-all active:scale-95">
          ✏️ Edit Profile
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-2 mb-4">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all
              ${tab === t ? 'bg-violet-600 text-white' : 'bg-[#1a1a2e] text-slate-400 border border-[#2a2a3e]'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Ideas grid */}
      <div className="px-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">{Array(4).fill(0).map((_,i) => <div key={i} className="bg-[#1a1a2e] rounded-2xl overflow-hidden animate-pulse"><div className="h-32 bg-[#2a2a3e]"/><div className="p-3 space-y-2"><div className="h-3 bg-[#2a2a3e] rounded w-3/4"/><div className="h-2.5 bg-[#2a2a3e] rounded"/></div></div>)}</div>
        ) : ideas.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">{ideas.map(i => <IdeaCard key={i.id} idea={i}/>)}</div>
        ) : (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">{tab === 'My Ideas' ? '💡' : '🔖'}</div>
            <p className="text-slate-400 font-medium text-sm">
              {tab === 'My Ideas' ? 'No ideas published yet' : 'No saved ideas yet'}
            </p>
            {tab === 'My Ideas' && (
              <button onClick={() => navigate('/add-idea')} className="mt-3 text-violet-400 text-xs hover:text-violet-300 transition">
                + Share your first idea
              </button>
            )}
          </div>
        )}
      </div>
      <BottomNav/>
    </div>
  );
}
