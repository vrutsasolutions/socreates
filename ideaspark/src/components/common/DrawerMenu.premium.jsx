/**
 * DrawerMenu.premium.jsx
 * ─────────────────────────────────────────────────────────────
 * DROP-IN REPLACEMENT for DrawerMenu.jsx — same props, richer UI.
 *
 * Usage (in Home.jsx):
 *   import DrawerMenu from './DrawerMenu.premium';
 *   <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
 *
 * Requires: src/styles/design-tokens.css imported in main.jsx
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasCreatorPro } from '../../api/paymentApi';

/* ── Menu sections & items ───────────────────────────────── */
const MENU_SECTIONS = [
  {
    label: 'Discover',
    items: [
      {
        to: '/home',
        label: 'Home Feed',
        sublabel: 'Browse all ideas',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.5L12 3l9 8.5" />
            <path d="M5 9.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9.5" />
          </svg>
        ),
        color: 'var(--sc-primary-500, #3347E8)',
        bg:    'var(--sc-primary-50, #EEF0FF)',
      },
      {
        to: '/search',
        label: 'Explore',
        sublabel: 'Search & filter ideas',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
            <path d="M9 11h4M11 9v4" strokeWidth={1.8} />
          </svg>
        ),
        color: '#0369A1',
        bg:    '#EFF6FF',
      },
      {
        to: '/premium',
        label: 'Premium Ideas',
        sublabel: 'Exclusive startup concepts',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l3 5.5H20l-5 5 2 6.5L12 16l-5 4 2-6.5-5-5h5L12 3z" />
          </svg>
        ),
        color: 'var(--sc-accent-600, #D97706)',
        bg:    'var(--sc-accent-100, #FEF3C7)',
      },
    ],
  },
  {
    label: 'My Space',
    items: [
      {
        to: '/profile',
        label: 'My Profile',
        sublabel: 'Your ideas & activity',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="7.5" r="3.5" />
            <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
          </svg>
        ),
        color: '#0F766E',
        bg:    '#ECFDF5',
      },
      {
        to: '/saved-ideas',
        label: 'Saved Ideas',
        sublabel: 'Your bookmarked collection',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        ),
        color: 'var(--sc-primary-600, #2435C9)',
        bg:    'var(--sc-primary-50, #EEF0FF)',
      },
      {
        to: '/creator-dashboard',
        label: 'Creator Dashboard',
        sublabel: 'Your stats & performance',
        badge: 'NEW',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3"  y="3"  width="7" height="7" rx="1.5" />
            <rect x="14" y="3"  width="7" height="7" rx="1.5" />
            <rect x="3"  y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
        color: 'var(--sc-ai, #7C3AED)',
        bg:    'var(--sc-ai-light, #F5F0FF)',
      },
      {
        to: '/membership',
        label: 'Membership',
        sublabel: 'Plans & billing',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="13" rx="3" />
            <path d="M2 10h20" />
            <path d="M6 15h4" strokeWidth={2.2} />
          </svg>
        ),
        color: 'var(--sc-ai, #7C3AED)',
        bg:    'var(--sc-ai-light, #F5F0FF)',
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        to: '/settings',
        label: 'Settings',
        sublabel: 'Preferences & privacy',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        ),
        color: 'var(--sc-neutral-600, #4A5270)',
        bg:    'var(--sc-neutral-100, #F0F2F8)',
      },
    ],
  },
];

/* ── Deterministic avatar palette ────────────────────────── */
const AV_PALETTES = [
  { bg: '#EEF0FF', text: '#1A28A0' },
  { bg: '#ECFDF5', text: '#065F46' },
  { bg: '#FFFBEB', text: '#92400E' },
  { bg: '#F5F0FF', text: '#4C1D95' },
  { bg: '#FEF2F2', text: '#991B1B' },
  { bg: '#EFF6FF', text: '#1E3A8A' },
];
function avPalette(name = '') {
  return AV_PALETTES[name.charCodeAt(0) % AV_PALETTES.length] || AV_PALETTES[0];
}

/* ── Component ───────────────────────────────────────────── */
export default function DrawerMenu({ open, onClose }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();
  const drawerRef = useRef(null);
  const av        = avPalette(user?.name || '');
  const creatorPro = hasCreatorPro(user);

  /* Keyboard + scroll lock */
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (open) drawerRef.current?.focus();
  }, [open]);

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login');
  };

  return (
    <>
      <style>{`
        @keyframes sc-drawer-in  { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes sc-drawer-out { from { transform: translateX(0); }     to { transform: translateX(-100%); } }
        .sc-drawer-open  { animation: sc-drawer-in  280ms cubic-bezier(0.32, 0.72, 0, 1) both; }
        .sc-drawer-close { animation: sc-drawer-out 220ms cubic-bezier(0.4, 0, 1, 1)    both; }
        .sc-drawer-item:active { background: var(--sc-neutral-100) !important; transform: scale(0.98); }
        .sc-drawer-item { -webkit-tap-highlight-color: transparent; transition: background 150ms ease, transform 150ms ease; }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 'var(--sc-z-overlay, 40)',
          background: 'var(--sc-bg-overlay, rgba(15,18,36,0.55))',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          opacity:        open ? 1 : 0,
          pointerEvents:  open ? 'auto' : 'none',
          transition:     'opacity 280ms ease',
        }}
        aria-hidden
      />

      {/* ── Drawer panel ─────────────────────────────────── */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className={open ? 'sc-drawer-open' : 'sc-drawer-close'}
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: 288,
          zIndex: 'var(--sc-z-drawer, 50)',
          background: 'var(--sc-bg-surface, #fff)',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          boxShadow: 'var(--sc-shadow-2xl, 0 24px 64px rgba(15,18,36,0.16))',
          visibility: open ? 'visible' : 'hidden',
          transform: open ? undefined : 'translateX(-100%)',
          transition: open ? undefined : 'visibility 0s 220ms',
        }}
      >

        {/* ── Profile header ───────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--sc-primary-700, #1A28A0) 0%, var(--sc-primary-500, #3347E8) 100%)',
          padding: '48px 20px 20px',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Decorative circles */}
          <div aria-hidden style={{
            position: 'absolute', top: -30, right: -30,
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }} />
          <div aria-hidden style={{
            position: 'absolute', bottom: -20, right: 20,
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }} />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 32, height: 32, borderRadius: 10,
              background: 'rgba(255,255,255,0.12)',
              border: 'none', color: 'rgba(255,255,255,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 150ms ease',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Avatar + info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user?.name || 'Profile photo'}
                style={{
                  width: 52, height: 52, borderRadius: 16,
                  objectFit: 'cover', flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: av.bg, color: av.text,
                fontSize: 20, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                fontFamily: 'var(--sc-font-display, Inter, sans-serif)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                color: '#fff', fontSize: 15, fontWeight: 700,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'var(--sc-font-display, Inter, sans-serif)',
              }}>
                {user?.name ?? 'Guest'}
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.email ?? ''}
              </div>

              {/* Tier badge */}
              {user?.isPremium ? (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                  background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                  color: '#1a1200', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 999,
                }}>
                  <StarIcon size={9} /> PREMIUM
                </div>
              ) : (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                  background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)',
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                  padding: '3px 8px', borderRadius: 999,
                }}>
                  FREE PLAN
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Navigation sections ───────────────────────── */}
        <nav
          style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}
          aria-label="Main navigation"
        >
          {MENU_SECTIONS.map((section, si) => (
            <div key={si} style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--sc-text-muted, #9DA5BE)',
                padding: '10px 8px 6px',
                fontFamily: 'var(--sc-font-body, Inter, sans-serif)',
              }}>
                {section.label}
              </div>

              {section.items.map(({ to, label, sublabel, badge, Icon, color, bg }) => {
                // Creator Dashboard is gated: non-Pro users land on the upgrade page first.
                const target = (to === '/creator-dashboard' && !creatorPro) ? '/creator-pro' : to;
                const isActive = location.pathname === target ||
                  (target !== '/' && location.pathname.startsWith(target));
                return (
                  <Link
                    key={to}
                    to={target}
                    onClick={onClose}
                    className="sc-drawer-item"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 10px', borderRadius: 12, marginBottom: 2,
                      textDecoration: 'none',
                      /* FIXED: replaced color-mix() with bg variable */
                      background: isActive ? bg : 'transparent',
                    }}
                  >
                    {/* Icon box — FIXED: replaced color-mix() with bg variable */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: bg,
                      color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'background 150ms ease',
                    }}>
                      <Icon />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        fontSize: 13.5,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? color : 'var(--sc-text-primary, #0F1224)',
                        fontFamily: 'var(--sc-font-body, Inter, sans-serif)',
                        transition: 'color 150ms ease',
                      }}>
                        <span>{label}</span>
                        {badge && (
                          <span style={{
                            fontSize: 8.5, fontWeight: 800, letterSpacing: '0.07em',
                            color: '#fff', background: 'var(--sc-ai, #7C3AED)',
                            padding: '2px 6px', borderRadius: 999, lineHeight: 1,
                            textTransform: 'uppercase', flexShrink: 0,
                          }}>
                            {badge}
                          </span>
                        )}
                      </div>
                      {sublabel && (
                        <div style={{
                          fontSize: 11, color: 'var(--sc-text-muted, #9DA5BE)', marginTop: 1,
                        }}>
                          {sublabel}
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke={isActive ? color : 'var(--sc-border-strong, #C8CEDF)'}
                      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink: 0, transition: 'stroke 150ms ease' }}>
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer: Upgrade banner + Logout ──────────── */}
        <div style={{
          padding: '12px 12px 20px',
          borderTop: '1px solid var(--sc-border-subtle, #F0F2F8)',
          flexShrink: 0,
        }}>
          {/* Upgrade nudge — free users only */}
          {!user?.isPremium && (
            <Link
              to="/membership"
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'linear-gradient(135deg, #F5F0FF, #EEF0FF)',
                border: '1px solid #AEBCFF', borderRadius: 14,
                padding: '11px 13px', textDecoration: 'none', marginBottom: 8,
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg, #7C3AED, #3347E8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l3 5.5H20l-5 5 2 6.5L12 16l-5 4 2-6.5-5-5h5L12 3z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: 'var(--sc-ai, #7C3AED)',
                  fontFamily: 'var(--sc-font-display, Inter, sans-serif)',
                }}>
                  Go Premium
                </div>
                <div style={{ fontSize: 11, color: 'var(--sc-text-muted, #9DA5BE)', marginTop: 1 }}>
                  Unlock exclusive ideas
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#7C3AED" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="sc-drawer-item"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 10px', borderRadius: 12,
              border: 'none', background: 'transparent', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#FEF2F2', color: '#DC2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7" />
                <path d="M3 12V7a2 2 0 012-2h6" />
                <path d="M3 12v5a2 2 0 002 2h6" />
              </svg>
            </div>
            <span style={{
              fontSize: 13.5, fontWeight: 600, color: '#DC2626',
              fontFamily: 'var(--sc-font-body, Inter, sans-serif)',
            }}>
              Logout
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Micro icon ──────────────────────────────────────────── */
function StarIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="currentColor" stroke="none" style={{ display: 'block' }}>
      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}
