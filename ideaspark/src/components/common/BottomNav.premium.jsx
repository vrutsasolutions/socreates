/**
 * BottomNav.premium.jsx
 * ─────────────────────────────────────────────────────────────
 * DROP-IN REPLACEMENT for BottomNav.jsx — same usage, richer UI.
 *
 * Usage (in Home.jsx, Search.jsx, Profile.jsx, etc.):
 *   import BottomNav from './BottomNav.premium';
 *
 * Requires: src/styles/design-tokens.css imported in main.jsx
 * ─────────────────────────────────────────────────────────────
 */

import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

/* ── Nav items ───────────────────────────────────────────────
   Each item has a unique custom icon — not generic heroicons.
   Icons are designed to feel distinct and premium.
   ─────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    to: '/home',
    label: 'Home',
    /* House with a spark/dot detail — unique touch */
    Icon: ({ active }) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5L12 3l9 8.5" />
        <path d="M5 9.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9.5" />
        {active && <circle cx="12" cy="13" r="1.2" fill="currentColor" stroke="none" />}
      </svg>
    ),
  },
  {
    to: '/search',
    label: 'Explore',
    /* Compass-style search — not the plain magnifier */
    Icon: ({ active }) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
        {active
          ? <path d="M8.5 11a2.5 2.5 0 015 0" strokeWidth={2.2} />
          : <path d="M9 11h4M11 9v4" strokeWidth={1.6} />
        }
      </svg>
    ),
  },
  {
    to: '/add-idea',
    label: 'Create',
    isAdd: true,
    /* Lightbulb + plus — thematic to the app */
    Icon: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2.2}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21h6M12 3a6 6 0 016 6c0 2.22-1.2 4.16-3 5.2V17H9v-2.8A6.002 6.002 0 016 9a6 6 0 016-6z" />
        <path d="M12 8v5M9.5 10.5h5" strokeWidth={2.4} />
      </svg>
    ),
  },
  {
    to: '/premium',
    label: 'Premium',
    /* Diamond shape — more premium than a star */
    Icon: ({ active }) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <path d={active
          ? "M12 2l3.5 6.5H21l-5.5 5.5 2 7L12 17l-5.5 4 2-7L3 8.5h5.5L12 2z"
          : "M12 3l3 5.5H20l-5 5 2 6.5L12 16l-5 4 2-6.5-5-5h5L12 3z"
        }
          fill={active ? 'currentColor' : 'none'}
        />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    /* Person with a subtle detail — rounded head, body arc */
    Icon: ({ active }) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7.5" r="3.5" fill={active ? 'currentColor' : 'none'} />
        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

/* ── Component ───────────────────────────────────────────── */
export default function BottomNav() {
  const location = useLocation();
  const navRef   = useRef(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const itemRefs = useRef([]);

  /* Active pill: slide under active non-Add tab */
  useEffect(() => {
    const activeIdx = NAV_ITEMS.findIndex(
      (n) => !n.isAdd && location.pathname.startsWith(n.to)
    );
    if (activeIdx === -1 || !itemRefs.current[activeIdx] || !navRef.current) return;

    const navRect  = navRef.current.getBoundingClientRect();
    const itemRect = itemRefs.current[activeIdx].getBoundingClientRect();

    setPillStyle({
      left:    itemRect.left - navRect.left + itemRect.width / 2 - 20,
      width:   40,
      opacity: 1,
    });
  }, [location.pathname]);

  return (
    <>
      {/* Inject hover-zoom style for Add button */}
      <style>{`
        .sc-nav-add:hover { transform: translateY(-4px) scale(1.06); }
        .sc-nav-add:active { transform: translateY(-2px) scale(0.95); }
        .sc-nav-item { -webkit-tap-highlight-color: transparent; }
        .sc-nav-item:active > * { transform: scale(0.88); }
      `}</style>

      <nav
        ref={navRef}
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 'var(--sc-z-sticky, 30)',
          height: 'var(--sc-bottom-nav-height, 72px)',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--sc-border-subtle, #F0F2F8)',
          boxShadow: '0 -4px 24px rgba(15,18,36,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Sliding active pill indicator */}
        <div
          aria-hidden
          style={{
            position:   'absolute',
            top:        8,
            height:     3,
            borderRadius: 999,
            background: 'var(--sc-primary-500, #3347E8)',
            transition: 'left 300ms cubic-bezier(0.34,1.56,0.64,1), width 300ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease',
            ...pillStyle,
          }}
        />

        {NAV_ITEMS.map(({ to, label, Icon, isAdd }, idx) => (
          <NavLink
            key={to}
            to={to}
            ref={el => itemRefs.current[idx] = el}
            className="sc-nav-item"
            style={{ textDecoration: 'none', flex: 1, display: 'flex', justifyContent: 'center' }}
          >
            {({ isActive }) =>
              isAdd ? (
                /* ── Floating Add (Create) button ─────────── */
                <div
                  className="sc-nav-add"
                  style={{
                    width: 52,
                    height: 52,
                    marginTop: -20,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, var(--sc-primary-400, #4F62F5), var(--sc-primary-600, #2435C9))',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--sc-shadow-brand, 0 8px 24px rgba(51,71,232,0.32))',
                    transition: 'transform 250ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 250ms ease',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  aria-label="Create new idea"
                >
                  <Icon />
                </div>
              ) : (
                /* ── Regular tab ─────────────────────────── */
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  paddingTop: 12,
                  paddingBottom: 6,
                  minWidth: 48,
                  color: isActive
                    ? 'var(--sc-primary-500, #3347E8)'
                    : 'var(--sc-text-muted, #9DA5BE)',
                  transition: 'color 180ms ease',
                }}>
                  {/* Icon wrapper — spring scale on active */}
                  <div style={{
                    transform: isActive ? 'scale(1.12)' : 'scale(1)',
                    transition: 'transform 300ms cubic-bezier(0.34,1.56,0.64,1)',
                  }}>
                    <Icon active={isActive} />
                  </div>

                  {/* Label */}
                  <span style={{
                    fontSize:   10,
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: isActive ? '-0.01em' : '0.01em',
                    fontFamily: 'var(--sc-font-body, Inter, sans-serif)',
                    color: isActive
                      ? 'var(--sc-primary-500, #3347E8)'
                      : 'var(--sc-text-muted, #9DA5BE)',
                    transition: 'all 180ms ease',
                  }}>
                    {label}
                  </span>
                </div>
              )
            }
          </NavLink>
        ))}
      </nav>
    </>
  );
}
