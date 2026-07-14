import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav.premium';
import Icon from '../components/common/Icon';
import SharePostSheet from '../components/common/SharePostSheet';
import { useAuth } from '../context/AuthContext';
import ImageGallery, { ideaImages } from '../components/common/ImageGallery';
import {
  fetchIdeaById,
  fetchComments,
  addComment,
  deleteComment,
  saveIdea,
  unsaveIdea,
  likeIdea,
  unlikeIdea,
  trackIdeaView,
} from '../api/ideaApi';
import { fetchFollowStats, followUser, unfollowUser } from '../api/userApi';

/* ── Helpers (mirrors IdeaDetail) ───────────────────────────── */
function formatDate(dateString) {
  if (!dateString) return '';
  const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(name = '?') {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default function PremiumDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [idea, setIdea]         = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [text, setText]         = useState('');
  const [posting, setPosting]   = useState(false);
  const [postErr, setPostErr]   = useState('');
  const inputRef = useRef(null);

  // ── Engagement (like / save / share) — mirrors IdeaDetail ──
  const [liked, setLiked]       = useState(false);
  const [likes, setLikes]       = useState(0);
  const [likeAnim, setLikeAnim] = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast]       = useState(null);
  const saveRef = useRef(false);

  // ── Follow the idea's creator (skipped on your own ideas) ──
  const [following, setFollowing]   = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const creatorId = idea?.creatorId;
  const canFollow = !!creatorId && !!user?.id && creatorId !== user.id;

  // Locking is decided server-side (IdeaService.getById) and arrives on the
  // idea itself — never inferred purely from user?.isPremium here, because a
  // free-plan reader IS allowed to fully open a limited number of premium
  // ideas (see idea.freeReadsUsed/freeReadsLimit below). Reader-premium and
  // creator-pro subscribers get idea.locked === false from the server with
  // unlimited reads either way.
  //   lockReason "premium"      → not signed in / never read any premium idea yet
  //   lockReason "read_limit"   → free reader has used all of their premium slots
  //   lockReason "already_read" → free reader already spent a slot on THIS
  //                               exact premium idea earlier; reopening it
  //                               never grants full access a second time
  const isLocked = !!idea?.locked;
  const lockReason = idea?.lockReason;

  // Fetching an idea isn't a side-effect-free GET: getById() spends a
  // premium-read slot the first time a free user opens a premium idea. In
  // dev, React.StrictMode (see main.jsx) deliberately double-invokes this
  // effect, which would otherwise fire the request twice for the exact same
  // "visit" and silently spend a slot on the throwaway first response.
  //
  // Fix: cache the in-flight promise per id in a ref instead of starting a
  // second network call. Both invocations still attach their own `alive`
  // handler to that ONE shared promise — the first invocation's handler is
  // a no-op once its cleanup fires (StrictMode's synthetic unmount), and
  // the second (surviving) invocation's handler is the one that actually
  // updates state when the single real request resolves. This is NOT the
  // same as just skipping the second invocation outright (an earlier,
  // broken version of this fix did that) — skipping it entirely leaves
  // nothing subscribed with `alive === true`, and the page hangs on its
  // loading skeleton forever because setLoading(false) never runs.
  const fetchRef = useRef({ id: null, promise: null });
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);

    if (fetchRef.current.id !== id) {
      fetchRef.current = { id, promise: Promise.all([fetchIdeaById(id), fetchComments(id)]) };
    }

    fetchRef.current.promise
      .then(([ideaRes, commentRes]) => {
        if (!alive) return;
        setIdea(ideaRes.data);
        setComments(commentRes.data || []);
        setLiked(ideaRes.data?.likedByCurrentUser ?? false);
        setLikes(ideaRes.data?.likeCount ?? 0);
        setSaved(ideaRes.data?.savedByCurrentUser ?? false);
      })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  // Count a view when someone opens another creator's premium idea (not your
  // own). Fire-and-forget; a failed/blocked view tracker must never disrupt
  // reading the idea.
  const viewedRef = useRef(null);
  useEffect(() => {
    if (!idea?.id) return;
    if (user?.id && user.id === idea.creatorId) return;
    if (viewedRef.current === idea.id) return;
    viewedRef.current = idea.id;
    trackIdeaView(idea.id).catch(() => {});
  }, [idea?.id, idea?.creatorId, user?.id]);

  // Resolve whether the current user already follows this idea's creator.
  useEffect(() => {
    if (!canFollow) { setFollowing(false); return; }
    let alive = true;
    fetchFollowStats(creatorId)
      .then(({ data }) => {
        if (alive) setFollowing(Boolean(data.isFollowing ?? data.following));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [creatorId, user?.id, canFollow]);

  const isMine = (c) =>
    (c.userId && user?.id && c.userId === user.id) ||
    (c.userName && c.userName === (user?.username || user?.name));

  const handlePost = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || posting) return;
    setPosting(true);
    setPostErr('');
    try {
      const { data } = await addComment(id, content);
      const newComment = {
        ...data,
        userName:  data.userName  ?? user?.name,
        userImage: data.userImage ?? user?.profileImage ?? null,
      };
      setComments((prev) => [newComment, ...prev]);
      setText('');
    } catch (err) {
      const status = err?.response?.status;
      setPostErr(
        status === 401 || status === 403
          ? 'Your session expired — please log in again to comment.'
          : err?.response?.data?.message || 'Could not post your comment. Please try again.'
      );
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId) => {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== commentId));
    try {
      await deleteComment(commentId);
    } catch (_) {
      setComments(prev); // revert on failure
    }
  };

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const handleLike = async () => {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((l) => (wasLiked ? l - 1 : l + 1));
    try {
      wasLiked ? await unlikeIdea(id) : await likeIdea(id);
    } catch (_) {
      setLiked(wasLiked);
      setLikes((l) => (wasLiked ? l + 1 : l - 1));
    }
  };

  const handleFollow = async () => {
    if (followBusy || !canFollow) return;
    setFollowBusy(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing); // optimistic
    try {
      wasFollowing
        ? await unfollowUser(creatorId)
        : await followUser(creatorId);
      showToast(wasFollowing ? 'Unfollowed' : `Following ${idea?.creatorName || ''}`.trim());
    } catch (_) {
      setFollowing(wasFollowing); // revert on failure
      showToast('Could not update follow');
    } finally {
      setFollowBusy(false);
    }
  };

  const handleSave = async () => {
    if (saving || saveRef.current) return;
    saveRef.current = true;
    setSaving(true);
    const wasSaved = saved;
    try {
      wasSaved ? await unsaveIdea(id) : await saveIdea(id);
      setSaved(!wasSaved);
      showToast(wasSaved ? 'Removed from saved' : 'Saved to your ideas');
    } catch (_) {}
    setSaving(false);
    saveRef.current = false;
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-28">

      {/* Header — matches IdeaDetail */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-6 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button
           onClick={() => navigate(-1)}
               aria-label="Go back"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
         >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
             </svg>
        </button>
          <h1 className="text-white font-bold text-lg flex-1">Idea</h1>
        </div>
      </header>

      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6 px-4 min-h-[60vh]">

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-44 bg-[#DBEAFE] rounded-2xl" />
              <div className="h-4 bg-[#BBDEFB] rounded-xl w-2/3" />
              <div className="h-3 bg-[#BBDEFB] rounded-xl w-full" />
              <div className="h-3 bg-[#BBDEFB] rounded-xl w-5/6" />
            </div>

          ) : error || !idea ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-[#F0F6FF] border border-[#BBDEFB] rounded-3xl flex items-center justify-center mb-5">
                <Icon name="alert-triangle" className="w-9 h-9 text-[#1565C0]" />
              </div>
              <h2 className="text-[#0D2137] font-bold text-base mb-2">Couldn't load this idea</h2>
              <p className="text-[#546E7A] text-sm mb-6 max-w-xs">It may have been removed, or the connection failed.</p>
              <button onClick={() => navigate('/home')}
                className="bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold px-6 py-3.5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-300/40 text-sm">
                Back to Home
              </button>
            </div>

          ) : (
            <>
              {/* ── Idea body ────────────────────────────────── */}
              <ImageGallery images={ideaImages(idea)} title={idea.title} category={idea.category} />

              {/* Creator row */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => creatorId && navigate(`/users/${creatorId}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  {idea.creatorImage ? (
                    <img src={idea.creatorImage} alt={idea.creatorName || 'Creator'}
                      className="w-9 h-9 rounded-xl object-cover bg-[#EEF0FF] shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-[#EEF0FF] text-[#1A28A0] font-bold flex items-center justify-center text-sm shrink-0">
                      {initials(idea.creatorName)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0D2137] font-semibold text-sm truncate">{idea.creatorName || 'Anonymous'}</p>
                    <p className="text-[#90A4AE] text-xs">{formatDate(idea.createdAt)}</p>
                  </div>
                </button>
                {canFollow && (
                  <button
                    onClick={handleFollow}
                    disabled={followBusy}
                    aria-label={following ? 'Unfollow creator' : 'Follow creator'}
                    className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all active:scale-95 disabled:opacity-60 shrink-0
                      ${following
                        ? 'bg-[#E3F2FD] text-[#1565C0] border border-[#BBDEFB]'
                        : 'bg-[#1565C0] text-white hover:bg-[#0D47A1]'}`}
                  >
                    {following ? 'Following' : 'Follow'}
                  </button>
                )}
                {idea.category && (
                  <span className="text-[11px] font-semibold text-[#1565C0] bg-[#E3F2FD] px-2.5 py-1 rounded-full shrink-0">
                    {idea.category}
                  </span>
                )}
              </div>

              <h2 className="text-[#0D2137] font-bold text-xl mb-2">{idea.title}</h2>

              {isLocked ? (
                <>
                  {/* Preview for non-subscribers — only the real first line
                      is ever rendered; the rest is represented by soft
                      blurred placeholder bars (never the real text), so
                      there's nothing to read no matter how blur/opacity
                      renders on the device. */}
                  <p className="text-[#546E7A] text-[15px] leading-relaxed line-clamp-1 mb-2.5">
                    {idea.previewText || 'Subscribe to unlock the full details of this premium idea.'}
                  </p>
                  <div aria-hidden="true" className="flex flex-col gap-2 mb-6">
                    <span className="block h-[9px] w-[92%] rounded-full" style={{ background: 'linear-gradient(90deg, #E2E6F0, #F0F2F8, #E2E6F0)', filter: 'blur(3px)' }} />
                    <span className="block h-[9px] w-[78%] rounded-full" style={{ background: 'linear-gradient(90deg, #E2E6F0, #F0F2F8, #E2E6F0)', filter: 'blur(3px)' }} />
                    <span className="block h-[9px] w-[60%] rounded-full" style={{ background: 'linear-gradient(90deg, #E2E6F0, #F0F2F8, #E2E6F0)', filter: 'blur(3px)' }} />
                  </div>

                  <div className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-6 text-center shadow-sm">
                    <div className="w-14 h-14 bg-[#E3F2FD] rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Icon name="lock" className="w-7 h-7 text-[#1565C0]" />
                    </div>
                    {lockReason === 'already_read' ? (
                      <>
                        <h3 className="text-[#0D2137] font-bold text-lg mb-2">You've already read this one</h3>
                        <p className="text-[#546E7A] text-[15px] leading-relaxed mb-1 max-w-xs mx-auto">
                          Free accounts can open each premium idea fully just once. Upgrade to premium to reread it anytime.
                        </p>
                      </>
                    ) : lockReason === 'read_limit' ? (
                      <>
                        <h3 className="text-[#0D2137] font-bold text-lg mb-2">You've hit your free premium limit</h3>
                        <p className="text-[#546E7A] text-[15px] leading-relaxed mb-1 max-w-xs mx-auto">
                          Free accounts can read {idea.freeReadsLimit ?? 5} premium ideas fully. Subscribe for unlimited access.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-[#0D2137] font-bold text-lg mb-2">Unlock Premium Ideas</h3>
                        <p className="text-[#546E7A] text-[15px] leading-relaxed mb-1 max-w-xs mx-auto">
                          Get unlimited access to all premium ideas from expert creators.
                        </p>
                      </>
                    )}
                    {idea.freeReadsUsed != null && (
                      <p className="text-[#90A4AE] text-xs mb-5">
                        {idea.freeReadsUsed}/{idea.freeReadsLimit ?? 5} free premium ideas read
                      </p>
                    )}
                    <button
                      onClick={() => navigate('/membership')}
                      className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-300/30 text-[15px] mt-4"
                    >
                      Upgrade to Premium →
                    </button>
                    <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[#90A4AE]">
                      <span>✓ Cancel anytime</span>
                      <span>✓ From ₹99/month</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[#37474F] text-[15px] leading-relaxed whitespace-pre-wrap mb-5">
                    {idea.description}
                  </p>

                  {/* Engagement actions — like / comment / share / save */}
                  <div className="flex items-center justify-between border-y border-[#ECEFF6] py-2.5 mb-5">
                    <div className="flex items-center gap-1">
                      {/* Like */}
                      <button
                        onClick={handleLike}
                        aria-label={liked ? 'Unlike idea' : 'Like idea'}
                        className={`flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1.5 rounded-xl transition-all active:scale-95
                          ${liked ? 'text-[#DC2626] bg-[#FEF2F2]' : 'text-[#546E7A] hover:bg-[#F4F7FF]'}`}
                      >
                        <svg className={`w-[18px] h-[18px] transition-transform ${likeAnim ? 'scale-125' : 'scale-100'}`}
                          viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'}
                          stroke="currentColor" strokeWidth={liked ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19.5 12.6l-7.5 7.4-7.5-7.4a5 5 0 117.5-6.6 5 5 0 117.5 6.6z" />
                        </svg>
                        {likes}
                      </button>

                      {/* Comment — focuses the composer */}
                      <button
                        onClick={() => inputRef.current?.focus()}
                        aria-label="Comment on idea"
                        className="flex items-center gap-1.5 text-sm font-semibold text-[#546E7A] px-2.5 py-1.5 rounded-xl hover:bg-[#F4F7FF] transition-all active:scale-95"
                      >
                        <Icon name="message-square" className="w-[18px] h-[18px]" />
                        {comments.length}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Share */}
                      <button
                        onClick={() => setShareOpen(true)}
                        aria-label="Share idea"
                        className="flex items-center justify-center w-9 h-9 rounded-xl text-[#546E7A] hover:bg-[#F4F7FF] transition-all active:scale-95"
                      >
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
                        </svg>
                      </button>

                      {/* Save */}
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        aria-label={saved ? 'Unsave idea' : 'Save idea'}
                        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95
                          ${saved ? 'text-[#1565C0] bg-[#E3F2FD]' : 'text-[#546E7A] hover:bg-[#F4F7FF]'} ${saving ? 'opacity-60' : ''}`}
                      >
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'}
                          stroke="currentColor" strokeWidth={saved ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* ── Comments ─────────────────────────────────── */}
                  <h3 className="text-[#0D2137] font-bold text-base mb-3">
                    Comments {comments.length > 0 && <span className="text-[#90A4AE] font-medium">({comments.length})</span>}
                  </h3>

                  {comments.length === 0 ? (
                    <p className="text-[#90A4AE] text-sm py-6 text-center">No comments yet — be the first to share your thoughts.</p>
                  ) : (
                    <ul className="space-y-3 mb-4">
                      {comments.map((c) => {
                        const avatarSrc = c.userImage || (isMine(c) ? user?.profileImage : null);
                        const goToProfile = () => { if (c.userId) navigate(`/users/${c.userId}`); };
                        return (
                        <li key={c.id} className="flex gap-3">
                          {avatarSrc ? (
                            <img src={avatarSrc} alt={c.userName || 'User'}
                              onClick={goToProfile}
                              className={`w-8 h-8 rounded-lg object-cover bg-[#EEF0FF] shrink-0${c.userId ? ' cursor-pointer active:scale-95' : ''}`} />
                          ) : (
                            <div onClick={goToProfile}
                              className={`w-8 h-8 rounded-lg bg-[#EEF0FF] text-[#1A28A0] font-bold flex items-center justify-center text-xs shrink-0${c.userId ? ' cursor-pointer active:scale-95' : ''}`}>
                              {initials(c.userName)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 bg-[#F7F9FF] border border-[#ECEFF6] rounded-2xl px-3.5 py-2.5">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span onClick={goToProfile}
                                className={`text-[#0D2137] font-semibold text-[13px] truncate${c.userId ? ' cursor-pointer hover:underline' : ''}`}>{c.userName || 'User'}</span>
                              <span className="text-[#B0BEC5] text-[11px]">{formatDate(c.createdAt)}</span>
                              {isMine(c) && (
                                <button onClick={() => handleDelete(c.id)}
                                  className="ml-auto text-[#E53935] text-[11px] font-medium hover:underline active:scale-95">
                                  Delete
                                </button>
                              )}
                            </div>
                            <p className="text-[#37474F] text-sm break-words">{c.content}</p>
                          </div>
                        </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Comment composer (fixed above bottom nav) — unlocked only ─── */}
      {!loading && !error && idea && !isLocked && (
        <div className="fixed bottom-[68px] left-0 right-0 z-30 bg-white border-t border-[#ECEFF6]">
        {postErr && (
          <p className="text-[#E53935] text-xs px-4 pt-2">{postErr}</p>
        )}
        <form onSubmit={handlePost}
          className="px-4 py-2.5 flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={500}
            className="flex-1 bg-[#F4F7FF] border border-[#E3E8F4] rounded-2xl px-4 py-2.5 text-sm text-[#0D2137] placeholder-[#90A4AE] focus:outline-none focus:border-[#1565C0]"
          />
          <button type="submit" disabled={!text.trim() || posting}
            className="bg-[#1565C0] disabled:opacity-40 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl active:scale-95 transition-all">
            {posting ? '…' : 'Post'}
          </button>
        </form>
        </div>
      )}

      {/* Share sheet */}
      {shareOpen && idea && (
        <SharePostSheet
          post={idea}
          onClose={() => setShareOpen(false)}
          onToast={showToast}
        />
      )}

      {/* Toast (save / share feedback) */}
      {toast && createPortal(
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-[140px] z-[60] bg-[#0D2137] text-white text-[13px] font-medium px-4 py-2.5 rounded-full shadow-xl max-w-[90%] text-center"
        >
          {toast}
        </div>,
        document.body,
      )}

      <BottomNav />
    </div>
  );
}
