// ════════════════════════════════════════════════════════════════════════
//  Inbox  (figma "01 · Inbox" + "08 · Empty State")
//  • Search bar, ACTIVE NOW story rail, REQUEST button → /messages/requests
//  • "+" button → /messages/new
//  • Recent conversation rows → /messages/:id
//  • Renders the Empty State layout when there are no conversations.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/messaging/Avatar';
import { fetchConversations, fetchActiveUsers } from '../api/messagingApi';

const PREVIEW_ICON = { voice: '🎙️', image: '📷' };

function ConversationRow({ c, onClick }) {
  const muted = c.unread === 0 || c.lastType !== 'text';
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#EAF2FF] transition-colors"
    >
      <Avatar initial={c.initial} color={c.avatarColor} size={48} online={c.online} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#0D2137] truncate">{c.name}</p>
        <p className={`text-[13px] truncate ${muted ? 'text-[#90A4AE]' : 'text-[#0D2137]'}`}>
          {PREVIEW_ICON[c.lastType] ? `${PREVIEW_ICON[c.lastType]} ` : ''}{c.lastMessage}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[12px] text-[#90A4AE]">{c.time}</span>
        {c.unread > 0 && (
          <span className="min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-[#EF4444] text-white text-[11px] font-bold">
            {c.unread}
          </span>
        )}
      </div>
    </button>
  );
}

function EmptyState({ navigate }) {
  return (
    <div className="flex flex-col items-center text-center px-8 pt-16">
      {/* Concentric circles with MSG */}
      <div className="relative w-[200px] h-[200px] flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-[#DBEAFE]" />
        <span className="absolute inset-5 rounded-full bg-[#BBDEFB]" />
        <span className="absolute inset-10 rounded-full bg-[#1565C0] flex items-center justify-center" />
        <span className="relative text-white font-bold text-lg tracking-wide">MSG</span>
      </div>
      <h2 className="mt-8 text-2xl font-bold text-[#0D2137]">No messages yet</h2>
      <p className="mt-2 text-[13px] text-[#90A4AE]">Start a conversation with your friends.</p>
      <button
        onClick={() => navigate('/messages/new')}
        className="mt-7 w-[220px] h-12 rounded-3xl bg-[#1565C0] text-white text-[15px] font-semibold hover:bg-[#0D47A1] transition-colors"
      >
        Send a Message
      </button>
      <button
        onClick={() => navigate('/search')}
        className="mt-3 w-[220px] h-11 rounded-3xl border-[1.5px] border-[#1565C0] text-[#1565C0] text-sm font-medium"
      >
        Browse Suggestions
      </button>
    </div>
  );
}

export default function Inbox() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [{ data: convos }, { data: actives }] = await Promise.all([
          fetchConversations(),
          fetchActiveUsers(),
        ]);
        if (!alive) return;
        setConversations(convos);
        setActive(actives);
      } catch (_) {
        if (alive) { setConversations([]); setActive([]); }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const isEmpty = !loading && conversations.length === 0;

  return (
    <div className="min-h-screen bg-[#F4F7FF]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white px-4 pt-3 pb-3 flex items-center gap-2 shadow-sm">
        <button onClick={() => navigate('/home')} aria-label="Back" className="w-9 h-9 -ml-1 flex items-center justify-center text-[#0D2137]">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-[28px] font-bold text-[#0D2137] leading-none">Messages</h1>
        <button
          onClick={() => navigate('/messages/new')}
          aria-label="New chat"
          className="w-10 h-10 rounded-full bg-[#1565C0] text-white flex items-center justify-center text-2xl font-bold hover:bg-[#0D47A1] transition-colors"
        >
          +
        </button>
      </header>

      {isEmpty ? (
        <EmptyState navigate={navigate} />
      ) : (
        <>
          {/* Search */}
          <div className="px-4 pt-3 pb-1">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#90A4AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full h-11 pl-11 pr-4 rounded-[22px] bg-white border-[1.5px] border-[#DBEAFE] text-sm text-[#0D2137] placeholder-[#90A4AE] focus:outline-none focus:border-[#1565C0]"
              />
            </div>
          </div>

          {/* Active now */}
          {active.length > 0 && (
            <div className="px-4 pt-3">
              <p className="text-[11px] font-bold tracking-wider text-[#90A4AE] mb-3">ACTIVE NOW</p>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {active.map((u) => (
                  <button key={u.id} onClick={() => navigate(`/messages/${u.id}`)} className="flex flex-col items-center gap-1.5 shrink-0">
                    <Avatar initial={u.initial} color={u.avatarColor} size={56} online={u.online} ring />
                    <span className="text-[11px] text-[#546E7A]">{u.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent header + Request button */}
          <div className="px-4 pt-4 pb-1 flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-wider text-[#90A4AE]">RECENT</p>
            <button
              onClick={() => navigate('/messages/requests')}
              className="text-[11px] font-bold tracking-wider text-[#1565C0]"
            >
              REQUEST
            </button>
          </div>

          {/* Conversation list */}
          <div className="divide-y divide-[#DBEAFE]">
            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-[#90A4AE]">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-[#90A4AE]">No conversations match “{query}”.</div>
            ) : (
              filtered.map((c) => (
                <ConversationRow key={c.id} c={c} onClick={() => navigate(`/messages/${c.id}`)} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
