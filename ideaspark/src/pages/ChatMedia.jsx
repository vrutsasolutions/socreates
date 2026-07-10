// ════════════════════════════════════════════════════════════════════════
//  ChatMedia  ("Media, Links & Docs" screen)
//  Reached from ChatProfile → Media, Links & Docs row.
//  Tabs: Media (images) | Files (files + voice notes) | Links
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchConversationMedia } from '../api/messagingApi';

const TABS = [
  { key: 'media', label: 'Media' },
  { key: 'files', label: 'Files' },
  { key: 'links', label: 'Links' },
];

const IconFile = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6" />
  </svg>
);
const IconMic = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...p}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path strokeLinecap="round" d="M5 11a7 7 0 0014 0M12 18v4" />
  </svg>
);
const IconLink = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 4.5M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07L12.5 19.5" />
  </svg>
);

const fileNameFromUrl = (url = '') => {
  const seg = String(url).split('/').pop() || 'File';
  return decodeURIComponent(seg.replace(/^[0-9a-fA-F-]{36}-/, ''));
};

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ChatMedia() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [tab, setTab] = useState('media');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ images: [], files: [], voiceNotes: [], links: [], totalCount: 0 });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetchConversationMedia(id);
        if (alive) setData(res.data || {});
      } catch (err) {
        console.error('[chat-media] failed to load', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const filesAndVoice = [...(data.files || []), ...(data.voiceNotes || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  return (
    <div className="min-h-screen bg-[#F4F7FF]">
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white font-bold text-lg">Media, Links &amp; Docs</h1>
      </header>

      {/* Tabs */}
      <div className="sticky top-[65px] z-20 bg-white border-b border-[#E3F2FD] flex">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t.key
                ? 'text-[#1565C0] border-b-2 border-[#1565C0]'
                : 'text-[#90A4AE] border-b-2 border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {loading ? (
          <p className="text-center text-[#90A4AE] mt-10">Loading...</p>
        ) : (
          <>
            {/* MEDIA TAB — images */}
            {tab === 'media' && (
              (data.images || []).length === 0 ? (
                <p className="text-center text-[#90A4AE] mt-10">No media shared yet</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {data.images.map((m) => (
                    <a
                      key={m.id}
                      href={m.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden bg-[#E3F2FD]"
                    >
                      <img src={m.content} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )
            )}

            {/* FILES TAB — files + voice notes */}
            {tab === 'files' && (
              filesAndVoice.length === 0 ? (
                <p className="text-center text-[#90A4AE] mt-10">No files or voice notes yet</p>
              ) : (
                <div className="bg-white rounded-2xl overflow-hidden border border-[#E3F2FD]">
                  {filesAndVoice.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F0F6FF] last:border-0">
                      <span className="w-10 h-10 rounded-xl bg-[#E3F2FD] text-[#1565C0] flex items-center justify-center shrink-0">
                        {m.type === 'VOICE' ? <IconMic className="w-5 h-5" /> : <IconFile className="w-5 h-5" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0D2137] truncate">
                          {m.type === 'VOICE' ? 'Voice note' : fileNameFromUrl(m.content)}
                        </p>
                        <p className="text-xs text-[#90A4AE]">{m.senderName} · {formatDate(m.createdAt)}</p>
                      </div>
                      <a
                        href={m.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#1565C0] shrink-0"
                      >
                        Open
                      </a>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* LINKS TAB */}
            {tab === 'links' && (
              (data.links || []).length === 0 ? (
                <p className="text-center text-[#90A4AE] mt-10">No links shared yet</p>
              ) : (
                <div className="bg-white rounded-2xl overflow-hidden border border-[#E3F2FD]">
                  {data.links.map((l, i) => (
                    <a
                      key={l.messageId + '-' + i}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F0F6FF] last:border-0 hover:bg-[#F8FAFF]"
                    >
                      <span className="w-10 h-10 rounded-xl bg-[#E3F2FD] text-[#1565C0] flex items-center justify-center shrink-0">
                        <IconLink className="w-5 h-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1565C0] truncate">{l.url}</p>
                        <p className="text-xs text-[#90A4AE]">{l.senderName} · {formatDate(l.createdAt)}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}