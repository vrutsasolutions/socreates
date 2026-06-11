// ════════════════════════════════════════════════════════════════════════
//  User profile & social.
//  Backend: ✅ ready (UserController). USE_MOCK.users false by default.
// ════════════════════════════════════════════════════════════════════════
import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';

const MOCK_USER = {
  id: 'u1', name: 'Mayank Vaswani', email: 'mayank@example.com',
  bio: 'Building Socreates.', avatarUrl: null, interests: ['Technology', 'Design'],
  followerCount: 12, followingCount: 8,
};

// GET /api/users/me → User
export const fetchMe = () =>
  USE_MOCK.users ? mockResponse(MOCK_USER) : api.get('/users/me');

// PUT /api/users/me  (multipart: "profile" JSON blob + optional "avatar")
export const updateProfile = (profile, avatar) => {
  if (USE_MOCK.users) return mockResponse({ ...MOCK_USER, ...profile });
  const fd = new FormData();
  fd.append('profile', new Blob([JSON.stringify(profile)], { type: 'application/json' }));
  if (avatar) fd.append('avatar', avatar);
  return api.put('/users/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// POST /api/users/interests  { interests: string[] }
export const saveInterests = (interests) =>
  USE_MOCK.users ? mockResponse({ interests }) : api.post('/users/interests', { interests });

// GET /api/users/suggested-creators → User[]
export const fetchSuggestedCreators = () =>
  USE_MOCK.users
    ? mockResponse([
        { id: 'c1', name: 'Arjun Sharma', bio: 'Product designer', avatarUrl: null, followed: false },
        { id: 'c2', name: 'Priya Nair',   bio: 'EdTech founder',   avatarUrl: null, followed: false },
      ])
    : api.get('/users/suggested-creators');

// POST /api/users/follow-bulk  { creatorIds: string[] }
export const followBulk = (creatorIds) =>
  USE_MOCK.users ? mockResponse({ followed: creatorIds }) : api.post('/users/follow-bulk', { creatorIds });
