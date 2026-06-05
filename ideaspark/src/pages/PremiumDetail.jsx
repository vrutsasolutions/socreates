import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { NotFoundError } from '../components/common/ErrorStates.premium';

const MOCK = {
  id: 'p1',
  title: 'Build a $10K/mo SaaS with No Code',
  description: 'Complete blueprint for a profitable no-code SaaS...',
  category: 'Business',
  creatorName: 'Vikram P',
  likeCount: 312
};

export default function PremiumDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [idea, setIdea]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/ideas/${id}`)
      .then(({ data }) => setIdea(data))
      .catch(() => setIdea(MOCK))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#F4F7FF] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isLocked = !user?.isPremium;

  return (
    <div className="min-h-screen bg-[#F4F7FF]">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#1565C0] px-4 py-4 flex items-center gap-3 relative overflow-hidden">
        <div className="pointer-events-none absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
        <div className="pointer-events-none absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center text-blue-200 hover:text-white transition btn-hover">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
          ⭐ Premium Idea
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto">

        {/* Creator Row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#1565C0] flex items-center justify-center text-white font-bold">
            {idea?.creatorName?.[0] ?? '?'}
          </div>
          <div>
            <div className="text-[#0D2137] font-semibold text-sm">{idea?.creatorName}</div>
            <div className="text-[#90A4AE] text-xs">{idea?.category}</div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[#0D2137] text-2xl font-bold leading-tight mb-4">{idea?.title}</h1>

        {/* Locked / Unlocked Content */}
        {isLocked ? (
          <div>
            <p className="text-[#546E7A] text-sm leading-relaxed blur-[4px] select-none line-clamp-4">
              {idea?.description}
            </p>
            <div className="mt-6 bg-white border border-[#BBDEFB] rounded-3xl p-6 text-center shadow-sm card-hover">
              <div className="text-4xl mb-3">🔐</div>
              <h3 className="text-[#0D2137] font-bold text-lg mb-2">Unlock Premium Ideas</h3>
              <p className="text-[#546E7A] text-sm mb-5">
                Get unlimited access to all premium ideas.
              </p>
              <button
                onClick={() => navigate('/membership')}
                className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40 btn-hover">
                Upgrade to Premium →
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[#0D2137] text-sm leading-relaxed whitespace-pre-line">
            {idea?.description}
          </p>
        )}

      </div>
    </div>
  );
}