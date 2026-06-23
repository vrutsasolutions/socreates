import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/authApi';
import api from '../api/axiosInstance';
import Icon from '../components/common/Icon';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REMEMBER_KEY = 'ideaspark_remember_email';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const submitting = useRef(false);
  const emailRef = useRef(null);

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setForm((f) => ({ ...f, email: saved }));
      setRemember(true);
    }
    emailRef.current?.focus();
  }, []);

  const emailEmpty = touched.email && !form.email.trim();
  const emailInvalid = touched.email && form.email.trim() && !EMAIL_REGEX.test(form.email.trim());
  const pwdEmpty = touched.password && !form.password;
  const pwdTooShort = touched.password && form.password.length > 0 && form.password.length < 6;

  const emailHasError = emailEmpty || emailInvalid;
  const passwordHasError = pwdEmpty || pwdTooShort;

  const canSubmit =
    form.email.trim() &&
    EMAIL_REGEX.test(form.email.trim()) &&
    form.password.length >= 6 &&
    !loading;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleBlur = (e) => setTouched({ ...touched, [e.target.name]: true });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!canSubmit || submitting.current) return;

    submitting.current = true;
    setError('');
    setLoading(true);

    try {
      const { data } = await loginUser({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (remember) localStorage.setItem(REMEMBER_KEY, form.email.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_KEY);

      login(data.user, data.token);

      const redirectTo = location.state?.from?.pathname || '/home';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || 'Login failed.';

      if (!err.response) setError('Cannot connect to server. Is the backend running on port 8081?');
      else if (status === 401 || status === 400) setError('Wrong email or password. Please try again.');
      else if (status === 404) setError('No account found with that email.');
      else if (status === 429) setError('Too many attempts. Please wait a moment and try again.');
      else setError(msg);
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError('');
      setLoading(true);

      const res = await api.post('/auth/google', {
        token: credentialResponse.credential,
      });

      login(res.data.user, res.data.token);

      const redirectTo = location.state?.from?.pathname || '/home';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">
      <div className="bg-[#1565C0] px-6 pt-14 pb-24 text-center relative overflow-hidden shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl mb-4 shadow-lg">
            <Icon name="lightbulb" className="w-8 h-8 text-amber-300" />
          </div>
          <h1 className="text-white text-2xl font-bold">Welcome Back</h1>
          <p className="text-blue-200 text-sm mt-1">Sign in to continue to SoCreate</p>
        </div>
      </div>

      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6 flex-1">
          <div className="px-6 pb-10 max-w-sm md:max-w-md mx-auto w-full">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-5 flex items-start gap-2.5">
                <Icon name="alert-triangle" className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">{error}</div>
                  {error.includes('No account') && (
                    <Link to="/register" className="text-[#1565C0] font-bold text-xs mt-1 block">
                      Create an account →
                    </Link>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="block text-[#1565C0] text-xs font-semibold uppercase tracking-widest mb-2">
                  Email
                </label>
                <input
                  id="email"
                  ref={emailRef}
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  aria-invalid={emailHasError}
                  className={`w-full bg-[#F0F6FF] border rounded-2xl px-4 py-3.5 text-[#0D2137] placeholder-[#90A4AE] text-sm focus:outline-none focus:ring-2 transition ${
                    emailHasError
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-[#BBDEFB] focus:border-[#1565C0] focus:ring-[#1565C0]/20'
                  }`}
                />
                {emailEmpty && <p className="text-xs text-red-400 mt-1.5 pl-1">Email is required</p>}
                {emailInvalid && <p className="text-xs text-red-400 mt-1.5 pl-1">Enter a valid email address</p>}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="password" className="text-[#1565C0] text-xs font-semibold uppercase tracking-widest">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-[#1565C0] text-xs font-semibold hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    aria-invalid={passwordHasError}
                    className={`w-full bg-[#F0F6FF] border rounded-2xl px-4 py-3.5 pr-12 text-[#0D2137] placeholder-[#90A4AE] text-sm focus:outline-none focus:ring-2 transition ${
                      passwordHasError
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-[#BBDEFB] focus:border-[#1565C0] focus:ring-[#1565C0]/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#90A4AE] hover:text-[#1565C0] transition-colors"
                  >
                    <Icon name={showPwd ? 'eye-off' : 'eye'} className="w-5 h-5" />
                  </button>
                </div>

                {pwdEmpty && <p className="text-xs text-red-400 mt-1.5 pl-1">Password is required</p>}
                {pwdTooShort && <p className="text-xs text-red-400 mt-1.5 pl-1">Password must be at least 6 characters</p>}
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-[#BBDEFB] bg-white peer-checked:bg-[#1565C0] peer-checked:border-[#1565C0] transition flex items-center justify-center">
                    {remember && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[#546E7A] text-sm">Keep me signed in</span>
              </label>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-300/40 text-sm mt-3"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-[#E3F2FD]" />
              <span className="text-[#90A4AE] text-xs uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-[#E3F2FD]" />
            </div>

            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google login failed. Please try again.')}
                useOneTap={false}
              />
            </div>

            <p className="text-center text-[#546E7A] text-sm mt-6 mb-2">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#1565C0] font-semibold hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}