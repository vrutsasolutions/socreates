// ════════════════════════════════════════════════════════════════════════
//  Requests  (figma "03 · Requests")
//  Pending message requests with Accept / Decline. Reached from the Inbox
//  "REQUEST" button. Built to the Messaging System UI design system.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/messaging/Avatar';
import { fetchRequests, acceptRequest, declineRequest } from '../api/messagingApi';
import Icon from '../components/common/Icon';

export default function Requests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await fetchRequests();
        if (alive) setRequests(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const act = async (id, kind) => {
    setBusy(id);
    try {
      if (kind === 'accept') { await acceptRequest(id); }
      else { await declineRequest(id); }
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (kind === 'accept') navigate(`/messages/${id}`);
    } finally {
      setBusy(null);
    }
  };

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
          <span className="text-white font-bold text-lg flex-1">Message Requests</span>
        </div>

        {/* floating info card */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3.5 shadow-md">
            <p className="text-white text-[15px] leading-relaxed">
              People who want to message you. Accept to start a conversation.
            </p>
          </div>
        </div>
      </header>

      {/* CONTENT WRAPPER — matches Home */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-5 pb-6">

          {loading ? (
            <div className="px-4 space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-[#F0F6FF] rounded-2xl p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#BBDEFB] shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3.5 bg-[#BBDEFB] rounded w-32" />
                      <div className="h-3 bg-[#BBDEFB] rounded w-48" />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <div className="flex-1 h-10 rounded-xl bg-[#BBDEFB]" />
                    <div className="flex-1 h-10 rounded-xl bg-[#BBDEFB]" />
                  </div>
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center text-center px-8 pt-16 pb-10">
              <div className="w-20 h-20 rounded-full bg-[#E3F2FD] flex items-center justify-center text-4xl mb-5 shadow-sm">📭</div>
              <h2 className="text-xl font-bold text-[#0D2137]">No pending requests</h2>
              <p className="mt-1.5 text-[15px] text-[#90A4AE]">You're all caught up.</p>
            </div>
          ) : (
            <div className="px-4 space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <Avatar initial={r.initial} color={r.avatarColor} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[15px] font-semibold text-[#0D2137] truncate">{r.name}</p>
                        <span className="text-xs text-[#90A4AE] shrink-0 ml-2">{r.time}</span>
                      </div>
                      {r.mutuals > 0 && (
                        <p className="text-xs text-[#1565C0] font-semibold mt-0.5">
                          {r.mutuals} mutual{r.mutuals > 1 ? 's' : ''}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-[#546E7A] line-clamp-2 leading-relaxed">{r.preview}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      disabled={busy === r.id}
                      onClick={() => act(r.id, 'accept')}
                      className="flex-1 h-11 rounded-2xl bg-[#1565C0] text-white text-[15px] font-semibold hover:bg-[#0D47A1] active:scale-[0.97] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {busy === r.id ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : 'Accept'}
                    </button>
                    <button
                      disabled={busy === r.id}
                      onClick={() => act(r.id, 'decline')}
                      className="flex-1 h-11 rounded-2xl bg-white border border-[#BBDEFB] text-[#546E7A] text-[15px] font-semibold hover:bg-[#E3F2FD] hover:border-[#1565C0] active:scale-[0.97] transition-all disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}