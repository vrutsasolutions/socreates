import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAdminApplicationsByStatus,
  getAdminPartnerCounts,
  adminApproveApplication,
  adminRejectApplication,
  adminApproveAllApplications,
} from '../api/partnerApi';

const TABS = [
  { key: 'pending',  label: 'Requests' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AdminPartnerApplications() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvingAll, setApprovingAll] = useState(false);
  const [approvingSingle, setApprovingSingle] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadCounts = useCallback(() => {
    getAdminPartnerCounts()
      .then((res) => setCounts(res.data || { pending: 0, approved: 0, rejected: 0 }))
      .catch(() => {});
  }, []);

  const loadTab = useCallback((status) => {
    setLoading(true);
    setError('');
    setExpanded(null);
    getAdminApplicationsByStatus(status)
      .then((res) => setApplications(res.data || []))
      .catch(() => setError('Failed to load applications.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return;
    loadCounts();
    loadTab(activeTab);
  }, [user, activeTab, loadCounts, loadTab]);

  const switchTab = (key) => {
    if (key === activeTab) return;
    setActiveTab(key);
    setSearch('');
    setSuccessMsg('');
  };

  const handleApproveAll = async () => {
    if (
      !window.confirm(
        `Approve all ${counts.pending} pending application${counts.pending !== 1 ? 's' : ''}?\n\nThis will grant memberships and send notifications to every applicant.`
      )
    )
      return;
    setApprovingAll(true);
    setSuccessMsg('');
    try {
      const res = await adminApproveAllApplications();
      const count = res.data?.approved || 0;
      setSuccessMsg(`${count} application${count !== 1 ? 's' : ''} approved successfully!`);
      setApplications([]);
      loadCounts();
    } catch (err) {
      setError('Bulk approve failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setApprovingAll(false);
    }
  };

  const handleApprove = async (id) => {
    setApprovingSingle(id);
    try {
      await adminApproveApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      setSuccessMsg('Application approved.');
      loadCounts();
    } catch (err) {
      setError(err.response?.data?.message || 'Approve failed');
    } finally {
      setApprovingSingle(null);
    }
  };

  const handleReject = async (id) => {
    try {
      await adminRejectApplication(id, rejectReason);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      setRejectingId(null);
      setRejectReason('');
      loadCounts();
    } catch (err) {
      setError(err.response?.data?.message || 'Reject failed');
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = applications.filter((a) => {
    if (!q) return true;
    return (
      (a.fullName || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.participantType || '').toLowerCase().includes(q)
    );
  });

  // ── Guard ────────────────────────────────────────────────────────
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

  const isPending = activeTab === 'pending';
  const totalApps = counts.pending + counts.approved + counts.rejected;

  // Left-border color per tab status
  const cardBorderClass =
    activeTab === 'approved'
      ? 'border-l-[3px] border-l-green-400'
      : activeTab === 'rejected'
      ? 'border-l-[3px] border-l-red-400'
      : '';

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-12">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#1565C0] shadow-lg">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">Partner Applications</h1>
              {/* Mobile subtitle */}
              <p className="sm:hidden text-white/60 text-[11px] mt-0.5">
                {totalApps} total · {counts.pending} pending
              </p>
              {/* Desktop subtitle */}
              <p className="hidden sm:block text-white/60 text-xs mt-0.5">
                {counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected
              </p>
            </div>
            {isPending && counts.pending > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={approvingAll}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 text-white text-xs font-semibold hover:bg-white/25 active:scale-95 transition-all disabled:opacity-50 shrink-0"
              >
                {approvingAll ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {approvingAll ? 'Approving…' : `Approve All (${counts.pending})`}
              </button>
            )}
          </div>

          {/* ── Tabs ────────────────────────────────────────── */}
          <div className="flex gap-1 mt-3 bg-white/10 rounded-xl p-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = counts[tab.key] || 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => switchTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white text-[#1565C0] shadow-sm'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  <span
                    className={`min-w-[18px] px-1 sm:px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
                      isActive
                        ? tab.key === 'pending'
                          ? 'bg-blue-100 text-blue-700'
                          : tab.key === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="px-4 mt-4 space-y-3">
        {/* ── Mobile Approve All ────────────────────────────── */}
        {isPending && counts.pending > 0 && (
          <button
            onClick={handleApproveAll}
            disabled={approvingAll}
            className="sm:hidden w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {approvingAll ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {approvingAll ? 'Approving…' : `Approve All ${counts.pending} Pending`}
          </button>
        )}

        {/* ── Success banner ─────────────────────────────────── */}
        {successMsg && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-800 flex-1">{successMsg}</p>
            <button onClick={() => setSuccessMsg('')} className="text-green-400 hover:text-green-600 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Error banner ───────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-medium text-red-700 flex-1">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Search ──────────────────────────────────────────── */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#90A4AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-white border border-[#E0E0E0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30 focus:border-[#1565C0] placeholder:text-[#B0BEC5]"
          />
        </div>

        {/* ── Loading ─────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-3 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#78909C]">Loading applications...</p>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────── */}
        {!loading && !error && applications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="w-10 h-10 text-[#CFD8DC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {isPending ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              )}
            </svg>
            <p className="text-[#78909C] text-sm font-medium">
              {isPending
                ? 'No pending applications'
                : activeTab === 'approved'
                ? 'No approved applications yet'
                : 'No rejected applications'}
            </p>
            <p className="text-[#B0BEC5] text-xs text-center">
              {isPending
                ? 'All caught up — new applications will appear here.'
                : activeTab === 'approved'
                ? 'Approved applications will appear here.'
                : 'Rejected applications will appear here.'}
            </p>
          </div>
        )}

        {/* ── No search results ──────────────────────────────── */}
        {!loading && !error && applications.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="w-10 h-10 text-[#CFD8DC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <p className="text-[#78909C] text-sm font-medium">No applications match your search.</p>
          </div>
        )}

        {/* ── Application cards ───────────────────────────────── */}
        {!loading &&
          filtered.map((app) => {
            const isExpanded = expanded === app.id;

            return (
              <div
                key={app.id}
                className={`bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden transition-all ${cardBorderClass}`}
              >
                {/* ── Collapsed header ──────────────────── */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : app.id)}
                  className="w-full px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      activeTab === 'approved'
                        ? 'bg-green-50 text-green-600'
                        : activeTab === 'rejected'
                        ? 'bg-red-50 text-red-500'
                        : 'bg-[#E3F2FD] text-[#1565C0]'
                    }`}>
                      {(app.fullName || '?')
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#263238] truncate">
                        {app.fullName || 'Unknown'}
                      </p>
                      <p className="text-xs text-[#78909C] truncate">
                        {app.email || '—'}
                      </p>
                    </div>

                    {/* Status badge — desktop only */}
                    {activeTab === 'approved' && (
                      <span className="hidden sm:inline-block text-xs font-bold text-green-600 shrink-0">
                        Approved
                      </span>
                    )}
                    {activeTab === 'rejected' && (
                      <span className="hidden sm:inline-block text-xs font-bold text-red-500 shrink-0">
                        Rejected
                      </span>
                    )}

                    <svg
                      className={`w-4 h-4 text-[#90A4AE] shrink-0 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 mt-2 ml-[52px] flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      app.participantType === 'student'
                        ? 'text-blue-700 bg-blue-100'
                        : 'text-orange-600 bg-orange-100'
                    }`}>
                      {app.participantType === 'student' ? '🎓 Student' : '💼 Professional'}
                    </span>
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      {app.subscriptionChoice === 'creator_pro' ? 'Creator Pro' :
                       app.subscriptionChoice === 'reader_pro' ? 'Reader Pro' : 'Not sure'}
                    </span>
                    <span className="text-[10px] font-bold text-[#78909C] bg-[#ECEFF1] px-2 py-0.5 rounded-full">
                      #{app.queuePosition}
                    </span>
                  </div>
                </button>

                {/* ── Expanded details ──────────────────── */}
                {isExpanded && (
                  <div className="border-t border-[#ECEFF1] px-4 py-3 space-y-3">
                    <div className="space-y-1">
                      <Row label="Free days" value={app.freeDays} />
                      <Row label="Applied" value={fmtDate(app.createdAt)} />
                      {(activeTab === 'approved' || activeTab === 'rejected') && (
                        <>
                          <Row
                            label={activeTab === 'approved' ? 'Approved on' : 'Rejected on'}
                            value={fmtDate(app.reviewedAt)}
                          />
                          <Row label="Reviewed by" value={app.reviewedBy || '—'} />
                          {activeTab === 'rejected' && app.rejectionReason && (
                            <div className="pt-1">
                              <p className="text-xs text-[#78909C] mb-0.5">Reason</p>
                              <p className="text-xs text-[#263238] font-medium bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                                {app.rejectionReason}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Action buttons — only on pending tab */}
                    {isPending && (
                      <div className="pt-2 border-t border-[#ECEFF1] space-y-2">
                        {rejectingId === app.id ? (
                          <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
                            <input
                              type="text"
                              placeholder="Reason (optional)..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="w-full sm:flex-1 sm:min-w-0 px-3 py-2 text-xs rounded-xl bg-white border border-[#E0E0E0] focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 placeholder:text-[#B0BEC5]"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleReject(app.id)}
                                className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 active:scale-95 transition-all"
                              >
                                Confirm Reject
                              </button>
                              <button
                                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-[#78909C] text-xs font-medium hover:border-[#90A4AE] active:scale-95 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(app.id)}
                              disabled={approvingSingle === app.id}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 active:scale-95 transition-all disabled:opacity-50"
                            >
                              {approvingSingle === app.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingId(app.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-red-500 text-xs font-bold hover:border-red-300 hover:bg-red-50 active:scale-95 transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Reject
                            </button>
                          </div>
                        )}
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

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-[#78909C] shrink-0">{label}</span>
      <span className="text-xs text-[#263238] font-medium text-right break-all">{value}</span>
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
