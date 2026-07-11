// Shared idea categories — used by both the Add Idea form (category picker)
// and the Explore/Search page (category filter chips + "Browse by Category"
// grid), so the two stay in sync. Add/remove categories here only.
//
// Note: the backend `ideas.category` column is a free-text VARCHAR(50) with
// no enum/CHECK constraint (see schema.sql), so this list is UI-side only —
// no migration needed to change it.
export const CATEGORIES = [
  'Technology',
  'Artificial Intelligence',
  'Healthcare',
  'Education',
  'Finance',
  'Business & Startups',
  'Agriculture',
  'Environment',
  'Energy',
  'Transportation',
  'Security & Safety',
  'Smart Cities',
  'Social Impact',
  'Entertainment',
  'Music',
  'Gaming',
  'Sports',
  'Travel',
  'Lifestyle',
  'Food & Nutrition',
  'Fashion & Beauty',
  'Real Estate',
  'Science & Research',
  'Communication',
  'E-commerce',
  'Government',
  'Robotics & IoT',
  'Pets & Animal Care',
  'Arts & Creativity',
  'Other',
];