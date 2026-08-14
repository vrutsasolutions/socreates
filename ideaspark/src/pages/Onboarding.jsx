import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* Illustrations — custom branded 3D artwork per step. */
import discoverImg from '../assets/onboarding/discover.png';
import createImg from '../assets/onboarding/create.png';
import connectImg from '../assets/onboarding/connect.png';
import growImg from '../assets/onboarding/grow.png';

const STEPS = [
  {
    label: 'Discover',
    badgeColor: '#FB8C00',
    imageCaption: 'Discover Ideas',
    illustration: discoverImg,
    title: 'Discover ideas worth exploring',
    description:
      'Explore original thoughts, stories, knowledge, and perspectives shared by people from different backgrounds.',
  },
  {
    label: 'Create',
    badgeColor: '#8E24AA',
    imageCaption: 'Create & Publish',
    illustration: createImg,
    title: 'Turn your ideas into something real',
    description:
      'Have an idea, story, experience, or knowledge to share? Create and publish it on SoCreate.',
  },
  {
    label: 'Connect',
    badgeColor: '#00BCD4',
    imageCaption: 'Connect & Engage',
    illustration: connectImg,
    title: 'Ideas become better together',
    description:
      'React, like, comment, save, and connect with creators. Discover different perspectives.',
  },
  {
    label: 'Grow',
    badgeColor: '#43A047',
    imageCaption: 'Grow With Your Ideas',
    illustration: growImg,
    title: 'Your ideas can go further',
    description:
      'Build your audience, understand how your content performs, and earn from the ideas you create.',
    cta: true,
  },
];

const ONBOARDING_SEEN_KEY = 'sc_onboarding_seen';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true });
      return;
    }
    if (localStorage.getItem(ONBOARDING_SEEN_KEY)) {
      navigate('/welcome', { replace: true });
    }
  }, [user, navigate]);

  const total = STEPS.length;
  const isLast = step === total - 1;

  const markSeen = () => {
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    } catch {}
  };

  const next = () => {
    if (isLast) {
      markSeen();
      navigate('/welcome');
    } else {
      setStep((s) => Math.min(s + 1, total - 1));
    }
  };

  const skip = () => {
    markSeen();
    navigate('/welcome');
  };

  const onTouchStart = (e) => { touchStartX.current = e.changedTouches[0].screenX; };
  const onTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else setStep((s) => Math.max(s - 1, 0));
    }
  };

  const current = STEPS[step];

  return (
    /* Outer shell — always fills the viewport with the navy brand colour.
       On mobile the inner card stretches to full screen so there's zero
       visual difference from before. On wider / landscape screens it
       centres a phone-sized frame so the portrait illustrations display
       correctly without cropping — title, description, dots, and buttons
       all stay overlaid on the artwork. */
    <div
      className="min-h-screen bg-[#0B1E3C] flex items-center justify-center"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden bg-[#0B1E3C]
                   w-full h-screen
                   sm:max-w-[480px] sm:h-[min(100vh,900px)] sm:rounded-3xl
                   sm:shadow-2xl sm:shadow-black/40"
      >
        {/* ── Illustration layers (cross-fade on step change) ──────── */}
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            className={`absolute inset-0 transition-opacity duration-500 ease-out
                        ${i === step ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="absolute inset-0">
              <img
                src={s.illustration}
                alt={s.imageCaption}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ))}

        {/* ── Top scrim + title ─────────────────────────────────────── */}
        <div
          className="absolute inset-x-0 top-0 pt-8 pb-16 px-8 pointer-events-none z-10"
          style={{
            background:
              'linear-gradient(to bottom, rgba(11,30,60,0.85) 0%, rgba(11,30,60,0.5) 55%, rgba(11,30,60,0) 100%)',
          }}
        >
          <h2 className="text-white text-2xl font-black leading-tight text-center
                         drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            {current.title}
          </h2>
        </div>

        {/* ── Bottom scrim + description / dots / CTA ──────────────── */}
        <div
          className="absolute inset-x-0 bottom-0 pt-24 pb-8 px-8 z-10"
          style={{
            background:
              'linear-gradient(to top, rgba(11,30,60,0.92) 0%, rgba(11,30,60,0.6) 55%, rgba(11,30,60,0) 100%)',
          }}
        >
          <p className="text-blue-100/90 text-sm leading-relaxed max-w-xs mx-auto mb-6 text-center
                        drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
            {current.description}
          </p>

          <div className="flex justify-center gap-2 mb-6">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300
                            ${i === step
                              ? 'w-8 bg-white'
                              : i < step
                                ? 'w-4 bg-white/50'
                                : 'w-4 bg-white/25'}`}
              />
            ))}
          </div>

          {current.cta ? (
            <button
              onClick={() => { markSeen(); navigate('/welcome'); }}
              className="w-full bg-white text-[#1565C0] font-bold py-4
                         rounded-2xl text-sm active:scale-95 transition-all
                         shadow-lg shadow-black/20"
            >
              Get Started →
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={skip}
                className="text-white/70 text-sm font-medium hover:text-white transition-colors
                           py-2 px-1 active:scale-95"
              >
                Skip
              </button>
              <button
                onClick={next}
                className="w-11 h-11 rounded-full bg-white text-[#1565C0] flex items-center
                           justify-center shadow-lg shadow-black/20 active:scale-95 transition-all"
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
    </div>
  );
}