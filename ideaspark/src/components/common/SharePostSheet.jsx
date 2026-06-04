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
      // Pre-select the first two (matches the figma default).
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
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center">
        <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center text-[#90A4AE]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" /></svg>
        </button>
        <h1 className="flex-1 text-center text-[20px] font-bold text-[#0D2137]">Share Post</h1>
        <span className="w-8" />
      </div>

      {/* Search */}
      <div className="px-4 pt-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people..."
          className="w-full h-11 px-4 rounded-full bg-white border border-[#DBEAFE] text-sm text-[#0D2137] placeholder-[#90A4AE] focus:outline-none focus:border-[#1565C0]"
        />
      </div>

      {/* Post preview */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl border border-[#E3F2FD] p-3 flex items-center gap-3">
          {post.imageUrl ? (
            <img src={post.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
          ) : (
            <span className="w-12 h-12 rounded-lg bg-[#E3F2FD] text-[#1565C0] text-[11px] font-bold flex items-center justify-center shrink-0">IMG</span>
          )}
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-[#0D2137] truncate">{post.title}</p>
            <p className="text-[12px] text-[#90A4AE] truncate">{stats}</p>
          </div>
        </div>
      </div>

      {/* People */}
      <p className="px-4 pt-4 pb-1 text-[11px] font-bold tracking-wider text-[#90A4AE]">SUGGESTED</p>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((p) => {
          const on = selected.has(p.id);
          return (
            <button key={p.id} onClick={() => toggle(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#F0F6FF] hover:bg-white transition-colors">
              <Avatar initial={p.initial} color={p.avatarColor} size={44} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-[#0D2137] truncate">{p.name}</p>
                <p className="text-[13px] text-[#90A4AE] truncate">{p.subtitle}</p>
              </div>
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${on ? 'bg-[#1565C0] border-[#1565C0]' : 'border-[#DBEAFE]'}`}>
                {on && <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[#90A4AE]">No people match “{query}”.</p>
        )}
      </div>

      {/* Send */}
      <div className="p-4">
        <button
          onClick={handleSend}
          disabled={count === 0 || sending}
          className="w-full h-13 py-3.5 rounded-full bg-[#1565C0] text-white font-semibold hover:bg-[#0D47A1] transition-colors disabled:opacity-50"
        >
          {count === 0 ? 'Select people' : `Send to ${count} ${count === 1 ? 'person' : 'people'}`}
        </button>
      </div>
    </div>,
    document.body,
  );
}
