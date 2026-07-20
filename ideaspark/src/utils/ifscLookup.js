/**
 * lookupBankName(ifscCode) → Promise<string | null>
 *
 * Resolves the bank name for a given 11-character IFSC code using three
 * sources in sequence, so near-universal coverage is achieved:
 *
 *   1. Razorpay public IFSC API   — fast, covers most private banks
 *   2. bankifsccode.com API       — RBI-sourced, covers PSBs, co-ops,
 *                                   and merged banks (e.g. UBI → Union Bank)
 *   3. Local prefix map           — offline fallback for ~40 common banks;
 *                                   works even with no network
 *
 * Returns the bank name string, or null if all three sources fail.
 * Never throws — callers can treat null as "keep whatever the user typed".
 */

const IFSC_PREFIX_MAP = {
  SBIN: "State Bank of India",
  HDFC: "HDFC Bank",
  ICIC: "ICICI Bank",
  UTIB: "Axis Bank",
  KKBK: "Kotak Mahindra Bank",
  PUNB: "Punjab National Bank",
  UBIN: "Union Bank of India",       // Includes former UBI / Corporation / Andhra Bank IFSCs
  UCBA: "UCO Bank",
  CNRB: "Canara Bank",               // Includes former Syndicate Bank IFSCs
  BARB: "Bank of Baroda",            // Includes former Dena / Vijaya Bank IFSCs
  BKID: "Bank of India",
  MAHB: "Bank of Maharashtra",
  IOBA: "Indian Overseas Bank",
  FDRL: "Federal Bank",
  IDIB: "Indian Bank",               // Includes former Allahabad Bank IFSCs
  INDB: "IndusInd Bank",
  YESB: "YES Bank",
  IDFC: "IDFC FIRST Bank",
  AUBL: "AU Small Finance Bank",
  ESAF: "ESAF Small Finance Bank",
  UJVN: "Ujjivan Small Finance Bank",
  JANA: "Jana Small Finance Bank",
  FINO: "Fino Payments Bank",
  AIRP: "Airtel Payments Bank",
  PYTM: "Paytm Payments Bank",
  IBKL: "IDBI Bank",
  SIBL: "South Indian Bank",
  KVBL: "Karnataka Vikas Grameena Bank",
  SRCB: "Saraswat Co-operative Bank",
  RATN: "RBL Bank",
  DCBL: "DCB Bank",
  CSBK: "CSB Bank",
  DLXB: "Dhanlaxmi Bank",
  LAVB: "Lakshmi Vilas Bank",
  ALLA: "Allahabad Bank",
  CORP: "Corporation Bank",
  ORBC: "Oriental Bank of Commerce",
  VIJB: "Vijaya Bank",
  DENA: "Dena Bank",
  NKGS: "NKGSB Co-operative Bank",
  GCBK: "Greater Bombay Co-operative Bank",
  MSNU: "Mehsana Urban Co-operative Bank",
  SUCO: "The Surat District Co-operative Bank",
  APGV: "Andhra Pradesh Grameena Vikas Bank",
  KACE: "Kerala Gramin Bank",
  TNSC: "Tamil Nadu State Apex Co-operative Bank",
};

export async function lookupBankName(ifscCode) {
  const code = (ifscCode || "").trim().toUpperCase();
  if (code.length !== 11) return null;

  // Source 1 — Razorpay
  try {
    const res = await fetch(`https://ifsc.razorpay.com/${code}`);
    if (res.ok) {
      const json = await res.json();
      if (json?.BANK) return json.BANK;
    }
  } catch { /* fall through */ }

  // Source 2 — bankifsccode.com (RBI-sourced, covers PSBs & merged banks)
  try {
    const res = await fetch(`https://ifsc.bankifsccode.com/${code}`);
    if (res.ok) {
      const json = await res.json();
      const name = json?.BANK || json?.bank || json?.BANKNAME || json?.bankName;
      if (name) return name;
    }
  } catch { /* fall through */ }

  // Source 3 — local prefix map (offline fallback)
  const prefix = code.substring(0, 4);
  return IFSC_PREFIX_MAP[prefix] ?? null;
}
