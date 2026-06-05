import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import IdeaCard, { IdeaCardSkeleton } from '../components/common/IdeaCard.premium';
import BottomNav from '../components/common/BottomNav.premium';

const MOCK = [
  { id:'p1', title:'Quantum Computing for Startups',    description:'How early-stage companies can leverage quantum algorithms today.', category:'Technology', isPremium:true, likeCount:312, creatorName:'Arjun Sharma' },
  { id:'p2', title:'The $0 to $1M Content Strategy',   description:'Exact playbook used to grow from zero to one million dollars.', category:'Business', isPremium:true, likeCount:498, creatorName:'Priya Nair' },
  { id:'p3', title:'Neuro-Design Principles',          description:'Design with the brain in mind — cognitive load and attention.', category:'Design', isPremium:true, likeCount:201, creatorName:'Deepika Menon' },
  { id:'p4', title:'Hidden Patterns in Viral Ideas',   description:'Data analysis of 10,000 viral ideas — what makes them spread.', category:'Science', isPremium:true, likeCount:387, creatorName:'Vikram Patel' },
  { id:'p5', title:'AI Prompt Engineering Masterclass',description:'Advanced techniques for getting 10x results from AI.', category:'Technology', isPremium:true, likeCount:521, creatorName:'Rahul Gupta' },
  { id:'p6', title:'Zero-Code Startup in 7 Days',      description:'Launch a profitable startup without writing a single line.', category:'Business', isPremium:true, likeCount:289, creatorName:'Anita Roy' },
];

export default function Premium() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isPremium = user?.isPremium;
  const [ideas, setIdeas]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ideas/premium')
      .then(({ data }) => setIdeas(data))
      .catch(() => setIdeas(MOCK))
      .finally(() => setLoading(false));
  }, []);

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
          <span className="text-white font-bold text-lg flex-1">Premium Ideas</span>
          {!isPremium && (
            <button
              onClick={() => navigate('/membership')}
              className="bg-white/15 hover:bg-white/25 text-white text-sm font-bold px-4 py-2 rounded-full border border-white/30 active:scale-95 transition-all backdrop-blur-sm"
            >
              Upgrade →
            </button>
          )}
        </div>

        {/* floating status card */}
        <div className="relative z-10 mt-6">
          {isPremium ? (
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4 shadow-md flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">💎</div>
              <div>
                <div className="text-white font-bold text-base">Premium Member</div>
                <div className="text-blue-200 text-sm">Full access to all exclusive ideas</div>
              </div>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4 shadow-md">
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">⭐</span>
                <div className="flex-1">
                  <h2 className="text-white font-bold text-base mb-1">Unlock Premium Ideas</h2>
                  <p className="text-blue-200 text-sm leading-relaxed mb-3">Access exclusive ideas from expert creators. From ₹99/month.</p>
                  <div className="grid grid-cols-2 gap-1.5 mb-4">
                    {['Unlimited access', 'Early access', 'Creator support', 'Ad-free'].map(f => (
                      <span key={f} className="text-blue-100 text-xs flex items-center gap-1.5">
                        <span className="text-white">✓</span>{f}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate('/membership')}
                    className="bg-white text-[#1565C0] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 active:scale-95 transition-all shadow-sm"
                  >
                    View Plans →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* CONTENT WRAPPER — matches Home */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6 px-4">

          <p className="text-[#90A4AE] text-[15px] mb-5">{ideas.length} exclusive ideas</p>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 pb-6">
              {Array(6).fill(0).map((_, i) => (
                <IdeaCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 pb-6">
              {ideas.map((idea) => (
                <div key={idea.id} className="relative transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <IdeaCard idea={idea}/>
                  {!isPremium && (
                    <div
                      onClick={() => navigate('/membership')}
                      className="absolute inset-0 bg-white/80 hover:bg-white/90 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <div className="w-11 h-11 bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl flex items-center justify-center text-xl shadow-sm">🔒</div>
                      <span className="text-sm text-[#1565C0] font-semibold">Premium only</span>
                      <span className="text-[#1565C0] text-xs font-medium">Upgrade →</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      <BottomNav/>
    </div>
  );
}