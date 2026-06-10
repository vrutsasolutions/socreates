// ════════════════════════════════════════════════════════════════════════
//  SharePostSheet  (figma "06 · Share Post")
//  Full-screen sheet to share an idea/post to selected people.
//  Opened from an IdeaCard's Share action.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Avatar from '../messaging/Avatar';
import { fetchShareTargets, sharePost } from '../../api/messagingApi';

export default function SharePostSheet({ post, onClose, onToast }) {
  const [people, setPeople] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await fetchShareTargets();
      if (!alive) return;
      setPeople(data);
      setSelected(new Set(data.slice(0, 2).map((p) => p.id)));
    })();
    return () => { alive = false; };
  }, []);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const filtered = people.filter((p) => {
    const q = query.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q);
  });

  const count = selected.size;

  const handleSend = async () => {
    if (count === 0 || sending) return;
    setSending(true);
    try {
      await sharePost({ postId: post.id, title: post.title }, Array.from(selected));
      onToast?.(`Post shared with ${count} ${count === 1 ? 'person' : 'people'}`);
      onClose();
    } finally {
      setSending(false);
    }
  };

  const stats = `${post.likeCount ?? 0} likes · ${post.commentCount ?? 0} comments · Just now`;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#F4F7FF] flex flex-col" onClick={(e) => e.stopPropagation()}>

      {/* Header — matches Home header pattern */}
      <header className="relative bg-[#1565C0] px-4 pt-5 pb-6 overflow-hidden">

  <div className="pointer-events-none absolute inset-0">
    <div className="absolute w-40 h-40 rounded-full border-[28px] border-white/5 -top-16 -right-10" />
    <div className="absolute w-28 h-28 rounded-full border-[20px] border-white/5 -bottom-10 -left-6" />
  </div>

  <div className="relative z-10 flex items-center">
    <button
      onClick={onClose}
      aria-label="Close"
      className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 6l12 12M6 18L18 6"
        />
      </svg>
    </button>

    <h1 className="flex-1 text-center text-[22px] font-bold text-white">
      Share Post
    </h1>

    <div className="w-10" />
  </div>
{/* floating search card */}
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
                className="w-full pl-6 bg-transparent text-white text-sm placeholder-white/50 focus:outline-none focus:border-[#1565C0]"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Post preview */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl border border-[#E3F2FD] p-3 flex items-center gap-3 shadow-sm">
          {post.imageUrl ? (
            <img src={post.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <span className="w-12 h-12 rounded-xl bg-[#EEF4FF] text-[#1565C0] text-[11px] font-bold flex items-center justify-center shrink-0">
              IDEA
            </span>
          )}
          <div className="min-w-0">
            <p
              className="text-[14px] font-bold text-[#0D2137] truncate"
              style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}
            >
              {post.title}
            </p>
            <p className="text-[12px] text-[#90A4AE] truncate mt-0.5">{stats}</p>
          </div>
        </div>
      </div>

      {/* Section label */}
      <p
        className="px-4 pt-4 pb-2 text-[11px] font-bold tracking-widest text-[#90A4AE] uppercase"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        Suggested
      </p>

      {/* People list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((p) => {
          const on = selected.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#F0F6FF] hover:bg-white active:bg-[#F4F7FF] transition-colors"
            >
              <Avatar initial={p.initial} color={p.avatarColor} size={44} />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[14px] font-semibold text-[#0D2137] truncate"
                  style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}
                >
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
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px] text-[#90A4AE]">
            No people match "{query}".
          </p>
        )}
      </div>

      {/* Send button — matches Home CTA style */}
      <div className="p-4 bg-white border-t border-[#E3F2FD]">
        <button
          onClick={handleSend}
          disabled={count === 0 || sending}
          className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px] transition-all active:scale-[0.98] disabled:opacity-50"
          style={{
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-0.01em',
            background: count === 0 ? '#BBDEFB' : 'linear-gradient(135deg, #1976D2, #1565C0)',
            boxShadow: count > 0 ? '0 4px 16px rgba(21,101,192,0.30)' : 'none',
          }}
        >
          {count === 0 ? 'Select people' : `Send to ${count} ${count === 1 ? 'person' : 'people'}`}
        </button>
      </div>
    </div>,
    document.body,
  );
}