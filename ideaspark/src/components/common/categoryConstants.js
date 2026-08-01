/**
 * categoryConstants.js
 * ─────────────────────────────────────────────────────────────
 * Category → color mapping. Split out of categoryIcons.jsx so
 * that file only exports components (needed for Fast Refresh).
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