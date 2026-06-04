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
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen bg-[#F4F7FF]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white px-3 py-3 flex items-center gap-2 shadow-sm">
        <button onClick={() => navigate(-1)} aria-label="Back" className="w-9 h-9 flex items-center justify-center text-[#0D2137]">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[22px] font-bold text-[#0D2137]">New Chat</h1>
      </header>

      {/* Search */}
      <div className="px-4 pt-3">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#90A4AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people..."
            className="w-full h-11 pl-11 pr-4 rounded-[22px] bg-white border-[1.5px] border-[#DBEAFE] text-sm text-[#0D2137] placeholder-[#90A4AE] focus:outline-none focus:border-[#1565C0]"
          />
        </div>
      </div>

      <p className="px-4 pt-4 pb-1 text-[11px] font-bold tracking-wider text-[#90A4AE]">SUGGESTED</p>

      {/* Contacts */}
      <div className="divide-y divide-[#DBEAFE]">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-[#90A4AE]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[#90A4AE]">No people match “{query}”.</div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => open(c.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#EAF2FF] transition-colors"
            >
              <Avatar initial={c.initial} color={c.avatarColor} size={48} online={c.online} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-[#0D2137] truncate">{c.name}</p>
                <p className="text-[13px] text-[#90A4AE] truncate">{c.handle}</p>
              </div>
              <span className="w-8 h-8 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M12 8v8" /></svg>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
