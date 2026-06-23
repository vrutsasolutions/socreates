/**
 * EmptyStates.premium.jsx
 * ─────────────────────────────────────────────────────────────
 * Comprehensive empty state library for SoCreate / IdeaSpark.
 *
 * Named exports:
 *   EmptyFeed          — Home feed has no ideas (tab is empty)
 *   EmptyForYou        — "For You" tab has no personalised content yet
 *   EmptySearch        — Search returned 0 results
 *   EmptySaved         — User has no saved ideas
 *   EmptyProfile       — User has published 0 ideas
 *   EmptyProfileSaved  — Profile "Saved" tab is empty
 *   EmptyPremium       — Premium feed has no content
 *   EmptyNotifications — No notifications yet
 *   EmptyFollowing     — User follows nobody yet
 *
 * Every component accepts:
 *   onAction   {function}  — CTA button handler (optional)
 *   actionLabel {string}   — Override default CTA label (optional)
 *
 * Requires: src/styles/design-tokens.css imported in main.jsx
 * ─────────────────────────────────────────────────────────────
 */

/* ─────────────────────────────────────────────────────────────
   SHARED SHELL
   Centres content vertically, fades in gently.
   ───────────────────────────────────────────────────────────── */
function EmptyShell({ children, minHeight = 320 }) {
  return (
    <div
      style={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        animation: 'sc-fade-in 300ms ease both',
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ILLUSTRATION WRAPPER
   White rounded square with subtle shadow — holds the SVG art.
   ───────────────────────────────────────────────────────────── */
function IllustrationTile({ children, bg = 'var(--sc-primary-50)', size = 96 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        boxShadow: '0 4px 24px rgba(51,71,232,0.10)',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Inner glow ring */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 'inherit',
        border: '1.5px solid rgba(51,71,232,0.10)',
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TEXT BLOCK — headline + subtext
   ───────────────────────────────────────────────────────────── */
function EmptyText({ headline, subtext }) {
  return (
    <>
      <h3 style={{
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--sc-text-primary)',
        fontFamily: 'var(--sc-font-display)',
        letterSpacing: '-0.01em',
        margin: '0 0 8px',
        lineHeight: 1.3,
      }}>
        {headline}
      </h3>
      <p style={{
        fontSize: 13,
        color: 'var(--sc-text-muted)',
        fontFamily: 'var(--sc-font-body)',
        margin: '0 0 24px',
        lineHeight: 1.6,
        maxWidth: 240,
      }}>
        {subtext}
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   CTA BUTTON
   ───────────────────────────────────────────────────────────── */
function EmptyCTA({ label, onClick, variant = 'primary' }) {
  if (!onClick) return null;

  const isPrimary = variant === 'primary';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '11px 24px',
        borderRadius: 'var(--sc-radius-xl)',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'var(--sc-font-body)',
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        transition: 'all 200ms cubic-bezier(0.34,1.56,0.64,1)',
        border: 'none',
        outline: 'none',
        ...(isPrimary ? {
          background: 'linear-gradient(135deg, var(--sc-primary-400), var(--sc-primary-600))',
          color: '#fff',
          boxShadow: 'var(--sc-shadow-brand)',
        } : {
          background: 'var(--sc-primary-50)',
          color: 'var(--sc-primary-600)',
          border: '1px solid var(--sc-primary-100)',
        }),
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
      onMouseDown={e  => { e.currentTarget.style.transform = 'scale(0.96)'; }}
      onMouseUp={e    => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; }}
    >
      {label}
    </button>
  );
}


/* ═════════════════════════════════════════════════════════════
   EMPTY STATES
   ═════════════════════════════════════════════════════════════ */

/* ── 1. EMPTY FEED — Home tab has no ideas ───────────────── */
export function EmptyFeed({ onAction, actionLabel = 'Explore All Ideas' }) {
  return (
    <EmptyShell>
      <IllustrationTile bg="var(--sc-primary-50)">
        {/* Lightbulb with sparkles */}
        <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
          {/* Bulb body */}
          <path
            d="M18 42h12M24 6a12 12 0 0112 12c0 4.44-2.4 8.32-6 10.4V34H18v-5.6A12.003 12.003 0 0112 18a12 12 0 0112-12z"
            stroke="var(--sc-primary-500)" strokeWidth={2.2}
            strokeLinecap="round" strokeLinejoin="round"
          />
          {/* Plus spark inside */}
          <path d="M24 16v8M20 20h8"
            stroke="var(--sc-primary-400)" strokeWidth={2.4}
            strokeLinecap="round"
          />
          {/* Small sparkles */}
          <circle cx="38" cy="12" r="2" fill="var(--sc-accent-400)" />
          <circle cx="10" cy="16" r="1.5" fill="var(--sc-primary-300)" />
          <circle cx="36" cy="30" r="1.5" fill="var(--sc-primary-200)" />
          {/* Rays */}
          <path d="M40 8l2-2M38 18h3M40 28l2 2"
            stroke="var(--sc-accent-400)" strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      </IllustrationTile>

      <EmptyText
        headline="No ideas here yet"
        subtext="This feed is waiting for the first spark. Check back soon or explore other tabs."
      />
      <EmptyCTA label={actionLabel} onClick={onAction} />
    </EmptyShell>
  );
}


/* ── 2. EMPTY FOR YOU — Personalisation not ready ─────────── */
export function EmptyForYou({ onAction, actionLabel = 'Set My Interests' }) {
  return (
    <EmptyShell>
      <IllustrationTile bg="#F5F0FF">
        {/* Person with star */}
        <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="15" r="7" stroke="#7C3AED" strokeWidth={2.2} />
          <path d="M8 40c0-8 7.163-14 16-14s16 6 16 14"
            stroke="#7C3AED" strokeWidth={2.2} strokeLinecap="round"
          />
          {/* Star */}
          <path d="M37 6l1.2 3.6H42l-3 2.2 1.1 3.4L37 13l-3.1 2.2L35 11.8 32 9.6h3.8L37 6z"
            stroke="var(--sc-accent-500)" strokeWidth={1.6}
            strokeLinejoin="round" fill="var(--sc-accent-100)"
          />
        </svg>
      </IllustrationTile>

      <EmptyText
        headline="Let's personalise your feed"
        subtext="Tell us what you're into and we'll curate ideas just for you."
      />
      <EmptyCTA label={actionLabel} onClick={onAction} />
    </EmptyShell>
  );
}


/* ── 3. EMPTY SEARCH — No results for a query ────────────── */
export function EmptySearch({ query = '', onAction, actionLabel = 'Clear Search' }) {
  return (
    <EmptyShell minHeight={280}>
      <IllustrationTile bg="var(--sc-neutral-100)" size={88}>
        {/* Magnifier with question mark */}
        <svg width={44} height={44} viewBox="0 0 48 48" fill="none">
          <circle cx="21" cy="21" r="13"
            stroke="var(--sc-neutral-500)" strokeWidth={2.2}
          />
          <path d="M30.5 30.5L41 41"
            stroke="var(--sc-neutral-500)" strokeWidth={2.5}
            strokeLinecap="round"
          />
          {/* Question mark inside */}
          <path d="M18 18a3 3 0 116 0c0 2-3 2.5-3 5"
            stroke="var(--sc-neutral-400)" strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx="21" cy="26" r="1.2" fill="var(--sc-neutral-400)" />
        </svg>
      </IllustrationTile>

      <EmptyText
        headline={query ? `No results for "${query}"` : 'No results found'}
        subtext="Try different keywords, check the spelling, or browse by category."
      />
      <EmptyCTA label={actionLabel} onClick={onAction} variant="secondary" />
    </EmptyShell>
  );
}


/* ── 4. EMPTY SAVED — No bookmarked ideas ────────────────── */
export function EmptySaved({ onAction, actionLabel = 'Explore Ideas' }) {
  return (
    <EmptyShell>
      <IllustrationTile bg="var(--sc-primary-50)">
        {/* Bookmark with plus */}
        <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
          {/* Bookmark shape */}
          <path d="M13 8h22a2 2 0 012 2v28l-13-8-13 8V10a2 2 0 012-2z"
            stroke="var(--sc-primary-400)" strokeWidth={2.2}
            strokeLinecap="round" strokeLinejoin="round"
            fill="var(--sc-primary-50)"
          />
          {/* Plus inside */}
          <path d="M24 18v8M20 22h8"
            stroke="var(--sc-primary-500)" strokeWidth={2.2}
            strokeLinecap="round"
          />
          {/* Small sparkle */}
          <circle cx="38" cy="10" r="2" fill="var(--sc-accent-400)" />
        </svg>
      </IllustrationTile>

      <EmptyText
        headline="Nothing saved yet"
        subtext="Tap the bookmark icon on any idea to save it here for later."
      />
      <EmptyCTA label={actionLabel} onClick={onAction} />
    </EmptyShell>
  );
}


/* ── 5. EMPTY PROFILE — User has published 0 ideas ────────── */
export function EmptyProfile({ onAction, actionLabel = 'Share Your First Idea' }) {
  return (
    <EmptyShell minHeight={260}>
      <IllustrationTile bg="var(--sc-primary-50)" size={88}>
        {/* Pencil + lightbulb */}
        <svg width={44} height={44} viewBox="0 0 48 48" fill="none">
          {/* Pencil body */}
          <path d="M32 6l10 10-22 22H10V28L32 6z"
            stroke="var(--sc-primary-400)" strokeWidth={2.2}
            strokeLinecap="round" strokeLinejoin="round"
            fill="var(--sc-primary-50)"
          />
          <path d="M28 10l10 10" stroke="var(--sc-primary-500)" strokeWidth={2} strokeLinecap="round" />
          {/* Tiny bulb */}
          <circle cx="10" cy="10" r="5"
            stroke="var(--sc-accent-500)" strokeWidth={1.8}
            fill="var(--sc-accent-50)"
          />
          <path d="M10 7v4M8 9h4"
            stroke="var(--sc-accent-500)" strokeWidth={1.6}
            strokeLinecap="round"
          />
        </svg>
      </IllustrationTile>

      <EmptyText
        headline="No ideas published yet"
        subtext="Your ideas can inspire others. Share your first spark with the community."
      />
      <EmptyCTA label={actionLabel} onClick={onAction} />
    </EmptyShell>
  );
}


/* ── 6. EMPTY PROFILE SAVED TAB ──────────────────────────── */
export function EmptyProfileSaved({ onAction, actionLabel = 'Browse Ideas' }) {
  return (
    <EmptyShell minHeight={260}>
      <IllustrationTile bg="var(--sc-neutral-100)" size={88}>
        <svg width={44} height={44} viewBox="0 0 48 48" fill="none">
          <path d="M13 8h22a2 2 0 012 2v28l-13-8-13 8V10a2 2 0 012-2z"
            stroke="var(--sc-neutral-400)" strokeWidth={2.2}
            strokeLinecap="round" strokeLinejoin="round"
            fill="var(--sc-neutral-100)"
          />
          <circle cx="24" cy="22" r="4"
            stroke="var(--sc-neutral-400)" strokeWidth={1.8}
          />
        </svg>
      </IllustrationTile>

      <EmptyText
        headline="No saved ideas yet"
        subtext="Ideas you bookmark will appear here."
      />
      <EmptyCTA label={actionLabel} onClick={onAction} variant="secondary" />
    </EmptyShell>
  );
}


/* ── 7. EMPTY PREMIUM — No premium content ───────────────── */
export function EmptyPremium({ onAction, actionLabel = 'Upgrade to Premium' }) {
  return (
    <EmptyShell>
      <IllustrationTile bg="var(--sc-accent-50)" size={100}>
        {/* Diamond / gem shape */}
        <svg width={52} height={52} viewBox="0 0 48 48" fill="none">
          {/* Gem body */}
          <path d="M8 18L24 40l16-22"
            stroke="var(--sc-accent-500)" strokeWidth={2.2}
            strokeLinecap="round" strokeLinejoin="round"
          />
          <path d="M8 18h32M16 8l-8 10M32 8l8 10M16 8h16"
            stroke="var(--sc-accent-500)" strokeWidth={2.2}
            strokeLinecap="round" strokeLinejoin="round"
          />
          {/* Shine lines */}
          <path d="M24 8V4M32 6l2-3M16 6l-2-3"
            stroke="var(--sc-accent-400)" strokeWidth={1.6}
            strokeLinecap="round"
          />
          {/* Inner facet */}
          <path d="M16 18l8 14 8-14"
            stroke="var(--sc-accent-300)" strokeWidth={1.4}
            strokeLinecap="round"
          />
        </svg>
      </IllustrationTile>

      <EmptyText
        headline="No exclusive content yet"
        subtext="Premium ideas are being curated. Upgrade now to be the first to see them."
      />
      <EmptyCTA label={actionLabel} onClick={onAction} />
    </EmptyShell>
  );
}


/* ── 8. EMPTY NOTIFICATIONS ──────────────────────────────── */
export function EmptyNotifications({ onAction, actionLabel = 'Explore Ideas' }) {
  return (
    <EmptyShell>
      <IllustrationTile bg="var(--sc-primary-50)">
        {/* Bell with Z's */}
        <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
          {/* Bell */}
          <path d="M24 6a10 10 0 0110 10c0 11-5 14-5 14H19s-5-3-5-14a10 10 0 0110-10z"
            stroke="var(--sc-primary-400)" strokeWidth={2.2}
            strokeLinecap="round" fill="var(--sc-primary-50)"
          />
          <path d="M21 34a3 3 0 006 0"
            stroke="var(--sc-primary-500)" strokeWidth={2.2}
            strokeLinecap="round"
          />
          <path d="M24 6V4" stroke="var(--sc-primary-400)" strokeWidth={2} strokeLinecap="round" />
          {/* Zzz */}
          <path d="M34 10h4l-4 4h4" stroke="var(--sc-neutral-400)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M37 18h3l-3 3h3" stroke="var(--sc-neutral-300)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </IllustrationTile>

      <EmptyText
        headline="All caught up!"
        subtext="No new notifications. We'll let you know when something happens."
      />
      <EmptyCTA label={actionLabel} onClick={onAction} variant="secondary" />
    </EmptyShell>
  );
}


/* ── 9. EMPTY FOLLOWING ──────────────────────────────────── */
export function EmptyFollowing({ onAction, actionLabel = 'Discover Creators' }) {
  return (
    <EmptyShell>
      <IllustrationTile bg="#ECFDF5" size={96}>
        {/* Two people + plus */}
        <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
          {/* Left person */}
          <circle cx="18" cy="15" r="5" stroke="#10B981" strokeWidth={2} />
          <path d="M6 36c0-6.627 5.373-10 12-10"
            stroke="#10B981" strokeWidth={2} strokeLinecap="round"
          />
          {/* Right person */}
          <circle cx="30" cy="15" r="5" stroke="#10B981" strokeWidth={2} />
          <path d="M42 36c0-6.627-5.373-10-12-10"
            stroke="#10B981" strokeWidth={2} strokeLinecap="round"
          />
          {/* Plus badge */}
          <circle cx="24" cy="30" r="7" fill="#10B981" />
          <path d="M24 27v6M21 30h6" stroke="white" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </IllustrationTile>

      <EmptyText
        headline="You're not following anyone"
        subtext="Follow creators to see their ideas in your feed and stay inspired."
      />
      <EmptyCTA label={actionLabel} onClick={onAction} />
    </EmptyShell>
  );
}
