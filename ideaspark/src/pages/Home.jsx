import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav.premium';
import NotificationBell from '../components/common/NotificationBell';
import MessageBell from '../components/common/MessageBell';
import DrawerMenu from '../components/common/DrawerMenu.premium';
import IdeaCard, { IdeaCardSkeleton } from '../components/common/IdeaCard.premium';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { EmptyFeed, EmptyForYou } from '../components/common/EmptyStates.premium';
import Icon from '../components/common/Icon';
import scWordmark from '../assets/sc-wordmark.png';

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
  const [activeTab, setActiveTab] = useState('Trending');
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen bg-[#F4F7FF] pb-24">

      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">

        {/* decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        {/* top bar */}
        <div className="flex items-center gap-5 relative z-10">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="w-9 h-9 flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all"
          >
            <Icon name="menu" className="w-6 h-6" />
          </button>

          <div className="flex items-center flex-1">
            <img src={scWordmark} alt="SoCreate" className="h-8 w-auto object-contain" draggable="false" />
          </div>

          <button
            onClick={() => navigate('/search')}
            className="w-9 h-9 flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <NotificationBell />

          <MessageBell />
        </div>

        {/* floating greeting card */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4 shadow-md flex items-center gap-3">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user?.name || 'You'}
                className="w-12 h-12 rounded-2xl object-cover border border-white/20 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                Hey, {user?.name?.split(' ')[0] ?? 'there'}
                <Icon name="hand" className="w-6 h-6 text-amber-300" />
              </h2>
              <p className="text-blue-200 text-[15px] mt-1">
                Discover ideas, connect with creators, and build something meaningful
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT WRAPPER */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6">

          {/* TABS */}
          <div className="flex gap-3 px-4 mb-5 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-5 py-3 rounded-2xl text-[15px] font-semibold transition-all active:scale-95
                  ${activeTab === tab
                    ? 'bg-[#1565C0] text-white shadow-lg shadow-blue-300/40'
                    : 'bg-[#F0F6FF] text-[#1565C0] border border-[#BBDEFB] hover:bg-[#DBEAFE] hover:border-[#1565C0]'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* FEED */}
          <div className="px-4 pt-2">
            {loading ? (
              <div>
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="py-5 border-b border-[#F0F2F8] last:border-b-0">
                    <IdeaCardSkeleton variant="list" />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {ideas.map((idea) => (
                  <div
                    key={idea.id}
                    className="py-5 border-b border-[#F0F2F8] last:border-b-0"
                  >
                    <IdeaCard idea={idea} variant="list" />
                  </div>
                ))}
              </div>
            )}

            {!loading && ideas.length === 0 && (
              activeTab === 'For You' ? <EmptyForYou /> : <EmptyFeed />
            )}
          </div>

        </div>
      </div>

      {/* Floating AI assistant — sits above the bottom nav, opens the SparkBot chat */}
      <button
        onClick={() => navigate('/assistant')}
        aria-label="SoCreate AI"
        className="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-2xl flex items-center justify-center text-white active:scale-95 transition-transform"
        style={{
          background: 'linear-gradient(135deg, #1976D2, #0D47A1)',
          boxShadow: '0 8px 24px rgba(13,71,161,0.40)',
        }}
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2l1.6 4.6L18 8.2l-4.4 1.6L12 14l-1.6-4.2L6 8.2l4.4-1.6L12 2z" />
          <path d="M19 13l.8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13z" />
        </svg>
      </button>

      <BottomNav />
    </div>
  );
}