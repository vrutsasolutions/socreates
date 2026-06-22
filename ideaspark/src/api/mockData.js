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
  { id: 'n4', type: 'system',  title: 'Welcome 🎉',   message: 'Your SoCreates account is ready. Share your first idea!', read: true, createdAt: ago(86400000), link: '/add-idea' },
  // Chat-originated notifications (shared idea / photo) are `message` type so
  // they surface in the message icon, not the bell — clicking opens the chat.
  { id: 'n5', type: 'message', title: 'New message',  message: 'Aparna S. shared an idea',     read: false, createdAt: ago(150000),  conversationId: 'c-aparna', link: '/messages/c-aparna' },
  { id: 'n6', type: 'message', title: 'New message',  message: 'Meera J. sent you a photo',    read: false, createdAt: ago(10800000), conversationId: 'c-meera',  link: '/messages/c-meera' },
];

// ════════════════════════════════════════════════════════════════════════
//  Messaging (figma "Messaging System UI")
//  Shapes are a proposed contract — add to API_CONTRACT.md before live swap.
//    Conversation: { id, name, initial, avatarColor, lastMessage, lastType,
//                    time, unread, online }
//    ActiveUser:   { id, name, initial, avatarColor, online }
//    Message:      { id, conversationId, fromMe, type:'text'|'image'|'voice'|
//                    'typing', text?, imageUrl?, duration?, time }
//    Request:      { id, name, initial, avatarColor, preview, time, mutuals }
//    Contact:      { id, name, initial, avatarColor, handle, online }
// ════════════════════════════════════════════════════════════════════════

// Avatar palette mirrors the figma swatches used across the inbox rows.
export const AVATAR_COLORS = {
  green:  '#30933C',
  pink:   '#FF2D55',
  blue:   '#1565C0',
  amber:  '#F59E0B',
  navy:   '#0D47A1',
  teal:   '#0E96C0',
  purple: '#623388',
};

// People shown in the "ACTIVE NOW" story rail.
export const MOCK_ACTIVE_USERS = [
  { id: 'u-dev',    name: 'Dev',    initial: 'D', avatarColor: AVATAR_COLORS.green,  online: true  },
  { id: 'u-priya',  name: 'Priya',  initial: 'P', avatarColor: AVATAR_COLORS.pink,   online: true  },
  { id: 'u-ananya', name: 'Ananya', initial: 'A', avatarColor: AVATAR_COLORS.blue,   online: true  },
  { id: 'u-rohan',  name: 'Rohan',  initial: 'R', avatarColor: AVATAR_COLORS.amber,  online: true  },
];

// Recent conversations (the figma "RECENT" list).
export const MOCK_CONVERSATIONS = [
  // verifiedCreator: true → free-tier messaging limit applies (5 text + 1 file)
  { id: 'c-aparna', name: 'Aparna S.',   initial: 'A', avatarColor: AVATAR_COLORS.blue,   lastMessage: 'Loved the new update!',   lastType: 'text',  time: '2m',  unread: 3, online: true,  verifiedCreator: true },
  { id: 'c-krati',  name: 'Krati M.',    initial: 'K', avatarColor: AVATAR_COLORS.navy,   lastMessage: 'Can you review designs?', lastType: 'text',  time: '15m', unread: 1, online: false },
  { id: 'c-rahul',  name: 'Rahul K.',    initial: 'R', avatarColor: AVATAR_COLORS.teal,   lastMessage: 'Voice note  0:42',        lastType: 'voice', time: '1h',  unread: 0, online: false },
  { id: 'c-design', name: 'Design Team', initial: 'D', avatarColor: AVATAR_COLORS.green,  lastMessage: 'Sneha: Shipped!',         lastType: 'text',  time: '3h',  unread: 0, online: false },
  { id: 'c-meera',  name: 'Meera J.',    initial: 'M', avatarColor: AVATAR_COLORS.purple, lastMessage: 'Shared a photo',          lastType: 'image', time: 'Tue', unread: 0, online: false },
];

// Message threads keyed by conversation id (figma "02 · Chat").
export const MOCK_MESSAGES = {
  'c-aparna': [
    { id: 'm1', conversationId: 'c-aparna', fromMe: false, type: 'text',  text: 'Check this out below', time: '10:24' },
    { id: 'm2', conversationId: 'c-aparna', fromMe: false, type: 'image', imageUrl: 'https://picsum.photos/seed/aparna/600/400', time: '10:24' },
    { id: 'm3', conversationId: 'c-aparna', fromMe: true,  type: 'text',  text: 'Wow, looks amazing!', time: '10:26' },
    { id: 'm4', conversationId: 'c-aparna', fromMe: false, type: 'typing', time: '10:27' },
  ],
  'c-krati': [
    { id: 'm1', conversationId: 'c-krati', fromMe: false, type: 'text', text: 'Can you review designs?', time: '09:10' },
    { id: 'm2', conversationId: 'c-krati', fromMe: true,  type: 'text', text: 'Sure, sending feedback shortly.', time: '09:12' },
  ],
  'c-rahul': [
    { id: 'm1', conversationId: 'c-rahul', fromMe: false, type: 'voice', duration: '0:42', time: '08:30' },
  ],
};

// Pending message requests (figma "03 · Requests").
export const MOCK_REQUESTS = [
  { id: 'r-neha',   name: 'Neha Verma',    initial: 'N', avatarColor: AVATAR_COLORS.pink,   preview: 'Hi! Loved your idea on the Food Rescue Network — would love to collaborate.', time: '5m',  mutuals: 3 },
  { id: 'r-karan',  name: 'Karan Mehta',   initial: 'K', avatarColor: AVATAR_COLORS.amber,  preview: 'Hey, are you open to feedback on my new prototype?',                          time: '1h',  mutuals: 1 },
  { id: 'r-isha',   name: 'Isha Kapoor',   initial: 'I', avatarColor: AVATAR_COLORS.teal,   preview: 'Following your work for a while — can we connect?',                           time: '2h',  mutuals: 5 },
  { id: 'r-arnav',  name: 'Arnav Singh',   initial: 'A', avatarColor: AVATAR_COLORS.purple, preview: 'Quick question about your mentorship program.',                              time: 'Mon', mutuals: 0 },
];

// People you can share a post with (figma "06 · Share Post").
// IDs match conversation ids where a thread already exists, so a shared post
// can be delivered into that chat.
export const MOCK_SHARE_TARGETS = [
  { id: 'c-aparna', name: 'Aparna S.', initial: 'A', avatarColor: AVATAR_COLORS.blue,   subtitle: 'Close friend' },
  { id: 'c-krati',  name: 'Krati M.',  initial: 'K', avatarColor: AVATAR_COLORS.navy,   subtitle: 'Design Team' },
  { id: 'c-rahul',  name: 'Rahul K.',  initial: 'R', avatarColor: AVATAR_COLORS.teal,   subtitle: 'Colleague' },
  { id: 'c-meera',  name: 'Meera J.',  initial: 'M', avatarColor: AVATAR_COLORS.purple, subtitle: 'Friend' },
  { id: 'c-arjun',  name: 'Arjun M.',  initial: 'A', avatarColor: AVATAR_COLORS.green,  subtitle: 'Followed you' },
];

// People you can start a new chat with (figma "09 · New Chat").
export const MOCK_CONTACTS = [
  { id: 'u-ananya', name: 'Ananya Rao',    initial: 'A', avatarColor: AVATAR_COLORS.blue,   handle: '@ananya',    online: true  },
  { id: 'u-rohan',  name: 'Rohan Das',     initial: 'R', avatarColor: AVATAR_COLORS.amber,  handle: '@rohan_d',   online: true  },
  { id: 'u-priya',  name: 'Priya Nair',    initial: 'P', avatarColor: AVATAR_COLORS.pink,   handle: '@priyanair', online: true  },
  { id: 'u-vikram', name: 'Vikram Patel',  initial: 'V', avatarColor: AVATAR_COLORS.green,  handle: '@vikramp',   online: false },
  { id: 'u-sneha',  name: 'Sneha Reddy',   initial: 'S', avatarColor: AVATAR_COLORS.purple, handle: '@sneha',     online: false },
  { id: 'u-deepika',name: 'Deepika Menon', initial: 'D', avatarColor: AVATAR_COLORS.teal,   handle: '@deepika',   online: false },
  { id: 'u-arjun',  name: 'Arjun Sharma',  initial: 'A', avatarColor: AVATAR_COLORS.navy,   handle: '@arjun_s',   online: false },
];
