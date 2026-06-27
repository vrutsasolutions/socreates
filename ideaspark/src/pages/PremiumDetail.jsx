import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { fetchComments, addComment, deleteComment } from '../api/ideaApi';
import { NotFoundError } from '../components/common/ErrorStates.premium';
import ImageGallery, { ideaImages } from '../components/common/ImageGallery';
import Icon from '../components/common/Icon';

/* ── Helpers (mirrors IdeaDetail) ───────────────────────────── */
function formatDate(dateString) {
  if (!dateString) return '';
  const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
const initials = (name = '?') => name.trim().charAt(0).toUpperCase() || '?';

const MOCK = {
  id: 'p1',
  title: 'Build a $10K/mo SaaS with No Code',
  description: 'Complete blueprint for a profitable no-code SaaS...',
  category: 'Business',
  creatorName: 'Vikram P',
  likeCount: 312
};

export default function PremiumDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [idea, setIdea]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState('');
  const [posting, setPosting]   = useState(false);
  const [postErr, setPostErr]   = useState('');

  useEffect(() => {
    api.get(`/ideas/${id}`)
      .then(({ data }) => setIdea(data))
      .catch(() => setIdea(MOCK))
      .finally(() => setLoading(false));
    fetchComments(id)
      .then(({ data }) => setComments(data || []))
      .catch(() => setComments([]));
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
      setComments((prev) => [data, ...prev]);
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

  const handleDeleteComment = async (commentId) => {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== commentId));
    try {
      await deleteComment(commentId);
    } catch (_) {
      setComments(prev); // revert on failure
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F4F7FF] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isLocked = !user?.isPremium;

  return (
    <div className="min-h-screen">

      {/* HEADER — matches Home */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">

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
          <span className="flex-1" />
          <div className="bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Icon name="star" className="w-3.5 h-3.5" /> Premium Idea
          </div>
        </div>

        {/* floating idea title card */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4 shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => idea?.creatorId && navigate(`/users/${idea.creatorId}`)}
                className="flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/15 flex items-center justify-center text-white font-bold text-base shrink-0">
                  {idea?.creatorName?.[0] ?? '?'}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{idea?.creatorName}</div>
                  <div className="text-blue-200 text-xs">{idea?.category}</div>
                </div>
              </button>
            </div>
            <h1 className="text-white text-lg font-bold leading-snug">{idea?.title}</h1>
          </div>
        </div>
      </header>

      {/* CONTENT WRAPPER — matches Home */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6 px-4 pb-10">

          {isLocked ? (
            <>
              {/* blurred preview */}
              <p className="text-[#546E7A] text-[15px] leading-relaxed blur-[4px] select-none pointer-events-none line-clamp-4 mb-6" aria-hidden="true">
                {idea?.description}
              </p>

              {/* lock card */}
              <div className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-6 text-center shadow-sm">
                <div className="w-14 h-14 bg-[#E3F2FD] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon name="lock" className="w-7 h-7 text-[#1565C0]" />
                </div>
                <h3 className="text-[#0D2137] font-bold text-lg mb-2">Unlock Premium Ideas</h3>
                <p className="text-[#546E7A] text-[15px] leading-relaxed mb-6 max-w-xs mx-auto">
                  Get unlimited access to all premium ideas from expert creators.
                </p>
                <button
                  onClick={() => navigate('/membership')}
                  className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-300/30 text-[15px]"
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
              {/* like + save action bar */}
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#BBDEFB]">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#F0F6FF] border border-[#BBDEFB] text-[#1565C0] text-sm font-semibold hover:bg-[#DBEAFE] hover:border-[#1565C0] active:scale-95 transition-all">
                  ❤️ {idea?.likeCount ?? 0}
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#F0F6FF] border border-[#BBDEFB] text-[#1565C0] text-sm font-semibold hover:bg-[#DBEAFE] hover:border-[#1565C0] active:scale-95 transition-all">
                  🔖 Save
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#F0F6FF] border border-[#BBDEFB] text-[#1565C0] text-sm font-semibold hover:bg-[#DBEAFE] hover:border-[#1565C0] active:scale-95 transition-all ml-auto">
                  ↗ Share
                </button>
              </div>

              <ImageGallery images={ideaImages(idea)} title={idea?.title} />

              <p className="text-[#0D2137] text-[15px] leading-relaxed whitespace-pre-line">
                {idea?.description}
              </p>

              {/* ── Comments ─────────────────────────────────── */}
              <div className="mt-7 pt-6 border-t border-[#BBDEFB]">
                <h3 className="text-[#0D2137] font-bold text-base mb-3">
                  Comments {comments.length > 0 && <span className="text-[#90A4AE] font-medium">({comments.length})</span>}
                </h3>

                {/* composer */}
                <form onSubmit={handlePost} className="flex items-center gap-2 mb-5">
                  <input
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
                {postErr && <p className="text-[#E53935] text-xs -mt-3 mb-4">{postErr}</p>}

                {comments.length === 0 ? (
                  <p className="text-[#90A4AE] text-sm py-4 text-center">No comments yet — be the first to share your thoughts.</p>
                ) : (
                  <ul className="space-y-3">
                    {comments.map((c) => {
                      // Tapping the commenter's avatar or name opens their profile.
                      const goToProfile = () => { if (c.userId) navigate(`/users/${c.userId}`); };
                      return (
                      <li key={c.id} className="flex gap-3">
                        <div onClick={goToProfile}
                          className={`w-8 h-8 rounded-lg bg-[#EEF0FF] text-[#1A28A0] font-bold flex items-center justify-center text-xs shrink-0${c.userId ? ' cursor-pointer active:scale-95' : ''}`}>
                          {initials(c.userName)}
                        </div>
                        <div className="flex-1 min-w-0 bg-[#F7F9FF] border border-[#ECEFF6] rounded-2xl px-3.5 py-2.5">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span onClick={goToProfile}
                              className={`text-[#0D2137] font-semibold text-[13px] truncate${c.userId ? ' cursor-pointer hover:underline' : ''}`}>{c.userName || 'User'}</span>
                            <span className="text-[#B0BEC5] text-[11px]">{formatDate(c.createdAt)}</span>
                            {isMine(c) && (
                              <button onClick={() => handleDeleteComment(c.id)}
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
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
