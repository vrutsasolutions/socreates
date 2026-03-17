import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';

// Fallback mock data while API is being built
const MOCK_CREATORS = [
  { id: '1', name: 'Arjun Sharma',   category: 'Technology', ideaCount: 42, isPremium: true  },
  { id: '2', name: 'Priya Nair',     category: 'Design',     ideaCount: 28, isPremium: false },
  { id: '3', name: 'Rahul Gupta',    category: 'Business',   ideaCount: 35, isPremium: true  },
  { id: '4', name: 'Deepika Menon',  category: 'Art',        ideaCount: 19, isPremium: false },
  { id: '5', name: 'Vikram Patel',   category: 'Science',    ideaCount: 56, isPremium: true  },
  { id: '6', name: 'Sneha Reddy',    category: 'Health',     ideaCount: 23, isPremium: false },
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
    } catch (_) {
      // non-critical — navigate anyway
    }
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-5 py-10 flex flex-col">

      {/* Background glow */}
      <div className="fixed top-[-60px] right-0 w-72 h-72
                      bg-purple-700/20 rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="relative z-10 max-w-md mx-auto w-full flex flex-col flex-1">

        {/* Step indicator */}
        <div className="mb-8">
          <div className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-3">
            Step 2 of 2
          </div>
          {/* Both bars filled on step 2 */}
          <div className="flex gap-2 mb-6">
            <div className="flex-1 h-1 bg-violet-500 rounded-full" />
            <div className="flex-1 h-1 bg-violet-500 rounded-full" />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight mb-2">
            Follow top creators
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Their ideas will appear in your feed. You can always change this later.
          </p>
        </div>

        {/* Creator list */}
        <div className="flex-1 space-y-3">
          {loading
            ? /* Skeleton loading cards */
              Array(5).fill(0).map((_, i) => (
                <div key={i}
                     className="bg-[#1a1a2e] rounded-2xl p-4 flex items-center
                                gap-3 animate-pulse border border-[#2a2a3e]">
                  <div className="w-12 h-12 bg-[#2a2a3e] rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-[#2a2a3e] rounded w-32" />
                    <div className="h-3 bg-[#2a2a3e] rounded w-48" />
                  </div>
                  <div className="w-20 h-8 bg-[#2a2a3e] rounded-xl shrink-0" />
                </div>
              ))
            : creators.map((creator) => {
                const isFollowed = followed.includes(creator.id);
                return (
                  <div
                    key={creator.id}
                    className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-2xl
                               p-4 flex items-center gap-3
                               transition-all duration-200"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {creator.profileImage ? (
                        <img
                          src={creator.profileImage}
                          alt={creator.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br
                                        from-violet-500 to-purple-600
                                        flex items-center justify-center
                                        text-white font-bold text-lg">
                          {creator.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      {/* Premium badge */}
                      {creator.isPremium && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5
                                        bg-amber-400 rounded-full flex items-center
                                        justify-center text-xs shadow">
                          ⭐
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm truncate">
                        {creator.name}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {creator.ideaCount ?? 0} ideas · {creator.category}
                      </div>
                    </div>

                    {/* Follow / Following button */}
                    <button
                      onClick={() => toggleFollow(creator.id)}
                      className={`shrink-0 px-4 py-2 rounded-xl text-xs
                                  font-semibold transition-all duration-200
                                  active:scale-95
                        ${isFollowed
                          ? 'bg-violet-600/20 text-violet-400 border border-violet-500'
                          : 'bg-violet-600 text-white hover:bg-violet-500'}`}
                    >
                      {isFollowed ? '✓ Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}
        </div>

        {/* Footer CTA */}
        <div className="mt-6">
          <button
            onClick={handleFinish}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-500
                       hover:from-violet-500 hover:to-purple-400
                       text-white font-semibold py-4 rounded-2xl
                       transition-all duration-200 active:scale-95
                       shadow-lg shadow-violet-500/25"
          >
            {followed.length > 0
              ? `Following ${followed.length} · Go to Feed →`
              : 'Skip for now →'}
          </button>

          {followed.length === 0 && (
            <p className="text-center text-slate-600 text-xs mt-3">
              You can follow creators from the feed anytime
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
