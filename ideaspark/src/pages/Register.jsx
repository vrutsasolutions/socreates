import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser, sendOtp, checkUsername } from '../api/authApi';
import { ValidationError, FormError } from '../components/common/ErrorStates.premium';
import Icon from '../components/common/Icon';

const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]       = useState({ firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '' });
  const [agree, setAgree]     = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [uname, setUname]     = useState({ state: 'idle', message: '' });
  const reqId = useRef(0);

  const inputCls = 'w-full bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl px-4 py-3.5 text-[#0D2137] placeholder-[#90A4AE] text-sm focus:outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 transition';
  const labelCls = 'block text-[#1565C0] text-xs font-semibold uppercase tracking-widest mb-2';

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleUsernameChange = (e) =>
    setForm({ ...form, username: e.target.value.toLowerCase().trim() });

  useEffect(() => {
    const u = form.username;
    if (!u) { setUname({ state: 'idle', message: '' }); return; }
    if (!USERNAME_RE.test(u)) {
      setUname({ state: 'invalid', message: '3–30 chars: a–z, 0–9, . or _' });
      return;
    }
    setUname({ state: 'checking', message: 'Checking availability…' });
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const { data } = await checkUsername(u);
        if (id !== reqId.current) return;
        setUname(data.success
          ? { state: 'available', message: 'Username is available' }
          : { state: 'taken',     message: data.message || 'Username is not available' });
      } catch {
        if (id !== reqId.current) return;
        setUname({ state: 'idle', message: '' });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form.username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) { setError('Please enter your first name'); return; }
    if (!USERNAME_RE.test(form.username)) { setError('Please choose a valid username'); return; }
    if (uname.state === 'taken') { setError('That username is already taken'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (!agree) { setError('Please agree to the terms & conditions to continue'); return; }
    setError(''); setLoading(true);
    try {
      const payload = {
        name: `${form.firstName} ${form.lastName}`.trim(),
        username: form.username,
        email: form.email,
        password: form.password,
      };
      const { data } = await registerUser(payload);
      login(data.user, data.token);
      try { await sendOtp(form.email); } catch { /* non-blocking */ }
      navigate('/verify-otp', { state: { email: form.email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* Blue header — matches Home/Login/Welcome */}
      <div className="bg-[#1565C0] px-6 pt-14 pb-24 text-center relative overflow-hidden shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl mb-4 shadow-lg">
            <Icon name="lightbulb" className="w-8 h-8 text-amber-300" />
          </div>
          <h1 className="text-white text-2xl font-bold">Join SoCreates</h1>
          <p className="text-blue-200 text-sm mt-1">Start sharing your ideas today</p>
        </div>
      </div>

      {/* Content wrapper — matches Home's rounded-t-[32px] white card */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-6">
          <div className="flex-1 px-6 pb-10 max-w-sm mx-auto w-full">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-5 flex items-center gap-2.5">
                <Icon name="alert-triangle" className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className={labelCls}>First Name</label>
                <input type="text" name="firstName" value={form.firstName}
                       onChange={handleChange} placeholder="John" required
                       className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Last Name</label>
                <input type="text" name="lastName" value={form.lastName}
                       onChange={handleChange} placeholder="Doe"
                       className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#90A4AE] text-sm">@</span>
                  <input type="text" name="username" value={form.username}
                         onChange={handleUsernameChange} placeholder="yourname" required
                         autoCapitalize="none" autoCorrect="off" spellCheck={false}
                         className={`w-full bg-[#F0F6FF] border rounded-2xl pl-8 pr-4 py-3.5 text-[#0D2137] placeholder-[#90A4AE] text-sm focus:outline-none focus:ring-2 transition
                                    ${uname.state === 'available' ? 'border-green-400 focus:border-green-500 focus:ring-green-500/20'
                                      : uname.state === 'taken' || uname.state === 'invalid' ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
                                      : 'border-[#BBDEFB] focus:border-[#1565C0] focus:ring-[#1565C0]/20'}`} />
                </div>
                {uname.message && (
                  <p className={`text-xs mt-1.5 pl-1 ${
                    uname.state === 'available' ? 'text-green-600'
                    : uname.state === 'checking' ? 'text-[#90A4AE]'
                    : 'text-red-500'}`}>
                    {uname.state === 'available' ? '✓ ' : uname.state === 'taken' ? '✕ ' : ''}{uname.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelCls}>Email</label>
                <input type="email" name="email" value={form.email}
                       onChange={handleChange} placeholder="you@example.com" required
                       className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Password</label>
                <input type="password" name="password" value={form.password}
                       onChange={handleChange} placeholder="Min. 6 characters" required
                       className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Confirm Password</label>
                <input type="password" name="confirmPassword" value={form.confirmPassword}
                       onChange={handleChange} placeholder="Re-enter password" required
                       className={inputCls} />
              </div>

           
<div className="flex items-center gap-2.5 pt-1 select-none">
  <label className="relative cursor-pointer">
    <input 
      type="checkbox" 
      checked={agree} 
      onChange={(e) => setAgree(e.target.checked)}
      className="peer sr-only" 
    />
    <div className="w-5 h-5 rounded-md border-2 border-[#BBDEFB] bg-white hover:border-[#1565C0] peer-checked:bg-[#1565C0] peer-checked:border-[#1565C0] transition flex items-center justify-center shrink-0">
      {agree && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  </label>
  
  {/* Clicking this text navigates to the page; it does NOT toggle the checkbox */}
  <span className="text-[#546E7A] text-sm leading-tight">
    I agree to all{' '}
    <Link 
      to="/terms" 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-[#1565C0] font-semibold hover:underline cursor-pointer"
    >
      terms &amp; conditions
    </Link>
  </span>
</div>

              <button type="submit"
                      disabled={loading || uname.state === 'checking' || uname.state === 'taken' || uname.state === 'invalid'}
                      className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-300/40 text-sm mt-2 btn-hover">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-[#E3F2FD]" />
              <span className="text-[#90A4AE] text-xs uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-[#E3F2FD]" />
            </div>

            <p className="text-center text-[#546E7A] text-sm mb-2">
              Already have an account?{' '}
              <Link to="/login" className="text-[#1565C0] font-semibold hover:underline">
                Sign in
              </Link>
            </p>

          </div>
        </div>
      </div>

    </div>
  );
}