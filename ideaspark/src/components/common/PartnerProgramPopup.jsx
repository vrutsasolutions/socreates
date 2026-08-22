import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../../context/AuthContext';

const DISMISSED_KEY = 'sc_partner_popup_dismissed';

// Only accounts created on or after this date are eligible for the
// Partners Program promo. Everyone who already had an account before we
// shipped this popup is an "existing user" and should never see it —
// only people who sign up from here on ("new users") do. Bump this date
// only if you deliberately want to re-open eligibility for a new cohort.
const ELIGIBILITY_CUTOFF = new Date('2026-08-22T00:00:00Z');

/**
 * Splash-style popup that promotes the Partners Program.
 * Appears centered over a dimmed backdrop, white card theme, sized down
 * so it doesn't cover the whole screen — the Home feed stays visible
 * (dimmed) around the edges. Dismissing (X or backdrop tap) hides it
 * permanently via localStorage.
 *
 * Only shown to new users (account created on/after ELIGIBILITY_CUTOFF) —
 * existing users signed up before that date never see it.
 */
export default function PartnerProgramPopup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!user?.createdAt) return; // not logged in yet, or user record hasn't loaded
    if (new Date(user.createdAt) < ELIGIBILITY_CUTOFF) return; // existing user — not eligible
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch { /* empty */ }
    setVisible(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
  }, [user?.createdAt]);

  const dismiss = () => {
    setFadeOut(true);
    setEntered(false);
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* empty */ }
    setTimeout(() => setVisible(false), 250);
  };

  const join = () => {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* empty */ }
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
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-[var(--sc-neutral-100)] text-[var(--sc-neutral-500)] active:bg-[var(--sc-neutral-200)] transition z-10"
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