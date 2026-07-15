import LegalPage from '../components/common/LegalPage';
import { TERMS_SECTIONS } from '../constants/termsContent';

export default function TermsOfService() {
  return <LegalPage title="Terms of Service" sections={TERMS_SECTIONS} />;
}