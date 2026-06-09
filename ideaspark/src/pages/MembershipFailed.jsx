import { useNavigate, useLocation } from 'react-router-dom';

const DEFAULT_MSG =
  'Your payment could not be processed. This may be due to insufficient funds or a network issue. Please try again.';

export default function MembershipFailed() {
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message || DEFAULT_MSG;

  return (
    <div className="min-h-screen bg-[#1565C0] flex flex-col">

      {/* Hero */}
      <div className="px-6 pt-20 pb-12 text-center relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-48 h-48 rounded-full border-[32px] border-white/5 -top-20 -right-12" />
          <div className="absolute w-40 h-40 rounded-full border-[28px] border-white/5 -bottom-16 -left-10" />
        </div>
        <div className="relative z-10">
          <div className="mx-auto mb-6 w-24 h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-[#F87171]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </div>
          <h1 className="text-white text-3xl font-extrabold mb-2">Payment Failed</h1>
          <p className="text-blue-100 text-sm">Something went wrong with your payment</p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-t-[32px] flex-1 px-6 pt-7 space-y-4">
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl px-4 py-4">
          <p className="text-[#DC2626] text-sm leading-relaxed">{message}</p>
        </div>

        <button
          onClick={() => navigate('/membership')}
          className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40">
          Try Again
        </button>

        <button
          onClick={() => navigate('/membership')}
          className="w-full bg-[#F0F6FF] hover:bg-[#DBEAFE] border border-[#BBDEFB] text-[#1565C0] font-bold py-4 rounded-2xl active:scale-95 transition-all">
          Choose Different Method
        </button>
      </div>
    </div>
  );
}
