import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';

const INTERESTS = [
  { id: 'tech',      label: 'Technology', emoji: '💻' },
  { id: 'design',    label: 'Design',     emoji: '🎨' },
  { id: 'business',  label: 'Business',   emoji: '💼' },
  { id: 'science',   label: 'Science',    emoji: '🔬' },
  { id: 'art',       label: 'Art',        emoji: '🖼️' },
  { id: 'health',    label: 'Health',     emoji: '🌿' },
  { id: 'education', label: 'Education',  emoji: '📚' },
  { id: 'finance',   label: 'Finance',    emoji: '💰' },
  { id: 'music',     label: 'Music',      emoji: '🎵' },
  { id: 'travel',    label: 'Travel',     emoji: '✈️' },
  { id: 'food',      label: 'Food',       emoji: '🍳' },
  { id: 'sports',    label: 'Sports',     emoji: '⚽' },
];

export default function SelectInterests() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [loading, setLoading]   = useState(false);

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const handleContinue = async () => {
    if (selected.length < 3) return;
    setLoading(true);
    try {
      await api.post('/users/interests', { categories: selected });
    } catch (_) {
      // non-critical — continue anyway
    } finally {
      setLoading(false);
      navigate('/follow-creators');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-5 py-10 flex flex-col">

      {/* Background glow */}
      <div className="fixed top-[-80px] left-1/2 -translate-x-1/2 w-96 h-96
                      bg-violet-700/20 rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="relative z-10 max-w-md mx-auto w-full flex flex-col flex-1">

        {/* Step indicator */}
        <div className="mb-8">
          <div className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-3">
            Step 1 of 2
          </div>
          <div className="flex gap-2 mb-6">
            <div className="flex-1 h-1 bg-violet-500 rounded-full" />
            <div className="flex-1 h-1 bg-[#2a2a3e] rounded-full" />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight mb-2">
            What sparks your interest?
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Pick at least 3 categories. We'll personalise your feed based on your choices.
          </p>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {INTERESTS.map(({ id, label, emoji }) => {
            const active = selected.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={`
                  relative flex flex-col items-center justify-center
                  gap-2 py-4 px-2 rounded-2xl border
                  transition-all duration-200 active:scale-95 cursor-pointer
                  ${active
                    ? 'bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-500/20'
                    : 'bg-[#1a1a2e] border-[#2a2a3e] hover:border-[#3a3a5e]'}
                `}
              >
                {/* Checkmark badge */}
                {active && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-violet-500
                                  rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <span className="text-2xl">{emoji}</span>
                <span className={`text-xs font-medium text-center leading-tight
                  ${active ? 'text-violet-300' : 'text-slate-400'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-sm">
              {selected.length} selected
              {selected.length < 3 && (
                <span className="text-slate-600"> · need {3 - selected.length} more</span>
              )}
            </span>
            <button
              onClick={() => setSelected([])}
              className="text-slate-600 text-xs hover:text-slate-400 transition"
            >
              Clear all
            </button>
          </div>

          <button
            onClick={handleContinue}
            disabled={selected.length < 3 || loading}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-500
                       hover:from-violet-500 hover:to-purple-400
                       text-white font-semibold py-4 rounded-2xl
                       transition-all duration-200 active:scale-95
                       disabled:opacity-40 disabled:cursor-not-allowed
                       shadow-lg shadow-violet-500/25"
          >
            {loading ? 'Saving…' : 'Continue →'}
          </button>
        </div>

      </div>
    </div>
  );
}
