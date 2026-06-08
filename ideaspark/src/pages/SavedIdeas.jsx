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

      {/* Header — matches Home/Inbox */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Saved Ideas</h1>
          {ideas.length > 0 && (
            <span className="text-blue-200 text-sm font-medium">{ideas.length}</span>
          )}
        </div>

        {/* Floating info card — matches Home's greeting card */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 shadow-md flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Icon name="bookmark" className="w-5 h-5 text-white" />
            </div>
            <p className="text-blue-200 text-[14px]">
              {loading ? 'Loading your saved ideas…' : ideas.length > 0 ? `${ideas.length} ideas saved for later` : 'No saved ideas yet'}
            </p>
          </div>
        </div>
      </header>

      {/* Content wrapper — matches Home's rounded-t-[32px] white card */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6 px-4">

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-36 bg-[#DBEAFE]"/>
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-[#BBDEFB] rounded-xl w-3/4"/>
                    <div className="h-2.5 bg-[#BBDEFB] rounded-xl"/>
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
              <div className="w-20 h-20 bg-[#F0F6FF] border border-[#BBDEFB] rounded-3xl flex items-center justify-center mb-5">
                <Icon name="bookmark" className="w-9 h-9 text-[#1565C0]" />
              </div>
              <h2 className="text-[#0D2137] font-bold text-base mb-2">No saved ideas yet</h2>
              <p className="text-[#546E7A] text-sm mb-6 max-w-xs">
                Tap the bookmark icon on any idea to save it here for later.
              </p>
              <button
                onClick={() => navigate('/home')}
                className="bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold px-6 py-3.5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40 text-sm btn-hover">
                Explore Ideas
              </button>
            </div>
          )}

        </div>
      </div>

      <BottomNav/>
    </div>
  );
}