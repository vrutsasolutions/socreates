import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav.premium';
import IdeaCard, { IdeaCardSkeleton } from '../components/common/IdeaCard.premium';
import api from '../api/axiosInstance';
import { SavedIdeasSkeleton } from '../components/common/LoadingStates.premium';
import { EmptySaved } from '../components/common/EmptyStates.premium';
import { IdeaLoadError } from '../components/common/ErrorStates.premium';
import Icon from '../components/common/Icon';

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
    <div className="min-h-screen bg-[#F4F7FF] pb-24">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 py-4 flex items-center gap-3 relative overflow-hidden">
        <div className="pointer-events-none absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
        <div className="pointer-events-none absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        <button onClick={() => navigate(-1)} className="text-blue-200 hover:text-white transition btn-hover">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Saved Ideas</h1>
        {ideas.length > 0 && (
          <span className="text-blue-200 text-sm">{ideas.length}</span>
        )}
      </header>

      <div className="px-4 pt-5">

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white border border-[#BBDEFB] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 bg-[#E3F2FD]"/>
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-[#BBDEFB] rounded w-3/4"/>
                  <div className="h-2.5 bg-[#BBDEFB] rounded"/>
                </div>
              </div>
            ))}
          </div>

        ) : ideas.length > 0 ? (
          <>
            <p className="text-[#546E7A] text-sm mb-4">{ideas.length} saved ideas</p>
            <div className="grid grid-cols-2 gap-3">
              {ideas.map(idea => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onSaveToggle={(id, saved) => { if (!saved) handleUnsave(id); }}
                />
              ))}
            </div>
          </>

        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-white border border-[#BBDEFB] rounded-3xl flex items-center justify-center mb-5 shadow-sm">
              <Icon name="bookmark" className="w-9 h-9 text-[#1565C0]" />
            </div>
            <h2 className="text-[#0D2137] font-bold text-base mb-2">No saved ideas yet</h2>
            <p className="text-[#546E7A] text-sm mb-5 max-w-xs">
              Tap the bookmark icon on any idea to save it here for later.
            </p>
            <button
              onClick={() => navigate('/home')}
              className="bg-[#1565C0] hover:bg-[#0D47A1] text-white font-semibold px-6 py-3 rounded-2xl active:scale-95 transition shadow-md shadow-blue-200 btn-hover">
              Explore Ideas
            </button>
          </div>
        )}

      </div>

      <BottomNav/>
    </div>
  );
}