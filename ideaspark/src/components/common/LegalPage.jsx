import { useNavigate } from 'react-router-dom';

/**
 * Shared layout for static legal documents (Terms of Service, Privacy Policy).
 * Renders the standard blue app header + a list of titled sections, each with
 * an optional intro paragraph and/or bullet points, divided by thin rules —
 * matching the figma legal-page export.
 *
 * @param {string}  title        Header title (e.g. "Terms of Service")
 * @param {string}  lastUpdated  Display date (e.g. "June 29, 2026")
 * @param {Array<{ heading: string, paragraph?: string, bullets?: string[] }>} sections
 */
export default function LegalPage({ title, lastUpdated, sections = [] }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pb-16">
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 py-4 flex items-center gap-3 relative overflow-hidden shadow-lg">
        <div className="pointer-events-none absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
        <div className="pointer-events-none absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all relative z-10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white font-bold text-lg relative z-10">{title}</h1>
      </header>

      <div className="max-w-2xl mx-auto px-5 pt-5">
        <p className="text-[#90A4AE] text-sm">Last updated {lastUpdated}</p>

        <div className="mt-2">
          {sections.map((s, i) => (
            <section key={i} className="border-t border-[#E5E7EB] py-5">
              <h2 className="text-[#0D2137] text-[17px] font-semibold mb-2.5">{s.heading}</h2>

              {s.paragraph && (
                <p className="text-[#546E7A] text-sm leading-relaxed">{s.paragraph}</p>
              )}

              {s.bullets && (
                <ul className="space-y-1.5">
                  {s.bullets.map((b, j) => (
                    <li key={j} className="text-[#546E7A] text-sm leading-relaxed flex gap-2">
                      <span className="text-[#90A4AE] shrink-0">-</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
