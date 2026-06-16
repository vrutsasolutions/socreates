import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendOtp, verifyOtp, registerUser } from '../api/authApi';
import Icon from '../components/common/Icon';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const email = location.state?.email || '';
  const payload = location.state?.payload;
  const mode = location.state?.mode;

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const code = digits.join('');
  const canSubmit = code.length === OTP_LENGTH && !loading;

  const handleChange = (i, val) => {
    const v = val.replace(/\D/g, '');

    if (!v) {
      setDigits((d) => d.map((x, idx) => (idx === i ? '' : x)));
      return;
    }

    setDigits((d) => {
      const next = [...d];

      if (v.length > 1) {
        v.slice(0, OTP_LENGTH).split('').forEach((ch, k) => {
          next[k] = ch;
        });
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
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      await verifyOtp(email, code);

      if (mode === 'register' && payload) {
        const { data } = await registerUser(payload);
        login(data.user, data.token);
        navigate('/select-interests', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
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
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">
      <div className="bg-[#1565C0] px-6 pt-14 pb-16 text-center relative overflow-hidden">
        <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
        <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#F4F7FF] rounded-t-[2rem]" />

        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-5 shadow-lg">
          <Icon name="mail" className="w-8 h-8 text-[#1565C0]" />
        </div>

        <h1 className="text-white text-2xl font-bold">Verify your email</h1>
        <p className="text-blue-200 text-[15px] mt-2">
          Enter the 6-digit code we sent to
        </p>
        <p className="text-white text-sm font-semibold mt-1 break-all">{email}</p>
      </div>

      <div className="flex-1 px-6 py-8 max-w-sm md:max-w-md mx-auto w-full">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[15px] rounded-2xl px-4 py-3.5 mb-6 flex items-start gap-2.5">
            <Icon name="alert-triangle" className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-8" noValidate>
          <div className="flex justify-center gap-3">
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
                className={`w-[52px] h-[64px] text-center text-2xl font-bold bg-[#F0F6FF] border rounded-2xl text-[#0D2137]
                  focus:outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 transition-all
                  ${d ? 'border-[#1565C0] bg-[#E3F2FD]' : 'border-[#BBDEFB]'}`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-300/40 text-[15px]"
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>

        <div className="text-center mt-8">
          <span className="text-[#546E7A] text-[15px]">Didn't get the code? </span>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-[#1565C0] font-semibold text-[15px] disabled:text-[#90A4AE] disabled:cursor-not-allowed hover:underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  );
}