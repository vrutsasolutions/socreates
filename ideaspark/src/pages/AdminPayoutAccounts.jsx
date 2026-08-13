import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAdminPayoutAccounts, adminUnlockPayoutAccount } from '../api/paymentApi';
import * as XLSX from 'xlsx';

/**
 * Admin-only page: /admin/payout-accounts
 *
 * Shows every Creator Pro subscriber (isVerified = true) with their
 * payout details — or flags them as "Not configured" if they haven't
 * set up yet. Includes lock/unlock controls for the monthly payout
 * freeze window (13th 8 PM – 20th 12 AM IST).
 */
export default function AdminPayoutAccounts() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'configured' | 'pending' | 'locked'
  const [expanded, setExpanded] = useState(null);
  const [unlocking, setUnlocking] = useState(null); // userId being unlocked

  useEffect(() => {
    if (!user?.isAdmin) return;
    loadAccounts();
  }, [user]);

  const loadAccounts = () => {
    setLoading(true);
    setError('');
    getAdminPayoutAccounts()
      .then((res) => setAccounts(res.data || []))
      .catch((err) => {
        console.error('[admin-payout]', err);
        setError('Failed to load creator accounts.');
      })
      .finally(() => setLoading(false));
  };

  // ── Unlock handler ──────────────────────────────────────────────
  const handleUnlock = async (userId) => {
    setUnlocking(userId);
    try {
      await adminUnlockPayoutAccount(userId);
      // Update local state to reflect the unlock
      setAccounts((prev) =>
        prev.map((a) =>
          a.userId === userId ? { ...a, payoutLocked: false } : a
        )
      );
    } catch (err) {
      console.error('[admin-unlock]', err);
      alert(
        err?.response?.data?.message ||
          'Failed to unlock payout account.'
      );
    } finally {
      setUnlocking(null);
    }
  };

  // ── Guard ─────────────────────────────────────────────────────────
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-[#F4F7FF] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#263238] mb-1">Access denied</h2>
          <p className="text-sm text-[#78909C]">This page is restricted to admins.</p>
          <button
            onClick={() => navigate('/home')}
            className="mt-5 w-full bg-[#1565C0] text-white font-bold rounded-xl py-3 hover:bg-[#0D47A1] active:scale-95 transition-all"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  // ── Filter + search ───────────────────────────────────────────────
  const q = search.trim().toLowerCase();

  const filtered = accounts.filter((a) => {
    if (filter === 'configured' && !a.payoutConfigured) return false;
    if (filter === 'pending' && a.payoutConfigured) return false;
    if (filter === 'locked' && !a.payoutLocked) return false;

    if (!q) return true;
    return (
      (a.creatorName || '').toLowerCase().includes(q) ||
      (a.creatorEmail || '').toLowerCase().includes(q) ||
      (a.creatorUsername || '').toLowerCase().includes(q) ||
      (a.legalName || '').toLowerCase().includes(q) ||
      (a.panNumber || '').toLowerCase().includes(q) ||
      (a.accountNumber || '').toLowerCase().includes(q) ||
      (a.accountNumberLast4 || '').includes(q)
    );
  });

  const configuredCount = accounts.filter((a) => a.payoutConfigured).length;
  const pendingCount = accounts.length - configuredCount;
  const lockedCount = accounts.filter((a) => a.payoutLocked).length;

  // ── Excel export ──────────────────────────────────────────────────
  const downloadExcel = () => {
    const rows = filtered.map((a) => ({
      'Name': a.creatorName || '—',
      'Username': a.creatorUsername || '—',
      'Email': a.creatorEmail || '—',
      'Status': a.payoutConfigured ? 'Configured' : 'Pending',
      'Locked': a.payoutLocked ? 'Yes' : 'No',
      'Legal Name': a.legalName || '—',
      'PAN Number': a.panNumber || '—',
      'Mobile': a.mobileNumber || '—',
      'Bank Name': a.bankName || '—',
      'Account Holder': a.accountHolderName || '—',
      'Account Number': a.accountNumber
        ? a.accountNumber
        : a.accountNumberLast4
          ? `XXXX${a.accountNumberLast4}`
          : '—',
      'IFSC': a.ifscCode || '—',
      'Method': a.payoutMethod || '—',
      'RazorpayX Contact ID': a.razorpayContactId || '—',
      'RazorpayX Fund Account ID': a.razorpayFundAccountId || '—',
      'Created': fmtDate(a.createdAt),
      'Updated': fmtDate(a.updatedAt),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    const colWidths = Object.keys(rows[0] || {}).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.map((r) => String(r[key] || '').length)
      );
      return { wch: Math.min(maxLen + 2, 35) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Creator Pro Subscribers');

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `SoCreate_Creator_Payouts_${today}.xlsx`);
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-12">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-5 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Creator Pro subscribers</h1>
            <p className="text-white/60 text-xs mt-0.5">
              {accounts.length} creator{accounts.length !== 1 ? 's' : ''} · {configuredCount} configured · {pendingCount} pending
              {lockedCount > 0 && ` · ${lockedCount} locked`}
            </p>
          </div>
          {accounts.length > 0 && (
            <button
              onClick={downloadExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 text-white text-xs font-semibold hover:bg-white/25 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Excel
            </button>
          )}
        </div>
      </header>

      <div className="px-4 mt-4 space-y-3">
        {/* ── Lock status banner ────────────────────────────────────── */}
        {lockedCount > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Payout details locked
              </p>
              <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                {lockedCount} account{lockedCount !== 1 ? 's are' : ' is'} locked for this month's payout cycle (13th 8 PM – 20th 12 AM IST).
                You can unlock individual creators below.
              </p>
            </div>
          </div>
        )}

        {/* ── Search ───────────────────────────────────────────────── */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#90A4AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, PAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-white border border-[#E0E0E0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30 focus:border-[#1565C0] placeholder:text-[#B0BEC5]"
          />
        </div>

        {/* ── Filter tabs ──────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {[
            { key: 'all', label: `All (${accounts.length})` },
            { key: 'configured', label: `Configured (${configuredCount})` },
            { key: 'pending', label: `Pending (${pendingCount})` },
            ...(lockedCount > 0
              ? [{ key: 'locked', label: `Locked (${lockedCount})` }]
              : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all whitespace-nowrap ${
                filter === tab.key
                  ? tab.key === 'locked'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-[#1565C0] text-white border-[#1565C0]'
                  : 'bg-white text-[#546E7A] border-[#E0E0E0] hover:border-[#1565C0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Loading / Error / Empty ──────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-3 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#78909C]">Loading creators...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 text-center">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="w-10 h-10 text-[#CFD8DC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <p className="text-[#78909C] text-sm font-medium">
              {q ? 'No creators match your search.' : 'No creators found.'}
            </p>
          </div>
        )}

        {/* ── Creator cards ────────────────────────────────────────── */}
        {!loading &&
          filtered.map((a) => {
            const isExpanded = expanded === a.userId;
            const isUnlocking = unlocking === a.userId;

            return (
              <div
                key={a.userId + (a.payoutAccountId || '')}
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                  a.payoutLocked
                    ? 'border-amber-300'
                    : a.payoutConfigured
                      ? 'border-[#E0E0E0]'
                      : 'border-orange-200'
                }`}
              >
                {/* ── Collapsed header ────────────────────────────── */}
                <button
                  onClick={() =>
                    setExpanded(isExpanded ? null : a.userId)
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  {/* Avatar */}
                  {a.profileImage ? (
                    <img
                      src={a.profileImage}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#E3F2FD] flex items-center justify-center text-[#1565C0] text-sm font-bold shrink-0">
                      {(a.creatorName || '?')
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#263238] truncate">
                      {a.creatorName || 'Unknown'}
                    </p>
                    <p className="text-xs text-[#78909C] truncate">
                      @{a.creatorUsername || '—'} · {a.creatorEmail || '—'}
                    </p>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {a.payoutLocked && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        Locked
                      </span>
                    )}
                    {a.payoutConfigured ? (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        Configured
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>

                  <svg
                    className={`w-4 h-4 text-[#90A4AE] shrink-0 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* ── Expanded details ────────────────────────────── */}
                {isExpanded && (
                  <div className="border-t border-[#ECEFF1] px-4 py-3 space-y-3">
                    {/* ── Lock/Unlock control ──────────────────────── */}
                    {a.payoutLocked && (
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                          <span className="text-xs font-medium text-amber-800">
                            Editing locked until the 20th
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlock(a.userId);
                          }}
                          disabled={isUnlocking}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUnlocking ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                          )}
                          Unlock
                        </button>
                      </div>
                    )}

                    {a.payoutConfigured ? (
                      <>
                        {/* KYC */}
                        <Section title="KYC details">
                          <Row label="Legal name" value={a.legalName} />
                          <Row label="PAN number" value={a.panNumber} highlight />
                          <Row label="Mobile" value={a.mobileNumber} />
                        </Section>

                        {/* Bank */}
                        <Section title="Bank details">
                          <Row label="Bank" value={a.bankName} />
                          <Row label="Account holder" value={a.accountHolderName} />
                          <Row
                            label="Account number"
                            value={
                              a.accountNumber
                                ? a.accountNumber
                                : a.accountNumberLast4
                                  ? `XXXX ${a.accountNumberLast4} (legacy)`
                                  : '—'
                            }
                            highlight={!!a.accountNumber}
                          />
                          <Row label="IFSC" value={a.ifscCode} />
                          <Row label="Method" value={a.payoutMethod} />
                        </Section>

                        {/* RazorpayX */}
                        <Section title="RazorpayX">
                          <Row label="Contact ID" value={a.razorpayContactId} mono />
                          <Row label="Fund account ID" value={a.razorpayFundAccountId} mono />
                        </Section>

                        {/* Timestamps */}
                        <div className="flex items-center justify-between text-[10px] text-[#B0BEC5] pt-1 border-t border-[#ECEFF1]">
                          <span>Created: {fmtDate(a.createdAt)}</span>
                          <span>Updated: {fmtDate(a.updatedAt)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-[#546E7A]">Payout not set up</p>
                        <p className="text-xs text-[#90A4AE] mt-1">
                          This creator hasn't configured their bank details yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-[#90A4AE] uppercase tracking-wider mb-1.5">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight = false, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-[#78909C] shrink-0">{label}</span>
      <span
        className={`text-xs text-right break-all ${
          highlight
            ? 'font-bold text-[#1565C0]'
            : mono
              ? 'font-mono text-[#455A64]'
              : 'text-[#263238] font-medium'
        }`}
      >
        {value || '—'}
      </span>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
