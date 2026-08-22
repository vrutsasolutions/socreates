import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

const DISMISSED_KEY = 'sc_partner_popup_dismissed';

/**
 * Full-screen splash that promotes the Partners Program.
 * Appears instantly on Home feed — covers everything like a blink screen.
 * Dismissing navigates away or hides it permanently via localStorage.
 */
export default function PartnerProgramPopup() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch { /* empty */ }
    // Show instantly — no delay
    setVisible(true);
  }, []);

  const dismiss = () => {
    setFadeOut(true);
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* empty */ }
    setTimeout(() => setVisible(false), 250);
  };

  const join = () => {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* empty */ }
    navigate('/partners-program');
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-250 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(180deg, #0B1E3C 0%, #1565C0 100%)' }}
    >
      {/* Close button */}
      <button
        onClick={dismiss}
        className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white/70 active:bg-white/25 transition z-10"
      >
        <Icon name="x" className="w-5 h-5" />
      </button>

      {/* Decorative background circles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute w-72 h-72 rounded-full border-[40px] border-white/5 -top-20 -right-20" />
        <div className="absolute w-56 h-56 rounded-full border-[30px] border-white/5 -bottom-16 -left-16" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-sm">

        {/* Logo */}
        <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-6">
          <Icon name="sparkles" className="w-12 h-12 text-white" />
        </div>

        <p className="text-[10px] font-bold tracking-[0.2em] text-blue-200 mb-3 uppercase">
          SoCreate Partner Program 2026
        </p>

        <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
          Create. Publish.<br />Connect. Grow.
        </h1>

        <p className="text-sm font-semibold text-emerald-300 mb-5">
          You're eligible for our Partners Program! 🎉
        </p>

        {/* Deadline badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-blue-100 mb-6">
          <Icon name="clock" className="w-3.5 h-3.5" />
          Registration closes September 30, 2026
        </div>

        <p className="text-sm text-blue-100/80 leading-relaxed mb-8">
          Enter a few details about yourself and get a complimentary Creator Pro
          subscription as your welcome benefit — free while your application is reviewed.
        </p>

        {/* CTA */}
        <button
          onClick={join}
          className="w-full py-4 rounded-2xl font-bold text-[#1565C0] text-base bg-white active:bg-blue-50 transition shadow-lg shadow-black/20"
        >
          Join Partners Program
        </button>

        <button
          onClick={dismiss}
          className="mt-4 text-sm text-white/50 hover:text-white/80 transition"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}