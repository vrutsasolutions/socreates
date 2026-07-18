/**
 * Frontend-side completeness check for payout details.
 *
 * The backend's `configured` flag on PayoutDetailsResponse only reflects
 * Razorpay linkage (Razorpay contact + fund account created). It does NOT
 * check that the creator actually filled in PAN, mobile number, and legal
 * name — which is possible for older accounts, partial saves, or the
 * corner case where a UPI-only setup skipped some fields.
 *
 * Callers that want to know "can we actually pay this creator and hold
 * them to KYC?" should use this helper instead of `details.configured`.
 * Both CreatorDashboard (for the blocking setup modal) and PayoutSettings
 * (for the empty-state vs details-view branch) use this so they agree.
 *
 * Rules (all must hold):
 *  - backend says `configured`
 *  - `accountHolderName` present
 *  - `maskedMobile`      present
 *  - `maskedPan`         present
 *  - method-specific field present:
 *      • bank_account → bankName + a destination string
 *      • vpa          → a vpa/destination string
 *
 * Any missing field means we treat the creator as "payout not set up"
 * and route them into the setup flow to complete it.
 */
export function isPayoutComplete(details) {
  if (!details || !details.configured) return false;

  const has = (v) => typeof v === 'string' && v.trim().length > 0;

  if (!has(details.accountHolderName)) return false;
  if (!has(details.maskedMobile)) return false;
  if (!has(details.maskedPan)) return false;

  if (details.method === 'vpa') {
    return has(details.vpa) || has(details.destination);
  }
  // Default to bank_account rules
  return has(details.bankName) && has(details.destination);
}
