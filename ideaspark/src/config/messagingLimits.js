// ════════════════════════════════════════════════════════════════════════
//  Messaging free-tier limit — verified-creator override (FRONTEND-ONLY)
//
//  Chatting is free for everyone. When the chat partner is a *verified
//  creator* and the current user is NOT Premium, a free allowance applies
//  (5 text messages + 1 file/media/voice share — see Chat.jsx). User↔user
//  chats stay unlimited.
//
//  The live backend does NOT yet expose whether a partner is a verified
//  creator (ConversationDTO has no such flag, and isPremium isn't reliably
//  set because payments are mocked). So until the backend ships the flag,
//  decide it here on the client. Three ways to mark a partner as a creator:
//
//    1. Flip TREAT_ALL_PARTNERS_AS_CREATOR to true  → every chat is limited
//       (quickest way to see the flow on ANY conversation).
//    2. Add the partner's user-id to VERIFIED_CREATOR_USER_IDS.
//    3. Add the partner's display name to VERIFIED_CREATOR_NAMES.
//
//  When the backend adds `ConversationDTO.otherUserVerifiedCreator`, it flows
//  through automatically as `convo.verifiedCreator` (already handled below)
//  and this override file can be deleted.
// ════════════════════════════════════════════════════════════════════════

// Quick switch: treat EVERY chat partner as a verified creator. Handy for a
// fast end-to-end test/demo of the limit on any conversation. Leave `false`
// to keep user↔user chats unlimited and only limit the creators listed below.
export const TREAT_ALL_PARTNERS_AS_CREATOR = false;

// Conversations with these *partner user-ids* are treated as verified creators.
// (This is `otherUserId` on the conversation — find it in the Network tab on
//  GET /messages/conversations, or from the backend.)
export const VERIFIED_CREATOR_USER_IDS = [
  // 'paste-your-creator-test-account-user-id-here',
];

// …or match by display name (case-insensitive) — easiest for quick testing.
export const VERIFIED_CREATOR_NAMES = [
  'Aparna S.', // demo creator (matches the mock "Aparna S." conversation)
];

/** True when the given conversation should enforce the verified-creator limit. */
export const isVerifiedCreatorPartner = (convo) => {
  if (!convo) return false;
  if (TREAT_ALL_PARTNERS_AS_CREATOR) return true;
  // Real flag from the backend (or mock data), once available.
  if (convo.verifiedCreator) return true;
  const id = String(convo.otherUserId ?? '');
  if (id && VERIFIED_CREATOR_USER_IDS.map(String).includes(id)) return true;
  const name = (convo.name ?? '').trim().toLowerCase();
  if (name && VERIFIED_CREATOR_NAMES.some((n) => n.trim().toLowerCase() === name)) return true;
  return false;
};
