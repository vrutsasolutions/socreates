export const PRIVACY_SECTIONS = [
  {
    heading: 'Introduction',
    paragraph:
      `SoCreate is operated by Vrutsa Solutions ("SoCreate", "we", "us", "our"). This Privacy Policy explains what personal data we collect when you use the SoCreate website or mobile app, how we use and share it, and the rights you have, including under the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000.`,
  },
  {
    heading: 'Information You Give Us',
    bullets: [
      `Account details: name, username, email address, password (stored as a secure hash), and one-time passwords used to verify your email or reset your password.`,
      `Profile information: bio, profile photo, and the interests you select during onboarding.`,
      `Content: ideas, images, comments, likes, saves, and direct messages (including images, voice notes, and files you share in chat).`,
      `Subscription details: your chosen plan (Go Premium or Creators Pro), billing cycle, and payment confirmation identifiers returned by our payment gateways.`,
      `Payout details (creators only): your legal name, mobile number, and PAN, together with your bank account name, account number, and IFSC code. These are used to send your earnings and to meet tax and regulatory reporting obligations (such as TDS). We store your PAN and bank destination in masked form; we never display your full PAN. Payout disbursement is not yet active — see "How We Share Information" for details on when and how a payout partner will be engaged.`,
      `Support and verification information you provide, such as messages to our team or documents for creator verification.`,
    ],
  },
  {
    heading: 'Information Collected Automatically',
    bullets: [
      `Usage data: pages and ideas you view, features you use, likes, follows, and interactions used to compute creator engagement metrics.`,
      `Device and log data: device type, operating system, app version, IP address, approximate location derived from IP, timestamps, and error logs.`,
      `Notification and session data needed to deliver real-time features such as in-app notifications and chat.`,
    ],
  },
  {
    heading: 'Information from Third Parties',
    bullets: [
      `If you sign in with Google, we receive your name, email address, and profile photo from your Google account.`,
      `Our payment gateways (Razorpay) send us confirmation of successful payments, including order, payment, and subscription identifiers; we never receive or store your full card number, CVV.`,
    ],
  },
  {
    heading: 'How We Use Your Information',
    bullets: [
      `To create and secure your account, verify your email via OTP, and let you sign in.`,
      `To publish your ideas to other members, and to power comments, likes, follows, search, and direct messaging.`,
      `To process subscription payments, manage renewals and cancellations, and unlock premium content and creator tools.`,
      `To calculate Revenue Pool Sharing distributions, assess payout eligibility, and display creator earnings; once the payout service is activated, to process automatic payouts to your saved bank destination.`,
      `To meet tax and regulatory obligations, including using your PAN and legal name for TDS and payout reporting where applicable.`,
      `To provide AI features: when you use idea generation, enhancement, summarization, categorization, or the AI assistant, the text you submit is processed by our AI provider to return a result; we do not use your private messages to train AI models.`,
      `To recommend ideas and creators based on your interests and activity.`,
      `To send service notifications (in-app and email) about your account, payments, and security, and, with your consent, product updates.`,
      `To detect and prevent fraud, artificial engagement, abuse, and violations of our Terms of Service, and to comply with legal obligations.`,
    ],
  },
  {
    heading: 'How We Share Information',
    bullets: [
      `We do not sell your personal data or your ideas.`,
      `Ideas you post publicly, along with your username, profile photo, and follower counts, are visible to other members by design; direct messages are visible to their participants.`,
      `Payment processing: Razorpay processes subscription payments. We do not currently share creator payout details with any payout partner. When the payout service is activated, we will use a licensed payout provider (currently expected to be RazorpayX, Cashfree Payouts, or Easebuzz) to disburse earnings; each such provider acts under its own privacy policy.`,
      `Service providers: we use trusted infrastructure providers to host the Platform and database and to store and deliver uploaded images and media; they process data only on our instructions.`,
      `AI processing: prompts and content you submit to AI features are shared with Groq to generate the response.`,
      `Legal reasons: we may disclose information where required by law, court order, or a lawful request from government authorities, or to protect the rights, safety, and security of SoCreate and its members.`,
      `Business transfers: if SoCreate or Vrutsa Solutions is involved in a merger, acquisition, or asset sale, your data may be transferred subject to this policy.`,
    ],
  },
  {
    heading: 'Cookies and Similar Technologies',
    bullets: [
      `Essential cookies and local storage keep you signed in (session tokens) and keep chat, notifications, and payments working.`,
      `Analytics data helps us understand which ideas and features are used so we can improve the Platform.`,
      `You can manage cookies through your browser settings; blocking essential cookies may prevent sign-in and core features from working.`,
    ],
  },
  {
    heading: 'Data Retention',
    bullets: [
      `Account, profile, and content data is retained while your account is active.`,
      `If you delete a post, a message (for everyone), or your account, we delete or de-identify the associated data within a reasonable period, except where a copy must be retained for legal, tax, accounting, fraud-prevention, or dispute purposes.`,
      `Payment and payout records, including PAN and payout destination data, are retained as required by Indian tax and financial regulations.`,
      `Backups are purged on a rolling schedule after deletion.`,
    ],
  },
  {
    heading: 'Security',
    bullets: [
      `Data is encrypted in transit (HTTPS/TLS) and at rest.`,
      `Passwords are stored as salted hashes, and payment card details never touch our servers.`,
      `Access to personal data is restricted to authorized personnel on a need-to-know basis.`,
      `Profiles are verified server-side before any premium access or payout is granted.`,
      `No system is completely secure; if we become aware of a personal data breach affecting you, we will notify you and the relevant authorities as required by law.`,
    ],
  },
  {
    heading: 'Child Safety',
    paragraph:
      `SoCreate is committed to providing a safe environment for all users and maintains a zero-tolerance policy against child sexual abuse and exploitation (CSAE), child sexual abuse material (CSAM), grooming, or any content or behavior that endangers minors. We actively investigate reports, remove violating content, suspend or terminate offending accounts, and cooperate with law enforcement authorities where required by applicable law. Our platform also provides reporting mechanisms that allow users to report content or accounts that may involve child safety concerns. For detailed information about our child safety policies, reporting process, enforcement actions, and designated contact point, please visit our Child Safety Standards page below.`,
    link: { to: '/child-safety', label: 'View Child Safety Standards' },
  },
  // NOTE: Child Safety is intentionally its own section directly beneath
  // Security (not a new top-level nav tab) — Settings still only links to
  // Privacy Policy / Terms / Refund; this section is how users reach it.
  {
    heading: 'Your Rights',
    bullets: [
      `Access: request a summary of the personal data we hold about you and how it is processed.`,
      `Correction and completion: update your profile at any time from Settings, or ask us to correct inaccurate data.`,
      `Erasure: delete individual ideas, comments, or messages, or delete your entire account from Settings; you may also write to us to request erasure.`,
      `Withdraw consent: where processing is based on consent (such as optional marketing emails), you can withdraw it at any time without affecting prior processing.`,
    ],
  },
  {
    heading: 'International Transfers',
    paragraph:
      `Our service providers (such as cloud hosting, media storage, payment, and AI providers) may process data on servers located outside India. Where data is transferred internationally, we take reasonable steps, consistent with the DPDP Act, to ensure it receives an adequate standard of protection.`,
  },
  {
    heading: 'Changes to this Policy',
    paragraph:
      `We may update this Privacy Policy from time to time. Material changes will be notified in-app or by email before they take effect, and the "Last updated" date above will be revised. Continued use of the Platform after the effective date constitutes acceptance of the updated policy.`,
  },
  {
    heading: 'Contact Us',
    paragraph:
      `For privacy questions, requests, or complaints, Contact Us at contact@vrutsasolutions.com.`,
  },
];