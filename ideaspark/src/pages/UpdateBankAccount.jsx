import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPayoutDetails, updateBankAccount } from '../api/paymentApi';

/**
 * "Update bank account" — Figma screen 4. Deliberately lighter than the
 * first-time PayoutSetup form: only asks for the bank-specific fields
 * (account holder name, account number, confirm, IFSC). Legal name, PAN,
 * and mobile were already collected and verified during first-time setup
 * and are NOT re-asked here — the Figma reference doesn't show them either.
 *
 * ⚠️ Backend note: this means the save call can't reuse
 * PUT /api/creator/payout-details as-is, since that endpoint currently
 * requires legalName + pan + mobile on every request (see
 * CreatorPayoutService.savePayoutDetails). This page calls
 * updateBankAccount() from paymentApi.jsx, which targets a NEW endpoint —
 * PUT /api/creator/payout-details/bank-account — that needs to be added
 * server-side. It should reuse the existing active row's legalName / pan /
 * mobile / razorpay_contact_id, and just swap the bank fields + create a
 * fresh fund account, following the same deactivate-old-one flow already
 * built into savePayoutDetails. Flagged for Vishakha; see paymentApi.jsx
 * for the exact payload shape this page sends.
 */
export default function UpdateBankAccount() {
  const navigate = useNavigate();

  const [loading, setLoading]   = useState(true);
  const [current, setCurrent]   = useState(null); // existing active details, for the "Currently:" line
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getPayoutDetails();
      if (!data?.configured) {
        // No existing account to "update" — send them to first-time setup instead.
        navigate('/payout-setup', { replace: true });
        return;
      }
      setCurrent(data);
      setForm((f) => ({ ...f, accountHolderName: data.legalName ?? '' }));
    } catch {
      setError('Could not load your current payout details.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  // Best-effort IFSC → bank name lookup, same as PayoutSetup.
  useEffect(() => {
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
  }, [form.ifsc]);

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
      navigate('/payout-settings', { replace: true, state: { justSaved: true } });
    } catch (e) {
      setError(errMsg(e, 'Could not update your bank account. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-10">
      {/* Header — smaller/compact */}
      <header className="bg-[#1565C0] rounded-b-[20px] px-4 pt-3 pb-4 shadow-md">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate(-1)} aria-label="Go back"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M4 10h16M6 10v11M10 10v11M14 10v11M18 10v11M12 3l9 5H3l9-5z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-base">Update bank account</h1>
            <p className="text-white/70 text-[11px] mt-0.5 leading-snug">
              Your current account stays active until this one is verified
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
        {loading ? (
          <FormSkeleton />
        ) : (
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
              <button onClick={() => navigate(-1)} disabled={busy}
                className="w-full border border-[#E3F2FD] text-[#0D2137] hover:bg-[#F8FAFF] active:scale-95 disabled:opacity-50 font-bold rounded-xl py-3.5 transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}
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

function FormSkeleton() {
  return (
    <div className="space-y-3.5 animate-pulse">
      <div className="bg-[#F0F6FF] rounded-2xl h-14" />
      <div className="bg-[#F0F6FF] rounded-2xl h-56" />
    </div>
  );
}
