import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { checkUsername } from '../api/authApi';

const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

export default function EditProfile() {
  const navigate        = useNavigate();
  const { user, login } = useAuth();
  const fileRef         = useRef();

  const originalUsername = user?.username || '';
  const originalUsernameRef = useRef(originalUsername); // stable read for the effect
  const [form, setForm]         = useState({ name: user?.name || '', username: originalUsername, bio: user?.bio || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [avatar, setAvatar]     = useState(null);
  const [preview, setPreview]   = useState(user?.profileImage || null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [section, setSection]   = useState('profile');
  // Username availability: 'idle' | 'invalid' | 'checking' | 'available' | 'taken'
  const [uname, setUname]       = useState({ state: 'idle', message: '' });
  const reqId = useRef(0);

  const handleUsernameChange = (e) => {
    const next = e.target.value.toLowerCase().trim();
    setForm({ ...form, username: next });
    // Reset status immediately for the unchanged/empty cases; the effect
    // handles validation + the debounced availability check for the rest.
    if (!next || next === originalUsernameRef.current) setUname({ state: 'idle', message: '' });
  };

  // Debounced availability check — only runs for a changed, non-empty handle.
  // All status updates happen inside the timeout callback (never synchronously
  // in the effect body) so a keystroke doesn't trigger a cascading render.
  useEffect(() => {
    const u = form.username;
    if (!u || u === originalUsernameRef.current) return; // idle handled in the change handler
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      if (!USERNAME_RE.test(u)) {
        setUname({ state: 'invalid', message: '3–30 chars: a–z, 0–9, . or _' });
        return;
      }
      setUname({ state: 'checking', message: 'Checking availability…' });
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

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) { setAvatar(file); setPreview(URL.createObjectURL(file)); }
  };

  const handleSave = async () => {
    const usernameChanged = form.username !== originalUsername;
    if (usernameChanged && !USERNAME_RE.test(form.username)) { setError('Please choose a valid username'); return; }
    if (usernameChanged && uname.state === 'taken') { setError('That username is already taken'); return; }
    setError(''); setSuccess(''); setSaving(true);
    try {
      // Only send username when it actually changed.
      const profile = { name: form.name, bio: form.bio };
      if (usernameChanged) profile.username = form.username;
      const fd = new FormData();
      fd.append('profile', new Blob([JSON.stringify(profile)], { type: 'application/json' }));
      if (avatar) fd.append('avatar', avatar);
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

  const inputCls = 'w-full bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl px-4 py-3 text-black placeholder-[#90A4AE] text-sm focus:outline-none focus:border-[#1565C0] focus:ring-1 focus:ring-[#1565C0] transition';

  return (
    <div className="min-h-screen bg-[#F0F6FF] pb-10">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Edit Profile</h1>
      </header>

      {/* Section Tabs */}
      <div className="flex gap-2 px-4 pt-5 pb-2">
        {['profile', 'password'].map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium capitalize transition-all
              ${section === s
                ? 'bg-[#1565C0] text-white shadow-md shadow-blue-200'
                : 'bg-white text-black border border-[#BBDEFB] hover:border-[#1565C0]'}`}>
            {s === 'profile' ? '👤 Profile' : '🔒 Password'}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-5">

        {/* Alerts */}
        {error   && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-500 text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-green-600 text-sm">✓ {success}</div>}

        {/* Profile Section */}
        {section === 'profile' && <>
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24">
              {preview ? (
                <img src={preview} alt="avatar" className="w-24 h-24 rounded-3xl object-cover border-2 border-[#BBDEFB]"/>
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-[#1565C0] flex items-center justify-center text-white text-4xl font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
              <button onClick={() => fileRef.current.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#1565C0] rounded-2xl flex items-center justify-center text-white text-sm shadow-md">
                📷
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden"/>
            <p className="text-[#90A4AE] text-xs">Tap the camera to change photo</p>
          </div>

          <div>
            <label className="block text-black text-xs font-semibold uppercase tracking-widest mb-2">Display Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              placeholder="Your name" className={inputCls}/>
          </div>

          <div>
            <label className="block text-black text-xs font-semibold uppercase tracking-widest mb-2">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#90A4AE] text-sm">@</span>
              <input value={form.username} onChange={handleUsernameChange}
                placeholder="yourname" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                className={`${inputCls} pl-7 ${
                  uname.state === 'available' ? 'border-green-400 focus:border-green-500 focus:ring-green-500'
                  : uname.state === 'taken' || uname.state === 'invalid' ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                  : ''}`}/>
            </div>
            {!originalUsername && (
              <p className="text-[#90A4AE] text-xs mt-1">You don't have a username yet — pick one.</p>
            )}
            {uname.message && (
              <p className={`text-xs mt-1 ${
                uname.state === 'available' ? 'text-green-600'
                : uname.state === 'checking' ? 'text-[#90A4AE]'
                : 'text-red-500'}`}>
                {uname.state === 'available' ? '✓ ' : uname.state === 'taken' ? '✕ ' : ''}{uname.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-black text-xs font-semibold uppercase tracking-widest mb-2">Bio</label>
            <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
              rows={3} placeholder="Tell people about yourself..."
              className={`${inputCls} resize-none`}/>
          </div>

          <div>
            <label className="block text-black text-xs font-semibold uppercase tracking-widest mb-2">Email</label>
            <input value={form.email} disabled className={`${inputCls} opacity-50 cursor-not-allowed`}/>
            <p className="text-[#90A4AE] text-xs mt-1">Email cannot be changed</p>
          </div>

          <button onClick={handleSave}
            disabled={saving || uname.state === 'checking' || uname.state === 'taken' || uname.state === 'invalid'}
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition-all shadow-md shadow-blue-200 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </>}

        {/* Password Section */}
        {section === 'password' && <>
          <div>
            <label className="block text-black text-xs font-semibold uppercase tracking-widest mb-2">Current Password</label>
            <input type="password" value={passwords.current}
              onChange={e => setPasswords({...passwords, current: e.target.value})}
              placeholder="••••••••" className={inputCls}/>
          </div>

          <div>
            <label className="block text-black text-xs font-semibold uppercase tracking-widest mb-2">New Password</label>
            <input type="password" value={passwords.newPass}
              onChange={e => setPasswords({...passwords, newPass: e.target.value})}
              placeholder="Min. 6 characters" className={inputCls}/>
          </div>

          <div>
            <label className="block text-black text-xs font-semibold uppercase tracking-widest mb-2">Confirm New Password</label>
            <input type="password" value={passwords.confirm}
              onChange={e => setPasswords({...passwords, confirm: e.target.value})}
              placeholder="Repeat new password" className={inputCls}/>
          </div>

          <button onClick={handlePasswordChange} disabled={saving}
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition-all shadow-md shadow-blue-200 disabled:opacity-50">
            {saving ? 'Updating...' : 'Change Password'}
          </button>
        </>}
      </div>
    </div>
  );
}
