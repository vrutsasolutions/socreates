import { useEffect, useRef, useState } from 'react';
import logo from '../../assets/socreate-wordmark.png';
import '../../styles/splash.css';

const BRAND = 'SoCreate';
const TAGLINE = 'Where ideas come to life';

// Total time the splash stays before it begins its fade-out.
const HOLD_MS = 2600;
const LEAVE_MS = 500;

// Keyword pills sitting on the outer orbit ring (top / right / bottom / left).
const PILLS = [
  { label: '💡 Ideas', pos: 'top' },
  { label: '🤝 Connect', pos: 'right' },
  { label: '🚀 Create', pos: 'bottom' },
  { label: '✨ Inspire', pos: 'left' },
];

export default function SplashScreen({ onFinish }) {
  const [leaving, setLeaving] = useState(false);
  const finishedRef = useRef(false);
  const canvasRef = useRef(null);

  // ── Exit timing ─────────────────────────────────────────────────────────
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const hold = reduce ? 900 : HOLD_MS;

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinish?.();
    };

    const leaveTimer = setTimeout(() => setLeaving(true), hold);
    const doneTimer = setTimeout(finish, hold + LEAVE_MS);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  // ── Particle field (uniform grid of drifting, twinkling stars) ───────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = window.innerWidth;
    let H = window.innerHeight;

    const sizeCanvas = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();

    // One particle per grid cell with a random in-cell offset → even spread.
    const COLS = 7;
    const ROWS = 14;
    const build = () => {
      const cellW = W / COLS;
      const cellH = H / ROWS;
      const list = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          list.push({
            x: c * cellW + Math.random() * cellW,
            y: r * cellH + Math.random() * cellH,
            r: Math.random() * 1.6 + 0.6,
            amber: Math.random() < 0.18,
            speed: Math.random() * 0.24 + 0.05,
            base: Math.random() * 0.4 + 0.16,
            tw: Math.random() * Math.PI * 2,
            tws: Math.random() * 0.04 + 0.01,
          });
        }
      }
      return list;
    };
    let particles = build();

    let raf;
    let t = 0;
    const draw = (move) => {
      ctx.clearRect(0, 0, W, H);
      t += 1;
      for (const p of particles) {
        if (move) {
          p.y -= p.speed;
          if (p.y < -3) {
            p.y = H + 3;
            p.x = Math.random() * W;
          }
        }
        const a = p.base * (0.5 + 0.5 * Math.sin(t * p.tws + p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.amber
          ? `rgba(251,191,36,${a})`
          : `rgba(225,236,255,${a})`;
        ctx.fill();
      }
      if (move) raf = requestAnimationFrame(() => draw(true));
    };

    if (reduce) {
      draw(false); // static field, no motion
    } else {
      raf = requestAnimationFrame(() => draw(true));
    }

    const onResize = () => {
      sizeCanvas();
      particles = build();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div
      className={`splash-root${leaving ? ' is-leaving' : ''}`}
      role="img"
      aria-label={`${BRAND} — ${TAGLINE}`}
    >
      {/* Drifting star field */}
      <canvas ref={canvasRef} className="splash-canvas" />

      {/* Large soft background circles */}
      <div className="splash-bigcircle splash-bigcircle-tl" />
      <div className="splash-bigcircle splash-bigcircle-br" />

      {/* Orbit system */}
      <div className="splash-system">
        <div className="splash-ring splash-ring-outer">
          {PILLS.map((p) => (
            <div key={p.label} className={`splash-pill splash-pill-${p.pos}`}>
              <span>{p.label}</span>
            </div>
          ))}
        </div>
        <div className="splash-ring splash-ring-mid" />
        <div className="splash-disc" />

        {/* Amber sparks */}
        <span className="splash-spark splash-spark-1" />
        <span className="splash-spark splash-spark-2" />

        {/* Centre wordmark */}
        <div className="splash-logo2">
          <img src={logo} alt="" draggable="false" />
        </div>
      </div>

      <p className="splash-tagline2" aria-hidden="true">{TAGLINE}</p>

      {/* Loading bar */}
      <div className="splash-loadbar" aria-hidden="true">
        <div className="splash-loadbar-fill" />
      </div>

      <p className="splash-version" aria-hidden="true">v1.0.0</p>
    </div>
  );
}
