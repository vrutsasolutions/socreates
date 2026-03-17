import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';

export default function EditProfile() {
  const navigate    = useNavigate();
  const { user, login } = useAuth();
  const fileRef     = useRef();

  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [avatar, setAvatar]   = useState(null);
  const [preview, setPreview] = useState(user?.profileImage || null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [section, setSection] = useState('profile'); // 'profile' | 'password'

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) { setAvatar(file); setPreview(URL.createObjectURL(file)); }
  };

  const handleSave = async () => {
    setError(''); setSuccess(''); setSaving(true);
    try {
      const fd = new FormData();
      fd.append('profile', new Blob([JSON.stringify({ name: form.name, bio: form.bio })], { type: 'application/json' }));
      if (avatar) fd.append('image', avatar);
      const { data } = await api.put('/users/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      login(data, localStorage.getItem('token'));
      setSuccess('Profile updated!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    setError(''); setSuccess('');
    if (passwords.newPass !== passwords.confirm) return setError('New passwords do not match');
    if (passwords.newPass.length < 6) return setError('Password must be at least 6 characters');
    setSaving(true);
    try {
      await api.put('/users/me/password', { currentPassword: passwords.current, newPassword: passwords.newPass });
      setPasswords({ current: '', newPass: '', confirm: '' });
      setSuccess('Password changed successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
    setSaving(false);
  };

  const inputCls = 'w-full bg-[#0f0f1a] border border-[#2a2a3e] rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition';

  return (
    <div className="min-h-screen bg-[#0f0f1a] pb-10">
      <header className="sticky top-0 z-30 bg-[#0f0f1a]/90 backdrop-blur-xl border-b border-[#2a2a3e] px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Edit Profile</h1>
      </header>

      {/* Section tabs */}
      <div className="flex gap-2 px-4 pt-5 pb-2">
        {['profile','password'].map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all
              ${section === s ? 'bg-violet-600 text-white' : 'bg-[#1a1a2e] text-slate-400 border border-[#2a2a3e]'}`}>
            {s === 'profile' ? '👤 Profile' : '🔒 Password'}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-5">
        {error   && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}
        {success && <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm">✓ {success}</div>}

        {section === 'profile' && <>
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24">
              {preview ? (
                <img src={preview} alt="avatar" className="w-24 h-24 rounded-3xl object-cover"/>
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
              <button onClick={() => fileRef.current.click()} className="absolute -bottom-2 -right-2 w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center text-white text-sm shadow-lg">📷</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden"/>
            <p className="text-slate-500 text-xs">Tap the camera to change photo</p>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">Display Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" className={inputCls}/>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">Bio</label>
            <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} rows={3} placeholder="Tell people about yourself..." className={`${inputCls} resize-none`}/>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">Email</label>
            <input value={form.email} disabled className={`${inputCls} opacity-50 cursor-not-allowed`}/>
            <p className="text-slate-600 text-xs mt-1">Email cannot be changed</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </>}

        {section === 'password' && <>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">Current Password</label>
            <input type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} placeholder="••••••••" className={inputCls}/>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">New Password</label>
            <input type="password" value={passwords.newPass} onChange={e => setPasswords({...passwords, newPass: e.target.value})} placeholder="Min. 6 characters" className={inputCls}/>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">Confirm New Password</label>
            <input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} placeholder="Repeat new password" className={inputCls}/>
          </div>
          <button onClick={handlePasswordChange} disabled={saving}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50">
            {saving ? 'Updating...' : 'Change Password'}
          </button>
        </>}
      </div>
    </div>
  );
}
