import api from './axiosInstance';

/** Submit a partner program application (all 5 steps as one payload). */
export const submitPartnerApplication = (data) =>
  api.post('/partners/apply', data);

/** Check current user's application status. */
export const getMyPartnerApplication = () =>
  api.get('/partners/my-application');