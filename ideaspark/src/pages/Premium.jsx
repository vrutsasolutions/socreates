import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import IdeaCard from '../components/common/IdeaCard.premium';
import BottomNav from '../components/common/BottomNav.premium';
import Icon from '../components/common/Icon';

const MOCK = [
  { id:'p1', title:'Quantum Computing for Startups', description:'How early-stage companies can leverage quantum algorithms today.', category:'Technology', isPremium:true, likeCount:312, creatorName:'Arjun Sharma' },
  { id:'p2', title:'The $0 to $1M Content Strategy', description:'Exact playbook used to grow from zero to one million dollars.', category:'Business', isPremium:true, likeCount:498, creatorName:'Priya Nair' },
  { id:'p3', title:'Neuro-Design Principles', description:'Design with the brain in mind — cognitive load and attention.', category:'Design', isPremium:true, likeCount:201, creatorName:'Deepika Menon' },
  { id:'p4', title:'Hidden Patterns in Viral Ideas', description:'Data analysis of 10,000 viral ideas — what makes them spread.', category:'Science', isPremium:true, likeCount:387, creatorName:'Vikram Patel' },
  { id:'p5', title:'AI Prompt Engineering Masterclass', description:'Advanced techniques for getting 10x results from AI.', category:'Technology', isPremium:true, likeCount:521, creatorName:'Rahul Gupta' },
  { id:'p6', title:'Zero-Code Startup in 7 Days', description:'Launch a profitable startup without writing a single line.', category:'Business', isPremium:true, likeCount:289, creatorName:'Anita Roy' },
];

export default function Premium() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPremium = user?.isPremium;

  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ideas/premium')
      .then(({ data }) => setIdeas(data))
      .catch(() => setIdeas(MOCK))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen  pb-24 overflow-x-hidden">

      {/* HEADER (NOW MATCHES HOME EXACTLY) */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10 overflow-hidden">

        {/* HOME-LIKE RINGS */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        {/* TOP BAR (NO STRUCTURE CHANGE) */}
        <div className="flex items-center relative z-10">
          
<button
  onClick={() => navigate(-1)}
  aria-label="Go back"
  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
>
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
</button>

          <h1 className="flex-1 text-center text-white font-bold text-lg">
            Premium Ideas
          </h1>

          {/* UPDATED BUTTON (NEW UI STYLE) */}
          {!isPremium && (
            <button
              onClick={() => navigate('/membership')}
              className="
                px-3 py-1.5 rounded-full text-xs font-semibold
                bg-[#1565C0] bg-white/10 text-white border border-white/20
                backdrop-blur-md active:scale-95 transition bg-[#1565C0]  hover:bg-[#0D47A1]
    hover:shadow-md
    hover:-translate-y-[1px]
    active:scale-95
              "
            >
              Upgrade
            </button>
          )}
        </div>

      </header>

      {/* CONTENT */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] px-4 pt-4 relative z-20 overflow-hidden">

          {/* PREMIUM BANNER */}
          {!isPremium ? (
            <div className="mb-4 bg-[#FFF8E1] border border-[#FACC15]/30 rounded-2xl p-5">
              <h2 className="text-[#1565C0] font-bold text-base mb-1">
                Unlock Premium Ideas
              </h2>
              <p className="text-[#90A4AE] text-xs mb-3">
                Access exclusive ideas from expert creators.
              </p>

              <button
                onClick={() => navigate('/membership')}
                className="bg-[#1565C0] text-white text-sm font-semibold px-5 py-2.5 rounded-2xl active:scale-95 transition"
              >
                View Plans →
              </button>
            </div>
          ) : (
            <div className="mb-4 bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#BBDEFB] rounded-2xl flex items-center justify-center">
                <Icon name="gem" className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <div>
                <div className="text-[#1565C0] font-semibold text-sm">
                  Premium Member
                </div>
                <div className="text-[#90A4AE] text-xs">
                  Full access enabled
                </div>
              </div>
            </div>
          )}

          <p className="text-[#90A4AE] text-sm mb-4">
            {ideas.length} exclusive ideas
          </p>

          {/* GRID */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-[#F0F6FF] rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-36 bg-[#BBDEFB]" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-[#BBDEFB] rounded w-3/4" />
                    <div className="h-2.5 bg-[#BBDEFB] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-6">
              {ideas.map((idea) => (
                // IdeaCard already shows the image, title, and a 1-line
                // preview with the rest blurred for non-subscribers (same
                // treatment as Home/Search/Saved) — no separate lock overlay
                // needed here anymore.
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}

        </div>
      </div>

      <BottomNav />
    </div>
  );
}
