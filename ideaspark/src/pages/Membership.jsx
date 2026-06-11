import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { USE_MOCK } from '../api/config';
import { createOrder, subscribe, stripeCheckout, cancelMembership } from '../api/paymentApi';
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

  const [period, setPeriod]     = useState('yearly');               // 'monthly' | 'yearly'
  const [selected, setSelected] = useState(emphasizedPlan || 'creator'); // 'reader' | 'creator'
  const [emphasize, setEmphasize] = useState(!!emphasizedPlan);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
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

  // Everything the success / active views need to render the plan.
  const checkoutPayload = (gateway) => ({
    plan:      selected,
    billing:   period,
    gateway,
    planLabel: selectedPlan.label,
    price:     selectedPlan[period].price,
  });

  const onPaymentSuccess = (data, gateway) => {
    login(data.user, localStorage.getItem('token'));
    navigate('/membership/success', { state: { membership: data.user?.membership } });
  };

  const onPaymentFailure = (err) => {
    navigate('/membership/failure', {
      state: { message: err?.response?.data?.message },
    });
  };

  const handlePayment = async (gateway) => {
    setLoading(true); setError('');
    const payload = checkoutPayload(gateway);
    try {
      // Mock mode (or Stripe) — no live gateway popup, go straight through.
      if (USE_MOCK.payment) {
        const { data } = await subscribe(payload);
        onPaymentSuccess(data, gateway);
        return;
      }

      if (gateway === 'razorpay') {
        const { data: order } = await createOrder(payload);
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: 'INR',
          name: 'SoCreates',
          description: `${selectedPlan.label} · ${period === 'yearly' ? 'Yearly' : 'Monthly'}`,
          order_id: order.orderId,
          handler: async (response) => {
            try {
              const { data } = await subscribe({
                ...payload,
                paymentId: response.razorpay_payment_id,
                orderId:   response.razorpay_order_id,
                signature: response.razorpay_signature,
              });
              onPaymentSuccess(data, gateway);
            } catch (err) {
              onPaymentFailure(err);
            }
          },
          prefill: { name: user?.name, email: user?.email },
          theme: { color: '#1565C0' },
          modal: { ondismiss: () => setLoading(false) },
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) =>
          onPaymentFailure({ response: { data: { message: resp?.error?.description } } }));
        rzp.open();
      } else {
        const { data } = await stripeCheckout(payload);
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      onPaymentFailure(err);
    } finally {
      setLoading(false);
    }
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

      {/* Header — matches Home/Inbox */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-4 relative shadow-lg border-b border-white/10">
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
          <h1 className="text-white font-bold text-lg flex-1">Membership</h1>
        </div>
      </header>

      <div className="px-4 pt-7 space-y-6">

        {/* Hero */}
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F0F6FF] border border-[#BBDEFB] flex items-center justify-center">
              <Icon name="gem" className="w-8 h-8 text-[#1565C0]" />
            </div>
          </div>
          <h2 className="text-[#0D2137] text-2xl font-bold mb-1">Unlock the full platform</h2>
          <p className="text-[#90A4AE] text-sm">Choose the plan that fits you</p>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="relative flex bg-[#E2E8F4] rounded-2xl p-1">
          <span
            className="absolute top-1 bottom-1 w-1/2 rounded-xl bg-white shadow-sm transition-transform duration-300"
            style={{ transform: period === 'yearly' ? 'translateX(100%)' : 'translateX(0)' }}
          />
          {['monthly', 'yearly'].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-colors
                flex items-center justify-center gap-1.5
                ${period === p ? 'text-[#1565C0]' : 'text-[#546E7A]'}`}>
              {p}
              {p === 'yearly' && (
                <span className="text-[#16A34A] text-[10px] font-bold normal-case">save more</span>
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
              ? (isPurple ? 'border-[#7C3AED] shadow-lg shadow-purple-300/30' : 'border-[#1565C0] shadow-lg shadow-blue-300/30')
              : 'border-[#E3F2FD] hover:border-[#BBDEFB]';
            const price    = plan[period];
            return (
              <div key={plan.id}
                ref={plan.id === emphasizedPlan ? emphasizedRef : null}
                onClick={() => setSelected(plan.id)}
                style={isEmph ? { '--emph-color': isPurple ? 'rgba(124,58,237,0.5)' : 'rgba(21,101,192,0.5)' } : undefined}
                className={`relative bg-white border rounded-2xl p-4 flex flex-col cursor-pointer transition-all active:scale-[0.99] ${ring} ${isEmph ? 'sc-plan-emphasis' : ''}`}>

                {plan.badge && (
                  <span className="absolute -top-2.5 right-3 bg-[#7C3AED] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                    ✦ {plan.badge}
                  </span>
                )}

                <div className={`text-[10px] font-bold tracking-wider mb-1 ${isPurple ? 'text-[#7C3AED]' : 'text-[#1565C0]'}`}>
                  {plan.eyebrow}
                </div>
                <div className="text-[#0D2137] font-bold text-base leading-tight">{plan.label}</div>
                <div className="text-[#90A4AE] text-xs mb-3">{plan.subtitle}</div>

                <div className={`text-3xl font-extrabold leading-none ${isPurple ? 'text-[#7C3AED]' : 'text-[#0D2137]'}`}>
                  {price.price}
                  <span className="text-[#90A4AE] text-xs font-medium">/{period === 'yearly' ? 'year' : 'mo'}</span>
                </div>
                <div className="text-[#90A4AE] text-[11px] mt-1 mb-3">{price.note}</div>

                <div className="border-t border-[#F0F2F8] pt-3 space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-1.5 text-[11px] text-[#546E7A] leading-snug">
                      <Icon name="check" className={`w-3.5 h-3.5 shrink-0 mt-px ${isPurple ? 'text-[#7C3AED]' : 'text-[#1565C0]'}`} />
                      {f}
                    </div>
                  ))}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); setSelected(plan.id); }}
                  className={`mt-4 w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95
                    ${isSel
                      ? (isPurple ? 'bg-[#7C3AED] text-white' : 'bg-[#1565C0] text-white')
                      : 'bg-[#F0F6FF] text-[#1565C0] border border-[#BBDEFB]'}`}>
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-500 text-sm">{error}</div>
        )}

        {/* Payment buttons */}
        <div className="space-y-3 pt-1">
          <p className="text-[#90A4AE] text-xs text-center uppercase tracking-widest">
            {selectedPlan.label} · {period === 'yearly' ? 'Yearly' : 'Monthly'}
          </p>

          <button onClick={() => handlePayment('razorpay')} disabled={loading}
            className="w-full text-white font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-300/40 flex items-center justify-center gap-2 text-sm"
            style={{ background: 'linear-gradient(135deg, #4F8EF7, #3B6FE0)' }}>
            {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Pay with Razorpay
          </button>

          <button onClick={() => handlePayment('stripe')} disabled={loading}
            className="w-full text-white font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            style={{ background: 'linear-gradient(135deg, #7C5CFC, #6246EA)' }}>
            {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Pay with Stripe
          </button>
        </div>

        <p className="text-[#90A4AE] text-xs text-center pb-4 inline-flex items-center justify-center gap-1 w-full">
          <Icon name="lock" className="w-3.5 h-3.5" /> Secure payment · Cancel anytime · No hidden fees
        </p>

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
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
};

const BENEFITS = ['All premium ideas unlocked', 'Unlimited bookmarks', 'Early feature access'];

function ActiveMembership({ user, loading, error, onCancel, navigate }) {
  const m       = user?.membership ?? {};
  const stats   = m.stats ?? { read: 0, saved: 0, shared: 0 };
  const billing = m.billing === 'monthly' ? 'Monthly' : 'Yearly';
  const planRow = `${billing}${m.price ? ' — ' + m.price : ''}`;

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-12">

      {/* Header + status card */}
      <header className="bg-[#1565C0] px-4 pt-4 pb-16 relative shadow-lg overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Membership</h1>
        </div>

        {/* Premium member card */}
        <div className="relative z-10 mt-5 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <span className="text-2xl">👑</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">Premium Member</span>
              <span className="bg-[#22C55E] text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">ACTIVE</span>
            </div>
            <div className="text-blue-100 text-xs mt-0.5">
              {billing} Plan · Renews {fmtDate(m.renewsAt)}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="bg-[#1565C0]">
  <div className="bg-white rounded-t-[32px] px-4 pt-6 pb-12">
        <div className="bg-white rounded-3xl shadow-md px-4 pt-5 pb-6 space-y-6">

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatBox value={stats.read}   label="Ideas Read" />
            <StatBox value={stats.saved}  label="Saved" />
            <StatBox value={stats.shared} label="Shared" />
          </div>

          {/* Plan details */}
          <div>
            <h2 className="text-[#0D2137] font-bold text-base mb-2">Plan Details</h2>
            <div className="divide-y divide-[#F0F2F8]">
              <DetailRow label="Plan"    value={planRow} />
              <DetailRow label="Started" value={fmtDate(m.startedAt)} />
              <DetailRow label="Renews"  value={fmtDate(m.renewsAt)} />
            </div>
          </div>

          {/* Benefits */}
          <div>
            <h2 className="text-[#0D2137] font-bold text-base mb-2">Your Benefits</h2>
            <div className="space-y-2">
              {BENEFITS.map((b) => (
                <div key={b} className="flex items-center gap-3 py-1">
                  <span className="w-8 h-8 rounded-lg bg-[#F0F6FF] flex items-center justify-center shrink-0">
                    <Icon name="check" className="w-4 h-4 text-[#1565C0]" />
                  </span>
                  <span className="text-[#546E7A] text-sm">{b}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-500 text-sm">{error}</div>
          )}

          {/* Cancel */}
          <button onClick={onCancel} disabled={loading}
            className="w-full bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <span className="w-4 h-4 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin" /> : null}
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
    <div className="bg-[#F0F6FF] border border-[#E3F2FD] rounded-2xl py-4 text-center">
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
