// ════════════════════════════════════════════════════════════════════════
//  Inbox  (figma "01 · Inbox" + "08 · Empty State")
//  • Search bar, ACTIVE NOW story rail, REQUEST button → /messages/requests
//  • "+" button → /messages/new
//  • Recent conversation rows → /messages/:id
//  • Renders the Empty State layout when there are no conversations.
//
//  FIX: fetchConversations and fetchActiveUsers are now called independently.
//  A failed /active endpoint no longer prevents conversations from loading.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/messaging/Avatar';
import { fetchConversations, fetchActiveUsers } from '../api/messagingApi';
import Icon from '../components/common/Icon';

const PREVIEW_ICON = { voice: 'mic', image: 'camera', idea: 'lightbulb' };

function ConversationRow({ c, onClick }) {
  const muted = c.unread === 0 || c.lastType !== 'text';
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#EAF2FF] active:bg-[#DBEAFE] transition-colors"
    >
      <Avatar initial={c.initial} color={c.avatarColor} src={c.profileImage} size={48} online={c.online} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#0D2137] truncate">{c.name}</p>
        <p className={`text-[13px] truncate ${muted ? 'text-[#90A4AE]' : 'text-[#0D2137]'}`}>
          {PREVIEW_ICON[c.lastType] && <Icon name={PREVIEW_ICON[c.lastType]} className="inline w-3.5 h-3.5 mr-1 align-text-bottom" />}{c.lastMessage}
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
    <div className="bg-[#1565C0]">
      <div className="bg-white rounded-t-[32px] flex flex-col items-center text-center px-8 pt-16 pb-10">
        <div className="relative w-[200px] h-[200px] flex items-center justify-center mb-6">
          <span className="absolute inset-0 rounded-full bg-[#DBEAFE]" />
          <span className="absolute inset-5 rounded-full bg-[#BBDEFB]" />
          <span className="absolute inset-10 rounded-full bg-[#1565C0] flex items-center justify-center" />
          <span className="relative text-white font-bold text-lg tracking-wide">MSG</span>
        </div>
        <h2 className="text-2xl font-bold text-[#0D2137]">No messages yet</h2>
        <p className="mt-2 text-[15px] text-[#90A4AE] leading-relaxed">Start a conversation with your friends.</p>
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

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-[#E3F2FD] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-[#E3F2FD] rounded w-36" />
        <div className="h-3 bg-[#E3F2FD] rounded w-52" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-3 bg-[#E3F2FD] rounded w-10" />
      </div>
    </div>
  );
}

export default function Inbox() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Messaging is free for everyone — always load the inbox.
    let alive = true;

    const loadConversations = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: convos } = await fetchConversations();
        if (alive) setConversations(Array.isArray(convos) ? convos : []);
      } catch (err) {
        console.error('[Inbox] failed to load conversations', err);
        if (alive) {
          setConversations([]);
          setError('Could not load messages. Please try again.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    // Load active users separately — failure here must NOT affect conversations
    const loadActive = async () => {
      try {
        const { data: actives } = await fetchActiveUsers();
        if (alive) setActive(Array.isArray(actives) ? actives : []);
      } catch {
        // Silently ignore — active rail is non-critical
        if (alive) setActive([]);
      }
    };

    loadConversations();
    loadActive();

    return () => { alive = false; };
  }, []);

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const isEmpty = !loading && !error && conversations.length === 0;

  return (
    <div className="min-h-screen">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-[28px] font-bold text-white leading-none">Messages</h1>
          <button
            onClick={() => navigate('/messages/new')}
            aria-label="New chat"
            className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg hover:bg-white/20 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
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
                placeholder="Search messages..."
                className="w-full pl-6 bg-transparent text-white text-sm placeholder-white/50 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ERROR STATE */}
      {error && (
        <div className="bg-[#1565C0]">
          <div className="bg-white rounded-t-[32px] flex flex-col items-center text-center px-8 pt-16 pb-10">
            <div className="w-14 h-14 rounded-full bg-[#FEE2E2] flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#0D2137]">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 px-6 py-2.5 rounded-xl bg-[#1565C0] text-white text-sm font-semibold hover:bg-[#0D47A1] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {isEmpty && !error && <EmptyState navigate={navigate} />}

      {/* CONVERSATION LIST */}
      {!error && (isEmpty === false || loading) && (
        <>
          {/* Active now rail */}
          {active.length > 0 && (
            <div className="bg-[#1565C0]">
              <div className="bg-white rounded-t-[32px] px-4 pt-4">
                <p className="text-[11px] font-bold tracking-wider text-[#90A4AE] mb-3">ACTIVE NOW</p>
                <div className="flex gap-4 overflow-x-auto pb-1">
                  {active.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => navigate(`/messages/${u.id}`)}
                      className="flex flex-col items-center gap-1.5 shrink-0 active:scale-90 transition-transform"
                    >
                      <Avatar initial={u.initial} color={u.avatarColor} src={u.profileImage} size={56} online={u.online} ring />
                      <span className="text-[11px] text-[#546E7A]">{u.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent header */}
          <div className={`px-4 pt-4 pb-1 flex items-center justify-between ${active.length === 0 ? 'bg-[#1565C0]' : 'bg-white'}`}>
            {active.length === 0 && <div className="absolute left-0 right-0 top-0 h-full bg-white rounded-t-[32px] -z-10" />}
            <p className="text-[11px] font-bold tracking-wider text-[#90A4AE]">RECENT</p>
            <button
              onClick={() => navigate('/messages/requests')}
              className="text-[11px] font-bold tracking-wider text-[#90A4AE] active:opacity-70 transition-colors"
            >
              REQUEST
            </button>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#DBEAFE] bg-white">
            {loading ? (
              Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-[#90A4AE]">No conversations match "{query}".</div>
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
