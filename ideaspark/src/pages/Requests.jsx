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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

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
    <div className="min-h-screen bg-[#F4F7FF]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white px-3 py-3 flex items-center gap-2 shadow-sm">
        <button onClick={() => navigate(-1)} aria-label="Back" className="w-9 h-9 flex items-center justify-center text-[#0D2137]">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[22px] font-bold text-[#0D2137]">Requests</h1>
      </header>

      <p className="px-4 pt-4 pb-2 text-[13px] text-[#90A4AE]">
        People who want to message you. Accept to start a conversation.
      </p>

      {loading ? (
        <div className="px-4 py-10 text-center text-sm text-[#90A4AE]">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center text-center px-8 pt-20">
          <div className="w-20 h-20 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#1565C0]"><Icon name="inbox" className="w-9 h-9" /></div>
          <h2 className="mt-5 text-lg font-bold text-[#0D2137]">No pending requests</h2>
          <p className="mt-1 text-[13px] text-[#90A4AE]">You're all caught up.</p>
        </div>
      ) : (
        <div className="px-4 space-y-3 pb-6">
          {requests.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar initial={r.initial} color={r.avatarColor} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-[#0D2137] truncate">{r.name}</p>
                    <span className="text-[12px] text-[#90A4AE] shrink-0 ml-2">{r.time}</span>
                  </div>
                  {r.mutuals > 0 && (
                    <p className="text-[11px] text-[#1565C0] font-medium">{r.mutuals} mutual{r.mutuals > 1 ? 's' : ''}</p>
                  )}
                  <p className="mt-1 text-[13px] text-[#546E7A] line-clamp-2">{r.preview}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busy === r.id}
                  onClick={() => act(r.id, 'accept')}
                  className="flex-1 h-10 rounded-xl bg-[#1565C0] text-white text-sm font-semibold hover:bg-[#0D47A1] transition-colors disabled:opacity-60"
                >
                  Accept
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => act(r.id, 'decline')}
                  className="flex-1 h-10 rounded-xl bg-[#F4F7FF] border border-[#DBEAFE] text-[#546E7A] text-sm font-semibold disabled:opacity-60"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
