import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
};

const GATEWAY_LABEL = { razorpay: 'Razorpay', stripe: 'Stripe' };

export default function MembershipSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Prefer details passed from checkout, else fall back to the persisted membership.
  const m = location.state?.membership ?? user?.membership ?? {};
  const planRow = `${m.billing === 'yearly' ? 'Yearly' : 'Monthly'} — ${m.price || ''}`.trim();

  return (
    <div className="min-h-screen bg-[#1565C0] flex flex-col">

      {/* Hero */}
      <div className="px-6 pt-20 pb-12 text-center relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-48 h-48 rounded-full border-[32px] border-white/5 -top-20 -right-12" />
          <div className="absolute w-40 h-40 rounded-full border-[28px] border-white/5 -bottom-16 -left-10" />
        </div>
        <div className="relative z-10">
          <div className="mx-auto mb-6 w-24 h-24 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-[#4ADE80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-white text-3xl font-extrabold mb-2">You're Premium! 🎉</h1>
          <p className="text-blue-100 text-sm leading-relaxed max-w-xs mx-auto">
            Welcome to the premium experience. Enjoy exclusive ideas from top creators.
          </p>
        </div>
      </div>

      {/* Detail card */}
      <div className="bg-white rounded-t-[32px] flex-1 px-6 pt-7">
        <div className="divide-y divide-[#F0F2F8]">
          <Row label="Plan"      value={planRow} />
          <Row label="Status"    value={<span className="inline-flex items-center gap-1.5 text-[#16A34A]"><span className="w-2 h-2 rounded-full bg-[#16A34A]" />Active</span>} />
          <Row label="Renews on" value={fmtDate(m.renewsAt)} />
          <Row label="Payment"   value={GATEWAY_LABEL[m.gateway] ?? '—'} />
        </div>

        <button
          onClick={() => navigate('/premium')}
          className="mt-7 w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40 flex items-center justify-center gap-2">
          Start Exploring
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-[#90A4AE] text-sm">{label}</span>
      <span className="text-[#0D2137] text-sm font-bold">{value}</span>
    </div>
  );
}
