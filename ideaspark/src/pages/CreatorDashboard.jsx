import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import {
  fetchCreatorEarnings,
  distributeRevenue,
  getPayoutDetails,
} from "../api/paymentApi";

/* ── Fallback data ─────────────────────────────────────────────── */

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
  monthlyScore: 85,
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

const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL ||
  "vrutsasolutions@gmail.com";

const fmt = (value) =>
  Number(value ?? 0).toLocaleString("en-IN");

const fmtDate = (iso) => {
  if (!iso) {
    return null;
  }

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

const fmtNextMonthName = (iso) => {
  if (!iso) {
    return "next month";
  }

  try {
    const date = new Date(iso);
    date.setMonth(date.getMonth() + 1);

    return date.toLocaleDateString("en-IN", {
      month: "long",
    });
  } catch {
    return "next month";
  }
};

function fmtMonth(iso) {
  if (!iso) {
    return null;
  }

  try {
    return new Date(iso).toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function normalizeRevenue(row) {
  return {
    monthIso: row.month ?? row.monthIso ?? null,
    month: row.monthLabel ?? fmtMonth(row.month) ?? "—",
    score:
      row.score ??
      row.sharePercent ??
      row.score_percent ??
      0,
    earning:
      row.earning ??
      row.revenueRupees ??
      (row.revenuePaise != null
        ? row.revenuePaise / 100
        : 0),
    status: row.status ?? "Scheduled",
    scheduledFor: row.scheduledFor ?? null,
    paidAt: row.paidAt ?? null,
    destination: row.destination ?? null,
    failureReason: row.failureReason ?? null,
    rolledFrom: row.rolledFrom ?? null,
  };
}

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin =
    Boolean(user?.email) &&
    user.email.toLowerCase() ===
      ADMIN_EMAIL.toLowerCase();

  const [data, setData] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);

  const [distBusy, setDistBusy] = useState(false);
  const [distMsg, setDistMsg] = useState("");

  const [payoutConfigured, setPayoutConfigured] =
    useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const { data: response } = await api.get(
        "/creator/dashboard",
      );

      setData(response);
    } catch {
      setData(MOCK_DASHBOARD);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRevenue = useCallback(async () => {
    try {
      const { data: response } =
        await fetchCreatorEarnings();

      const rows = Array.isArray(response)
        ? response
        : response?.earnings ?? [];

      setRevenue(
        rows.length
          ? rows.map(normalizeRevenue)
          : [],
      );
    } catch {
      setRevenue(MOCK_REVENUE);
    }
  }, []);

  const checkPayoutSetup = useCallback(async () => {
    if (!user?.creatorPro) {
      return;
    }

    try {
      const { data: response } =
        await getPayoutDetails();

      setPayoutConfigured(
        Boolean(response?.configured),
      );
    } catch {
      setPayoutConfigured(false);
    }
  }, [user?.creatorPro]);

  useEffect(() => {
    fetchDashboard();
    loadRevenue();
    checkPayoutSetup();
  }, [
    fetchDashboard,
    loadRevenue,
    checkPayoutSetup,
  ]);

  const runDistribution = useCallback(async () => {
    const now = new Date();

    const lastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const month = `${lastMonth.getFullYear()}-${String(
      lastMonth.getMonth() + 1,
    ).padStart(2, "0")}-01`;

    setDistBusy(true);
    setDistMsg("");

    try {
      const { data: response } =
        await distributeRevenue(month);

      if (response?.message === "Already distributed") {
        setDistMsg(
          `Already distributed for ${month}.`,
        );
      } else {
        const creatorPool = (
          (response?.creatorPoolPaise ?? 0) / 100
        ).toLocaleString("en-IN");

        setDistMsg(
          `Distributed ${month}: ${
            response?.earningsCreated ?? 0
          } earning(s), creator pool ₹${creatorPool}.`,
        );
      }

      await loadRevenue();
    } catch (error) {
      setDistMsg(
        error?.response?.data?.message ||
          "Distribution failed.",
      );
    } finally {
      setDistBusy(false);
    }
  }, [loadRevenue]);

  const dashboard = data ?? MOCK_DASHBOARD;
  const revenueRows = revenue ?? MOCK_REVENUE;

  const showSetupBanner =
    Boolean(user?.creatorPro) &&
    !payoutConfigured;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F4F7FF] pb-10 sm:pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 relative border-b border-white/10 bg-[#1565C0] px-3 pt-3 pb-8 shadow-lg sm:px-4 sm:pt-4 sm:pb-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full border-[30px] border-white/5" />
          <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full border-[24px] border-white/5" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-all hover:bg-white/25 active:scale-90"
            >
              <svg
                className="h-5 w-5"
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
              type="button"
              onClick={() => navigate("/home")}
              aria-label="Go to home"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-all hover:bg-white/25 active:scale-90"
            >
              <svg
                className="h-[18px] w-[18px]"
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

          <div>
            <h1 className="break-words text-[22px] font-bold leading-tight text-white sm:text-[26px]">
              Creator Dashboard
            </h1>

            <p className="mt-1 text-xs leading-relaxed text-white/60 sm:text-sm">
              Insights, verification and creator
              performance
            </p>
          </div>

          <div className="mt-5 flex min-w-0 items-center gap-3">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user?.name || "You"}
                className="h-11 w-11 shrink-0 rounded-2xl border border-white/20 object-cover sm:h-12 sm:w-12"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/20 text-lg font-bold text-white sm:h-12 sm:w-12 sm:text-xl">
                {user?.name?.[0]?.toUpperCase() ?? "A"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white sm:text-[15px]">
                {user?.name ?? "Alex Johnson"}
              </div>

              {dashboard.status.creatorPro &&
                dashboard.status.verified && (
                  <div className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-0.5 text-[10px] font-bold text-[#065F46] sm:px-3 sm:text-[11px]">
                    <svg
                      className="h-3 w-3 shrink-0"
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

                    <span className="truncate">
                      Verified Creator Pro
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>
      </header>

      <div className="bg-[#1565C0]">
        <main className="mx-auto w-full max-w-6xl rounded-t-[24px] bg-white px-3 pt-5 pb-12 sm:rounded-t-[32px] sm:px-4 sm:pt-6 md:px-6 lg:px-8">
          <div className="space-y-6 sm:space-y-7">
            {loading ? (
              <DashboardSkeleton />
            ) : (
              <>
                {showSetupBanner && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/payout-setup")
                    }
                    className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] px-3.5 py-3.5 text-left transition-all hover:bg-[#FFEFD9] active:scale-[0.99] sm:px-4"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEEBC8]">
                        <svg
                          className="h-5 w-5 text-[#D97706]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <rect
                            x="2"
                            y="5"
                            width="20"
                            height="14"
                            rx="2"
                          />
                          <path d="M2 10h20" />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="break-words text-sm font-bold text-[#78350F]">
                          Set up your payout details
                        </div>

                        <div className="mt-0.5 break-words text-xs leading-relaxed text-[#92400E]/80">
                          Required to receive your creator
                          earnings
                        </div>
                      </div>
                    </div>

                    <svg
                      className="h-4 w-4 shrink-0 text-[#D97706]"
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

                <Section title="Creator Status">
                  <div className="space-y-3.5 rounded-2xl border border-[#E3F2FD] bg-white p-3.5 shadow-sm sm:p-4">
                    <StatusRow
                      label="Creator Pro"
                      value="Active"
                      ok={dashboard.status.creatorPro}
                    />

                    <StatusRow
                      label="Verified Pro"
                      value="Verified"
                      ok={dashboard.status.verified}
                    />

                    <StatusRow
                      label="Premium Publishing"
                      value="Enabled"
                      ok={
                        dashboard.status
                          .premiumPublishing
                      }
                    />
                  </div>
                </Section>

                <Section title="Performance Overview">
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-[#E7E9F4] bg-[#F3F4FB] p-3.5 shadow-sm sm:p-4">
                      <div className="mb-1 text-xs text-[#90A4AE]">
                        Total ideas published
                      </div>

                      <div className="text-2xl font-bold text-[#0D2137]">
                        {fmt(
                          dashboard.performance
                            .ideasPublished,
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                      <StatCard
                        label="Total reads"
                        value={fmt(
                          dashboard.performance
                            .totalReads,
                        )}
                      />

                      <StatCard
                        label="Total likes"
                        value={fmt(
                          dashboard.performance
                            .totalLikes,
                        )}
                      />

                      <StatCard
                        label="Total saves"
                        value={fmt(
                          dashboard.performance
                            .totalSaves,
                        )}
                      />

                      <StatCard
                        label="Total comments"
                        value={fmt(
                          dashboard.performance
                            .totalComments,
                        )}
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Content Performance">
                  

                  <div
                    className="w-full max-w-full overflow-x-auto rounded-2xl border border-[#E3F2FD] bg-white shadow-sm"
                    style={{
                      WebkitOverflowScrolling:
                        "touch",
                    }}
                  >
                    <table className="w-full min-w-[620px] text-sm">
                      <thead>
                        <tr className="border-b border-[#E3F2FD] bg-[#F8FAFF] text-[#0D2137]">
                          <th className="min-w-[190px] px-4 py-3 text-left font-bold">
                            Idea
                          </th>

                          <th className="min-w-[75px] px-3 py-3 text-right font-bold">
                            Reads
                          </th>

                          <th className="min-w-[75px] px-3 py-3 text-right font-bold">
                            Likes
                          </th>

                          <th className="min-w-[90px] px-3 py-3 text-right font-bold">
                            Comments
                          </th>

                          <th className="min-w-[75px] px-3 py-3 text-right font-bold">
                            Saves
                          </th>

                          <th className="min-w-[70px] px-4 py-3 text-right font-bold">
                            Score
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {dashboard.content.map(
                          (row) => (
                            <tr
                              key={row.idea}
                              className="border-b border-[#F0F2F8] last:border-0"
                            >
                              <td className="max-w-[240px] break-words px-4 py-3.5 text-left font-medium text-[#0D2137]">
                                {row.idea}
                              </td>

                              <td className="px-3 py-3.5 text-right text-[#546E7A]">
                                {fmt(row.reads)}
                              </td>

                              <td className="px-3 py-3.5 text-right text-[#546E7A]">
                                {fmt(row.likes)}
                              </td>

                              <td className="px-3 py-3.5 text-right text-[#546E7A]">
                                {fmt(row.comments)}
                              </td>

                              <td className="px-3 py-3.5 text-right text-[#546E7A]">
                                {fmt(row.saves)}
                              </td>

                              <td className="px-4 py-3.5 text-right font-semibold text-[#0D2137]">
                                {fmt(row.score)}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </Section>

                <Section title="Premium Content">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                      <MiniCard
                        label="Premium ideas"
                        value={fmt(
                          dashboard.premium
                            .premiumIdeas,
                        )}
                        accent
                      />

                      <MiniCard
                        label="Free ideas"
                        value={fmt(
                          dashboard.premium
                            .freeIdeas,
                        )}
                      />
                    </div>

                    <MiniCard
                      label="Premium reads"
                      value={fmt(
                        dashboard.premium
                          .premiumReads,
                      )}
                      accent
                    />
                  </div>
                </Section>

                <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
                  <div className="space-y-2.5">
                    <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#90A4AE]">
                      Monthly Score
                    </h2>

                    <div className="flex min-h-[88px] items-center rounded-2xl border border-[#E3F2FD] bg-white p-4 shadow-sm">
                      <span className="break-words text-2xl font-bold text-[#0D2137]">
                        {fmt(
                          dashboard.monthlyScore,
                        )}
                        /100
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#90A4AE]">
                      Payout Settings
                    </h2>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          "/payout-settings",
                        )
                      }
                      className="flex min-h-[88px] w-full items-center justify-between gap-2 rounded-2xl border border-[#E3F2FD] bg-white p-4 text-left shadow-sm transition-all hover:bg-[#F8FAFF] active:scale-[0.98]"
                    >
                      <span className="min-w-0 break-words text-sm font-bold leading-tight text-[#1565C0]">
                        Manage payout
                      </span>

                      <svg
                        className="h-4 w-4 shrink-0 text-[#1565C0]"
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

                <Section title="Earnings history">
                  {isAdmin && (
                    <div className="mb-2 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <button
                        type="button"
                        onClick={runDistribution}
                        disabled={distBusy}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#BBDEFB] bg-[#F0F6FF] px-3 py-1.5 text-xs font-semibold text-[#1565C0] transition-colors hover:bg-[#E3F2FD] disabled:opacity-60"
                      >
                        {distBusy ? (
                          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#BBDEFB] border-t-[#1565C0]" />
                        ) : (
                          <svg
                            className="h-3.5 w-3.5 shrink-0"
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

                        <span className="whitespace-normal break-words text-left">
                          {distBusy
                            ? "Distributing…"
                            : "Run monthly distribution"}
                        </span>
                      </button>

                      {distMsg && (
                        <span className="min-w-0 break-words text-[11px] leading-relaxed text-[#546E7A]">
                          {distMsg}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-[#BBDEFB] bg-[#F0F6FF] px-3.5 py-3 text-xs leading-relaxed text-[#0D2137] sm:px-4">
                    Earnings are paid out on the{" "}
                    <strong>
                      15th of every month
                    </strong>{" "}
                    for the previous month&apos;s
                    earnings, directly to your
                    registered bank account. Minimum
                    payout: <strong>₹500</strong>.
                    Amounts below this roll over to the
                    next month.
                  </div>

                  
                  <div
                    className="w-full max-w-full overflow-x-auto rounded-2xl border border-[#E3F2FD] bg-white shadow-sm"
                    style={{
                      WebkitOverflowScrolling:
                        "touch",
                    }}
                  >
                    <table className="w-full min-w-[680px] text-sm">
                      <thead>
                        <tr className="border-b border-[#E3F2FD] bg-[#F8FAFF] text-[#0D2137]">
                          <th className="min-w-[120px] px-4 py-3 text-left font-bold">
                            Month
                          </th>

                          <th className="min-w-[75px] px-3 py-3 text-right font-bold">
                            Score
                          </th>

                          <th className="min-w-[90px] px-3 py-3 text-right font-bold">
                            Earning
                          </th>

                          <th className="min-w-[150px] px-3 py-3 text-right font-bold">
                            Status
                          </th>

                          <th className="min-w-[90px] px-4 py-3 text-right font-bold">
                            Receipt
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {revenueRows.map(
                          (row, index) => {
                            const hasReceipt = [
                              "paid",
                              "processing",
                              "failed",
                            ].includes(
                              String(
                                row.status || "",
                              ).toLowerCase(),
                            );

                            return (
                              <tr
                                key={`${row.month}-${index}`}
                                className="border-b border-[#F0F2F8] last:border-0"
                              >
                                <td className="min-w-[120px] break-words px-4 py-3.5 text-left align-top font-medium text-[#0D2137]">
                                  {row.month}
                                </td>

                                <td className="min-w-[75px] px-3 py-3.5 text-right align-top text-[#546E7A]">
                                  {fmt(row.score)}
                                </td>

                                <td className="min-w-[90px] px-3 py-3.5 text-right align-top text-[#546E7A]">
                                  {fmt(
                                    row.earning,
                                  )}
                                </td>

                                <td className="min-w-[150px] px-3 py-3.5 text-right align-top">
                                  <EarningStatus
                                    row={row}
                                  />
                                </td>

                                <td className="min-w-[90px] px-4 py-3.5 text-right align-top">
                                  {hasReceipt ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        navigate(
                                          "/payout-detail",
                                          {
                                            state: {
                                              row,
                                            },
                                          },
                                        )
                                      }
                                      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-[#1565C0] transition-all hover:underline active:scale-95"
                                    >
                                      View

                                      <svg
                                        className="h-3 w-3"
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
                                    <span className="text-xs text-[#B0BEC5]">
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                </Section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── Status rendering ─────────────────────────────────────────── */

function EarningStatus({ row }) {
  const status = String(
    row.status || "",
  ).toLowerCase();

  switch (status) {
    case "estimating":
      return (
        <span className="text-xs font-medium italic text-[#90A4AE]">
          Estimating…
        </span>
      );

    case "scheduled":
      return (
        <span className="inline-block max-w-[160px] break-words text-xs font-semibold leading-relaxed text-[#D97706]">
          Scheduled for{" "}
          {fmtDate(row.scheduledFor) ||
            "the 15th"}
        </span>
      );

    case "processing":
      return (
        <span className="inline-flex max-w-[160px] items-center justify-end gap-1.5 break-words text-xs font-semibold text-[#1565C0]">
          <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-[#BBDEFB] border-t-[#1565C0]" />
          Processing…
        </span>
      );

    case "paid":
      return (
        <div className="max-w-[170px] text-right">
          <span className="inline-flex items-center justify-end gap-1 text-xs font-semibold text-[#16A34A]">
            <svg
              className="h-3.5 w-3.5 shrink-0"
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

          <div className="mt-0.5 break-words text-[10px] leading-tight text-[#90A4AE]">
            {fmtDate(row.paidAt)}
            {row.destination
              ? ` to ${row.destination}`
              : ""}
          </div>
        </div>
      );

    case "setup_missing":
      return (
        <span className="inline-block max-w-[160px] break-words text-xs font-semibold leading-relaxed text-[#D97706] underline underline-offset-2">
          Set up payout details
        </span>
      );

    case "failed":
      return (
        <div className="max-w-[170px] text-right">
          <span className="break-words text-xs font-semibold text-[#DC2626]">
            Payout failed
          </span>

          <div className="mt-0.5 break-words text-[10px] leading-tight text-[#90A4AE]">
            Check payout details
          </div>
        </div>
      );

    case "rolled_over":
      return (
        <span className="inline-block max-w-[160px] break-words text-xs font-semibold leading-relaxed text-[#7C3AED]">
          Rolled over to{" "}
          {fmtNextMonthName(row.monthIso)}
        </span>
      );

    case "absorbed":
      return (
        <span className="inline-block max-w-[160px] break-words text-xs leading-relaxed text-[#90A4AE]">
          Included in a later payout
        </span>
      );

    default:
      return (
        <span className="inline-block max-w-[160px] break-words text-xs text-[#B0BEC5]">
          {row.status || "—"}
        </span>
      );
  }
}

/* ── Reusable components ──────────────────────────────────────── */

function Section({ title, children }) {
  return (
    <section className="min-w-0 space-y-2.5">
      <h2 className="break-words px-1 text-[11px] font-bold uppercase tracking-wider text-[#90A4AE]">
        {title}
      </h2>

      {children}
    </section>
  );
}

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{
            background: ok
              ? "#22C55E"
              : "#EF4444",
          }}
        />

        <span className="min-w-0 break-words text-sm font-medium text-[#0D2137]">
          {label}
        </span>
      </div>

      <span
        className={`shrink-0 text-sm font-bold ${
          ok
            ? "text-[#16A34A]"
            : "text-[#EF4444]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#E3F2FD] bg-white p-3.5 shadow-sm sm:p-4">
      <div className="mb-1 break-words text-xs text-[#90A4AE]">
        {label}
      </div>

      <div className="break-words text-2xl font-bold text-[#0D2137]">
        {value}
      </div>
    </div>
  );
}

function MiniCard({ label, value, accent }) {
  const background = accent
    ? "bg-[#F8F5FF] border-[#E9D5FF]"
    : "bg-white border-[#E3F2FD]";

  const valueClass = accent
    ? "text-[#7C3AED]"
    : "text-[#0D2137]";

  return (
    <div
      className={`${background} min-w-0 rounded-2xl border p-3.5 shadow-sm sm:p-4`}
    >
      <div className="mb-1 break-words text-sm text-[#546E7A]">
        {label}
      </div>

      <div
        className={`${valueClass} break-words text-xl font-bold`}
      >
        {value}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse sm:space-y-7">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="space-y-2.5"
        >
          <div className="h-3 w-24 rounded-full bg-[#E3F2FD]" />
          <div className="h-28 rounded-2xl bg-[#F0F6FF]" />
        </div>
      ))}
    </div>
  );
}