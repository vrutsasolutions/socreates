import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import Icon from '../components/common/Icon';

const INTERESTS = [
  { id: 'tech',      label: 'Technology', icon: 'cpu' },
  { id: 'design',    label: 'Design',     icon: 'palette' },
  { id: 'business',  label: 'Business',   icon: 'briefcase' },
  { id: 'science',   label: 'Science',    icon: 'flask' },
  { id: 'art',       label: 'Art',        icon: 'image' },
  { id: 'health',    label: 'Health',     icon: 'heart-pulse' },
  { id: 'education', label: 'Education',  icon: 'graduation-cap' },
  { id: 'finance',   label: 'Finance',    icon: 'dollar-sign' },
  { id: 'music',     label: 'Music',      icon: 'music' },
  { id: 'travel',    label: 'Travel',     icon: 'plane' },
  { id: 'food',      label: 'Food',       icon: 'utensils' },
  { id: 'sports',    label: 'Sports',     icon: 'dumbbell' },
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
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6 flex flex-col flex-1">
          <div className="px-4 flex flex-col flex-1">

            {/* Category Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {INTERESTS.map(({ id, label, icon }) => {
                const active = selected.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggle(id)}
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
                    <Icon name={icon} className={`w-7 h-7 ${active ? 'text-[#1565C0]' : 'text-[#546E7A]'}`} />
                    <span className={`text-xs font-semibold text-center leading-tight ${active ? 'text-[#1565C0]' : 'text-[#0D2137]'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-auto pb-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[#546E7A] text-sm">
                  {selected.length} selected
                  {selected.length < 3 && (
                    <span className="text-[#90A4AE]"> · need {3 - selected.length} more</span>
                  )}
                </span>
                <button onClick={() => setSelected([])}
                  className="text-[#90A4AE] text-xs hover:text-[#1565C0] transition-colors">
                  Clear all
                </button>
              </div>
              <button
                onClick={handleContinue}
                disabled={selected.length < 3 || loading}
                className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-300/40 text-sm btn-hover">
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