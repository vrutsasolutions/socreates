import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPayoutDetails } from '../api/paymentApi';
import { isPayoutComplete } from '../utils/payoutStatus';
import UpdateBankAccountModal from './UpdateBankAccountModal';

/**
 * "Payout settings" — v2 redesign.
 *
 * The old single-card layout looked empty on desktop and gave the creator
 * no confirmation of what they'd actually entered during setup. This
 * version mirrors the three sections of PayoutSetup (Personal / Bank-or-UPI
 * / Tax) so the creator can visually verify each field is what they
 * expect, which also builds trust that we have the right info on file.
 *
 * All sensitive fields (PAN, mobile, account number) come pre-masked from
 * the backend (PayoutDetailsResponse). Email is read from the logged-in
 * user in localStorage — it isn't on the payout DTO because the account
 * email is authoritative and doesn't need to be re-stored per payout.
 *
 * "Change bank account" opens UpdateBankAccountModal (unchanged).
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

  // Read the account email once — payout DTO intentionally doesn't carry
  // it, since the account-level email is the source of truth.
  const userEmail = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}')?.email || ''; }
    catch { return ''; }
  })();

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
      {/* Header — compact, back button and heading on one line */}
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
          <PageSkeleton />
        ) : isPayoutComplete(details) ? (
          <>
            {/* Status row — Creator Pro + Verified */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-[#0D2137] text-sm font-semibold">Creator Pro</span>
              </div>
              {details.verified && (
                <span className="text-[#16A34A] text-[10px] font-bold bg-[#DCFCE7] rounded-full px-2 py-0.5">
                  Verified
                </span>
              )}
            </div>

            {/* Personal details */}
            <Section title="Personal details" icon={<PersonIcon />}>
              <Field label="Full legal name" value={details.accountHolderName} />
              <Field label="Email" value={userEmail} />
              <Field label="Mobile number" value={details.maskedMobile} mono />
            </Section>

            {/* Bank / UPI */}
            <Section
              title={details.method === 'vpa' ? 'UPI ID' : 'Bank Account'}
              icon={details.method === 'vpa' ? <UpiIcon /> : <BankIcon />}
            >
              {details.method === 'vpa' ? (
                <Field label="UPI ID" value={details.vpa || details.destination} mono breakAll />
              ) : (
                <>
                  <Field label="Bank" value={details.bankName || 'Bank'} />
                  <Field
                    label="Account number"
                    value={`A/C ${maskAccount(details.maskedAccountNumber || details.destination)}`}
                    mono
                  />
                </>
              )}
            </Section>

            {/* Tax */}
            <Section title="Tax details" icon={<TaxIcon />}>
              <Field label="PAN number" value={details.maskedPan} mono />
            </Section>

            <button
              onClick={() => { setJustUpdated(false); setShowUpdateModal(true); }}
              className="w-full border border-[#E3F2FD] bg-white text-[#0D2137] hover:bg-[#F8FAFF] active:scale-95 font-bold rounded-xl py-3.5 transition-all shadow-sm"
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

      <UpdateBankAccountModal
        isOpen={showUpdateModal}
        current={details}
        onClose={() => setShowUpdateModal(false)}
        onSaved={handleBankAccountUpdated}
      />
    </div>
  );
}

/* ── Section building blocks ────────────────────────────────────── */

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E3F2FD] shadow-sm p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#F0F6FF] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h2 className="text-[#0D2137] text-sm font-bold">{title}</h2>
      </div>
      <div className="divide-y divide-[#F0F2F8]">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, mono = false, breakAll = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="text-[#546E7A] text-xs">{label}</span>
      <span
        className={`text-[#0D2137] text-sm font-semibold text-right ${mono ? 'font-mono tracking-wide' : ''} ${breakAll ? 'break-all' : 'truncate'}`}
      >
        {value || '—'}
      </span>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */

/**
 * Normalises the destination string into a masked account of the form
 * "XXXXXXXX4589" — first 8 chars as X, last 4 digits visible.
 */
function maskAccount(raw) {
  if (!raw) return '—';
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return raw;
  const last4 = digits.slice(-4);
  return `XXXXXXXX${last4}`;
}

/* ── Icons ──────────────────────────────────────────────────────── */

function PersonIcon() {
  return (
    <svg className="w-4 h-4 text-[#1565C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg className="w-4 h-4 text-[#1565C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M4 10h16M6 10v11M10 10v11M14 10v11M18 10v11M12 3l9 5H3l9-5z" />
    </svg>
  );
}

function UpiIcon() {
  return (
    <svg className="w-4 h-4 text-[#1565C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function TaxIcon() {
  return (
    <svg className="w-4 h-4 text-[#1565C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2z" />
    </svg>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 bg-[#E3F2FD] rounded-full w-32" />
      <div className="bg-[#F0F6FF] rounded-2xl h-32" />
      <div className="bg-[#F0F6FF] rounded-2xl h-28" />
      <div className="bg-[#F0F6FF] rounded-2xl h-24" />
    </div>
  );
}
