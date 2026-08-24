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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const filtered = applications.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.fullName?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.participantType?.toLowerCase().includes(q)
    );
  });

  // ── Guard ─────────────────────────────────────────────────────────
  if (!user?.isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p style={{ color: '#666', marginTop: 8 }}>Admin only.</p>
        <button onClick={() => navigate('/')} style={linkBtnStyle}>
          ← Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button onClick={() => navigate(-1)} style={backBtnStyle}>←</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Partner Applications</h1>
      </div>
      <p style={{ color: '#666', fontSize: 14, margin: '0 0 20px' }}>
        Pending review queue — approve all at once or manage individually.
      </p>

      {/* Success banner */}
      {successMsg && (
        <div style={successBannerStyle}>
          ✅ {successMsg}
          <button onClick={() => setSuccessMsg('')} style={dismissBtnStyle}>×</button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={errorBannerStyle}>
          {error}
          <button onClick={() => setError('')} style={dismissBtnStyle}>×</button>
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>Loading…</p>
      ) : applications.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <p style={{ fontWeight: 600, marginTop: 12 }}>No pending applications</p>
          <p style={{ color: '#888', fontSize: 14 }}>
            All caught up — new applications will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div style={toolbarStyle}>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={searchInputStyle}
            />

            <button
              onClick={handleApproveAll}
              disabled={approvingAll || filtered.length === 0}
              style={{
                ...approveAllBtnStyle,
                opacity: approvingAll ? 0.6 : 1,
              }}
            >
              {approvingAll
                ? 'Approving…'
                : `✓ Approve All (${applications.length})`}
            </button>
          </div>

          {/* Count */}
          <p style={{ fontSize: 13, color: '#888', margin: '12px 0 8px' }}>
            Showing {filtered.length} of {applications.length} pending
          </p>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((app) => (
              <div key={app.id} style={cardStyle}>
                {/* Summary row */}
                <div
                  style={cardHeaderStyle}
                  onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{app.fullName}</div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                      {app.email}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={tagStyle(app.participantType === 'student' ? '#EFF6FF' : '#FFF7ED',
                                            app.participantType === 'student' ? '#1D4ED8' : '#C2410C')}>
                        {app.participantType === 'student' ? '🎓 Student' : '💼 Professional'}
                      </span>
                      <span style={tagStyle('#F0FDF4', '#166534')}>
                        {app.subscriptionChoice === 'creator_pro' ? 'Creator Pro' :
                         app.subscriptionChoice === 'reader_pro' ? 'Reader Pro' : 'Not sure'}
                      </span>
                      <span style={tagStyle('#F5F5F5', '#666')}>
                        #{app.queuePosition}
                      </span>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApprove(app.id); }}
                      disabled={approvingSingle === app.id}
                      style={singleApproveBtnStyle}
                      title="Approve"
                    >
                      {approvingSingle === app.id ? '…' : '✓'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRejectingId(app.id); }}
                      style={singleRejectBtnStyle}
                      title="Reject"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expanded === app.id && (
                  <div style={detailsStyle}>
                    <DetailRow label="Free days" value={app.freeDays} />
                    <DetailRow label="Applied" value={formatDate(app.createdAt)} />
                  </div>
                )}

                {/* Reject reason input */}
                {rejectingId === app.id && (
                  <div style={rejectBoxStyle}>
                    <input
                      type="text"
                      placeholder="Reason (optional)…"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      style={rejectInputStyle}
                    />
                    <button onClick={() => handleReject(app.id)} style={confirmRejectBtnStyle}>
                      Reject
                    </button>
                    <button onClick={() => { setRejectingId(null); setRejectReason(''); }} style={cancelBtnStyle}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
      <span style={{ color: '#888', minWidth: 90 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Styles ─────────────────────────────────────────────────────────────

const backBtnStyle = {
  background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
  padding: '4px 8px', borderRadius: 8,
};
const linkBtnStyle = {
  background: 'none', border: 'none', color: '#0d9488',
  cursor: 'pointer', fontSize: 15, marginTop: 16,
};
const toolbarStyle = {
  display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
};
const searchInputStyle = {
  flex: 1, minWidth: 180, padding: '10px 14px', borderRadius: 10,
  border: '1px solid #e0e0e0', fontSize: 14, outline: 'none',
};
const approveAllBtnStyle = {
  padding: '10px 20px', borderRadius: 10, border: 'none',
  background: '#0d9488', color: '#fff', fontWeight: 600,
  fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
};
const cardStyle = {
  background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8',
  overflow: 'hidden',
};
const cardHeaderStyle = {
  display: 'flex', padding: '14px 16px', cursor: 'pointer',
  gap: 12, alignItems: 'flex-start',
};
const tagStyle = (bg, color) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 6,
  fontSize: 12, fontWeight: 500, background: bg, color,
});
const singleApproveBtnStyle = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid #d1d5db',
  background: '#F0FDF4', color: '#166534', fontWeight: 700,
  cursor: 'pointer', fontSize: 16,
};
const singleRejectBtnStyle = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid #d1d5db',
  background: '#FEF2F2', color: '#B91C1C', fontWeight: 700,
  cursor: 'pointer', fontSize: 14,
};
const detailsStyle = {
  padding: '8px 16px 14px', borderTop: '1px solid #f0f0f0',
  display: 'flex', flexDirection: 'column', gap: 4,
};
const rejectBoxStyle = {
  display: 'flex', gap: 8, padding: '10px 16px',
  borderTop: '1px solid #f0f0f0', alignItems: 'center',
  flexWrap: 'wrap',
};
const rejectInputStyle = {
  flex: 1, minWidth: 140, padding: '8px 12px', borderRadius: 8,
  border: '1px solid #e0e0e0', fontSize: 13, outline: 'none',
};
const confirmRejectBtnStyle = {
  padding: '8px 14px', borderRadius: 8, border: 'none',
  background: '#B91C1C', color: '#fff', fontWeight: 600,
  fontSize: 13, cursor: 'pointer',
};
const cancelBtnStyle = {
  padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db',
  background: '#fff', color: '#666', fontSize: 13, cursor: 'pointer',
};
const successBannerStyle = {
  background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10,
  padding: '12px 16px', marginBottom: 16, display: 'flex',
  alignItems: 'center', justifyContent: 'space-between', fontSize: 14,
  color: '#166534',
};
const errorBannerStyle = {
  background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
  padding: '12px 16px', marginBottom: 16, display: 'flex',
  alignItems: 'center', justifyContent: 'space-between', fontSize: 14,
  color: '#B91C1C',
};
const dismissBtnStyle = {
  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
  padding: '0 4px', color: 'inherit',
};
const emptyStateStyle = {
  textAlign: 'center', padding: '60px 20px', background: '#fafafa',
  borderRadius: 16, border: '1px solid #e8e8e8',
};