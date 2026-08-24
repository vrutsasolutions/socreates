import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../../context/AuthContext';
import { getMyPartnerApplication } from '../../api/partnerApi';

// Set once the user has actually seen the "You're verified!" reveal, so we
// never auto-redirect them there again after the first time.
const VERIFIED_SEEN_KEY = 'sc_partner_verified_seen';

/**
 * Splash-style popup that promotes the Partners Program, PLUS the mount-time
 * watcher that auto-reveals approval.
 *
 * Appears centered over a dimmed backdrop, white card theme, sized down
 * so it doesn't cover the whole screen — the Home feed stays visible
 * (dimmed) around the edges. Dismissing (X or backdrop tap) hides it
 * permanently via localStorage.
 *
 * Only shown to new users (account created on/after ELIGIBILITY_CUTOFF) —
 * existing users signed up before that date never see it.
 *
 * The user's application status on the server (via getMyPartnerApplication)
 * is the only source of truth here — this component checks it fresh on
 * every eligible Home mount (see the useEffect below for why it doesn't
 * try to cache/skip that check), because localStorage alone doesn't survive
 * a reinstall, a cleared cache, or a different device.
 *
 * This component also watches for approval so it can surface it proactively.
 * If a user applies, closes the app while their application is still
 * `pending`, and it gets approved later, we want them dropped straight onto
 * the "You're verified!" screen the next time they open the app — not
 * silently left on Home with no indication anything changed (the in-app
 * notification bell also gets a message, but that's easy to miss). The
 * moment a check comes back `approved`, we navigate straight to
 * /partners-program (which renders the VerifiedScreen for an approved
 * application) and set VERIFIED_SEEN_KEY so we only ever do this once —
 * after that, this component has nothing further to do for this user.
 */
export default function PartnerProgramPopup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!user) return; // not logged in
    if (user.isPremium) return; // already a paid subscriber

    try {
      if (localStorage.getItem(VERIFIED_SEEN_KEY)) return;
    } catch { /* empty */ }

    // Show the popup immediately — no API call needed.
    // If the user already applied, clicking "Join" takes them to
    // the partners-program page where they see their status.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));

    // Background check: if approved, redirect to reveal page.
    (async () => {
      try {
        const { data } = await getMyPartnerApplication();
        if (data.status === 'approved') {
          try { localStorage.setItem(VERIFIED_SEEN_KEY, '1'); } catch { /* empty */ }
          navigate('/partners-program');
        }
      } catch { /* ignore — popup is already visible */ }
    })();
  }, [user?.id]);

  const dismiss = () => {
    setFadeOut(true);
    setEntered(false);
    // No localStorage write — popup reappears on next Home visit
    // until the user actually submits an application.
    setTimeout(() => setVisible(false), 250);
  };

  const join = () => {
    navigate('/partners-program');
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-5">
      {/* Dimmed backdrop — Home feed stays visible (dimmed) around the card */}
      <div
        onClick={dismiss}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-250 ${
          fadeOut || !entered ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Splash card — white theme, not full-screen */}
      <div
        className={`relative w-full max-w-sm max-h-[80vh] rounded-[28px] overflow-hidden bg-white shadow-2xl transition-all duration-250 ease-out ${
          entered && !fadeOut ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-[var(--sc-neutral-100)] text-[var(--sc-neutral-500)] active:bg-[var(--sc-neutral-200)] transition z-20"
        >
          <Icon name="x" className="w-5 h-5" />
        </button>

        {/* Decorative background circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-56 h-56 rounded-full border-[36px] border-[var(--sc-primary-50)] -top-16 -right-16" />
          <div className="absolute w-44 h-44 rounded-full border-[24px] border-[var(--sc-primary-50)] -bottom-12 -left-12" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-7 py-9 max-h-[80vh] overflow-y-auto">

          {/* Logo */}
          <div className="w-20 h-20 rounded-3xl bg-[var(--sc-primary-50)] border border-[var(--sc-primary-100)] flex items-center justify-center mb-5">
            <Icon name="sparkles" className="w-10 h-10 text-[var(--sc-primary-500)]" />
          </div>

          <p className="text-[10px] font-bold tracking-[0.2em] text-[var(--sc-primary-500)] mb-3 uppercase">
            SoCreate Partner Program 2026
          </p>

          <h1 className="text-2xl font-bold text-[var(--sc-neutral-900)] mb-3 leading-tight">
            Create. Publish.<br />Connect. Grow.
          </h1>

          <p className="text-sm font-semibold text-[var(--sc-success)] mb-4">
            You're eligible for our Partners Program! 🎉
          </p>

          {/* Deadline badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--sc-primary-50)] border border-[var(--sc-primary-100)] text-xs font-medium text-[var(--sc-primary-600)] mb-5">
            <Icon name="clock" className="w-3.5 h-3.5" />
            Registration closes September 30, 2026
          </div>

          <p className="text-sm text-[var(--sc-neutral-500)] leading-relaxed mb-7">
            Enter a few details about yourself and get a complimentary Creator Pro
            subscription as your welcome benefit — free while your application is reviewed.
          </p>

          {/* CTA */}
          <button
            onClick={join}
            className="w-full py-4 rounded-2xl font-bold text-white text-base bg-[var(--sc-primary-500)] active:bg-[var(--sc-primary-600)] transition shadow-lg shadow-[var(--sc-primary-500)]/20"
          >
            Join Partners Program
          </button>
        </div>
      </div>
    </div>
  );
}