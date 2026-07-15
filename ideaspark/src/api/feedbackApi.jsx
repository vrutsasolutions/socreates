// ════════════════════════════════════════════════════════════════════════
//  Feedback — Settings > Support > Feedback popup (one-time per account).
//  Backend: ✅ ready (FeedbackController).
// ════════════════════════════════════════════════════════════════════════
import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';

// GET /api/feedback/me → { rating, review, updatedAt } if already submitted,
// or a 204/null response if this user hasn't given feedback yet. Settings.jsx
// calls this on load to decide whether the Feedback row shows "Completed".
export const fetchMyFeedback = () =>
  USE_MOCK.feedback
    ? mockResponse(null)
    : api.get('/feedback/me').then((res) => ({ ...res, data: res.data || null }));

// POST /api/feedback  { rating: 1-5, review?: string } → the saved feedback.
// One-time: the backend returns 409 if this account has already submitted
// feedback, so callers should only invoke this when fetchMyFeedback() came
// back empty.
export const submitFeedback = ({ rating, review }) =>
  USE_MOCK.feedback
    ? mockResponse({ rating, review, updatedAt: new Date().toISOString() })
    : api.post('/feedback', { rating, review });
