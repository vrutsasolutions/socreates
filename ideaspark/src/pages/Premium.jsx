import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PremiumPageSkeleton } from '../components/common/LoadingStates.premium';
import { EmptyPremium } from '../components/common/EmptyStates.premium';
import { IdeaLoadError, ServerError, PermissionError } from '../components/common/ErrorStates.premium';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';

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
    api.get('/ideas/premium').then(({ data }) => setIdeas(data)).catch(() => setIdeas(MOCK)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="sticky top-0 z-30 bg-[#1565C0] border-b border-[#BBDEFB] px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-blue-200 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Premium Ideas</h1>
        {!isPremium && <button onClick={() => navigate('/membership')} className="bg-[#FACC15]/20 text-[#78350F] text-xs font-bold px-3 py-1.5 rounded-full border border-[#FACC15]/50">Upgrade ⭐</button>}
      </header>

      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-3xl px-4 pt-4">

          {!isPremium && (
            <div className="mt-2 mb-4 bg-[#FFF8E1] border border-[#FACC15]/40 rounded-2xl p-5">
              <div className="flex gap-3"><span className="text-3xl shrink-0">⭐</span>
                <div>
                  <h2 className="text-[#1565C0] font-bold text-base mb-1">Unlock Premium Ideas</h2>
                  <p className="text-[#90A4AE] text-xs leading-relaxed mb-3">Access exclusive ideas from expert creators. From ₹99/month.</p>
                  <div className="grid grid-cols-2 gap-1 mb-4">
                    {['Unlimited access','Early access','Creator support','Ad-free'].map(f => (
                      <span key={f} className="text-[#1565C0] text-xs flex items-center gap-1"><span className="text-[#1565C0]">✓</span>{f}</span>
                    ))}
                  </div>
                  <button onClick={() => navigate('/membership')} className="bg-[#1565C0] text-white font-bold text-sm px-5 py-2.5 rounded-xl active:scale-95 transition">View Plans →</button>
                </div>
              </div>
            </div>
          )}

          {isPremium && (
            <div className="mt-2 mb-4 bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#BBDEFB] rounded-xl flex items-center justify-center text-xl">💎</div>
              <div><div className="text-[#1565C0] font-semibold text-sm">Premium Member</div><div className="text-[#90A4AE] text-xs">Full access to all exclusive ideas</div></div>
            </div>
          )}

          <p className="text-[#90A4AE] text-sm mb-4">{ideas.length} exclusive ideas</p>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">{Array(6).fill(0).map((_,i) => <div key={i} className="bg-[#F0F6FF] rounded-2xl overflow-hidden animate-pulse"><div className="h-36 bg-[#BBDEFB]"/><div className="p-3 space-y-2"><div className="h-3 bg-[#BBDEFB] rounded w-3/4"/><div className="h-2.5 bg-[#BBDEFB] rounded"/></div></div>)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ideas.map((idea) => (
                <div key={idea.id} className="relative">
                  <IdeaCard idea={idea}/>
                  {!isPremium && (
                    <div onClick={() => navigate('/membership')} className="absolute inset-0 bg-white/80 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer">
                      <div className="w-10 h-10 bg-[#F0F6FF] border border-[#BBDEFB] rounded-xl flex items-center justify-center text-xl">🔒</div>
                      <span className="text-xs text-[#1565C0] font-medium">Premium only</span>
                      <span className="text-[#1565C0] text-xs">Upgrade →</span>
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
