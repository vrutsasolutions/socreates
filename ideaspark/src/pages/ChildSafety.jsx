import LegalPage from '../components/common/LegalPage';
import { CHILD_SAFETY_SECTIONS } from '../constants/childSafetyContent';

export default function ChildSafety() {
  return <LegalPage title="Child Safety Standards" sections={CHILD_SAFETY_SECTIONS} />;
}