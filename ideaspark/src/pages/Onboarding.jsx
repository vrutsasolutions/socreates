import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ══════════════════════════════════════════════════════════════════════
   Onboarding — 4-step knowledge carousel
   Flow: Splash → Onboarding → Membership Intro → Welcome
   Swipe-enabled, Skip/Next footer, progress dots, image placeholders.
   ══════════════════════════════════════════════════════════════════════ */

/* ── Step data ──────────────────────────────────────────────────────── */
const STEPS = [
  {
    label: 'Discover',
    badgeColor: '#FB8C00',
    imageCaption: 'Discover Ideas',
    image: null, // TODO: drop in the "people sharing idea cards" illustration here
    title: 'Discover ideas worth exploring',
    description:
      'Explore original thoughts, stories, knowledge, and perspectives shared by people from different backgrounds.',
  },
  {
    label: 'Create',
    badgeColor: '#8E24AA',
    imageCaption: 'Create & Publish',
    image: null,
    title: 'Turn your ideas into something real',
    description:
      'Have an idea, story, experience, or knowledge to share? Create and publish it on SoCreate.',
  },
  {
    label: 'Connect',
    badgeColor: '#00BCD4',
    imageCaption: 'Connect & Engage',
    image: null,
    title: 'Ideas become better together',
    description:
      'React, like, comment, save, and connect with creators. Discover different perspectives.',
  },
  {
    label: 'Grow',
    badgeColor: '#43A047',
    imageCaption: 'Grow With Your Ideas',
    image: null,
    title: 'Your ideas can go further',
    description:
      'Build your audience, understand how your content performs, and earn from the ideas you create.',
    cta: true,
  },
];

const ONBOARDING_SEEN_KEY = 'sc_onboarding_seen';

/* ── Image placeholder box ─────────────────────────────────────────── */
function ImagePlaceholder({ step }) {
  return (
    <div className="absolute inset-0">
      {/* Badge — swap for a real illustration/photo per step later */}
      {step.badgeColor && (
        <div
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center
                     justify-center text-white shadow-lg z-10"
          style={{ background: step.badgeColor }}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3z" />
          </svg>
        </div>
      )}

      {step.image ? (
        /* Real illustration/photo for this step — covers the full white area */
        <img
          src={step.image}
          alt={step.label}
          className="w-full h-full object-cover"
        />
      ) : (
        /* Placeholder — no image supplied yet for this step */
        <div
          className="w-full h-full border-2 border-dashed border-[#CFE0F5]
                     bg-[#F4F8FF] flex flex-col items-center justify-center gap-2 px-6 text-center"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1565C0] flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <p className="text-[#37474F] text-sm font-bold">Image placeholder</p>
          <p className="text-[#90A4AE] text-xs italic">
            "{step.imageCaption}" illustration goes here
          </p>
        </div>
      )}
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
    // Logged-in users never need onboarding — straight to the app.
    if (user) {
      navigate('/home', { replace: true });
      return;
    }
    // Anyone who has already stepped through onboarding before (this
    // device/browser) is treated as an "existing" visitor and skips
    // straight to Welcome instead of seeing the slides again.
    if (localStorage.getItem(ONBOARDING_SEEN_KEY)) {
      navigate('/welcome', { replace: true });
    }
  }, [user, navigate]);

  const total = STEPS.length;
  const isLast = step === total - 1;

  // Mark onboarding as seen so it never shows again on this device once
  // the person has skipped or gone through it.
  const markSeen = () => {
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    } catch {
      /* storage unavailable (private mode etc.) — non-fatal */
    }
  };

  const next = () => {
    if (isLast) {
      markSeen();
      navigate('/membership-intro');
    } else {
      setStep((s) => Math.min(s + 1, total - 1));
    }
  };

  const skip = () => {
    markSeen();
    navigate('/membership-intro');
  };

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
        <div className="absolute w-72 h-72 rounded-full border-[40px] border-white/[0.04] -top-32 -right-20" />
        <div className="absolute w-56 h-56 rounded-full border-[32px] border-white/[0.04] -bottom-20 -left-16" />
      </div>

      {/* ── Step label + heading (top, on blue) ───────────── */}
      <p className="relative z-10 text-blue-200/80 text-[11px] font-bold tracking-widest
                    uppercase text-center pt-12 px-8">
        Step {step + 1} of {total} · {current.label}
      </p>

      <h2 className="relative z-10 text-white text-2xl font-bold leading-tight
                     text-center px-8 pt-3 pb-6">
        {current.title}
      </h2>

      {/* ── Image card, floating on the blue background ──── */}
      <div
        key={step}
        className="relative z-10 flex-1 flex items-center justify-center px-8 pb-6"
        style={{ animation: 'sc-slide-up 0.35s cubic-bezier(0,0,0.2,1) both' }}
      >
        <div className="relative w-full max-w-xs aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl shadow-black/20">
          <ImagePlaceholder step={current} />
        </div>
      </div>

      {/* ── Description + progress + nav (bottom, on blue) ── */}
      <div className="relative z-10 px-8 pb-8">
        <p className="text-blue-100/80 text-sm leading-relaxed max-w-xs mx-auto mb-6 text-center">
          {current.description}
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
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

        {/* Footer: Skip / Next / Get Started */}
        {current.cta ? (
          <button
            onClick={() => { markSeen(); navigate('/membership-intro'); }}
            className="w-full bg-white text-[#1565C0] font-bold py-4
                       rounded-2xl text-sm active:scale-95 transition-all
                       shadow-lg shadow-black/10"
          >
            Get Started →
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <button
              onClick={skip}
              className="text-white/60 text-sm font-medium hover:text-white/90 transition-colors
                         py-2 px-1 active:scale-95"
            >
              Skip
            </button>
            <button
              onClick={next}
              className="w-11 h-11 rounded-full bg-white text-[#1565C0] flex items-center
                         justify-center shadow-lg shadow-black/10 active:scale-95 transition-all"
              aria-label="Next"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}