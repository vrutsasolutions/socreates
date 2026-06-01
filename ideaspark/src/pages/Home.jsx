import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav';
import DrawerMenu from '../components/common/DrawerMenu';
import IdeaCard from '../components/common/IdeaCard';
import { useAuth } from '../context/AuthContext';
import { fetchIdeas } from '../api/ideaApi';
import { MOCK_IDEAS } from '../api/mockData';

const TABS = ['Trending', 'Latest', 'For You'];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab]   = useState('Trending');
  const [ideas, setIdeas]           = useState([]);
  const [loading, setLoading]       = useState(true);

  const loadIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchIdeas({ sort: activeTab.toLowerCase() });
      setIdeas(data);
    } catch {
      setIdeas(MOCK_IDEAS);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadIdeas(); }, [loadIdeas]);

  return (
    <div className="min-h-screen bg-white pb-24">

      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 py-3 flex items-center gap-3">
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
        <button className="w-9 h-9 flex items-center justify-center text-white relative">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-400 rounded-full" />
        </button>
      </header>

      {/* Greeting */}
      <div className="bg-[#1565C0] px-4 pb-5">
        <h2 className="text-white text-xl font-bold">
          Hey, {user?.name?.split(' ')[0] ?? 'there'} 👋
        </h2>
        <p className="text-blue-200 text-sm mt-0.5">Discover ideas that inspire you</p>
      </div>

      {/* White curve */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-3xl pt-4">
          {/* Tabs */}
          <div className="flex gap-2 px-4 mb-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`shrink-0 px-5 py-2 rounded-xl text-sm font-semibold transition-all
                        ${activeTab === tab
                          ? 'bg-[#1565C0] text-white shadow-md shadow-blue-300/40'
                          : 'bg-[#F0F6FF] text-[#1565C0] border border-[#BBDEFB]'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Feed */}
          <div className="px-4">
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
              <div className="grid grid-cols-2 gap-3">
                {ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
              </div>
            )}

            {!loading && ideas.length === 0 && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">💡</div>
                <p className="text-[#1565C0] font-semibold">No ideas yet</p>
                <p className="text-[#90A4AE] text-xs mt-1">Be the first to share one!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
