import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
};

const GATEWAY_LABEL = { razorpay: 'Razorpay', stripe: 'Stripe' };

export default function MembershipSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const m       = location.state?.membership ?? user?.membership ?? {};
  const planRow = `${m.billing === 'yearly' ? 'Yearly' : 'Monthly'}${m.price ? ' — ' + m.price : ''}`.trim();

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* Header — matches Home */}
      <header className="bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <div className="relative z-10 flex items-center gap-3"> 
          <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
          >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
          </button>
          <div className="w-9" /> {/* spacer to centre the title */}
          <h1 className="text-white font-bold text-lg flex-1 text-center">Payment Successful</h1>
          <div className="w-9" />
        </div>

        {/* Floating status card */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-5 shadow-md flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#DCFCE7] flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-bold text-xl">You're Premium! 🎉</p>
            <p className="text-blue-200 text-sm mt-1">Welcome to the premium experience</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] px-4 pt-6 pb-12">

          <div className="divide-y divide-[#F0F2F8]">
            <Row label="Plan"      value={planRow} />
            <Row label="Status"    value={
              <span className="inline-flex items-center gap-1.5 text-[#16A34A] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" />Active
              </span>
            } />
            <Row label="Renews on" value={fmtDate(m.renewsAt)} />
            <Row label="Payment"   value={GATEWAY_LABEL[m.gateway] ?? '—'} />
          </div>

          <button
            onClick={() => navigate('/premium')}
            className="mt-7 w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40 flex items-center justify-center gap-2"
          >
            Start Exploring
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
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