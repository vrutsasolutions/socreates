// ════════════════════════════════════════════════════════════════════════
//  Cloudflare Images — upload, delete, optimized retrieval.
//  Backend: ⏳ under development . Mock-backed until live.
//  Flip USE_MOCK.images → false in config.js when /api/images/* is ready.
// ════════════════════════════════════════════════════════════════════════
import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';
import { MOCK_IMAGE } from './mockData';

// POST /api/images   (multipart/form-data, field "image") → { id, url }
export const uploadImage = (file) => {
  if (USE_MOCK.images) return mockResponse(MOCK_IMAGE(file));
  const fd = new FormData();
  fd.append('image', file);
  return api.post('/images', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// DELETE /api/images/{id} → 204
export const deleteImage = (id) =>
  USE_MOCK.images ? mockResponse({}, 300) : api.delete(`/images/${id}`);

// Build an optimized Cloudflare delivery URL (variant/width).
// With mocks this just returns the original url unchanged.
export const optimizedUrl = (url, variant = 'public') => {
  if (!url || USE_MOCK.images) return url;
  // Cloudflare Images delivery format: .../<image_id>/<variant>
  return url.replace(/\/[^/]+$/, `/${variant}`);
};
