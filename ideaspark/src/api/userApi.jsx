// ════════════════════════════════════════════════════════════════════════
//  User profile & social.
//  Backend: ✅ ready (UserController). USE_MOCK.users false by default.
// ════════════════════════════════════════════════════════════════════════
import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';

const MOCK_USER = {
  id: 'u1', name: 'Mayank Vaswani', email: 'mayank@example.com',
  bio: 'Building SoCreate.', avatarUrl: null, interests: ['Technology', 'Design'],
  followerCount: 12, followingCount: 8,
};

// GET /api/users/me → User
export const fetchMe = () =>
  USE_MOCK.users ? mockResponse(MOCK_USER) : api.get('/users/me');

// GET /api/users/{id} → User (used to inspect another user, e.g. a chat partner)
export const fetchUserById = (userId) =>
  USE_MOCK.users ? mockResponse({ ...MOCK_USER, id: userId }) : api.get(`/users/${userId}`);

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

// ──────────────────────────────────────────────────────────────────────────
//  Follow / social graph.  Backend: ✅ ready (FollowController, /api/follow).
//  These endpoints identify the acting user via an `X-User-Id` header (the
//  current user's UUID) rather than the JWT principal, so pass it explicitly.
// ──────────────────────────────────────────────────────────────────────────

// GET /api/follow/{userId}/stats → { followersCount, followingCount, isFollowing }
// For the signed-in user's own profile, pass their id as both args.
// ──────────────────────────────────────────────────────────────────────────
//  Follow / social graph. Backend uses JWT token from axiosInstance.
// ──────────────────────────────────────────────────────────────────────────

// GET /api/follow/{userId}/stats → { followersCount, followingCount, isFollowing }
export const fetchFollowStats = (userId) =>
  USE_MOCK.users
    ? mockResponse({ followersCount: 0, followingCount: 0, isFollowing: false })
    : api.get(`/follow/${userId}/stats`);

// GET /api/follow/{userId}/followers → FollowResponse[]
export const fetchFollowers = (userId) =>
  USE_MOCK.users ? mockResponse([]) : api.get(`/follow/${userId}/followers`);

// GET /api/follow/{userId}/following → FollowResponse[]
export const fetchFollowing = (userId) =>
  USE_MOCK.users ? mockResponse([]) : api.get(`/follow/${userId}/following`);

// POST /api/follow/{targetUserId} → follow
export const followUser = (targetUserId) =>
  USE_MOCK.users
    ? mockResponse('Followed successfully')
    : api.post(`/follow/${targetUserId}`);

// DELETE /api/follow/{targetUserId} → unfollow
export const unfollowUser = (targetUserId) =>
  USE_MOCK.users
    ? mockResponse('Unfollowed successfully')
    : api.delete(`/follow/${targetUserId}`);
    
// DELETE /api/users/me → delete account with password verification
export const deleteAccount = (password) =>
  USE_MOCK.users
    ? mockResponse({ message: 'Account deleted' })
    : api.delete('/users/me', {
        data: { password },
      });
