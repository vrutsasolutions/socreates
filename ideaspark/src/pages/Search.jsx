import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav.premium';
import IdeaCard, { IdeaCardSkeleton } from '../components/common/IdeaCard.premium';
import { searchIdeas } from '../api/searchApi';
import { fetchIdeasOfTheDay } from '../api/ideaApi';
import { SearchSkeleton, SearchResultsSkeleton } from '../components/common/LoadingStates.premium';
import { EmptySearch } from '../components/common/EmptyStates.premium';
import Icon from '../components/common/Icon';
import { CATEGORIES as ALL_CATEGORIES } from '../constants/categories';
import { CATEGORY_COLORS, defaultColor, IdeaIcon } from '../components/common/categoryIcons';

const CATEGORIES = ['All', ...ALL_CATEGORIES];

export default function Search() {
  const navigate         = useNavigate();
  const inputRef        = useRef();
  const [query, setQuery]       = useState('');
  const [category, setCategory] = useState('All');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef();

  // "Ideas of the Day" — today's top idea(s) by views + likes, replaces the
  // old static Trending Searches buttons. Ranking is server-computed and
  // naturally shifts day to day as views/likes change.
  const [ideasOfDay, setIdeasOfDay]     = useState([]);
  const [loadingOfDay, setLoadingOfDay] = useState(true);

  useEffect(() => {
    fetchIdeasOfTheDay(2)
      .then(({ data }) => setIdeasOfDay(data || []))
      .catch(() => setIdeasOfDay([]))
      .finally(() => setLoadingOfDay(false));
  }, []);

  const openIdea = (idea) => navigate(idea.isPremium ? `/premium/${idea.id}` : `/ideas/${idea.id}`);

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

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-24">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-3 relative overflow-hidden">
        <div className="pointer-events-none absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
        <div className="pointer-events-none absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />

        {/* Search Bar */}
        <div className="flex items-center gap-3 bg-white border border-[#BBDEFB] rounded-2xl px-4 py-3 focus-within:border-[#1565C0] transition">
          <svg className="w-4 h-4 text-[#90A4AE] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search ideas, categories, creators..."
            className="flex-1 bg-transparent text-[#0D2137] text-sm placeholder-[#90A4AE] outline-none focus:outline-none focus:ring-0 focus:shadow-none border-none appearance-none"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#90A4AE] hover:text-[#0D2137] transition text-sm">✕</button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all
                ${category === cat
                  ? 'bg-white text-[#1565C0] font-bold'
                  : 'bg-[#1565C0]/30 text-white border border-white/30 hover:bg-white/20'}`}>
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-5">

        {/* Ideas of the Day — shown when no search active */}
        {!searched && (
          <>
            <h2 className="text-[#0D2137] text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Icon name="flame" className="w-4 h-4 text-[#EF4444]" /> Ideas of the Day
            </h2>

            {loadingOfDay ? (
              <div className="flex flex-col gap-2 mb-5">
                {Array(2).fill(0).map((_, i) => (
                  <div key={i} className="h-[60px] bg-white border border-[#BBDEFB] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : ideasOfDay.length > 0 ? (
              <div className="flex flex-col gap-2 mb-5">
                {ideasOfDay.map((idea, idx) => (
                  <button key={idea.id} onClick={() => openIdea(idea)}
                    className="flex items-center justify-between gap-3 bg-white border border-[#BBDEFB] rounded-2xl px-4 py-3 text-left hover:border-[#1565C0] transition-all btn-hover">
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-[#FFF3E0] flex items-center justify-center text-[#F59E0B] text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[#0D2137] text-sm font-semibold truncate">{idea.title}</span>
                        <span className="block text-[#90A4AE] text-xs mt-0.5 truncate">Posted by {idea.creatorName || 'Unknown'}</span>
                      </span>
                    </span>

                    <span className="flex items-center gap-3 shrink-0 pl-2 text-[#90A4AE] text-xs font-medium">
                      <span className="flex items-center gap-1">
                        <Icon name="eye" className="w-3.5 h-3.5" />
                        {(idea.readCount ?? 0).toLocaleString('en-IN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="heart" className="w-3.5 h-3.5" />
                        {(idea.likeCount ?? 0).toLocaleString('en-IN')}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[#90A4AE] text-xs mb-5">No trending ideas yet — be the first to post one!</p>
            )}

            <h2 className="text-[#0D2137] text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Icon name="lightbulb" className="w-4 h-4 text-[#F59E0B]" /> Browse by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CATEGORIES.slice(1).map(cat => {
                const catColor = CATEGORY_COLORS[cat] || defaultColor;
                return (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className="flex items-center gap-2 bg-white border border-[#BBDEFB] text-[#0D2137] text-xs py-2.5 rounded-2xl hover:border-[#1565C0] hover:text-[#1565C0] transition-all text-left px-2.5 btn-hover min-w-0">
                    <span
                      className="flex items-center justify-center rounded-lg shrink-0"
                      style={{ width: 26, height: 26, background: catColor.bg }}
                    >
                      <IdeaIcon category={cat} color={catColor.dot} size={14} />
                    </span>
                    <span className="leading-tight break-words">{cat}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white border border-[#BBDEFB] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-32 bg-[#E3F2FD]"/>
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-[#BBDEFB] rounded w-3/4"/>
                  <div className="h-2.5 bg-[#BBDEFB] rounded"/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <>
            <p className="text-[#546E7A] text-sm mb-4">
              {results.length > 0 ? `${results.length} results` : 'No results found'}
              {query && (
                <span className="text-[#90A4AE]"> for "<span className="text-[#0D2137] font-medium">{query}</span>"</span>
              )}
            </p>

            {results.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {results.map(idea => <IdeaCard key={idea.id} idea={idea}/>)}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="mb-4 flex justify-center text-[#BBDEFB]"><Icon name="search" className="w-12 h-12" /></div>
                <p className="text-[#0D2137] font-medium">No ideas found</p>
                <p className="text-[#90A4AE] text-xs mt-1">Try different keywords or category</p>
              </div>
            )}
          </>
        )}

      </div>

      <BottomNav/>
    </div>
  );
}
