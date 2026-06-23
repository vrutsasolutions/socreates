/**
 * LoadingStates.premium.jsx
 * ─────────────────────────────────────────────────────────────
 * Comprehensive loading & skeleton state library for SoCreate.
 *
 * Named exports — import only what you need:
 *
 *   import {
 *     PageLoader,           // Full-screen branded app launch loader
 *     ContentLoader,        // Inline section loading (replaces generic spinner)
 *     SpinnerIcon,          // Bare spinner SVG — use inside buttons, etc.
 *     HomePageSkeleton,     // Full Home feed skeleton (header + tabs + cards)
 *     FeedSkeleton,         // Just the 2-col card grid (reuse in Search, Premium)
 *     ProfileSkeleton,      // Profile page header + stats + tab area
 *     PremiumPageSkeleton,  // Premium page header + upsell banner + cards
 *     SearchSkeleton,       // Search page with input + chips + results area
 *     SavedIdeasSkeleton,   // Saved page header + card grid
 *     AddIdeaSkeleton,      // Multi-step form skeleton
 *     PublishingSkeleton,   // Step 3 publishing / security-check animation
 *     ButtonLoadingState,   // Button with built-in spinner+label swap
 *     InlineLoader,         // Small horizontal shimmer bar — for sub-sections
 *   } from './LoadingStates.premium';
 *
 * Requires: src/styles/design-tokens.css imported in main.jsx
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';

/* ─────────────────────────────────────────────────────────────
   PRIMITIVE SKELETON SHAPES
   All use .sc-skeleton from design-tokens.css for the shimmer.
   ───────────────────────────────────────────────────────────── */

/** Single shimmer bar — supply width/height/radius via style */
function Bone({ style = {} }) {
  return (
    <div
      className="sc-skeleton"
      style={{ borderRadius: 'var(--sc-radius-full)', ...style }}
    />
  );
}

/** Shimmer block — rounded rectangle */
function Block({ style = {} }) {
  return (
    <div
      className="sc-skeleton"
      style={{ borderRadius: 'var(--sc-radius-lg)', ...style }}
    />
  );
}

/** Shimmer circle or rounded square avatar */
function AvatarBone({ size = 40, radius = 'var(--sc-radius-lg)' }) {
  return (
    <div
      className="sc-skeleton"
      style={{ width: size, height: size, borderRadius: radius, flexShrink: 0 }}
    />
  );
}


/* ─────────────────────────────────────────────────────────────
   SPINNER ICON — bare SVG, inherits color from parent
   ───────────────────────────────────────────────────────────── */
export function SpinnerIcon({ size = 20, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      style={{
        animation: 'sc-spin 0.75s linear infinite',
        display: 'block',
        flexShrink: 0,
        ...style,
      }}
    >
      <path d="M12 2a10 10 0 0 1 10 10" opacity="1" />
      <path d="M12 2a10 10 0 0 0-10 10" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" opacity="0.5" />
      <path d="M2 12a10 10 0 0 0 10 10" opacity="0.75" />
    </svg>
  );
}


/* ─────────────────────────────────────────────────────────────
   PAGE LOADER — full-screen branded splash shown on app boot
   or hard page transitions (e.g. auth check in progress)
   ───────────────────────────────────────────────────────────── */
export function PageLoader({ message = 'Loading…' }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const t = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--sc-bg-header)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        zIndex: 9999,
        animation: 'sc-fade-in 200ms ease both',
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: 72,
          height: 72,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'sc-pulse 1.8s ease-in-out infinite',
        }}
      >
        <svg width={38} height={38} viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21h6M12 3a6 6 0 016 6c0 2.22-1.2 4.16-3 5.2V17H9v-2.8A6.002 6.002 0 016 9a6 6 0 016-6z"/>
          <path d="M12 8v4M10 10h4" strokeWidth={2.2}/>
        </svg>
      </div>

      {/* Wordmark */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          color: 'white',
          fontSize: 22,
          fontWeight: 800,
          fontFamily: 'var(--sc-font-display)',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}>
          SoCreate
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: 12,
          marginTop: 4,
          fontFamily: 'var(--sc-font-body)',
          letterSpacing: '0.04em',
          minHeight: 16,
        }}>
          {message}{dots}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        width: 120,
        height: 3,
        background: 'rgba(255,255,255,0.2)',
        borderRadius: 99,
        overflow: 'hidden',
        marginTop: 8,
      }}>
        <div style={{
          height: '100%',
          background: 'rgba(255,255,255,0.75)',
          borderRadius: 99,
          width: '35%',
          animation: 'sc-page-progress 1.4s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes sc-page-progress {
          0%   { width: 10%; transform: translateX(0); }
          50%  { width: 55%; }
          100% { width: 10%; transform: translateX(300px); }
        }
      `}</style>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   CONTENT LOADER — inline branded spinner for sections/pages
   Shows centered in its container; does not take full screen.
   ───────────────────────────────────────────────────────────── */
export function ContentLoader({ message, minHeight = 200 }) {
  return (
    <div
      style={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '32px 16px',
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        background: 'var(--sc-primary-50)',
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--sc-primary-500)',
      }}>
        <SpinnerIcon size={22} />
      </div>
      {message && (
        <p style={{
          fontSize: 13,
          color: 'var(--sc-text-muted)',
          fontFamily: 'var(--sc-font-body)',
          margin: 0,
        }}>
          {message}
        </p>
      )}
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   INLINE LOADER — slim shimmer bar for sub-section reloads
   ───────────────────────────────────────────────────────────── */
export function InlineLoader({ label = 'Updating…' }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 16px',
    }}>
      <SpinnerIcon size={14} style={{ color: 'var(--sc-primary-400)' }} />
      <span style={{
        fontSize: 12,
        color: 'var(--sc-text-muted)',
        fontFamily: 'var(--sc-font-body)',
      }}>
        {label}
      </span>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   BUTTON LOADING STATE
   Wraps an existing button — swap label when loading=true.
   ───────────────────────────────────────────────────────────── */
export function ButtonLoadingState({
  loading,
  loadingLabel = 'Loading…',
  children,
  className = '',
  style = {},
  disabled,
  onClick,
  ...props
}) {
  return (
    <button
      disabled={loading || disabled}
      onClick={onClick}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all 180ms ease',
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <>
          <SpinnerIcon size={16} />
          <span>{loadingLabel}</span>
        </>
      ) : children}
    </button>
  );
}


/* ─────────────────────────────────────────────────────────────
   SKELETON: 2-COL IDEA CARD GRID (reusable across pages)
   ───────────────────────────────────────────────────────────── */
function SkeletonIdeaCard() {
  return (
    <div style={{
      background: 'var(--sc-bg-surface)',
      border: '1px solid var(--sc-border-subtle)',
      borderRadius: 'var(--sc-radius-xl)',
      overflow: 'hidden',
    }}>
      {/* Image area */}
      <Block style={{ height: 144, borderRadius: 0 }} />

      <div style={{ padding: '12px 12px 14px' }}>
        {/* Creator row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <AvatarBone size={24} radius="var(--sc-radius-md)" />
          <Bone style={{ width: '52%', height: 11 }} />
          <Bone style={{ width: '18%', height: 10, marginLeft: 'auto' }} />
        </div>

        {/* Title lines */}
        <Bone style={{ width: '92%', height: 15, marginBottom: 6 }} />
        <Bone style={{ width: '68%', height: 15, marginBottom: 10 }} />

        {/* Description lines */}
        <Bone style={{ width: '100%', height: 11, marginBottom: 5 }} />
        <Bone style={{ width: '75%', height: 11, marginBottom: 14 }} />

        {/* Actions row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Bone style={{ width: 44, height: 24, borderRadius: 'var(--sc-radius-full)' }} />
          <Bone style={{ width: 52, height: 24, borderRadius: 'var(--sc-radius-full)' }} />
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 6 }) {
  return (
    <div className="sc-stagger" style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
    }}>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="sc-animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
          <SkeletonIdeaCard />
        </div>
      ))}
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   SKELETON: HOME PAGE (full page — header + greeting + tabs + feed)
   ───────────────────────────────────────────────────────────── */
export function HomePageSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--sc-bg-page)', paddingBottom: 96 }}>

      {/* Header bar */}
      <div style={{
        height: 56,
        background: 'var(--sc-bg-header)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
      }}>
        {/* Hamburger lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, opacity: 0.35 }}>
          <div style={{ width: 20, height: 2, background: 'white', borderRadius: 2 }} />
          <div style={{ width: 15, height: 2, background: 'white', borderRadius: 2 }} />
          <div style={{ width: 20, height: 2, background: 'white', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.18)', borderRadius: 8 }} />
          <Bone style={{ width: 88, height: 16, background: 'rgba(255,255,255,0.18)', backgroundImage: 'none' }} />
        </div>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.12)', borderRadius: 10 }} />
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.12)', borderRadius: 10 }} />
      </div>

      {/* Greeting area */}
      <div style={{ background: 'var(--sc-bg-header)', padding: '4px 16px 20px' }}>
        <Bone style={{ width: 160, height: 22, background: 'rgba(255,255,255,0.22)', backgroundImage: 'none', marginBottom: 8 }} />
        <Bone style={{ width: 220, height: 14, background: 'rgba(255,255,255,0.14)', backgroundImage: 'none' }} />
      </div>

      {/* White card area */}
      <div style={{ background: 'var(--sc-bg-header)' }}>
        <div style={{
          background: 'var(--sc-bg-surface)',
          borderRadius: '24px 24px 0 0',
          padding: '16px 16px 0',
        }}>
          {/* Tab row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
            {['Trending', 'Latest', 'For You'].map((_, i) => (
              <Bone
                key={i}
                style={{
                  width: i === 0 ? 80 : 68,
                  height: 36,
                  borderRadius: 'var(--sc-radius-xl)',
                  flexShrink: 0,
                  opacity: i === 0 ? 1 : 0.5,
                }}
              />
            ))}
          </div>

          <FeedSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   SKELETON: PROFILE PAGE
   ───────────────────────────────────────────────────────────── */
export function ProfileSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--sc-bg-page)', paddingBottom: 96 }}>

      {/* Header */}
      <div style={{
        background: 'var(--sc-bg-header)',
        padding: '16px 16px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.18)', borderRadius: 10 }} />
        <Bone style={{ width: 70, height: 18, background: 'rgba(255,255,255,0.22)', backgroundImage: 'none' }} />
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.18)', borderRadius: 10 }} />
      </div>

      {/* Profile hero */}
      <div style={{
        background: 'var(--sc-bg-header)',
        padding: '24px 16px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <AvatarBone size={88} radius={22} />
        <Bone style={{ width: 140, height: 20, background: 'rgba(255,255,255,0.22)', backgroundImage: 'none' }} />
        <Bone style={{ width: 100, height: 13, background: 'rgba(255,255,255,0.14)', backgroundImage: 'none' }} />
        <Bone style={{ width: 220, height: 11, background: 'rgba(255,255,255,0.10)', backgroundImage: 'none' }} />
      </div>

      {/* White card */}
      <div style={{ background: 'var(--sc-bg-header)' }}>
        <div style={{
          background: 'var(--sc-bg-surface)',
          borderRadius: '24px 24px 0 0',
          padding: 16,
        }}>

          {/* Stats row */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 40,
            paddingBottom: 16,
            borderBottom: '1px solid var(--sc-border-subtle)',
            marginBottom: 12,
          }}>
            {[60, 50, 70].map((w, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Bone style={{ width: 36, height: 20 }} />
                <Bone style={{ width: w, height: 11 }} />
              </div>
            ))}
          </div>

          {/* Edit profile button */}
          <Bone style={{ width: '100%', height: 44, borderRadius: 'var(--sc-radius-xl)', marginBottom: 16 }} />

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Bone style={{ flex: 1, height: 36, borderRadius: 'var(--sc-radius-xl)' }} />
            <Bone style={{ flex: 1, height: 36, borderRadius: 'var(--sc-radius-xl)', opacity: 0.4 }} />
          </div>

          <FeedSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   SKELETON: PREMIUM PAGE
   ───────────────────────────────────────────────────────────── */
export function PremiumPageSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--sc-bg-page)', paddingBottom: 96 }}>

      {/* Header */}
      <div style={{
        background: 'var(--sc-bg-header)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
      }}>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.18)', borderRadius: 10 }} />
        <Bone style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.18)', backgroundImage: 'none' }} />
        <Bone style={{ width: 72, height: 28, background: 'rgba(255,255,255,0.15)', backgroundImage: 'none', borderRadius: 'var(--sc-radius-full)' }} />
      </div>

      <div style={{ background: 'var(--sc-bg-header)' }}>
        <div style={{
          background: 'var(--sc-bg-surface)',
          borderRadius: '24px 24px 0 0',
          padding: 16,
        }}>

          {/* Upsell banner skeleton */}
          <Block style={{
            height: 130,
            borderRadius: 'var(--sc-radius-2xl)',
            marginBottom: 16,
          }} />

          {/* Count line */}
          <Bone style={{ width: 110, height: 12, marginBottom: 16 }} />

          <FeedSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   SKELETON: SEARCH PAGE
   ───────────────────────────────────────────────────────────── */
export function SearchSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--sc-bg-page)', paddingBottom: 96 }}>

      {/* Header */}
      <div style={{
        background: 'var(--sc-bg-header)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
      }}>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.18)', borderRadius: 10 }} />
        <Bone style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.18)', backgroundImage: 'none' }} />
      </div>

      <div style={{ background: 'var(--sc-bg-header)' }}>
        <div style={{
          background: 'var(--sc-bg-surface)',
          borderRadius: '24px 24px 0 0',
          padding: 16,
        }}>
          {/* Search input */}
          <Bone style={{
            width: '100%', height: 48,
            borderRadius: 'var(--sc-radius-xl)',
            marginBottom: 16,
          }} />

          {/* Category chips */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 24 }}>
            {[72, 48, 80, 56, 64, 60].map((w, i) => (
              <Bone key={i} style={{
                width: w, height: 32, flexShrink: 0,
                borderRadius: 'var(--sc-radius-full)',
                opacity: 1 - i * 0.1,
              }} />
            ))}
          </div>

          {/* Trending section heading */}
          <Bone style={{ width: 110, height: 13, marginBottom: 14 }} />

          {/* Trending chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {[88, 100, 76, 120, 84, 96].map((w, i) => (
              <Bone key={i} style={{
                width: w, height: 32,
                borderRadius: 'var(--sc-radius-xl)',
                opacity: 1 - i * 0.07,
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Search results are loading (after a query is typed) */
export function SearchResultsSkeleton({ count = 4 }) {
  return <FeedSkeleton count={count} />;
}


/* ─────────────────────────────────────────────────────────────
   SKELETON: SAVED IDEAS PAGE
   ───────────────────────────────────────────────────────────── */
export function SavedIdeasSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--sc-bg-page)', paddingBottom: 96 }}>

      {/* Header */}
      <div style={{
        background: 'var(--sc-bg-header)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
      }}>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.18)', borderRadius: 10 }} />
        <Bone style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.18)', backgroundImage: 'none' }} />
      </div>

      <div style={{ background: 'var(--sc-bg-header)' }}>
        <div style={{
          background: 'var(--sc-bg-surface)',
          borderRadius: '24px 24px 0 0',
          padding: 16,
        }}>
          {/* Count line */}
          <Bone style={{ width: 90, height: 12, marginBottom: 16 }} />
          <FeedSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   SKELETON: ADD IDEA MULTI-STEP FORM
   ───────────────────────────────────────────────────────────── */
export function AddIdeaSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', background: 'white', paddingBottom: 96 }}>

      {/* Header */}
      <div style={{
        background: 'var(--sc-bg-header)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
      }}>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.18)', borderRadius: 10 }} />
        <Bone style={{ width: 110, height: 16, background: 'rgba(255,255,255,0.22)', backgroundImage: 'none' }} />
      </div>

      {/* Step indicator */}
      <div style={{ background: 'var(--sc-bg-header)', paddingBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 16px 0' }}>
          {[0, 1, 2].map(i => (
            <Bone key={i} style={{
              flex: 1, height: 4,
              borderRadius: 99,
              background: i === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.22)',
              backgroundImage: 'none',
            }} />
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--sc-bg-header)' }}>
        <div style={{
          background: 'white',
          borderRadius: '24px 24px 0 0',
          padding: 16,
        }}>
          {/* Form fields */}
          <Bone style={{ width: 80, height: 12, marginBottom: 8 }} />
          <Bone style={{ width: '100%', height: 52, borderRadius: 'var(--sc-radius-xl)', marginBottom: 18 }} />

          <Bone style={{ width: 100, height: 12, marginBottom: 8 }} />
          <Bone style={{ width: '100%', height: 100, borderRadius: 'var(--sc-radius-xl)', marginBottom: 18 }} />

          <Bone style={{ width: 90, height: 12, marginBottom: 12 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {[80, 68, 90, 76, 72, 84, 66, 88].map((w, i) => (
              <Bone key={i} style={{ width: w, height: 34, borderRadius: 'var(--sc-radius-xl)', opacity: 1 - i * 0.08 }} />
            ))}
          </div>

          {/* Image upload area */}
          <Bone style={{
            width: '100%', height: 110,
            borderRadius: 'var(--sc-radius-2xl)',
            marginBottom: 24,
          }} />

          {/* CTA button */}
          <Bone style={{ width: '100%', height: 52, borderRadius: 'var(--sc-radius-2xl)' }} />
        </div>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   PUBLISHING SKELETON — Step 3 security check animation
   Shows an animated checklist while the API processes
   ───────────────────────────────────────────────────────────── */
export function PublishingSkeleton({ steps = [] }) {
  /*
   * steps prop: array of { label: string, status: 'pending'|'running'|'done'|'error' }
   * Example:
   *   [
   *     { label: 'Cosine Similarity Check', status: 'done' },
   *     { label: 'Plagiarism Detection',    status: 'running' },
   *     { label: 'Publish to Feed',         status: 'pending' },
   *   ]
   */
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--sc-border-subtle)',
      borderRadius: 'var(--sc-radius-2xl)',
      padding: 20,
    }}>
      <p style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--sc-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        margin: '0 0 16px',
        fontFamily: 'var(--sc-font-body)',
      }}>
        Security Check
      </p>

      {steps.map(({ label, status }, idx) => (
        <div key={label} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: idx < steps.length - 1 ? 14 : 0,
        }}>
          {/* Status icon */}
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 300ms var(--sc-ease-spring)',
            ...(status === 'done' ? {
              background: 'var(--sc-success-light)',
              color: 'var(--sc-success)',
            } : status === 'running' ? {
              background: 'var(--sc-primary-50)',
              color: 'var(--sc-primary-500)',
            } : status === 'error' ? {
              background: 'var(--sc-error-light)',
              color: 'var(--sc-error)',
            } : {
              background: 'var(--sc-neutral-100)',
              color: 'var(--sc-text-muted)',
            }),
          }}>
            {status === 'done' && (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M5 12l5 5L20 7"/>
              </svg>
            )}
            {status === 'running' && <SpinnerIcon size={15} />}
            {status === 'error' && (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            )}
            {status === 'pending' && (
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.4 }} />
            )}
          </div>

          {/* Label */}
          <span style={{
            fontSize: 13,
            fontFamily: 'var(--sc-font-body)',
            fontWeight: status === 'running' ? 600 : 400,
            color: status === 'done'
              ? 'var(--sc-success)'
              : status === 'error'
                ? 'var(--sc-error)'
                : status === 'running'
                  ? 'var(--sc-text-primary)'
                  : 'var(--sc-text-muted)',
            transition: 'color 300ms ease',
          }}>
            {label}
          </span>

          {/* Running progress shimmer */}
          {status === 'running' && (
            <div style={{
              marginLeft: 'auto',
              width: 48,
              height: 4,
              borderRadius: 99,
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              <div className="sc-skeleton" style={{ width: '100%', height: '100%', borderRadius: 99 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   SKELETON: IDEA DETAIL PAGE (single idea view)
   ───────────────────────────────────────────────────────────── */
export function IdeaDetailSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', background: 'white', paddingBottom: 96 }}>

      {/* Header */}
      <div style={{
        background: 'var(--sc-bg-header)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
      }}>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.18)', borderRadius: 10 }} />
        <Bone style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.18)', backgroundImage: 'none' }} />
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.18)', borderRadius: 10 }} />
      </div>

      {/* Cover image */}
      <Block style={{ height: 220, borderRadius: 0 }} />

      <div style={{ padding: 16 }}>
        {/* Category + PRO badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <Bone style={{ width: 70, height: 24, borderRadius: 'var(--sc-radius-full)' }} />
          <Bone style={{ width: 44, height: 24, borderRadius: 'var(--sc-radius-full)' }} />
        </div>

        {/* Title */}
        <Bone style={{ width: '95%', height: 26, marginBottom: 8 }} />
        <Bone style={{ width: '70%', height: 26, marginBottom: 16 }} />

        {/* Creator row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <AvatarBone size={36} />
          <div style={{ flex: 1 }}>
            <Bone style={{ width: '50%', height: 13, marginBottom: 6 }} />
            <Bone style={{ width: '35%', height: 11 }} />
          </div>
          <Bone style={{ width: 72, height: 32, borderRadius: 'var(--sc-radius-full)' }} />
        </div>

        {/* Body text */}
        {[100, 90, 95, 80, 85].map((w, i) => (
          <Bone key={i} style={{ width: `${w}%`, height: 13, marginBottom: 8 }} />
        ))}
      </div>
    </div>
  );
}

