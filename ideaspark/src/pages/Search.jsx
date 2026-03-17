import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav';
import IdeaCard from '../components/common/IdeaCard';
import api from '../api/axiosInstance';

const CATEGORIES = ['All','Technology','Design','Business','Science','Art','Health','Education','Finance'];
const TRENDING   = ['AI Tools','Startup Ideas','Passive Income','Design System','No-Code Apps','Mental Health'];

export default function Search() {
  const navigate       = useNavigate();
  const inputRef       = useRef();
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
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (cat !== 'All') params.set('category', cat);
      const { data } = await api.get(`/search?${params}`);
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
    <div className="min-h-screen bg-[#0f0f1a] pb-24">
      <header className="sticky top-0 z-30 bg-[#0f0f1a]/90 backdrop-blur-xl border-b border-[#2a2a3e] px-4 py-4">
        {/* Search bar */}
        <div className="flex items-center gap-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-2xl px-4 py-3 focus-within:border-violet-500 transition">
          <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search ideas, categories, creators..."
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-600 outline-none" autoFocus/>
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-300 transition text-sm">✕</button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                ${category === cat ? 'bg-violet-600 text-white' : 'bg-[#1a1a2e] text-slate-400 border border-[#2a2a3e]'}`}>
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-5">
        {/* Trending (shown when no search) */}
        {!searched && (
          <>
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">🔥 Trending Searches</h2>
            <div className="flex flex-wrap gap-2 mb-6">
              {TRENDING.map(term => (
                <button key={term} onClick={() => handleTrending(term)}
                  className="bg-[#1a1a2e] border border-[#2a2a3e] text-slate-300 text-sm px-4 py-2 rounded-xl hover:border-violet-500/50 hover:text-violet-300 transition-all">
                  {term}
                </button>
              ))}
            </div>
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">💡 Browse by Category</h2>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.slice(1).map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className="bg-[#1a1a2e] border border-[#2a2a3e] text-slate-300 text-sm py-3 rounded-xl hover:border-violet-500/50 transition-all text-left px-4">
                  {cat}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {Array(4).fill(0).map((_,i) => (
              <div key={i} className="bg-[#1a1a2e] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-32 bg-[#2a2a3e]"/><div className="p-3 space-y-2"><div className="h-3 bg-[#2a2a3e] rounded w-3/4"/><div className="h-2.5 bg-[#2a2a3e] rounded"/></div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <>
            <p className="text-slate-500 text-sm mb-4">
              {results.length > 0 ? `${results.length} results` : 'No results found'}
              {query && <span className="text-slate-600"> for "<span className="text-white">{query}</span>"</span>}
            </p>
            {results.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {results.map(idea => <IdeaCard key={idea.id} idea={idea}/>)}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-slate-400 font-medium">No ideas found</p>
                <p className="text-slate-600 text-xs mt-1">Try different keywords or category</p>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav/>
    </div>
  );
}
