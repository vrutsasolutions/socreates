import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import Icon from '../components/common/Icon';

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '₹99',
    period: '/month',
    priceNote: 'Billed monthly',
    badge: null,
    features: ['All premium ideas','Unlimited bookmarks','Creator support','Cancel anytime'],
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '₹799',
    period: '/year',
    priceNote: 'Save ₹389 vs monthly',
    badge: 'Best Value',
    features: ['Everything in Monthly','Priority access','Early feature access','2 months free'],
  },
];

export default function Membership() {
  const navigate    = useNavigate();
  const { user, login } = useAuth();
  const [selected, setSelected] = useState('yearly');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handlePayment = async (gateway) => {
    setLoading(true); setError('');
    try {
      if (gateway === 'razorpay') {
        const { data: order } = await api.post('/payment/create-order', { plan: selected });
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: 'INR',
          name: 'IdeaSpark',
          description: `${selected.charAt(0).toUpperCase() + selected.slice(1)} Plan`,
          order_id: order.orderId,
          handler: async (response) => {
            const { data } = await api.post('/payment/subscribe', {
              plan: selected,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });
            login(data.user, localStorage.getItem('token'));
            navigate('/premium');
          },
          prefill: { name: user?.name, email: user?.email },
          theme: { color: '#1565C0' },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        const { data } = await api.post('/payment/stripe/checkout', { plan: selected });
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-10">

      {/* Header — matches Home/Inbox */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-4 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Membership</h1>
        </div>
      </header>

      {/* Content wrapper — matches Home's rounded-t-[32px] white card */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] px-4 pt-8 space-y-6">

          {/* Hero */}
          <div className="text-center">
            <div className="mb-3 flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F0F6FF] border border-[#BBDEFB] flex items-center justify-center">
                <Icon name="gem" className="w-8 h-8 text-[#1565C0]" />
              </div>
            </div>
            <h2 className="text-[#0D2137] text-2xl font-bold mb-2">Go Premium</h2>
            <p className="text-[#90A4AE] text-sm leading-relaxed max-w-xs mx-auto">
              Unlock exclusive ideas from the best creators. Cancel anytime.
            </p>
          </div>

          {/* Plan cards */}
          <div className="space-y-3">
            {PLANS.map((plan) => (
              <button key={plan.id} onClick={() => setSelected(plan.id)}
                className={`w-full text-left bg-[#F0F6FF] border rounded-2xl p-5 transition-all active:scale-[0.98]
                  ${selected === plan.id
                    ? 'border-[#1565C0] shadow-lg shadow-blue-300/40'
                    : 'border-[#BBDEFB] hover:border-[#1565C0] hover:bg-[#DBEAFE]'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[#0D2137] font-bold">{plan.label}</span>
                      {plan.badge && (
                        <span className="bg-[#DBEAFE] text-[#1565C0] text-xs font-bold px-2 py-0.5 rounded-2xl">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[#90A4AE] text-xs">{plan.priceNote}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#1565C0] text-2xl font-bold">{plan.price}</span>
                    <span className="text-[#90A4AE] text-xs">{plan.period}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-[#546E7A]">
                      <span className="text-[#1565C0] font-bold shrink-0">✓</span>{f}
                    </div>
                  ))}
                </div>
                <div className={`mt-3 h-0.5 rounded-full transition-all ${selected === plan.id ? 'bg-[#1565C0]' : 'bg-transparent'}`} />
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-500 text-sm">{error}</div>
          )}

          {/* Payment buttons */}
          <div className="space-y-3 pt-2">
            <p className="text-[#90A4AE] text-xs text-center uppercase tracking-widest">Choose payment method</p>

            <button onClick={() => handlePayment('razorpay')} disabled={loading}
              className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-300/40 flex items-center justify-center gap-2 text-sm">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Pay with Razorpay
            </button>

            <button onClick={() => handlePayment('stripe')} disabled={loading}
              className="w-full bg-[#F0F6FF] hover:bg-[#DBEAFE] border border-[#BBDEFB] hover:border-[#1565C0] text-[#1565C0] font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              {loading ? <span className="w-4 h-4 border-2 border-[#1565C0] border-t-transparent rounded-full animate-spin" /> : null}
              Pay with Stripe
            </button>
          </div>

          <p className="text-[#90A4AE] text-xs text-center pb-8 inline-flex items-center justify-center gap-1 w-full">
            <Icon name="lock" className="w-3.5 h-3.5" /> Secure payment · Cancel anytime · No hidden fees
          </p>

        </div>
      </div>

    </div>
  );
}