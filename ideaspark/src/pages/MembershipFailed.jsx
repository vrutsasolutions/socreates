import { useNavigate, useLocation } from 'react-router-dom';

const DEFAULT_MSG =
  'Your payment could not be processed. This may be due to insufficient funds or a network issue. Please try again.';

export default function MembershipFailed() {
  const navigate = useNavigate();
  const location = useLocation();
  const s = location.state || {};
  const message = s.message || DEFAULT_MSG;

  // Plan summary line, e.g. "CREATORS PRO · YEARLY · ₹999".
  const summary = [s.planLabel, s.billing, s.price]
    .filter(Boolean)
    .map((x) => String(x).toUpperCase())
    .join(' · ');

  // Re-enter Checkout with the same order; the chosen gateway runs automatically.
  const retry = (gateway) =>
    s.plan
      ? navigate('/membership/checkout', {
          state: {
            plan: s.plan, billing: s.billing, planLabel: s.planLabel, price: s.price,
            retryGateway: gateway,
          },
        })
      : navigate('/membership');

  // replace: true swaps this "Payment Failed" entry out of the history stack
  // instead of pushing a new /membership entry on top of it. Without this,
  // pressing back after leaving this screen would return here again instead
  // of skipping past it — the failure screen would loop back on itself.
  const backToMembership = () => navigate('/membership', { replace: true });

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-6 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={backToMembership} aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Membership</h1>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center text-center px-6 pt-16">
        <div className="w-28 h-28 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#DC2626] flex items-center justify-center shadow-lg shadow-red-200">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </div>
        </div>

        <h2 className="text-[#0D2137] text-2xl font-bold mb-5">Payment Failed</h2>

        <div className="w-full bg-[#FEF2F2] border border-[#FECACA] rounded-2xl px-4 py-3 mb-5">
          <p className="text-[#DC2626] text-sm leading-relaxed">{message}</p>
        </div>

        {summary && (
          <p className="text-[#90A4AE] text-xs font-bold tracking-widest mb-4">{summary}</p>
        )}

        <div className="w-full space-y-3">
          <button onClick={() => retry('razorpay')}
            className="w-full text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40 text-[15px]"
            style={{ background: 'linear-gradient(135deg, #4F8EF7, #3B6FE0)' }}>
            Retry with Razorpay
          </button>
        </div>

        <button onClick={backToMembership}
          className="text-[#90A4AE] font-semibold py-4 text-sm">
          Cancel and go back
        </button>
      </div>
    </div>
  );
}