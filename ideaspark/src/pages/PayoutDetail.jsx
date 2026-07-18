import { useNavigate, useLocation } from 'react-router-dom';
import { useRef, useState } from 'react';
import scWordmark from '../assets/sc-wordmark.png';

/**
 * Single-payout receipt view. Opened by tapping a row in the Creator
 * Dashboard's Earnings history table — the row object is passed via
 * router state (`navigate('/payout-detail', { state: { row } })`), there
 * is no dedicated GET-by-id endpoint yet.
 *
 * <h3>Redesign notes (v2)</h3>
 * - Header replaced with an on-brand receipt card (SoCreate logo + wordmark)
 *   so the downloaded PDF is instantly identifiable as an official document.
 * - Amount details expanded with Period + Score so the receipt is a
 *   self-contained proof of a single month's payout.
 * - Timeline no longer renders an empty "—" under Initiated; it always falls
 *   back to scheduledFor and only shows a dash if neither exists.
 * - "View invoice" removed (was a duplicate of Download receipt).
 * - Download now uses html2canvas + jsPDF to snapshot the receipt card at
 *   2x scale, so colours, gradients and rounded corners are preserved in the
 *   PDF (window.print stripped background colours on most browsers).
 *
 * <h3>Fields not yet in CreatorEarningDTO</h3>
 * Same as before — `payoutId`, `initiatedAt`, and `platformFeeRupees` are
 * still not on the DTO. This page degrades gracefully. See the bottom of
 * the file for the exact additions that would light these up for real.
 */
export default function PayoutDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const row = location.state?.row;
  const receiptRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  if (!row) {
    return (
      <div className="min-h-screen bg-[#F4F7FF] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#F0F6FF] flex items-center justify-center mb-3">
          <svg className="w-7 h-7 text-[#90A4AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M4 6h16v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
          </svg>
        </div>
        <h2 className="text-[#0D2137] font-bold text-base mb-1">No payout to show</h2>
        <p className="text-[#90A4AE] text-sm mb-5">This receipt link has expired or wasn't opened from the Earnings history table.</p>
        <button onClick={() => navigate('/creator-dashboard')}
          className="bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold rounded-xl px-6 py-3 active:scale-95 transition-all">
          Back to dashboard
        </button>
      </div>
    );
  }

  const status = String(row.status || '').toLowerCase();
  const badge = STATUS_BADGE[status] ?? { label: row.status || '—', className: 'bg-[#F0F6FF] text-[#546E7A]' };

  const gross = Number(row.earning ?? 0);
  const fee = Number(row.platformFeeRupees ?? 0);
  const net = gross - fee;

  const initiatedLabel = fmtShortDate(row.initiatedAt ?? row.scheduledFor);
  const depositedLabel = row.status === 'Paid' ? fmtShortDate(row.paidAt) : null;

  const { line1: sentToLine1, line2: sentToLine2 } = parseDestination(row.destination);

  const receiptNumber = row.payoutId
    ? row.payoutId
    : `SC-${(row.month || '').replace(/\s/g, '').toUpperCase()}-${String(gross).padStart(4, '0')}`;

  /**
   * Downloads the receipt card as a colour-accurate PDF. Uses html2canvas at
   * 2x scale to preserve gradients, rounded corners and background fills that
   * window.print() drops on Chrome/Android. Falls back to print if the libs
   * fail to load (offline / older bundlers).
   */
  const handleDownloadReceipt = async () => {
    if (!receiptRef.current || downloading) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      });

      // Adaptive page size: match the receipt's aspect ratio so the whole
      // thing fits on one page with no cropping and no wasted whitespace.
      // Width is fixed at a comfortable A4-ish width (210mm) and height is
      // derived from the canvas ratio, plus symmetric margins.
      const margin = 10;
      const pageWidth = 210; // mm
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = imgHeight + margin * 2;

      const pdf = new jsPDF({
        unit: 'mm',
        format: [pageWidth, pageHeight],
        orientation: pageHeight >= pageWidth ? 'portrait' : 'landscape',
      });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgWidth, imgHeight);
      pdf.save(`SoCreate-Payout-${receiptNumber}.pdf`);
    } catch (err) {
      console.error('Receipt download failed, falling back to print:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-10">
      {/* App-wide blue header (NOT part of the receipt snapshot) */}
      <header className="bg-[#1565C0] rounded-b-[20px] px-4 pt-3 pb-4 shadow-md">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate(-1)} aria-label="Go back"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-base">Payout receipt</h1>
        </div>
      </header>

      {/* Everything inside receiptRef is captured to the PDF */}
      <div className="px-4 pt-6 max-w-md mx-auto">
        <div
          ref={receiptRef}
          className="bg-white rounded-xl overflow-hidden shadow-lg border border-[#E3F2FD]"
          style={{ colorScheme: 'light' }}
        >
          {/* Branded header */}
          <div
            className="px-6 pt-6 pb-8 relative"
            style={{
              background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <img
                src={scWordmark}
                alt="SoCreate"
                crossOrigin="anonymous"
                className="h-7 w-auto object-contain"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shrink-0 ${badge.className}`}>
                {badge.label}
              </span>
            </div>

            <div className="mt-6">
              <div className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Net payout</div>
              <div className="text-white text-4xl font-bold mt-1 tracking-tight">
                ₹{net.toLocaleString('en-IN')}
              </div>
              <div className="text-white/70 text-xs mt-1.5">
                {row.month ? `For ${row.month}` : fmtShortDate(row.paidAt ?? row.scheduledFor)}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pt-6 pb-6 space-y-5">
            {/* Timeline */}
            <div className="bg-[#F8FAFF] rounded-2xl p-4 border border-[#EEF3FB]">
              <div className="flex items-center">
                <TimelineDot done={true} />
                <div className={`flex-1 h-[2px] mx-1 ${depositedLabel ? 'bg-[#22C55E]' : 'bg-[#CBD5E1]'}`} />
                <TimelineDot done={!!depositedLabel} failed={status === 'failed'} />
              </div>
              <div className="flex items-start justify-between mt-2.5">
                <div>
                  <div className="text-[#0D2137] text-xs font-semibold">Initiated</div>
                  <div className="text-[#90A4AE] text-[11px] mt-0.5">{initiatedLabel || 'Pending'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#0D2137] text-xs font-semibold">
                    {status === 'failed' ? 'Failed' : 'Deposited'}
                  </div>
                  <div className="text-[#90A4AE] text-[11px] mt-0.5">{depositedLabel || (status === 'failed' ? '—' : 'Pending')}</div>
                </div>
              </div>
            </div>

            {/* Amount details */}
            <div>
              <h2 className="text-[#90A4AE] text-[10px] font-bold uppercase tracking-wider mb-2.5">Amount details</h2>
              <div className="space-y-2.5 text-sm">
                {row.month && (
                  <Row label="Period" value={row.month} />
                )}
                {row.score != null && (
                  <Row label="Creator score" value={Number(row.score).toLocaleString('en-IN')} />
                )}
                <Row label="Gross earnings" value={`₹${gross.toLocaleString('en-IN')}`} />
                {fee > 0 && (
                  <Row label="Platform fee" value={`−₹${fee.toLocaleString('en-IN')}`} valueClass="text-[#DC2626]" />
                )}
                <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-dashed border-[#E3F2FD]">
                  <span className="text-[#0D2137] font-semibold">Net payout</span>
                  <span className="text-[#0D2137] font-bold text-base">₹{net.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Sent to */}
            {row.destination && (
              <div>
                <h2 className="text-[#90A4AE] text-[10px] font-bold uppercase tracking-wider mb-2.5">Sent to</h2>
                <div className="flex items-center gap-3 bg-[#F8FAFF] rounded-xl p-3 border border-[#EEF3FB]">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 border border-[#E3F2FD]">
                    <svg className="w-5 h-5 text-[#1565C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M4 10h16M6 10v11M10 10v11M14 10v11M18 10v11M12 3l9 5H3l9-5z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[#0D2137] text-sm font-semibold">{sentToLine1}</div>
                    {sentToLine2 && (
                      <div className="text-[#90A4AE] text-xs mt-0.5 font-mono">{sentToLine2}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {status === 'failed' && row.failureReason && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 text-[#B91C1C] text-xs">
                <span className="font-semibold">Payout failed: </span>{row.failureReason}
              </div>
            )}

            {/* Reference footer inside receipt */}
            <div className="pt-4 border-t border-[#F0F2F8] flex items-center justify-between text-[10px]">
              <div>
                <div className="text-[#90A4AE] font-semibold uppercase tracking-wider">Reference</div>
                <div className="text-[#0D2137] font-mono mt-0.5 break-all">{receiptNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-[#90A4AE] font-semibold uppercase tracking-wider">Generated</div>
                <div className="text-[#0D2137] mt-0.5">{fmtShortDate(new Date().toISOString())}</div>
              </div>
            </div>

            <div className="text-center text-[10px] text-[#90A4AE] pt-1">
              This is a system-generated receipt from <span className="font-semibold text-[#1565C0]">socreate.in</span>
            </div>
          </div>
        </div>

        {/* Action (outside the snapshot) */}
        <div className="pt-4">
          <button
            onClick={handleDownloadReceipt}
            disabled={downloading}
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] active:scale-95 text-white font-bold rounded-xl py-3.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Preparing PDF…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
                Download receipt
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────── */
const STATUS_BADGE = {
  paid:          { label: 'Deposited',  className: 'bg-[#DCFCE7] text-[#15803D]' },
  processing:    { label: 'Processing', className: 'bg-[#DBEAFE] text-[#1D4ED8]' },
  scheduled:     { label: 'Scheduled',  className: 'bg-[#FEF3C7] text-[#B45309]' },
  failed:        { label: 'Failed',     className: 'bg-[#FEE2E2] text-[#B91C1C]' },
  rolled_over:   { label: 'Rolled over',className: 'bg-[#EDE9FE] text-[#6D28D9]' },
};

function Row({ label, value, valueClass = 'text-[#0D2137] font-medium' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#546E7A]">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function fmtShortDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function TimelineDot({ done, failed }) {
  const color = failed ? '#DC2626' : done ? '#22C55E' : '#CBD5E1';
  return (
    <span
      className="w-3 h-3 rounded-full border-2 shrink-0"
      style={{
        backgroundColor: done ? color : '#FFFFFF',
        borderColor: color,
      }}
    />
  );
}

/**
 * Splits a `destination` string like "ICICI Bank XXXXXXXX4589" into a bank
 * name line + a spaced-out masked account line ("XXXX XXXX 4589").
 */
function parseDestination(destination) {
  if (!destination) return { line1: '—', line2: null };
  const match = destination.match(/^(.*)\s([A-Z0-9]+)$/);
  if (!match) return { line1: destination, line2: null };
  const [, bankName, masked] = match;
  const grouped = masked.replace(/(.{4})/g, '$1 ').trim();
  return { line1: bankName, line2: `A/C ${grouped}` };
}

/*
 * ── Backend follow-up (flag for Vishakha) ──────────────────────────────
 * To fully match the receipt design, CreatorEarningDTO would need:
 *   - `payoutId`         (razorpayPayoutId — already on entity, expose in DTO)
 *   - `initiatedAt`      (lastAttemptAt, distinct from scheduledFor)
 *   - `platformFeeRupees` (only if a per-payout fee is ever introduced;
 *                          today the creator's earning IS their net share)
 * Until then this page uses scheduledFor as a stand-in for "Initiated",
 * hides the fee row entirely (Gross === Net), and synthesises a reference
 * number of the form "SC-{MONTH}-{AMOUNT}" when payoutId is missing.
 */
