import { useEffect, useRef, useState } from 'react';
import logo from '../../assets/socreates-logo.png';
import '../../styles/splash.css';

// Brand wordmark shown beneath the logo. Kept consistent with the rest of the
// app (Welcome, <title>) rather than the mockup's shortened "SoCreate".
const BRAND = 'SoCreates';
const TAGLINE = 'Where ideas come to life';

// Total time the splash stays before it begins its fade-out. The animation
// timeline lands by ~2.5s; we hold a touch longer, then leave.
const HOLD_MS = 2600;
const LEAVE_MS = 500;

// A scattered, deterministic set of faint background particles (top%, left%, size).
const PARTICLES = [
  [12, 18, 3], [9, 78, 2], [22, 40, 2], [31, 88, 3], [44, 12, 2],
  [54, 64, 3], [61, 30, 2], [68, 84, 2], [74, 50, 3], [82, 20, 2],
  [88, 72, 3], [38, 70, 2], [17, 58, 2], [92, 44, 2],
];

export default function SplashScreen({ onFinish }) {
  const [leaving, setLeaving] = useState(false);
  const finishedRef = useRef(false);

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

  return (
    <div
      className={`splash-root${leaving ? ' is-leaving' : ''}`}
      role="img"
      aria-label={`${BRAND} — ${TAGLINE}`}
    >
      {/* Particles */}
      {PARTICLES.map(([top, left, size], i) => (
        <span
          key={i}
          className="splash-particle"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            width: size,
            height: size,
            animationDelay: `${(i % 7) * 0.28}s`,
          }}
        />
      ))}

      {/* Centre stage */}
      <div className="splash-stage">
        <div className="splash-flash" />
        <div className="splash-halo splash-halo-1" />
        <div className="splash-halo splash-halo-2" />
        <div className="splash-halo splash-halo-3" />

        {/* Orbit ring + glowing dots */}
        <div className="splash-orbit">
          <div className="splash-orbit-dashed" />
          <div className="splash-orbit-ring" />
          <span className="splash-orbit-dot d1" />
          <span className="splash-orbit-dot d2" />
          <span className="splash-orbit-dot d3" />
          <span className="splash-orbit-dot d4" />
        </div>

        {/* Logo */}
        <div className="splash-logo-wrap">
          <div className="splash-logo-ring" />
          <div className="splash-logo-core">
            <img className="splash-logo-img" src={logo} alt="" draggable="false" />
            <div className="splash-shine" />
            <div className="splash-shine s2" />
          </div>
        </div>
      </div>

      {/* Wordmark — letter-by-letter */}
      <h1 className="splash-name" aria-hidden="true">
        {BRAND.split('').map((ch, i) => (
          <span key={i} style={{ animationDelay: `${0.64 + i * 0.045}s` }}>
            {ch}
          </span>
        ))}
      </h1>

      <p className="splash-tagline" aria-hidden="true">{TAGLINE}</p>

      {/* Loading dots */}
      <div className="splash-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
