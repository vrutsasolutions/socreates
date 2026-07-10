import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasCreatorPro } from '../api/paymentApi';
import Icon from '../components/common/Icon';

/* Creator Pro plan (monthly). Kept here so the landing page is self-contained. */
const CREATOR_PRO = {
  plan: 'creator',
  billing: 'monthly',
  planLabel: 'Creator Pro',
  price: '₹199',
};

const PRO_FEATURES = [
  'Publish Premium Ideas',
  'Creator Analytics Dashboard',
  'Apply for Creator Verification',
  'Eligible for Revenue Sharing',
  'Creator Pro Badge',
  'Creator Insights',
  'Early Access to New Features',
  'Priority Creator Support',
];

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
};

export default function CreatorPro() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isPro = hasCreatorPro(user);

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-12">
<header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
    <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
  </div>

  <div className="flex items-center gap-3 relative z-10">
   <button
           onClick={() => navigate(-1)}
               aria-label="Go back"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
         >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
             </svg>
        </button>
    <h1 className="text-white font-bold text-lg flex-1">Creator Pro</h1>
  </div>

  <div className="relative z-10 mt-5 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4 text-center">
    <p className="text-blue-200 text-sm">
      {isPro ? 'Your creator account' : 'Unlock your full creator potential'} 🚀
    </p>
    <p className="text-white font-bold text-lg mt-1">
      {isPro ? 'Creator Pro' : 'Become a Creator Pro'}
    </p>
  </div>
</header>
      {/* Body */}
     <div className="bg-[#1565C0]">
  <div className="bg-white rounded-t-[32px] px-4 pt-6 pb-12">
    {isPro
      ? <ActiveState user={user} navigate={navigate} />
      : <UpgradeState navigate={navigate} />}
  </div>
</div>
</div>
  );
}

/* ── Not subscribed: landing / upgrade (image 1) ─────────────────── */
function UpgradeState({ navigate }) {
  return (
    <>
      <div className="bg-white rounded-3xl shadow-md px-5 pt-6 pb-6">
        <div className="space-y-3.5">
          {PRO_FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-3 text-[#374151] text-sm">
              <Icon name="check" className="w-4 h-4 text-[#1565C0] shrink-0 mt-0.5" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => navigate('/membership?plan=creator&billing=monthly')}
        className="mt-6 w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40 flex items-center justify-center gap-2">
        Upgrade to Creator Pro — {CREATOR_PRO.price}/mo
      </button>

      <p className="text-[#90A4AE] text-xs text-center mt-3">Cancel anytime · No hidden fees</p>
    </>
  );
}

/* ── Subscribed: active status (image 2) ─────────────────────────── */
function ActiveState({ user, navigate }) {
  const m       = user?.membership ?? {};
  const billing = m.billing === 'yearly' ? 'Yearly' : 'Monthly';
  const price   = m.price || CREATOR_PRO.price;
  const period  = m.billing === 'yearly' ? 'year' : 'month';
  const s       = m.creatorStats ?? { reads: 1240, saves: 89, followers: 34, premiumPosts: 6 };

  return (
    <>
      {/* Subscription summary */}
      <div className="bg-white rounded-2xl border-2 border-[#1565C0] shadow-md px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[#1565C0] font-bold">Creator Pro · {billing}</div>
            <div className="text-[#90A4AE] text-xs mt-1">{price}/{period} · Renews {fmtDate(m.renewsAt)}</div>
            <div className="text-[#16A34A] text-xs font-semibold mt-1 flex items-center gap-1">
              Premium publishing enabled <Icon name="check" className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="bg-[#DCFCE7] text-[#15803D] text-[10px] font-bold px-2.5 py-1 rounded-full">Active</span>
        </div>
      </div>

      {/* Stats this month */}
      <h2 className="text-[#90A4AE] text-xs font-semibold uppercase tracking-wider mt-6 mb-2.5 px-1">
        Your stats this month
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <ProStat icon="eye"      value={s.reads.toLocaleString('en-IN')} label="Total Reads" />
        <ProStat icon="bookmark" value={s.saves}        label="Saves" />
        <ProStat icon="user"     value={s.followers}    label="New Followers" />
        <ProStat icon="lightbulb" value={s.premiumPosts} label="Premium Posts" />
      </div>

      <button onClick={() => navigate('/creator-dashboard')}
        className="mt-6 w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40">
        Go to Dashboard
      </button>
    </>
  );
}

function ProStat({ icon, value, label }) {
  return (
    <div className="bg-[#F0F6FF] border border-[#E3F2FD] rounded-2xl p-4">
      <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2">
        <Icon name={icon} className="w-4 h-4 text-[#1565C0]" />
      </span>
      <div className="text-[#0D2137] text-xl font-extrabold">{value}</div>
      <div className="text-[#90A4AE] text-xs mt-0.5">{label}</div>
    </div>
  );
}
