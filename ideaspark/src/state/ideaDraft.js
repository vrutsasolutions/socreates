// In-memory hand-off for the in-progress Add Idea draft across the
// /create-premium gate navigation. A module singleton survives SPA route
// changes without serialization, so File[] (images) and object-URL previews
// are preserved. Not persisted — cleared once consumed.
let _draft = null;

export const saveIdeaDraft = (draft) => { _draft = draft; };

// Returns the draft once and clears it (so it can't reload on a later visit).
export const takeIdeaDraft = () => {
  const d = _draft;
  _draft = null;
  return d;
};
