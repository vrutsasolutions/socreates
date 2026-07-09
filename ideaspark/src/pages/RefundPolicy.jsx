import LegalPage from '../components/common/LegalPage';

const SECTIONS = [
  {
    heading: 'Refund Policy',
    bullets: [
      `Subscription payments are non-refundable after activation.`,
      `Refunds are provided only for failed service delivery.`,
      `Cancellation requests must be submitted to support within a specified time.`,
      `Approved refunds will be credited to the original payment method within 5–7 business days.`,
    ],
  },
  {
    heading: 'Contact us',
    paragraph:
      `For any refund-related queries, contact us at vrutsasolutions@gmail.com.`,
  },
];

export default function RefundPolicy() {
  return <LegalPage title="Refund Policy" sections={SECTIONS} />;
}
