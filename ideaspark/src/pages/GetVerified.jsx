// ════════════════════════════════════════════════════════════════════════
//  GetVerified — onboarding Step 3 of 3 ("One last thing")
//  Verification is no longer a separate review flow: it's granted by paying
//  for any membership. This step explains that and sends the user to the
//  Membership page. Skippable — they can subscribe later from their profile.
// ════════════════════════════════════════════════════════════════════════
import { useNavigate } from 'react-router-dom';

export default function GetVerified() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* Header with step indicator */}
      <header className="bg-[#1565C0] px-6 pt-6 pb-8 relative overflow-hidden shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="relative z-10">
          <div className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-3">
            Step 3 of 3
          </div>
          <div className="flex gap-2 mb-5">
            <div className="flex-1 h-1 bg-white rounded-full" />
            <div className="flex-1 h-1 bg-white rounded-full" />
            <div className="flex-1 h-1 bg-[#F59E0B] rounded-full" />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">One last thing</h1>
        </div>
      </header>

      <div className="flex-1 px-6 pt-10 flex flex-col items-center text-center">

        {/* Badge icon */}
        <div className="w-20 h-20 rounded-full bg-[#E3F2FD] flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#F59E0B] flex items-center justify-center shadow-md">
            <svg className="w-8 h-8 text-[#78350F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-[#0D2137] text-2xl font-bold mb-2">Get verified</h2>
        <p className="text-[#546E7A] text-sm leading-relaxed max-w-xs">
          Verified users get a blue badge, more visibility, and build trust with
          their audience instantly.
        </p>

        <span className="mt-4 inline-flex items-center gap-1.5 bg-[#E7F8EE] text-[#15803D] text-sm font-bold px-4 py-1.5 rounded-full">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Verified
        </span>

        {/* How it works */}
        <div className="mt-7 w-full bg-white rounded-2xl border border-[#E3F2FD] p-4 text-left shadow-sm">
          <p className="text-[#0D2137] font-bold text-sm mb-4">How verification works</p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-[#EAF2FF] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#1565C0]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z" />
                </svg>
              </span>
              <p className="text-[#546E7A] text-sm leading-snug">
                Verification is included free with Premium or Creators Pro
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-[#FFF8EC] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#F59E0B]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                </svg>
              </span>
              <p className="text-[#546E7A] text-sm leading-snug">
                Your badge appears instantly after payment is confirmed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-6 pb-8 pt-4">
        <button
          onClick={() => navigate('/membership')}
          className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-lg shadow-blue-300/40 flex items-center justify-center gap-2 text-[15px]"
        >
          Get Verified — Continue
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>

        <button
          onClick={() => navigate('/home')}
          className="w-full text-[#546E7A] font-semibold py-3 text-sm mt-1"
        >
          Skip for now
        </button>

        <p className="text-center text-[#90A4AE] text-xs mt-1">
          You can verify your account anytime from your profile
        </p>
      </div>
    </div>
  );
}
