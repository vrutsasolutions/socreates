import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';

export default function PremiumDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [idea, setIdea] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/ideas/${id}`).then(({ data }) => setIdea(data)).catch(() => setIdea(MOCK)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isLocked = !user?.isPremium;

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <div className="sticky top-0 z-30 bg-[#0f0f1a]/90 backdrop-blur-xl border-b border-[#2a2a3e] px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="bg-amber-400/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full">⭐ Premium Idea</div>
      </div>
      <div className="px-4 py-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold">
            {idea?.creatorName?.[0] ?? '?'}
          </div>
          <div><div className="text-white font-semibold text-sm">{idea?.creatorName}</div><div className="text-slate-500 text-xs">{idea?.category}</div></div>
        </div>
        <h1 className="text-white text-2xl font-bold leading-tight mb-4">{idea?.title}</h1>
        {isLocked ? (
          <div>
            <p className="text-slate-400 text-sm leading-relaxed blur-[4px] select-none line-clamp-4">{idea?.description}</p>
            <div className="mt-6 bg-gradient-to-br from-amber-900/30 to-violet-900/30 border border-amber-500/30 rounded-3xl p-6 text-center">
              <div className="text-4xl mb-3">🔐</div>
              <h3 className="text-white font-bold text-lg mb-2">Unlock Premium Ideas</h3>
              <p className="text-slate-400 text-sm mb-5">Get unlimited access to all premium ideas.</p>
              <button onClick={() => navigate('/membership')} className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-amber-900 font-bold py-3.5 rounded-2xl active:scale-95 transition-all">
                Upgrade to Premium →
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{idea?.description}</p>
        )}
      </div>
    </div>
  );
}

const MOCK = { id: 'p1', title: 'Build a $10K/mo SaaS with No Code', description: 'Complete blueprint for a profitable no-code SaaS...', category: 'Business', creatorName: 'Vikram P', likeCount: 312 };
