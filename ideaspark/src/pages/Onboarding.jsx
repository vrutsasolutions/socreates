import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import scLogo from '../assets/sc-logo.png';

/* ══════════════════════════════════════════════════════════════════════
   Onboarding — 4-step knowledge carousel
   Flow: Splash → Onboarding → Membership Intro → Welcome
   Swipe-enabled, Skip/Next footer, progress dots, SoCreate branding.
   ══════════════════════════════════════════════════════════════════════ */

/* ── Step icons (inline SVG to keep it self-contained) ──────────────── */
const StepIcon = ({ step }) => {
  const icons = {
    0: (
      /* diamond / spark */
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12l3 6-9 12L3 9z" />
        <path d="M3 9h18" />
        <path d="M9 3l-1.5 6L12 21l4.5-12L15 3" />
      </svg>
    ),
    1: (
      /* swap / read-build */
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
      </svg>
    ),
    2: (
      /* glasses / reader */
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="15" r="4" />
        <circle cx="18" cy="15" r="4" />
        <path d="M10 15h4" />
        <path d="M2 15V9" />
        <path d="M22 15V9" />
      </svg>
    ),
    3: (
      /* rocket / creator */
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    ),
  };
  return (
    <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/15
                    flex items-center justify-center text-white mb-8">
      {icons[step]}
    </div>
  );
};

/* ── Step data ──────────────────────────────────────────────────────── */
const STEPS = [
  {
    title: 'Great ideas need a stage',
    description:
      'SoCreate is where creators publish original ideas, get real feedback from readers, and earn from the content they create.',
    content: null,
  },
  {
    title: 'Read, or publish',
    description:
      'Every membership works two ways — explore and save ideas as a reader, or publish your own as a creator. Choose the path that fits you.',
    content: 'tabs',
  },
  {
    title: 'As a Reader',
    description: 'Discover ideas from creators around the world and build your own library of inspiration.',
    bullets: [
      'Unlock unlimited premium ideas',
      'Save and revisit ideas anytime',
      'Send messages directly to creators',
    ],
  },
  {
    title: 'As a Creator',
    description:
      'Publish your ideas, track how they perform, and earn from the content you create.',
    bullets: [
      'Publish ideas to a real audience',
      'Track performance with Creator Analytics',
      'Earn through Revenue Pool Sharing',
    ],
    cta: true,
  },
];

/* ── Reader / Creator tabs for Step 2 ──────────────────────────────── */
function RoleToggle() {
  const [role, setRole] = useState('reader');
  return (
    <div className="mt-6 w-full max-w-xs mx-auto">
      {/* Toggle */}
      <div className="relative flex bg-white/10 backdrop-blur-sm border border-white/15
                      rounded-2xl p-1">
        <span
          className="absolute top-1 bottom-1 w-1/2 rounded-xl bg-white shadow-md
                     transition-transform duration-300"
          style={{ transform: role === 'creator' ? 'translateX(100%)' : 'translateX(0)' }}
        />
        {['reader', 'creator'].map((r) => (
          <button key={r} onClick={() => setRole(r)}
                  className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm
                              font-bold capitalize transition-colors
                              ${role === r ? 'text-[#1565C0]' : 'text-white/70'}`}>
            {r === 'reader' ? 'Reader' : 'Creator'}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (user) navigate('/home', { replace: true });
  }, [user, navigate]);

  const total = STEPS.length;
  const isLast = step === total - 1;

  const next = () => {
    if (isLast) {
      navigate('/membership-intro');
    } else {
      setStep((s) => Math.min(s + 1, total - 1));
    }
  };

  const skip = () => navigate('/membership-intro');

  /* ── Touch swipe ─────────────────────────────────── */
  const onTouchStart = (e) => { touchStartX.current = e.changedTouches[0].screenX; };
  const onTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();                          // swipe left → next
      else setStep((s) => Math.max(s - 1, 0));       // swipe right → prev
    }
  };

  const current = STEPS[step];

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#1565C0] flex flex-col relative overflow-hidden select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Decorative circles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute w-72 h-72 rounded-full border-[40px] border-white/[0.03] -top-32 -right-20" />
        <div className="absolute w-56 h-56 rounded-full border-[32px] border-white/[0.03] -bottom-20 -left-16" />
        <div className="absolute w-40 h-40 rounded-full border-[24px] border-white/[0.04] top-1/3 -right-10" />
      </div>

      {/* ── SoCreate branding (centered, matches Welcome) ── */}
      <div className="relative z-10 flex flex-col items-center pt-12 pb-2">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-md
                        border border-white/20 rounded-3xl mb-4 shadow-xl">
          <img src={scLogo} alt="SoCreate" className="w-14 h-14 object-contain" />
        </div>
        <h1 className="text-white text-2xl font-black tracking-tight">SoCreate</h1>
      </div>

      {/* ── Step content ───────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-8">
        <div
          key={step}
          className="flex flex-col items-center text-center"
          style={{ animation: 'sc-slide-up 0.35s cubic-bezier(0,0,0.2,1) both' }}
        >
          <StepIcon step={step} />

          <h2 className="text-white text-2xl font-bold leading-tight mb-4 tracking-tight">
            {current.title}
          </h2>

          <p className="text-blue-100/80 text-sm leading-relaxed max-w-xs mb-4">
            {current.description}
          </p>

          {/* Reader/Creator toggle for step 2 */}
          {current.content === 'tabs' && <RoleToggle />}

          {/* Bullet points for steps 3 & 4 */}
          {current.bullets && (
            <div className="mt-4 text-left w-full max-w-xs space-y-3">
              {current.bullets.map((b, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center
                                  shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/85 text-sm leading-snug">{b}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA on last step */}
          {current.cta && (
            <button
              onClick={() => navigate('/membership-intro')}
              className="mt-8 w-full max-w-xs bg-white text-[#1565C0] font-bold py-4
                         rounded-2xl text-sm active:scale-95 transition-all
                         shadow-lg shadow-black/10"
            >
              Get Started
            </button>
          )}
        </div>
      </div>

      {/* ── Progress dots ──────────────────────────────── */}
      <div className="relative z-10 flex justify-center gap-2 pb-4 px-6">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300
                        ${i === step
                          ? 'w-8 bg-white'
                          : i < step
                            ? 'w-4 bg-white/50'
                            : 'w-4 bg-white/20'}`}
          />
        ))}
      </div>

      {/* ── Footer: Skip / Next ────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-8 pb-10">
        <button
          onClick={skip}
          className="text-white/50 text-sm font-medium hover:text-white/80 transition-colors
                     py-2 px-1 active:scale-95"
        >
          Skip
        </button>

        {!isLast && (
          <button
            onClick={next}
            className="text-white text-sm font-bold flex items-center gap-1.5
                       py-2 px-1 active:scale-95 transition-all hover:gap-2.5"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}