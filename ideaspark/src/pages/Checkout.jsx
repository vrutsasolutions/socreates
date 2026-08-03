// ════════════════════════════════════════════════════════════════════════
//  Checkout (figma "Checkout · Confirm your order")
//  Order summary + payment-method choice. Reached from Membership via
//  navigate('/membership/checkout', { state: { plan, billing, ... } }).
//
//  Uses Razorpay's standard checkout.js popup (window.Razorpay) everywhere,
//  including inside the Capacitor WebView on Android — see the note on
//  payRazorpay() below for why the native razorpay-cordova plugin isn't used.
//
//  Verified server-side (signature check) before granting premium.
// ════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext';
import { USE_MOCK } from '../api/config';
import { createOrder, subscribe, fetchMySubscription, buildMembership } from '../api/paymentApi';
import Icon from '../components/common/Icon';
import scLogo from '../assets/sc-logo-razorpay.png';

// What each tier's order summary lists (matches the checkout design).
const INCLUDES = {
  creator: [
    'Verified badge',
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
  const { user, login, updateUser } = useAuth();
  const [loading, setLoading] = useState('');   // '' | 'razorpay' | 'verifying'
  const [error, setError]     = useState('');

  const order = location.state || {};
  const { plan, billing, planLabel, price } = order;
  const yearly   = billing === 'yearly';
  const includes = INCLUDES[plan] ?? INCLUDES.reader;

  const payload = (gateway) => ({ plan, billing, gateway, planLabel, price });

  const onSuccess = (data) => {
    login(data.user, localStorage.getItem('token'));
    navigate('/membership/success', { state: { membership: data.user?.membership } });
  };

  // replace: true swaps the current history entry (Checkout) instead of
  // pushing a new one, so "Payment Failed" doesn't sit permanently in the
  // browser/back-button history stack. Without this, pressing back after
  // leaving the failure screen would bounce the user right back to it.
  const onFailure = (err) =>
    navigate('/membership/failure', {
      replace: true,
      state: { message: err?.response?.data?.message || err?.message, plan, billing, planLabel, price },
    });

  // Polls GET /payment/status a few times. This exists for one specific
  // gap: Razorpay can capture a payment while the browser never gets the
  // chance to call subscribe() — e.g. the tab is reloaded/backgrounded
  // during a bank-OTP or UPI redirect on mobile. When that happens the
  // money is real and (once the Razorpay webhook lands) the account IS
  // premium server-side, but this tab has no way to know that and would
  // otherwise just show the generic failure screen while the DB already
  // says "active". Give the webhook a few seconds to land before we
  // conclude the payment actually failed.
  const pollForActivation = async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        const { data } = await fetchMySubscription();
        if (data && String(data.status).toLowerCase() === 'active') return true;
      } catch {
        // Not active yet (or a transient error) — keep polling.
      }
    }
    return false;
  };

  // Wraps onFailure: before sending the user to the "Payment Failed"
  // screen, double-check with the server in case the webhook already
  // activated membership behind the scenes. Only THEN show failure.
  const onFailureWithRecoveryCheck = async (err) => {
    setLoading('verifying');
    const recovered = await pollForActivation();
    if (recovered) {
      const membership = buildMembership(payload('razorpay'));
      updateUser({ isPremium: true, membership });
      navigate('/membership/success', { state: { membership } });
      return;
    }
    setLoading('');
    onFailure(err);
  };

  // ── Web Razorpay (checkout.js popup) ────────────────────────────────
  const payWeb = async (ord, key) => {
    if (typeof window.Razorpay === 'undefined') {
      setError('Razorpay could not load. A browser ad/privacy blocker may be blocking checkout.razorpay.com — disable it for this site, then reload and retry.');
      setLoading('');
      return;
    }

    const rzp = new window.Razorpay({
      key,
      amount: ord.amount,
      currency: ord.currency || 'INR',
      name: 'SoCreate',
      image: scLogo,
      description: `${planLabel} · ${yearly ? 'Yearly' : 'Monthly'}`,
      order_id: ord.orderId,
      handler: async (resp) => {
        try {
          const { data } = await subscribe({
            ...payload('razorpay'),
            paymentId: resp.razorpay_payment_id,
            orderId: resp.razorpay_order_id,
            signature: resp.razorpay_signature,
          });
          onSuccess(data);
        } catch (err) {
          // subscribe() failing here does NOT mean the payment failed —
          // Razorpay already showed the popup's success state, so money
          // may well have been captured. Check server status before
          // routing to the failure screen.
          onFailureWithRecoveryCheck(err);
        }
      },
      prefill: { name: user?.name, email: user?.email },
      theme: { color: '#1565C0' },
      modal: { ondismiss: () => setLoading('') },
    });
    // payment.failed fires for a genuine gateway-side decline (card
    // rejected, insufficient funds, etc.) — Razorpay itself is telling us
    // no capture happened, so no recovery check is needed here.
    rzp.on('payment.failed', (r) =>
      onFailure({ response: { data: { message: r?.error?.description } } }));
    rzp.open();
  };

  // ── Main pay handler ────────────────────────────────────────────────
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

      // Always use checkout.js (payWeb), not the native razorpay-cordova plugin.
      // That plugin (v0.1.0, unmaintained) has callback bugs under Capacitor v8+:
      // payment captures on Razorpay's end but the success callback never fires
      // in JS, so the app reports "failed" even though money was debited.
      // checkout.js works fine in the Capacitor WebView — the only trade-off is
      // UPI intent (opening GPay/PhonePe directly) won't launch; UPI collect,
      // cards, netbanking, and wallets all work normally.
      await payWeb(ord, key);
    } catch (err) {
      console.error('[Razorpay] payment start failed:', err);
      const status = err?.response?.status;
      setError(
        err?.response?.data?.message
        || (status ? `Request failed (HTTP ${status}).`
                   : `${err?.message || 'Unknown error'} — could not reach the server. Please check your connection and try again.`)
      );
      setLoading('');
    }
  };

  // Coming from the failure screen's "Retry" → run Razorpay once on arrival.
  const retriedRef = useRef(false);
  useEffect(() => {
    if (retriedRef.current || !order?.retryGateway) return;
    retriedRef.current = true;
    payRazorpay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep-linked / refreshed without a selected plan → back to Membership.
  // (After all hooks, to keep hook order stable.)
  if (!order.plan) return <Navigate to="/membership" replace />;

  const busy = !!loading;

  return (
    <div className="min-h-screen">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">
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

      {/* Blue base + white curved card */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] px-4 pt-6 pb-10 space-y-6">

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
            <span className="text-[#0D2137] font-semibold">{price}</span>
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

        {/* Payment methods */}
        <div className="space-y-3 pt-1">
          <p className="text-[#90A4AE] text-xs uppercase tracking-widest">Choose payment method</p>

          <button onClick={payRazorpay} disabled={busy}
            className="w-full text-white font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-300/40 flex items-center justify-center gap-2 text-sm"
            style={{ background: 'linear-gradient(135deg, #4F8EF7, #3B6FE0)' }}>
            {(loading === 'razorpay' || loading === 'verifying') && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading === 'verifying' ? 'Verifying your payment…' : 'Pay with Razorpay'}
          </button>
          {loading === 'verifying' && (
            <p className="text-[#90A4AE] text-xs text-center -mt-1">
              We're confirming your payment with the bank. This can take a few seconds — please don't close this page.
            </p>
          )}
        </div>

        <p className="text-[#90A4AE] text-xs text-center pb-4 inline-flex items-center justify-center gap-1 w-full">
          <Icon name="lock" className="w-3.5 h-3.5" /> Payments are securely processed · Cancel anytime
        </p>
        </div>
      </div>
    </div>
  );
}