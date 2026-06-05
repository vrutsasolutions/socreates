// ════════════════════════════════════════════════════════════════════════
//  Icon — reusable Lucide-style stroke icons.
//  Replaces emoji glyphs across the app with consistent SVG icons.
//
//  Usage:
//    import Icon from '../components/common/Icon';
//    <Icon name="bookmark" className="w-5 h-5 text-[#10B981]" />
//
//  All icons stroke with `currentColor`, so set color via the `text-*` class
//  (or a parent's color). Size via `width`/`height` props or `w-*/h-*` classes.
// ════════════════════════════════════════════════════════════════════════

/* Each entry is the inner markup of a 24×24 viewBox, stroke-based (Lucide style). */
const ICONS = {
  // ── general / account ──────────────────────────────────────────────
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  'user-plus': <><circle cx="9" cy="8" r="4" /><path d="M3 21c0-3.5 3-6 6-6s6 2.5 6 6" /><path d="M19 8v6M22 11h-6" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
  // ── ideas / engagement ─────────────────────────────────────────────
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />,
  lightbulb: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 00-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0012 2z" /></>,
  heart: <path d="M19.5 12.6l-7.5 7.4-7.5-7.4a5 5 0 117.5-6.6 5 5 0 117.5 6.6z" />,
  'message-square': <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 010 18 15 15 0 010-18z" /></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  star: <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5z" />,
  // ── premium ────────────────────────────────────────────────────────
  gem: <><path d="M6 3h12l3 6-9 12L3 9z" /><path d="M3 9h18" /><path d="M9 3l-1.5 6L12 21l4.5-12L15 3" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  // ── support / misc ─────────────────────────────────────────────────
  'file-text': <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" /></>,
  headphones: <><path d="M3 14v-2a9 9 0 0118 0v2" /><path d="M3 14a2 2 0 012-2h1v6H5a2 2 0 01-2-2v-2z" /><path d="M21 14a2 2 0 00-2-2h-1v6h1a2 2 0 002-2v-2z" /></>,
  'log-out': <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  bell: <><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></>,
  sparkles: <><path d="M12 3l1.6 4.6L18 9.2l-4.4 1.6L12 15l-1.6-4.2L6 9.2l4.4-1.6L12 3z" /><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" /></>,
  check: <path d="M5 13l4 4L19 7" />,
  x: <path d="M6 6l12 12M6 18L18 6" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  'eye-off': <><path d="M9.9 4.2A9.6 9.6 0 0112 4c6.5 0 10 7 10 7a13.4 13.4 0 01-2.2 3M6.6 6.6A13.3 13.3 0 002 11s3.5 7 10 7a9.6 9.6 0 004.1-.9" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /><path d="M3 3l18 18" /></>,
  // ── categories / interests ─────────────────────────────────────────
  cpu: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" /></>,
  palette: <><circle cx="12" cy="12" r="9" /><circle cx="8.5" cy="10.5" r="1" /><circle cx="12" cy="8" r="1" /><circle cx="15.5" cy="10.5" r="1" /><path d="M12 21a3 3 0 010-6h1.5a2.5 2.5 0 000-5" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /><path d="M3 12h18" /></>,
  flask: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" /><path d="M7.5 14h9" /></>,
  'graduation-cap': <><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1 2.7 2 6 2s6-1 6-2v-5" /></>,
  'heart-pulse': <><path d="M19.5 12.6l-7.5 7.4-7.5-7.4a5 5 0 117.5-6.6 5 5 0 117.5 6.6z" /><path d="M3.5 12h3l2-3 2 5 2-4 1.5 2h3" /></>,
  music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  plane: <path d="M17.8 19.2L16 11l3.5-3.5a2.1 2.1 0 00-3-3L13 8 4.8 6.2a1 1 0 00-.9 1.7l5.1 3.3-2 2-2.5-.5a1 1 0 00-.9 1.6l2 2 2 2a1 1 0 001.6-.9l-.5-2.5 2-2 3.3 5.1a1 1 0 001.7-.9z" />,
  utensils: <><path d="M4 3v7a2 2 0 002 2h0a2 2 0 002-2V3M6 12v9M16 3c-2 0-3 2-3 5s1 4 3 4v9" /></>,
  dumbbell: <><path d="M2 12h2M20 12h2M5 8v8M19 8v8M8 9v6M16 9v6M8 12h8" /></>,
  'dollar-sign': <><path d="M12 2v20" /><path d="M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.8 7 7s2 3 5 3.5 5 1.2 5 3.5-2.2 3.5-5 3.5-5-1.1-5-3" /></>,
  rocket: <><path d="M5 13c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.9-.9.9-2.3 0-3.2a2.3 2.3 0 00-3 .2z" /><path d="M9 12a14 14 0 016-9c3 0 5 2 5 5a14 14 0 01-9 6l-2-2z" /><circle cx="14.5" cy="8.5" r="1.5" /></>,
  // ── status / empty states ──────────────────────────────────────────
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5 5h14l3 7v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6l3-7z" /></>,
  camera: <><path d="M14.5 4l1.5 2H20a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h4l1.5-2z" /><circle cx="12" cy="13" r="3.5" /></>,
  flame: <path d="M12 2s5 3.5 5 9a5 5 0 01-10 0c0-2 1-3.5 1-3.5s.5 1.8 2 2.2C9.5 8 12 6 12 2z" />,
  hand: <path d="M18 11V6a1.5 1.5 0 00-3 0M15 10V4a1.5 1.5 0 00-3 0v2M12 10V5a1.5 1.5 0 00-3 0v9l-1.7-2.2a1.6 1.6 0 00-2.5 2l2.7 3.6A6 6 0 0019 17v-5a1.5 1.5 0 00-3 0" />,
  'alert-triangle': <><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h16.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3M8.5 21h7" /></>,
};

export default function Icon({ name, size, className = '', strokeWidth = 2, ...rest }) {
  const inner = ICONS[name];
  if (!inner) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...(size ? { width: size, height: size } : {})}
      aria-hidden="true"
      {...rest}
    >
      {inner}
    </svg>
  );
}
