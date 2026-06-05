import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav.premium';
import IdeaCard, { IdeaCardSkeleton } from '../components/common/IdeaCard.premium';
import { searchIdeas } from '../api/searchApi';

const CATEGORIES = ['All','Technology','Design','Business','Science','Art','Health','Education','Finance'];
const TRENDING   = ['AI Tools','Startup Ideas','Passive Income','Design System','No-Code Apps','Mental Health'];

export default function Search() {
  const navigate = useNavigate();
  const inputRef        = useRef();
  const [query, setQuery]       = useState('');
  const [category, setCategory] = useState('All');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef();

  const doSearch = async (q, cat) => {
    if (!q.trim() && cat === 'All') { setResults([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    try {
      const { data } = await searchIdeas({ q, category: cat });
      setResults(data);
    } catch { setResults([]); }
    setLoading(false);
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, category), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, category]);

  const handleTrending = (term) => { setQuery(term); inputRef.current?.focus(); };

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-24">

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
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-bold text-lg flex-1">Explore Ideas</span>
        </div>

        {/* floating search card */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 shadow-md">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-white/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search ideas, categories, creators..."
                className="flex-1 bg-transparent text-white text-[15px] placeholder-white/50 outline-none"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-white/70 hover:text-white transition-colors active:scale-90 text-lg leading-none"
                >
                  ✕
                </button>
              )}
            </div>

            {/* category chips inside card */}
            <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-0.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95
                    ${category === cat
                      ? 'bg-white text-[#1565C0]'
                      : 'bg-white/15 text-white border border-white/20 hover:bg-white/25'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT WRAPPER — matches Home */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6">
          <div className="px-4">

            {/* Trending — shown when no search active */}
            {!searched && (
              <>
                <h2 className="text-[#0D2137] text-xs font-semibold uppercase tracking-widest mb-3">
                  🔥 Trending Searches
                </h2>
                <div className="flex flex-wrap gap-2 mb-6">
                  {TRENDING.map(term => (
                    <button
                      key={term}
                      onClick={() => handleTrending(term)}
                      className="bg-[#F0F6FF] border border-[#BBDEFB] text-[#0D2137] text-sm px-4 py-2 rounded-2xl hover:bg-[#DBEAFE] hover:border-[#1565C0] hover:text-[#1565C0] active:scale-95 transition-all"
                    >
                      {term}
                    </button>
                  ))}
                </div>

                <h2 className="text-[#0D2137] text-xs font-semibold uppercase tracking-widest mb-3">
                  💡 Browse by Category
                </h2>
                <div className="grid grid-cols-2 gap-3 pb-6">
                  {CATEGORIES.slice(1).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className="bg-[#F0F6FF] border border-[#BBDEFB] text-[#0D2137] text-[15px] font-medium py-3.5 rounded-2xl hover:bg-[#DBEAFE] hover:border-[#1565C0] hover:text-[#1565C0] active:scale-95 transition-all text-left px-4"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="grid grid-cols-2 gap-4 pb-6">
                {Array(4).fill(0).map((_, i) => (
                  <IdeaCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Results */}
            {!loading && searched && (
              <>
                <p className="text-[#546E7A] text-[15px] mb-4">
                  {results.length > 0 ? `${results.length} results` : 'No results found'}
                  {query && (
                    <span className="text-[#90A4AE]"> for "<span className="text-[#0D2137] font-medium">{query}</span>"</span>
                  )}
                </p>

                {results.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 pb-6">
                    {results.map(idea => (
                      <div key={idea.id} className="transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                        <IdeaCard idea={idea}/>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">🔍</div>
                    <p className="text-[#0D2137] font-semibold text-base">No ideas found</p>
                    <p className="text-[#90A4AE] text-sm mt-1">Try different keywords or a different category</p>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>

      <BottomNav/>
    </div>
  );
}