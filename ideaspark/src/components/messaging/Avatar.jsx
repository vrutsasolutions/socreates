// ════════════════════════════════════════════════════════════════════════
//  Avatar — colored circle with an initial, optional online dot / story ring.
//  Mirrors the figma "Messaging System UI" avatars (inbox, chat, requests).
// ════════════════════════════════════════════════════════════════════════
export default function Avatar({
  initial = '?',
  color = '#1565C0',
  size = 48,
  online = false,
  ring = false,           // story-style gradient ring (ACTIVE NOW rail)
  className = '',
}) {
  const dot = Math.max(10, Math.round(size * 0.25));
  const inner = (
    <div
      className={`flex items-center justify-center rounded-full text-white font-bold select-none ${className}`}
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );

  return (
    <div className="relative inline-block" style={{ width: ring ? size + 8 : size, height: ring ? size + 8 : size }}>
      {ring ? (
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: size + 8,
            height: size + 8,
            padding: 3,
            background: 'linear-gradient(135deg, #1565C0, #42A5F5)',
          }}
        >
          <div className="rounded-full p-[2px] bg-[#F4F7FF]">{inner}</div>
        </div>
      ) : (
        inner
      )}
      {online && (
        <span
          className="absolute rounded-full bg-[#2ECC70] ring-2 ring-white"
          style={{ width: dot, height: dot, right: ring ? 2 : 0, bottom: ring ? 2 : 0 }}
        />
      )}
    </div>
  );
}
