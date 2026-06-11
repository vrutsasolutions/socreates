// Avatar — gradient fills, story ring, online dot.
// Mirrors the Socreates design system; replaces the flat-colored version.

const GRADIENTS = [
  'linear-gradient(135deg,#1976D2,#42A5F5)',   // blue
  'linear-gradient(135deg,#7B1FA2,#CE93D8)',   // purple
  'linear-gradient(135deg,#00695C,#4DB6AC)',   // teal
  'linear-gradient(135deg,#C62828,#EF9A9A)',   // coral
  'linear-gradient(135deg,#E65100,#FFCC02)',   // amber
  'linear-gradient(135deg,#1565C0,#64B5F6)',   // ocean
];

// Deterministic gradient from name/color string so the same user always gets the same ramp.
function gradientFor(seed = '') {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

export default function Avatar({
  initial = '?',
  color   = '#1565C0',   // kept for API compat; used as gradient seed
  size    = 48,
  online  = false,
  ring    = false,       // story-style gradient ring (ACTIVE NOW rail)
  className = '',
}) {
  const gradient = gradientFor(color + initial);
  const fontSize = Math.round(size * 0.42);
  const dotSize  = Math.max(10, Math.round(size * 0.26));
  const dotOff   = ring ? Math.round(size * 0.04) + 4 : Math.round(size * 0.02);

  const circle = (
    <div
      className={`flex items-center justify-center rounded-full text-white font-bold select-none tracking-wide ${className}`}
      style={{ width: size, height: size, background: gradient, fontSize }}
    >
      {initial}
    </div>
  );

  return (
    <div
      className="relative inline-block"
      style={{ width: ring ? size + 8 : size, height: ring ? size + 8 : size }}
    >
      {ring ? (
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: size + 8,
            height: size + 8,
            padding: 3,
            background: 'linear-gradient(135deg,#1565C0,#42A5F5)',
          }}
        >
          <div className="rounded-full bg-[#F4F7FF]" style={{ padding: 1.5 }}>
            {circle}
          </div>
        </div>
      ) : circle}

      {online && (
        <span
          className="absolute rounded-full bg-[#22C55E] ring-2 ring-white"
          style={{ width: dotSize, height: dotSize, right: dotOff, bottom: dotOff }}
        />
      )}
    </div>
  );
}