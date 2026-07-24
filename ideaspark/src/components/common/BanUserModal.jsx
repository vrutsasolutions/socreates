// ════════════════════════════════════════════════════════════════════════
// BanUserModal — Admin-only confirmation for permanently deleting a user
// account and blocking the email from future registrations.
// Requires:
//   • Ban reason
//   • Typing DELETE to confirm
// ════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import Icon from './Icon';
import { banAndDeleteUser } from '../../api/userApi';

const CONFIRM_WORD = 'DELETE';
const MAX_REASON_LENGTH = 250;

export default function BanUserModal({
  userId,
  userName,
  onClose,
  onBanned,
}) {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canConfirm =
    reason.trim().length > 0 &&
    confirmText === CONFIRM_WORD &&
    !busy;

  const handleConfirm = async () => {
    if (!canConfirm) return;

    setBusy(true);
    setError('');

    try {
      await banAndDeleteUser(userId, reason.trim());
      onBanned?.();
    } catch (err) {
      console.error('[BanUserModal] ban and delete failed', err);

      setError(
        err?.response?.data?.message ||
          'Something went wrong. Please try again.'
      );

      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={busy ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ban-user-title"
    >
      <div
        className="w-full max-w-md bg-[#F8FBFF] border border-[#1565C0] rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center">
            <Icon
              name="alert-triangle"
              className="w-6 h-6 text-[#DC2626]"
            />
          </div>

          <div>
            <h2
              id="ban-user-title"
              className="text-lg font-bold text-[#0D2137]"
            >
              Delete Account & Block Email
            </h2>

            <p className="text-sm text-[#607D8B] mt-1">
              Permanently removes the account and prevents future
              registrations using the same email.
            </p>
          </div>
        </div>

        {/* Warning */}

        <div className="mt-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <p className="text-sm font-semibold text-[#B91C1C]">
            ⚠️ This action cannot be undone.
          </p>

          <p className="text-xs text-[#7F1D1D] mt-2 leading-relaxed">
            {userName
              ? `${userName}'s`
              : "This user's"}{' '}
            account, profile, ideas, comments, likes, bookmarks and
            related information will be permanently deleted. Their
            email will also be blocked from creating another account.
          </p>
        </div>

        {/* Reason */}

        <div className="mt-5">
          <label
            htmlFor="ban-reason"
            className="block text-sm font-semibold text-[#0D2137] mb-2"
          >
            Ban Reason <span className="text-red-500">*</span>
          </label>

          <textarea
            id="ban-reason"
            autoFocus
            rows={4}
            maxLength={MAX_REASON_LENGTH}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);

              if (error) {
                setError('');
              }
            }}
            placeholder="Explain why this account is being permanently banned..."
            className="w-full bg-white border border-[#BBDEFB] rounded-xl px-4 py-3 text-sm text-[#0D2137] placeholder-[#94A3B8] resize-none focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20 focus:border-[#1565C0] transition"
          />

          <div className="flex justify-between mt-2">
            <p className="text-xs text-[#78909C]">
              This reason will be stored for moderation records.
            </p>

            <span className="text-xs text-[#94A3B8]">
              {reason.length}/{MAX_REASON_LENGTH}
            </span>
          </div>
        </div>

        {/* Confirmation */}

        <div className="mt-5">
          <label
            htmlFor="ban-confirm"
            className="block text-sm font-semibold text-[#0D2137] mb-2"
          >
            Type{' '}
            <span className="text-[#DC2626] font-bold">
              {CONFIRM_WORD}
            </span>{' '}
            to permanently confirm
          </label>

          <input
            id="ban-confirm"
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);

              if (error) {
                setError('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirm();
              }
            }}
            placeholder={CONFIRM_WORD}
            className="w-full bg-white border border-[#BBDEFB] rounded-xl px-4 py-3 text-sm text-[#0D2137] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20 focus:border-[#1565C0] transition"
          />
        </div>

        {/* Error */}

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Buttons */}

        <div className="flex gap-3 mt-7">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 bg-white border border-[#CBD5E1] text-[#0D2137] font-semibold py-3 rounded-xl hover:bg-[#F8FAFF] transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="flex-1 bg-[#DC2626] text-white font-semibold py-3 rounded-xl hover:bg-[#B91C1C] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}

            {busy
              ? 'Deleting...'
              : 'Permanently Ban User'}
          </button>
        </div>
      </div>
    </div>
  );
}