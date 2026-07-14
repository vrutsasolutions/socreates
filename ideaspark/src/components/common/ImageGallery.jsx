import { useState } from 'react';
import { CATEGORY_COLORS, defaultColor, IdeaIcon } from './categoryIcons';

/** Normalize an idea's images: prefer imageUrls[], fall back to single imageUrl. */
export function ideaImages(idea) {
  if (!idea) return [];
  const urls = Array.isArray(idea.imageUrls) ? idea.imageUrls.filter(Boolean) : [];
  if (urls.length) return urls;
  return idea.imageUrl ? [idea.imageUrl] : [];
}

/**
 * Swipeable image gallery for detail views — arrows + dots + counter.
 * When there are no images (or the current one fails to load), renders the
 * same category-tinted placeholder bar used on IdeaCard's thumbnail, instead
 * of rendering nothing.
 */
export default function ImageGallery({ images = [], title = '', category }) {
  const [idx, setIdx] = useState(0);
  const [broken, setBroken] = useState(() => new Set());
  const active = Math.min(idx, Math.max(images.length - 1, 0));
  const catColor = CATEGORY_COLORS[category] || defaultColor;

  if (!images.length || broken.has(active)) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden mb-4 h-44 flex items-center justify-center"
        style={{ background: `linear-gradient(145deg, ${catColor.bg} 0%, ${catColor.bg}cc 100%)` }}
      >
        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
          <IdeaIcon category={category} color={catColor.dot} size={28} />
        </div>
      </div>
    );
  }

  const go = (d) => setIdx((i) => (i + d + images.length) % images.length);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#F0F2F8] mb-4">
      <img
        src={images[active]}
        alt={title}
        onError={() => setBroken((b) => new Set(b).add(active))}
        className="w-full max-h-72 object-cover"
      />
      {images.length > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center text-lg leading-none active:scale-90">‹</button>
          <button onClick={() => go(1)} aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center text-lg leading-none active:scale-90">›</button>
          <span className="absolute top-2 right-2 bg-black/55 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">{active + 1}/{images.length}</span>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === active ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
