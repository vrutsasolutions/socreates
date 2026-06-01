import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendOtp, verifyOtp } from '../api/authApi';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Email comes from the Register redirect; fall back to the logged-in user.
  const email = location.state?.email || user?.email || '';

  const [digits, setDigits]     = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const inputsRef = useRef([]);

  useEffect(() => { inputsRef.current[0]?.focus(); }, []);

  // Resend cooldown timer.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const code = digits.join('');
  const canSubmit = code.length === OTP_LENGTH && !loading;

  const handleChange = (i, val) => {
    const v = val.replace(/\D/g, '');
    if (!v) { setDigits((d) => d.map((x, idx) => (idx === i ? '' : x))); return; }
    setDigits((d) => {
      const next = [...d];
      // Support paste of the whole code into one box.
      if (v.length > 1) {
        v.slice(0, OTP_LENGTH).split('').forEach((ch, k) => { next[k] = ch; });
        inputsRef.current[Math.min(v.length, OTP_LENGTH) - 1]?.focus();
        return next;
      }
      next[i] = v;
      if (i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus();
      return next;
    });
    if (error) setError('');
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus();
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setError('');
    try {
      await verifyOtp(email, code);
      navigate('/select-interests', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    try {
      await sendOtp(email);
      setCooldown(RESEND_SECONDS);
    } catch {
      setError('Could not resend the code. Try again in a moment.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <div className="bg-[#1565C0] px-6 pt-14 pb-16 text-center relative">
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-white rounded-t-[2rem]" />
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl">📩</span>
        </div>
        <h1 className="text-white text-2xl font-bold">Verify your email</h1>
        <p className="text-blue-200 text-sm mt-1">
          Enter the 6-digit code we sent{email ? ' to' : ''}
        </p>
        {email && <p className="text-white text-sm font-semibold mt-0.5 break-all">{email}</p>}
      </div>

      <div className="flex-1 px-6 py-6 max-w-sm md:max-w-md mx-auto w-full">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-5 flex items-start gap-2.5">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6" noValidate>
          <div className="flex justify-center gap-2.5">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={OTP_LENGTH}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                aria-label={`Digit ${i + 1}`}
                className="w-12 h-14 text-center text-xl font-bold bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl text-[#0D2137] focus:outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 transition"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-300/40 text-sm">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                Verifying...
              </span>
            ) : 'Verify & Continue'}
          </button>
        </form>

        <div className="text-center mt-6">
          <span className="text-[#546E7A] text-sm">Didn't get the code? </span>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-[#1565C0] font-semibold text-sm disabled:text-[#90A4AE] disabled:cursor-not-allowed hover:underline disabled:no-underline">
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  );
}
