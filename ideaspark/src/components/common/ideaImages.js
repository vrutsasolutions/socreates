/** Normalize an idea's images: prefer imageUrls[], fall back to single imageUrl. */
export function ideaImages(idea) {
  if (!idea) return [];
  const urls = Array.isArray(idea.imageUrls) ? idea.imageUrls.filter(Boolean) : [];
  if (urls.length) return urls;
  return idea.imageUrl ? [idea.imageUrl] : [];
}