import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api/authApi';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setLoading(true);
    try {
      const { data } = await registerUser(form);
      login(data.user, data.token);
      navigate('/select-interests');
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
          {[
            { name: 'name',     type: 'text',     label: 'Full Name', placeholder: 'John Doe' },
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

          <button type="submit" disabled={loading}
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
