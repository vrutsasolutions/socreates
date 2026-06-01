// ════════════════════════════════════════════════════════════════════════
//  Search & filters.
//  Backend: ✅ ready (SearchController). USE_MOCK.search false by default.
// ════════════════════════════════════════════════════════════════════════
import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';
import { MOCK_IDEAS } from './mockData';

// GET /api/search?q=&category=&sort= → Idea[]
export const searchIdeas = ({ q = '', category = 'All', sort } = {}) => {
  if (USE_MOCK.search) {
    const ql = q.trim().toLowerCase();
    const results = MOCK_IDEAS.filter(
      (i) =>
        (category === 'All' || i.category === category) &&
        (!ql || i.title.toLowerCase().includes(ql) || i.description.toLowerCase().includes(ql)),
    );
    return mockResponse(results);
  }
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (category && category !== 'All') params.set('category', category);
  if (sort) params.set('sort', sort);
  return api.get(`/search?${params}`);
};
