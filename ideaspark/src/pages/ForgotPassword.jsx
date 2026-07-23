// ════════════════════════════════════════════════════════════════════════
//  ForgotPassword — 4-step reset wizard (figma "Forgot Password" flow)
//
//  Step 1  Enter email          → POST /auth/forgot-password/send-otp
//  Step 2  Verify 6-digit OTP   → POST /auth/forgot-password/verify-otp
//  Step 3  Create new password  → POST /auth/forgot-password/reset
//  Step 4  Success screen       → Back to Login
//
//  Endpoints are LIVE on the backend (OtpController). Email OTP delivery is
//  handled server-side via EmailService.sendPasswordResetEmail.
// ════════════════════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  forgotPasswordReset,
} from '../api/authApi';
import Icon from '../components/common/Icon';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const ArrowRight = () => (
  <svg className="w-4 h-4 inline-block ml-1.5 -mb-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// ── Header icon per step ──────────────────────────────────────────────────
function StepIcon({ step }) {
  if (step === 2) {
    return (
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h4" />
      </svg>
    );
  }
  if (step === 3) return <Icon name="lock" className="w-8 h-8 text-white" />;
  return <Icon name="mail" className="w-8 h-8 text-white" />;
}

// ── Step progress dots ─────────────────────────────────────────────────────
function StepDots({ active }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`rounded-full transition-all ${n === active ? 'w-2.5 h-2.5 bg-[#1565C0]' : 'w-2 h-2 bg-[#BBDEFB]'}`}
        />
      ))}
    </div>
  );
}

// ── Floating-label field ───────────────────────────────────────────────────
function FloatingField({ label, value, type = 'text', onChange, autoFocus, right, ...rest }) {
  return (
    <div className="group rounded-2xl border border-[#BBDEFB] bg-[#F0F6FF] px-4 py-2.5 focus-within:border-[#1565C0] focus-within:ring-2 focus-within:ring-[#1565C0]/15 transition">
      <label className={`block text-[11px] font-semibold transition-colors ${value ? 'text-[#1565C0]' : 'text-[#90A4AE]'} group-focus-within:text-[#1565C0]`}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
          className="flex-1 min-w-0 bg-transparent text-[15px] text-[#0D2137] placeholder-[#90A4AE] focus:outline-none"
          {...rest}
        />
        {right}
      </div>
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const otpRefs = useRef([]);
  const cleanEmail = email.trim().toLowerCase();

  // Resend countdown (active on the OTP step)
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 2) otpRefs.current[0]?.focus();
  }, [step]);

  const code = digits.join('');

  // Password rules (mockup: 8+ chars, one number, one symbol)
  const hasLen = newPassword.length >= 8;
  const hasNum = /\d/.test(newPassword);
  const hasSym = /[^A-Za-z0-9]/.test(newPassword);
  const pwdValid = hasLen && hasNum && hasSym;
  const pwdMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const strength = [hasLen, hasNum, hasSym, newPassword.length >= 12].filter(Boolean).length;

  const apiMessage = (err, fallback) =>
    !err.response
      ? 'Cannot connect to server. Please try again in a moment.'
      : err.response?.data?.message || fallback;

  // ── Step 1: send OTP ──────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await forgotPasswordSendOtp(cleanEmail);
      setDigits(Array(OTP_LENGTH).fill(''));
      setStep(2);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(apiMessage(err, 'Failed to send OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────
  const handleOtpChange = (i, val) => {
    const v = val.replace(/\D/g, '');
    if (error) setError('');
    if (!v) {
      setDigits((d) => d.map((x, idx) => (idx === i ? '' : x)));
      return;
    }
    setDigits((d) => {
      const next = [...d];
      if (v.length > 1) {
        v.slice(0, OTP_LENGTH).split('').forEach((ch, k) => { next[k] = ch; });
        otpRefs.current[Math.min(v.length, OTP_LENGTH) - 1]?.focus();
        return next;
      }
      next[i] = v;
      if (i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
      return next;
    });
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await forgotPasswordVerifyOtp(cleanEmail, code);
      setResetToken(data?.resetToken || '');
      setStep(3);
    } catch (err) {
      setError(apiMessage(err, 'Invalid or expired OTP.'));
      setDigits(Array(OTP_LENGTH).fill(''));
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    try {
      await forgotPasswordSendOtp(cleanEmail);
      setDigits(Array(OTP_LENGTH).fill(''));
      otpRefs.current[0]?.focus();
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(apiMessage(err, 'Could not resend the code. Try again shortly.'));
    }
  };

  // ── Step 3: reset password ────────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!pwdValid) {
      setError('Password must be at least 8 characters with one number and one symbol.');
      return;
    }
    if (!pwdMatch) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await forgotPasswordReset(cleanEmail, newPassword, resetToken);
      setStep(4);
    } catch (err) {
      setError(apiMessage(err, 'Failed to reset password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 1) navigate('/login');
    else if (step === 2) { setStep(1); setDigits(Array(OTP_LENGTH).fill('')); }
    else if (step === 3) setStep(2);
  };

  const titles = {
    1: { title: 'Forgot Password?', sub: 'Enter your registered email address' },
    2: { title: 'Verify OTP', sub: `Sent to ${cleanEmail || 'your email'}` },
    3: { title: 'Create New Password', sub: 'Choose a strong password' },
  };

  const btnCls =
    'w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-300/40 text-[15px]';

  // ════════════════════════════════════════════════════════════════════════
  //  STEP 4 — success
  // ════════════════════════════════════════════════════════════════════════
  if (step === 4) {
    return (
      <div className="min-h-screen bg-[#F4F7FF] flex flex-col">
        <div className="bg-[#1565C0] px-6 pt-16 pb-24 text-center relative overflow-hidden shadow-lg">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
            <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#F0FDF4] flex items-center justify-center">
                <Icon name="check" className="w-8 h-8 text-[#22C55E]" strokeWidth={3} />
              </div>
            </div>
            <h1 className="text-white text-2xl font-bold">Password Reset!</h1>
            <p className="text-blue-200 text-sm mt-1">Your password has been updated</p>
          </div>
        </div>

        <div className="bg-[#1565C0]">
          <div className="bg-white rounded-t-[32px] pt-6">
            <div className="px-6 pb-10 max-w-sm mx-auto w-full">
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl px-4 py-4 mb-4 flex items-center gap-3">
                <p className="flex-1 text-[#15803D] text-sm font-medium">
                  You can now log in with your new password. Keep it safe!
                </p>
                <span className="w-8 h-8 rounded-full bg-[#22C55E] flex items-center justify-center shrink-0">
                  <Icon name="check" className="w-4 h-4 text-white" strokeWidth={3} />
                </span>
              </div>

              <div className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl px-4 py-4 mb-6">
                <p className="text-[#0D2137] text-sm font-bold flex items-center gap-2 mb-2">
                  <Icon name="lock" className="w-4 h-4 text-[#1565C0]" /> What changed?
                </p>
                <ul className="text-[#546E7A] text-sm space-y-1.5">
                  <li className="flex gap-2"><span className="text-[#90A4AE]">•</span> Your old password no longer works</li>
                  <li className="flex gap-2"><span className="text-[#90A4AE]">•</span> Sign in again on your other devices</li>
                </ul>
              </div>

              <button onClick={() => navigate('/login')} className={btnCls}>
                Back to Login <ArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  STEPS 1–3
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">
      <div className="bg-[#1565C0] px-6 pt-12 pb-20 text-center relative overflow-hidden shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <button
          onClick={handleBack}
          aria-label="Go back"
          className="absolute top-6 left-5 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl mb-4 shadow-lg">
            <StepIcon step={step} />
          </div>
          <h1 className="text-white text-2xl font-bold">{titles[step].title}</h1>
          <p className="text-blue-200 text-sm mt-1 break-all">{titles[step].sub}</p>
        </div>
      </div>

      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6">
          <div className="px-6 pb-10 max-w-sm mx-auto w-full">
            <StepDots active={step} />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-5 flex items-start gap-2.5">
                <Icon name="alert-triangle" className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{error}</span>
              </div>
            )}

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-5" noValidate>
                <p className="text-[#546E7A] text-sm">We'll send a 6-digit OTP to verify your identity.</p>
                <FloatingField
                  label="Email Address"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  right={<Icon name="mail" className="w-5 h-5 text-[#90A4AE]" />}
                />
                <button type="submit" disabled={loading} className={btnCls}>
                  {loading ? 'Sending OTP...' : <>Send OTP <ArrowRight /></>}
                </button>
                <p className="text-center pt-1">
                  <Link to="/login" className="text-[#1565C0] font-semibold text-sm hover:underline">Back to Login</Link>
                </p>
              </form>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-6" noValidate>
                <p className="text-[#546E7A] text-sm">Enter the 6-digit code we just sent to your inbox.</p>
                <div className="flex justify-center gap-2.5">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                      maxLength={OTP_LENGTH}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`w-12 h-14 text-center text-xl font-bold rounded-2xl border bg-[#F0F6FF] text-[#0D2137]
                        focus:outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 transition-all
                        ${d ? 'border-[#1565C0] bg-[#E3F2FD]' : 'border-[#BBDEFB]'}`}
                    />
                  ))}
                </div>

                <p className="text-center text-sm text-[#90A4AE]">
                  {cooldown > 0 ? (
                    <>Resend OTP in <span className="font-semibold text-[#546E7A] tabular-nums">{mmss(cooldown)}</span></>
                  ) : (
                    <button type="button" onClick={handleResend} className="text-[#1565C0] font-semibold hover:underline">
                      Resend OTP
                    </button>
                  )}
                </p>

                <button type="submit" disabled={loading} className={btnCls}>
                  {loading ? 'Verifying...' : <>Verify OTP <ArrowRight /></>}
                </button>
                <p className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setDigits(Array(OTP_LENGTH).fill('')); setError(''); }}
                    className="text-[#1565C0] font-semibold text-sm hover:underline"
                  >
                    Change email address
                  </button>
                </p>
              </form>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <form onSubmit={handleReset} className="space-y-4" noValidate>
                <p className="text-[#546E7A] text-sm">Must be at least 8 characters with one number and symbol.</p>

                <FloatingField
                  label="New Password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); if (error) setError(''); }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  autoFocus
                  right={
                    <button type="button" onClick={() => setShowNew((v) => !v)} aria-label={showNew ? 'Hide password' : 'Show password'}
                      className="text-[#90A4AE] hover:text-[#1565C0] transition-colors">
                      <Icon name={showNew ? 'eye-off' : 'eye'} className="w-5 h-5" />
                    </button>
                  }
                />

                {newPassword.length > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex-1 h-1.5 rounded-full bg-[#E3F2FD] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${strength <= 1 ? 'bg-[#EF4444]' : strength === 2 ? 'bg-[#F59E0B]' : strength === 3 ? 'bg-[#1565C0]' : 'bg-[#22C55E]'}`}
                        style={{ width: `${(strength / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-[#90A4AE] w-12 text-right">
                      {strength <= 1 ? 'Weak' : strength === 2 ? 'Fair' : strength === 3 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                )}

                <FloatingField
                  label="Confirm Password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  right={
                    <button type="button" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      className="text-[#90A4AE] hover:text-[#1565C0] transition-colors">
                      <Icon name={showConfirm ? 'eye-off' : 'eye'} className="w-5 h-5" />
                    </button>
                  }
                />
                {confirmPassword.length > 0 && !pwdMatch && (
                  <p className="text-xs text-red-400 pl-1">Passwords do not match</p>
                )}

                <button type="submit" disabled={loading} className={`${btnCls} mt-2`}>
                  {loading ? 'Resetting...' : <>Reset Password <ArrowRight /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
