import LegalPage from '../components/common/LegalPage';

const SECTIONS = [
  {
    heading: 'Introduction',
    paragraph:
      `SoCreate is operated by Vrutsa Solutions, Chennai, Tamil Nadu, India ("SoCreate", "we", "us", "our"). This Privacy Policy explains what personal data we collect when you use the SoCreate website or mobile app, how we use and share it, and the rights you have, including under the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000.`,
  },
  {
    heading: 'Information you give us',
    bullets: [
      `Account details: name, username, email address, password (stored as a secure hash), and one-time passwords used to verify your email or reset your password.`,
      `Profile information: bio, profile photo, and the interests you select during onboarding.`,
      `Content: ideas, images, comments, likes, saves, and direct messages (including images, voice notes, and files you share in chat).`,
      `Subscription details: your chosen plan (Go Premium or Creators Pro), billing cycle, and payment confirmation identifiers returned by our payment gateways.`,
      `Payout details (creators only): your UPI ID or bank account name, account number, and IFSC code, used solely to send your earnings; we store the destination in masked form together with the fund-account references created with our payout partner.`,
      `Support and verification information you provide, such as messages to our team or documents for creator verification.`,
    ],
  },
  {
    heading: 'Information collected automatically',
    bullets: [
      `Usage data: pages and ideas you view, features you use, likes, follows, and interactions used to compute creator engagement metrics.`,
      `Device and log data: device type, operating system, app version, IP address, approximate location derived from IP, timestamps, and error logs.`,
      `Notification and session data needed to deliver real-time features such as in-app notifications and chat.`,
    ],
  },
  {
    heading: 'Information from third parties',
    bullets: [
      `If you sign in with Google, we receive your name, email address, and profile photo from your Google account.`,
      `Our payment gateways (Razorpay and Stripe) send us confirmation of successful payments, including order, payment, and subscription identifiers; we never receive or store your full card number, CVV, or UPI PIN.`,
    ],
  },
  {
    heading: 'How we use your information',
    bullets: [
      `To create and secure your account, verify your email via OTP, and let you sign in.`,
      `To publish your ideas to other members, and to power comments, likes, follows, search, and direct messaging.`,
      `To process subscription payments, manage renewals and cancellations, and unlock premium content and creator tools.`,
      `To calculate Revenue Pool Sharing distributions, display creator earnings, and process payouts to your saved UPI or bank destination.`,
      `To provide AI features: when you use idea generation, enhancement, summarization, categorization, or the AI assistant, the text you submit is processed by our AI provider (Google Gemini) to return a result; we do not use your private messages to train AI models.`,
      `To recommend ideas and creators based on your interests and activity.`,
      `To send service notifications (in-app and email) about your account, payments, and security, and, with your consent, product updates.`,
      `To detect and prevent fraud, artificial engagement, abuse, and violations of our Terms of Service, and to comply with legal obligations.`,
    ],
  },
  {
    heading: 'How we share information',
    bullets: [
      `We do not sell your personal data or your ideas.`,
      `Ideas you post publicly, along with your username, profile photo, and follower counts, are visible to other members by design; direct messages are visible to their participants.`,
      `Payment processing: Razorpay and Stripe process subscription payments; RazorpayX processes creator payouts; each acts under its own privacy policy.`,
      `Service providers: we use trusted infrastructure providers to host the Platform and database (including Supabase) and to store and deliver uploaded images and media (Cloudflare); they process data only on our instructions.`,
      `AI processing: prompts and content you submit to AI features are shared with Google (Gemini API) to generate the response.`,
      `Legal reasons: we may disclose information where required by law, court order, or a lawful request from government authorities, or to protect the rights, safety, and security of SoCreate and its members.`,
      `Business transfers: if SoCreate or Vrutsa Solutions is involved in a merger, acquisition, or asset sale, your data may be transferred subject to this policy.`,
    ],
  },
  {
    heading: 'Cookies and similar technologies',
    bullets: [
      `Essential cookies and local storage keep you signed in (session tokens) and keep chat, notifications, and payments working.`,
      `Analytics data helps us understand which ideas and features are used so we can improve the Platform.`,
      `You can manage cookies through your browser settings; blocking essential cookies may prevent sign-in and core features from working.`,
    ],
  },
  {
    heading: 'Data retention',
    bullets: [
      `Account, profile, and content data is retained while your account is active.`,
      `If you delete a post, a message (for everyone), or your account, we delete or de-identify the associated data within a reasonable period, except where a copy must be retained for legal, tax, accounting, fraud-prevention, or dispute purposes.`,
      `Payment and payout records are retained as required by Indian tax and financial regulations.`,
      `Backups are purged on a rolling schedule after deletion.`,
    ],
  },
  {
    heading: 'Security',
    bullets: [
      `Data is encrypted in transit (HTTPS/TLS) and at rest.`,
      `Passwords are stored as salted hashes, and payment card details never touch our servers.`,
      `Access to personal data is restricted to authorized personnel on a need-to-know basis.`,
      `Payment signatures are verified server-side before any premium access or payout is granted.`,
      `No system is completely secure; if we become aware of a personal data breach affecting you, we will notify you and the relevant authorities as required by law.`,
    ],
  },
  {
    heading: 'Your rights',
    bullets: [
      `Access: request a summary of the personal data we hold about you and how it is processed.`,
      `Correction and completion: update your profile at any time from Settings, or ask us to correct inaccurate data.`,
      `Erasure: delete individual ideas, comments, or messages, or delete your entire account from Settings; you may also write to us to request erasure.`,
      `Withdraw consent: where processing is based on consent (such as optional marketing emails), you can withdraw it at any time without affecting prior processing.`,
      `Grievance redressal: you may raise a complaint with our Grievance Officer (contact below); if unresolved, you may approach the Data Protection Board of India under the DPDP Act.`,
      `Nomination: under the DPDP Act, you may nominate a person to exercise these rights on your behalf in the event of death or incapacity.`,
    ],
  },
  {
    heading: 'Children',
    paragraph:
      `SoCreate is not intended for children under 13, and users under 18 may not purchase subscriptions or receive payouts without the consent of a parent or legal guardian. We do not knowingly collect personal data from children in violation of applicable law; if you believe a child has provided us data, contact us and we will delete it.`,
  },
  {
    heading: 'International transfers',
    paragraph:
      `Our service providers (such as cloud hosting, media storage, payment, and AI providers) may process data on servers located outside India. Where data is transferred internationally, we take reasonable steps, consistent with the DPDP Act, to ensure it receives an adequate standard of protection.`,
  },
  {
    heading: 'Changes to this policy',
    paragraph:
      `We may update this Privacy Policy from time to time. Material changes will be notified in-app or by email before they take effect, and the "Last updated" date above will be revised. Continued use of the Platform after the effective date constitutes acceptance of the updated policy.`,
  },
  {
    heading: 'Contact and Grievance Officer',
    paragraph:
      `For privacy questions, requests, or complaints, contact our Grievance Officer at privacy@socreate.com, or write to Vrutsa Solutions, Chennai, Tamil Nadu, India. We aim to acknowledge grievances within 72 hours and resolve them within the timelines prescribed under applicable law.`,
  },
];

export default function PrivacyPolicy() {
  return <LegalPage title="Privacy Policy" lastUpdated="July 3, 2026" sections={SECTIONS} />;
}
