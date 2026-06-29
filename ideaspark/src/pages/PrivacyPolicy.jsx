import LegalPage from '../components/common/LegalPage';

const SECTIONS = [
  {
    heading: 'Introduction',
    paragraph:
      'SoCreate ("we", "us") respects your privacy. This policy explains what we collect when you browse, post, and discuss ideas on the platform.',
  },
  {
    heading: 'Information we collect',
    bullets: [
      'Account details such as name, email, and payment info for premium plans',
      'Ideas, comments, and chat messages you post on the platform',
      'Usage data like device type, log files, and approximate location',
    ],
  },
  {
    heading: 'How we use it',
    bullets: [
      'To show your ideas to other members and power chat between users',
      'To process premium subscription billing and unlock early access',
      'To recommend ideas and creators you might be interested in',
    ],
  },
  {
    heading: 'Cookies and tracking',
    bullets: [
      'Essential cookies keep the site and chat working',
      'Analytics cookies show us which ideas and features get used',
      'You can manage cookie preferences from your browser at any time',
    ],
  },
  {
    heading: 'Sharing information',
    bullets: [
      "We don't sell your personal data or your ideas",
      'Payment processors handle premium subscription billing for us',
      'Ideas you post publicly are visible to other members by design',
    ],
  },
  {
    heading: 'Retention and security',
    bullets: [
      'Data is encrypted in transit and at rest',
      'We keep account and idea data only as long as your account is active',
    ],
  },
  {
    heading: 'Your rights',
    bullets: [
      'Request access, correction, deletion, or export of your data',
      "Take down an idea or comment you've posted at any time",
    ],
  },
  {
    heading: 'Contact us',
    paragraph: 'Questions about this policy can be sent to privacy@socreate.com.',
  },
];

export default function PrivacyPolicy() {
  return <LegalPage title="Privacy Policy" lastUpdated="June 29, 2026" sections={SECTIONS} />;
}
