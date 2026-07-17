import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getPayoutDetails, savePayoutDetails } from "../api/paymentApi";

/**
 * Full-page payout setup form — first-time only.
 *
 * Once payout details have been saved, creators manage future changes
 * through the UpdateBankAccountModal from the Payout Settings page.
 * This screen is only used for the initial payout setup.
 *
 * Three sections, per the agreed spec:
 *   1. Personal   — full legal name, email (read-only), mobile
 *   2. Bank / UPI — method toggle, then either UPI ID or bank details
 *                   (account number, confirm, IFSC, bank name auto-filled)
 *   3. Tax        — PAN, ownership confirmation checkbox
 *
 * Layout: a single rounded white "card" (header + form) sits on a light
 * page background (no dark backdrop). On phones the card fills nearly
 * the whole viewport; on tablet/desktop it stays centered but grows
 * wider and taller, with its own internal scroll so the header never
 * gets pushed off-screen. All fields stack one after another — no
 * side-by-side field pairs, on any screen size.
 */
export default function PayoutSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPurchase = location.state?.fromPurchase === true;

  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState("bank_account"); // 'vpa' | 'bank_account'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ifscLookupBusy, setIfscLookupBusy] = useState(false);

  const [form, setForm] = useState({
    legalName: "",
    email: "",
    mobile: "",
    vpa: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifsc: "",
    bankName: "",
    pan: "",
    confirmOwnership: false,
  });

  const ifscDebounce = useRef(null);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      setForm((f) => ({ ...f, email: storedUser?.email ?? "" }));

      // If details already exist, this creator arrived here by mistake
      // (e.g. a stale bookmark) — bounce them to Settings instead of
      // letting them re-run first-time setup over an active account.
      const { data } = await getPayoutDetails();
      if (data?.configured && !fromPurchase) {
        navigate("/payout-settings", { replace: true });
        return;
      }
    } catch {
      // No details yet — first-time setup, blank form is correct.
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Best-effort IFSC → bank name lookup, debounced. Razorpay's public IFSC
  // API is free/unauthenticated. Never blocks submission if it fails.
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
        // Silent — bank name stays whatever the creator typed, if anything.
      } finally {
        setIfscLookupBusy(false);
      }
    }, 500);

    return () => clearTimeout(ifscDebounce.current);
  }, [form.ifsc]);

  const errMsg = (e, fallback) =>
    e?.response?.data?.message || e?.message || fallback;

  const validate = () => {
    if (!form.legalName.trim()) return "Full legal name is required.";
    if (!/^[6-9]\d{9}$/.test(form.mobile.trim()))
      return "Enter a valid 10-digit mobile number.";
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan.trim().toUpperCase()))
      return "Enter a valid PAN (e.g. ABCDE1234F).";

    if (method === "vpa") {
      if (!/^[\w.-]+@[\w.-]+$/.test(form.vpa.trim()))
        return "Enter a valid UPI ID (e.g. name@bank).";
    } else {
      if (!/^\d{6,20}$/.test(form.accountNumber.trim()))
        return "Enter a valid account number.";
      if (form.accountNumber.trim() !== form.confirmAccountNumber.trim())
        return "Account numbers do not match.";
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.trim().toUpperCase()))
        return "Enter a valid IFSC code.";
    }

    if (!form.confirmOwnership)
      return "Please confirm this account belongs to you.";
    return "";
  };

  const handleSubmit = async () => {
    setError("");
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    const payload = {
      legalName: form.legalName.trim(),
      panNumber: form.pan.trim().toUpperCase(),
      mobileNumber: form.mobile.trim(),
      ownershipConfirmed: form.confirmOwnership,
      method,
      ...(method === "vpa"
        ? { vpa: form.vpa.trim() }
        : {
            accountHolderName: form.legalName.trim(),
            accountNumber: form.accountNumber.trim(),
            confirmAccountNumber: form.confirmAccountNumber.trim(),
            ifscCode: form.ifsc.trim().toUpperCase(),
            bankName: form.bankName.trim(),
          }),
    };

    setBusy(true);
    try {
      await savePayoutDetails(payload);
      navigate(fromPurchase ? "/creator-dashboard" : "/payout-settings", {
        replace: true,
        state: { justSaved: true },
      });
    } catch (e) {
      setError(
        errMsg(
          e,
          "Could not save payout details. Please check your details and try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF]">
      {/* The card — header + form. Fills the viewport edge-to-edge on
          every screen size, phone through desktop. */}
      <div className="w-full min-h-screen bg-white flex flex-col">
        {/* ── Header ───────────────────────────────────────────────── */}
        <header className="bg-[#1565C0] px-5 sm:px-8 lg:px-10 pt-6 lg:pt-8 pb-7 lg:pb-9 shrink-0">
          <div className="max-w-2xl mx-auto">
            {!fromPurchase && (
              <button
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all -ml-1 mb-3"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 lg:w-6 lg:h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-white font-bold text-lg lg:text-2xl">
                  Complete payout setup
                </h1>
                <p className="text-white/70 text-xs lg:text-sm mt-0.5">
                  Creator Pro is active — add your details to start getting paid
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Scrollable body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 lg:px-10 pt-6 pb-8">
          <div className="max-w-2xl mx-auto">
            {loading ? (
              <FormSkeleton />
            ) : (
              <div className="space-y-5">
                {error && (
                  <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-sm rounded-xl px-3.5 py-2.5">
                    {error}
                  </div>
                )}

                {/* ── Personal details ──────────────────────────────── */}
                <div>
                  <h2 className="text-[#0D2137] text-sm lg:text-base font-bold mb-3">
                    Personal details
                  </h2>
                  <div className="space-y-3.5">
                    <Field label="Full legal name *">
                      <input
                        value={form.legalName}
                        onChange={set("legalName")}
                        placeholder="As per your government ID"
                        className={inputCls}
                        autoFocus
                      />
                    </Field>
                    <Field label="Email *">
                      <input
                        value={form.email}
                        disabled
                        className={`${inputCls} opacity-60 cursor-not-allowed`}
                      />
                    </Field>
                    <Field label="Mobile number *">
                      <input
                        value={form.mobile}
                        onChange={set("mobile")}
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </div>

                <div className="border-t border-[#EEF1F6]" />

                {/* ── Bank details ───────────────────────────────────── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[#0D2137] text-sm lg:text-base font-bold">
                      Bank details
                    </h2>
                    <div className="flex gap-1 bg-[#F0F6FF] p-0.5 rounded-lg">
                      <MethodTab
                        active={method === "bank_account"}
                        onClick={() => setMethod("bank_account")}
                        label="Bank"
                      />
                      <MethodTab
                        active={method === "vpa"}
                        onClick={() => setMethod("vpa")}
                        label="UPI"
                      />
                    </div>
                  </div>

                  {method === "vpa" ? (
                    <Field label="UPI ID *">
                      <input
                        value={form.vpa}
                        onChange={set("vpa")}
                        placeholder="name@bank"
                        className={inputCls}
                      />
                    </Field>
                  ) : (
                    <div className="space-y-3.5">
                      <Field label="Account holder name *">
                        <input
                          value={form.legalName}
                          disabled
                          placeholder="As it appears on your passbook"
                          className={`${inputCls} opacity-60 cursor-not-allowed`}
                        />
                      </Field>
                      <Field label="Bank account number *">
                        <input
                          value={form.accountNumber}
                          onChange={set("accountNumber")}
                          inputMode="numeric"
                          placeholder="Enter your account number"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Confirm account number *">
                        <input
                          value={form.confirmAccountNumber}
                          onChange={set("confirmAccountNumber")}
                          inputMode="numeric"
                          placeholder="Re-enter your account number"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="IFSC code *">
                        <input
                          value={form.ifsc}
                          onChange={set("ifsc")}
                          placeholder="e.g. HDFC0001234"
                          maxLength={11}
                          className={`${inputCls} uppercase`}
                        />
                      </Field>
                      <Field label="Bank name">
                        <div className="relative">
                          <input
                            value={form.bankName}
                            onChange={set("bankName")}
                            placeholder="Auto-fills from IFSC"
                            className={`${inputCls} bg-[#F4F2ED]`}
                          />
                          {ifscLookupBusy && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#BBDEFB] border-t-[#1565C0] rounded-full animate-spin" />
                          )}
                        </div>
                      </Field>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#EEF1F6]" />

                {/* ── Tax details ────────────────────────────────────── */}
                <div>
                  <h2 className="text-[#0D2137] text-sm lg:text-base font-bold mb-3">
                    Tax details
                  </h2>
                  <div className="space-y-3.5">
                    <Field label="PAN number * (Individual Identification)">
                      <input
                        value={form.pan}
                        onChange={set("pan")}
                        placeholder="e.g. ABCDE1234F"
                        maxLength={10}
                        className={`${inputCls} uppercase`}
                      />
                    </Field>

                    <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.confirmOwnership}
                        onChange={set("confirmOwnership")}
                        className="mt-0.5 w-4 h-4 rounded border-[#BBDEFB] text-[#1565C0] focus:ring-[#1565C0]"
                      />
                      <span className="text-[#546E7A] text-sm leading-snug">
                        I confirm this bank account belongs to me.
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={busy}
                  className="w-full lg:w-auto lg:px-14 bg-[#1565C0] hover:bg-[#0D47A1] active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl py-3.5 transition-all"
                >
                  {busy ? "Saving…" : "Save & continue"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */
const inputCls =
  "w-full rounded-xl border border-[#E4E7EC] bg-white px-3.5 py-2.5 text-[#0D2137] " +
  "placeholder:text-[#B0BEC5] focus:outline-none focus:border-[#1565C0] focus:ring-1 focus:ring-[#1565C0] transition-colors";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[#546E7A] text-xs font-semibold mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}

function MethodTab({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
        active ? "bg-white text-[#1565C0] shadow-sm" : "text-[#546E7A]"
      }`}
    >
      {label}
    </button>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2.5">
          <div className="h-3 bg-[#E3F2FD] rounded-full w-28" />
          <div className="bg-[#F0F6FF] rounded-2xl h-40" />
        </div>
      ))}
    </div>
  );
}
