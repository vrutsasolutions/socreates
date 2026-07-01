// ════════════════════════════════════════════════════════════════════════
//  SharePostSheet  (figma "06 · Share Post")
//  Full-screen sheet to share an idea/post to selected people.
//  Opened from an IdeaCard's Share action.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Avatar from '../messaging/Avatar';
import { ideaImages } from './ImageGallery';
import { fetchShareTargets, sharePost } from '../../api/messagingApi';

export default function SharePostSheet({ post, onClose, onToast }) {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [peopleError, setPeopleError] = useState('');

  useEffect(() => {
    let alive = true;

    const loadPeople = async () => {
      setLoadingPeople(true);
      setPeopleError('');

      try {
        const { data } = await fetchShareTargets();
        if (!alive) return;

        const list = Array.isArray(data) ? data : [];
        setPeople(list);
        setSelected(new Set(list.slice(0, 2).map((p) => p.id)));
      } catch (err) {
        if (!alive) return;
        setPeople([]);
        setSelected(new Set());
        setPeopleError('Could not load people. Please try again.');
      } finally {
        if (alive) setLoadingPeople(false);
      }
    };

    loadPeople();

    return () => {
      alive = false;
    };
  }, []);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const filtered = people.filter((p) => {
    const q = query.trim().toLowerCase();
    const name = (p.name || '').toLowerCase();
    const subtitle = (p.subtitle || '').toLowerCase();
    return !q || name.includes(q) || subtitle.includes(q);
  });

  const count = selected.size;

  // Cover = first of the idea's images (imageUrls[0]), falling back to the
  // legacy single imageUrl. This is what the chat idea-card thumbnail shows.
  const cover = ideaImages(post)[0] || '';

  const handleSend = async () => {
    if (count === 0 || sending) return;

    setSending(true);

    try {
      const ids = Array.from(selected);
      const { data } = await sharePost(
        { postId: post.id, title: post.title, imageUrl: cover, isPremium: !!post.isPremium },
        ids,
      );
      onToast?.(`Post shared with ${count} ${count === 1 ? 'person' : 'people'}`);
      onClose();

      // Single-recipient share: jump straight into the conversation so the
      // sender sees the idea card right away (the backend gives no realtime
      // echo to the sender, and Chat only loads messages on mount).
      const convoId = data?.results?.[0]?.conversationId;
      if (count === 1 && convoId) {
        navigate(`/messages/${convoId}`);
      }
    } catch (err) {
      onToast?.('Could not share post. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const stats = `${post.likeCount ?? 0} likes · ${post.commentCount ?? 0} comments · Just now`;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#F4F7FF] flex flex-col" onClick={(e) => e.stopPropagation()}>
      <header className="relative bg-[#1565C0] px-4 pt-5 pb-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <div className="relative z-10 flex items-center">
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>

          <h1 className="flex-1 text-center text-[22px] font-bold text-white">
            Share Post
          </h1>

          <div className="w-10" />
        </div>

        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 shadow-md">
            <div className="relative">
              <svg className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people..."
                disabled={loadingPeople}
                className="w-full pl-6 bg-transparent text-white text-sm placeholder-white/50 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl border border-[#E3F2FD] p-3 flex items-center gap-3 shadow-sm">
          {cover ? (
            <img src={cover} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <span className="w-12 h-12 rounded-xl bg-[#EEF4FF] text-[#1565C0] text-[11px] font-bold flex items-center justify-center shrink-0">
              IDEA
            </span>
          )}

          <div className="min-w-0">
            <p className="text-[14px] font-bold text-[#0D2137] truncate">
              {post.title}
            </p>
            <p className="text-[12px] text-[#90A4AE] truncate mt-0.5">{stats}</p>
          </div>
        </div>
      </div>

      <p className="px-4 pt-4 pb-2 text-[11px] font-bold tracking-widest text-[#90A4AE] uppercase">
        Suggested
      </p>

      <div className="flex-1 overflow-y-auto">
        {loadingPeople ? (
          <div className="px-4 py-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-[#DBEAFE]" />
                <div className="flex-1">
                  <div className="h-3 bg-[#DBEAFE] rounded w-32 mb-2" />
                  <div className="h-2.5 bg-[#E3F2FD] rounded w-44" />
                </div>
                <div className="w-6 h-6 rounded-full bg-[#DBEAFE]" />
              </div>
            ))}
          </div>
        ) : peopleError ? (
          <p className="px-4 py-10 text-center text-[13px] text-red-500">
            {peopleError}
          </p>
        ) : filtered.length > 0 ? (
          filtered.map((p) => {
            const on = selected.has(p.id);

            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#F0F6FF] hover:bg-white active:bg-[#F4F7FF] transition-colors"
              >
                <Avatar initial={p.initial} color={p.avatarColor} size={44} />

                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#0D2137] truncate">
                    {p.name}
                  </p>
                  <p className="text-[12px] text-[#90A4AE] truncate mt-0.5">{p.subtitle}</p>
                </div>

                <span
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    on ? 'bg-[#1565C0] border-[#1565C0]' : 'border-[#BBDEFB]'
                  }`}
                >
                  {on && (
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })
        ) : (
          <p className="px-4 py-10 text-center text-[13px] text-[#90A4AE]">
            No people match "{query}".
          </p>
        )}
      </div>

      <div className="p-4 bg-white border-t border-[#E3F2FD]">
        <button
          onClick={handleSend}
          disabled={count === 0 || sending || loadingPeople}
          className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px] transition-all active:scale-[0.98] disabled:opacity-50"
          style={{
            background: count === 0 ? '#BBDEFB' : 'linear-gradient(135deg, #1976D2, #1565C0)',
            boxShadow: count > 0 ? '0 4px 16px rgba(21,101,192,0.30)' : 'none',
          }}
        >
          {loadingPeople
            ? 'Loading people...'
            : count === 0
              ? 'Select people'
              : sending
                ? 'Sending...'
                : `Send to ${count} ${count === 1 ? 'person' : 'people'}`}
        </button>
      </div>
    </div>,
    document.body,
  );
}