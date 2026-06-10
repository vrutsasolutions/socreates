import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/*
 * CreatePremiumIdea — gate page reached from the Add Idea Premium toggle.
 *   • Not verified  → "Creator Pro Active" + Apply For Verification.
 *   • Verified      → "Verified Creator" + premium price + Publish (returns to Add Idea).
 * Frontend-only: relies on user.verified / user.verificationStatus.
 */

function Header({ title, onBack }) {
  return (
    <header className="bg-[#1565C0] px-4 pt-5 pb-8 relative overflow-hidden rounded-b-[28px]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
        <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-12 -left-8" />
      </div>
      <div className="flex items-center gap-3 relative z-10">
        {onBack && (
          <button onClick={onBack} className="text-white hover:opacity-80 active:scale-90 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="text-white font-bold text-2xl">{title}</h1>
      </div>
    </header>
  );
}

export default function CreatePremiumIdea() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const verified = !!user?.verified;
  const pending = user?.verificationStatus === 'pending';
  const [price, setPrice] = useState('99');

  return (
    <div className="min-h-screen bg-[#F4F7FF]">
      <Header title="Create Premium Idea" onBack={() => navigate(-1)} />

      <div className="px-4 pt-6">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          {verified ? (
            <>
              <h2 className="text-[#22C55E] font-bold text-lg mb-1">Verified Creator</h2>
              <p className="text-[#90A4AE] text-sm mb-5">Premium publishing enabled.</p>

              <div className="flex items-center justify-between mb-5">
                <span className="text-[#0D2137] font-bold text-sm">Premium Toggle</span>
                <span className="bg-[#22C55E] text-white text-xs font-bold px-4 py-1.5 rounded-full">ON</span>
              </div>

              <label className="text-xs font-bold text-[#0D2137]">Premium Price</label>
              <div className="mt-1 flex items-center bg-[#F0F6FF] border border-[#E3E8F4] rounded-2xl px-4">
                <span className="text-[#0D2137] font-bold">₹</span>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                  inputMode="numeric"
                  className="flex-1 bg-transparent py-3 px-1 text-[#0D2137] font-bold focus:outline-none"
                />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-[#22C55E] font-bold text-lg mb-1">Creator Pro Active</h2>
              <p className="text-[#90A4AE] text-sm mb-5">
                {pending
                  ? 'Your verification is under review. You can publish premium once approved.'
                  : 'Verification required to publish premium content.'}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-[#0D2137] font-bold text-sm">Premium Toggle</span>
                <span className="bg-[#CBD5E1] text-[#475569] text-xs font-bold px-4 py-1.5 rounded-full">OFF</span>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 pb-8">
          {verified ? (
            <button
              onClick={() => navigate(`/add-idea?premium=1&price=${price || '99'}`)}
              className="w-full bg-[#1565C0] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]"
            >
              Publish Premium Idea
            </button>
          ) : (
            <button
              onClick={() => navigate('/verify-profile?from=premium')}
              className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md text-[15px]"
            >
              {pending ? 'View Application Status' : 'Apply For Verification'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
