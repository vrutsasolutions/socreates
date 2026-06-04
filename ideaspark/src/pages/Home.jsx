import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav.premium';
import NotificationBell from '../components/common/NotificationBell';
import DrawerMenu from '../components/common/DrawerMenu.premium';
import IdeaCard, { IdeaCardSkeleton } from '../components/common/IdeaCard.premium';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { FeedSkeleton } from '../components/common/LoadingStates.premium';
import { EmptyFeed, EmptyForYou } from '../components/common/EmptyStates.premium';
import { NetworkError, IdeaLoadError, ServerError } from '../components/common/ErrorStates.premium';
import { AIOnboardingPrompt } from '../components/common/AIInteractions.premium';

const TABS = ['Trending', 'Latest', 'For You'];

const MOCK_IDEAS = [
  { id: '1', title: 'AI-Powered Plant Doctor App', description: 'Take a photo of your plant and get instant diagnosis using computer vision.', category: 'Technology', isPremium: false, likeCount: 142, creatorName: 'Arjun Sharma', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', title: 'Micro-Learning Platform', description: 'Learn any skill in 5-minute daily sessions. Gamified progress tracking.', category: 'Education', isPremium: true, likeCount: 89, creatorName: 'Priya Nair', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', title: 'Food Rescue Network', description: 'Connect restaurants with surplus food to nearby NGOs in real-time.', category: 'Social', isPremium: false, likeCount: 203, creatorName: 'Rahul Gupta', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '4', title: 'Digital Wardrobe Stylist', description: 'Photograph your wardrobe once, get AI outfit suggestions every morning.', category: 'Design', isPremium: true, likeCount: 67, creatorName: 'Deepika Menon', createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: '5', title: 'Community Skill Swap', description: 'Trade your skills with others. Teach coding, learn cooking. No money needed.', category: 'Business', isPremium: false, likeCount: 310, creatorName: 'Vikram Patel', createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: '6', title: 'Mental Wellness Journal', description: 'Daily mood tracking with AI-powered insights and personalized recommendations.', category: 'Health', isPremium: false, likeCount: 178, creatorName: 'Sneha Reddy', createdAt: new Date(Date.now() - 345600000).toISOString() },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab]   = useState('Trending');
  const [ideas, setIdeas]           = useState([]);
  const [loading, setLoading]       = useState(true);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/ideas?sort=${activeTab.toLowerCase()}`);
      setIdeas(data);
    } catch (_) {
      setIdeas(MOCK_IDEAS);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-24 overflow-x-hidden">

      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 py-4 flex items-center gap-4 relative overflow-hidden fade-up">
        <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
<div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        <button onClick={() => setDrawerOpen(true)}
                className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 text-white">
          <span className="w-5 h-0.5 bg-white rounded-full" />
          <span className="w-4 h-0.5 bg-white rounded-full self-start ml-[2px]" />
          <span className="w-5 h-0.5 bg-white rounded-full" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">💡</span>
          <span className="text-white font-bold text-lg tracking-tight">IdeaSpark</span>
        </div>
        <button onClick={() => navigate('/search')}
                className="w-9 h-9 flex items-center justify-center text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <NotificationBell />
      </header>

      {/* Greeting */}
      <div className="bg-[#1565C0] px-4 pb-5 fade-up">
        <h2 className="text-white text-xl font-bold">
          Hey, {user?.name?.split(' ')[0] ?? 'there'} 👋
        </h2>
        <p className="text-blue-200 text-sm mt-0.5">Discover ideas that inspire you</p>
      </div>

      {/* White curve */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6">
          {/* Tabs */}
          <div className="flex gap-3 px-4 mb-4 overflow-x-auto fade-up-d1">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`shrink-0 px-5 py-2 rounded-2xl text-sm font-semibold transition-all
                        ${activeTab === tab
                          ? 'bg-[#1565C0] text-white shadow-lg shadow-blue-300/40'
                          : 'bg-[#F0F6FF] text-[#1565C0] border border-[#BBDEFB]'}`}>
                {tab}
              </button>
            ))}
          </div>
          <AIOnboardingPrompt onDismiss={() => {}} onTryAI={() => navigate('/add-idea')} />

          {/* Feed */}
          <div className="px-4 fade-up-d3">
            {loading ? (
              // <div className="grid grid-cols-2 gap-3">
              //   {Array(6).fill(0).map((_, i) => (
              //     <div key={i} className="bg-[#F0F6FF] rounded-2xl overflow-hidden animate-pulse">
              //       <div className="h-36 bg-[#BBDEFB]" />
              //       <div className="p-3 space-y-2">
              //         <div className="h-3 bg-[#BBDEFB] rounded w-3/4" />
              //         <div className="h-2.5 bg-[#BBDEFB] rounded" />
              //       </div>
              //     </div>
              //   ))}
              // </div>
              <div className="grid grid-cols-2 gap-3">
                {Array(6).fill(0).map((_, i) => (
                  <IdeaCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
              </div>
            )}

            {!loading && ideas.length === 0 && (
              activeTab === 'For You' ? <EmptyForYou /> : <EmptyFeed />
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
