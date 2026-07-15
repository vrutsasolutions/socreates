import LegalPage from '../components/common/LegalPage';
import { PRIVACY_SECTIONS } from '../constants/privacyContent';

export default function PrivacyPolicy() {
  return <LegalPage title="Privacy Policy" sections={PRIVACY_SECTIONS} />;
}