// ════════════════════════════════════════════════════════════════════════
//  Ideas — submission, listing, detail, like/save.
//  Backend: ✅ ready (IdeaController). USE_MOCK.ideas is false by default;
//  set it true only for offline UI work without a running backend.
// ════════════════════════════════════════════════════════════════════════
import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';
import { MOCK_IDEAS } from './mockData';

// GET /api/ideas?sort=trending|latest&category=&page=
export const fetchIdeas = (params = {}) => {
  if (USE_MOCK.ideas) return mockResponse(MOCK_IDEAS);
  const qs = new URLSearchParams(params).toString();
  return api.get(`/ideas${qs ? `?${qs}` : ''}`);
};

// GET /api/ideas/of-the-day?limit=2 → IdeaDTO[] (today's top idea(s) by views + likes,
// for the Explore page "Ideas of the Day" section)
export const fetchIdeasOfTheDay = (limit = 2) =>
  USE_MOCK.ideas ? mockResponse(MOCK_IDEAS.slice(0, limit)) : api.get(`/ideas/of-the-day?limit=${limit}`);

export const fetchPremiumIdeas = () =>
  USE_MOCK.ideas ? mockResponse(MOCK_IDEAS.filter((i) => i.isPremium)) : api.get('/ideas/premium');

export const fetchMyIdeas = () =>
  USE_MOCK.ideas ? mockResponse(MOCK_IDEAS) : api.get('/ideas/mine');

export const fetchSavedIdeas = () =>
  USE_MOCK.ideas ? mockResponse(MOCK_IDEAS.filter((i) => i.savedByCurrentUser)) : api.get('/ideas/saved');

// GET /api/ideas/by-user/{userId} → IdeaDTO[] (public ideas for any user's profile page)
export const fetchIdeasByUser = (userId) =>
  USE_MOCK.ideas ? mockResponse(MOCK_IDEAS) : api.get(`/ideas/by-user/${userId}`);

export const fetchIdeaById = (id) =>
  USE_MOCK.ideas ? mockResponse(MOCK_IDEAS.find((i) => i.id === id)) : api.get(`/ideas/${id}`);

// POST /api/ideas  (multipart: "idea" JSON blob + optional "image" file)
export const createIdea = (form, image) => {
  if (USE_MOCK.ideas) return mockResponse({ id: 'new-' + Date.now(), ...form });
  const fd = new FormData();
  fd.append('idea', new Blob([JSON.stringify(form)], { type: 'application/json' }));
  if (image) fd.append('image', image);
  return api.post('/ideas', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// POST /api/plagiarism/check  { description } → { isPlagiarized, message }
export const checkPlagiarism = (description) =>
  USE_MOCK.ideas
    ? mockResponse({ isPlagiarized: false, message: '' })
    : api.post('/plagiarism/check', { description });

export const deleteIdea  = (id) => USE_MOCK.ideas ? mockResponse({}) : api.delete(`/ideas/${id}`);
export const saveIdea    = (id) => USE_MOCK.ideas ? mockResponse({}) : api.post(`/ideas/${id}/save`);
export const unsaveIdea  = (id) => USE_MOCK.ideas ? mockResponse({}) : api.delete(`/ideas/${id}/save`);
export const likeIdea    = (id) => USE_MOCK.ideas ? mockResponse({}) : api.post(`/ideas/${id}/like`);
export const unlikeIdea  = (id) => USE_MOCK.ideas ? mockResponse({}) : api.delete(`/ideas/${id}/like`);

// ── Comments (Backend: ✅ ready — IdeaController) ──────────────────────────
// GET /api/ideas/{id}/comments → CommentDTO[] { id, content, userId, userName, userImage, createdAt }
export const fetchComments = (id) =>
  USE_MOCK.ideas ? mockResponse([]) : api.get(`/ideas/${id}/comments`);

// POST /api/ideas/{id}/comments  body: { content } → created CommentDTO
export const addComment = (id, content) =>
  USE_MOCK.ideas
    ? mockResponse({ id: 'c-' + Date.now(), content, userName: 'You', createdAt: new Date().toISOString() })
    : api.post(`/ideas/${id}/comments`, { content });

// DELETE /api/ideas/comments/{commentId}
export const deleteComment = (commentId) =>
  USE_MOCK.ideas ? mockResponse({}) : api.delete(`/ideas/comments/${commentId}`);

// ── Views / read tracking (Backend: ✅ ready — CreatorController) ───────────
// POST /api/creator/ideas/{id}/read → increments the idea's read_count.
// Public (no auth required — anonymous reads count too). Fire-and-forget when
// the detail page opens; callers should skip the creator viewing their own idea.
export const trackIdeaView = (id) =>
  USE_MOCK.ideas ? mockResponse({}) : api.post(`/creator/ideas/${id}/read`);
