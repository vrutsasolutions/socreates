/**
 * TooltipGuide.jsx  — SoCreate Feature Walkthrough System
 * - SVG icons instead of emojis (consistent across all devices)
 * - Skip button
 * - waitForFlag support for partner program popup
 * - Mobile-optimised card size and spotlight
 */

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

/* ═══════════════════════════════════════════════════════════
   SVG Icon library — all icons used across tour steps
   Pass iconName="menu" in your step config to use these.
   Falls back to the `icon` emoji prop if iconName not found.
   ═══════════════════════════════════════════════════════════ */
const ICONS = {
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/>
      <path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  tabs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z"/>
    </svg>
  ),
  idea: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.22-1.2 4.16-3 5.2V17H9v-2.8A6.002 6.002 0 0 1 6 9a6 6 0 0 1 6-6z"/>
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  create: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 8v8M8 12h8"/>
    </svg>
  ),
  explore: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>
    </svg>
  ),
  premium: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  ai: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z"/>
      <path d="M5 4l.9 2.1L8 7l-2.1.9L5 10l-.9-2.1L2 7l2.1-.9L5 4z"/>
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  dollar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/>
      <circle cx="6" cy="12" r="3"/>
      <circle cx="18" cy="19" r="3"/>
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
    </svg>
  ),
  sparkle: (
    <svg viewBox="0 0 24 24" fill="#fff" stroke="none">
      <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z"/>
    </svg>
  ),
};

function TourIcon({ iconName, emoji }) {
  const svg = iconName ? ICONS[iconName] : null;
  if (svg) {
    return (
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'rgba(255,255,255,0.2)',
        border: '1px solid rgba(255,255,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 8,
      }}>
        {svg}
      </div>
    );
  }
  // Fallback to emoji
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: 'rgba(255,255,255,0.18)',
      border: '1px solid rgba(255,255,255,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18,
    }}>
      {emoji ?? '✦'}
    </div>
  );
}

/* ── Navigation arrows ───────────────────────────────────── */
function ArrowIcon({ dir = 'right' }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      {dir === 'right' ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/* ── CSS ─────────────────────────────────────────────────── */
const PULSE_CSS = `
  @keyframes sc-pulse {
    0%   { transform: scale(1);   opacity: 0.55; }
    100% { transform: scale(1.6); opacity: 0;    }
  }
  @keyframes sc-card-in {
    from { opacity: 0; transform: translateY(8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }
  .sc-tour-card { animation: sc-card-in 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .sc-pulse-ring { animation: sc-pulse 1.6s ease-out infinite; }
  .sc-skip-btn:hover { opacity: 1 !important; text-decoration: underline; }
  .sc-next-btn:active { transform: scale(0.97); }
  .sc-back-btn:active { transform: scale(0.97); }
`;

/* ── Helpers ─────────────────────────────────────────────── */
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function computeCardPos(spotRect, cardW, cardH) {
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const pad = 10;
  const gap = 12;
  const cx  = clamp(spotRect.x + spotRect.width / 2 - cardW / 2, pad, vw - cardW - pad);
  const below = spotRect.y + spotRect.height + gap;
  const above = spotRect.y - gap - cardH;
  if (below + cardH < vh - pad) return { top: below, left: cx };
  if (above > pad)              return { top: above, left: cx };
  return { top: clamp(vh / 2 - cardH / 2, pad, vh - cardH - pad), left: cx };
}

/* ═══════════════════════════════════════════════════════════
   Main component
   Props:
     steps[]      — step config objects
     guideKey     — localStorage dismiss key
     waitForFlag  — localStorage key set by popup on dismiss;
                    guide waits until this flag exists
   ═══════════════════════════════════════════════════════════ */
export default function TooltipGuide({ steps = [], guideKey, waitForFlag }) {
  const [active,   setActive]   = useState(false);
  const [stepIdx,  setStepIdx]  = useState(0);
  const [spotRect, setSpotRect] = useState(null);
  const [cardPos,  setCardPos]  = useState({ top: 0, left: 0 });
  const cardRef = useRef(null);

  const step   = steps[stepIdx] ?? null;
  const isLast = stepIdx === steps.length - 1;

  /* ── Show on first visit ──────────────────────────────── */
  useEffect(() => {
    if (guideKey && localStorage.getItem(guideKey)) return;

    const tryStart = () => setActive(true);

    if (!waitForFlag) { tryStart(); return; }

    // Flag already set from a previous session — start immediately
    if (localStorage.getItem(waitForFlag)) { tryStart(); return; }

    // Poll every 400ms until the popup sets the flag on dismiss/join
    const interval = setInterval(() => {
      if (localStorage.getItem(waitForFlag)) {
        clearInterval(interval);
        // 400ms for popup fade-out animation to finish
        setTimeout(tryStart, 400);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [guideKey, waitForFlag]);

  /* ── Inject CSS once ──────────────────────────────────── */
  useEffect(() => {
    if (document.getElementById('sc-tour-css')) return;
    const s = document.createElement('style');
    s.id = 'sc-tour-css';
    s.textContent = PULSE_CSS;
    document.head.appendChild(s);
  }, []);

  /* ── Measure target element ───────────────────────────── */
  const measureTarget = useCallback(() => {
    if (!step) return;

    if (step.positionStrategy === 'center') {
      setSpotRect(null);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cw = Math.min(310, vw - 32);
      setCardPos({ top: vh / 2 - 160, left: (vw - cw) / 2 });
      return;
    }

    const el = step.selector
      ? document.querySelector(step.selector)
      : document.querySelector(`[data-tour="${step.target}"]`);

    if (!el) {
      setSpotRect(null);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cw = Math.min(310, vw - 32);
      setCardPos({ top: vh / 2 - 160, left: (vw - cw) / 2 });
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    setTimeout(() => {
      const r   = el.getBoundingClientRect();
      const pad = step.spotlightPad ?? 8;
      setSpotRect({
        x: r.left - pad, y: r.top - pad,
        width: r.width + pad * 2, height: r.height + pad * 2,
      });
    }, 160);
  }, [step]);

  useLayoutEffect(() => {
    if (!active) return;
    measureTarget();
  }, [active, stepIdx, measureTarget]);

  useLayoutEffect(() => {
    if (!active || !spotRect || !cardRef.current) return;
    const vw    = window.innerWidth;
    const cardW = Math.min(310, vw - 24);
    const cardH = cardRef.current.offsetHeight || 220;
    setCardPos(computeCardPos(spotRect, cardW, cardH));
  }, [active, spotRect]);

  useEffect(() => {
    if (!active) return;
    const h = () => measureTarget();
    window.addEventListener('resize', h, { passive: true });
    window.addEventListener('scroll', h, { passive: true });
    return () => { window.removeEventListener('resize', h); window.removeEventListener('scroll', h); };
  }, [active, measureTarget]);

  /* ── Navigation ───────────────────────────────────────── */
  const dismiss = useCallback(() => {
    setActive(false);
    if (guideKey) localStorage.setItem(guideKey, '1');
  }, [guideKey]);

  const prev = () => setStepIdx(i => Math.max(0, i - 1));
  const next = () => isLast ? dismiss() : setStepIdx(i => i + 1);

  useEffect(() => {
    if (!active) return;
    const h = e => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  if (!active || !step) return null;

  const vw    = window.innerWidth;
  const vh    = window.innerHeight;
  const cardW = Math.min(310, vw - 24);
  const rx    = step.spotlightRadius ?? 12;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99990, pointerEvents: 'none' }}>

      {/* Dark backdrop */}
      <div onClick={dismiss} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(6,10,30,0.78)',
        pointerEvents: 'all',
      }} />

      {/* Spotlight cutout using box-shadow */}
      {spotRect && (
        <>
          <div style={{
            position: 'absolute',
            left: spotRect.x, top: spotRect.y,
            width: spotRect.width, height: spotRect.height,
            borderRadius: rx,
            background: 'transparent',
            boxShadow: '0 0 0 9999px rgba(6,10,30,0.78)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          {/* Glow border */}
          <div style={{
            position: 'absolute',
            left: spotRect.x - 2, top: spotRect.y - 2,
            width: spotRect.width + 4, height: spotRect.height + 4,
            borderRadius: rx + 2,
            border: '2px solid rgba(130,155,255,0.75)',
            pointerEvents: 'none', zIndex: 2,
          }} />
          {/* Pulse rings */}
          {[1, 2].map(ring => (
            <div key={ring} className="sc-pulse-ring" style={{
              position: 'absolute',
              left: spotRect.x  - ring * 10, top: spotRect.y  - ring * 10,
              width:  spotRect.width  + ring * 20,
              height: spotRect.height + ring * 20,
              borderRadius: rx + ring * 10,
              border: '1.5px solid rgba(110,135,255,0.3)',
              pointerEvents: 'none', zIndex: 2,
              animationDelay: `${ring * 0.55}s`,
            }} />
          ))}
        </>
      )}

      {/* ── Tooltip card ──────────────────────────────────── */}
      <div
        ref={cardRef}
        className="sc-tour-card"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', top: cardPos.top, left: cardPos.left,
          width: cardW, pointerEvents: 'all', zIndex: 99999,
        }}
        role="dialog"
        aria-label={`Step ${stepIdx + 1} of ${steps.length}: ${step.title}`}
      >
        <div style={{
          background: '#fff', borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(6,10,30,0.55), 0 6px 20px rgba(6,10,30,0.3), 0 0 0 1px rgba(120,140,255,0.15)',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1340A8 0%, #2C1FC7 55%, #4536F2 100%)',
            padding: '13px 14px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Decorative rings */}
            <div style={{ position:'absolute', width:70, height:70, borderRadius:'50%', border:'14px solid rgba(255,255,255,0.07)', top:-24, right:-14, pointerEvents:'none' }} />
            <div style={{ position:'absolute', width:44, height:44, borderRadius:'50%', border:'8px solid rgba(255,255,255,0.06)', bottom:-14, left:50, pointerEvents:'none' }} />

            {/* Icon — SVG if iconName given, emoji fallback */}
            <TourIcon iconName={step.iconName} emoji={step.icon} />

            {/* Step + title */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.1em', color:'rgba(255,255,255,0.55)', marginBottom:2, textTransform:'uppercase' }}>
                Step {stepIdx + 1} / {steps.length}
              </div>
              <div style={{ color:'#fff', fontWeight:800, fontSize:14, lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {step.title}
              </div>
            </div>

            {/* Close */}
            <button onClick={dismiss} style={{
              width:26, height:26, borderRadius:7, border:'none',
              background:'rgba(255,255,255,0.15)', color:'#fff',
              cursor:'pointer', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
            }} aria-label="Close tour">
              <CloseIcon />
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height:3, background:'#EEF1FF' }}>
            <div style={{
              height:'100%',
              width:`${((stepIdx + 1) / steps.length) * 100}%`,
              background:'linear-gradient(90deg,#1565C0,#4536F2)',
              transition:'width 0.35s ease',
            }} />
          </div>

          {/* Body */}
          <div style={{ padding:'14px 15px 15px' }}>
            <p style={{ fontSize:13.5, lineHeight:1.58, color:'#2D3554', margin:0 }}>
              {step.description}
            </p>

            {step.tip && (
              <div style={{
                marginTop:10, padding:'8px 11px',
                background:'#F0F2FF', borderRadius:9,
                border:'1px solid #C4CBFF',
                fontSize:12, color:'#3347E8', lineHeight:1.45,
                display:'flex', alignItems:'flex-start', gap:6,
              }}>
                <span style={{ fontSize:13, flexShrink:0 }}>💡</span>
                <span style={{ fontWeight:500 }}>{step.tip}</span>
              </div>
            )}

            {/* Footer */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:13, gap:6 }}>

              {/* Dots + Skip */}
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                  {steps.map((_, i) => (
                    <div key={i} style={{
                      width:      i === stepIdx ? 18 : 5,
                      height:     5, borderRadius:3,
                      background: i === stepIdx ? '#1565C0' : '#D4D8EE',
                      transition: 'all 0.25s ease',
                    }} />
                  ))}
                </div>
                {!isLast && (
                  <button className="sc-skip-btn" onClick={dismiss} style={{
                    background:'none', border:'none', cursor:'pointer',
                    padding:0, fontSize:11, fontWeight:600,
                    color:'#8892B4', opacity:0.75, textAlign:'left',
                    transition:'opacity 0.15s',
                  }} aria-label="Skip tour">
                    Skip tour
                  </button>
                )}
              </div>

              {/* Back + Next */}
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                {stepIdx > 0 && (
                  <button className="sc-back-btn" onClick={prev} style={{
                    height:34, paddingInline:10,
                    borderRadius:9, border:'1.5px solid #DDE1F0',
                    background:'#fff', color:'#4A5270',
                    cursor:'pointer', display:'flex', alignItems:'center',
                    gap:3, fontSize:12.5, fontWeight:600, transition:'all 0.15s',
                  }} aria-label="Previous step">
                    <ArrowIcon dir="left" /> Back
                  </button>
                )}
                <button className="sc-next-btn" onClick={next} style={{
                  height:34, paddingInline: isLast ? 16 : 12,
                  borderRadius:9, border:'none',
                  background:'linear-gradient(135deg,#1565C0,#3347E8)',
                  color:'#fff', cursor:'pointer',
                  display:'flex', alignItems:'center', gap:4,
                  fontSize:13, fontWeight:700,
                  boxShadow:'0 4px 12px rgba(21,101,192,0.4)',
                  transition:'all 0.15s',
                }} aria-label={isLast ? 'Finish tour' : 'Next step'}>
                  {isLast ? '🎉 Got it!' : 'Next'}
                  {!isLast && <ArrowIcon dir="right" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── TourTriggerButton ───────────────────────────────────── */
export function TourTriggerButton({ guideKey, onClick, className = '', style = {} }) {
  const handleClick = () => {
    if (guideKey) localStorage.removeItem(guideKey);
    if (onClick) onClick();
  };
  return (
    <button onClick={handleClick} aria-label="Show feature guide" className={className}
      style={{ width:32, height:32, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.15)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontWeight:700, fontSize:14, ...style }}>
      ?
    </button>
  );
}