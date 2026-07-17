import { useEffect, useRef, useState } from "react";
import { savePayoutDetails } from "../api/paymentApi";

/**
 * Change-bank-account modal.
 *
 * Uses the existing:
 * PUT /api/creator/payout-details
 *
 * The backend creates a new RazorpayX fund account, deactivates the previous
 * account and preserves payout-account history.
 */
export default function UpdateBankAccountModal({
  isOpen,
  current,
  onClose,
  onSaved,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ifscLookupBusy, setIfscLookupBusy] = useState(false);

  const [form, setForm] = useState({
    legalName: "",
    mobileNumber: "",
    panNumber: "",
    accountHolderName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifsc: "",
    bankName: "",
    ownershipConfirmed: false,
  });

  const ifscDebounce = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setError("");

    setForm({
      legalName: "",
      mobileNumber: "",
      panNumber: "",
      accountHolderName:
        current?.accountHolderName ??
        current?.legalName ??
        "",
      accountNumber: "",
      confirmAccountNumber: "",
      ifsc: "",
      bankName: "",
      ownershipConfirmed: false,
    });
  }, [isOpen, current]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    if (ifscDebounce.current) {
      clearTimeout(ifscDebounce.current);
    }

    const code = form.ifsc.trim().toUpperCase();

    if (code.length !== 11) {
      return undefined;
    }

    ifscDebounce.current = setTimeout(async () => {
      setIfscLookupBusy(true);

      try {
        const response = await fetch(
          `https://ifsc.razorpay.com/${code}`
        );

        if (response.ok) {
          const result = await response.json();

          if (result?.BANK) {
            setForm((previous) => ({
              ...previous,
              bankName: result.BANK,
            }));
          }
        }
      } catch {
        // IFSC lookup is optional. Manual bank-name entry remains available.
      } finally {
        setIfscLookupBusy(false);
      }
    }, 500);

    return () => {
      if (ifscDebounce.current) {
        clearTimeout(ifscDebounce.current);
      }
    };
  }, [form.ifsc, isOpen]);

  if (!isOpen) {
    return null;
  }

  const set =
    (field) =>
    (event) => {
      const value =
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value;

      setForm((previous) => ({
        ...previous,
        [field]: value,
      }));
    };

  const validate = () => {
    if (!form.legalName.trim()) {
      return "Legal name is required.";
    }

    const mobile = form.mobileNumber.replace(/\D/g, "");

    if (!/^\d{10,15}$/.test(mobile)) {
      return "Enter a valid mobile number.";
    }

    const pan = form.panNumber.trim().toUpperCase();

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      return "Enter a valid PAN number.";
    }

    if (!form.accountHolderName.trim()) {
      return "Account holder name is required.";
    }

    const accountNumber =
      form.accountNumber.trim().replace(/\D/g, "");

    const confirmAccountNumber =
      form.confirmAccountNumber.trim().replace(/\D/g, "");

    if (!/^\d{6,20}$/.test(accountNumber)) {
      return "Enter a valid account number.";
    }

    if (accountNumber !== confirmAccountNumber) {
      return "Account numbers do not match.";
    }

    const ifscCode = form.ifsc.trim().toUpperCase();

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      return "Enter a valid IFSC code.";
    }

    if (!form.bankName.trim()) {
      return "Bank name is required.";
    }

    if (!form.ownershipConfirmed) {
      return "Confirm that this payout account belongs to you.";
    }

    return "";
  };

  const handleSave = async () => {
    setError("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);

    try {
      const payload = {
        method: "bank_account",

        legalName: form.legalName.trim(),
        mobileNumber: form.mobileNumber.replace(/\D/g, ""),
        panNumber: form.panNumber.trim().toUpperCase(),
        ownershipConfirmed: true,

        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber.replace(/\D/g, ""),
        confirmAccountNumber:
          form.confirmAccountNumber.replace(/\D/g, ""),
        ifscCode: form.ifsc.trim().toUpperCase(),
        bankName: form.bankName.trim(),
      };

      const response = await savePayoutDetails(payload);

      if (onSaved) {
        await onSaved(response?.data ?? response);
      }

      onClose();
    } catch (exception) {
      setError(
        exception?.response?.data?.message ||
          exception?.message ||
          "Could not update your bank account. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !busy) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-bank-account-title"
      onMouseDown={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-[#F4F7FF] shadow-2xl">
        <header className="sticky top-0 z-10 rounded-t-3xl bg-[#1565C0] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="update-bank-account-title"
                className="text-lg font-bold text-white"
              >
                Change bank account
              </h2>

              <p className="mt-1 text-xs leading-relaxed text-white/75">
                A new payout account will be created. Your previous
                account will be deactivated for future payouts.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="space-y-5 p-5">
          {current?.configured && (
            <div className="rounded-2xl border border-[#BBDEFB] bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#78909C]">
                Currently active
              </p>

              <p className="mt-1 text-sm font-semibold text-[#0D2137]">
                {current.destination || "Configured payout account"}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3">
            <p className="text-xs leading-relaxed text-[#92400E]">
              Payouts already in progress will continue to the account
              assigned when they were scheduled. This change applies to
              future payouts.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-sm text-[#B91C1C]">
              {error}
            </div>
          )}

          <section className="space-y-3.5">
            <h3 className="text-sm font-bold text-[#0D2137]">
              Identity details
            </h3>

            <Field label="Legal name *">
              <input
                value={form.legalName}
                onChange={set("legalName")}
                placeholder="As shown on your PAN"
                autoComplete="name"
                className={inputClass}
              />
            </Field>

            <Field label="Mobile number *">
              <input
                value={form.mobileNumber}
                onChange={set("mobileNumber")}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                autoComplete="tel"
                className={inputClass}
              />
            </Field>

            <Field label="PAN number *">
              <input
                value={form.panNumber}
                onChange={set("panNumber")}
                placeholder="ABCDE1234F"
                maxLength={10}
                autoCapitalize="characters"
                className={`${inputClass} uppercase`}
              />
            </Field>
          </section>

          <section className="space-y-3.5 border-t border-[#E3F2FD] pt-5">
            <h3 className="text-sm font-bold text-[#0D2137]">
              New bank account
            </h3>

            <Field label="Account holder name *">
              <input
                value={form.accountHolderName}
                onChange={set("accountHolderName")}
                placeholder="As shown on your passbook"
                autoComplete="name"
                className={inputClass}
              />
            </Field>

            <Field label="Account number *">
              <input
                value={form.accountNumber}
                onChange={set("accountNumber")}
                placeholder="Enter the new account number"
                inputMode="numeric"
                autoComplete="off"
                className={inputClass}
              />
            </Field>

            <Field label="Confirm account number *">
              <input
                value={form.confirmAccountNumber}
                onChange={set("confirmAccountNumber")}
                placeholder="Re-enter the account number"
                inputMode="numeric"
                autoComplete="off"
                className={inputClass}
              />
            </Field>

            <Field label="IFSC code *">
              <div className="relative">
                <input
                  value={form.ifsc}
                  onChange={set("ifsc")}
                  placeholder="HDFC0001234"
                  maxLength={11}
                  autoCapitalize="characters"
                  className={`${inputClass} pr-10 uppercase`}
                />

                {ifscLookupBusy && (
                  <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[#BBDEFB] border-t-[#1565C0]" />
                )}
              </div>
            </Field>

            <Field label="Bank name *">
              <input
                value={form.bankName}
                onChange={set("bankName")}
                placeholder="Bank name"
                className={inputClass}
              />
            </Field>
          </section>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#BBDEFB] bg-white px-4 py-3">
            <input
              type="checkbox"
              checked={form.ownershipConfirmed}
              onChange={set("ownershipConfirmed")}
              className="mt-0.5 h-4 w-4 accent-[#1565C0]"
            />

            <span className="text-xs leading-relaxed text-[#455A64]">
              I confirm that this bank account belongs to me and that the
              information provided is accurate.
            </span>
          </label>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="w-full rounded-xl bg-[#1565C0] py-3.5 font-bold text-white transition hover:bg-[#0D47A1] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save new account"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="w-full rounded-xl border border-[#BBDEFB] bg-white py-3.5 font-bold text-[#0D2137] transition hover:bg-[#F8FAFF] active:scale-[0.98] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#E3F2FD] bg-[#F8FAFF] " +
  "px-3.5 py-2.5 text-sm text-[#0D2137] " +
  "placeholder:text-[#B0BEC5] focus:border-[#1565C0] " +
  "focus:bg-white focus:outline-none transition-colors";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#546E7A]">
        {label}
      </span>

      {children}
    </label>
  );
}