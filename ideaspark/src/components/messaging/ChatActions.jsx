// ════════════════════════════════════════════════════════════════════════
//  ChatActions — overlays for the chat action menu & safety flows.
//  Faithful to the figma frames:
//    • UserActionMenu    → "Chat - User Action Menu"
//    • DeleteChatConfirm → "Delete Chat Confirm"
//    • BlockUserConfirm  → "Block User Confirm"
//    • ReportUserSheet   → "Report User"
//  Shared by Chat.jsx and ChatProfile.jsx.
// ════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import Avatar from "./Avatar";
import {
  deleteConversation,
  blockUser,
  reportUser,
} from "../../api/messagingApi";

const SHEET_CSS = `
  @keyframes scSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes scFadeIn  { from { opacity: 0; } to { opacity: 1; } }
  .sc-sheet { animation: scSheetUp 260ms cubic-bezier(0.32,0.72,0,1); }
  .sc-pop   { animation: scFadeIn 160ms ease, scSheetUp 0ms; }
  .sc-backdrop { animation: scFadeIn 160ms ease; }
`;

export const handleFor = (name = "") =>
  "@" + name.replace(/\./g, "").trim().replace(/\s+/g, ".").toLowerCase();

/* ── Icons ──────────────────────────────────────────────────────────────── */
const IconProfile = (p) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    {...p}
  >
    <circle cx="12" cy="8" r="3.5" />
    <path strokeLinecap="round" d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
  </svg>
);
const IconReport = (p) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    {...p}
  >
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M12 7.5v5M12 16h.01" />
  </svg>
);
const IconBlock = (p) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    {...p}
  >
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M5.6 5.6l12.8 12.8" />
  </svg>
);
const IconTrash = (p) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    {...p}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"
    />
  </svg>
);
const Chevron = ({ className = "" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
  </svg>
);

function Backdrop({ onClick }) {
  return (
    <div
      className="sc-backdrop absolute inset-0 bg-[#0D2137]/45"
      onClick={onClick}
    />
  );
}
function Handle() {
  return (
    <div className="w-10 h-1 rounded-full bg-[#DBEAFE] mx-auto mt-3 mb-3" />
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Chat · User Action Menu
   ════════════════════════════════════════════════════════════════════════ */
export function UserActionMenu({
  convo,
  onClose,
  onViewProfile,
  onReport,
  onBlock,
  onDelete,
}) {
  const rows = [
    {
      key: "profile",
      title: "View Profile",
      subtitle: "See full profile, posts and ideas",
      Icon: IconProfile,
      tint: "#EAF2FF",
      color: "#1565C0",
      danger: false,
      onClick: onViewProfile,
    },
    {
      key: "report",
      title: "Report User",
      subtitle: "Report inappropriate behavior",
      Icon: IconReport,
      tint: "#FEE2E2",
      color: "#EF4444",
      danger: false,
      onClick: onReport,
    },
    {
      key: "block",
      title: "Block User",
      subtitle: "They cannot message or find you",
      Icon: IconBlock,
      tint: "#FEE2E2",
      color: "#EF4444",
      danger: false,
      onClick: onBlock,
    },
    {
      key: "delete",
      title: "Delete Chat",
      subtitle: "Permanently delete all messages",
      Icon: IconTrash,
      tint: "#FEE2E2",
      color: "#EF4444",
      danger: true,
      onClick: onDelete,
    },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <style>{SHEET_CSS}</style>
      <Backdrop onClick={onClose} />
      <div className="sc-sheet relative w-full max-w-[430px] bg-white rounded-t-3xl pb-5">
        <Handle />
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pb-3">
          <Avatar initial={convo.initial} color={convo.avatarColor} src={convo.profileImage} size={48} />
          <div className="min-w-0">
            <p className="text-[17px] font-bold text-[#0D2137] truncate">
              {convo.name}
              {convo.isSelf && <span className="font-normal"> (You)</span>}
            </p>
            <p className="text-[13px] text-[#90A4AE] truncate">
              {handleFor(convo.name)} · {convo.online ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        <div className="border-t border-[#F0F6FF]" />
        {/* Rows */}
        {rows.map((r) => (
          <button
            key={r.key}
            onClick={r.onClick}
            className="w-full flex items-center gap-4 px-5 py-3.5 text-left border-b border-[#F0F6FF] hover:bg-[#F8FAFF] transition-colors"
          >
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: r.tint, color: r.color }}
            >
              <r.Icon className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span
                className="block text-[15px] font-semibold"
                style={{ color: r.danger ? "#EF4444" : "#0D2137" }}
              >
                {r.title}
              </span>
              <span className="block text-[12px] text-[#90A4AE]">
                {r.subtitle}
              </span>
            </span>
            <Chevron className="w-4 h-4 shrink-0" />
          </button>
        ))}
        {/* Cancel */}
        <div className="px-5 pt-3">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-full bg-[#F0F6FF] text-[#90A4AE] font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Delete Chat Confirm  (centered dialog, red top accent)
   ════════════════════════════════════════════════════════════════════════ */
export function DeleteChatConfirm({ convo, onCancel, onConfirm }) {
  const [also, setAlso] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <style>{SHEET_CSS}</style>
      <Backdrop onClick={onCancel} />
      <div className="sc-backdrop relative w-full max-w-[340px] bg-white rounded-3xl overflow-hidden">
        <div className="h-1.5 bg-[#EF4444]" />
        <div className="p-6 flex flex-col items-center text-center">
          <span className="w-14 h-14 rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#EF4444]">
            <IconTrash className="w-6 h-6" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-[#0D2137]">
            Delete Chat?
          </h2>
          <p className="mt-2 text-[13px] text-[#90A4AE] leading-relaxed">
            This will permanently delete all messages with {convo.name}. This
            cannot be undone.
          </p>
          <button
            onClick={() => setAlso((v) => !v)}
            className="mt-4 flex items-center gap-2 self-start"
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${also ? "bg-[#1565C0] border-[#1565C0]" : "border-[#BBDEFB]"}`}
            >
              {also && (
                <svg
                  className="w-3 h-3 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </span>
            <span className="text-[13px] text-[#546E7A]">
              Also delete for {convo.name}
            </span>
          </button>
          <div className="w-full border-t border-[#F0F6FF] mt-4" />
          <div className="mt-4 w-full flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-12 rounded-full bg-[#EAF2FF] text-[#546E7A] font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(also)}
              className="flex-1 h-12 rounded-full bg-[#EF4444] text-white font-semibold"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Block User Confirm  (bottom sheet)
   ════════════════════════════════════════════════════════════════════════ */
export function BlockUserConfirm({ convo, onCancel, onConfirm }) {
  const bullets = [
    "Sending you messages",
    "Seeing your profile and posts",
    "Finding you in search",
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <style>{SHEET_CSS}</style>
      <Backdrop onClick={onCancel} />
      <div className="sc-sheet relative w-full max-w-[430px] bg-white rounded-t-3xl px-6 pb-7">
        <Handle />
        <div className="flex flex-col items-center">
          <span className="w-16 h-16 rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#EF4444]">
            <IconBlock className="w-7 h-7" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-[#0D2137]">
            Block {convo.name}?
          </h2>
        </div>
        <p className="mt-3 text-[13px] text-[#90A4AE]">
          Blocking will prevent them from:
        </p>
        <ul className="mt-2 space-y-2">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-center gap-2.5 text-sm text-[#546E7A]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#90A4AE]" />
              {b}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-[#90A4AE]">
          You can unblock anytime from Settings.
        </p>
        <button
          onClick={onConfirm}
          className="mt-5 w-full h-13 py-3.5 rounded-full bg-[#EF4444] text-white font-semibold"
        >
          Block User
        </button>
        <button
          onClick={onCancel}
          className="mt-3 w-full h-12 rounded-full bg-[#F0F6FF] text-[#90A4AE] font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Report User  (bottom sheet with reason list)
   ════════════════════════════════════════════════════════════════════════ */
const REPORT_REASONS = [
  {
    key: "spam",
    title: "Spam or fake account",
    subtitle: "Sending unsolicited messages",
  },
  {
    key: "harass",
    title: "Harassment or bullying",
    subtitle: "Threatening or abusive behavior",
  },
  {
    key: "content",
    title: "Inappropriate content",
    subtitle: "Offensive or adult content",
  },
  {
    key: "scam",
    title: "Scam or fraud",
    subtitle: "Trying to deceive or steal",
  },
  {
    key: "ip",
    title: "Intellectual property",
    subtitle: "Copyright or trademark issue",
  },
  {
    key: "other",
    title: "Something else",
    subtitle: "Other reason not listed",
  },
];

export function ReportUserSheet({ convo, onClose, onSubmit }) {
  const [selected, setSelected] = useState(REPORT_REASONS[0].key);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <style>{SHEET_CSS}</style>
      <Backdrop onClick={onClose} />
      <div className="sc-sheet relative w-full max-w-[430px] bg-white rounded-t-3xl pb-6 max-h-[88vh] flex flex-col">
        <Handle />
        <div className="px-5 pb-2">
          <h2 className="text-lg font-bold text-[#0D2137]">
            Report {convo.name}
          </h2>
          <p className="text-[13px] text-[#90A4AE]">
            Why are you reporting this account?
          </p>
        </div>
        <div className="overflow-y-auto">
          {REPORT_REASONS.map((r) => {
            const on = selected === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setSelected(r.key)}
                className={`w-full flex items-start gap-3 px-5 py-3.5 text-left border-b border-[#F0F6FF] ${on ? "bg-[#F0F6FF]" : ""}`}
              >
                <span
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 ${on ? "border-[#1565C0]" : "border-[#BBDEFB]"}`}
                >
                  {on && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1565C0]" />
                  )}
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-[#0D2137]">
                    {r.title}
                  </span>
                  <span className="block text-[12px] text-[#90A4AE]">
                    {r.subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="px-5 pt-4">
          <button
            onClick={() => onSubmit(selected)}
            className="w-full h-13 py-3.5 rounded-full bg-[#1565C0] text-white font-semibold hover:bg-[#0D47A1] transition-colors"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Share & Attach  (bottom sheet — figma chat attachment menu)
   ════════════════════════════════════════════════════════════════════════ */
const ATTACH_ICON = {
  camera: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 4l1.5 2H20a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h4l1.5-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  ),
  gallery: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  files: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  ),
  idea: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0012 2z" />
    </svg>
  ),
  profile: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
};

const ATTACH_ITEMS = [
  {
    key: "camera",
    tint: "#FEE2E2",
    color: "#EF4444",
    title: "Camera",
    subtitle: "Take a photo or video",
  },
  {
    key: "gallery",
    tint: "#E3F2FD",
    color: "#1565C0",
    title: "Photos & Videos",
    subtitle: "Choose from gallery",
  },
  {
    key: "files",
    tint: "#E6F4EA",
    color: "#2E7D32",
    title: "Files",
    subtitle: "Send any file",
  },
  {
    key: "profile",
    tint: "#EDE7F6",
    color: "#5E35B1",
    title: "Profile",
    subtitle: "Share someone's profile",
  },
];

export function ShareAttachSheet({ onClose, onPick }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <style>{SHEET_CSS}</style>
      <Backdrop onClick={onClose} />
      <div className="sc-sheet relative w-full max-w-[430px] bg-white rounded-t-3xl pb-6">
        <Handle />
        <h2 className="px-5 pb-2 text-lg font-bold text-[#0D2137]">
          Share &amp; Attach
        </h2>
        {ATTACH_ITEMS.map((it) => (
          <button
            key={it.key}
            onClick={() => onPick(it.key)}
            className="w-full flex items-center gap-4 px-5 py-3 text-left border-b border-[#F0F6FF] hover:bg-[#F8FAFF] transition-colors"
          >
            <span
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: it.tint, color: it.color }}
            >
              {ATTACH_ICON[it.key]}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-semibold text-[#0D2137]">
                {it.title}
              </span>
              <span className="block text-[12px] text-[#90A4AE]">
                {it.subtitle}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Share Profile  (full-screen sheet — figma "Share Profile")
   ════════════════════════════════════════════════════════════════════════ */
const SHARE_ACTIONS = [
  { key: "copy", letter: "C", label: "Copy Link" },
  { key: "dm", letter: "S", label: "Send DM" },
  { key: "more", letter: "M", label: "More" },
];

export function ShareProfileSheet({
  convo,
  onClose,
  onCopyLink,
  onSendDM,
  onToast,
}) {
  const act = (key) => {
    if (key === "copy") onCopyLink?.();
    else if (key === "dm") onSendDM?.();
    else onToast?.("Coming soon");
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F7FF] flex flex-col">
      <style>{SHEET_CSS}</style>

      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 border-b border-[#F0F6FF]">
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-9 h-9 flex items-center justify-center text-[#90A4AE] hover:text-[#546E7A] active:scale-90 transition-all"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 6l12 12M6 18L18 6"
            />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-[18px] font-bold text-[#0D2137]">
          Share Profile
        </h1>
        <span className="w-9" />
      </div>
      {/* Blue accent strip matching the app header colour */}
      <div className="h-1 bg-[#1565C0]" />

      {/* Profile card */}
      <div className="mx-4 mt-5 bg-white rounded-2xl border border-[#E3F2FD] shadow-sm p-6 flex flex-col items-center">
        <div className="relative">
          <Avatar
            initial={convo.initial}
            color={convo.avatarColor}
            src={convo.profileImage}
            size={80}
            online={convo.online}
          />
        </div>
        <h2 className="mt-4 text-[20px] font-bold text-[#0D2137]">
          {convo.name}
        </h2>
        <p className="text-[13px] text-[#90A4AE] mt-1">
          {handleFor(convo.name)} &nbsp;·&nbsp; {convo.followers ?? "2.4k"}{" "}
          followers
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex justify-center gap-8 mt-6 px-4">
        {[
          {
            key: "copy",
            label: "Copy Link",
            icon: (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            ),
          },
          {
            key: "dm",
            label: "Send DM",
            icon: (
              <svg
                className="w-9 h-9"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h8M12 8l4 4-4 4"
                />
              </svg>
            ),
          },
          {
            key: "more",
            label: "More",
            icon: (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path
                  strokeLinecap="round"
                  d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"
                />
              </svg>
            ),
          },
        ].map((a) => (
          <button
            key={a.key}
            onClick={() => act(a.key)}
            className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
          >
            <span className="w-14 h-14 rounded-full bg-[#E3F2FD] text-[#1565C0] flex items-center justify-center hover:bg-[#BBDEFB] transition-colors">
              {a.icon}
            </span>
            <span className="text-[12px] text-[#90A4AE] font-medium">
              {a.label}
            </span>
          </button>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-auto p-4">
        <button
          onClick={onSendDM}
          className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]"
        >
          Send via Message
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ChatActionsLayer — single controller that renders the right overlay and
   performs the API calls. Shared by Chat.jsx and ChatProfile.jsx.

   Props:
     convo          conversation object (needs id, name, initial, avatarColor, online)
     view           null | 'menu' | 'report' | 'block' | 'delete'
     setView        setter for `view`
     navigate       react-router navigate fn
     onAfterDelete  optional () => void  (default: go to /messages)
     onAfterBlock   optional () => void  (default: go to /messages)
     onToast        optional (msg) => void  (e.g. show a confirmation toast)
   ════════════════════════════════════════════════════════════════════════ */
export function ChatActionsLayer({
  convo,
  view,
  setView,
  navigate,
  onAfterDelete,
  onAfterBlock,
  onToast,
}) {
  if (!convo || !view) return null;

  const afterDelete = onAfterDelete || (() => navigate("/messages"));
  const afterBlock = onAfterBlock || (() => navigate("/messages"));

  return (
    <>
      {view === "delete" && (
        <DeleteChatConfirm
          convo={convo}
          onCancel={() => setView(null)}
          onConfirm={async (also) => {
            console.log("delete confirm clicked", convo.id, also);
            try {
              const res = await deleteConversation(convo.id, also);
              console.log("delete response", res);
            } catch (e) {
              console.error(
                "delete failed",
                e?.response?.status,
                e?.response?.data,
                e,
              );
            } finally {
              setView(null);
              afterDelete();
            }
          }}
        />
      )}
      {view === "report" && (
        <ReportUserSheet
          convo={convo}
          onClose={() => setView(null)}
          onSubmit={async (reason) => {
            try {
              await reportUser(convo.otherUserId, reason);
            } finally {
              setView(null);
              onToast?.("Report submitted. Thanks for keeping SoCreate safe.");
            }
          }}
        />
      )}
      {view === "block" && (
        <BlockUserConfirm
          convo={convo}
          onCancel={() => setView(null)}
          onConfirm={async () => {
            try {
              await blockUser(convo.otherUserId);
            } finally {
              setView(null);
              onToast?.(`${convo.name} has been blocked.`);
              afterBlock();
            }
          }}
        />
      )}
      {view === "delete" && (
        <DeleteChatConfirm
          convo={convo}
          onCancel={() => setView(null)}
          onConfirm={async (also) => {
            try {
              await deleteConversation(convo.id, also);
            } finally {
              setView(null);
              afterDelete();
            }
          }}
        />
      )}
    </>
  );
}