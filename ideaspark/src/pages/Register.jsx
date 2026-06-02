import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser, sendOtp, checkUsername } from '../api/authApi';

const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]       = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  // Username availability: 'idle' | 'invalid' | 'checking' | 'available' | 'taken'
  const [uname, setUname]     = useState({ state: 'idle', message: '' });
  const reqId = useRef(0); // guards against out-of-order responses

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Username inputs are forced lowercase, like Instagram handles.
  const handleUsernameChange = (e) =>
    setForm({ ...form, username: e.target.value.toLowerCase().trim() });

  // Debounced availability check while the user types.
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
        if (id !== reqId.current) return; // a newer keystroke superseded this
        setUname(data.success
          ? { state: 'available', message: 'Username is available' }
          : { state: 'taken',     message: data.message || 'Username is not available' });
      } catch {
        if (id !== reqId.current) return;
        setUname({ state: 'idle', message: '' }); // don't block on a check failure
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form.username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!USERNAME_RE.test(form.username)) { setError('Please choose a valid username'); return; }
    if (uname.state === 'taken') { setError('That username is already taken'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setLoading(true);
    try {
      const { data } = await registerUser(form);
      login(data.user, data.token);
      // Send the verification code, then route into the OTP step.
      try { await sendOtp(form.email); } catch { /* non-blocking */ }
      navigate('/verify-otp', { state: { email: form.email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <div className="bg-[#1565C0] px-6 pt-14 pb-16 text-center relative">
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-white rounded-t-[2rem]" />
        <div className="inline-flex items-center justify-center w-16 h-16
                        bg-white rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl">💡</span>
        </div>
        <h1 className="text-white text-2xl font-bold">Join IdeaSpark</h1>
        <p className="text-blue-200 text-sm mt-1">Start sharing your ideas today</p>
      </div>

      <div className="flex-1 px-6 py-6 max-w-sm mx-auto w-full">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
                          text-sm rounded-2xl px-4 py-3 mb-5">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[{ name: 'name', type: 'text', label: 'Full Name', placeholder: 'John Doe' }]
            .map(({ name, type, label, placeholder }) => (
            <div key={name}>
              <label className="block text-[#1565C0] text-xs font-semibold
                                uppercase tracking-widest mb-2">{label}</label>
              <input type={type} name={name} value={form[name]}
                     onChange={handleChange} placeholder={placeholder} required
                     className="w-full bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl
                                px-4 py-3.5 text-[#0D2137] placeholder-[#90A4AE] text-sm
                                focus:outline-none focus:border-[#1565C0]
                                focus:ring-2 focus:ring-[#1565C0]/20 transition" />
            </div>
          ))}

          {/* Username — Instagram-style unique handle with live availability */}
          <div>
            <label className="block text-[#1565C0] text-xs font-semibold
                              uppercase tracking-widest mb-2">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#90A4AE] text-sm">@</span>
              <input type="text" name="username" value={form.username}
                     onChange={handleUsernameChange} placeholder="yourname" required
                     autoCapitalize="none" autoCorrect="off" spellCheck={false}
                     className={`w-full bg-[#F0F6FF] border rounded-2xl
                                pl-8 pr-4 py-3.5 text-[#0D2137] placeholder-[#90A4AE] text-sm
                                focus:outline-none focus:ring-2 transition
                                ${uname.state === 'available' ? 'border-green-400 focus:border-green-500 focus:ring-green-500/20'
                                  : uname.state === 'taken' || uname.state === 'invalid' ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
                                  : 'border-[#BBDEFB] focus:border-[#1565C0] focus:ring-[#1565C0]/20'}`} />
            </div>
            {uname.message && (
              <p className={`text-xs mt-1.5 ${
                uname.state === 'available' ? 'text-green-600'
                : uname.state === 'checking' ? 'text-[#90A4AE]'
                : 'text-red-500'}`}>
                {uname.state === 'available' ? '✓ ' : uname.state === 'taken' ? '✕ ' : ''}{uname.message}
              </p>
            )}
          </div>

          {[
            { name: 'email',    type: 'email',    label: 'Email',     placeholder: 'you@example.com' },
            { name: 'password', type: 'password', label: 'Password',  placeholder: 'Min. 6 characters' },
          ].map(({ name, type, label, placeholder }) => (
            <div key={name}>
              <label className="block text-[#1565C0] text-xs font-semibold
                                uppercase tracking-widest mb-2">{label}</label>
              <input type={type} name={name} value={form[name]}
                     onChange={handleChange} placeholder={placeholder} required
                     className="w-full bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl
                                px-4 py-3.5 text-[#0D2137] placeholder-[#90A4AE] text-sm
                                focus:outline-none focus:border-[#1565C0]
                                focus:ring-2 focus:ring-[#1565C0]/20 transition" />
            </div>
          ))}

          <button type="submit"
                  disabled={loading || uname.state === 'checking' || uname.state === 'taken' || uname.state === 'invalid'}
                  className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white
                             font-bold py-4 rounded-2xl transition-all active:scale-95
                             disabled:opacity-50 shadow-lg shadow-blue-300/40 text-sm mt-2">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#E3F2FD]" />
          <span className="text-[#90A4AE] text-xs">or</span>
          <div className="flex-1 h-px bg-[#E3F2FD]" />
        </div>

        <p className="text-center text-[#546E7A] text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-[#1565C0] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
