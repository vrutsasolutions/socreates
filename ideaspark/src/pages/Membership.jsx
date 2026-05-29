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
          theme: { color: '#1565C0' },
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
    <div className="min-h-screen bg-white pb-10">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1565C0] border-b border-[#BBDEFB] px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-blue-200 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Membership</h1>
      </header>

      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-3xl px-4 pt-6 space-y-6">
          {/* Hero */}
          <div className="text-center">
            <div className="text-5xl mb-3">💎</div>
            <h2 className="text-[#1565C0] text-2xl font-bold mb-2">Go Premium</h2>
            <p className="text-[#90A4AE] text-sm leading-relaxed max-w-xs mx-auto">
              Unlock exclusive ideas from the best creators. Cancel anytime.
            </p>
          </div>

          {/* Plan cards */}
          <div className="space-y-3">
            {PLANS.map((plan) => (
              <button key={plan.id} onClick={() => setSelected(plan.id)}
                className={`w-full text-left bg-[#F0F6FF] border rounded-2xl p-5 transition-all active:scale-[0.98]
                  ${selected === plan.id ? 'border-[#1565C0] shadow-lg shadow-blue-300/40' : 'border-[#BBDEFB]'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[#1565C0] font-bold">{plan.label}</span>
                      {plan.badge && (
                        <span className="bg-[#FACC15]/20 text-[#78350F] text-xs font-bold px-2 py-0.5 rounded-full">
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
                    <div key={f} className="flex items-center gap-2 text-xs text-[#90A4AE]">
                      <span className="text-[#1565C0] shrink-0">✓</span>{f}
                    </div>
                  ))}
                </div>
                {/* Selection indicator */}
                <div className={`mt-3 h-0.5 rounded-full transition-all ${selected === plan.id ? 'bg-[#1565C0]' : 'bg-transparent'}`}/>
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-500 text-sm">{error}</div>
          )}

          {/* Payment buttons */}
          <div className="space-y-3 pt-2">
            <p className="text-[#90A4AE] text-xs text-center uppercase tracking-widest">Choose payment method</p>

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

          <p className="text-[#BBDEFB] text-xs text-center pb-4">
            🔒 Secure payment · Cancel anytime · No hidden fees
          </p>
        </div>
      </div>
    </div>
  );
}