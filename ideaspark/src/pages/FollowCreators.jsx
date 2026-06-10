import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import Icon from '../components/common/Icon';

const MOCK_CREATORS = [
  { id: '1', name: 'Arjun Sharma',  category: 'Technology', ideaCount: 42, isPremium: true  },
  { id: '2', name: 'Priya Nair',    category: 'Design',     ideaCount: 28, isPremium: false },
  { id: '3', name: 'Rahul Gupta',   category: 'Business',   ideaCount: 35, isPremium: true  },
  { id: '4', name: 'Deepika Menon', category: 'Art',        ideaCount: 19, isPremium: false },
  { id: '5', name: 'Vikram Patel',  category: 'Science',    ideaCount: 56, isPremium: true  },
  { id: '6', name: 'Sneha Reddy',   category: 'Health',     ideaCount: 23, isPremium: false },
];

export default function FollowCreators() {
  const navigate = useNavigate();
  const [creators, setCreators] = useState([]);
  const [followed, setFollowed] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/users/suggested-creators')
      .then(({ data }) => setCreators(data))
      .catch(() => setCreators(MOCK_CREATORS))
      .finally(() => setLoading(false));
  }, []);

  const toggleFollow = (id) =>
    setFollowed((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

  const handleFinish = async () => {
    try {
      if (followed.length > 0) await api.post('/users/follow-bulk', { userIds: followed });
    } catch (_) {}
    // Final onboarding step: optional profile verification (skippable from there).
    navigate('/verify-profile?from=onboarding');
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* HEADER — matches Home */}
      <header className="bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        {/* step indicator in top bar */}
        <div className="flex items-center gap-3 relative z-10">
          <span className="text-blue-200 text-xs font-bold tracking-widest uppercase">Step 2 of 2</span>
          <div className="flex gap-1.5 flex-1">
            <div className="flex-1 h-1 bg-white rounded-full" />
            <div className="flex-1 h-1 bg-white rounded-full" />
          </div>
        </div>

        {/* floating title card */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4 shadow-md">
            <h1 className="text-white text-xl font-bold mb-1">Follow top creators</h1>
            <p className="text-blue-200 text-[15px] leading-relaxed">
              Their ideas will appear in your feed. You can always change this later.
            </p>
          </div>
        </div>
      </header>

      {/* CONTENT WRAPPER — matches Home */}
      <div className="bg-[#1565C0] flex-1">
        <div className="bg-white rounded-t-[32px] pt-5 pb-6 flex flex-col min-h-full">

          {/* Creator list */}
          <div className="flex-1 px-4 space-y-3">
            {loading
              ? Array(5).fill(0).map((_, i) => (
                  <div key={i} className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                    <div className="w-12 h-12 bg-[#BBDEFB] rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-[#BBDEFB] rounded w-32" />
                      <div className="h-3 bg-[#BBDEFB] rounded w-24" />
                    </div>
                    <div className="w-20 h-9 bg-[#BBDEFB] rounded-2xl shrink-0" />
                  </div>
                ))
              : creators.map((creator) => {
                  const isFollowed = followed.includes(creator.id);
                  return (
                    <div key={creator.id}
                      className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 flex items-center gap-3 hover:border-[#1565C0] hover:shadow-md transition-all duration-200">

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {creator.profileImage ? (
                          <img src={creator.profileImage} alt={creator.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-[#BBDEFB]" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#1565C0] flex items-center justify-center text-white font-bold text-lg">
                            {creator.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        {creator.isPremium && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white border border-[#BBDEFB] rounded-full flex items-center justify-center shadow-sm">
                            <Icon name="star" className="w-3 h-3 text-[#1565C0]" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[#0D2137] font-semibold text-[15px] truncate">{creator.name}</div>
                        <div className="text-[#90A4AE] text-sm mt-0.5">
                          {creator.ideaCount ?? 0} ideas · {creator.category}
                        </div>
                      </div>

                      {/* Follow button */}
                      <button
                        onClick={() => toggleFollow(creator.id)}
                        className={`shrink-0 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95
                          ${isFollowed
                            ? 'bg-[#E3F2FD] text-[#1565C0] border border-[#1565C0]'
                            : 'bg-[#1565C0] text-white hover:bg-[#0D47A1]'}`}
                      >
                        {isFollowed ? '✓ Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })}
          </div>

          {/* Footer CTA */}
          <div className="px-4 mt-6">
            <button
              onClick={handleFinish}
              className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-semibold py-4 rounded-2xl transition-all active:scale-[0.97] shadow-md shadow-blue-200 text-[15px]"
            >
              {followed.length > 0 ? `Following ${followed.length} · Go to Feed →` : 'Skip for now →'}
            </button>
            {followed.length === 0 && (
              <p className="text-center text-[#90A4AE] text-sm mt-3">
                You can follow creators from the feed anytime
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}