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
} from '../api/ideaApi';

/* ── Helpers (mirrors IdeaCard.premium formatDate) ───────────── */
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

export default function IdeaDetail() {
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

  // ── Engagement (like / save / share) — mirrors IdeaCard.premium ──
  const [liked, setLiked]       = useState(false);
  const [likes, setLikes]       = useState(0);
  const [likeAnim, setLikeAnim] = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast]       = useState(null);
  const saveRef = useRef(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    Promise.all([fetchIdeaById(id), fetchComments(id)])
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
      // Fall back to the current user's identity so the new comment shows an
      // avatar/name immediately even if the API response omits them.
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

      {/* Header — matches SavedIdeas/Home */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-6 relative shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
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
              <ImageGallery images={ideaImages(idea)} title={idea.title} />

              {/* Creator row */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#EEF0FF] text-[#1A28A0] font-bold flex items-center justify-center text-sm shrink-0">
                  {initials(idea.creatorName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#0D2137] font-semibold text-sm truncate">{idea.creatorName || 'Anonymous'}</p>
                  <p className="text-[#90A4AE] text-xs">{formatDate(idea.createdAt)}</p>
                </div>
                {idea.category && (
                  <span className="text-[11px] font-semibold text-[#1565C0] bg-[#E3F2FD] px-2.5 py-1 rounded-full">
                    {idea.category}
                  </span>
                )}
              </div>

              <h2 className="text-[#0D2137] font-bold text-xl mb-2">{idea.title}</h2>
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
                    // Backend comments may omit userImage; for the current user's
                    // own comments fall back to their live profile photo.
                    const avatarSrc = c.userImage || (isMine(c) ? user?.profileImage : null);
                    return (
                    <li key={c.id} className="flex gap-3">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt={c.userName || 'User'}
                          className="w-8 h-8 rounded-lg object-cover bg-[#EEF0FF] shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#EEF0FF] text-[#1A28A0] font-bold flex items-center justify-center text-xs shrink-0">
                          {initials(c.userName)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 bg-[#F7F9FF] border border-[#ECEFF6] rounded-2xl px-3.5 py-2.5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[#0D2137] font-semibold text-[13px] truncate">{c.userName || 'User'}</span>
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
        </div>
      </div>

      {/* ── Comment composer (fixed above bottom nav) ─────────── */}
      {!loading && !error && idea && (
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
