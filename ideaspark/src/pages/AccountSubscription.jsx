import { useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMySubscription, cancelMembership } from '../api/paymentApi';
import Icon from '../components/common/Icon';

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return '—'; }
};

const planLabelFor = (plan) =>
  plan === 'creator' ? 'Creators Pro' : 'Go Premium';

// /payment/status doesn't return the billing period, but it's implied by the
// span between start and renewal dates (~1 year → yearly, otherwise monthly).
const billingFromDates = (startIso, endIso) => {
  if (!startIso || !endIso) return null;
  const days = (new Date(endIso) - new Date(startIso)) / 86_400_000;
  return days > 250 ? 'yearly' : 'monthly';
};

// Merge the live status payload with the descriptive fields (planLabel, billing,
// price) that only live on the purchase record in auth context — those are fixed
// at purchase time, so it's correct to reuse them; status and dates come live.
function normalizeStatus(dto, ctx = {}) {
  return {
    plan:      dto.plan ?? ctx.plan,
    planLabel: ctx.planLabel ?? planLabelFor(dto.plan ?? ctx.plan),
    billing:   ctx.billing ?? billingFromDates(dto.startDate, dto.endDate),
    price:     ctx.price ?? null,
    status:    dto.status ?? ctx.status ?? 'active',
    startedAt: dto.startDate ?? ctx.startedAt,
    renewsAt:  dto.endDate ?? ctx.renewsAt,
  };
}

export default function AccountSubscription() {
  const navigate              = useNavigate();
  const { user, login }       = useAuth();
  const [sub, setSub]         = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError]     = useState('');
  // Distinct from `error` (cancel failures): a load failure surfaces a retry
  // state instead of silently showing stale/placeholder numbers.
  const [loadError, setLoadError] = useState(false);
  // Server says there's no active membership — reflect that truth, don't guess.
  const [noMembership, setNoMembership] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await fetchMySubscription();
      // ApiResponse { success:false } means no active membership on the server.
      if (data?.success === false) {
        setNoMembership(true);
        setSub(null);
        setHistory([]);
      } else {
        setSub(normalizeStatus(data, user?.membership ?? {}));
        // The backend has no billing-history endpoint yet, so we show none
        // rather than fabricate a row.
        setHistory([]);
      }
    } catch {
      // 401/403 from an expired session is handled globally (redirect to login).
      // Anything else is a real failure — surface it, never show fake numbers.
      setLoadError(true);
      setSub(null);
    } finally {
      setLoading(false);
    }
    // user.membership only supplies fixed descriptive fields; re-running on its
    // identity change isn't needed and would refetch on every auth update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    if (!window.confirm('Cancel your membership? You will lose premium access immediately.')) return;
    setCancelling(true);
    setError('');
    try {
      const { data } = await cancelMembership();
      login(data.user, localStorage.getItem('token'));
      navigate('/membership');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not cancel. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  if (!user?.isPremium) return <Navigate to="/membership" replace />;
  // Server is the source of truth: if it reports no active membership, send the
  // user to the plans page rather than rendering a stale "active" view.
  if (noMembership) return <Navigate to="/membership" replace />;

  const m         = sub ?? {};
  const billing   = m.billing === 'yearly' ? 'Yearly' : 'Monthly';
  const planRow   = m.planLabel ?? (m.plan === 'creator' ? 'Creators Pro' : 'Go Premium');
  const canceled  = (m.status ?? 'active').toLowerCase() === 'canceled';
  const priceText = m.price ? m.price : '—';

  const BENEFITS = m.plan === 'creator'
    ? ['Unlimited Premium Ideas', 'Verified Badge', 'Creator Pro Badge', 'Premium Publishing', 'Priority Reach', 'Cancel anytime']
    : ['Unlimited Premium Ideas', 'Verified Badge', 'Premium Reader Badge', 'Early Feature Access', 'Cancel anytime'];

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-12">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <div className="flex items-center gap-3 relative z-10 mb-4">
          <button onClick={() => navigate(-1)} aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg flex-1">My Subscription</h1>
        </div>

        <div className="relative z-10">
          <h2 className="text-[26px] font-bold text-white leading-none">{planRow}</h2>
          {!loading && (
            canceled ? (
              <div className="mt-2 inline-flex items-center gap-2 bg-[#F59E0B]/20 border border-[#F59E0B]/30 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="text-[#FCD34D] text-xs font-bold">CANCELED</span>
              </div>
            ) : (
              <div className="mt-2 inline-flex items-center gap-2 bg-[#22C55E]/20 border border-[#22C55E]/30 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <span className="text-[#4ADE80] text-xs font-bold">ACTIVE</span>
              </div>
            )
          )}
        </div>
      </header>

      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] px-4 pt-6 pb-12 space-y-7">

          {loading ? (
            <SubscriptionSkeleton />
          ) : loadError ? (
            <div className="bg-white rounded-2xl border border-[#E3F2FD] shadow-sm px-6 py-10 text-center">
              <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center">
                <Icon name="alert-triangle" className="w-7 h-7 text-[#DC2626]" />
              </div>
              <p className="text-[#0D2137] font-semibold text-base">Couldn't load your subscription</p>
              <p className="text-[#90A4AE] text-sm mt-1">We couldn't reach the server. Please try again.</p>
              <button onClick={load}
                className="mt-5 px-6 py-2.5 rounded-xl bg-[#1565C0] text-white text-sm font-semibold hover:bg-[#0D47A1] transition-colors shadow-sm">
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Plan details */}
              <Section title="Plan Details">
                <div className="bg-white rounded-2xl border border-[#E3F2FD] shadow-sm divide-y divide-[#F0F2F8]">
                  <DetailRow label="Plan"    value={planRow} />
                  <DetailRow label="Billing" value={billing} />
                  <DetailRow label="Price"   value={priceText} />
                  <DetailRow label="Started" value={fmtDate(m.startedAt)} />
                  <DetailRow label="Renews"  value={fmtDate(m.renewsAt)} />
                </div>
              </Section>

              {/* Billing history */}
              <Section title="Billing History">
                {history.length === 0 ? (
                  <div className="bg-[#F8FAFF] border border-[#E3F2FD] rounded-2xl px-4 py-6 text-center">
                    <div className="text-[#90A4AE] text-sm">No billing history yet</div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-[#E3F2FD] shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F8FAFF] border-b border-[#E3F2FD]">
                          <th className="text-left font-bold px-4 py-3 text-[#0D2137]">Date</th>
                          <th className="text-right font-bold px-4 py-3 text-[#0D2137]">Amount</th>
                          <th className="text-right font-bold px-4 py-3 text-[#0D2137]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((row, i) => (
                          <tr key={i} className="border-b border-[#F0F2F8] last:border-0">
                            <td className="px-4 py-3 text-[#546E7A]">{fmtDate(row.date)}</td>
                            <td className="px-4 py-3 text-right text-[#0D2137] font-semibold">
                              {row.amount ?? m.price ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="bg-[#ECFDF5] text-[#065F46] text-xs font-bold px-2.5 py-0.5 rounded-full">
                                {row.status ?? 'Paid'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              {/* Benefits */}
              <Section title="Your Benefits">
                <div className="bg-white rounded-2xl border border-[#E3F2FD] shadow-sm px-4 py-3 space-y-3">
                  {BENEFITS.map((b) => (
                    <div key={b} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#F0F6FF] flex items-center justify-center shrink-0">
                        <Icon name="check" className="w-3.5 h-3.5 text-[#1565C0]" />
                      </div>
                      <span className="text-[#546E7A] text-sm">{b}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Manage */}
              <Section title="Manage">
                <div className="space-y-3">
                  <button onClick={handleCancel} disabled={cancelling}
                    className="w-full bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {cancelling && (
                      <span className="w-4 h-4 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin" />
                    )}
                    Cancel Membership
                  </button>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-[11px] font-bold tracking-wider text-[#90A4AE] uppercase px-1">{title}</h2>
      {children}
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-[#90A4AE] text-sm">{label}</span>
      <span className="text-[#0D2137] text-sm font-bold">{value}</span>
    </div>
  );
}

function SubscriptionSkeleton() {
  return (
    <div className="space-y-7 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2.5">
          <div className="h-3 bg-[#E3F2FD] rounded-full w-24" />
          <div className="bg-[#F0F6FF] rounded-2xl h-32" />
        </div>
      ))}
    </div>
  );
}
