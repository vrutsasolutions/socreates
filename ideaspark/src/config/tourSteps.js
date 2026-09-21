/**
 * tourSteps.js  — SoCreate Feature Walkthrough Steps
 * ─────────────────────────────────────────────────────────
 * Each exported array is the step config for one page/guide.
 * Import the relevant array in the page component and pass
 * it to <TooltipGuide steps={...} guideKey={...} />.
 *
 * Step shape:
 * {
 *   target?:          string   — matches data-tour="<target>" on a DOM element
 *   selector?:        string   — plain CSS selector (alternative to data-tour)
 *   positionStrategy?:'center' — center on screen (no spotlight), for intros
 *   title:            string   — short heading shown in the card header
 *   description:      string   — explanation text (1–3 sentences)
 *   tip?:             string   — optional pro-tip shown in a blue chip
 *   icon?:            string   — emoji icon for the card header
 *   spotlightPad?:    number   — extra padding around the spotlight hole (default 8)
 *   spotlightRadius?: number   — border-radius for the spotlight cutout (default 14)
 * }
 *
 * guideKey convention: 'tour_<page>_v<n>'
 * Bump <n> when you add/change steps so existing dismissed users
 * see the new guide.
 * ─────────────────────────────────────────────────────────
 */


/* ═══════════════════════════════════════════════════════
   HOME PAGE  (guideKey: 'tour_home_v1')
   13 steps matching the Figma design walkthrough
   ═══════════════════════════════════════════════════════ */
export const HOME_STEPS = [
  {
    // Step 01 — Menu
    target: 'home-menu',
    title: 'Explore SoCreate',
    description:
      'Use this menu to access more areas and features of SoCreate — your dashboard, membership, partners program, and settings.',
    iconName: 'menu',
    spotlightPad: 6,
    spotlightRadius: 10,
  },
  {
    // Step 02 — Search
    target: 'home-search',
    title: 'Find Ideas & Creators',
    description:
      'Search for startup ideas, topics and creators you want to discover.',
    iconName: 'search',
    spotlightPad: 6,
    spotlightRadius: 16,
  },
  {
    // Step 03 — Notifications
    target: 'home-notifications',
    title: 'Stay Updated',
    description:
      'Check the notification bell to see activity and updates related to you — likes, comments, new followers, and follow requests.',
    iconName: 'bell',
    spotlightPad: 6,
    spotlightRadius: 10,
  },
  {
    // Step 04 — Messages
    target: 'home-messages',
    title: 'Connect & Chat',
    description:
      'Tap the message icon to connect and continue conversations with creators.',
    iconName: 'message',
    spotlightPad: 6,
    spotlightRadius: 10,
  },
  {
    // Step 05 — Feed Tabs
    target: 'home-tabs',
    title: 'Discover Ideas',
    description:
      'Switch between Trending, Latest and For You to discover ideas.',
    iconName: 'tabs',
    spotlightPad: 8,
    spotlightRadius: 20,
  },
  {
    // Step 06 — Idea card (first card in feed)
    target: 'home-first-idea',
    title: 'Explore an Idea',
    description:
      'Tap an idea card to read the full idea and learn more about it.',
    iconName: 'idea',
    spotlightPad: 8,
    spotlightRadius: 14,
  },
  {
    // Step 07 — Like / engage actions
    target: 'home-idea-actions',
    title: 'Engage With Ideas',
    description:
      'Like, comment and share ideas that interest you.',
    iconName: 'heart',
    spotlightPad: 6,
    spotlightRadius: 10,
  },
  {
    // Step 08 — Save / bookmark
    target: 'home-idea-save',
    title: 'Save for Later',
    description:
      'Bookmark ideas you want to come back to later. Find them anytime in your Profile → Saved tab.',
    iconName: 'bookmark',
    spotlightPad: 6,
    spotlightRadius: 10,
  },
  {
    // Step 09 — Create (bottom nav lightbulb)
    target: 'bottom-nav-create',
    title: 'Create Your Idea',
    description:
      'Use the create button to share your own startup idea with the SoCreate community.',
    iconName: 'create',
    spotlightPad: 6,
    spotlightRadius: 14,
  },
  {
    // Step 10 — Explore (bottom nav)
    target: 'bottom-nav-explore',
    title: 'Explore More Ideas',
    description:
      'Open Explore to discover more ideas and content across SoCreate — browse by category or trending topics.',
    iconName: 'explore',
    spotlightPad: 6,
    spotlightRadius: 14,
  },
  {
    // Step 11 — Premium (bottom nav)
    target: 'bottom-nav-premium',
    title: 'Unlock Premium',
    description:
      'Premium gives you access to premium ideas and additional features like unlimited bookmarks and early feature access.',
    iconName: 'premium',
    spotlightPad: 6,
    spotlightRadius: 14,
  },
  {
    // Step 12 — Profile (bottom nav)
    target: 'bottom-nav-profile',
    title: 'Your SoCreate Profile',
    description:
      'Visit your profile to manage your account, ideas and connections.',
    iconName: 'profile',
    spotlightPad: 6,
    spotlightRadius: 14,
  },
  {
    // Step 13 — AI FAB
    target: 'home-ai-fab',
    title: 'Your AI Assistant',
    description:
      'Use the AI assistant for help exploring, developing and working with ideas.',
    tip: 'Great for brainstorming, refining pitches, or validating concepts!',
    iconName: 'ai',
    spotlightPad: 6,
    spotlightRadius: 16,
  },
];


/* ═══════════════════════════════════════════════════════
   SEARCH / EXPLORE  (guideKey: 'tour_search_v1')
   ═══════════════════════════════════════════════════════ */
export const SEARCH_STEPS = [
  {
    positionStrategy: 'center',
    title: 'Explore Ideas',
    description:
      'Discover ideas from creators across every field. Search by keyword, browse by category, or check out today\'s top-trending posts.',
    iconName: 'search',
  },
  {
    target: 'search-input',
    title: 'Search by Keyword',
    description:
      'Type any topic, industry, or keyword to instantly filter ideas. Results update as you type — no need to press enter.',
    tip: 'Try searching "AI", "health", or "edtech" to discover ideas in those spaces.',
    iconName: 'search',
    spotlightPad: 8,
    spotlightRadius: 20,
  },
  {
    target: 'search-categories',
    title: 'Browse by Category',
    description:
      'Filter ideas by category — Technology, Business, Design, Health, Education, and more. Tap any chip to narrow your feed instantly.',
    iconName: 'explore',
    spotlightPad: 8,
    spotlightRadius: 24,
  },
  {
    target: 'search-ideas-of-day',
    title: 'Ideas of the Day',
    description:
      'These are today\'s highest-scoring ideas based on views and likes, refreshed daily by the SoCreate algorithm. A great starting point for inspiration.',
    iconName: 'premium',
    spotlightPad: 8,
  },
];


/* ═══════════════════════════════════════════════════════
   ADD IDEA  (guideKey: 'tour_add_idea_v1')
   ═══════════════════════════════════════════════════════ */
export const ADD_IDEA_STEPS = [
  {
    positionStrategy: 'center',
    title: 'Share Your Idea 💡',
    description:
      'You\'re about to publish an idea. This 3-step flow takes about 2 minutes: add details, attach media, then choose who can see it.',
    iconName: 'idea',
  },
  {
    target: 'add-idea-steps',
    title: '3-Step Process',
    description:
      'The progress bar at the top shows your position: Details → Media → Publish. You can move forward and back at any time without losing your work.',
    iconName: 'tabs',
    spotlightPad: 8,
    spotlightRadius: 16,
  },
  {
    target: 'add-idea-title',
    title: 'Idea Title',
    description:
      'Give your idea a clear, punchy title — it\'s the first thing readers see. Aim for under 10 words that describe the core concept.',
    tip: 'Strong titles are specific: "AI-Powered Plant Disease Detector" beats "Plant App".',
    iconName: 'create',
    spotlightPad: 8,
    spotlightRadius: 14,
  },
  {
    target: 'add-idea-description',
    title: 'Description',
    description:
      'Explain your idea in a few sentences. What problem does it solve? Who is it for? The more clearly you explain it, the more engagement you\'ll get.',
    iconName: 'idea',
    spotlightPad: 8,
  },
  {
    target: 'add-idea-ai-bar',
    title: 'AI Writing Assistant',
    description:
      'Tap "Try AI" to let SoCreate\'s AI enhance your title and description — it can rewrite for clarity or just fix spelling and grammar, your choice.',
    tip: 'The AI never changes the core meaning of your idea — it only improves how you express it.',
    iconName: 'ai',
    spotlightPad: 8,
    spotlightRadius: 16,
  },
  {
    target: 'add-idea-category',
    title: 'Category',
    description:
      'Pick the category that best fits your idea. Categories help readers discover your content through search and the Explore tab.',
    iconName: 'explore',
    spotlightPad: 8,
  },
  {
    target: 'add-idea-links',
    title: 'Add Links',
    description:
      'Attach external links to your idea — a prototype URL, a GitHub repo, a pitch deck, or any reference that adds context.',
    iconName: 'share',
    spotlightPad: 8,
  },
  {
    target: 'add-idea-media',
    title: 'Add Images',
    description:
      'In the Media step, upload up to 5 images that illustrate your idea. You can crop, rotate, and arrange them with the built-in image editor.',
    tip: 'Ideas with images get significantly more engagement than text-only posts.',
    iconName: 'idea',
    spotlightPad: 8,
  },
  {
    target: 'add-idea-premium-toggle',
    title: 'Free vs Premium',
    description:
      'In the Publish step, Creator Pro members can toggle an idea to Premium — only Premium/Pro subscribers can read it. Great for your highest-value content.',
    iconName: 'premium',
    spotlightPad: 8,
  },
];


/* ═══════════════════════════════════════════════════════
   PROFILE  (guideKey: 'tour_profile_v1')
   ═══════════════════════════════════════════════════════ */
export const PROFILE_STEPS = [
  {
    positionStrategy: 'center',
    title: 'Your Profile 🧑',
    description:
      'This is your public creator page — what others see when they visit your profile. Let\'s look at what you can manage here.',
    iconName: 'profile',
  },
  {
    target: 'profile-avatar',
    title: 'Profile Photo & Name',
    description:
      'Your photo, name, and bio are the first things visitors see. Make them memorable — they\'re your creator brand.',
    iconName: 'profile',
    spotlightPad: 6,
    spotlightRadius: 50,
  },
  {
    target: 'profile-stats',
    title: 'Follower Stats',
    description:
      'See how many people follow you and how many you follow. Tap either number to browse your followers or following list.',
    iconName: 'chart',
    spotlightPad: 8,
  },
  {
    target: 'profile-edit',
    title: 'Edit Profile',
    description:
      'Update your display name, bio, profile photo, and social links anytime. A complete profile gets up to 3× more followers.',
    iconName: 'create',
    spotlightPad: 8,
  },
  {
    target: 'profile-share',
    title: 'Share Your Profile',
    description:
      'Share your public profile link with anyone — via WhatsApp, Twitter, email, or copy the link directly. Let your audience find you anywhere.',
    iconName: 'share',
    spotlightPad: 8,
  },
  {
    target: 'profile-follow-requests',
    title: 'Follow Requests',
    description:
      'If your account is private, pending follow requests appear here. Approve or decline each request individually.',
    iconName: 'message',
    spotlightPad: 8,
  },
  {
    target: 'profile-tabs',
    title: 'My Ideas & Saved',
    description:
      '"My Ideas" shows everything you\'ve published. "Saved" shows ideas you\'ve bookmarked from other creators — your personal reading list.',
    iconName: 'tabs',
    spotlightPad: 8,
    spotlightRadius: 20,
  },
];


/* ═══════════════════════════════════════════════════════
   CREATOR DASHBOARD  (guideKey: 'tour_creator_dashboard_v1')
   ═══════════════════════════════════════════════════════ */
export const CREATOR_DASHBOARD_STEPS = [
  {
    positionStrategy: 'center',
    title: 'Creator Dashboard 📊',
    description:
      'This is your analytics HQ. Track how your ideas perform, see your monthly earnings, and manage payouts — all in one place.',
    iconName: 'chart',
  },
  {
    target: 'dashboard-status',
    title: 'Creator Status',
    description:
      'Shows whether you have Creator Pro, are Verified, and have Premium Publishing enabled. These badges unlock earnings and grow your credibility.',
    iconName: 'check',
    spotlightPad: 8,
  },
  {
    target: 'dashboard-performance',
    title: 'Performance Overview',
    description:
      'Your total reads, likes, saves, and comments across all published ideas. These numbers update daily and drive your monthly content score.',
    iconName: 'chart',
    spotlightPad: 8,
  },
  {
    target: 'dashboard-monthly-score',
    title: 'Monthly Score',
    description:
      'Your content score (0–100) is calculated each month from reads, engagement, and idea quality. A higher score means a larger slice of the revenue pool.',
    tip: 'Publish consistently and engage with comments to grow your score faster.',
    iconName: 'premium',
    spotlightPad: 8,
  },
  {
    target: 'dashboard-revenue',
    title: 'Revenue & Payouts',
    description:
      'See your monthly earnings, payment status (Scheduled / Paid), and payout destination. Payments go out on the 15th of each month.',
    iconName: 'dollar',
    spotlightPad: 8,
  },
  {
    target: 'dashboard-content-table',
    title: 'Top Ideas',
    description:
      'A breakdown of your best-performing ideas by reads, likes, comments, and saves. Use this to understand what your audience loves most.',
    iconName: 'tabs',
    spotlightPad: 8,
  },
  {
    target: 'dashboard-payout-setup',
    title: 'Payout Setup',
    description:
      'Before you can receive earnings, add your bank account details here. SoCreate sends payouts directly via Razorpay — no third-party wallet needed.',
    tip: 'Set up your payout account as soon as you join Creator Pro so you\'re ready when your first payment is due.',
    iconName: 'dollar',
    spotlightPad: 8,
  },
];


/* ═══════════════════════════════════════════════════════
   MEMBERSHIP / PRICING  (guideKey: 'tour_membership_v1')
   ═══════════════════════════════════════════════════════ */
export const MEMBERSHIP_STEPS = [
  {
    positionStrategy: 'center',
    title: 'SoCreate Plans 💎',
    description:
      'Two plan tiers, built for different goals. Choose what fits your journey — you can upgrade or switch anytime.',
    iconName: 'premium',
  },
  {
    target: 'membership-billing-toggle',
    title: 'Monthly vs Yearly',
    description:
      'Toggle between monthly and yearly billing. Yearly saves you significantly — nearly ₹400 on the Premium plan and over ₹1,300 on Creator Pro.',
    iconName: 'bell',
    spotlightPad: 8,
    spotlightRadius: 24,
  },
  {
    target: 'membership-reader-card',
    title: 'Go Premium — For Readers',
    description:
      'Unlock unlimited premium ideas, message access, and a Premium Reader badge. Perfect if you\'re here to discover and learn from the best creators.',
    iconName: 'idea',
    spotlightPad: 8,
  },
  {
    target: 'membership-creator-card',
    title: 'Creator Pro — For Creators',
    description:
      'Everything in Premium, plus the ability to publish paid content, access your analytics dashboard, apply for verification, and earn revenue each month.',
    tip: 'Creator Pro is required to start earning. The ₹199/month investment can be covered many times over by your first payout.',
    iconName: 'sparkle',
    spotlightPad: 8,
  },
  {
    target: 'membership-manage',
    title: 'Manage Your Plan',
    description:
      'Already subscribed? Your current plan, renewal date, and cancel option all appear here. Cancelling stops future renewals — you keep access until the end of your billing period.',
    iconName: 'settings',
    spotlightPad: 8,
  },
];


/* ═══════════════════════════════════════════════════════
   AI ASSISTANT  (guideKey: 'tour_ai_assistant_v1')
   ═══════════════════════════════════════════════════════ */
export const AI_ASSISTANT_STEPS = [
  {
    positionStrategy: 'center',
    title: 'Meet SparkBot 🤖',
    description:
      'SparkBot is your AI idea partner, powered by SoCreate\'s own model. Ask it anything about your ideas, your industry, or the platform — it understands your context.',
    iconName: 'ai',
  },
  {
    target: 'ai-bring-chips',
    title: 'What Brings You Here?',
    description:
      'Tell SparkBot your goal — sharing ideas, exploring, finding collaborators, or validating a concept. This helps it tailor every response to what you actually need.',
    iconName: 'explore',
    spotlightPad: 8,
    spotlightRadius: 16,
  },
  {
    target: 'ai-industry-chips',
    title: 'Your Industry',
    description:
      'Select your field so SparkBot can frame its ideas, advice, and comparisons using the right industry context — tech, education, health, design, or other.',
    iconName: 'settings',
    spotlightPad: 8,
    spotlightRadius: 16,
  },
  {
    target: 'ai-action-chips',
    title: 'Quick Actions',
    description:
      'Use the action chips to quickly start specific tasks: Generate a brand-new idea, Refine an existing concept, Validate it with market reasoning, or Write a description for you.',
    tip: 'You can also just type freely — SparkBot understands natural conversation, not just chip-based commands.',
    iconName: 'sparkle',
    spotlightPad: 8,
    spotlightRadius: 16,
  },
  {
    target: 'ai-chat-input',
    title: 'Chat with SparkBot',
    description:
      'Type any question or prompt here. SparkBot remembers what you\'ve said earlier in the session, so you can build on previous messages naturally.',
    iconName: 'message',
    spotlightPad: 8,
    spotlightRadius: 20,
  },
];


/* ═══════════════════════════════════════════════════════
   PREMIUM FEED  (guideKey: 'tour_premium_v1')
   ═══════════════════════════════════════════════════════ */
export const PREMIUM_STEPS = [
  {
    positionStrategy: 'center',
    title: 'Premium Ideas 👑',
    description:
      'Premium ideas are exclusively shared by Creator Pro members. They cover deeper insights, detailed playbooks, and original research not found in the free feed.',
    iconName: 'premium',
  },
  {
    target: 'premium-filter',
    title: 'Filter by Category',
    description:
      'Use the category row to focus on a specific domain. Every category in the Premium feed contains content from verified or pro creators.',
    iconName: 'explore',
    spotlightPad: 8,
    spotlightRadius: 24,
  },
  {
    target: 'premium-read-counter',
    title: 'Free Preview Reads',
    description:
      'On the free plan you can fully open a limited number of premium ideas per month. Upgrade to a Premium or Creator Pro plan for unlimited access to all premium content.',
    tip: 'Opening the same premium idea twice counts as one read — re-reads don\'t consume your limit.',
    iconName: 'chart',
    spotlightPad: 8,
  },
  {
    target: 'premium-upgrade-banner',
    title: 'Upgrade for Unlimited Access',
    description:
      'Hit the upgrade banner to jump to the Membership page and pick a plan. Once subscribed, all premium ideas unlock instantly — no refresh needed.',
    iconName: 'sparkle',
    spotlightPad: 8,
  },
];


/* ═══════════════════════════════════════════════════════
   INBOX / MESSAGES  (guideKey: 'tour_inbox_v1')
   ═══════════════════════════════════════════════════════ */
export const INBOX_STEPS = [
  {
    positionStrategy: 'center',
    title: 'Your Messages 💬',
    description:
      'Direct messages between creators. Send text, images, voice notes, or share an idea card directly into a conversation.',
    iconName: 'message',
  },
  {
    target: 'inbox-search',
    title: 'Search Conversations',
    description:
      'Find a specific conversation quickly by searching the person\'s name. Particularly useful once your inbox starts filling up.',
    iconName: 'search',
    spotlightPad: 8,
    spotlightRadius: 20,
  },
  {
    target: 'inbox-active-users',
    title: 'Active Now',
    description:
      'The circular avatars at the top show creators who are currently online. Tap any ring to start or continue a conversation with them right now.',
    iconName: 'check',
    spotlightPad: 8,
    spotlightRadius: 16,
  },
  {
    target: 'inbox-requests',
    title: 'Message Requests',
    description:
      'When someone you don\'t follow messages you, it lands here first. Accept to move it to your main inbox or decline to keep your inbox clean.',
    iconName: 'message',
    spotlightPad: 8,
  },
  {
    target: 'inbox-new',
    title: 'Start a New Chat',
    description:
      'Tap + to search for any SoCreate user and start a new conversation. You can message creators even before you follow each other.',
    iconName: 'create',
    spotlightPad: 6,
    spotlightRadius: 50,
  },
];


/* ═══════════════════════════════════════════════════════
   SETTINGS  (guideKey: 'tour_settings_v1')
   ═══════════════════════════════════════════════════════ */
export const SETTINGS_STEPS = [
  {
    positionStrategy: 'center',
    title: 'Settings & Preferences ⚙️',
    description:
      'Manage how SoCreate works for you — notifications, privacy, account security, and more.',
    iconName: 'settings',
  },
  {
    target: 'settings-notifications',
    title: 'Notification Preferences',
    description:
      'Control which events send you push notifications: new followers, likes, comments, messages, and platform announcements. Toggle each one individually.',
    iconName: 'bell',
    spotlightPad: 8,
  },
  {
    target: 'settings-privacy',
    title: 'Privacy Controls',
    description:
      'Switch between a public and private account. On a private account, new followers must be approved by you before they can see your ideas.',
    tip: 'Public accounts are discoverable in search and grow audiences faster. Private accounts give you full control over your audience.',
    iconName: 'lock',
    spotlightPad: 8,
  },
  {
    target: 'settings-account',
    title: 'Account & Security',
    description:
      'Change your password, manage connected Google login, and find the option to permanently delete your account if needed.',
    iconName: 'lock',
    spotlightPad: 8,
  },
  {
    target: 'settings-feedback',
    title: 'Send Feedback',
    description:
      'Rate your experience and tell us what to improve. Feedback is reviewed by the SoCreate team directly — we read every submission.',
    iconName: 'message',
    spotlightPad: 8,
  },
  {
    target: 'settings-blocked',
    title: 'Blocked Users',
    description:
      'See and manage your block list. Blocked users can\'t view your profile, ideas, or message you. You can unblock at any time.',
    iconName: 'lock',
    spotlightPad: 8,
  },
  {
    target: 'settings-logout',
    title: 'Log Out',
    description:
      'Sign out of your account safely. Your ideas and data are saved in the cloud — log back in any time from any device.',
    iconName: 'profile',
    spotlightPad: 8,
  },
];


/* ═══════════════════════════════════════════════════════
   PARTNERS PROGRAM  (guideKey: 'tour_partners_v1')
   ═══════════════════════════════════════════════════════ */
export const PARTNERS_PROGRAM_STEPS = [
  {
    positionStrategy: 'center',
    title: 'SoCreate Partners Program 🤝',
    description:
      'The Partners Program is SoCreate\'s structured path for creators to grow, get verified, and earn real income from their ideas. Here\'s how to apply.',
    iconName: 'explore',
  },
  {
    target: 'partners-deadline',
    title: 'Registration Deadline',
    description:
      'Applications close on a set date each cohort. The deadline is shown at the top — make sure to submit before it closes, as spots are limited.',
    iconName: 'bell',
    spotlightPad: 8,
  },
  {
    target: 'partners-form',
    title: 'Multi-Step Application',
    description:
      'The application is a 5-step form covering your background, goals, and subscription preference. Each step is quick — the whole form takes under 5 minutes.',
    iconName: 'tabs',
    spotlightPad: 8,
  },
  {
    target: 'partners-subscription',
    title: 'Choose Your Plan',
    description:
      'Select whether you\'re applying as a Creator Pro user (who publishes content) or a Reader Pro user (who primarily discovers content). Not sure? SoCreate will recommend the best fit.',
    iconName: 'premium',
    spotlightPad: 8,
  },
];


/* ═══════════════════════════════════════════════════════
   CREATOR PRO PAGE  (guideKey: 'tour_creator_pro_v1')
   ═══════════════════════════════════════════════════════ */
export const CREATOR_PRO_STEPS = [
  {
    positionStrategy: 'center',
    title: 'Creator Pro 🚀',
    description:
      'Creator Pro is SoCreate\'s subscription tier for serious creators. It unlocks everything you need to build an audience and start earning.',
    iconName: 'sparkle',
  },
  {
    target: 'creator-pro-features',
    title: 'What\'s Included',
    description:
      'Creator Pro gives you: premium publishing, analytics dashboard, creator verification eligibility, revenue sharing, a Creator Pro badge, and priority support.',
    iconName: 'check',
    spotlightPad: 8,
  },
  {
    target: 'creator-pro-price',
    title: 'Pricing',
    description:
      'Creator Pro is ₹199/month (billed monthly). You can cancel anytime — access continues until the end of your paid period.',
    iconName: 'dollar',
    spotlightPad: 8,
  },
  {
    target: 'creator-pro-subscribe',
    title: 'Subscribe Now',
    description:
      'Tap Subscribe to go through the Razorpay checkout. Payment is secure and your plan activates immediately after confirmation.',
    tip: 'If you\'re already subscribed, your plan status and renewal date appear at the top of this page.',
    iconName: 'sparkle',
    spotlightPad: 8,
  },
];


/* ═══════════════════════════════════════════════════════
   IDEA DETAIL  (guideKey: 'tour_idea_detail_v1')
   ═══════════════════════════════════════════════════════ */
export const IDEA_DETAIL_STEPS = [
  {
    positionStrategy: 'center',
    title: 'Reading an Idea 📖',
    description:
      'You\'re viewing a full idea post. Here\'s everything you can do with it beyond just reading.',
    iconName: 'idea',
  },
  {
    target: 'idea-like',
    title: 'Like',
    description:
      'Tap the heart to like an idea. Likes signal appreciation to the creator and improve the idea\'s ranking in the Trending feed.',
    iconName: 'heart',
    spotlightPad: 8,
    spotlightRadius: 50,
  },
  {
    target: 'idea-save',
    title: 'Save for Later',
    description:
      'Tap the bookmark icon to save an idea to your personal reading list. Access saved ideas any time from your Profile → Saved tab.',
    iconName: 'bookmark',
    spotlightPad: 8,
    spotlightRadius: 50,
  },
  {
    target: 'idea-share',
    title: 'Share',
    description:
      'Share any idea via a direct link, WhatsApp, or copy to clipboard. Sharing helps creators reach a wider audience.',
    iconName: 'share',
    spotlightPad: 8,
    spotlightRadius: 50,
  },
  {
    target: 'idea-follow',
    title: 'Follow the Creator',
    description:
      'Tap Follow on the creator\'s profile snippet to add them to your feed. Their new ideas will appear in your For You tab.',
    iconName: 'create',
    spotlightPad: 8,
  },
  {
    target: 'idea-comments',
    title: 'Comments',
    description:
      'Leave a comment to start a conversation with the creator. Comments are visible to all readers and help build community around ideas.',
    iconName: 'message',
    spotlightPad: 8,
  },
];