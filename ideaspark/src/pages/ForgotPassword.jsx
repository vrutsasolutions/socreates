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

    if (!cleanEmail) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/forgot-password/send-otp', {
        email: cleanEmail,
      });

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

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/forgot-password/verify-otp', {
        email: cleanEmail,
        otp,
      });

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

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/forgot-password/reset', {
        email: cleanEmail,
        otp,
        newPassword,
      });

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

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">
      <div className="bg-[#1565C0] px-6 pt-14 pb-24 text-center relative overflow-hidden shadow-lg border-b border-white/10">
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl mb-4 shadow-lg">
            <Icon name="lock" className="w-8 h-8 text-amber-300" />
          </div>
          <h1 className="text-white text-2xl font-bold">Forgot Password</h1>
          <p className="text-blue-200 text-sm mt-1">Reset your SoCreates password</p>
        </div>
      </div>

      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6">
          <div className="flex-1 px-6 pb-10 max-w-sm mx-auto w-full">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-5 flex items-center gap-2.5">
                <Icon name="alert-triangle" className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-2xl px-4 py-3 mb-5">
                {message}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={sendResetOtp} className="space-y-4">
                <div>
                  <label className={labelCls}>Email</label>
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
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={verifyResetOtp} className="space-y-4">
                <div>
                  <label className={labelCls}>OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    required
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-300/40 text-sm"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={resetPassword} className="space-y-4">
                <div>
                  <label className={labelCls}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
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
                    placeholder="Confirm new password"
                    required
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-300/40 text-sm"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            <p className="text-center text-[#546E7A] text-sm mt-6">
              <Link to="/login" className="text-[#1565C0] font-semibold hover:underline">
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}