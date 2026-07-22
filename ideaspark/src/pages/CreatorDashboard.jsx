import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import {
  fetchCreatorEarnings,
  distributeRevenue,
  getPayoutDetails,
} from "../api/paymentApi";
import { isPayoutComplete } from "../utils/payoutStatus";

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
    {
      idea: "AI Farming Platform",
      reads: 1200,
      likes: 1200,
      comments: 1200,
      saves: 80,
      score: 25,
    },
    {
      idea: "Smart Parking App",
      reads: 950,
      likes: 1200,
      comments: 1200,
      saves: 50,
      score: 15,
    },
  ],
  premium: {
    premiumIdeas: 8,
    freeIdeas: 17,
    premiumReads: 2150,
  },
  monthlyScore: 85, // out of 100
};

const MOCK_REVENUE = [
  {
    monthIso: "2026-06-01",
    month: "June, 2026",
    score: 70,
    earning: 15000,
    status: "Scheduled",
    scheduledFor: "2026-07-15",
  },
  {
    monthIso: "2026-05-01",
    month: "May, 2026",
    score: 90,
    earning: 25000,
    status: "Paid",
    paidAt: "2026-06-15T10:03:00",
    destination: "ICICI Bank XXXXXXXX4589",
  },
];

const fmt = (n) => Number(n ?? 0).toLocaleString("en-IN");

const fmtDate = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

/** Month name one after the given ISO month — used for "Rolled over to X". */
const fmtNextMonthName = (iso) => {
  if (!iso) return "next month";
  try {
    const d = new Date(iso);
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("en-IN", { month: "long" });
  } catch {
    return "next month";
  }
};

// Same account as the backend's app.admin.email (SecurityConfig / hasRole("ADMIN")).
// Purely a UI gate — hiding the button for non-admins is a UX nicety; the
// backend is what actually enforces this and rejects everyone else with 403
// regardless of what's shown here.
const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL || "vrutsasolutions@gmail.com";

/* Normalize a revenue-history row coming from /api/creator/earnings into the
   shape the table renders. */
function normalizeRevenue(row) {
  return {
    monthIso: row.month ?? row.monthIso ?? null,
    month: row.monthLabel ?? fmtMonth(row.month) ?? "—",
    score: row.score ?? row.sharePercent ?? row.score_percent ?? 0,
    earning:
      row.earning ??
      row.revenueRupees ??
      (row.revenuePaise != null ? row.revenuePaise / 100 : 0),
    status: row.status ?? "Scheduled",
    scheduledFor: row.scheduledFor ?? null,
    paidAt: row.paidAt ?? null,
    destination: row.destination ?? null,
    failureReason: row.failureReason ?? null,
    rolledFrom: row.rolledFrom ?? null,
  };
}

function fmtMonth(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin =
    !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const [data, setData] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [distBusy, setDistBusy] = useState(false); // running distribution
  const [distMsg, setDistMsg] = useState(""); // distribution result text
  const [payoutDetails, setPayoutDetails] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get("/creator/dashboard");
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
      setRevenue(rows.length ? rows.map(normalizeRevenue) : []);
    } catch {
      setRevenue(MOCK_REVENUE);
    }
  }, []);

  // Only relevant for Creator Pro members — checks whether payout details
  // have been set up, to show/hide the "set up now" banner. Failures are
  // treated as "not configured" so the banner errs toward showing rather
  // than silently hiding a real setup gap.
  const checkPayoutSetup = useCallback(async () => {
    if (!user?.creatorPro) return;
    try {
      const { data: res } = await getPayoutDetails();
      setPayoutDetails(res);
    } catch {
      setPayoutDetails(null);
    }
  }, [user?.creatorPro]);

  useEffect(() => {
    fetchDashboard();
    loadRevenue();
    checkPayoutSetup();
  }, [fetchDashboard, loadRevenue, checkPayoutSetup]);

  // Run the monthly revenue distribution for the most recently CLOSED month
  // (i.e. last month, not this one). The backend rejects the current or any
  // future month (RevenueDistributionService.parseTargetMonth guard) — this
  // used to send the current month, which is exactly the mid-month, partial
  // data bug that guard exists to prevent.
  const runDistribution = useCallback(async () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1); // JS Date normalizes Jan → prior Dec
    const month = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;
    setDistBusy(true);
    setDistMsg("");
    try {
      const { data: res } = await distributeRevenue(month);
      if (res?.message === "Already distributed") {
        setDistMsg(`Already distributed for ${month}.`);
      } else {
        const pool = ((res?.creatorPoolPaise ?? 0) / 100).toLocaleString(
          "en-IN",
        );
        setDistMsg(
          `Distributed ${month}: ${res?.earningsCreated ?? 0} earning(s), creator pool ₹${pool}.`,
        );
      }
      await loadRevenue();
    } catch (e) {
      setDistMsg(e?.response?.data?.message || "Distribution failed.");
    } finally {
      setDistBusy(false);
    }
  }, [loadRevenue]);

  const d = data ?? MOCK_DASHBOARD;
  const rev = revenue ?? MOCK_REVENUE;
  // Treat "backend says configured but personal/tax details are blank" the
  // same as "not set up". We only render the banner/modal once the fetch
  // has actually resolved (payoutDetails !== null) to avoid a flash on
  // first load.
  const payoutIncomplete =
    !!user?.creatorPro &&
    payoutDetails !== null &&
    !isPayoutComplete(payoutDetails);
  const showSetupBanner = payoutIncomplete;
  // Same signal as the banner — but this one blocks the whole dashboard
  // until the creator finishes payout setup. No dismiss button by design:
  // an active Creator Pro member without payout details can't be paid, so
  // we make sure they can't miss this and can't put it off.
  const showSetupModal = payoutIncomplete;

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-12">
      {/* ── Blocking payout setup modal ─────────────────────────── */}
      {showSetupModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payout-setup-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div
              className="px-6 pt-6 pb-5 text-white"
              style={{
                background:
                  "linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)",
              }}
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zM7 15h4"
                  />
                </svg>
              </div>
              <h2
                id="payout-setup-modal-title"
                className="text-lg font-bold leading-tight"
              >
                Set up your payouts to get paid
              </h2>
              <p className="text-white/80 text-xs mt-1.5 leading-relaxed">
                Creator Pro is active on your account, but we don't have
                your bank or UPI details yet. Add them once and we'll take
                care of the rest.
              </p>
            </div>

            <div className="px-6 py-5 space-y-3 text-sm text-[#546E7A]">
              <div className="flex items-start gap-2.5">
                <CheckIcon />
                <span>Takes about 2 minutes</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckIcon />
                <span>Your earnings are held safely until setup is done</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckIcon />
                <span>PAN + bank/UPI needed per RBI norms</span>
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() =>
                  navigate("/payout-setup", { state: { fromPurchase: true } })
                }
                className="w-full bg-[#1565C0] hover:bg-[#0D47A1] active:scale-95 text-white font-bold rounded-xl py-3.5 transition-all"
              >
                Set up now
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        {/* Top bar — back (left) + home (right) */}
        <div className="flex items-center justify-between relative z-10 mb-4">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={() => navigate("/home")}
            aria-label="Go to home"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
          >
            <svg
              className="w-[18px] h-[18px]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
            </svg>
          </button>
        </div>

        <div className="relative z-10">
          <h1 className="text-[26px] font-bold text-white leading-none">
            Creator Dashboard
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Insights, verification and creator performance
          </p>
        </div>

        {/* Identity + status badge */}
        <div className="relative z-10 mt-5 flex items-center gap-3">
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={user?.name || "You"}
              className="w-12 h-12 rounded-2xl object-cover border border-white/20 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-white font-bold text-[15px] truncate">
              {user?.name ?? "Alex Johnson"}
            </div>
            {d.status.creatorPro && d.status.verified && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-full px-3 py-0.5 text-[11px] font-bold text-[#065F46]">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
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
              {/* ── Payout setup banner ─────────────────────────── */}
              {showSetupBanner && (
                <button
                  onClick={() => navigate("/payout-setup")}
                  className="w-full flex items-center justify-between gap-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4 py-3.5 text-left hover:bg-[#FFEFD9] active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#FEEBC8] flex items-center justify-center shrink-0">
                      <svg
                        className="w-5 h-5 text-[#D97706]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <path d="M2 10h20" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[#78350F] text-sm font-bold">
                        Set up your payout details
                      </div>
                      <div className="text-[#92400E]/80 text-xs mt-0.5">
                        Required to receive your creator earnings
                      </div>
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4 text-[#D97706] shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}

              {/* ── Creator Status ─────────────────────────────── */}
              <Section title="Creator Status">
                <div className="bg-white rounded-2xl border border-[#E3F2FD] p-4 space-y-3.5 shadow-sm">
                  <StatusRow
                    label="Creator Pro"
                    value="Active"
                    ok={d.status.creatorPro}
                  />
                  <StatusRow
                    label="Verified Pro"
                    value="Verified"
                    ok={d.status.verified}
                  />
                  <StatusRow
                    label="Premium Publishing"
                    value="Enabled"
                    ok={d.status.premiumPublishing}
                  />
                </div>
              </Section>

              {/* ── Performance Overview ───────────────────────── */}
              <Section title="Performance Overview">
                <div className="space-y-3">
                  {/* Wide highlighted card */}
                  <div className="bg-[#F3F4FB] border border-[#E7E9F4] rounded-2xl p-4 shadow-sm">
                    <div className="text-[#90A4AE] text-xs mb-1">
                      Total ideas published
                    </div>
                    <div className="text-[#0D2137] text-2xl font-bold">
                      {fmt(d.performance.ideasPublished)}
                    </div>
                  </div>
                  {/* 2×2 grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      label="Total reads"
                      value={fmt(d.performance.totalReads)}
                    />
                    <StatCard
                      label="Total Likes"
                      value={fmt(d.performance.totalLikes)}
                    />
                    <StatCard
                      label="Total saves"
                      value={fmt(d.performance.totalSaves)}
                    />
                    <StatCard
                      label="Total Comments"
                      value={fmt(d.performance.totalComments)}
                    />
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
                        <th className="text-right font-bold px-3 py-3">
                          Reads
                        </th>
                        <th className="text-right font-bold px-3 py-3">
                          Likes
                        </th>
                        <th className="text-right font-bold px-3 py-3">
                          Comments
                        </th>
                        <th className="text-right font-bold px-3 py-3">
                          Saves
                        </th>
                        <th className="text-right font-bold px-4 py-3">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.content.map((row) => (
                        <tr
                          key={row.idea}
                          className="border-b border-[#F0F2F8] last:border-0"
                        >
                          <td className="text-left  px-4 py-3.5 text-[#0D2137] font-medium">
                            {row.idea}
                          </td>
                          <td className="text-right px-3 py-3.5 text-[#546E7A]">
                            {fmt(row.reads)}
                          </td>
                          <td className="text-right px-3 py-3.5 text-[#546E7A]">
                            {fmt(row.likes)}
                          </td>
                          <td className="text-right px-3 py-3.5 text-[#546E7A]">
                            {fmt(row.comments)}
                          </td>
                          <td className="text-right px-3 py-3.5 text-[#546E7A]">
                            {fmt(row.saves)}
                          </td>
                          <td className="text-right px-4 py-3.5 text-[#0D2137] font-semibold">
                            {fmt(row.score)}
                          </td>
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
                    <MiniCard
                      label="Premium ideas"
                      value={fmt(d.premium.premiumIdeas)}
                      accent
                    />
                    <MiniCard
                      label="Free ideas"
                      value={fmt(d.premium.freeIdeas)}
                    />
                  </div>
                  <MiniCard
                    label="Premium reads"
                    value={fmt(d.premium.premiumReads)}
                    accent
                  />
                </div>
              </Section>

              {/* ── Monthly Score + Payout Settings ────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2.5">
                  <h2 className="text-[11px] font-bold tracking-wider text-[#90A4AE] uppercase px-1">
                    Monthly Score
                  </h2>
                  <div className="bg-white rounded-2xl border border-[#E3F2FD] p-4 shadow-sm h-[calc(100%-1.875rem)] flex items-center">
                    <span className="text-[#0D2137] text-2xl font-bold">
                      {fmt(d.monthlyScore)}/100
                    </span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <h2 className="text-[11px] font-bold tracking-wider text-[#90A4AE] uppercase px-1">
                    Payout Settings
                  </h2>
                  <button
                    onClick={() => navigate("/payout-settings")}
                    className="w-full bg-white rounded-2xl border border-[#E3F2FD] p-4 shadow-sm h-[calc(100%-1.875rem)] flex items-center justify-between gap-2 hover:bg-[#F8FAFF] active:scale-[0.98] transition-all text-left"
                  >
                    <span className="text-[#1565C0] text-sm font-bold leading-tight">
                      Manage payout
                    </span>
                    <svg
                      className="w-4 h-4 text-[#1565C0] shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── Earnings history ────────────────────────────── */}
              <Section title="Earnings history">
                {/* Admin-only: run the monthly revenue distribution. Builds the
                    pool from captured payments and writes each creator's
                    Scheduled earning ahead of the automatic payout on the 15th.
                    Backend (hasRole("ADMIN")) is the real gate — this just
                    keeps the button from being shown to creators it will
                    always 403 for. */}
                {isAdmin && (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={runDistribution}
                      disabled={distBusy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#BBDEFB] bg-[#F0F6FF] text-[#1565C0] text-xs font-semibold px-3 py-1.5 hover:bg-[#E3F2FD] disabled:opacity-60 transition-colors"
                    >
                      {distBusy ? (
                        <span className="w-3.5 h-3.5 border-2 border-[#BBDEFB] border-t-[#1565C0] rounded-full animate-spin" />
                      ) : (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 4v5h5M20 20v-5h-5M20 9a8 8 0 00-14.9-2M4 15a8 8 0 0014.9 2"
                          />
                        </svg>
                      )}
                      {distBusy ? "Distributing…" : "Run monthly distribution"}
                    </button>
                    {distMsg && (
                      <span className="text-[11px] text-[#546E7A]">
                        {distMsg}
                      </span>
                    )}
                  </div>
                )}

                {/* Payout service activation card — shown to all creators
                    until the payout service goes live. The backend already
                    handles the ₹1500 rollover threshold and scheduled payout
                    logic properly; this card is purely a frontend placeholder
                    while the service is being activated. */}
                <div className="bg-white rounded-2xl border border-[#E3F2FD] shadow-sm overflow-hidden">
                  {/* Card header with icon */}
                  <div className="px-5 pt-6 pb-5 text-center">
                    <div className="w-14 h-14 rounded-full bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-7 h-7 text-[#D97706]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-[#0D2137] text-base font-bold leading-snug">
                      Creator payouts will begin once the payout service is activated
                    </h3>
                    <p className="text-[#546E7A] text-xs mt-2 leading-relaxed max-w-xs mx-auto">
                      We're setting things up so you can get paid automatically.
                      Your earnings are being tracked and will be paid out as soon
                      as the service goes live.
                    </p>
                  </div>

                  {/* Info bullets */}
                  <div className="border-t border-[#F0F2F8] px-5 py-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-[#0D2137] text-sm font-semibold">Minimum payout: ₹1,500</div>
                        <div className="text-[#90A4AE] text-xs mt-0.5">Earnings below this amount roll over to the next month automatically</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-[#1565C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-[#0D2137] text-sm font-semibold">Payouts on the 15th</div>
                        <div className="text-[#90A4AE] text-xs mt-0.5">Earnings are calculated and paid out on the 15th of every month</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#F5F3FF] flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-[#0D2137] text-sm font-semibold">Your earnings are safe</div>
                        <div className="text-[#90A4AE] text-xs mt-0.5">All your earnings are tracked and securely held until the service is activated</div>
                      </div>
                    </div>
                  </div>

                  {/* Status indicator footer */}
                  <div className="border-t border-[#F0F2F8] bg-[#FFFBF5] px-5 py-3 flex items-center justify-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F59E0B]" />
                    </span>
                    <span className="text-[#92400E] text-xs font-semibold">Payout service activation in progress</span>
                  </div>
                </div>

                {/* ── Earnings table ─────────────────────────────── */}
                <div
                  className="bg-white rounded-2xl border border-[#E3F2FD] shadow-sm overflow-x-auto"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <table className="min-w-[720px] w-full text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFF] text-[#0D2137] border-b border-[#E3F2FD]">
                        <th className="text-left  font-bold px-4 py-3">
                          Month
                        </th>
                        <th className="text-right font-bold px-3 py-3">
                          Score
                        </th>
                        <th className="text-right font-bold px-3 py-3">
                          Earning
                        </th>
                        <th className="text-right font-bold px-3 py-3">
                          Status
                        </th>
                        <th className="text-right font-bold px-4 py-3">
                          Receipt
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rev.map((row, i) => {
                        const hasReceipt = [
                          "paid",
                          "processing",
                          "failed",
                        ].includes(String(row.status || "").toLowerCase());
                        return (
                          <tr
                            key={row.month + i}
                            className="border-b border-[#F0F2F8] last:border-0"
                          >
                            <td className="text-left  px-4 py-3.5 text-[#0D2137] font-medium align-top">
                              {row.month}
                            </td>
                            <td className="text-right px-3 py-3.5 text-[#546E7A] align-top">
                              {fmt(row.score)}
                            </td>
                            <td className="text-right px-3 py-3.5 text-[#546E7A] align-top">
                              {fmt(row.earning)}
                            </td>
                            <td className="text-right px-3 py-3.5 align-top">
                              <EarningStatus
                                row={row}
                                onSetup={() =>
                                  navigate("/payout-setup", {
                                    state: { fromPurchase: true },
                                  })
                                }
                              />
                            </td>
                            <td className="text-right px-4 py-3.5 align-top">
                              {hasReceipt ? (
                                <button
                                  onClick={() =>
                                    navigate("/payout-detail", {
                                      state: { row },
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[#1565C0] text-xs font-bold hover:underline active:scale-95 transition-all"
                                >
                                  View
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </button>
                              ) : (
                                <span className="text-[#B0BEC5] text-xs">
                                  —
                                </span>
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
    </div>
  );
}

/* ── Status cell ───────────────────────────────────────────────── */
/**
 * Renders the right-hand status column for one earnings row. Mirrors the
 * backend lifecycle 1:1 — see CreatorEarning.java javadoc for the source
 * of truth on what each status means.
 */
function EarningStatus({ row, onSetup }) {
  const status = String(row.status || "").toLowerCase();

  switch (status) {
    case "estimating":
      return (
        <span className="text-[#90A4AE] text-xs font-medium italic">
          Estimating…
        </span>
      );

    case "scheduled":
      return (
        <span className="text-[#D97706] text-xs font-semibold">
          Scheduled for {fmtDate(row.scheduledFor) || "the 15th"}
        </span>
      );

    case "processing":
      return (
        <span className="inline-flex items-center gap-1.5 text-[#1565C0] text-xs font-semibold">
          <span className="w-3 h-3 border-2 border-[#BBDEFB] border-t-[#1565C0] rounded-full animate-spin" />
          Processing…
        </span>
      );

    case "paid":
      return (
        <div className="text-right">
          <span className="text-[#16A34A] text-xs font-semibold inline-flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Paid
          </span>
          <div className="text-[#90A4AE] text-[10px] mt-0.5 leading-tight">
            {fmtDate(row.paidAt)}
            {row.destination ? ` to ${row.destination}` : ""}
          </div>
        </div>
      );

    case "setup_missing":
      return (
        <button
          type="button"
          onClick={onSetup}
          className="text-[#D97706] hover:text-[#B45309] text-xs font-semibold underline underline-offset-2 cursor-pointer active:scale-95 transition-all"
        >
          Set up payout details
        </button>
      );

    case "failed":
      return (
        <div className="text-right">
          <span className="text-[#DC2626] text-xs font-semibold">
            Payout failed
          </span>
          <div className="text-[#90A4AE] text-[10px] mt-0.5 leading-tight">
            Check payout details
          </div>
        </div>
      );

    case "rolled_over":
      return (
        <span className="text-[#7C3AED] text-xs font-semibold">
          Rolled over to {fmtNextMonthName(row.monthIso)}
        </span>
      );

    case "absorbed":
      return (
        <span className="text-[#90A4AE] text-xs">
          Included in a later payout
        </span>
      );

    default:
      return (
        <span className="text-[#B0BEC5] text-xs">{row.status || "—"}</span>
      );
  }
}

/* ── Sub-components ───────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-[11px] font-bold tracking-wider text-[#90A4AE] uppercase px-1">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span
          className="w-2.5 h-2.5 rounded-sm"
          style={{ background: ok ? "#22C55E" : "#EF4444" }}
        />
        <span className="text-[#0D2137] text-sm font-medium">{label}</span>
      </div>
      <span
        className={`text-sm font-bold ${ok ? "text-[#16A34A]" : "text-[#EF4444]"}`}
      >
        {value}
      </span>
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
  const bg = accent
    ? "bg-[#F8F5FF] border-[#E9D5FF]"
    : "bg-white border-[#E3F2FD]";
  const val = accent ? "text-[#7C3AED]" : "text-[#0D2137]";
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

/**
 * Small green checkmark used in the payout-setup blocking modal.
 */
function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-[#22C55E] mt-0.5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
