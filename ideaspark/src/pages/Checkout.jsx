// ════════════════════════════════════════════════════════════════════════
//  Checkout (figma "Checkout · Confirm your order")
//  Order summary + payment-method choice. Reached from Membership via
//  navigate('/membership/checkout', { state: { plan, billing, ... } }).
//  "Pay with Razorpay" opens Razorpay's hosted popup (Card / UPI / Netbanking),
//  then verifies the signature server-side before granting premium.
// ════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { USE_MOCK } from '../api/config';
import { createOrder, subscribe, stripeCheckout } from '../api/paymentApi';
import Icon from '../components/common/Icon';

// What each tier's order summary lists (matches the checkout design).
const INCLUDES = {
  creator: [
    'Verified Creator badge',
    'Creator Pro badge on profile',
    'Unlimited Premium Ideas',
    'Exclusive Creator Content',
  ],
  reader: [
    'Unlimited Premium Ideas',
    'Premium Reader Badge',
    'Exclusive Creator Content',
    'Early Feature Access',
  ],
};

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const [loading, setLoading] = useState('');   // '' | 'razorpay' | 'stripe'
  const [error, setError]     = useState('');

  const order = location.state;
  // Deep-linked / refreshed without a selected plan → back to Membership.
  if (!order?.plan) return <Navigate to="/membership" replace />;

  const { plan, billing, planLabel, price } = order;
  const yearly   = billing === 'yearly';
  const includes = INCLUDES[plan] ?? INCLUDES.reader;

  const payload = (gateway) => ({ plan, billing, gateway, planLabel, price });

  const onSuccess = (data) => {
    login(data.user, localStorage.getItem('token'));
    navigate('/membership/success', { state: { membership: data.user?.membership } });
  };

  const onFailure = (err) =>
    navigate('/membership/failure', {
      state: { message: err?.response?.data?.message },
    });

  const payRazorpay = async () => {
    setLoading('razorpay'); setError('');
    try {
      // Mock mode — no live gateway popup, straight through.
      if (USE_MOCK.payment) {
        const { data } = await subscribe(payload('razorpay'));
        onSuccess(data);
        return;
      }

      const { data: ord } = await createOrder(payload('razorpay'));
      const key = ord.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) {
        setError('Razorpay key is not configured. Add VITE_RAZORPAY_KEY_ID or set RAZORPAY_KEY_ID on the server.');
        setLoading('');
        return;
      }

      const rzp = new window.Razorpay({
        key,
        amount:   ord.amount,
        currency: ord.currency || 'INR',
        name:     'SoCreates',
        description: `${planLabel} · ${yearly ? 'Yearly' : 'Monthly'}`,
        order_id: ord.orderId,
        handler: async (resp) => {
          try {
            const { data } = await subscribe({
              ...payload('razorpay'),
              paymentId: resp.razorpay_payment_id,
              orderId:   resp.razorpay_order_id,
              signature: resp.razorpay_signature,
            });
            onSuccess(data);
          } catch (err) {
            onFailure(err);
          }
        },
        prefill: { name: user?.name, email: user?.email },
        theme:   { color: '#1565C0' },
        modal:   { ondismiss: () => setLoading('') },
      });
      rzp.on('payment.failed', (r) =>
        onFailure({ response: { data: { message: r?.error?.description } } }));
      rzp.open();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not start payment. Please try again.');
      setLoading('');
    }
  };

  const payStripe = async () => {
    setLoading('stripe'); setError('');
    try {
      if (USE_MOCK.payment) {
        const { data } = await subscribe(payload('stripe'));
        onSuccess(data);
        return;
      }
      const { data } = await stripeCheckout(payload('stripe'));
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not start Stripe checkout.');
      setLoading('');
    }
  };

  const busy = !!loading;

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-10">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-4 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={() => navigate(-1)} aria-label="Go back" disabled={busy}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Checkout</h1>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6">

        <h2 className="text-[#0D2137] text-xl font-bold">Confirm your order</h2>

        {/* Order summary card */}
        <div className="bg-white rounded-2xl border border-[#E3F2FD] p-4 flex items-center gap-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#F59E0B] flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-2xl leading-none">★</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#0D2137] truncate">{planLabel}</p>
            <p className="text-[12px] text-[#90A4AE] mt-0.5">
              Billed {yearly ? 'yearly' : 'monthly'} · Auto-renews
            </p>
          </div>
          <span className="text-[#1565C0] text-lg font-extrabold shrink-0">{price}</span>
        </div>

        {/* This plan includes */}
        <div>
          <p className="text-[11px] font-bold tracking-widest text-[#90A4AE] uppercase mb-2">
            This plan includes:
          </p>
          <div className="space-y-2.5">
            {includes.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-[13px] text-[#0D2137]">
                <Icon name="check" className="w-4 h-4 text-[#16A34A] shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-[#546E7A]">Subtotal</span>
            <span className="text-[#0D2137] font-semibold">{price}.00</span>
          </div>
          <div className="border-t border-[#E3F2FD]" />
          <div className="flex items-center justify-between">
            <span className="text-[#0D2137] text-base font-bold">Total</span>
            <span className="text-[#1565C0] text-lg font-extrabold">{price}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm">{error}</div>
        )}

        {/* Payment methods */}
        <div className="space-y-3 pt-1">
          <p className="text-[#90A4AE] text-xs uppercase tracking-widest">Choose payment method</p>

          <button onClick={payRazorpay} disabled={busy}
            className="w-full text-white font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-300/40 flex items-center justify-center gap-2 text-sm"
            style={{ background: 'linear-gradient(135deg, #4F8EF7, #3B6FE0)' }}>
            {loading === 'razorpay' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Pay with Razorpay
          </button>

          <button onClick={payStripe} disabled={busy}
            className="w-full text-white font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            style={{ background: 'linear-gradient(135deg, #7C5CFC, #6246EA)' }}>
            {loading === 'stripe' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Pay with Stripe
          </button>
        </div>

        <p className="text-[#90A4AE] text-xs text-center pb-4 inline-flex items-center justify-center gap-1 w-full">
          <Icon name="lock" className="w-3.5 h-3.5" /> Payments are securely processed · Cancel anytime
        </p>
      </div>
    </div>
  );
}
