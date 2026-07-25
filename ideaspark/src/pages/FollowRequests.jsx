// ════════════════════════════════════════════════════════════════════════
//  FollowRequests
//  Pending follow requests against a PRIVATE account, with Accept / Decline.
//
//  Reached from: Settings → Privacy → Follow Requests (only rendered while
//  the account is private), and from a "wants to follow you" bell
//  notification.
//
//  Rows appear here from two sources, and the page deliberately doesn't
//  distinguish them:
//    1. Someone tapped Follow on this private profile.
//    2. The user switched Public → Private, which converted every existing
//       follower into a pending request.
//
//  Built to match Requests.jsx (message requests) so the two read as a pair.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/common/Icon";
import {
  fetchFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
} from "../api/userApi";

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function FollowRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await fetchFollowRequests();
        if (alive) setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("[FollowRequests] failed to load", err);
        if (alive) setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Removed from the list only after the server confirms. Dropping the row
  // optimistically would hide a failure — and unlike a message request, an
  // approval that silently didn't happen leaves someone permanently unable
  // to follow, with nothing on screen to explain why.
  const act = async (requestId, kind) => {
    if (busy) return;
    setBusy(requestId);
    try {
      if (kind === "accept") await acceptFollowRequest(requestId);
      else await declineFollowRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error(`[FollowRequests] ${kind} failed`, err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen">
      {/* HEADER — matches Requests.jsx */}
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
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-white font-bold text-lg flex-1">
            Follow Requests
          </span>
        </div>

        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3.5 shadow-md">
            <p className="text-white text-[15px] leading-relaxed">
              People who want to follow you. Only approved followers see your
              ideas in their feed.
            </p>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-5 pb-6 min-h-[60vh]">
          {loading ? (
            <div className="px-4 space-y-3">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="bg-[#F0F6FF] rounded-2xl p-4 animate-pulse"
                  >
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
          ) : loadError ? (
            <div className="flex flex-col items-center text-center px-8 pt-16 pb-10">
              <div className="w-20 h-20 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-5">
                <Icon name="alert-triangle" className="w-9 h-9 text-[#DC2626]" />
              </div>
              <h2 className="text-xl font-bold text-[#0D2137]">
                Couldn't load requests
              </h2>
              <p className="mt-1.5 text-[15px] text-[#90A4AE]">
                Check your connection and try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-5 px-6 h-11 rounded-2xl bg-[#1565C0] text-white text-[15px] font-semibold active:scale-[0.97] transition-all"
              >
                Retry
              </button>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center text-center px-8 pt-16 pb-10">
              <div className="w-20 h-20 rounded-full bg-[#E3F2FD] flex items-center justify-center mb-5 shadow-sm">
                <Icon name="user-plus" className="w-9 h-9 text-[#1565C0]" />
              </div>
              <h2 className="text-xl font-bold text-[#0D2137]">
                No pending requests
              </h2>
              <p className="mt-1.5 text-[15px] text-[#90A4AE]">
                You're all caught up.
              </p>
            </div>
          ) : (
            <div className="px-4 space-y-3">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {/* Tapping the identity block opens their profile so the
                        owner can decide with more than a name to go on. */}
                    <button
                      onClick={() => navigate(`/users/${r.userId}`)}
                      className="shrink-0 active:scale-95 transition-transform"
                      aria-label={`View ${r.name || "user"}'s profile`}
                    >
                      {r.profileImage ? (
                        <img
                          src={r.profileImage}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover bg-white"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#1565C0] flex items-center justify-center text-white font-bold text-lg">
                          {r.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => navigate(`/users/${r.userId}`)}
                          className="text-[15px] font-semibold text-[#0D2137] truncate text-left"
                        >
                          {r.name}
                        </button>
                        <span className="text-xs text-[#90A4AE] shrink-0">
                          {timeAgo(r.createdAt)}
                        </span>
                      </div>

                      {r.username && (
                        <p className="text-xs text-[#1565C0] font-medium mt-0.5 truncate">
                          @{r.username}
                        </p>
                      )}

                      {r.bio && (
                        <p className="mt-1 text-sm text-[#546E7A] line-clamp-2 leading-relaxed">
                          {r.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      disabled={busy === r.id}
                      onClick={() => act(r.id, "accept")}
                      className="flex-1 h-11 rounded-2xl bg-[#1565C0] text-white text-[15px] font-semibold hover:bg-[#0D47A1] active:scale-[0.97] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {busy === r.id ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Confirm"
                      )}
                    </button>
                    <button
                      disabled={busy === r.id}
                      onClick={() => act(r.id, "decline")}
                      className="flex-1 h-11 rounded-2xl bg-white border border-[#BBDEFB] text-[#546E7A] text-[15px] font-semibold hover:bg-[#E3F2FD] hover:border-[#1565C0] active:scale-[0.97] transition-all disabled:opacity-60"
                    >
                      Delete
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
