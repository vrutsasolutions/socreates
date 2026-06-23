/**
 * ErrorStates.premium.jsx
 * ─────────────────────────────────────────────────────────────
 * Comprehensive error state library for SoCreate / IdeaSpark.
 *
 * Named exports:
 *   NetworkError       — No internet / request timed out
 *   ServerError        — 500 / unexpected backend failure
 *   NotFoundError      — 404 page or resource missing
 *   PermissionError    — 401 / 403 unauthorised access
 *   ValidationError    — Inline form field error message
 *   FormError          — Full form-level submission error banner
 *   IdeaLoadError      — Idea detail / feed failed to load (with retry)
 *   ProfileLoadError   — Profile page failed to load
 *   UploadError        — Image / file upload failed
 *   AIError            — AI generation / suggestion failed
 *
 * Every component accepts:
 *   onRetry     {function} — "Try again" handler (optional)
 *   onAction    {function} — Secondary CTA handler (optional)
 *   actionLabel {string}   — Override default CTA label (optional)
 *   message     {string}   — Override default description (optional)
 *
 * ValidationError additionally accepts:
 *   field   {string}  — Field name for context
 *   error   {string}  — The error message string (required)
 *
 * FormError additionally accepts:
 *   errors  {string[]} — Array of error strings to list
 *
 * Requires: src/styles/design-tokens.css imported in main.jsx
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from 'react';

/* ─────────────────────────────────────────────────────────────
   SHARED SHELL
   Same pattern as EmptyStates — centres content, fades in.
   ───────────────────────────────────────────────────────────── */
function ErrorShell({ children, minHeight = 320 }) {
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
   ILLUSTRATION TILE
   Matches EmptyStates IllustrationTile — same size, same shadow.
   bg defaults to error-light for error states.
   ───────────────────────────────────────────────────────────── */
function ErrorTile({ children, bg = 'var(--sc-error-light)', size = 96 }) {
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
        boxShadow: '0 4px 24px rgba(239,68,68,0.10)',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Inner glow ring */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 'inherit',
        border: '1.5px solid rgba(239,68,68,0.12)',
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TEXT BLOCK
   ───────────────────────────────────────────────────────────── */
function ErrorText({ headline, subtext }) {
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
   ERROR CODE BADGE — small pill showing HTTP status code
   ───────────────────────────────────────────────────────────── */
function ErrorCode({ code }) {
  if (!code) return null;
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 10px',
      borderRadius: 'var(--sc-radius-full)',
      background: 'var(--sc-error-light)',
      border: '1px solid rgba(239,68,68,0.18)',
      fontSize: 11,
      fontWeight: 700,
      fontFamily: 'var(--sc-font-mono)',
      color: 'var(--sc-error)',
      letterSpacing: '0.04em',
      marginBottom: 14,
    }}>
      {code}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CTA BUTTONS — Retry (primary) + secondary action
   ───────────────────────────────────────────────────────────── */
function RetryButton({ onClick, label = 'Try Again', spinning = false }) {
  if (!onClick) return null;
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
        background: 'linear-gradient(135deg, var(--sc-primary-400), var(--sc-primary-600))',
        color: '#fff',
        boxShadow: 'var(--sc-shadow-brand)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
      onMouseDown={e  => { e.currentTarget.style.transform = 'scale(0.96)'; }}
      onMouseUp={e    => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; }}
    >
      {spinning ? (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2.5} strokeLinecap="round"
          style={{ animation: 'sc-spin 0.75s linear infinite' }}>
          <path d="M12 2a10 10 0 1 0 10 10" />
        </svg>
      ) : (
        /* Refresh arrow icon */
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      )}
      {label}
    </button>
  );
}

function SecondaryButton({ onClick, label }) {
  if (!onClick || !label) return null;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '10px 20px',
        borderRadius: 'var(--sc-radius-xl)',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'var(--sc-font-body)',
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        transition: 'all 180ms ease',
        border: '1px solid var(--sc-border-default)',
        outline: 'none',
        background: 'var(--sc-bg-surface)',
        color: 'var(--sc-text-secondary)',
        marginTop: 10,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--sc-neutral-100)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--sc-bg-surface)'; }}
    >
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACTION COLUMN — wraps retry + secondary in a column
   ───────────────────────────────────────────────────────────── */
function Actions({ onRetry, retryLabel, spinning, onAction, actionLabel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <RetryButton onClick={onRetry} label={retryLabel} spinning={spinning} />
      <SecondaryButton onClick={onAction} label={actionLabel} />
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════
   ERROR STATES
   ═════════════════════════════════════════════════════════════ */

/* ── 1. NETWORK ERROR — No internet / timeout ─────────────── */
export function NetworkError({
  onRetry,
  onAction,
  actionLabel = 'Go Home',
  message,
}) {
  const [spinning, setSpinning] = useState(false);

  function handleRetry() {
    if (!onRetry) return;
    setSpinning(true);
    setTimeout(() => setSpinning(false), 1500);
    onRetry();
  }

  return (
    <ErrorShell>
      <ErrorTile bg="var(--sc-neutral-100)">
        {/* Wifi-off SVG */}
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none"
          stroke="var(--sc-neutral-500)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" fill="var(--sc-neutral-500)" stroke="none" />
        </svg>
      </ErrorTile>

      <ErrorText
        headline="No Connection"
        subtext={message || "Looks like you're offline. Check your internet and give it another shot."}
      />

      <Actions
        onRetry={handleRetry}
        retryLabel="Try Again"
        spinning={spinning}
        onAction={onAction}
        actionLabel={actionLabel}
      />
    </ErrorShell>
  );
}


/* ── 2. SERVER ERROR — 500 / unexpected failure ───────────── */
export function ServerError({
  onRetry,
  onAction,
  actionLabel = 'Go Home',
  message,
}) {
  const [spinning, setSpinning] = useState(false);

  function handleRetry() {
    if (!onRetry) return;
    setSpinning(true);
    setTimeout(() => setSpinning(false), 1500);
    onRetry();
  }

  return (
    <ErrorShell>
      <ErrorCode code="500" />
      <ErrorTile bg="var(--sc-error-light)">
        {/* Server / cloud broken SVG */}
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none"
          stroke="var(--sc-error)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth={2.5} />
          <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth={2.5} />
          {/* X mark on right side of top server */}
          <line x1="14" y1="4.5" x2="18" y2="7.5" />
          <line x1="18" y1="4.5" x2="14" y2="7.5" />
        </svg>
      </ErrorTile>

      <ErrorText
        headline="Something Went Wrong"
        subtext={message || "Our servers hit a snag. This is on us — please try again in a moment."}
      />

      <Actions
        onRetry={handleRetry}
        retryLabel="Retry"
        spinning={spinning}
        onAction={onAction}
        actionLabel={actionLabel}
      />
    </ErrorShell>
  );
}


/* ── 3. NOT FOUND — 404 ───────────────────────────────────── */
export function NotFoundError({
  onRetry,
  onAction,
  actionLabel = 'Go Home',
  message,
}) {
  return (
    <ErrorShell>
      <ErrorCode code="404" />
      <ErrorTile bg="var(--sc-warning-light)">
        {/* Search / question mark SVG */}
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none"
          stroke="var(--sc-warning)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 8a2 2 0 0 1 2 2c0 1.1-.9 1.5-1.5 2S11 13 11 14" strokeWidth={1.8} />
          <circle cx="11" cy="16.5" r="0.7" fill="var(--sc-warning)" stroke="none" />
        </svg>
      </ErrorTile>

      <ErrorText
        headline="Page Not Found"
        subtext={message || "We couldn't find what you were looking for. It may have moved or been removed."}
      />

      <Actions
        onRetry={onRetry}
        retryLabel="Try Again"
        spinning={false}
        onAction={onAction}
        actionLabel={actionLabel}
      />
    </ErrorShell>
  );
}


/* ── 4. PERMISSION ERROR — 401 / 403 ─────────────────────── */
export function PermissionError({
  onRetry,
  onAction,
  actionLabel = 'Log In',
  message,
}) {
  return (
    <ErrorShell>
      <ErrorCode code="403" />
      <ErrorTile bg="var(--sc-ai-light)">
        {/* Lock SVG */}
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none"
          stroke="var(--sc-ai)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <circle cx="12" cy="16" r="1.2" fill="var(--sc-ai)" stroke="none" />
        </svg>
      </ErrorTile>

      <ErrorText
        headline="Access Restricted"
        subtext={message || "You don't have permission to view this. Log in or check your account."}
      />

      <Actions
        onRetry={onRetry}
        retryLabel="Try Again"
        spinning={false}
        onAction={onAction}
        actionLabel={actionLabel}
      />
    </ErrorShell>
  );
}


/* ── 5. IDEA LOAD ERROR — Feed or detail failed ───────────── */
export function IdeaLoadError({
  onRetry,
  onAction,
  actionLabel = 'Browse All',
  message,
}) {
  const [spinning, setSpinning] = useState(false);

  function handleRetry() {
    if (!onRetry) return;
    setSpinning(true);
    setTimeout(() => setSpinning(false), 1500);
    onRetry();
  }

  return (
    <ErrorShell>
      <ErrorTile bg="var(--sc-primary-50)">
        {/* Broken lightbulb SVG */}
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none"
          stroke="var(--sc-primary-400)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 1 5 11.93V18H7v-4.07A7 7 0 0 1 12 2z" />
          {/* crack line */}
          <path d="M12 7 l-1.5 3 l2 0 l-1.5 3" stroke="var(--sc-error)" strokeWidth={1.8} />
        </svg>
      </ErrorTile>

      <ErrorText
        headline="Ideas Couldn't Load"
        subtext={message || "We ran into a problem fetching ideas. A quick retry usually fixes this."}
      />

      <Actions
        onRetry={handleRetry}
        retryLabel="Reload Ideas"
        spinning={spinning}
        onAction={onAction}
        actionLabel={actionLabel}
      />
    </ErrorShell>
  );
}


/* ── 6. PROFILE LOAD ERROR ───────────────────────────────── */
export function ProfileLoadError({
  onRetry,
  onAction,
  actionLabel = 'Go Back',
  message,
}) {
  const [spinning, setSpinning] = useState(false);

  function handleRetry() {
    if (!onRetry) return;
    setSpinning(true);
    setTimeout(() => setSpinning(false), 1500);
    onRetry();
  }

  return (
    <ErrorShell>
      <ErrorTile bg="var(--sc-neutral-100)">
        {/* Broken user SVG */}
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none"
          stroke="var(--sc-neutral-500)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          {/* small X badge */}
          <circle cx="18" cy="4" r="3.5" fill="var(--sc-error-light)" stroke="var(--sc-error)" strokeWidth={1.4} />
          <line x1="16.8" y1="2.8" x2="19.2" y2="5.2" stroke="var(--sc-error)" strokeWidth={1.4} />
          <line x1="19.2" y1="2.8" x2="16.8" y2="5.2" stroke="var(--sc-error)" strokeWidth={1.4} />
        </svg>
      </ErrorTile>

      <ErrorText
        headline="Profile Unavailable"
        subtext={message || "We couldn't load this profile right now. Try again or come back shortly."}
      />

      <Actions
        onRetry={handleRetry}
        retryLabel="Retry"
        spinning={spinning}
        onAction={onAction}
        actionLabel={actionLabel}
      />
    </ErrorShell>
  );
}


/* ── 7. UPLOAD ERROR — Image / file upload failed ─────────── */
export function UploadError({
  onRetry,
  onAction,
  actionLabel = 'Choose Different File',
  message,
}) {
  return (
    <ErrorShell minHeight={200}>
      <ErrorTile bg="var(--sc-error-light)" size={80}>
        {/* Upload with X SVG */}
        <svg width={34} height={34} viewBox="0 0 24 24" fill="none"
          stroke="var(--sc-error)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          <line x1="17" y1="17" x2="22" y2="22" stroke="var(--sc-error)" strokeWidth={2} />
        </svg>
      </ErrorTile>

      <ErrorText
        headline="Upload Failed"
        subtext={message || "The file couldn't be uploaded. Check the file size and format, then try again."}
      />

      <Actions
        onRetry={onRetry}
        retryLabel="Try Again"
        spinning={false}
        onAction={onAction}
        actionLabel={actionLabel}
      />
    </ErrorShell>
  );
}


/* ── 8. AI ERROR — Generation / suggestion failed ─────────── */
export function AIError({
  onRetry,
  onAction,
  actionLabel = 'Skip AI',
  message,
}) {
  const [spinning, setSpinning] = useState(false);

  function handleRetry() {
    if (!onRetry) return;
    setSpinning(true);
    setTimeout(() => setSpinning(false), 2000);
    onRetry();
  }

  return (
    <ErrorShell minHeight={240}>
      <ErrorTile bg="var(--sc-ai-light)">
        {/* Sparkle / AI with broken state SVG */}
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none"
          stroke="var(--sc-ai)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          {/* Sparkle paths */}
          <path d="M12 2l1.8 5.4L19.2 9l-5.4 1.8L12 16l-1.8-5.4L4.8 9l5.4-1.8L12 2z" />
          {/* Small error indicator */}
          <circle cx="19" cy="18" r="3" fill="var(--sc-error-light)" stroke="var(--sc-error)" strokeWidth={1.4} />
          <line x1="17.9" y1="16.9" x2="20.1" y2="19.1" stroke="var(--sc-error)" strokeWidth={1.4} />
          <line x1="20.1" y1="16.9" x2="17.9" y2="19.1" stroke="var(--sc-error)" strokeWidth={1.4} />
        </svg>
      </ErrorTile>

      {/* AI-specific purple code badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        borderRadius: 'var(--sc-radius-full)',
        background: 'var(--sc-ai-light)',
        border: '1px solid rgba(124,58,237,0.18)',
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'var(--sc-font-mono)',
        color: 'var(--sc-ai)',
        letterSpacing: '0.04em',
        marginBottom: 14,
      }}>
        AI Unavailable
      </div>

      <ErrorText
        headline="AI Couldn't Generate"
        subtext={message || "The AI ran into an issue. Try again or continue without suggestions."}
      />

      <Actions
        onRetry={handleRetry}
        retryLabel="Regenerate"
        spinning={spinning}
        onAction={onAction}
        actionLabel={actionLabel}
      />
    </ErrorShell>
  );
}


/* ── 9. VALIDATION ERROR — Inline field error ─────────────── */
export function ValidationError({ error, field }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        marginTop: 6,
        animation: 'sc-slide-up 200ms ease both',
      }}
    >
      {/* Exclamation circle */}
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
        stroke="var(--sc-error)" strokeWidth={2} strokeLinecap="round"
        style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span style={{
        fontSize: 12,
        color: 'var(--sc-error)',
        fontFamily: 'var(--sc-font-body)',
        lineHeight: 1.5,
        fontWeight: 500,
      }}>
        {error}
      </span>
    </div>
  );
}


/* ── 10. FORM ERROR — Full form submission error banner ────── */
export function FormError({ errors = [], message }) {
  const items = errors.length > 0 ? errors : (message ? [message] : []);
  if (items.length === 0) return null;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 'var(--sc-radius-lg)',
        background: 'var(--sc-error-light)',
        border: '1px solid rgba(239,68,68,0.22)',
        marginBottom: 20,
        animation: 'sc-slide-up 250ms ease both',
      }}
    >
      {/* Alert triangle */}
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
        stroke="var(--sc-error)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 1 }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>

      <div style={{ flex: 1, textAlign: 'left' }}>
        <p style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--sc-error-dark)',
          fontFamily: 'var(--sc-font-display)',
          margin: '0 0 4px',
        }}>
          {items.length === 1 ? 'Please fix the following:' : `${items.length} issues to fix:`}
        </p>

        {items.length === 1 ? (
          <p style={{
            fontSize: 12,
            color: 'var(--sc-error)',
            fontFamily: 'var(--sc-font-body)',
            margin: 0,
            lineHeight: 1.5,
          }}>
            {items[0]}
          </p>
        ) : (
          <ul style={{
            margin: 0,
            padding: '0 0 0 16px',
            listStyle: 'disc',
          }}>
            {items.map((err, i) => (
              <li key={i} style={{
                fontSize: 12,
                color: 'var(--sc-error)',
                fontFamily: 'var(--sc-font-body)',
                lineHeight: 1.6,
              }}>
                {err}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
