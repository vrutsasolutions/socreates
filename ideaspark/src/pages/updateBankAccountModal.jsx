import { useState, useEffect, useRef } from 'react';
import { updateBankAccount } from '../api/paymentApi';

/**
 * "Update bank account" — now rendered as a card-style pop-up (Figma
 * screen 4 content), not a separate route. Opened from PayoutSettings
 * when the creator taps "Change bank account".
 *
 * Deliberately lighter than the first-time PayoutSetup form: only asks
 * for the bank-specific fields (account holder name, account number,
 * confirm, IFSC). Legal name, PAN, and mobile were already collected
 * during first-time setup and are NOT re-asked here.
 *
 * ⚠️ Backend note: the save call can't reuse PUT /api/creator/payout-details
 * as-is, since that endpoint currently requires legalName + pan + mobile on
 * every request (see CreatorPayoutService.savePayoutDetails). This calls
 * updateBankAccount() from paymentApi.jsx, which targets a NEW endpoint —
 * PUT /api/creator/payout-details/bank-account — that needs to be added
 * server-side. It should reuse the existing active row's legalName / pan /
 * mobile / razorpay_contact_id, and just swap the bank fields + create a
 * fresh fund account, following the same deactivate-old-one flow already
 * built into savePayoutDetails. Flagged for Vishakha; see paymentApi.jsx
 * for the exact payload shape this sends.
 *
 * Props:
 *   isOpen   — whether the modal is visible
 *   current  — the creator's currently active payout details (for the
 *              "Currently:" line), passed down from PayoutSettings so we
 *              don't need a second fetch on open
 *   onClose  — called when the creator dismisses the modal without saving
 *   onSaved  — called after a successful save
 */
export default function UpdateBankAccountModal({ isOpen, current, onClose, onSaved }) {
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const [ifscLookupBusy, setIfscLookupBusy] = useState(false);

  const [form, setForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: '',
    bankName: '',
  });

  const ifscDebounce = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Reset the form fresh every time the modal opens, pre-filling the
  // account holder name from the currently active account.
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setForm({
      accountHolderName: current?.legalName ?? '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifsc: '',
      bankName: '',
    });
  }, [isOpen, current]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, busy, onClose]);

  // Best-effort IFSC → bank name lookup, debounced.
  useEffect(() => {
    if (!isOpen) return;
    if (ifscDebounce.current) clearTimeout(ifscDebounce.current);
    const code = form.ifsc.trim().toUpperCase();
    if (code.length !== 11) return;

    ifscDebounce.current = setTimeout(async () => {
      setIfscLookupBusy(true);
      try {
        const res = await fetch(`https://ifsc.razorpay.com/${code}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.BANK) setForm((f) => ({ ...f, bankName: json.BANK }));
        }
      } catch {
        // Silent.
      } finally {
        setIfscLookupBusy(false);
      }
    }, 500);

    return () => clearTimeout(ifscDebounce.current);
  }, [form.ifsc, isOpen]);

  if (!isOpen) return null;

  const errMsg = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

  const validate = () => {
    if (!form.accountHolderName.trim()) return 'Account holder name is required.';
    if (!/^\d{6,20}$/.test(form.accountNumber.trim())) return 'Enter a valid account number.';
    if (form.accountNumber.trim() !== form.confirmAccountNumber.trim()) return 'Account numbers do not match.';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.trim().toUpperCase())) return 'Enter a valid IFSC code.';
    return '';
  };

  const handleSave = async () => {
    setError('');
    const v = validate();
    if (v) { setError(v); return; }

    setBusy(true);
    try {
      await updateBankAccount({
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber.trim(),
        confirmAccountNumber: form.confirmAccountNumber.trim(),
        ifsc: form.ifsc.trim().toUpperCase(),
        bankName: form.bankName.trim(),
      });
      onSaved?.();
    } catch (e) {
      setError(errMsg(e, 'Could not update your bank account. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[1px] px-0 sm:px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose?.(); }}
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Card header — close button and title on the same line ─── */}
        <header className="bg-[#1565C0] px-4 pt-3 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <button onClick={() => !busy && onClose?.()} aria-label="Close"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-base">Update bank account</h1>
              <p className="text-white/70 text-[11px] mt-0.5 leading-snug">
                Your current account stays active until this one is verified
              </p>
            </div>
          </div>
        </header>

        {/* ── Scrollable body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-6">
          <div className="space-y-4">
            {/* Warning banner */}
            <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4 py-3 flex gap-2.5">
              <svg className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-[#92400E] text-xs leading-relaxed">
                Payouts already in progress will still go to your old account. This change applies going forward.
              </p>
            </div>

            {error && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-sm rounded-xl px-3.5 py-2.5">
                {error}
              </div>
            )}

            {/* Currently active account — read only */}
            {current && (
              <div className="bg-[#F0F2F8] border border-[#E3F2FD] rounded-xl px-3.5 py-2.5 text-[#546E7A] text-xs">
                Currently: <span className="font-semibold text-[#0D2137]">
                  {current.method === 'vpa' ? current.vpa : `${current.bankName || 'Bank'} · ${spacedMask(current.maskedAccountNumber)}`}
                </span>
              </div>
            )}

            <div className="space-y-3.5 pt-1">
              <Field label="Account holder name *">
                <input value={form.accountHolderName} onChange={set('accountHolderName')}
                  placeholder="As it appears on your passbook" className={inputCls} autoFocus />
              </Field>
              <Field label="Account number *">
                <input value={form.accountNumber} onChange={set('accountNumber')} inputMode="numeric"
                  placeholder="Enter your new account number" className={inputCls} />
              </Field>
              <Field label="Confirm account number *">
                <input value={form.confirmAccountNumber} onChange={set('confirmAccountNumber')} inputMode="numeric"
                  placeholder="Re-enter your new account number" className={inputCls} />
              </Field>
              <Field label="IFSC code *">
                <div className="relative">
                  <input value={form.ifsc} onChange={set('ifsc')} placeholder="e.g. HDFC0001234"
                    maxLength={11} className={`${inputCls} uppercase`} />
                  {ifscLookupBusy && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#BBDEFB] border-t-[#1565C0] rounded-full animate-spin" />
                  )}
                </div>
              </Field>
            </div>

            <div className="space-y-2.5 pt-2">
              <button onClick={handleSave} disabled={busy}
                className="w-full bg-[#1565C0] hover:bg-[#0D47A1] active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl py-3.5 transition-all">
                {busy ? 'Saving…' : 'Save new account'}
              </button>
              <button onClick={() => !busy && onClose?.()} disabled={busy}
                className="w-full border border-[#E3F2FD] text-[#0D2137] hover:bg-[#F8FAFF] active:scale-95 disabled:opacity-50 font-bold rounded-xl py-3.5 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */
const inputCls =
  'w-full rounded-xl border border-[#E3F2FD] bg-[#F8FAFF] px-3.5 py-2.5 text-[#0D2137] ' +
  'placeholder:text-[#B0BEC5] focus:outline-none focus:border-[#1565C0] focus:bg-white transition-colors';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[#546E7A] text-xs font-semibold mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function spacedMask(masked) {
  if (!masked) return '';
  return masked.replace(/(.{4})/g, '$1 ').trim();
}
