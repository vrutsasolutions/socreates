import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAdminPendingApplications,
  adminApproveApplication,
  adminRejectApplication,
  adminApproveAllApplications,
} from '../api/partnerApi';

/**
 * Admin-only page: /admin/partner-applications
 *
 * Shows every pending partner-program application in queue order.
 * The primary action is "Approve All" — one click, no per-row review.
 * Individual approve/reject are available if needed.
 */
export default function AdminPartnerApplications() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvingAll, setApprovingAll] = useState(false);
  const [approvingSingle, setApprovingSingle] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getAdminPendingApplications()
      .then((res) => setApplications(res.data || []))
      .catch(() => setError('Failed to load applications.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return;
    load();
  }, [user, load]);

  // ── Approve All ───────────────────────────────────────────────────
  const handleApproveAll = async () => {
    if (
      !window.confirm(
        `Approve all ${applications.length} pending application${applications.length !== 1 ? 's' : ''}?\n\nThis will grant memberships and send notifications to every applicant.`
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
    } catch (err) {
      setError('Bulk approve failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setApprovingAll(false);
    }
  };

  // ── Single approve ────────────────────────────────────────────────
  const handleApprove = async (id) => {
    setApprovingSingle(id);
    try {
      await adminApproveApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      setSuccessMsg('Application approved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Approve failed');
    } finally {
      setApprovingSingle(null);
    }
  };

  // ── Reject ────────────────────────────────────────────────────────
  const handleReject = async (id) => {
    try {
      await adminRejectApplication(id, rejectReason);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      setError(err.response?.data?.message || 'Reject failed');
    }
  };

  // ── Filter ────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const filtered = applications.filter((a) => {
    if (!q) return true;
    return (
      (a.fullName || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.participantType || '').toLowerCase().includes(q)
    );
  });

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
            <h1 className="text-xl font-bold text-white">Partner Applications</h1>
            <p className="text-white/60 text-xs mt-0.5">
              {applications.length} pending application{applications.length !== 1 ? 's' : ''}
            </p>
          </div>
          {applications.length > 0 && (
            <button
              onClick={handleApproveAll}
              disabled={approvingAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 text-white text-xs font-semibold hover:bg-white/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {approvingAll ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {approvingAll ? 'Approving…' : `Approve All (${applications.length})`}
            </button>
          )}
        </div>
      </header>

      <div className="px-4 mt-4 space-y-3">
        {/* ── Success banner ──────────────────────────────────────── */}
        {successMsg && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-800 flex-1">{successMsg}</p>
            <button onClick={() => setSuccessMsg('')} className="text-green-400 hover:text-green-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Error banner ────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-medium text-red-700 flex-1">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Search ───────────────────────────────────────────────── */}
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

        {/* ── Loading ──────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-3 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#78909C]">Loading applications...</p>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────── */}
        {!loading && error && filtered.length === 0 && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 text-center">
            {error}
          </div>
        )}

        {/* ── Empty ────────────────────────────────────────────────── */}
        {!loading && !error && applications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="w-10 h-10 text-[#CFD8DC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[#78909C] text-sm font-medium">No pending applications</p>
            <p className="text-[#B0BEC5] text-xs">All caught up — new applications will appear here.</p>
          </div>
        )}

        {/* ── No search results ────────────────────────────────────── */}
        {!loading && !error && applications.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="w-10 h-10 text-[#CFD8DC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <p className="text-[#78909C] text-sm font-medium">No applications match your search.</p>
          </div>
        )}

        {/* ── Application cards ────────────────────────────────────── */}
        {!loading &&
          filtered.map((app) => {
            const isExpanded = expanded === app.id;

            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden transition-all"
              >
                {/* ── Collapsed header ────────────────────────────── */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : app.id)}
                  className="w-full px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#E3F2FD] flex items-center justify-center text-[#1565C0] text-sm font-bold shrink-0">
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
                  </div>

                  {/* Status badges — below name so they don't squeeze text on mobile */}
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

                {/* ── Expanded details ────────────────────────────── */}
                {isExpanded && (
                  <div className="border-t border-[#ECEFF1] px-4 py-3 space-y-3">
                    <div className="space-y-1">
                      <Row label="Free days" value={app.freeDays} />
                      <Row label="Applied" value={fmtDate(app.createdAt)} />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#ECEFF1]">
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
                      {rejectingId === app.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            placeholder="Reason (optional)..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl bg-white border border-[#E0E0E0] focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 placeholder:text-[#B0BEC5]"
                          />
                          <button
                            onClick={() => handleReject(app.id)}
                            className="px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 active:scale-95 transition-all"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectReason(''); }}
                            className="px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-[#78909C] text-xs font-medium hover:border-[#90A4AE] active:scale-95 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRejectingId(app.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-red-500 text-xs font-bold hover:border-red-300 hover:bg-red-50 active:scale-95 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </button>
                      )}
                    </div>
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
      <span className="text-xs text-[#263238] font-medium text-right">{value}</span>
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