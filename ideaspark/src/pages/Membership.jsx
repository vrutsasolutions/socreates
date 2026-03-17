import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';

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
          theme: { color: '#7c3aed' },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Stripe
        const { data } = await api.post('/payment/stripe/checkout', { plan: selected });
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] pb-10">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0f0f1a]/90 backdrop-blur-xl border-b border-[#2a2a3e] px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Membership</h1>
      </header>

      <div className="px-4 pt-6 space-y-6">
        {/* Hero */}
        <div className="text-center">
          <div className="text-5xl mb-3">💎</div>
          <h2 className="text-white text-2xl font-bold mb-2">Go Premium</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            Unlock exclusive ideas from the best creators. Cancel anytime.
          </p>
        </div>

        {/* Plan cards */}
        <div className="space-y-3">
          {PLANS.map((plan) => (
            <button key={plan.id} onClick={() => setSelected(plan.id)}
              className={`w-full text-left bg-[#1a1a2e] border rounded-2xl p-5 transition-all active:scale-[0.98]
                ${selected === plan.id ? 'border-violet-500 shadow-lg shadow-violet-500/20' : 'border-[#2a2a3e]'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-bold">{plan.label}</span>
                    {plan.badge && (
                      <span className="bg-amber-400/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-xs">{plan.priceNote}</span>
                </div>
                <div className="text-right">
                  <span className="text-white text-2xl font-bold">{plan.price}</span>
                  <span className="text-slate-500 text-xs">{plan.period}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-emerald-400 shrink-0">✓</span>{f}
                  </div>
                ))}
              </div>
              {/* Selection indicator */}
              <div className={`mt-3 h-0.5 rounded-full transition-all ${selected === plan.id ? 'bg-violet-500' : 'bg-transparent'}`}/>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
        )}

        {/* Payment buttons */}
        <div className="space-y-3 pt-2">
          <p className="text-slate-500 text-xs text-center uppercase tracking-widest">Choose payment method</p>

          <button onClick={() => handlePayment('razorpay')} disabled={loading}
            className="w-full bg-[#528FF0] hover:bg-[#4070D0] text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : null}
            Pay with Razorpay
          </button>

          <button onClick={() => handlePayment('stripe')} disabled={loading}
            className="w-full bg-[#635BFF] hover:bg-[#5248D9] text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : null}
            Pay with Stripe
          </button>
        </div>

        <p className="text-slate-600 text-xs text-center pb-4">
          🔒 Secure payment · Cancel anytime · No hidden fees
        </p>
      </div>
    </div>
  );
}
