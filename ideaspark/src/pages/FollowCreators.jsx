import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';

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
    setFollowed((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const handleFinish = async () => {
    try {
      if (followed.length > 0) {
        await api.post('/users/follow-bulk', { userIds: followed });
      }
    } catch (_) {}
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-[#F0F6FF] px-5 py-10 flex flex-col">

      <div className="max-w-md mx-auto w-full flex flex-col flex-1">

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="text-[#1565C0] text-xs font-semibold tracking-widest uppercase mb-3">
            Step 2 of 2
          </div>
          <div className="flex gap-2 mb-6">
            <div className="flex-1 h-1 bg-[#1565C0] rounded-full" />
            <div className="flex-1 h-1 bg-[#1565C0] rounded-full" />
          </div>
          <h1 className="text-black text-2xl font-bold tracking-tight mb-2">
            Follow top creators
          </h1>
          <p className="text-[#546E7A] text-sm leading-relaxed">
            Their ideas will appear in your feed. You can always change this later.
          </p>
        </div>

        {/* Creator List */}
        <div className="flex-1 space-y-3">
          {loading
            ? Array(5).fill(0).map((_, i) => (
                <div key={i}
                  className="bg-white border border-[#BBDEFB] rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-[#E3F2FD] rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-[#E3F2FD] rounded w-32" />
                    <div className="h-3 bg-[#E3F2FD] rounded w-48" />
                  </div>
                  <div className="w-20 h-8 bg-[#E3F2FD] rounded-2xl shrink-0" />
                </div>
              ))
            : creators.map((creator) => {
                const isFollowed = followed.includes(creator.id);
                return (
                  <div key={creator.id}
                    className="bg-white border border-[#BBDEFB] rounded-2xl p-4 flex items-center gap-3 transition-all duration-200">

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {creator.profileImage ? (
                        <img src={creator.profileImage} alt={creator.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#BBDEFB]"/>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#1565C0] flex items-center justify-center text-white font-bold text-lg">
                          {creator.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      {creator.isPremium && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-xs shadow">
                          ⭐
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-black font-semibold text-sm truncate">
                        {creator.name}
                      </div>
                      <div className="text-[#90A4AE] text-xs mt-0.5">
                        {creator.ideaCount ?? 0} ideas · {creator.category}
                      </div>
                    </div>

                    {/* Follow Button */}
                    <button onClick={() => toggleFollow(creator.id)}
                      className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-semibold transition-all duration-200 active:scale-95
                        ${isFollowed
                          ? 'bg-[#E3F2FD] text-[#1565C0] border border-[#1565C0]'
                          : 'bg-[#1565C0] text-white hover:bg-[#0D47A1]'}`}>
                      {isFollowed ? '✓ Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}
        </div>

        {/* Footer CTA */}
        <div className="mt-6">
          <button onClick={handleFinish}
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-semibold py-4 rounded-2xl transition-all duration-200 active:scale-95 shadow-md shadow-blue-200">
            {followed.length > 0
              ? `Following ${followed.length} · Go to Feed →`
              : 'Skip for now →'}
          </button>

          {followed.length === 0 && (
            <p className="text-center text-[#90A4AE] text-xs mt-3">
              You can follow creators from the feed anytime
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
