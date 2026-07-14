// ════════════════════════════════════════════════════════════════════════
//  ProfileShareButton
//  Share icon for a user profile (own or someone else's). On mobile,
//  prefers the OS-native share sheet (navigator.share) — this already
//  includes WhatsApp as one of the apps the OS offers, plus every other
//  app the user has installed, for free. Falls back to an explicit
//  WhatsApp + Copy link popover on browsers without navigator.share
//  (mainly desktop).
// ════════════════════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from "react";

export default function ProfileShareButton({ userId, name }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef(null);

  const shareUrl = `${window.location.origin}/users/${userId}`;
  const shareText = name
    ? `👤 Check out ${name}'s profile on SoCreate!`
    : "👤 Check out this profile on SoCreate!";

  // Close the fallback popover on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleClick = async () => {
    // Native share sheet (mobile Chrome/Safari) already lists WhatsApp
    // alongside every other installed app — no need to special-case it.
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled the native sheet — not an error, do nothing.
      }
      return;
    }
    // Desktop / unsupported browsers: show the explicit fallback popover.
    setOpen((o) => !o);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={handleClick}
        aria-label="Share profile"
        className="w-9 h-9 flex items-center justify-center text-white active:scale-90 transition-transform"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle
            cx="18"
            cy="5"
            r="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="6"
            cy="12"
            r="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="18"
            cy="19"
            r="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="8.59"
            y1="13.51"
            x2="15.42"
            y2="17.49"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="15.41"
            y1="6.51"
            x2="8.59"
            y2="10.49"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl ring-1 ring-black/5 z-50 overflow-hidden">
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] font-semibold text-[#128C4A] hover:bg-[#F0FBF5] transition-colors"
          >
            <svg
              className="w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.09c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.12.11-1.8-.11-.42-.13-.95-.3-1.64-.6-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.17-1.55-1.17-2.96 0-1.4.73-2.09 1-2.38.24-.26.55-.32.73-.32.19 0 .37 0 .53.01.17.01.4-.06.62.48.24.58.8 2 .87 2.15.07.14.11.31.02.5-.1.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.18 1.53 1.91 1.06.94 1.94 1.24 2.22 1.38.28.14.44.11.6-.07.17-.19.71-.83.9-1.11.19-.28.38-.24.63-.14.26.09 1.65.78 1.94.92.28.14.47.21.53.33.07.13.07.71-.17 1.4z" />
            </svg>
            WhatsApp
          </button>

          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] font-semibold text-[#1565C0] hover:bg-[#F4F7FF] transition-colors border-t border-[#F0F6FF]"
          >
            {copied ? (
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5"
                />
              </svg>
            )}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
