import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/common/Icon';
import scLogo from '../assets/sc-logo.png';

/* ══════════════════════════════════════════════════════════════════════
   MembershipIntro — pre-auth membership preview (onboarding flow).
   Flow: Onboarding → MembershipIntro → Welcome (Register/Login).
   Reader ↔ Creator toggle, "In short" summary + full benefits list.
   ══════════════════════════════════════════════════════════════════════ */

const PLANS = {
  reader: {
    shortTitle: 'In short',
    short: [
      'Unlimited access to all premium ideas',
      'Unlimited messaging with creators',
      'Save unlimited ideas to your library',
    ],
    allTitle: 'All benefits',
    all: [
      'Unlimited Premium Ideas',
      'Unlimited Message Access',
      'Premium Reader Badge',
      'Save Unlimited Ideas',
      'Priority Access to New Features',
    ],
  },
  creator: {
    shortTitle: 'In short',
    short: [
      'Publish premium ideas and earn revenue',
      'Full Creator Analytics Dashboard',
      'Apply for creator verification',
    ],
    allTitle: 'All benefits',
    all: [
      'Everything in Premium',
      'Unlimited Message Access',
      'Publish Premium Ideas',
      'Creator Analytics Dashboard',
      'Apply for Verification',
      'Revenue Sharing Eligibility',
      'Creator Pro Badge',
    ],
  },
};

export default function MembershipIntro() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [role, setRole] = useState('reader');
  const [showPopup, setShowPopup] = useState(true);
  const [popupRole, setPopupRole] = useState('reader');

  useEffect(() => {
    if (user) navigate('/home', { replace: true });
  }, [user, navigate]);

  const plan = PLANS[role];

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col relative">

      {/* ── "In short" popup / bottom sheet (screen 6) ── */}
      {showPopup && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 z-50"
               onClick={() => setShowPopup(false)} />

          {/* Bottom sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl
                          px-6 pt-6 pb-8 shadow-2xl"
               style={{ animation: 'sc-slide-up 0.35s cubic-bezier(0,0,0.2,1) both' }}>

            {/* Close button */}
            <button onClick={() => setShowPopup(false)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center
                               rounded-full bg-[#F4F7FF] text-[#90A4AE] hover:bg-[#DBEAFE]
                               active:scale-90 transition-all">
              <Icon name="x" className="w-4 h-4" />
            </button>

            {/* Reader / Creator toggle */}
            <div className="relative flex bg-[#F4F7FF] border border-[#DBEAFE]
                            rounded-2xl p-1 mb-5 max-w-[200px]">
              <span
                className="absolute top-1 bottom-1 w-1/2 rounded-xl bg-[#1565C0]
                           shadow-md transition-transform duration-300"
                style={{ transform: popupRole === 'creator' ? 'translateX(100%)' : 'translateX(0)' }}
              />
              {['reader', 'creator'].map((r) => (
                <button key={r} onClick={() => setPopupRole(r)}
                        className={`relative z-10 flex-1 py-2 rounded-xl text-xs
                                    font-bold capitalize transition-colors
                                    ${popupRole === r ? 'text-white' : 'text-[#546E7A]'}`}>
                  {r === 'reader' ? 'Reader' : 'Creator'}
                </button>
              ))}
            </div>

            <h3 className="text-[#0D2137] font-bold text-lg mb-4">In short</h3>

            <div key={popupRole} className="space-y-3 mb-6"
                 style={{ animation: 'sc-fade-in 0.2s ease-out both' }}>
              {PLANS[popupRole].short.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-[#1565C0] font-bold text-sm mt-0.5">+</span>
                  <span className="text-[#546E7A] text-sm leading-snug">{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPopup(false)}
              className="w-full bg-[#1565C0] text-white font-bold py-3.5 rounded-2xl text-sm
                         active:scale-95 transition-all shadow-lg shadow-blue-300/30">
              Got it
            </button>
          </div>
        </>
      )}

      {/* ── Header with centered branding (matches Welcome) ── */}
      <header className="bg-[#1565C0] px-4 pt-10 pb-8 text-center
                         relative shadow-lg border-b border-white/10 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="relative z-10">
          <button onClick={() => navigate(-1)} aria-label="Go back"
                  className="absolute left-0 top-0 w-9 h-9 flex items-center justify-center rounded-full
                             bg-white/15 text-white hover:bg-white/25
                             active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-md
                          border border-white/20 rounded-3xl mb-3 shadow-xl">
            <img src={scLogo} alt="SoCreate" className="w-11 h-11 object-contain" />
          </div>
          <h1 className="text-white text-xl font-black tracking-tight">SoCreate</h1>
          <p className="text-blue-200 text-xs mt-1">Where ideas come alive</p>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────── */}
      <div className="bg-[#1565C0]">
        <div className="bg-[#F4F7FF] rounded-t-[32px] px-5 pt-8 pb-10 flex-1 flex flex-col">

          {/* Hero icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-[#DBEAFE]
                            flex items-center justify-center shadow-sm">
              <Icon name="gem" className="w-8 h-8 text-[#1565C0]" />
            </div>
          </div>

          <h2 className="text-[#0D2137] text-2xl font-bold text-center mb-1 tracking-tight">
            Unlock the full platform
          </h2>
          <p className="text-[#90A4AE] text-sm text-center mb-7">
            Choose the plan that fits you
          </p>

          {/* ── Reader / Creator toggle ────────────────── */}
          <div className="relative flex bg-white border border-[#DBEAFE]
                          rounded-2xl p-1 shadow-sm mb-8 max-w-xs mx-auto w-full">
            <span
              className="absolute top-1 bottom-1 w-1/2 rounded-xl bg-[#1565C0]
                         shadow-md transition-transform duration-300"
              style={{ transform: role === 'creator' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            {['reader', 'creator'].map((r) => (
              <button key={r} onClick={() => setRole(r)}
                      className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm
                                  font-bold capitalize transition-colors
                                  ${role === r ? 'text-white' : 'text-[#546E7A]'}`}>
                {r === 'reader' ? 'Reader' : 'Creator'}
              </button>
            ))}
          </div>

          {/* ── "In short" card ────────────────────────── */}
          <div
            key={role + '-short'}
            className="bg-white border border-[#DBEAFE] rounded-2xl p-5 mb-5 shadow-sm"
            style={{ animation: 'sc-fade-in 0.25s ease-out both' }}
          >
            <h3 className="text-[#0D2137] font-bold text-sm mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#F0F6FF] flex items-center justify-center">
                <Icon name="lightbulb" className="w-3.5 h-3.5 text-[#1565C0]" />
              </span>
              {plan.shortTitle}
            </h3>
            <div className="space-y-2.5">
              {plan.short.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-[#1565C0] font-bold text-xs mt-0.5">+</span>
                  <span className="text-[#546E7A] text-sm leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── "All benefits" card ────────────────────── */}
          <div
            key={role + '-all'}
            className="bg-white border border-[#DBEAFE] rounded-2xl p-5 mb-8 shadow-sm"
            style={{ animation: 'sc-fade-in 0.3s ease-out 0.05s both' }}
          >
            <h3 className="text-[#0D2137] font-bold text-sm mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#F0F6FF] flex items-center justify-center">
                <Icon name="star" className="w-3.5 h-3.5 text-[#1565C0]" />
              </span>
              {plan.allTitle}
            </h3>
            <div className="space-y-2.5">
              {plan.all.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Icon name="check" className="w-4 h-4 text-[#1565C0] shrink-0 mt-0.5" />
                  <span className="text-[#546E7A] text-sm leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Continue button ────────────────────────── */}
          <button
            onClick={() => navigate('/welcome')}
            className="w-full text-white font-bold py-4 rounded-2xl text-sm
                       active:scale-95 transition-all btn-hover"
            style={{
              background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
              boxShadow: '0 4px 20px rgba(21,101,192,0.35)',
            }}
          >
            Continue
          </button>

        </div>
      </div>
    </div>
  );
}