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
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#EAF2FF] active:bg-[#DBEAFE] transition-colors"
    >
      <Avatar initial={c.initial} color={c.avatarColor} size={48} online={c.online} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#0D2137] truncate">{c.name}</p>
        <p className={`text-[13px] truncate ${muted ? 'text-[#90A4AE]' : 'text-[#0D2137] font-medium'}`}>
          {PREVIEW_ICON[c.lastType] ? `${PREVIEW_ICON[c.lastType]} ` : ''}{c.lastMessage}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[12px] text-[#90A4AE]">{c.time}</span>
        {c.unread > 0 && (
          <span className="min-w-[22px] h-5 px-1 flex items-center justify-center rounded-full bg-[#1565C0] text-white text-[11px] font-bold">
            {c.unread}
          </span>
        )}
      </div>
    </button>
  );
}

function EmptyState({ navigate }) {
  return (
    <div className="bg-[#1565C0]">
      <div className="bg-white rounded-t-[32px] flex flex-col items-center text-center px-8 pt-16 pb-10">
        <div className="relative w-[160px] h-[160px] flex items-center justify-center mb-6">
          <span className="absolute inset-0 rounded-full bg-[#DBEAFE]" />
          <span className="absolute inset-5 rounded-full bg-[#BBDEFB]" />
          <span className="absolute inset-10 rounded-full bg-[#1565C0]" />
          <span className="relative text-white font-bold text-lg tracking-wide">MSG</span>
        </div>
        <h2 className="text-2xl font-bold text-[#0D2137]">No messages yet</h2>
        <p className="mt-2 text-[15px] text-[#90A4AE] leading-relaxed">Start a conversation with creators you follow.</p>
        <button
          onClick={() => navigate('/messages/new')}
          className="mt-8 w-full max-w-[260px] py-3.5 rounded-2xl bg-[#1565C0] text-white text-[15px] font-semibold hover:bg-[#0D47A1] active:scale-[0.97] transition-all shadow-md shadow-blue-200"
        >
          Send a Message
        </button>
        <button
          onClick={() => navigate('/search')}
          className="mt-3 w-full max-w-[260px] py-3.5 rounded-2xl border-2 border-[#BBDEFB] text-[#1565C0] text-[15px] font-semibold hover:bg-[#E3F2FD] hover:border-[#1565C0] active:scale-[0.97] transition-all"
        >
          Browse Suggestions
        </button>
      </div>
    </div>
  );
}

export default function Inbox() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [active, setActive]               = useState([]);
  const [query, setQuery]                 = useState('');
  const [loading, setLoading]             = useState(true);

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

      {/* HEADER — matches Home */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">

        {/* decorative circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        {/* top bar */}
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => navigate('/home')}
            className="w-9 h-9 flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all"
            aria-label="Back to home"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-bold text-lg flex-1">Messages</span>
          <button
            onClick={() => navigate('/messages/new')}
            aria-label="New chat"
            className="w-9 h-9 rounded-full bg-white/15 border border-white/20 text-white flex items-center justify-center text-xl font-bold hover:bg-white/25 active:scale-90 transition-all"
          >
            +
          </button>
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
              placeholder="Search messages..."
              className="flex-1 bg-transparent text-white text-[15px] placeholder-white/50 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-white/60 hover:text-white transition-colors text-lg leading-none active:scale-90">✕</button>
            )}
          </div>
        </div>
      </header>

      {isEmpty ? (
        <EmptyState navigate={navigate} />
      ) : (
        <div className="bg-[#1565C0]">
          <div className="bg-white rounded-t-[32px] pt-5">

            {/* Active now */}
            {active.length > 0 && (
              <div className="px-4 mb-4">
                <p className="text-xs font-bold tracking-wider text-[#90A4AE] mb-3 uppercase">Active Now</p>
                <div className="flex gap-4 overflow-x-auto pb-1">
                  {active.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => navigate(`/messages/${u.id}`)}
                      className="flex flex-col items-center gap-1.5 shrink-0 active:scale-90 transition-transform"
                    >
                      <Avatar initial={u.initial} color={u.avatarColor} size={56} online={u.online} ring />
                      <span className="text-xs text-[#546E7A] font-medium">{u.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent header + Request button */}
            <div className="px-4 py-2 flex items-center justify-between border-b border-[#F0F6FF]">
              <p className="text-xs font-bold tracking-wider text-[#90A4AE] uppercase">Recent</p>
              <button
                onClick={() => navigate('/messages/requests')}
                className="text-xs font-bold tracking-wider text-[#1565C0] hover:text-[#0D47A1] active:opacity-70 transition-colors uppercase"
              >
                Requests
              </button>
            </div>

            {/* Conversation list */}
            <div className="divide-y divide-[#F0F6FF]">
              {loading ? (
                <div className="px-4 py-10 text-center text-sm text-[#90A4AE]">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-[15px] text-[#90A4AE]">No conversations match "{query}".</div>
              ) : (
                filtered.map((c) => (
                  <ConversationRow key={c.id} c={c} onClick={() => navigate(`/messages/${c.id}`)} />
                ))
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
