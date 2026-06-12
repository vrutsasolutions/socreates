/**
 * DrawerMenu.premium.jsx — IdeaSpark
 * Slide-in navigation drawer. Matches Home's blue/white design language:
 *   • Blue (#1565C0) header with decorative rings (same as every page header)
 *   • White surface below, rounded-t-[32px] transition
 *   • All interactive rows use the site's standard hover/active states
 *   • Consistent font weights, spacing, and border radii throughout
 */

import { useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasCreatorPro } from '../../api/paymentApi';

/* ── Menu data ────────────────────────────────────────────── */
const MENU_SECTIONS = [
  {
    label: 'Discover',
    items: [
      {
        to: '/home',
        label: 'Home Feed',
        sublabel: 'Browse all ideas',
        color: '#1565C0',
        bg: '#E3F2FD',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.5L12 3l9 8.5" />
            <path d="M5 9.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9.5" />
          </svg>
        ),
      },
      {
        to: '/search',
        label: 'Explore',
        sublabel: 'Search & filter ideas',
        color: '#0369A1',
        bg: '#E0F2FE',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        ),
      },
      {
        to: '/premium',
        label: 'Premium Ideas',
        sublabel: 'Exclusive startup concepts',
        color: '#B45309',
        bg: '#FEF3C7',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l3 5.5H20l-5 5 2 6.5L12 16l-5 4 2-6.5-5-5h5L12 3z" />
          </svg>
        ),
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
        color: '#0F766E',
        bg: '#CCFBF1',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="7.5" r="3.5" />
            <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
          </svg>
        ),
      },
      {
        to: '/saved-ideas',
        label: 'Saved Ideas',
        sublabel: 'Your bookmarked collection',
        color: '#1565C0',
        bg: '#E3F2FD',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        ),
      },
      {
        to: '/creator-dashboard',
        label: 'Creator Dashboard',
        sublabel: 'Stats & performance',
        badge: 'NEW',
        color: '#6D28D9',
        bg: '#EDE9FE',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3"  y="3"  width="7" height="7" rx="1.5" />
            <rect x="14" y="3"  width="7" height="7" rx="1.5" />
            <rect x="3"  y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
      {
        to: '/membership',
        label: 'Membership',
        sublabel: 'Plans & billing',
        color: '#1565C0',
        bg: '#DBEAFE',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="13" rx="3" />
            <path d="M2 10h20" />
            <path d="M6 15h4" strokeWidth={2.2} />
          </svg>
        ),
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
        color: '#475569',
        bg: '#F1F5F9',
        Icon: () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
];

/* ── Deterministic avatar colour ─────────────────────────── */
const AV_PALETTES = [
  { bg: '#DBEAFE', text: '#1565C0' },
  { bg: '#CCFBF1', text: '#0F766E' },
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#EDE9FE', text: '#4C1D95' },
  { bg: '#FCE7F3', text: '#9D174D' },
  { bg: '#D1FAE5', text: '#065F46' },
];
function avPalette(name = '') {
  return AV_PALETTES[name.charCodeAt(0) % AV_PALETTES.length] || AV_PALETTES[0];
}

/* ── Component ───────────────────────────────────────────── */
export default function DrawerMenu({ open, onClose }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, logout } = useAuth();
  const drawerRef  = useRef(null);
  const av         = avPalette(user?.name || '');
  const creatorPro = hasCreatorPro(user);

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

  const handleLogout = () => { onClose(); logout(); navigate('/login'); };

  return (
    <>
      <style>{`
        @keyframes sc-drawer-in  { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes sc-drawer-out { from { transform: translateX(0); }     to { transform: translateX(-100%); } }
        .sc-drawer-open  { animation: sc-drawer-in  280ms cubic-bezier(0.32,0.72,0,1) both; }
        .sc-drawer-close { animation: sc-drawer-out 220ms cubic-bezier(0.4,0,1,1)    both; }
        .sc-drawer-row { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:16px; margin-bottom:2px; text-decoration:none; cursor:pointer; transition: background 150ms ease, transform 150ms ease; -webkit-tap-highlight-color:transparent; }
        .sc-drawer-row:hover  { background:rgba(21,101,192,0.07); }
        .sc-drawer-row:active { background:rgba(21,101,192,0.13); transform:scale(0.98); }
        .sc-drawer-logout:hover  { background:#FEF2F2; }
        .sc-drawer-logout:active { background:#FEE2E2; transform:scale(0.98); }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(13,33,55,0.5)',
          backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 280ms ease',
        }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className={open ? 'sc-drawer-open' : 'sc-drawer-close'}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 300,
          zIndex: 50,
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          outline: 'none',
          boxShadow: '0 24px 64px rgba(13,33,55,0.18)',
          visibility: open ? 'visible' : 'hidden',
          transform: open ? undefined : 'translateX(-100%)',
          transition: open ? undefined : 'visibility 0s 220ms',
        }}
      >

        {/* ── Header — same blue + rings as every page ─── */}
        <div style={{
          background: '#1565C0',
          padding: '52px 20px 20px',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Decorative rings — matches site header */}
          <div aria-hidden style={{
            position: 'absolute', top: -30, right: -30,
            width: 140, height: 140, borderRadius: '50%',
            border: '28px solid rgba(255,255,255,0.06)',
          }} />
          <div aria-hidden style={{
            position: 'absolute', bottom: -20, left: -20,
            width: 100, height: 100, borderRadius: '50%',
            border: '22px solid rgba(255,255,255,0.04)',
          }} />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 34, height: 34, borderRadius: 12,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Avatar + user info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
            {user?.profileImage ? (
              <img
                src={user.profileImage} alt={user?.name}
                style={{ width: 52, height: 52, borderRadius: 16, objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}
              />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: av.bg, color: av.text,
                fontSize: 20, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: '2px solid rgba(255,255,255,0.25)',
              }}>
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                color: '#fff', fontSize: 15, fontWeight: 700,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}>
                {user?.name ?? 'Guest'}
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.email ?? ''}
              </div>

              {/* Plan badge */}
              {user?.isPremium ? (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7,
                  background: 'linear-gradient(135deg,#FBBF24,#F59E0B)',
                  color: '#78350F', fontSize: 10, fontWeight: 800,
                  letterSpacing: '0.05em', padding: '3px 9px', borderRadius: 999,
                }}>
                  <StarIcon size={9} /> PREMIUM
                </div>
              ) : (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7,
                  background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)',
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                  padding: '3px 9px', borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  FREE PLAN
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── White nav area — rounded-t-[32px] matching every page ── */}
        <div style={{
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          marginTop: -20,
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <nav style={{ flex: 1, padding: '16px 12px 8px' }} aria-label="Main navigation">
            {MENU_SECTIONS.map((section, si) => (
              <div key={si} style={{ marginBottom: 6 }}>
                {/* Section label — same style as page section labels */}
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#90A4AE',
                  padding: '10px 12px 6px',
                }}>
                  {section.label}
                </div>

                {section.items.map(({ to, label, sublabel, badge, Icon, color, bg }) => {
                  const target = (to === '/creator-dashboard' && !creatorPro) ? '/creator-pro' : to;
                  const isActive = location.pathname === target ||
                    (target !== '/' && location.pathname.startsWith(target));

                  return (
                    <Link
                      key={to}
                      to={target}
                      onClick={onClose}
                      className="sc-drawer-row"
                      style={{
                        background: isActive ? bg : 'transparent',
                        border: isActive ? `1px solid ${color}22` : '1px solid transparent',
                      }}
                    >
                      {/* Icon box */}
                      <div style={{
                        width: 38, height: 38, borderRadius: 12,
                        background: bg, color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon />
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          fontSize: 14, fontWeight: isActive ? 700 : 500,
                          color: isActive ? color : '#0D2137',
                          transition: 'color 150ms ease',
                        }}>
                          <span style={{ letterSpacing: isActive ? '-0.01em' : '0' }}>{label}</span>
                          {badge && (
                            <span style={{
                              fontSize: 8.5, fontWeight: 800, letterSpacing: '0.07em',
                              color: '#fff', background: '#1565C0',
                              padding: '2px 6px', borderRadius: 999,
                              textTransform: 'uppercase', flexShrink: 0,
                            }}>
                              {badge}
                            </span>
                          )}
                        </div>
                        {sublabel && (
                          <div style={{ fontSize: 11, color: '#90A4AE', marginTop: 1 }}>
                            {sublabel}
                          </div>
                        )}
                      </div>

                      {/* Chevron */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke={isActive ? color : '#BBDEFB'}
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

          {/* ── Footer ───────────────────────────────────── */}
          <div style={{
            padding: '8px 12px 24px',
            borderTop: '1px solid #F0F6FF',
            flexShrink: 0,
          }}>
            {/* Upgrade nudge — free users only */}
            {!user?.isPremium && (
              <Link
                to="/membership"
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#F0F6FF',
                  border: '1px solid #BBDEFB',
                  borderRadius: 16,
                  padding: '12px 14px',
                  textDecoration: 'none',
                  marginBottom: 6,
                  transition: 'background 150ms ease, border-color 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; e.currentTarget.style.borderColor = '#1565C0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F0F6FF'; e.currentTarget.style.borderColor = '#BBDEFB'; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: '#1565C0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l3 5.5H20l-5 5 2 6.5L12 16l-5 4 2-6.5-5-5h5L12 3z" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1565C0', letterSpacing: '-0.01em' }}>
                    Upgrade to Premium
                  </div>
                  <div style={{ fontSize: 11, color: '#90A4AE', marginTop: 1 }}>
                    Unlock exclusive ideas
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#BBDEFB" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="sc-drawer-row sc-drawer-logout"
              style={{
                width: '100%', border: 'none', background: 'transparent', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: '#FEE2E2', color: '#DC2626',
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
              <span style={{ fontSize: 14, fontWeight: 600, color: '#DC2626' }}>
                Logout
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function StarIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}