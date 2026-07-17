import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Single-payout receipt view. Opened by tapping a row in the Creator
 * Dashboard's Earnings history table — the row object is passed via
 * router state (`navigate('/payout-detail', { state: { row } })`), there
 * is no dedicated GET-by-id endpoint yet.
 *
 * <h3>Fields not yet in CreatorEarningDTO</h3>
 * The Figma reference shows a payout reference number, an "Initiated" date
 * distinct from "Deposited", and a Gross/Fee/Net breakdown. None of these
 * exist on the current backend contract (only `month, score, earning,
 * status, scheduledFor, paidAt, destination, failureReason, rolledFrom`).
 * This page degrades gracefully without them:
 *   - Ref line is omitted if no `payoutId` is present on the row.
 *   - "Initiated" falls back to `scheduledFor` (the date it was queued for
 *     payout) since that's the closest available proxy.
 *   - The fee row only renders if `row.platformFeeRupees` is provided —
 *     otherwise Gross and Net both just show `row.earning`.
 * See the note at the bottom of this file for the exact DTO additions
 * that would light these up for real.
 */
export default function PayoutDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const row = location.state?.row;

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

  const initiatedLabel = fmtShortDate(row.scheduledFor);
  const depositedLabel = row.status === 'Paid' ? fmtShortDate(row.paidAt) : null;

  const { line1: sentToLine1, line2: sentToLine2 } = parseDestination(row.destination);

  // Placeholder actions — no backend PDF/invoice generation endpoint exists
  // yet. Printing the visible receipt card is a reasonable stand-in until
  // Vishakha ships one; swap these for real downloads once that's ready.
  const handleDownloadReceipt = () => window.print();
  const handleViewInvoice = () => window.print();

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-10">
      {/* Header */}
      <header className="bg-[#1565C0] rounded-b-[28px] px-4 pt-4 pb-7 shadow-lg">
        <button onClick={() => navigate(-1)} aria-label="Go back"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all -ml-1 mb-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg leading-none">₹</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-white font-bold text-lg">Payout</h1>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </div>

        <p className="text-white/60 text-xs mt-2 ml-[52px]">
          {row.payoutId ? `Ref ${row.payoutId} · ` : ''}{fmtShortDate(row.paidAt ?? row.scheduledFor) || row.month}
        </p>

        <div className="text-white text-4xl font-bold mt-3 ml-[52px]">
          ₹{net.toLocaleString('en-IN')}
        </div>
      </header>

      <div className="px-4 pt-5 space-y-5 max-w-md mx-auto">
        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-[#E3F2FD] p-4 shadow-sm">
          <div className="flex items-center">
            <TimelineDot done={true} />
            <div className="flex-1 h-[2px] bg-[#22C55E]/40 mx-1" />
            <TimelineDot done={!!depositedLabel} />
          </div>
          <div className="flex items-start justify-between mt-2">
            <div>
              <div className="text-[#0D2137] text-xs font-semibold">Initiated</div>
              <div className="text-[#90A4AE] text-[11px] mt-0.5">{initiatedLabel || '—'}</div>
            </div>
            <div className="text-right">
              <div className="text-[#0D2137] text-xs font-semibold">
                {status === 'failed' ? 'Failed' : 'Deposited'}
              </div>
              <div className="text-[#90A4AE] text-[11px] mt-0.5">{depositedLabel || 'Pending'}</div>
            </div>
          </div>
        </div>

        {/* Amount breakdown */}
        <div className="bg-white rounded-2xl border border-[#E3F2FD] p-4 shadow-sm">
          <h2 className="text-[#90A4AE] text-[11px] font-bold uppercase tracking-wider mb-3">Amount details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#546E7A]">Gross earnings</span>
              <span className="text-[#0D2137] font-medium">₹{gross.toLocaleString('en-IN')}</span>
            </div>
            {fee > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#546E7A]">Platform fee</span>
                <span className="text-[#DC2626] font-medium">−₹{fee.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#F0F2F8]">
              <span className="text-[#0D2137] font-semibold">Net payout</span>
              <span className="text-[#0D2137] font-bold">₹{net.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Sent to */}
        {row.destination && (
          <div className="bg-white rounded-2xl border border-[#E3F2FD] p-4 shadow-sm">
            <h2 className="text-[#90A4AE] text-[11px] font-bold uppercase tracking-wider mb-3">Sent to</h2>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F0F6FF] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#546E7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4 text-[#B91C1C] text-sm">
            <span className="font-semibold">Payout failed: </span>{row.failureReason}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <button onClick={handleDownloadReceipt}
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] active:scale-95 text-white font-bold rounded-xl py-3.5 transition-all">
            Download receipt
          </button>
          <button onClick={handleViewInvoice}
            className="w-full border border-[#E3F2FD] text-[#0D2137] hover:bg-[#F8FAFF] active:scale-95 font-bold rounded-xl py-3.5 transition-all">
            View invoice
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

function fmtShortDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function TimelineDot({ done }) {
  return (
    <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${
      done ? 'bg-[#22C55E] border-[#22C55E]' : 'bg-white border-[#CBD5E1]'
    }`} />
  );
}

/**
 * Splits a `destination` string like "ICICI Bank XXXXXXXX4589" into a bank
 * name line + a spaced-out masked account line ("XXXX XXXX 4589"), or
 * treats it as a bare UPI id ("name@bank") when there's no space.
 */
function parseDestination(destination) {
  if (!destination) return { line1: '—', line2: null };
  if (!destination.includes(' ')) {
    return { line1: 'UPI', line2: destination };
  }
  const match = destination.match(/^(.*)\s([A-Z0-9]+)$/);
  if (!match) return { line1: destination, line2: null };
  const [, bankName, masked] = match;
  // Group into 4s for readability: "XXXXXXXX4589" → "XXXX XXXX 4589"
  const grouped = masked.replace(/(.{4})/g, '$1 ').trim();
  return { line1: bankName, line2: `A/C ${grouped}` };
}

/*
 * ── Backend follow-up (flag for Vishakha) ──────────────────────────────
 * To fully match the Figma reference, CreatorEarningDTO would need:
 *   - `payoutId`      (razorpayPayoutId, already on the CreatorEarning
 *                       entity, just not exposed in the DTO yet)
 *   - `initiatedAt`    (when the payout attempt was actually fired —
 *                       lastAttemptAt would work, distinct from scheduledFor
 *                       which is just the queue date)
 *   - `platformFeeRupees` (if/when a per-payout fee line item is introduced;
 *                       currently the creator's earning IS their net share,
 *                       there's no separate fee deducted at payout time)
 * Until then this page uses scheduledFor as a stand-in for "Initiated" and
 * hides the fee row entirely (Gross === Net).
 */
