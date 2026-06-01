// ════════════════════════════════════════════════════════════════════════
//  Central dummy data for features still under backend development.
//  Shapes here MUST match API_CONTRACT.md so the live swap is seamless.
// ════════════════════════════════════════════════════════════════════════

const ago = (ms) => new Date(Date.now() - ms).toISOString();

// ── Ideas ────────────────────────────────────────────────────────────────
export const MOCK_IDEAS = [
  { id: '1', title: 'AI-Powered Plant Doctor App', description: 'Take a photo of your plant and get instant diagnosis using computer vision.', category: 'Technology', isPremium: false, likeCount: 142, creatorName: 'Arjun Sharma', createdAt: ago(3600000),   imageUrl: null, savedByCurrentUser: false },
  { id: '2', title: 'Micro-Learning Platform',     description: 'Learn any skill in 5-minute daily sessions. Gamified progress tracking.',      category: 'Education',   isPremium: true,  likeCount: 89,  creatorName: 'Priya Nair',    createdAt: ago(7200000),   imageUrl: null, savedByCurrentUser: false },
  { id: '3', title: 'Food Rescue Network',         description: 'Connect restaurants with surplus food to nearby NGOs in real-time.',          category: 'Social',      isPremium: false, likeCount: 203, creatorName: 'Rahul Gupta',   createdAt: ago(86400000),  imageUrl: null, savedByCurrentUser: true  },
  { id: '4', title: 'Digital Wardrobe Stylist',    description: 'Photograph your wardrobe once, get AI outfit suggestions every morning.',     category: 'Design',      isPremium: true,  likeCount: 67,  creatorName: 'Deepika Menon', createdAt: ago(172800000), imageUrl: null, savedByCurrentUser: false },
  { id: '5', title: 'Community Skill Swap',        description: 'Trade your skills with others. Teach coding, learn cooking. No money needed.', category: 'Business',    isPremium: false, likeCount: 310, creatorName: 'Vikram Patel',  createdAt: ago(259200000), imageUrl: null, savedByCurrentUser: false },
  { id: '6', title: 'Mental Wellness Journal',     description: 'Daily mood tracking with AI-powered insights and personalized recommendations.', category: 'Health',   isPremium: false, likeCount: 178, creatorName: 'Sneha Reddy',   createdAt: ago(345600000), imageUrl: null, savedByCurrentUser: true  },
];

// ── AI responses ───────────────────────────────────────────────────────────
export const MOCK_AI = {
  generate: (prompt = '') => ({
    title: `Idea: ${prompt.slice(0, 40) || 'Smart Daily Planner'}`,
    description: `A concept built around "${prompt || 'productivity'}". It solves a real problem by combining automation with a clean, mobile-first experience, and grows through community-driven content.`,
    category: 'Technology',
    tags: ['ai', 'productivity', 'mobile'],
  }),
  enhance: (description = '') => ({
    enhancedDescription:
      (description || 'Your idea') +
      ' — refined: clarifies the target user, the core problem, and a concrete first feature to ship.',
    suggestions: [
      'Lead with the specific pain point you solve.',
      'Name your target user in the first sentence.',
      'Add one measurable outcome (e.g. "saves 2 hrs/week").',
    ],
  }),
  summarize: (description = '') => ({
    summary: (description || 'This idea').split(' ').slice(0, 20).join(' ') + '…',
  }),
  categorize: () => ({ category: 'Technology', confidence: 0.92 }),
  chat: (message = '') => ({
    reply: `Here's a thought on "${message}": start by validating demand with 5 quick user interviews before building anything.`,
  }),
};

// ── Cloudflare image upload ─────────────────────────────────────────────────
export const MOCK_IMAGE = (file) => ({
  id: 'mock-img-' + Math.random().toString(36).slice(2, 9),
  // A real local preview URL so the UI shows the actual chosen image.
  url: file ? URL.createObjectURL(file) : 'https://picsum.photos/seed/idea/800/600',
});

// ── Notifications ───────────────────────────────────────────────────────────
export const MOCK_NOTIFICATIONS = [
  { id: 'n1', type: 'like',    title: 'New like',     message: 'Arjun liked your idea "Food Rescue Network"', read: false, createdAt: ago(120000),   link: '/ideas/3' },
  { id: 'n2', type: 'follow',  title: 'New follower', message: 'Priya Nair started following you',             read: false, createdAt: ago(900000),   link: '/profile' },
  { id: 'n3', type: 'comment', title: 'New comment',  message: 'Rahul commented on "Mental Wellness Journal"', read: true,  createdAt: ago(5400000),  link: '/ideas/6' },
  { id: 'n4', type: 'system',  title: 'Welcome 🎉',   message: 'Your IdeaSpark account is ready. Share your first idea!', read: true, createdAt: ago(86400000), link: '/add-idea' },
];
