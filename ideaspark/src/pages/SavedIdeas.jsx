import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav';
import IdeaCard from '../components/common/IdeaCard';
import api from '../api/axiosInstance';

export default function SavedIdeas() {
  const navigate = useNavigate();
  const [ideas, setIdeas]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ideas/saved')
      .then(({ data }) => setIdeas(data))
      .catch(() => setIdeas([]))
      .finally(() => setLoading(false));
  }, []);

  const handleUnsave = (ideaId) => {
    setIdeas(prev => prev.filter(i => i.id !== ideaId));
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] pb-24">
      <header className="sticky top-0 z-30 bg-[#0f0f1a]/90 backdrop-blur-xl border-b border-[#2a2a3e] px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Saved Ideas</h1>
        {ideas.length > 0 && <span className="text-slate-500 text-sm">{ideas.length}</span>}
      </header>

      <div className="px-4 pt-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(4).fill(0).map((_,i) => (
              <div key={i} className="bg-[#1a1a2e] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 bg-[#2a2a3e]"/>
                <div className="p-3 space-y-2"><div className="h-3 bg-[#2a2a3e] rounded w-3/4"/><div className="h-2.5 bg-[#2a2a3e] rounded"/></div>
              </div>
            ))}
          </div>
        ) : ideas.length > 0 ? (
          <>
            <p className="text-slate-500 text-sm mb-4">{ideas.length} saved ideas</p>
            <div className="grid grid-cols-2 gap-3">
              {ideas.map(idea => (
                <IdeaCard key={idea.id} idea={idea} onSaveToggle={(id, saved) => { if (!saved) handleUnsave(id); }}/>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-[#1a1a2e] border border-[#2a2a3e] rounded-3xl flex items-center justify-center text-4xl mb-5">🔖</div>
            <h2 className="text-white font-bold text-base mb-2">No saved ideas yet</h2>
            <p className="text-slate-500 text-sm mb-5 max-w-xs">Tap the bookmark icon on any idea to save it here for later.</p>
            <button onClick={() => navigate('/home')} className="bg-violet-600 text-white font-semibold px-6 py-3 rounded-xl active:scale-95 transition">
              Explore Ideas
            </button>
          </div>
        )}
      </div>
      <BottomNav/>
    </div>
  );
}
