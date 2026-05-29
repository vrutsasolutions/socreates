import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/authApi';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const REMEMBER_KEY = 'ideaspark_remember_email';

export default function Login() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { login }   = useAuth();
  const submitting  = useRef(false);
  const emailRef    = useRef(null);

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd]     = useState(false);
  const [remember, setRemember]   = useState(false);
  const [touched, setTouched]     = useState({ email: false, password: false });
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setForm(f => ({ ...f, email: saved }));
      setRemember(true);
    }
    emailRef.current?.focus();
  }, []);

  const emailEmpty   = touched.email && !form.email.trim();
  const emailInvalid = touched.email && form.email.trim() && !EMAIL_REGEX.test(form.email.trim());
  const pwdEmpty     = touched.password && !form.password;
  const pwdTooShort  = touched.password && form.password.length > 0 && form.password.length < 6;

  const emailHasError    = emailEmpty || emailInvalid;
  const passwordHasError = pwdEmpty || pwdTooShort;

  const canSubmit = form.email.trim()
                 && EMAIL_REGEX.test(form.email.trim())
                 && form.password.length >= 6
                 && !loading;

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
        email:    form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (remember) localStorage.setItem(REMEMBER_KEY, form.email.trim().toLowerCase());
      else          localStorage.removeItem(REMEMBER_KEY);

      login(data.user, data.token);

      const redirectTo = location.state?.from?.pathname || '/home';
      navigate(redirectTo, { replace: true });

    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message || err.message || 'Login failed.';

      if (!err.response)
        setError('Cannot connect to server. Is the backend running on port 8081?');
      else if (status === 401 || status === 400)
        setError('Wrong email or password. Please try again.');
      else if (status === 404)
        setError('No account found with that email.');
      else if (status === 429)
        setError('Too many attempts. Please wait a moment and try again.');
      else
        setError(msg);
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  const handleGoogleLogin = () => {
    setError('Google Sign-In is coming soon. Please use email login for now.');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <div className="bg-[#1565C0] px-6 pt-14 pb-16 text-center relative">
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-white rounded-t-[2rem]" />
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl">💡</span>
        </div>
        <h1 className="text-white text-2xl font-bold">Welcome Back</h1>
        <p className="text-blue-200 text-sm mt-1">Sign in to continue to IdeaSpark</p>
      </div>

      <div className="flex-1 px-6 py-6 max-w-sm md:max-w-md mx-auto w-full">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-5 flex items-start gap-2.5">
            <span className="text-base leading-none mt-0.5">⚠️</span>
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
              className={`w-full bg-[#F0F6FF] border rounded-2xl px-4 py-3.5 text-[#0D2137] placeholder-[#90A4AE] text-sm focus:outline-none focus:ring-2 transition
                ${emailHasError
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                  : 'border-[#BBDEFB] focus:border-[#1565C0] focus:ring-[#1565C0]/20'}`}
            />
            {emailEmpty   && <p className="text-xs text-red-400 mt-1.5 pl-1">Email is required</p>}
            {emailInvalid && <p className="text-xs text-red-400 mt-1.5 pl-1">Enter a valid email address</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="text-[#1565C0] text-xs font-semibold uppercase tracking-widest">
                Password
              </label>
              <Link to="/forgot-password"
                className="text-[#1565C0] text-xs font-semibold hover:underline">
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
                className={`w-full bg-[#F0F6FF] border rounded-2xl px-4 py-3.5 pr-12 text-[#0D2137] placeholder-[#90A4AE] text-sm focus:outline-none focus:ring-2 transition
                  ${passwordHasError
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    : 'border-[#BBDEFB] focus:border-[#1565C0] focus:ring-[#1565C0]/20'}`}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#90A4AE] text-sm">
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
            {pwdEmpty    && <p className="text-xs text-red-400 mt-1.5 pl-1">Password is required</p>}
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
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-300/40 text-sm mt-3">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#E3F2FD]" />
          <span className="text-[#90A4AE] text-xs uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-[#E3F2FD]" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white hover:bg-[#F0F6FF] border-2 border-[#BBDEFB] text-[#0D2137] font-semibold py-3.5 rounded-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 text-sm">
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-[#546E7A] text-sm mt-6 mb-2">
          Don't have an account?{' '}
          <Link to="/register"
            className="text-[#1565C0] font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
