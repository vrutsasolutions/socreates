import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isVerified } from '../api/paymentApi';

export default function CreatePremiumIdea() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Verified = an active paid membership (verification is no longer a separate flow).
  const verified = isVerified(user);
  const [price, setPrice] = useState('99');

  return (
    <div className="min-h-screen">

      {/* HEADER — Matches structural blueprint across global application headers */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">

        {/* Decorative background circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        {/* Top Navigation Row */}
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg flex-1 text-center pr-9">Create Premium Idea</h1>
        </div>

        {/* Floating Identity & Status Card */}
        <div className="relative z-10 mt-5 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4 flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${verified ? 'bg-[#22C55E]/20' : 'bg-white/10'}`}>
            {verified ? (
              <svg className="w-5 h-5 text-[#4ADE80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-[15px]">
              {verified ? 'Verified Creator' : 'Creator Pro Active'}
            </p>
            <p className="text-blue-200 text-xs mt-0.5">
              {verified
                ? 'You can publish premium ideas'
                : 'Get verified with a membership to publish'}
            </p>
          </div>
          {verified && (
            <div className="shrink-0 bg-[#ECFDF5] border border-[#A7F3D0] rounded-full px-2.5 py-1 text-[11px] font-bold text-[#065F46]">
              Active
            </div>
          )}
        </div>
      </header>

      {/* CONTENT CANVAS */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] px-4 pt-6 pb-12 min-h-[calc(100vh-180px)] shadow-inner">

          {verified ? (
            /* ── Verified: Price Config Row ── */
            <div className="space-y-6">
              <div className="bg-white border border-[#E3F2FD] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[#0D2137] font-bold text-[15px]">Premium Toggle</p>
                  <p className="text-[#90A4AE] text-xs mt-0.5">Readers pay to unlock this idea</p>
                </div>
                <span className="bg-[#22C55E] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm shadow-green-200">ON</span>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0D2137] uppercase tracking-wider block px-1">Premium Price</label>
                <p className="text-[#90A4AE] text-xs mt-0.5 mb-2.5 px-1">Set the price readers pay to unlock your idea</p>
                <div className="flex items-center bg-[#F0F6FF] border border-[#E3E8F4] rounded-2xl px-4 focus-within:border-[#1565C0] transition-colors">
                  <span className="text-[#0D2137] font-bold text-lg mr-1">₹</span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                    inputMode="numeric"
                    placeholder="99"
                    className="flex-1 bg-transparent py-3.5 text-[#0D2137] font-bold text-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Suggested Price Presets */}
              <div>
                <p className="text-xs font-bold text-[#0D2137] uppercase tracking-wider mb-2.5 px-1">Suggested prices</p>
                <div className="flex gap-2 flex-wrap">
                  {['49', '99', '149', '199'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPrice(p)}
                      className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-95
                        ${price === p
                          ? 'bg-[#1565C0] text-white shadow-md shadow-blue-200'
                          : 'bg-[#F0F6FF] text-[#1565C0] border border-[#E3F2FD] hover:border-[#1565C0]'}`}
                    >
                      ₹{p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warning/Info Row */}
              <div className="flex items-start gap-3 bg-[#FFF8EC] border border-[#FDE68A] rounded-2xl px-4 py-3">
                <svg className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[#92400E] text-xs leading-relaxed">
                  Revenue sharing coming soon. Your earnings will appear in the Creator Dashboard.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate(`/add-idea?premium=1&price=${price || '99'}`)}
                  className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-lg shadow-blue-300/40 text-[15px]"
                >
                  Publish Premium Idea
                </button>
              </div>
            </div>

          ) : (
            /* ── Not Verified: Gated Lockout Row ── */
            <div className="space-y-5">
              <div className="bg-white border border-[#E3F2FD] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[#0D2137] font-bold text-[15px]">Premium Toggle</p>
                  <p className="text-[#90A4AE] text-xs mt-0.5">Membership required to enable</p>
                </div>
                <span className="bg-[#CBD5E1] text-[#475569] text-xs font-bold px-4 py-1.5 rounded-full">OFF</span>
              </div>

              {/* Perks list box */}
              <div className="bg-white border border-[#E3F2FD] rounded-2xl p-4 space-y-3.5 shadow-sm">
                <p className="text-[#0D2137] font-bold text-sm uppercase tracking-wider px-1">Unlock with Membership</p>
                {[
                  'Set a price readers pay to unlock',
                  'Earn from your premium content',
                  'Featured placement for premium ideas',
                  'Creator analytics & revenue dashboard',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-[#E3F2FD] flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-[#1565C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[#374151] text-sm font-medium">{f}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/membership')}
                  className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-lg shadow-amber-300/40 text-[15px]"
                >
                  Get Verified — View Plans
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}