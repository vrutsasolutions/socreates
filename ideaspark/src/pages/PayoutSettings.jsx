import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPayoutDetails } from '../api/paymentApi';
import UpdateBankAccountModal from './UpdateBankAccountModal';

/**
 * "Payout settings" — Figma screen 3. Shows the creator's current active
 * payout destination as a compact card:
 *
 *   ✔ Creator Pro
 *   [bank icon] ICICI Bank            Verified
 *               XXXX XXXX 4589
 *   [ Change bank account ]
 *
 * "Change bank account" opens UpdateBankAccountModal as a card-style
 * pop-up over this page — no separate route/navigation anymore.
 */
export default function PayoutSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const justSaved = location.state?.justSaved === true;

  const [details, setDetails]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [justUpdated, setJustUpdated]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getPayoutDetails();
      setDetails(data);
    } catch {
      setError('Could not load payout details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBankAccountUpdated = () => {
    setShowUpdateModal(false);
    setJustUpdated(true);
    load();
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-10">
      {/* Header — smaller/compact, back button and heading on one line */}
      <header className="bg-[#1565C0] rounded-b-[20px] px-4 pt-3 pb-4 shadow-md">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate(-1)} aria-label="Go back"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-base">Payout settings</h1>
            <p className="text-white/70 text-[11px] mt-0.5">Manage how you get paid</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-4 max-w-md mx-auto">
        {(justSaved || justUpdated) && (
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] text-sm font-semibold rounded-xl px-3.5 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Payout details saved successfully.
          </div>
        )}

        {error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-sm rounded-xl px-3.5 py-2.5">
            {error}
          </div>
        )}

        {loading ? (
          <CardSkeleton />
        ) : details?.configured ? (
          <>
            {/* Creator Pro check row */}
            <div className="flex items-center gap-2 px-1">
              <span className="w-5 h-5 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-[#0D2137] text-sm font-semibold">Creator Pro</span>
            </div>

            {/* Bank / UPI card */}
            <div className="bg-white rounded-2xl border border-[#E3F2FD] shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0F6FF] flex items-center justify-center shrink-0">
                  {details.method === 'vpa' ? (
                    <svg className="w-5 h-5 text-[#546E7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <path d="M2 10h20" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-[#546E7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M4 10h16M6 10v11M10 10v11M14 10v11M18 10v11M12 3l9 5H3l9-5z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {details.method === 'vpa' ? (
                    <div className="text-[#0D2137] text-sm font-bold truncate">{details.vpa}</div>
                  ) : (
                    <>
                      <div className="text-[#0D2137] text-sm font-bold truncate">{details.bankName || 'Bank'}</div>
                      <div className="text-[#90A4AE] text-xs font-mono mt-0.5 tracking-wide">
                        {spacedMask(details.maskedAccountNumber)}
                      </div>
                    </>
                  )}
                </div>
                {details.verified && (
                  <span className="text-[#16A34A] text-[11px] font-bold bg-[#DCFCE7] rounded-full px-2.5 py-1 shrink-0">
                    Verified
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => { setJustUpdated(false); setShowUpdateModal(true); }}
              className="w-full border border-[#E3F2FD] text-[#0D2137] hover:bg-[#F8FAFF] active:scale-95 font-bold rounded-xl py-3.5 transition-all"
            >
              Change bank account
            </button>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E3F2FD] shadow-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#FFF7ED] flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </div>
            <h3 className="text-[#0D2137] font-bold text-base mb-1">No payout account set up</h3>
            <p className="text-[#90A4AE] text-sm mb-4 leading-relaxed">
              Add your bank or UPI details so we know where to send your monthly earnings.
            </p>
            <button
              onClick={() => navigate('/payout-setup')}
              className="w-full bg-[#1565C0] hover:bg-[#0D47A1] active:scale-95 text-white font-bold rounded-xl py-3 transition-all"
            >
              Set up payout details
            </button>
          </div>
        )}

        <p className="text-[#90A4AE] text-[11px] text-center leading-relaxed px-4">
          Earnings are paid out on the 15th of every month for the previous month's earnings.
          Minimum payout: ₹500 — smaller amounts roll over to the next month.
        </p>
      </div>

      {/* Card-style pop-up — replaces the old /update-bank-account route */}
      <UpdateBankAccountModal
        isOpen={showUpdateModal}
        current={details}
        onClose={() => setShowUpdateModal(false)}
        onSaved={handleBankAccountUpdated}
      />
    </div>
  );
}

/** "XXXXXXXX4589" → "XXXX XXXX 4589" for readability. */
function spacedMask(masked) {
  if (!masked) return '';
  return masked.replace(/(.{4})/g, '$1 ').trim();
}

function CardSkeleton() {
  return <div className="bg-[#F0F6FF] rounded-2xl h-40 animate-pulse" />;
}
