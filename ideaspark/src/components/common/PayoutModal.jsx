import { useState, useEffect, useCallback } from 'react';
import { getPayoutDetails, savePayoutDetails, requestPayout } from '../../api/paymentApi';

/**
 * Creator payout (RazorpayX, test mode).
 *
 * Two internal steps:
 *   1. "details"  — enter/confirm a payout destination (UPI or bank account).
 *                   Skipped straight to "confirm" if details are already saved.
 *   2. "confirm"  — review the masked destination + amount, then withdraw.
 *
 * Props:
 *   row      — the earnings row being withdrawn: { monthIso, month, earning, status }
 *   onClose  — close the modal
 *   onPaid   — (monthIso, result) called after a successful payout so the parent
 *              can flip the row to "Paid"
 */
export default function PayoutModal({ row, onClose, onPaid }) {
  const [step, setStep]       = useState('loading'); // loading | details | confirm | done
  const [details, setDetails] = useState(null);      // saved payout destination
  const [method, setMethod]   = useState('vpa');     // form: 'vpa' | 'bank_account'
  const [form, setForm]       = useState({ vpa: '', accountName: '', accountNumber: '', ifsc: '' });
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [result, setResult]   = useState(null);

  const loadDetails = useCallback(async () => {
    setError('');
    try {
      const { data } = await getPayoutDetails();
      setDetails(data);
      setStep(data?.configured ? 'confirm' : 'details');
    } catch (e) {
      // No details yet / endpoint issue → let the creator enter details.
      setDetails({ configured: false });
      setStep('details');
    }
  }, []);

  useEffect(() => { loadDetails(); }, [loadDetails]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const errMsg = (e, fallback) =>
    e?.response?.data?.message || e?.message || fallback;

  const handleSave = async () => {
    setError('');
    const payload = method === 'vpa'
      ? { method: 'vpa', vpa: form.vpa.trim() }
      : {
          method: 'bank_account',
          accountName: form.accountName.trim(),
          accountNumber: form.accountNumber.trim(),
          ifsc: form.ifsc.trim().toUpperCase(),
        };
    setBusy(true);
    try {
      const { data } = await savePayoutDetails(payload);
      setDetails(data);
      setStep('confirm');
    } catch (e) {
      setError(errMsg(e, 'Could not save payout details.'));
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async () => {
    setError('');
    setBusy(true);
    try {
      const { data } = await requestPayout({ month: row.monthIso });
      setResult(data);
      setStep('done');
      onPaid?.(row.monthIso, data);
    } catch (e) {
      setError(errMsg(e, 'Payout failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={busy ? undefined : onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-[#0D2137] text-lg font-bold">Withdraw earnings</h3>
              <p className="text-[#90A4AE] text-xs mt-0.5">{row.month}</p>
            </div>
            <button onClick={onClose} disabled={busy} aria-label="Close"
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#546E7A] hover:bg-[#F0F6FF] active:scale-90 transition-all disabled:opacity-50">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Amount */}
          <div className="mt-3 mb-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4 text-center">
            <div className="text-[#15803D] text-xs font-medium">Amount to withdraw</div>
            <div className="text-[#16A34A] text-3xl font-bold mt-0.5">
              ₹{Number(row.earning ?? 0).toLocaleString('en-IN')}
            </div>
          </div>

          {error && (
            <div className="mb-3 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-sm rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {/* ── Loading ─────────────────────────────────────────── */}
          {step === 'loading' && (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-[#BBDEFB] border-t-[#1565C0] rounded-full animate-spin" />
            </div>
          )}

          {/* ── Details form ────────────────────────────────────── */}
          {step === 'details' && (
            <div className="space-y-4">
              {/* Method toggle */}
              <div className="flex gap-2 bg-[#F0F6FF] p-1 rounded-xl">
                <MethodTab active={method === 'vpa'} onClick={() => setMethod('vpa')} label="UPI ID" />
                <MethodTab active={method === 'bank_account'} onClick={() => setMethod('bank_account')} label="Bank account" />
              </div>

              {method === 'vpa' ? (
                <Field label="UPI ID">
                  <input value={form.vpa} onChange={update('vpa')} placeholder="name@bank"
                    className={inputCls} autoFocus />
                </Field>
              ) : (
                <>
                  <Field label="Account holder name">
                    <input value={form.accountName} onChange={update('accountName')} placeholder="As per bank records"
                      className={inputCls} />
                  </Field>
                  <Field label="Account number">
                    <input value={form.accountNumber} onChange={update('accountNumber')} inputMode="numeric"
                      placeholder="1234567890" className={inputCls} />
                  </Field>
                  <Field label="IFSC code">
                    <input value={form.ifsc} onChange={update('ifsc')} placeholder="HDFC0001234"
                      className={`${inputCls} uppercase`} />
                  </Field>
                </>
              )}

              <button onClick={handleSave} disabled={busy}
                className="w-full bg-[#1565C0] hover:bg-[#0D47A1] active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl py-3 transition-all">
                {busy ? 'Saving…' : 'Save & continue'}
              </button>
              <p className="text-[#90A4AE] text-[11px] text-center leading-relaxed">
                Test mode — no real money is transferred. Payouts are processed via RazorpayX.
              </p>
            </div>
          )}

          {/* ── Confirm ─────────────────────────────────────────── */}
          {step === 'confirm' && details && (
            <div className="space-y-4">
              <div className="bg-white border border-[#E3F2FD] rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#90A4AE] text-xs">Paying to</span>
                  <button onClick={() => setStep('details')} className="text-[#1565C0] text-xs font-semibold hover:underline">
                    Change
                  </button>
                </div>
                <div className="mt-1 text-[#0D2137] font-semibold">{details.destination}</div>
                {details.accountName && (
                  <div className="text-[#546E7A] text-sm">{details.accountName}</div>
                )}
                <div className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider text-[#546E7A] bg-[#F0F6FF] rounded px-2 py-0.5">
                  {details.method === 'vpa' ? 'UPI' : 'Bank transfer'}
                </div>
              </div>

              <button onClick={handleWithdraw} disabled={busy}
                className="w-full bg-[#16A34A] hover:bg-[#15803D] active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl py-3 transition-all">
                {busy ? 'Processing…' : `Withdraw ₹${Number(row.earning ?? 0).toLocaleString('en-IN')}`}
              </button>
              <p className="text-[#90A4AE] text-[11px] text-center leading-relaxed">
                Test mode — no real money is transferred.
              </p>
            </div>
          )}

          {/* ── Done ────────────────────────────────────────────── */}
          {step === 'done' && result && (
            <div className="text-center py-4 space-y-3">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                <svg className="w-7 h-7 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="text-[#0D2137] font-bold text-lg">Payout initiated</div>
                <div className="text-[#546E7A] text-sm mt-1">
                  ₹{Number(row.earning ?? 0).toLocaleString('en-IN')} is on its way to {details?.destination}.
                </div>
              </div>
              {result.payoutId && (
                <div className="text-[#90A4AE] text-[11px] font-mono break-all">
                  {result.payoutId}
                </div>
              )}
              <button onClick={onClose}
                className="w-full bg-[#1565C0] hover:bg-[#0D47A1] active:scale-95 text-white font-bold rounded-xl py-3 transition-all">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

function MethodTab({ active, onClick, label }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
        active ? 'bg-white text-[#1565C0] shadow-sm' : 'text-[#546E7A]'
      }`}>
      {label}
    </button>
  );
}