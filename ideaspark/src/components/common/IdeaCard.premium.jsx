/**
 * IdeaCard.premium.jsx
 * ─────────────────────────────────────────────────────────────
 * DROP-IN REPLACEMENT for IdeaCard.jsx — same props, richer UI.
 *
 * Usage (in Home.jsx, SavedIdeas.jsx, etc.):
 *   import IdeaCard from './IdeaCard.premium';
 *
 * Requires: src/styles/design-tokens.css imported in main.jsx
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useRef } from 'react';
import { createPortal }     from 'react-dom';
import { useNavigate }      from 'react-router-dom';
import { useAuth }          from '../../context/AuthContext';
import api                  from '../../api/axiosInstance';
import { AIBadge } from './AIInteractions.premium';
import SharePostSheet from './SharePostSheet';
import { ideaImages } from './ImageGallery';
import { CATEGORY_COLORS, defaultColor, IdeaIcon } from './categoryIcons';

/* ── Helpers ─────────────────────────────────────────────── */
function formatDate(dateString) {
  if (!dateString) return '';
  const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const AVATAR_PALETTES = [
  { bg: '#EEF0FF', text: '#1A28A0' },
  { bg: '#ECFDF5', text: '#065F46' },
  { bg: '#FFFBEB', text: '#92400E' },
  { bg: '#F5F0FF', text: '#4C1D95' },
  { bg: '#FEF2F2', text: '#991B1B' },
  { bg: '#EFF6FF', text: '#1E3A8A' },
];
function avatarPalette(name = '') {
  const idx = name.charCodeAt(0) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx] || AVATAR_PALETTES[0];
}

/* ── Skeleton ────────────────────────────────────────────── */
export function IdeaCardSkeleton({ variant = 'card' } = {}) {
  if (variant === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="sc-skeleton sc-skeleton-avatar" style={{ width: 22, height: 22, borderRadius: 7 }} />
          <div className="sc-skeleton sc-skeleton-text" style={{ width: '40%' }} />
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div className="sc-skeleton sc-skeleton-title" style={{ width: '95%', marginBottom: 7 }} />
            <div className="sc-skeleton sc-skeleton-title" style={{ width: '70%', marginBottom: 12 }} />
            <div className="sc-skeleton sc-skeleton-text" style={{ width: '100%', marginBottom: 5 }} />
            <div className="sc-skeleton sc-skeleton-text" style={{ width: '80%' }} />
          </div>
          <div className="sc-skeleton" style={{ width: 96, height: 96, borderRadius: 10, flexShrink: 0 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="sc-skeleton sc-skeleton-text" style={{ width: 120 }} />
          <div className="sc-skeleton sc-skeleton-text" style={{ width: 24 }} />
        </div>
      </div>
    );
  }
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #F0F2F8',
      borderRadius: 18,
      overflow: 'hidden',
    }}>
      <div className="sc-skeleton sc-skeleton-image" />
      <div style={{ padding: '12px 12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div className="sc-skeleton sc-skeleton-avatar" style={{ width: 24, height: 24, borderRadius: 8 }} />
          <div className="sc-skeleton sc-skeleton-text" style={{ width: '55%' }} />
          <div className="sc-skeleton sc-skeleton-text" style={{ width: '20%', marginLeft: 'auto' }} />
        </div>
        <div className="sc-skeleton sc-skeleton-title" style={{ width: '90%', marginBottom: 6 }} />
        <div className="sc-skeleton sc-skeleton-title" style={{ width: '65%', marginBottom: 10 }} />
        <div className="sc-skeleton sc-skeleton-text" style={{ width: '100%', marginBottom: 5 }} />
        <div className="sc-skeleton sc-skeleton-text" style={{ width: '80%', marginBottom: 14 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="sc-skeleton sc-skeleton-text" style={{ width: 40 }} />
          <div className="sc-skeleton sc-skeleton-text" style={{ width: 48 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Main card ───────────────────────────────────────────── */
export default function IdeaCard({ idea, onSaveToggle, variant = 'card' }) {
  const navigate        = useNavigate();
  const { user }        = useAuth();
  // Premium ideas are only obscured until the viewer holds a membership.
  const locked          = idea.isPremium && !user?.isPremium;
  const [saved,  setSaved]  = useState(idea.savedByCurrentUser ?? false);
  const [likes,  setLikes]  = useState(idea.likeCount || 0);
  const [liked,  setLiked]  = useState(idea.likedByCurrentUser ?? false);
  const [saving, setSaving] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const saveRef = useRef(false);

  const catColor  = CATEGORY_COLORS[idea.category] || defaultColor;
  const avPalette = avatarPalette(idea.creatorName);
  const images    = ideaImages(idea);

  const handleSave = async (e) => {
    e.stopPropagation();
    if (saving || saveRef.current) return;
    saveRef.current = true;
    setSaving(true);
    try {
      saved
        ? await api.delete(`/ideas/${idea.id}/save`)
        : await api.post(`/ideas/${idea.id}/save`);
      setSaved(s => !s);
      onSaveToggle?.(idea.id, !saved);
    } catch (_) {}
    setSaving(false);
    saveRef.current = false;
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes(l => wasLiked ? l - 1 : l + 1);
    try {
      wasLiked
        ? await api.delete(`/ideas/${idea.id}/like`)
        : await api.post(`/ideas/${idea.id}/like`);
    } catch (_) {
      setLiked(wasLiked);
      setLikes(l => wasLiked ? l + 1 : l - 1);
    }
  };

  const handleClick = () =>
    navigate(idea.isPremium ? `/premium/${idea.id}` : `/ideas/${idea.id}`);

  const handleCreatorClick = (e) => {
    e.stopPropagation();
    if (idea.creatorId) navigate(`/users/${idea.creatorId}`);
  };

  const handleComment = (e) => {
    e.stopPropagation();
    navigate(idea.isPremium ? `/premium/${idea.id}` : `/ideas/${idea.id}`);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    setShareOpen(true);
  };

  /* Shared actions row — identical colors/behavior across card & list layouts */
  const actionsRow = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>

        {/* Like */}
        <button
          onClick={handleLike}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: liked ? '#FEF2F2' : 'transparent',
            border: liked ? '1px solid #FCA5A5' : '1px solid transparent',
            borderRadius: 999,
            padding: '4px 7px',
            cursor: 'pointer',
            color: liked ? '#DC2626' : '#90A4AE',
            fontSize: 11, fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            transition: 'all 180ms cubic-bezier(0.34,1.56,0.64,1)',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label={liked ? 'Unlike idea' : 'Like idea'}
        >
          <span style={{
            display: 'inline-block',
            transform: likeAnim ? 'scale(1.45)' : 'scale(1)',
            transition: 'transform 350ms cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <HeartIcon filled={liked} size={13} />
          </span>
          <span>{likes}</span>
        </button>

        {/* Comment */}
        <button
          onClick={handleComment}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'transparent', border: '1px solid transparent',
            borderRadius: 999, padding: '4px 7px', cursor: 'pointer',
            color: '#90A4AE', fontSize: 11, fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="Comment on idea"
        >
          <CommentIcon size={13} />
          <span>{idea.commentCount ?? 0}</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'transparent', border: '1px solid transparent',
            borderRadius: 999, padding: '4px 7px', cursor: 'pointer',
            color: '#90A4AE', fontSize: 11, fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="Share idea"
        >
          <ShareIcon size={13} />
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: saved ? '#EEF4FF' : 'transparent',
          border: saved ? '1px solid #AEBCFF' : '1px solid transparent',
          borderRadius: 999,
          padding: '4px 7px',
          cursor: saving ? 'wait' : 'pointer',
          color: saved ? '#1565C0' : '#90A4AE',
          fontSize: 11, fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          transition: 'all 180ms cubic-bezier(0.34,1.56,0.64,1)',
          opacity: saving ? 0.6 : 1,
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={saved ? 'Unsave idea' : 'Save idea'}
      >
        <BookmarkIcon filled={saved} size={14} />
      </button>
    </div>
  );

  /* Share sheet + toast — shared portal/overlay, rendered by both layouts */
  const overlays = (
    <>
      {shareOpen && (
        <SharePostSheet
          post={idea}
          onClose={() => setShareOpen(false)}
          onToast={(m) => { setToast(m); setTimeout(() => setToast(null), 2600); }}
        />
      )}
      {toast && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 90,
            zIndex: 60, background: '#0D2137', color: '#fff',
            fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500,
            padding: '10px 18px', borderRadius: 999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            maxWidth: '90%', textAlign: 'center',
          }}
        >
          {toast}
        </div>,
        document.body,
      )}
    </>
  );

  /* ── List layout — Medium-style row (no card chrome, text left / thumbnail right) ── */
  if (variant === 'list') {
    const thumb = images.length > 0 && !imgErr ? (
      <img
        src={images[0]}
        alt={idea.title}
        onError={() => setImgErr(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    ) : (
      <div style={{
        width: '100%', height: '100%',
        background: `linear-gradient(145deg, ${catColor.bg} 0%, ${catColor.bg}cc 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IdeaIcon category={idea.category} color={catColor.dot} size={26} />
      </div>
    );

    return (
      <div
        onClick={handleClick}
        className="sc-animate-slide-up"
        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {/* Creator row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            onClick={handleCreatorClick}
            style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: idea.creatorId ? 'pointer' : 'default', minWidth: 0 }}
          >
          {idea.creatorImage ? (
            <img
              src={idea.creatorImage}
              alt={idea.creatorName || 'Creator'}
              style={{
                width: 22, height: 22, borderRadius: 7,
                objectFit: 'cover', flexShrink: 0, background: avPalette.bg,
              }}
            />
          ) : (
            <div style={{
              width: 22, height: 22, borderRadius: 7,
              background: avPalette.bg, color: avPalette.text,
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontFamily: 'Inter, sans-serif',
            }}>
              {idea.creatorName?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <span style={{
            fontSize: 12.5, color: '#546E7A', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            minWidth: 0, fontFamily: 'Inter, sans-serif',
          }}>
            {idea.creatorName}
          </span>
          </div>
          <span style={{ fontSize: 11, color: '#90A4AE', flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>
            · {formatDate(idea.createdAt)}
          </span>
          {idea.isPremium && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
              color: '#1a1200', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
              padding: '2px 7px', borderRadius: 999, flexShrink: 0,
            }}>
              <StarIcon size={8} />PRO
            </span>
          )}
        </div>

        {/* Title + description (left) and thumbnail (right) */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin: '0 0 6px',
              fontSize: 17, fontWeight: 800, color: '#0D2137',
              lineHeight: 1.3,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em',
            }}>
              {idea.title}
            </h3>
            <p style={{
              margin: 0,
              fontSize: 13.5, color: '#546E7A', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontFamily: 'Inter, sans-serif',
              ...(locked ? { filter: 'blur(3.5px)', userSelect: 'none', pointerEvents: 'none' } : {}),
            }}>
              {idea.description}
            </p>
          </div>

          <div style={{
            width: 96, height: 96, borderRadius: 10, overflow: 'hidden',
            background: '#F0F2F8', flexShrink: 0,
          }}>
            {thumb}
          </div>
        </div>

        {/* Actions */}
        {actionsRow}

        {overlays}
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="sc-card sc-animate-slide-up"
      style={{ cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      {/* Image / Thumbnail */}
      <div style={{
        position: 'relative',
        height: 148,
        background: '#F0F2F8',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {images.length > 0 && !imgErr ? (
          <>
          <img
            src={images[0]}
            alt={idea.title}
            onError={() => setImgErr(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 400ms cubic-bezier(0.34,1.56,0.64,1)',
            }}
            className="sc-card-img"
          />
          {images.length > 1 && (
            <span style={{
              position: 'absolute', bottom: 8, right: 8,
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              fontSize: 10, fontWeight: 600, padding: '2px 7px',
              borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4,
              pointerEvents: 'none',
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 15l5-5 4 4 3-3 6 6" />
              </svg>
              {images.length}
            </span>
          )}
          </>
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(145deg, ${catColor.bg} 0%, ${catColor.bg}cc 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 10,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', width: 120, height: 120, borderRadius: '50%',
              background: catColor.dot + '18', top: -30, right: -30, pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', width: 80, height: 80, borderRadius: '50%',
              background: catColor.dot + '10', bottom: -20, left: -20, pointerEvents: 'none',
            }} />
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: '#ffffff',
              boxShadow: `0 4px 16px ${catColor.dot}28, 0 1px 4px rgba(0,0,0,0.08)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <IdeaIcon category={idea.category} color={catColor.dot} size={26} />
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.07em',
              color: catColor.text,
              textTransform: 'uppercase',
              opacity: 0.85,
              fontFamily: 'Inter, sans-serif',
            }}>
              {idea.category || 'Idea'}
            </span>
          </div>
        )}

        {/* PRO badge */}
        {idea.isPremium && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
            color: '#1a1200',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
            padding: '3px 8px', borderRadius: 999,
            boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
          }}>
            <StarIcon size={9} />
            PRO
          </div>
        )}

        {/* Category pill */}
        {idea.category && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: catColor.bg,
            color: catColor.text,
            fontSize: 10, fontWeight: 600,
            padding: '3px 8px', borderRadius: 999,
            border: `1px solid ${catColor.dot}22`,
            fontFamily: 'Inter, sans-serif',
          }}>
            {idea.category}
          </div>
        )}

        {/* Premium blur overlay */}
        {idea.isPremium && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(26,40,160,0.18) 0%, transparent 50%)',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '11px 12px 13px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Creator row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <div
            onClick={handleCreatorClick}
            style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0, cursor: idea.creatorId ? 'pointer' : 'default' }}
          >
          {/* Improved creator avatar — rounded square */}
          {idea.creatorImage ? (
            <img
              src={idea.creatorImage}
              alt={idea.creatorName || 'Creator'}
              style={{
                width: 24, height: 24, borderRadius: 8,
                objectFit: 'cover', flexShrink: 0, background: avPalette.bg,
              }}
            />
          ) : (
            <div style={{
              width: 24, height: 24, borderRadius: 8,
              background: avPalette.bg, color: avPalette.text,
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontFamily: 'Inter, sans-serif',
            }}>
              {idea.creatorName?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <span style={{
            fontSize: 11.5, color: '#546E7A',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, minWidth: 0,
            fontFamily: 'Inter, sans-serif',
          }}>
            {idea.creatorName}
          </span>
          </div>
          <span style={{ fontSize: 10, color: '#90A4AE', flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>
            {formatDate(idea.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 5px',
          fontSize: 13.5,
          fontWeight: 700,
          color: '#0D2137',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.02em',
        }}>
          {idea.title}
        </h3>

        {/* Description */}
        <p style={{
          margin: '0 0 12px',
          fontSize: 11.5,
          color: '#546E7A',
          lineHeight: 1.55,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1,
          fontFamily: 'Inter, sans-serif',
          ...(locked ? {
            filter: 'blur(3.5px)',
            userSelect: 'none',
            pointerEvents: 'none',
          } : {}),
        }}>
          {idea.description}
        </p>

        {/* Actions row */}
        {actionsRow}
      </div>

      {overlays}

      <style>{`
        .sc-card:hover .sc-card-img { transform: scale(1.06); }
      `}</style>
    </div>
  );
}

/* ── Micro icon components ───────────────────────────────── */
function HeartIcon({ filled, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={filled ? 0 : 2.2}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }}>
      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function CommentIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={2.2}
      strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

function ShareIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={2.2}
      strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

function BookmarkIcon({ filled, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={filled ? 0 : 2.2}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }}>
      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function StarIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="currentColor" stroke="none" style={{ display: 'block' }}>
      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}