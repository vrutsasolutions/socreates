// ─────────────────────────────────────────────────────────────────────────
// Persistent hand-off for the in-progress Add Idea draft.
//
// Backed by sessionStorage (not just an in-memory variable) so the draft
// survives:
//   • SPA navigation away and back (e.g. to /create-premium, /creator-pro)
//   • a full page refresh while on /add-idea
//   • a full page refresh while on /edit-images (the editor redirects back
//     to /add-idea if its own in-memory queue is empty, and this restores
//     the draft the user had going)
//
// sessionStorage (not localStorage) is used deliberately — the draft should
// disappear once the tab/browser is closed, like any other in-progress form,
// rather than persisting indefinitely.
//
// Images can't be stored directly (File objects aren't serializable), so
// callers store the result of imageCodec's filesToCompressedDataURLs()
// under `imageDataURLs` instead of raw File[] under `images`.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ideaspark:addIdeaDraft';

export const saveIdeaDraft = (draft) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // sessionStorage full or unavailable (private browsing, quota) — fail
    // silently rather than breaking the form; the in-memory state in
    // AddIdea still works for same-session navigation.
  }
};

// Returns the draft once and clears it (so it can't reload on a later visit
// after the idea has been published or abandoned).
export const takeIdeaDraft = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Like takeIdeaDraft, but doesn't clear it. Used when we want to peek at
// the draft without consuming it (e.g. checking on every keystroke without
// re-triggering the one-time restore effect).
export const peekIdeaDraft = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearIdeaDraft = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};
