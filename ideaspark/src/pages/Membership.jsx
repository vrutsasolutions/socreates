import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cancelMembership } from '../api/paymentApi';
import Icon from '../components/common/Icon';

/* ── Plans ─────────────────────────────────────────────────────
   Two tiers (Readers / Creators), each with monthly + yearly pricing.
   The Monthly/Yearly toggle swaps the price block; the selected card
   + billing period are what the payment buttons charge.
   ────────────────────────────────────────────────────────────── */
const PLANS = [
  {
    id: 'reader',
    eyebrow: 'READERS',
    label: 'Go Premium',
    subtitle: 'For idea enthusiasts',
    accent: 'blue',
    cta: 'Get Premium',
    monthly: { price: '₹99',  note: '₹99/mo billed monthly' },
    yearly:  { price: '₹799', note: '₹66/mo billed yearly' },
    features: [
      'Unlimited Premium Ideas',
      'Premium Reader Badge',
      'Exclusive Creator Content',
      'Early Feature Access',
      'Support Verified Creators',
    ],
  },
  {
    id: 'creator',
    eyebrow: 'CREATORS',
    label: 'Creators Pro',
    subtitle: 'For idea builders',
    accent: 'purple',
    badge: 'Popular',
    cta: 'Get Creators Pro',
    monthly: { price: '₹199',  note: '₹199/mo billed monthly' },
    yearly:  { price: '₹999', note: '₹83/mo billed yearly' },
    features: [
      'Unlimited Premium Ideas',
      'Premium Reader Badge',
      'Exclusive Creator Content',
      'Early Feature Access',
      'Support Verified Creators',
    ],
  },
];

export default function Membership() {
  const navigate        = useNavigate();
  const { user, login } = useAuth();
  const [params]        = useSearchParams();
  // A ?plan= deep link (e.g. from the "Upgrade to Creator Pro" publish gate)
  // pre-selects and visually emphasizes that tile.
  const emphasizedPlan  = ['reader', 'creator'].includes(params.get('plan')) ? params.get('plan') : null;
  // An optional ?billing= deep link picks the monthly/yearly toggle on arrival.
  const deepLinkBilling = ['monthly', 'yearly'].includes(params.get('billing')) ? params.get('billing') : null;

  const [period, setPeriod]       = useState(deepLinkBilling || 'yearly');
  const [selected, setSelected]   = useState(emphasizedPlan || 'creator');
  const [emphasize, setEmphasize] = useState(!!emphasizedPlan);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const emphasizedRef = useRef(null);

  const selectedPlan = PLANS.find((p) => p.id === selected);

  // On arrival via ?plan=, scroll the emphasized tile into view and let its
  // highlight pulse briefly, then settle back to the normal selected state.
  useEffect(() => {
    if (!emphasizedPlan) return;
    emphasizedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setEmphasize(false), 2600);
    return () => clearTimeout(t);
  }, [emphasizedPlan]);

  // Plan selection hands off to the Checkout page, which confirms the order and
  // runs the chosen gateway. We pass the selected plan + billing via route state.
  const goCheckout = () => {
    navigate('/membership/checkout', {
      state: {
        plan:      selected,
        billing:   period,
        planLabel: selectedPlan.label,
        price:     selectedPlan[period].price,
        features:  selectedPlan.features,
      },
    });
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel your membership? You will lose premium access.')) return;
    setLoading(true); setError('');
    try {
      const { data } = await cancelMembership();
      login(data.user, localStorage.getItem('token'));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel membership. Please try again.');
    }
    setLoading(false);
  };

  // ── Active-member view ─────────────────────────────────────────────
  if (user?.isPremium) {
    return <ActiveMembership user={user} loading={loading} error={error} onCancel={handleCancel} navigate={navigate} />;
  }

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-10">

      {/* Header — consistent with Home/Inbox */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-6
                         relative shadow-lg border-b border-white/10 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={() => navigate(-1)} aria-label="Go back"
                  className="w-9 h-9 flex items-center justify-center rounded-full
                             bg-white/15 text-white hover:bg-white/25
                             active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Membership</h1>
        </div>
      </header>

      {/* ── BODY — curved top matching Home.jsx ── */}
      <div className="bg-[#1565C0]">
        <div className="bg-[#F4F7FF] rounded-t-[32px] px-4 pt-7 space-y-6">

          {/* Hero */}
          <div className="text-center">
            <div className="mb-3 flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#DBEAFE]
                              flex items-center justify-center
                              shadow-sm">
                <Icon name="gem" className="w-8 h-8 text-[#1565C0]" />
              </div>
            </div>
            <h2 className="text-[#0D2137] text-2xl font-bold mb-1">
              Unlock the full platform
            </h2>
            <p className="text-[#90A4AE] text-sm">Choose the plan that fits you</p>
          </div>

          {/* Monthly / Yearly toggle */}
          <div className="relative flex bg-white border border-[#DBEAFE]
                          rounded-2xl p-1 shadow-sm">
            <span
              className="absolute top-1 bottom-1 w-1/2 rounded-xl bg-[#1565C0]
                         shadow-md transition-transform duration-300"
              style={{ transform: period === 'yearly' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            {['monthly', 'yearly'].map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                      className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm
                                  font-bold capitalize transition-colors
                                  flex items-center justify-center gap-1.5
                                  ${period === p ? 'text-white' : 'text-[#546E7A]'}`}>
                {p}
                {p === 'yearly' && (
                  <span className={`text-[10px] font-bold normal-case
                                    ${period === p ? 'text-green-300' : 'text-[#16A34A]'}`}>
                    save more
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Plan cards */}
          <style>{`
            @keyframes sc-plan-emph {
              0%   { box-shadow: 0 0 0 0 var(--emph-color); }
              70%  { box-shadow: 0 0 0 12px transparent; }
              100% { box-shadow: 0 0 0 0 transparent; }
            }
            .sc-plan-emphasis { animation: sc-plan-emph 1.3s ease-out 2; }
          `}</style>

          <div className="grid grid-cols-2 gap-3">
            {PLANS.map((plan) => {
              const isSel    = selected === plan.id;
              const isPurple = plan.accent === 'purple';
              const isEmph   = emphasize && plan.id === emphasizedPlan;
              const ring     = isSel
                ? (isPurple
                    ? 'border-[#7C3AED] shadow-lg shadow-purple-200/50'
                    : 'border-[#1565C0] shadow-lg shadow-blue-200/50')
                : 'border-[#DBEAFE] hover:border-[#90CAF9]';
              const price = plan[period];

              return (
                <div key={plan.id}
                     ref={plan.id === emphasizedPlan ? emphasizedRef : null}
                     onClick={() => setSelected(plan.id)}
                     style={isEmph
                       ? { '--emph-color': isPurple ? 'rgba(124,58,237,0.5)' : 'rgba(21,101,192,0.5)' }
                       : undefined}
                     className={`relative bg-white border-[1.5px] rounded-2xl p-4
                                 flex flex-col cursor-pointer transition-all
                                 active:scale-[0.99] ${ring}
                                 ${isEmph ? 'sc-plan-emphasis' : ''}`}>

                  {plan.badge && (
                    <span className="absolute -top-2.5 right-3 bg-[#7C3AED] text-white
                                     text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      ✦ {plan.badge}
                    </span>
                  )}

                  {/* Eyebrow */}
                  <div className={`text-[10px] font-bold tracking-wider mb-1
                                   ${isPurple ? 'text-[#7C3AED]' : 'text-[#1565C0]'}`}>
                    {plan.eyebrow}
                  </div>

                  {/* Plan name */}
                  <div className="text-[#0D2137] font-bold text-base leading-tight">
                    {plan.label}
                  </div>
                  <div className="text-[#90A4AE] text-xs mb-3">{plan.subtitle}</div>

                  {/* Price */}
                  <div className={`text-3xl font-extrabold leading-none
                                   ${isPurple ? 'text-[#7C3AED]' : 'text-[#1565C0]'}`}>
                    {price.price}
                    <span className="text-[#90A4AE] text-xs font-medium">
                      /{period === 'yearly' ? 'year' : 'mo'}
                    </span>
                  </div>
                  <div className="text-[#90A4AE] text-[11px] mt-1 mb-3">{price.note}</div>

                  {/* Features */}
                  <div className="border-t border-[#F0F4FF] pt-3 space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-1.5
                                              text-[11px] text-[#546E7A] leading-snug">
                        <Icon name="check"
                              className={`w-3.5 h-3.5 shrink-0 mt-px
                                          ${isPurple ? 'text-[#7C3AED]' : 'text-[#1565C0]'}`} />
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* CTA button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(plan.id); }}
                    className={`mt-4 w-full py-2.5 rounded-xl text-xs font-bold
                                transition-all active:scale-95
                                ${isSel
                                  ? (isPurple
                                      ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-300/30'
                                      : 'bg-[#1565C0] text-white shadow-md shadow-blue-300/30')
                                  : 'bg-[#F4F7FF] text-[#1565C0] border-[1.5px] border-[#DBEAFE]'}`}>
                    {plan.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl
                            px-4 py-3 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Refund policy warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl
                          px-4 py-3 flex items-start gap-2.5">
            <Icon name="alert-triangle" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-800 text-xs leading-relaxed">
              <span className="font-bold">Warning:</span> Make sure you read the{' '}
              <Link to="/refund"
                    className="text-[#1565C0] font-semibold hover:underline cursor-pointer">
                Refund Policy
              </Link>{' '}
              carefully.
            </p>
          </div>

          {/* Continue → Checkout */}
          <div className="pt-1 pb-2">
            <button onClick={goCheckout}
                    className="w-full text-white font-bold py-4 rounded-2xl
                               active:scale-95 transition-all flex items-center
                               justify-center gap-2 text-base btn-hover"
                    style={{ background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
                             boxShadow: '0 4px 20px rgba(21,101,192,0.35)' }}>
              Continue
              
            </button>
          </div>

          <p className="text-[#90A4AE] text-xs text-center pb-6
                        inline-flex items-center justify-center gap-1 w-full">
            <Icon name="lock" className="w-3.5 h-3.5" />
            Secure payment · Cancel anytime · No hidden fees
          </p>

        </div>
      </div>
    </div>
  );
}

/* ── Active membership status view ──────────────────────────────────
   Shown once the user is premium (user.isPremium === true). Mirrors the
   "Membership-Active" design: status card, quick stats, plan details,
   benefits, and a cancel action.
   ──────────────────────────────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return '—'; }
};

const BENEFITS = [
  'All premium ideas unlocked',
  'Unlimited bookmarks',
  'Early feature access',
];

function ActiveMembership({ user, loading, error, onCancel, navigate }) {
  const m       = user?.membership ?? {};
  const stats   = m.stats ?? { read: 0, saved: 0, shared: 0 };
  const billing = m.billing === 'monthly' ? 'Monthly' : 'Yearly';
  const planRow = `${billing}${m.price ? ' — ' + m.price : ''}`;

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-12">

      {/* Header + status card */}
      <header className="bg-[#1565C0] px-4 pt-4 pb-16
                         relative shadow-lg overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button onClick={() => navigate(-1)}
                  className="w-9 h-9 flex items-center justify-center rounded-full
                             bg-white/15 text-white hover:bg-white/25
                             active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Membership</h1>
        </div>

        {/* Premium member card */}
        <div className="relative z-10 mt-5 bg-white/10 backdrop-blur-md
                        border border-white/15 rounded-2xl p-4
                        flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15
                          flex items-center justify-center shrink-0">
            <span className="text-2xl">👑</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">Premium Member</span>
              <span className="bg-[#22C55E] text-white text-[10px] font-bold
                               px-2 py-0.5 rounded-full tracking-wide">
                ACTIVE
              </span>
            </div>
            <div className="text-blue-100 text-xs mt-0.5">
              {billing} Plan · Renews {fmtDate(m.renewsAt)}
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY — curved top matching Home.jsx ── */}
      <div className="bg-[#1565C0]">
        <div className="bg-[#F4F7FF] rounded-t-[32px] px-4 pt-6 pb-12">
          <div className="bg-white border border-[#DBEAFE] rounded-3xl
                          shadow-sm px-4 pt-5 pb-6 space-y-6">

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatBox value={stats.read}   label="Ideas Read" />
              <StatBox value={stats.saved}  label="Saved" />
              <StatBox value={stats.shared} label="Shared" />
            </div>

            {/* Plan details */}
            <div>
              <h2 className="text-[#0D2137] font-bold text-base mb-2">
                Plan Details
              </h2>
              <div className="divide-y divide-[#F0F4FF]">
                <DetailRow label="Plan"    value={planRow} />
                <DetailRow label="Started" value={fmtDate(m.startedAt)} />
                <DetailRow label="Renews"  value={fmtDate(m.renewsAt)} />
              </div>
            </div>

            {/* Benefits */}
            <div>
              <h2 className="text-[#0D2137] font-bold text-base mb-2">
                Your Benefits
              </h2>
              <div className="space-y-2">
                {BENEFITS.map((b) => (
                  <div key={b} className="flex items-center gap-3 py-1">
                    <span className="w-8 h-8 rounded-lg bg-[#F4F7FF] border border-[#DBEAFE]
                                     flex items-center justify-center shrink-0">
                      <Icon name="check" className="w-4 h-4 text-[#1565C0]" />
                    </span>
                    <span className="text-[#546E7A] text-sm">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl
                              px-4 py-3 text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Cancel */}
            <button onClick={onCancel} disabled={loading}
                    className="w-full bg-[#FEF2F2] hover:bg-[#FEE2E2]
                               border border-[#FECACA] text-[#DC2626] font-bold
                               py-4 rounded-2xl active:scale-95 transition-all
                               disabled:opacity-50 flex items-center
                               justify-center gap-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-[#DC2626]
                                   border-t-transparent rounded-full animate-spin" />
                : null}
              Cancel Membership
            </button>

          </div>
        </div>
      </div>

    </div>
  );
}

function StatBox({ value, label }) {
  return (
    <div className="bg-[#F4F7FF] border border-[#DBEAFE] rounded-2xl py-4 text-center">
      <div className="text-[#1565C0] text-2xl font-extrabold">{value}</div>
      <div className="text-[#90A4AE] text-xs mt-0.5">{label}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <span className="text-[#90A4AE] text-sm">{label}</span>
      <span className="text-[#0D2137] text-sm font-bold">{value}</span>
    </div>
  );
}
