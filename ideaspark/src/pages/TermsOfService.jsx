import LegalPage from '../components/common/LegalPage';

const SECTIONS = [
  {
    heading: 'Acceptance of terms',
    paragraph:
      "By creating an account or using SoCreate, you agree to be bound by these terms. If you don't agree, please don't use the platform.",
  },
  {
    heading: 'User accounts',
    bullets: [
      "You're responsible for keeping your login secure",
      'One account per person, no impersonating other members',
    ],
  },
  {
    heading: 'Posting ideas',
    bullets: [
      'You keep ownership of ideas you post',
      'You grant SoCreate a license to display your ideas to other members',
      "Don't post ideas that infringe someone else's rights",
    ],
  },
  {
    heading: 'Premium subscription',
    bullets: [
      'Premium unlocks early access to new ideas and premium-only ideas',
      'Premium includes creative tools for posting and monetizing your ideas',
      'Billed on a recurring basis until you cancel',
    ],
  },
  {
    heading: 'Monetizing ideas',
    bullets: [
      'You can offer your ideas for paid access or collaboration on the platform',
      'SoCreate may take a service fee on monetized ideas, shown at checkout',
    ],
  },
  {
    heading: 'Community conduct',
    bullets: [
      'Be respectful in chat and comments with fellow members',
      "No harassment, spam, or scraping other members' ideas",
    ],
  },
  {
    heading: 'Intellectual property',
    paragraph:
      "SoCreate's brand, design, and platform code are owned by us or our licensors. Using the service doesn't transfer any ownership rights to you.",
  },
  {
    heading: 'Limitation of liability',
    paragraph:
      'The service is provided "as is". To the extent permitted by law, we aren\'t liable for indirect or consequential damages.',
  },
  {
    heading: 'Contact us',
    paragraph: 'Questions about these terms can be sent to legal@socreate.com.',
  },
];

export default function TermsOfService() {
  return <LegalPage title="Terms of Service" lastUpdated="June 29, 2026" sections={SECTIONS} />;
}
