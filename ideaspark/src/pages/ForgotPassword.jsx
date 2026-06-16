import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import Icon from '../components/common/Icon';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  const sendResetOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!cleanEmail) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password/send-otp', { email: cleanEmail });
      setMessage('OTP sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const verifyResetOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!otp || otp.length !== 6) { setError('Please enter a valid 6-digit OTP.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password/verify-otp', { email: cleanEmail, otp });
      setMessage('OTP verified. Please enter your new password.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password/reset', { email: cleanEmail, otp, newPassword });
      setMessage('Password reset successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl px-4 py-3.5 text-[#0D2137] placeholder-[#90A4AE] text-sm focus:outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 transition';

  const labelCls =
    'block text-[#1565C0] text-xs font-semibold uppercase tracking-widest mb-2';

  const STEPS = [
    { num: 1, label: 'Email' },
    { num: 2, label: 'Verify' },
    { num: 3, label: 'Reset' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* HEADER — matches app pattern */}
      <header className="bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10 overflow-hidden">

        {/* decorative rings */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        {/* top bar */}
        <div className="flex items-center justify-between relative z-10">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
            aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg">Forgot Password</h1>
          <span className="w-9" />
        </div>

        {/* floating identity card */}
        <div className="relative z-10 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4 shadow-md flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/15 flex items-center justify-center shrink-0">
              <Icon name="lock" className="w-6 h-6 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-base">Reset your password</h2>
              <p className="text-blue-200 text-[13px] mt-0.5">
                {step === 1 && 'Enter the email linked to your account'}
                {step === 2 && `OTP sent to ${cleanEmail || 'your email'}`}
                {step === 3 && 'Choose a new password to secure your account'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6 pb-10">
          <div className="px-6 max-w-sm mx-auto w-full">

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {STEPS.map((s, idx) => (
                <div key={s.num} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    step === s.num
                      ? 'bg-[#1565C0] text-white shadow-md shadow-blue-200'
                      : step > s.num
                      ? 'bg-[#E7F8EE] text-[#15803D]'
                      : 'bg-[#F0F6FF] text-[#90A4AE]'
                  }`}>
                    {step > s.num ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{s.num}</span>
                    )}
                    {s.label}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-5 h-0.5 rounded-full ${step > s.num ? 'bg-[#15803D]' : 'bg-[#BBDEFB]'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Alerts */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-5 flex items-center gap-2.5">
                <Icon name="alert-triangle" className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-2xl px-4 py-3 mb-5 flex items-center gap-2.5">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {message}
              </div>
            )}

            {/* Step 1 — Email */}
            {step === 1 && (
              <form onSubmit={sendResetOtp} className="space-y-4">
                <div>
                  <label className={labelCls}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-300/40 text-sm"
                >
                  {loading ? 'Sending OTP…' : 'Send OTP →'}
                </button>
              </form>
            )}

            {/* Step 2 — OTP */}
            {step === 2 && (
              <form onSubmit={verifyResetOtp} className="space-y-4">
                <div>
                  <label className={labelCls}>6-Digit OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    required
                    className={`${inputCls} tracking-[0.4em] text-center text-lg font-bold`}
                  />
                  <p className="text-[#90A4AE] text-xs mt-2 text-center">Check your inbox for the code we sent</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-300/40 text-sm"
                >
                  {loading ? 'Verifying…' : 'Verify OTP →'}
                </button>
              </form>
            )}

            {/* Step 3 — New Password */}
            {step === 3 && (
              <form onSubmit={resetPassword} className="space-y-4">
                <div>
                  <label className={labelCls}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-300/40 text-sm"
                >
                  {loading ? 'Resetting…' : 'Reset Password →'}
                </button>
              </form>
            )}

            <p className="text-center text-[#546E7A] text-sm mt-6">
              <Link to="/login" className="text-[#1565C0] font-semibold hover:underline">
                ← Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}