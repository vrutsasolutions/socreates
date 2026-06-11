import { useNavigate, useLocation } from 'react-router-dom';

const DEFAULT_MSG =
  'Your payment could not be processed. This may be due to insufficient funds or a network issue. Please try again.';

export default function MembershipFailed() {
  const navigate = useNavigate();
  const location = useLocation();
  const message  = location.state?.message || DEFAULT_MSG;

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* Header — matches Home */}
      <header className="bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
              onClick={() => navigate('/membership')}
              aria-label="Go back"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
          >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Payment Failed</h1>
        </div>

        {/* Floating status card */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-5 shadow-md flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FEE2E2] flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
              </svg>
            </div>
            <p className="text-white font-bold text-xl">Payment Unsuccessful</p>
            <p className="text-blue-200 text-sm mt-1">Your account has not been charged</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] px-4 pt-6 pb-12 space-y-4 flex-1">

          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl px-4 py-4">
            <p className="text-[#DC2626] text-sm leading-relaxed">{message}</p>
          </div>

          <button
            onClick={() => navigate('/membership')}
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40"
          >
            Try Again
          </button>

          <button
            onClick={() => navigate('/membership')}
            className="w-full bg-[#F0F6FF] hover:bg-[#DBEAFE] border border-[#BBDEFB] text-[#1565C0] font-bold py-4 rounded-2xl active:scale-95 transition-all"
          >
            Choose Different Method
          </button>
        </div>
      </div>
    </div>
  );
}