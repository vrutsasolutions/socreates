// ════════════════════════════════════════════════════════════════════════
//  NewChat  (figma "09 · New Chat")
//  Search + contact list to start a new conversation. Reached from the Inbox
//  "+" button. Built to the Messaging System UI design system.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/messaging/Avatar';
import { fetchContacts, startConversation } from '../api/messagingApi';

export default function NewChat() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [query, setQuery]       = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await fetchContacts();
        if (alive) setContacts(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const open = async (userId) => {
    const { data } = await startConversation(userId);
    navigate(`/messages/${data.id}`);
  };

  const filtered = contacts.filter((c) => {
    const q = query.trim().toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen ">

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
          <span className="text-white font-bold text-lg flex-1">New Chat</span>
        </div>

        {/* floating search card */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 shadow-md flex items-center gap-3">
            <svg className="w-4 h-4 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people..."
              className="flex-1 bg-transparent text-white text-[15px] placeholder-white/50 outline-none"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-white/60 hover:text-white transition-colors text-lg leading-none active:scale-90">✕</button>
            )}
          </div>
        </div>
      </header>

      {/* CONTENT WRAPPER — matches Home */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-5">

          <p className="px-4 pb-2 text-xs font-bold tracking-wider text-[#90A4AE] uppercase">Suggested</p>

          <div className="divide-y divide-[#F0F6FF]">
            {loading ? (
              /* skeletons */
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-[#E3F2FD] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-[#E3F2FD] rounded w-32" />
                    <div className="h-3 bg-[#E3F2FD] rounded w-24" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#E3F2FD] shrink-0" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-[15px] text-[#0D2137] font-semibold">No people found</p>
                <p className="text-sm text-[#90A4AE] mt-1">Try a different name or handle</p>
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => open(c.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#EAF2FF] active:bg-[#DBEAFE] transition-colors"
                >
                  <Avatar initial={c.initial} color={c.avatarColor} src={c.profileImage} size={48} online={c.online} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[#0D2137] truncate">{c.name}</p>
                    <p className="text-sm text-[#90A4AE] truncate">{c.handle}</p>
                  </div>
                  {/* Replace the <span> button at the end of each contact row with: */}
<span className="w-9 h-9 rounded-2xl bg-[#E3F2FD] text-[#1565C0] flex items-center justify-center shrink-0 hover:bg-[#BBDEFB] active:scale-90 transition-all">
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83L3 20l1.17-3.5A7.86 7.86 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
</span>
                </button>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
