import api from './axiosInstance';

/** Submit a partner program application (all 5 steps as one payload). */
export const submitPartnerApplication = (data) =>
  api.post('/partners/apply', data);

/** Check current user's application status. */
export const getMyPartnerApplication = () =>
  api.get('/partners/my-application');

// ── Admin endpoints ─────────────────────────────────────────────────

/** List all pending partner applications. */
export const getAdminPendingApplications = () =>
  api.get('/admin/partners/pending');

/** Approve a single application by ID. */
export const adminApproveApplication = (id) =>
  api.post(`/admin/partners/${id}/approve`);

/** Reject a single application by ID. */
export const adminRejectApplication = (id, reason) =>
  api.post(`/admin/partners/${id}/reject`, { reason });

/** Approve ALL pending applications in one action. */
export const adminApproveAllApplications = () =>
  api.post('/admin/partners/approve-all');