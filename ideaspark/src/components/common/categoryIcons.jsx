/**
 * categoryIcons.jsx
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for category → color + icon mapping.
 * Used by IdeaCard.premium.jsx (image fallback tile) AND
 * Search.jsx (Browse by Category grid) so both stay in sync.
 * ─────────────────────────────────────────────────────────────
 */

export const CATEGORY_COLORS = {
  'Technology':              { bg: '#EEF0FF', text: '#3347E8', dot: '#4F62F5' },
  'Artificial Intelligence': { bg: '#F5F0FF', text: '#6D28D9', dot: '#8B5CF6' },
  'Healthcare':              { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' },
  'Education':               { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  'Finance':                 { bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
  'Business & Startups':     { bg: '#FFF7ED', text: '#9A3412', dot: '#FB923C' },
  'Agriculture':             { bg: '#F7FEE7', text: '#3F6212', dot: '#84CC16' },
  'Environment':             { bg: '#F0FDFA', text: '#115E59', dot: '#14B8A6' },
  'Energy':                  { bg: '#FEFCE8', text: '#854D0E', dot: '#EAB308' },
  'Transportation':          { bg: '#F0F9FF', text: '#075985', dot: '#0EA5E9' },
  'Security & Safety':       { bg: '#F1F5F9', text: '#334155', dot: '#64748B' },
  'Smart Cities':            { bg: '#ECFEFF', text: '#155E75', dot: '#22D3EE' },
  'Social Impact':           { bg: '#EFF6FF', text: '#1E3A8A', dot: '#3B82F6' },
  'Entertainment':           { bg: '#FDF2F8', text: '#9D174D', dot: '#EC4899' },
  'Music':                   { bg: '#FDF4FF', text: '#86198F', dot: '#D946EF' },
  'Gaming':                  { bg: '#F5F3FF', text: '#5B21B6', dot: '#7C3AED' },
  'Sports':                  { bg: '#FFF1F2', text: '#9F1239', dot: '#FB7185' },
  'Travel':                  { bg: '#EEF2FF', text: '#3730A3', dot: '#6366F1' },
  'Lifestyle':               { bg: '#FFF7ED', text: '#9A3412', dot: '#FDBA74' },
  'Food & Nutrition':        { bg: '#F0FDF4', text: '#166534', dot: '#22C55E' },
  'Fashion & Beauty':        { bg: '#FDF2F8', text: '#9D174D', dot: '#F472B6' },
  'Real Estate':             { bg: '#FFFBEB', text: '#78350F', dot: '#D97706' },
  'Science & Research':      { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  'Communication':           { bg: '#EFF6FF', text: '#1E40AF', dot: '#3B82F6' },
  'E-commerce':              { bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
  'Government':              { bg: '#F8FAFC', text: '#1E293B', dot: '#475569' },
  'Robotics & IoT':          { bg: '#EEF2FF', text: '#3730A3', dot: '#6366F1' },
  'Pets & Animal Care':      { bg: '#FEFCE8', text: '#854D0E', dot: '#CA8A04' },
  'Arts & Creativity':       { bg: '#FDF2F8', text: '#831843', dot: '#EC4899' },
};

export const defaultColor = { bg: '#F0F2F8', text: '#343A56', dot: '#6B7494' };

export function IdeaIcon({ category, color = '#4F62F5', size = 26 }) {
  const icons = {
    'Technology': (<><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>),
    'Artificial Intelligence': (<><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="10" y="10" width="4" height="4" rx="1" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>),
    'Healthcare': (<><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></>),
    'Education': (<><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3.333 1.333 8.667 1.333 12 0v-5" /></>),
    'Finance': (<><circle cx="12" cy="12" r="9" /><path d="M12 7v10M15 9.5c0-1.38-1.34-2.5-3-2.5s-3 1.12-3 2.5c0 1.38 1.34 2 3 2.5s3 1.12 3 2.5-1.34 2.5-3 2.5-3-1.12-3-2.5" /></>),
    'Business & Startups': (<><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /><path d="M2 12h20" /></>),
    'Agriculture': (<><path d="M12 22v-9" /><path d="M12 13C7 13 6 8 6 5c5 0 6 5 6 8z" /><path d="M12 13c5 0 6-5 6-8-5 0-6 5-6 8z" /></>),
    'Environment': (<><path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-11 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></>),
    'Energy': (<><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></>),
    'Transportation': (<><path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11" /><rect x="2" y="11" width="20" height="6" rx="2" /><circle cx="7" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></>),
    'Security & Safety': (<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>),
    'Smart Cities': (<><path d="M3 21h18" /><path d="M5 21V9l4-3 4 3v12" /><path d="M13 21V5l4-2 4 2v16" /><path d="M8 12h1M8 16h1M16 9h1M16 13h1M16 17h1" /></>),
    'Social Impact': (<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>),
    'Entertainment': (<><path d="M20.2 6H3.8a1.8 1.8 0 00-1.8 1.8v12.4A1.8 1.8 0 003.8 22h16.4a1.8 1.8 0 001.8-1.8V7.8A1.8 1.8 0 0020.2 6z" /><path d="M2 6l2.5-4h3L5 6M9 6l2.5-4h3L12 6M15 6l2.5-4h3L18 6" /></>),
    'Music': (<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>),
    'Gaming': (<><path d="M6 12h4M8 10v4" /><circle cx="15" cy="11" r="1" /><circle cx="18" cy="13" r="1" /><path d="M17.32 5H6.68a4 4 0 00-3.98 3.65l-.67 7.36A2.42 2.42 0 004.44 19a2.4 2.4 0 002-1.06L8 15h8l1.56 2.94A2.4 2.4 0 0019.56 19a2.42 2.42 0 002.41-2.99l-.67-7.36A4 4 0 0017.32 5z" /></>),
    'Sports': (<><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 010 20M2 12h20M4.5 6c3.5 2 11.5 2 15 0M4.5 18c3.5-2 11.5-2 15 0" /></>),
    'Travel': (<><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></>),
    'Lifestyle': (<><path d="M18 8h1a4 4 0 010 8h-1" /><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" /><path d="M6 1v3M10 1v3M14 1v3" /></>),
    'Food & Nutrition': (<><path d="M6 2v7a2 2 0 01-4 0V2" /><path d="M4 9v13" /><path d="M20 2c-2.2 0-4 2.2-4 5v4c0 1.1.9 2 2 2v9" /></>),
    'Fashion & Beauty': (<><path d="M12 3a2 2 0 012 2c0 .74-.4 1.39-1 1.73V8l7 4-1 2-6-3v7H9v-7l-6 3-1-2 7-4V6.73A2 2 0 0110 5a2 2 0 012-2z" /></>),
    'Real Estate': (<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M9 22V12h6v10" /></>),
    'Science & Research': (<><path d="M9 3h6M9 3v6l-4 9a1 1 0 00.9 1.45h12.2a1 1 0 00.9-1.45l-4-9V3" /><path d="M8.5 14h7" /></>),
    'Communication': (<><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></>),
    'E-commerce': (<><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 01-8 0" /></>),
    'Government': (<><path d="M3 21h18" /><path d="M4 10h16" /><path d="M12 3l9 5H3l9-5z" /><path d="M6 10v9M10 10v9M14 10v9M18 10v9" /></>),
    'Robotics & IoT': (<><rect x="5" y="8" width="14" height="10" rx="2" /><circle cx="9" cy="13" r="1" /><circle cx="15" cy="13" r="1" /><path d="M9 18v2M15 18v2M12 8V4M9 4h6" /></>),
    'Pets & Animal Care': (<><circle cx="6" cy="8" r="2" /><circle cx="10" cy="5" r="2" /><circle cx="14" cy="5" r="2" /><circle cx="18" cy="8" r="2" /><path d="M12 12c-3 0-6 2-6 5a3 3 0 003 3c1 0 1.5-.5 3-.5s2 .5 3 .5a3 3 0 003-3c0-3-3-5-6-5z" /></>),
    'Arts & Creativity': (<><circle cx="12" cy="12" r="10" /><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" /></>),
  };

  // 'Other' (and any unrecognized category) falls through to this generic
  // lightbulb glyph — intentionally has no explicit key above.
  const defaultIcon = (
    <>
      <path d="M9 21h6M12 3a6 6 0 016 6c0 2.22-1.2 4.16-3 5.2V17H9v-2.8A6.002 6.002 0 016 9a6 6 0 016-6z" />
      <path d="M12 8v4M10 10h4" />
    </>
  );

  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round">
      {icons[category] || defaultIcon}
    </svg>
  );
}