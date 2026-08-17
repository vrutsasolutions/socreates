import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { CATEGORIES } from '../constants/categories';
import { IdeaIcon } from '../components/common/categoryIcons';
import { CATEGORY_COLORS, defaultColor } from '../components/common/categoryConstants';

export default function SelectInterests() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const customInputRef = useRef(null);

  useEffect(() => {
    if (showCustomInput && customInputRef.current) customInputRef.current.focus();
  }, [showCustomInput]);

  const isCustom = (cat) => !CATEGORIES.includes(cat);

  const toggle = (cat) => {
    // Special handling for "Other"
    if (cat === 'Other') {
      if (showCustomInput) {
        setShowCustomInput(false);
        setCustomCategory('');
        setSelected((prev) => prev.filter((c) => !isCustom(c)));
      } else {
        setShowCustomInput(true);
      }
      return;
    }
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const addCustomCategory = () => {
    const trimmed = customCategory.trim();
    if (!trimmed) return;
    const alreadyExists =
      CATEGORIES.some((c) => c.toLowerCase() === trimmed.toLowerCase()) ||
      selected.some((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (alreadyExists) { setCustomCategory(''); return; }
    setSelected((prev) => [...prev.filter((c) => !isCustom(c)), trimmed]);
    setCustomCategory('');
    setShowCustomInput(false);
  };

  const handleCustomKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); }
  };

  const handleContinue = async () => {
    if (selected.length < 3) return;
    setLoading(true);
    try {
      await api.post('/users/interests', { categories: selected });
    } catch {
      // non-critical — continue anyway
    } finally {
      setLoading(false);
      navigate('/follow-creators');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* Blue header — matches Home */}
      <div className="bg-[#1565C0] px-6 pt-14 pb-24 relative overflow-hidden shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="relative z-10">
          <div className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-3">
            Step 1 of 3
          </div>
          <div className="flex gap-2 mb-5">
            <div className="flex-1 h-1 bg-white rounded-full" />
            <div className="flex-1 h-1 bg-white/25 rounded-full" />
            <div className="flex-1 h-1 bg-white/25 rounded-full" />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight mb-2">
            What sparks your interest?
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed">
            Pick at least 3 categories. We'll personalise your feed based on your choices.
          </p>
        </div>
      </div>

      {/* Content wrapper — matches Home's rounded-t-[32px] white card */}
      <div className="bg-[#1565C0] flex-1 flex flex-col">
        <div className="bg-white rounded-t-[32px] pt-6 flex flex-col flex-1">
          <div className="px-4 flex flex-col flex-1">

            {/* Category Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6 max-h-[55vh] overflow-y-auto pr-1">
              {CATEGORIES.map((cat) => {
                const active = cat === 'Other'
                  ? showCustomInput || selected.some(isCustom)
                  : selected.includes(cat);
                const colors = CATEGORY_COLORS[cat] || defaultColor;
                return (
                  <button
                    key={cat}
                    onClick={() => toggle(cat)}
                    className={`relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl border transition-all duration-200 active:scale-95 cursor-pointer
                      ${active
                        ? 'bg-[#EAF2FF] border-[#1565C0] shadow-lg shadow-blue-300/40'
                        : 'bg-[#F0F6FF] border-[#BBDEFB] hover:border-[#1565C0] hover:bg-[#DBEAFE]'}`}
                  >
                    {active && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-[#1565C0] rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <IdeaIcon
                      category={cat}
                      color={active ? '#1565C0' : colors.dot}
                      size={28}
                    />
                    <span className={`text-[11px] font-semibold text-center leading-tight ${active ? 'text-[#1565C0]' : 'text-[#0D2137]'}`}>
                      {cat}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom category input — appears when "Other" is tapped */}
            {showCustomInput && (
              <div className="mb-4 bg-gradient-to-br from-[#EAF2FF] to-[#F4F7FF] border border-[#BBDEFB] rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1565C0]/10">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                  <span className="text-xs font-bold text-[#0D2137]">Add your own category</span>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    ref={customInputRef}
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    onKeyDown={handleCustomKeyDown}
                    placeholder="e.g. Blockchain, Astronomy…"
                    maxLength={50}
                    className="flex-1 border border-[#BBDEFB] rounded-xl px-4 py-2.5 text-sm bg-white text-[#0D2137] placeholder:text-[#90A4AE] focus:outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 transition shadow-sm"
                  />
                  <button
                    onClick={addCustomCategory}
                    disabled={!customCategory.trim()}
                    className="bg-[#1565C0] hover:bg-[#0D47A1] text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition active:scale-95 shrink-0 shadow-sm shadow-blue-200/50"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Custom category chips */}
            {selected.filter(isCustom).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selected.filter(isCustom).map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-2 bg-[#1565C0] text-white pl-3 pr-2 py-2 rounded-xl text-xs font-semibold shadow-sm shadow-blue-200/50"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/20">
                      <IdeaIcon category={cat} color="#fff" size={12} />
                    </span>
                    {cat}
                    <button
                      onClick={() => {
                        setSelected((prev) => prev.filter((c) => c !== cat));
                        setShowCustomInput(false);
                      }}
                      className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="mt-auto pb-10 sticky bottom-0 bg-white pt-3">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[#546E7A] text-sm">
                  {selected.length} selected
                  {selected.length < 3 && (
                    <span className="text-[#90A4AE]"> · need {3 - selected.length} more</span>
                  )}
                </span>
                <button onClick={() => { setSelected([]); setShowCustomInput(false); setCustomCategory(''); }}
                  className="text-[#90A4AE] text-xs hover:text-[#1565C0] transition-colors">
                  Clear all
                </button>
              </div>
              <button
                onClick={handleContinue}
                disabled={selected.length < 3 || loading}
                className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-300/40 text-sm btn-hover">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    Saving…
                  </span>
                ) : 'Continue →'}
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}