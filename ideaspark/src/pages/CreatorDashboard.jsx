import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { fetchCreatorEarnings, distributeRevenue } from '../api/paymentApi';
import PayoutModal from '../components/common/PayoutModal';

/* ── Fallback data (used until the live endpoint ships) ─────────── */
const MOCK_DASHBOARD = {
  status: {
    creatorPro: true,
    verified: true,
    premiumPublishing: true,
  },
  performance: {
    ideasPublished: 25,
    totalReads: 4280,
    totalLikes: 72,
    totalSaves: 328,
    totalComments: 72,
  },
  content: [
    { idea: 'AI Farming Platform', reads: 1200, likes: 1200, comments: 1200, saves: 80, score: 25 },
    { idea: 'Smart Parking App',   reads: 950,  likes: 1200, comments: 1200, saves: 50, score: 15 },
  ],
  premium: {
    premiumIdeas: 8,
    freeIdeas: 17,
    premiumReads: 2150,
  },
  monthlyScore: 85,        // out of 100
  earnings: {
    estimated: 18420,      // ₹ estimated until month-end
  },
};

const MOCK_REVENUE = [
  { monthIso: '2026-06-01', month: 'June, 2026', score: 70, earning: 15000, status: 'Pending' },
  { monthIso: '2026-05-01', month: 'May, 2026',  score: 90, earning: 25000, status: 'Paid' },
];

const fmt = (n) => Number(n ?? 0).toLocaleString('en-IN');

// Same account as the backend's app.admin.email (SecurityConfig / hasRole("ADMIN")).
// Purely a UI gate — hiding the button for non-admins is a UX nicety; the
// backend is what actually enforces this and rejects everyone else with 403
// regardless of what's shown here.
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'vrutsasolutions@gmail.com';

/* Normalize a revenue-history row coming from /api/creator/earnings into the
   { month, score, earning, status } shape the table renders. */
function normalizeRevenue(row) {
  return {
    // Raw ISO date (1st of month) — needed to withdraw this row via the payout API.
    monthIso: row.month ?? row.monthIso ?? null,
    month:   row.monthLabel ?? fmtMonth(row.month) ?? '—',
    score:   row.score ?? row.sharePercent ?? row.score_percent ?? 0,
    earning: row.earning
      ?? row.revenueRupees
      ?? (row.revenuePaise != null ? row.revenuePaise / 100 : 0),
    status:  row.status ?? 'Pending',
  };
}

function fmtMonth(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  } catch { return iso; }
}

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const [data, setData]       = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payoutRow, setPayoutRow] = useState(null);   // row being withdrawn
  const [distBusy, setDistBusy]   = useState(false);  // running distribution
  const [distMsg, setDistMsg]     = useState('');     // distribution result text

  // Flip a row to "Paid" locally after a successful payout so the table
  // reflects it immediately (no refetch needed).
  const markPaid = useCallback((monthIso) => {
    setRevenue((rows) =>
      (rows ?? MOCK_REVENUE).map((r) =>
        r.monthIso === monthIso ? { ...r, status: 'Paid' } : r,
      ),
    );
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/creator/dashboard');
      setData(res);
    } catch {
      setData(MOCK_DASHBOARD);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRevenue = useCallback(async () => {
    try {
      const { data: res } = await fetchCreatorEarnings();
      const rows = Array.isArray(res) ? res : (res?.earnings ?? []);
      setRevenue(rows.length ? rows.map(normalizeRevenue) : MOCK_REVENUE);
    } catch {
      setRevenue(MOCK_REVENUE);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    loadRevenue();
  }, [fetchDashboard, loadRevenue]);

  // Run the monthly revenue distribution for the most recently CLOSED month
  // (i.e. last month, not this one). The backend now rejects the current or
  // any future month (RevenueDistributionService.parseTargetMonth guard) —
  // this used to send the current month, which is exactly the mid-month,
  // partial-data bug that guard exists to prevent.
  const runDistribution = useCallback(async () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1); // JS Date normalizes Jan → prior Dec
    const month = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
    setDistBusy(true);
    setDistMsg('');
    try {
      const { data: res } = await distributeRevenue(month);
      if (res?.message === 'Already distributed') {
        setDistMsg(`Already distributed for ${month}.`);
      } else {
        const pool = ((res?.creatorPoolPaise ?? 0) / 100).toLocaleString('en-IN');
        setDistMsg(`Distributed ${month}: ${res?.earningsCreated ?? 0} earning(s), creator pool ₹${pool}.`);
      }
      await loadRevenue();
    } catch (e) {
      setDistMsg(e?.response?.data?.message || 'Distribution failed.');
    } finally {
      setDistBusy(false);
    }
  }, [loadRevenue]);

  const d   = data ?? MOCK_DASHBOARD;
  const rev = revenue ?? MOCK_REVENUE;

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-12">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        {/* Top bar — back (left) + home (right) */}
        <div className="flex items-center justify-between relative z-10 mb-4">
          <button onClick={() => navigate(-1)} aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => navigate('/home')} aria-label="Go to home"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5L12 4l9 7.5M5 10v9a1 1 0 001 1h3v-5h4v5h3a1 1 0 001-1v-9" />
            </svg>
          </button>
        </div>

        <div className="relative z-10">
          <h1 className="text-[26px] font-bold text-white leading-none">Creator Dashboard</h1>
          <p className="text-white/60 text-sm mt-1">Insights, verification and creator performance</p>
        </div>

        {/* Identity + status badge */}
        <div className="relative z-10 mt-5 flex items-center gap-3">
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user?.name || 'You'}
              className="w-12 h-12 rounded-2xl object-cover border border-white/20 shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-white font-bold text-[15px] truncate">{user?.name ?? 'Alex Johnson'}</div>
            {d.status.creatorPro && d.status.verified && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-full px-3 py-0.5 text-[11px] font-bold text-[#065F46]">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                Verified Creator Pro
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] px-4 pt-6 pb-12 space-y-7">

          {loading ? (
            <DashboardSkeleton />
          ) : (
            <>
              {/* ── Creator Status ─────────────────────────────── */}
              <Section title="Creator Status">
                <div className="bg-white rounded-2xl border border-[#E3F2FD] p-4 space-y-3.5 shadow-sm">
                  <StatusRow label="Creator Pro"        value="Active"   ok={d.status.creatorPro} />
                  <StatusRow label="Verified Pro"       value="Verified" ok={d.status.verified} />
                  <StatusRow label="Premium Publishing" value="Enabled"  ok={d.status.premiumPublishing} />
                </div>
              </Section>

              {/* ── Performance Overview ───────────────────────── */}
              <Section title="Performance Overview">
                <div className="space-y-3">
                  {/* Wide highlighted card */}
                  <div className="bg-[#F3F4FB] border border-[#E7E9F4] rounded-2xl p-4 shadow-sm">
                    <div className="text-[#90A4AE] text-xs mb-1">Total ideas published</div>
                    <div className="text-[#0D2137] text-2xl font-bold">{fmt(d.performance.ideasPublished)}</div>
                  </div>
                  {/* 2×2 grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Total reads"    value={fmt(d.performance.totalReads)} />
                    <StatCard label="Total Likes"    value={fmt(d.performance.totalLikes)} />
                    <StatCard label="Total saves"    value={fmt(d.performance.totalSaves)} />
                    <StatCard label="Total Comments" value={fmt(d.performance.totalComments)} />
                  </div>
                </div>
              </Section>

              {/* ── Content Performance ────────────────────────── */}
              <Section title="Content Performance">
                <div className="bg-white rounded-2xl border border-[#E3F2FD] shadow-sm overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="bg-[#F8FAFF] text-[#0D2137] border-b border-[#E3F2FD]">
                        <th className="text-left  font-bold px-4 py-3">Idea</th>
                        <th className="text-right font-bold px-3 py-3">Reads</th>
                        <th className="text-right font-bold px-3 py-3">Likes</th>
                        <th className="text-right font-bold px-3 py-3">Comments</th>
                        <th className="text-right font-bold px-3 py-3">Saves</th>
                        <th className="text-right font-bold px-4 py-3">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.content.map((row) => (
                        <tr key={row.idea} className="border-b border-[#F0F2F8] last:border-0">
                          <td className="text-left  px-4 py-3.5 text-[#0D2137] font-medium">{row.idea}</td>
                          <td className="text-right px-3 py-3.5 text-[#546E7A]">{fmt(row.reads)}</td>
                          <td className="text-right px-3 py-3.5 text-[#546E7A]">{fmt(row.likes)}</td>
                          <td className="text-right px-3 py-3.5 text-[#546E7A]">{fmt(row.comments)}</td>
                          <td className="text-right px-3 py-3.5 text-[#546E7A]">{fmt(row.saves)}</td>
                          <td className="text-right px-4 py-3.5 text-[#0D2137] font-semibold">{fmt(row.score)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* ── Premium Content ────────────────────────────── */}
              <Section title="Premium Content">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <MiniCard label="Premium ideas" value={fmt(d.premium.premiumIdeas)} accent />
                    <MiniCard label="Free ideas"    value={fmt(d.premium.freeIdeas)} />
                  </div>
                  <MiniCard label="Premium reads" value={fmt(d.premium.premiumReads)} accent />
                </div>
              </Section>

              {/* ── Monthly Score + Estimated Earnings ─────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2.5">
                  <h2 className="text-[11px] font-bold tracking-wider text-[#90A4AE] uppercase px-1">Monthly Score</h2>
                  <div className="bg-white rounded-2xl border border-[#E3F2FD] p-4 shadow-sm h-[calc(100%-1.875rem)] flex items-center">
                    <span className="text-[#0D2137] text-2xl font-bold">{fmt(d.monthlyScore)}/100</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <h2 className="text-[11px] font-bold tracking-wider text-[#90A4AE] uppercase px-1">Estimated Earnings</h2>
                  <div className="bg-white rounded-2xl border border-[#E3F2FD] p-4 shadow-sm">
                    <div className="text-[#16A34A] text-2xl font-bold">₹{fmt(d.earnings.estimated)}</div>
                    <div className="text-[#90A4AE] text-xs mt-0.5">Estimated until month-end</div>
                  </div>
                </div>
              </div>

              {/* ── Revenue History ────────────────────────────── */}
              <Section title="Revenue History">
                {/* Admin-only: run the monthly revenue distribution. Builds the
                    pool from captured payments and writes each creator's Pending
                    earning, after which their Withdraw button appears. Backend
                    (hasRole("ADMIN")) is the real gate — this just keeps the
                    button from being shown to creators it will always 403 for. */}
                {isAdmin && (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={runDistribution}
                      disabled={distBusy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#BBDEFB] bg-[#F0F6FF] text-[#1565C0] text-xs font-semibold px-3 py-1.5 hover:bg-[#E3F2FD] disabled:opacity-60 transition-colors">
                      {distBusy ? (
                        <span className="w-3.5 h-3.5 border-2 border-[#BBDEFB] border-t-[#1565C0] rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M20 9a8 8 0 00-14.9-2M4 15a8 8 0 0014.9 2" />
                        </svg>
                      )}
                      {distBusy ? 'Distributing…' : 'Run monthly distribution'}
                    </button>
                    {distMsg && <span className="text-[11px] text-[#546E7A]">{distMsg}</span>}
                  </div>
                )}
                <div className="bg-white rounded-2xl border border-[#E3F2FD] shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFF] text-[#0D2137] border-b border-[#E3F2FD]">
                        <th className="text-left  font-bold px-4 py-3">Month</th>
                        <th className="text-right font-bold px-3 py-3">Score</th>
                        <th className="text-right font-bold px-3 py-3">Earning</th>
                        <th className="text-right font-bold px-3 py-3">Status</th>
                        <th className="text-right font-bold px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rev.map((row, i) => {
                        const paid       = String(row.status).toLowerCase() === 'paid';
                        const canWithdraw = !paid && Number(row.earning) > 0 && row.monthIso;
                        return (
                          <tr key={row.month + i} className="border-b border-[#F0F2F8] last:border-0">
                            <td className="text-left  px-4 py-3.5 text-[#0D2137] font-medium">{row.month}</td>
                            <td className="text-right px-3 py-3.5 text-[#546E7A]">{fmt(row.score)}</td>
                            <td className="text-right px-3 py-3.5 text-[#546E7A]">{fmt(row.earning)}</td>
                            <td className={`text-right px-3 py-3.5 font-semibold ${
                              paid ? 'text-[#16A34A]' : 'text-[#D97706]'
                            }`}>
                              {row.status}
                            </td>
                            <td className="text-right px-4 py-3.5">
                              {canWithdraw ? (
                                <button
                                  onClick={() => setPayoutRow(row)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#1565C0] hover:bg-[#0D47A1] text-white text-xs font-bold px-3 py-1.5 transition-colors active:scale-95">
                                  Withdraw
                                </button>
                              ) : paid ? (
                                <span className="text-[#16A34A] text-xs font-semibold inline-flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Paid
                                </span>
                              ) : (
                                <span className="text-[#B0BEC5] text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>

      {/* Payout (withdraw) modal */}
      {payoutRow && (
        <PayoutModal
          row={payoutRow}
          onClose={() => setPayoutRow(null)}
          onPaid={(monthIso) => markPaid(monthIso)}
        />
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-[11px] font-bold tracking-wider text-[#90A4AE] uppercase px-1">{title}</h2>
      {children}
    </section>
  );
}

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ok ? '#22C55E' : '#EF4444' }} />
        <span className="text-[#0D2137] text-sm font-medium">{label}</span>
      </div>
      <span className={`text-sm font-bold ${ok ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>{value}</span>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E3F2FD] p-4 shadow-sm">
      <div className="text-[#90A4AE] text-xs mb-1">{label}</div>
      <div className="text-[#0D2137] text-2xl font-bold">{value}</div>
    </div>
  );
}

function MiniCard({ label, value, accent }) {
  const bg  = accent ? 'bg-[#F8F5FF] border-[#E9D5FF]' : 'bg-white border-[#E3F2FD]';
  const val = accent ? 'text-[#7C3AED]' : 'text-[#0D2137]';
  return (
    <div className={`${bg} rounded-2xl border p-4 shadow-sm`}>
      <div className="text-[#546E7A] text-sm mb-1">{label}</div>
      <div className={`${val} text-xl font-bold`}>{value}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-7 animate-pulse">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2.5">
          <div className="h-3 bg-[#E3F2FD] rounded-full w-24" />
          <div className="bg-[#F0F6FF] rounded-2xl h-28" />
        </div>
      ))}
    </div>
  );
}
