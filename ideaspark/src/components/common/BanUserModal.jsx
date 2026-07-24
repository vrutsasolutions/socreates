// ════════════════════════════════════════════════════════════════════════
//  BanUserModal — admin-only confirmation for permanently deleting a user's
//  account AND blocking their email from re-registering.
//  Requires a reason + typing "DELETE" to confirm, since this is irreversible.
//  Style mirrors the delete-account modal in Settings.jsx.
// ════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import Icon from './Icon';
import { banAndDeleteUser } from '../../api/userApi';

const CONFIRM_WORD = 'DELETE';

export default function BanUserModal({ userId, userName, onClose, onBanned }) {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canConfirm = reason.trim().length > 0 && confirmText === CONFIRM_WORD && !busy;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setBusy(true);
    setError('');
    try {
      await banAndDeleteUser(userId, reason.trim());
      onBanned?.();
    } catch (err) {
      console.error('[BanUserModal] ban and delete failed', err);
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onClick={busy ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ban-user-title"
    >
      <div
        className="w-full max-w-sm bg-[#F0F6FF] border-2 border-[#1565C0] rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-11 h-11 rounded-full bg-[#FEE2E2] flex items-center justify-center mb-4">
          <Icon name="alert-triangle" className="w-5 h-5 text-[#DC2626]" />
        </div>

        <h2 id="ban-user-title" className="text-[#0D2137] text-lg font-bold">
          Delete account &amp; block email
        </h2>
        <p className="text-[#546E7A] text-sm mt-1.5 leading-relaxed">
          This will permanently delete{userName ? ` ${userName}'s` : " this user's"} account
          and all their data, and block their email from ever registering again. This can't be
          undone.
        </p>

        <label htmlFor="ban-reason" className="block text-[#90A4AE] text-xs font-medium mt-5 mb-2">
          Reason
        </label>
        <input
          id="ban-reason"
          type="text"
          autoFocus
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError('');
          }}
          placeholder="e.g. Uploaded restricted content"
          className="w-full bg-white border border-[#BBDEFB] rounded-xl px-4 py-3 text-[#0D2137] text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20 focus:border-[#1565C0] transition"
        />

        <label htmlFor="ban-confirm" className="block text-[#90A4AE] text-xs font-medium mt-4 mb-2">
          Type <span className="font-bold text-[#0D2137]">{CONFIRM_WORD}</span> to confirm
        </label>
        <input
          id="ban-confirm"
          type="text"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
          }}
          placeholder={CONFIRM_WORD}
          className="w-full bg-white border border-[#BBDEFB] rounded-xl px-4 py-3 text-[#0D2137] text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20 focus:border-[#1565C0] transition"
        />

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 bg-white border border-[#CBD5E1] text-[#0D2137] font-semibold py-3 rounded-xl hover:bg-[#F8FAFF] active:scale-95 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] font-semibold py-3 rounded-xl hover:bg-[#FEE2E2] active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy && (
              <span className="w-4 h-4 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin" />
            )}
            {busy ? 'Deleting...' : 'Delete & block'}
          </button>
        </div>
      </div>
    </div>
  );
}