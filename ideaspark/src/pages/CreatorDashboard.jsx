import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import Icon from '../components/common/Icon';

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
    totalSaves: 328,
    totalShares: 72,
  },
  content: [
    { idea: 'AI Farming Platform', reads: 1200, saves: 80, shares: 25 },
    { idea: 'Smart Parking App',   reads: 950,  saves: 50, shares: 15 },
  ],
  premium: {
    premiumIdeas: 8,
    freeIdeas: 17,
    premiumReads: 2150,
  },
  earnings: {
    estimated: 0,
  },
  // 'approved' | 'pending' | 'none'
  verification: 'approved',
};

const fmt = (n) => n?.toLocaleString('en-IN') ?? '0';

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/creator/dashboard');
      setData(data);
    } catch (_) {
      setData(MOCK_DASHBOARD);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const d = data ?? MOCK_DASHBOARD;

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-12">

    {/* HEADER — matches Home exactly */}
<header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">

  {/* decorative circles */}
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
    <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
  </div>

  {/* title row */}
  <div className="relative z-10">
    <h1 className="text-[28px] font-bold text-white leading-none">
      Creator Dashboard
    </h1>
    <p className="text-white/70 text-sm mt-1">
      Insights, verification and creator performance
    </p>
  </div>
</header>

      <div className="bg-[#1565C0]">
  <div className="bg-white rounded-t-[32px] px-4 pt-6 pb-12 space-y-7">

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* ── Section 1 — Creator Status ───────────────────── */}
            <Section title="Creator Status">
              {d.status.creatorPro && d.status.verified && d.status.premiumPublishing ? (
                <div className="bg-white rounded-3xl border border-[#E3F2FD] p-4 space-y-3 shadow-sm">
                  <StatusRow ok label="Creator Pro"        value="Active"   />
                  <StatusRow ok label="Verified Pro"       value="Verified" />
                  <StatusRow ok label="Premium Publishing" value="Enabled"  />
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-[#FCA5A5] p-4 space-y-3 shadow-sm">
                  {!d.status.verified && <StatusRow label="Not Verified"        value="Inactive" />}
                  {!d.status.premiumPublishing && <StatusRow label="Premium Publishing" value="Disabled" />}
                  <button
                    onClick={() => navigate('/membership')}
                    className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold py-3 rounded-3xl active:scale-95 transition-all text-sm">
                    Apply for Verification
                  </button>
                </div>
              )}
            </Section>

            {/* ── Section 2 — Performance Overview ─────────────── */}
            <Section title="Performance Overview">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total ideas published" value={fmt(d.performance.ideasPublished)} />
                <StatCard label="Total reads"            value={fmt(d.performance.totalReads)} />
                <StatCard label="Total saves"            value={fmt(d.performance.totalSaves)} />
                <StatCard label="Total shares"           value={fmt(d.performance.totalShares)} />
              </div>
            </Section>

            {/* ── Section 3 — Content Performance ──────────────── */}
            <Section title="Content Performance">
              <div className="bg-white rounded-3xl border border-[#E3F2FD] shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F8FAFF] text-[#0D2137] border-b border-[#E3F2FD]">
                      <th className="text-left  font-bold px-4 py-3">Idea</th>
                      <th className="text-right font-bold px-2 py-3">Reads</th>
                      <th className="text-right font-bold px-2 py-3">Saves</th>
                      <th className="text-right font-bold px-4 py-3">Shares</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.content.map((row) => (
                      <tr key={row.idea} className="border-b border-[#F0F2F8] last:border-0">
                        <td className="text-left  px-4 py-3 text-[#546E7A] font-medium">{row.idea}</td>
                        <td className="text-right px-2 py-3 text-[#546E7A]">{fmt(row.reads)}</td>
                        <td className="text-right px-2 py-3 text-[#546E7A]">{fmt(row.saves)}</td>
                        <td className="text-right px-4 py-3 text-[#546E7A]">{fmt(row.shares)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* ── Section 4 — Premium Content ──────────────────── */}
            <Section title="Premium Content">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MiniCard label="Premium ideas" value={fmt(d.premium.premiumIdeas)} accent="purple" tint />
                  <MiniCard label="Free ideas"    value={fmt(d.premium.freeIdeas)} />
                </div>
                <MiniCard label="Premium reads" value={fmt(d.premium.premiumReads)} accent="purple" tint wide />
              </div>
            </Section>

            {/* ── Section 5 — Future Earnings ──────────────────── */}
            <Section title="Future Earnings">
              <div className="bg-white rounded-3xl border border-[#E3F2FD] p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#546E7A] text-sm">Estimated earnings</span>
                  <span className="text-[#0D2137] text-2xl font-bold">₹{fmt(d.earnings.estimated)}</span>
                </div>
                <div className="flex items-center gap-2 bg-[#FFF8EC] border border-[#FDE68A] rounded-xl px-3 py-2.5">
                  <Icon name="alert-triangle" className="w-4 h-4 text-[#D97706] shrink-0" />
                  <span className="text-[#92400E] text-xs">Revenue sharing coming soon — earnings will appear here</span>
                </div>
              </div>
            </Section>

            {/* ── Section 6 — Verification center ──────────────── */}
            <Section title="Verification center">
              {d.verification === 'approved' && (
                <div className="bg-white rounded-3xl border border-[#A7F3D0] p-4 shadow-sm space-y-3">
                  <PillRow value="Approved" tone="green" />
                  <StatusRow ok label="Identity verified" value="Done" />
                  <StatusRow ok label="Profile complete"  value="Done" />
                  <StatusRow ok label="Ideas published"   value="Done" />
                </div>
              )}
              {d.verification === 'pending' && (
                <div className="bg-white rounded-3xl border border-[#FCD34D] p-4 shadow-sm space-y-3">
                  <PillRow value="Pending review" tone="amber" />
                  <StatusRow ok    label="Application submitted" value="Done" />
                  <StatusRow amber label="Under review by team"  value="In progress" />
                  <StatusRow wait  label="Final approval"        value="Waiting" />
                </div>
              )}
              {d.verification === 'none' && (
                <div className="bg-white rounded-3xl border border-[#E3F2FD] p-4 shadow-sm space-y-3">
                  <PillRow value="Not applied" tone="neutral" />
                  <button
                    onClick={() => navigate('/membership')}
                    className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-3 rounded-3xl active:scale-95 transition-all text-sm">
                    Apply Now
                  </button>
                </div>
              )}
            </Section>

            {/* ── Section 7 — Creator Pro ──────────────────────── */}
            <Section title="Creator Pro">
              {d.status.creatorPro ? (
                <div className="bg-white rounded-3xl border border-[#A7F3D0] p-4 shadow-sm space-y-3">
                  <PillRow value="Active" tone="green" />
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#F5F0FF] flex items-center justify-center shrink-0">
                      <Icon name="star" className="w-5 h-5 text-[#7C3AED]" />
                    </div>
                    <div>
                      <div className="text-[#0D2137] font-bold text-sm">Creator Pro is active</div>
                      <div className="text-[#90A4AE] text-xs">Premium publishing & priority reach enabled</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-[#FCA5A5] p-4 shadow-sm space-y-3">
                  <PillRow value="Inactive" tone="red" />
                  <div className="bg-[#FEF2F2] rounded-xl h-12" />
                  <button
                    onClick={() => navigate('/membership')}
                    className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-3 rounded-3xl active:scale-95 transition-all text-sm">
                    Upgrade Now
                  </button>
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
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

function StatusRow({ label, value, ok, amber, wait }) {
  const dot   = ok ? '#10B981' : amber ? '#F59E0B' : wait ? '#90A4AE' : '#EF4444';
  const pill  = ok
    ? 'bg-[#ECFDF5] text-[#065F46]'
    : amber ? 'bg-[#FFF8EC] text-[#92400E]'
    : wait  ? 'bg-[#F0F2F8] text-[#90A4AE]'
    : 'bg-[#FEF2F2] text-[#991B1B]';
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: dot }} />
        <span className="text-[#0D2137] text-sm font-medium">{label}</span>
      </div>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${pill}`}>{value}</span>
    </div>
  );
}

function PillRow({ value, tone }) {
  const map = {
    green:   'bg-[#ECFDF5] text-[#065F46]',
    amber:   'bg-[#FFF8EC] text-[#92400E]',
    red:     'bg-[#FEF2F2] text-[#991B1B]',
    neutral: 'bg-[#F0F2F8] text-[#90A4AE]',
  };
  return (
    <div className="flex justify-end">
      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${map[tone]}`}>{value}</span>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-3xl border border-[#E3F2FD] p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-[#90A4AE] text-xs mb-1">{label}</div>
      <div className="text-[#0D2137] text-2xl font-bold">{value}</div>
    </div>
  );
}

function MiniCard({ label, value, accent, tint, wide }) {
  const valColor = accent === 'purple' ? 'text-[#7C3AED]' : 'text-[#0D2137]';
  const bg = tint
  ? 'bg-[#F8F5FF] border-[#E9D5FF]'
  : 'bg-white border-[#E3F2FD]';
  return (
    <div className={`${bg} ${wide ? '' : ''} rounded-3xl border p-4 shadow-sm`}>
      <div className="text-[#546E7A] text-sm mb-1">{label}</div>
      <div className={`${valColor} text-xl font-bold`}>{value}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-7">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2.5">
          <div className="sc-skeleton sc-skeleton-text w-32" />
          <div className="sc-skeleton rounded-3xl h-28" />
        </div>
      ))}
    </div>
  );
}
