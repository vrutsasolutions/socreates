import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MembershipSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const m         = location.state?.membership ?? user?.membership ?? {};
  const planLabel = m.planLabel || (m.plan === 'creator' ? 'Creators Pro' : 'Premium');
  const isCreator = m.plan === 'creator';

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-6 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={() => navigate('/home')} aria-label="Go home"
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
        <div className="w-28 h-28 rounded-full bg-[#E7F8EE] flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#16A34A] flex items-center justify-center shadow-lg shadow-green-200">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-[#0D2137] text-2xl font-bold mb-2">You're now {planLabel}!</h2>
        <p className="text-[#90A4AE] text-sm leading-relaxed max-w-xs">
          Payment successful. Your badges have been added to your profile.
        </p>

        {/* Badges */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-[#E7F8EE] text-[#15803D] text-sm font-bold px-4 py-1.5 rounded-full">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Verified
          </span>
          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] text-sm font-bold px-4 py-1.5 rounded-full shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z" />
            </svg>
            {isCreator ? 'Creator Pro' : 'Premium'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-12 pt-6">
        <button onClick={() => navigate('/home')}
          className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40 flex items-center justify-center gap-2 text-[15px]">
          Go to Home
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}