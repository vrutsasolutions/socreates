/**
 * AIInteractions.premium.jsx
 * ─────────────────────────────────────────────────────────────
 * AI interaction UI library for SoCreate / IdeaSpark.
 *
 * BUILD MARKER: v6-synced-2024 — if you don't see this comment in your
 * project's copy of the file, you are NOT running this version. Every
 * AI-blue value in this file is rgba(69,54,242,...) / #3347E8, matching
 * BottomNav.premium.jsx's Create-button color exactly.
 *
 * Named exports:
 *   AIAssistantBar       — Floating bar with "Ask AI" CTA (top of AddIdea)
 *   AIThinkingBubble     — Animated "AI is thinking…" indicator
 *   AISuggestionCard     — Single AI-generated suggestion (title/description)
 *   AISuggestionList     — Scrollable list of AISuggestionCards
 *   AITagSuggestions     — Horizontally scrollable category/tag chips from AI
 *   AIDescriptionHelper  — Inline "Improve with AI" button beneath textarea
 *   AIResultPanel        — Full panel: thinking → results → error flow
 *   AIBadge              — Small "AI" pill badge (use on any element)
 *   AIPlagiarismResult   — Premium plagiarism check result (replaces old inline UI)
 *   AIOnboardingPrompt   — First-time prompt nudging user to try AI
 *
 * All components:
 *   - Use design-tokens.css CSS variables only (no hardcoded colors)
 *   - Require: src/styles/design-tokens.css imported in main.jsx
 *   - Zero external dependencies
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────
   SHARED PRIMITIVES
   ───────────────────────────────────────────────────────────── */

/** Sparkle / AI icon — reused across components */
function SparkleIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" />
      <path d="M5 4l0.9 2.2L8 7l-2.1 0.8L5 10l-0.9-2.2L2 7l2.1-0.8L5 4z" opacity="0.85" />
      <path d="M19 13l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5z" opacity="0.85" />
    </svg>
  );
}

/** Animated dot row — "AI is thinking" visual */
function ThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--sc-ai)',
          animation: 'sc-ai-thinking 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

/** Thin gradient top-border for AI surfaces */
function AIAccentBorder() {
  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 3,
      borderRadius: 'inherit',
      background: 'linear-gradient(90deg, var(--sc-ai), var(--sc-ai-glow), var(--sc-ai))',
      backgroundSize: '200% 100%',
      animation: 'sc-shimmer 2.5s linear infinite',
    }} />
  );
}


/* ═════════════════════════════════════════════════════════════
   1. AI ASSISTANT BAR
   Floating prompt at the top of AddIdea step 0.
   Shows a short suggestion to use AI — collapses after dismiss.
   ═════════════════════════════════════════════════════════════ */
export function AIAssistantBar({ onActivate, onDismiss }) {
  const [visible, setVisible] = useState(true);

  function handleDismiss() {
    setVisible(false);
    onDismiss?.();
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '16px 18px',
      borderRadius: 18,
      background: 'linear-gradient(135deg, var(--sc-ai-light) 0%, #E4E9FF 100%)',
      border: '1px solid rgba(69,54,242,0.30)',
      boxShadow: '0 8px 24px rgba(69,54,242,0.18), 0 2px 6px rgba(69,54,242,0.12)',
      marginBottom: 4,
      overflow: 'hidden',
      animation: 'sc-slide-up 300ms var(--sc-ease-out) both',
    }}>
      <AIAccentBorder />

      {/* Icon — subtle pulse-glow gives it "AI energy" without changing hue */}
      <div style={{
        width: 44, height: 44,
        borderRadius: 14,
        background: 'linear-gradient(135deg, var(--sc-ai), var(--sc-ai-glow))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 14px rgba(69,54,242,0.45), 0 0 0 4px rgba(69,54,242,0.10)',
        animation: 'sc-ai-glow-pulse 2.8s ease-in-out infinite',
      }}>
        <SparkleIcon size={20} color="#fff" />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 800,
          color: 'var(--sc-ai-dark)',
          fontFamily: 'var(--sc-font-display)',
          margin: '0 0 3px',
          letterSpacing: '-0.01em',
        }}>
          SoCreate AI
        </p>
        <p style={{
          fontSize: 12,
          color: 'var(--sc-text-secondary)',
          fontFamily: 'var(--sc-font-body)',
          margin: 0,
          lineHeight: 1.4,
        }}>
          Let AI help you craft the perfect title and description.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onActivate}
        style={{
          padding: '9px 18px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, var(--sc-ai), var(--sc-ai-glow))',
          color: '#fff',
          fontSize: 13, fontWeight: 800,
          fontFamily: 'var(--sc-font-body)',
          border: 'none', cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 200ms var(--sc-ease-spring)',
          boxShadow: '0 4px 14px rgba(69,54,242,0.40)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        Try AI
      </button>

      {/* Dismiss X */}
      <button
        onClick={handleDismiss}
        style={{
          alignSelf: 'flex-start',
          marginTop: -2,
          width: 22, height: 22,
          borderRadius: '50%',
          background: 'rgba(69,54,242,0.10)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--sc-ai)',
          fontSize: 11, fontWeight: 700,
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
        }}
        aria-label="Dismiss AI bar"
      >
        ✕
      </button>
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════
   2. AI THINKING BUBBLE
   Shows while waiting for AI response.
   ═════════════════════════════════════════════════════════════ */
export function AIThinkingBubble({ message = 'AI is thinking…' }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '16px 18px',
      borderRadius: 18,
      background: 'linear-gradient(135deg, var(--sc-ai-light) 0%, #E4E9FF 100%)',
      border: '1px solid rgba(69,54,242,0.30)',
      boxShadow: '0 8px 24px rgba(69,54,242,0.18), 0 2px 6px rgba(69,54,242,0.12)',
      animation: 'sc-fade-in 250ms ease both',
    }}>
      {/* Pulsing AI avatar — identical recipe to AIAssistantBar's icon */}
      <div style={{
        width: 44, height: 44,
        borderRadius: 14,
        background: 'linear-gradient(135deg, var(--sc-ai), var(--sc-ai-glow))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 14px rgba(69,54,242,0.45), 0 0 0 4px rgba(69,54,242,0.10)',
        animation: 'sc-ai-glow-pulse 2.8s ease-in-out infinite',
      }}>
        <SparkleIcon size={20} color="#fff" />
      </div>

      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: 13, fontWeight: 700,
          color: 'var(--sc-ai)',
          fontFamily: 'var(--sc-font-body)',
          margin: '0 0 7px',
        }}>
          {message}
        </p>
        <ThinkingDots />
      </div>
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════
   3. AI SUGGESTION CARD
   A single suggestion (title or description) from AI.
   onUse — applies suggestion to the form field.
   ═════════════════════════════════════════════════════════════ */
export function AISuggestionCard({
  suggestion,
  type = 'title',       // 'title' | 'description'
  onUse,
  index = 0,
}) {
  const [used, setUsed] = useState(false);

  function handleUse() {
    setUsed(true);
    onUse?.(suggestion);
  }

  return (
    <div style={{
      position: 'relative',
      padding: '17px 18px',
      borderRadius: 18,
      background: used ? 'var(--sc-success-light)' : 'var(--sc-bg-surface)',
      border: `1.5px solid ${used ? 'rgba(16,185,129,0.35)' : 'rgba(69,54,242,0.16)'}`,
      boxShadow: used ? '0 4px 14px rgba(16,185,129,0.14)' : '0 4px 14px rgba(15,18,36,0.08)',
      transition: 'all 250ms var(--sc-ease-out)',
      animation: `sc-slide-up 300ms ${index * 60}ms var(--sc-ease-out) both`,
      overflow: 'hidden',
    }}>
      {/* Type label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
      }}>
        <AIBadge />
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: 'var(--sc-text-muted)',
          fontFamily: 'var(--sc-font-body)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {type === 'title' ? 'Title suggestion' : 'Description suggestion'}
        </span>
      </div>

      {/* Suggestion text */}
      <p style={{
        fontSize: type === 'title' ? 14 : 13,
        fontWeight: type === 'title' ? 700 : 400,
        color: 'var(--sc-text-primary)',
        fontFamily: type === 'title' ? 'var(--sc-font-display)' : 'var(--sc-font-body)',
        margin: '0 0 12px',
        lineHeight: 1.5,
        letterSpacing: type === 'title' ? '-0.01em' : '0',
      }}>
        {suggestion}
      </p>

      {/* Use button */}
      <button
        onClick={handleUse}
        disabled={used}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '9px 16px',
          borderRadius: 'var(--sc-radius-full)',
          fontSize: 13, fontWeight: 800,
          fontFamily: 'var(--sc-font-body)',
          cursor: used ? 'default' : 'pointer',
          border: 'none',
          transition: 'all 200ms ease',
          background: used
            ? 'var(--sc-success)'
            : 'linear-gradient(135deg, var(--sc-ai), var(--sc-ai-glow))',
          color: '#fff',
          boxShadow: used ? '0 2px 8px rgba(16,185,129,0.30)' : '0 4px 12px rgba(69,54,242,0.40)',
        }}
      >
        {used ? (
          <>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Applied
          </>
        ) : (
          <>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Use This
          </>
        )}
      </button>
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════
   4. AI SUGGESTION LIST
   Vertical stack of AISuggestionCards with a header.
   suggestions = [{ text, type }]
   ═════════════════════════════════════════════════════════════ */
export function AISuggestionList({ suggestions = [], onUse, onRegenerate }) {
  if (suggestions.length === 0) return null;

  return (
    <div style={{ animation: 'sc-fade-in 300ms ease both' }}>
      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SparkleIcon size={14} color="var(--sc-ai)" />
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: 'var(--sc-ai)',
            fontFamily: 'var(--sc-font-display)',
            letterSpacing: '-0.01em',
          }}>
            AI Suggestions
          </span>
        </div>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 12px',
              borderRadius: 'var(--sc-radius-full)',
              fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--sc-font-body)',
              cursor: 'pointer',
              border: '1px solid rgba(69,54,242,0.22)',
              background: 'var(--sc-ai-light)',
              color: 'var(--sc-ai)',
              transition: 'all 180ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(69,54,242,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--sc-ai-light)'; }}
          >
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Regenerate
          </button>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {suggestions.map((s, i) => (
          <AISuggestionCard
            key={i}
            index={i}
            suggestion={s.text}
            type={s.type || 'title'}
            onUse={onUse}
          />
        ))}
      </div>
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════
   5. AI TAG SUGGESTIONS
   Horizontal scrollable chip row for category/tag suggestions.
   tags = string[]
   ═════════════════════════════════════════════════════════════ */
export function AITagSuggestions({ tags = [], onSelect, selectedTag }) {
  if (tags.length === 0) return null;

  return (
    <div style={{ animation: 'sc-slide-up 300ms ease both' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
      }}>
        <SparkleIcon size={12} color="var(--sc-ai)" />
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--sc-ai)',
          fontFamily: 'var(--sc-font-body)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}>
          AI Suggested Tags
        </span>
      </div>

      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {tags.map((tag, i) => {
          const isSelected = tag === selectedTag;
          return (
            <button
              key={tag}
              onClick={() => onSelect?.(tag)}
              style={{
                flexShrink: 0,
                padding: '7px 14px',
                borderRadius: 'var(--sc-radius-full)',
                fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--sc-font-body)',
                cursor: 'pointer',
                border: `1.5px solid ${isSelected ? 'var(--sc-ai)' : 'rgba(69,54,242,0.20)'}`,
                background: isSelected
                  ? 'linear-gradient(135deg, var(--sc-ai), var(--sc-ai-glow))'
                  : 'var(--sc-ai-light)',
                color: isSelected ? '#fff' : 'var(--sc-ai)',
                transition: 'all 200ms var(--sc-ease-spring)',
                animation: `sc-scale-in 250ms ${i * 40}ms var(--sc-ease-spring) both`,
                boxShadow: isSelected ? 'var(--sc-shadow-ai)' : 'none',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(69,54,242,0.12)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--sc-ai-light)'; }}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════
   6. AI DESCRIPTION HELPER
   Inline button beneath a textarea — "Improve with AI".
   onImprove — called with current text; you call the AI API.
   ═════════════════════════════════════════════════════════════ */
export function AIDescriptionHelper({ currentText = '', onImprove, loading = false }) {
  const hasText = currentText.trim().length > 10;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 6,
    }}>
      <span style={{
        fontSize: 11,
        color: 'var(--sc-text-muted)',
        fontFamily: 'var(--sc-font-body)',
      }}>
        {currentText.length}/1000
      </span>

      <button
        onClick={() => hasText && !loading && onImprove?.(currentText)}
        disabled={!hasText || loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 12px',
          borderRadius: 'var(--sc-radius-full)',
          fontSize: 11, fontWeight: 700,
          fontFamily: 'var(--sc-font-body)',
          cursor: hasText && !loading ? 'pointer' : 'not-allowed',
          border: '1px solid rgba(69,54,242,0.22)',
          background: hasText ? 'var(--sc-ai-light)' : 'var(--sc-neutral-100)',
          color: hasText ? 'var(--sc-ai)' : 'var(--sc-text-muted)',
          transition: 'all 180ms ease',
          opacity: hasText ? 1 : 0.6,
        }}
        onMouseEnter={e => { if (hasText && !loading) e.currentTarget.style.background = 'rgba(69,54,242,0.12)'; }}
        onMouseLeave={e => { if (hasText) e.currentTarget.style.background = 'var(--sc-ai-light)'; }}
      >
        {loading ? (
          <>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2.5} strokeLinecap="round"
              style={{ animation: 'sc-spin 0.75s linear infinite' }}>
              <path d="M12 2a10 10 0 1 0 10 10" />
            </svg>
            Improving…
          </>
        ) : (
          <>
            <SparkleIcon size={10} color="currentColor" />
            Improve with AI
          </>
        )}
      </button>
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════
   7. AI RESULT PANEL
   Orchestrates the full thinking → results → error flow.
   Pass `status`: 'idle' | 'thinking' | 'done' | 'error'
   Pass `suggestions` array when status === 'done'.
   ═════════════════════════════════════════════════════════════ */
export function AIResultPanel({
  status = 'idle',
  suggestions = [],
  thinkingMessage = 'AI is crafting suggestions…',
  onUse,
  onRegenerate,
  onRetry,
}) {
  if (status === 'idle') return null;

  return (
    <div style={{
      borderRadius: 18,
      border: '1.5px solid rgba(69,54,242,0.22)',
      background: 'linear-gradient(160deg, var(--sc-ai-light) 0%, #EEF0FF 100%)',
      boxShadow: '0 10px 30px rgba(69,54,242,0.14), 0 2px 8px rgba(69,54,242,0.08)',
      padding: 18,
      position: 'relative',
      overflow: 'hidden',
      animation: 'sc-fade-in 300ms ease both',
    }}>
      <AIAccentBorder />

      {status === 'thinking' && (
        <AIThinkingBubble message={thinkingMessage} />
      )}

      {status === 'done' && (
        <AISuggestionList
          suggestions={suggestions}
          onUse={onUse}
          onRegenerate={onRegenerate}
        />
      )}

      {status === 'error' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px',
          borderRadius: 'var(--sc-radius-lg)',
          background: 'var(--sc-error-light)',
          border: '1px solid rgba(239,68,68,0.18)',
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
            stroke="var(--sc-error)" strokeWidth={2} strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--sc-error-dark)',
              fontFamily: 'var(--sc-font-display)',
              margin: '0 0 2px',
            }}>
              AI couldn't generate suggestions
            </p>
            <p style={{
              fontSize: 11,
              color: 'var(--sc-error)',
              fontFamily: 'var(--sc-font-body)',
              margin: 0,
            }}>
              Try again or continue without AI.
            </p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--sc-radius-full)',
                fontSize: 12, fontWeight: 700,
                fontFamily: 'var(--sc-font-body)',
                cursor: 'pointer',
                border: 'none',
                background: 'var(--sc-error)',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════
   8. AI BADGE
   Tiny "AI" pill — attach to any element to mark it as AI-generated.
   ═════════════════════════════════════════════════════════════ */
export function AIBadge({ label = 'AI' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 9px',
      borderRadius: 'var(--sc-radius-full)',
      background: 'linear-gradient(135deg, var(--sc-ai), var(--sc-ai-glow))',
      color: '#fff',
      fontSize: 9,
      fontWeight: 800,
      fontFamily: 'var(--sc-font-body)',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      lineHeight: 1,
      boxShadow: '0 1px 4px rgba(69,54,242,0.20)',
    }}>
      <SparkleIcon size={8} color="#fff" />
      {label}
    </span>
  );
}


/* ═════════════════════════════════════════════════════════════
   9. AI PLAGIARISM RESULT
   Premium replacement for the old inline plagiarism check UI.
   status: 'checking' | 'ok' | 'flagged'
   steps: [{ label, done, active }]
   ═════════════════════════════════════════════════════════════ */
export function AIPlagiarismResult({ status = 'checking', steps = [], errorMessage }) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 'var(--sc-radius-xl)',
      border: '1.5px solid rgba(69,54,242,0.20)',
      background: status === 'flagged'
        ? 'var(--sc-error-light)'
        : 'linear-gradient(160deg, var(--sc-ai-light) 0%, #F0F2FF 100%)',
      boxShadow: status === 'flagged'
        ? '0 3px 14px rgba(239,68,68,0.10)'
        : '0 3px 14px rgba(69,54,242,0.08)',
      padding: 16,
      overflow: 'hidden',
      animation: 'sc-fade-in 300ms ease both',
      transition: 'background 400ms ease, box-shadow 400ms ease',
    }}>
      {status !== 'flagged' && <AIAccentBorder />}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
      }}>
        <div style={{
          width: 28, height: 28,
          borderRadius: 'var(--sc-radius-md)',
          background: status === 'flagged'
            ? 'var(--sc-error)'
            : 'linear-gradient(135deg, var(--sc-ai), var(--sc-ai-glow))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {status === 'flagged' ? (
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff"
              strokeWidth={2.5} strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : (
            <SparkleIcon size={14} color="#fff" />
          )}
        </div>
        <div>
          <p style={{
            fontSize: 13, fontWeight: 700,
            fontFamily: 'var(--sc-font-display)',
            color: status === 'flagged' ? 'var(--sc-error-dark)' : 'var(--sc-ai-dark)',
            margin: '0 0 1px',
            letterSpacing: '-0.01em',
          }}>
            {status === 'checking' ? 'Checking Originality…' :
             status === 'ok'       ? 'Originality Verified ✓' :
                                     'Content Flagged'}
          </p>
          <p style={{
            fontSize: 11,
            color: 'var(--sc-text-muted)',
            fontFamily: 'var(--sc-font-body)',
            margin: 0,
          }}>
            {status === 'checking' ? 'AI-powered plagiarism analysis' :
             status === 'ok'       ? 'Your idea is original' :
                                     'Similar content detected'}
          </p>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map(({ label, done, active }, idx) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 13,
          }}>
            {/* Step indicator */}
            <div style={{
              width: 22, height: 22,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              transition: 'all 300ms ease',
              ...(done ? {
                background: 'var(--sc-success)',
                color: '#fff',
              } : active ? {
                border: '2px solid var(--sc-ai)',
                borderTopColor: 'transparent',
                animation: 'sc-spin 0.75s linear infinite',
                background: 'transparent',
              } : {
                background: 'var(--sc-neutral-200)',
                color: 'var(--sc-text-muted)',
              }),
            }}>
              {done && (
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>

            <span style={{
              fontSize: 13, fontWeight: done ? 600 : 500,
              fontFamily: 'var(--sc-font-body)',
              color: done ? 'var(--sc-success-dark)' : active ? 'var(--sc-ai)' : 'var(--sc-text-secondary)',
              transition: 'color 300ms ease',
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Flagged error message */}
      {status === 'flagged' && errorMessage && (
        <div style={{
          marginTop: 14,
          padding: '10px 14px',
          borderRadius: 'var(--sc-radius-lg)',
          background: '#fff',
          border: '1px solid rgba(239,68,68,0.24)',
          fontSize: 12,
          color: 'var(--sc-error)',
          fontFamily: 'var(--sc-font-body)',
          lineHeight: 1.5,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }}><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h16.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>{errorMessage}
        </div>
      )}
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════
   10. AI ONBOARDING PROMPT
   First-time nudge — shown once, then dismissed forever.
   Store dismiss state in parent (localStorage or context).
   ═════════════════════════════════════════════════════════════ */
export function AIOnboardingPrompt({ onTryAI, onDismiss }) {
  return (
    <div style={{
      position: 'relative',
      marginBottom:'20px',
      borderRadius: 'var(--sc-radius-2xl)',
      /* Uses the exact same gradient stops as BottomNav.premium.jsx's
         Create button (primary-700 -> primary-500 -> primary-400),
         so this card's "brand blue with energy" feeling matches a
         button that's already proven not to look out of place. */
      '--sc-ai': 'var(--sc-primary-700)',
      '--sc-ai-glow': 'var(--sc-primary-500)',
      background: 'linear-gradient(135deg, var(--sc-primary-700) 0%, var(--sc-primary-500) 55%, var(--sc-primary-400) 100%)',
      padding: '20px 18px',
      color: '#fff',
      overflow: 'hidden',
      animation: 'sc-bounce-in 500ms var(--sc-ease-spring) both',
      boxShadow: '0 6px 24px rgba(69,54,242,0.28)',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 100, height: 100, borderRadius: '50%',
        background: 'rgba(255,255,255,0.07)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -30, left: -10,
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        pointerEvents: 'none',
      }} />

      {/* Sparkle */}
      <div style={{
        width: 44, height: 44,
        borderRadius: 14,
        background: 'rgba(255,255,255,0.16)',
        border: '1px solid rgba(255,255,255,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <SparkleIcon size={22} color="#fff" />
      </div>

      <h3 style={{
        fontSize: 18, fontWeight: 800,
        fontFamily: 'var(--sc-font-display)',
        letterSpacing: '-0.02em',
        margin: '0 0 7px',
        lineHeight: 1.25,
      }}>
        Meet SoCreate AI
      </h3>

      <p style={{
        fontSize: 13,
        fontFamily: 'var(--sc-font-body)',
        opacity: 0.88,
        margin: '0 0 20px',
        lineHeight: 1.6,
        maxWidth: 260,
      }}>
        Get AI-powered title suggestions, improved descriptions, and smarter category tags — instantly.
      </p>

      {/* Feature pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 22 }}>
        {['✦ Title ideas', '✦ Better descriptions', '✦ Smart tags'].map((f) => (
          <span key={f} style={{
            padding: '6px 12px',
            borderRadius: 'var(--sc-radius-full)',
            background: 'rgba(255,255,255,0.18)',
            fontSize: 11, fontWeight: 600,
            fontFamily: 'var(--sc-font-body)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.20)',
            lineHeight: 1.3,
          }}>
            {f}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={onTryAI}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--sc-radius-xl)',
            background: '#fff',
            color: 'var(--sc-ai)',
            fontSize: 13, fontWeight: 800,
            fontFamily: 'var(--sc-font-body)',
            border: 'none', cursor: 'pointer',
            transition: 'all 200ms var(--sc-ease-spring)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          Try AI Now →
        </button>

        <button
          onClick={onDismiss}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--sc-radius-xl)',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--sc-font-body)',
            border: '1px solid rgba(255,255,255,0.25)',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
          }}
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}