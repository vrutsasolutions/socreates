import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/common/Icon';
import { deleteAccount } from '../api/userApi';

const Toggle = ({ value, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    onClick={() => onChange(!value)}
    className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 shrink-0
      ${value ? 'bg-[#1565C0]' : 'bg-[#CBD5E1]'}`}
  >
    <span
      className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200
        ${value ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
    />
  </button>
);

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [notifs, setNotifs] = useState({ newIdeas: true, likes: true, comments: false });
  const [privacy, setPrivacy] = useState({ publicProfile: true, showActivity: true });
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      alert('Please enter your password.');
      return;
    }

    try {
      setDeleting(true);
      await deleteAccount(deletePassword);
      logout();
      navigate('/');
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeletePassword('');
    }
  };

  const Section = ({ title, children }) => (
    <div className="mb-6">
      <h2 className="text-[#90A4AE] text-xs font-semibold uppercase tracking-widest px-4 mb-2">{title}</h2>
      <div className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl overflow-hidden card-hover">{children}</div>
    </div>
  );

  const Row = ({ icon, label, sublabel, right, onClick, danger }) => (
    <div onClick={onClick} className={`flex items-center gap-3 px-4 py-4 border-b border-[#BBDEFB] last:border-0 drawer-item-hover
      ${onClick && !right ? 'cursor-pointer active:bg-[#BBDEFB]/50' : ''}`}>
      <span className="w-7 flex items-center justify-center shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${danger ? 'text-red-500' : 'text-[#1565C0]'}`}>{label}</div>
        {sublabel && <div className="text-xs text-[#90A4AE] mt-0.5">{sublabel}</div>}
      </div>
      {right || (onClick && !right
        ? <svg className="w-4 h-4 text-[#BBDEFB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        : null
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-24">
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 py-4 flex items-center gap-3 relative overflow-hidden">
        <div className="pointer-events-none absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
        <div className="pointer-events-none absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white font-bold text-lg">Settings</h1>
      </header>

      <div className="bg-[#1565C0]">
        <div className="flex items-center gap-4 px-4 py-5 bg-[#1565C0]">
          <div className="w-14 h-14 rounded-2xl bg-[#BBDEFB] flex items-center justify-center text-[#1565C0] text-2xl font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold truncate">{user?.name}</div>
            <div className="text-blue-200 text-xs truncate">{user?.email}</div>
          </div>
          <button onClick={() => navigate('/edit-profile')} className="text-white text-xs font-medium border border-blue-300/40 px-3 py-1.5 rounded-2xl hover:bg-white/10 transition btn-hover">
            Edit
          </button>
        </div>

        <div className="bg-white rounded-t-[32px] pt-5 px-0">
          <Section title="Account">
            <Row icon={<Icon name="user" className="w-5 h-5 text-[#1565C0]" />} label="Edit Profile" onClick={() => navigate('/edit-profile')}/>
            <Row icon={<Icon name="gem" className="w-5 h-5 text-[#7C3AED]" />} label="Membership" sublabel={user?.isPremium ? 'Active Premium · Verified' : 'Free plan'} right={user?.isPremium ? <span className="text-[#10B981] text-xs font-semibold">Verified ✓</span> : undefined} onClick={() => navigate('/membership')}/>
            {user?.isPremium && (
              <Row icon={<svg className="w-5 h-5 text-[#1565C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>} label="My Subscription" sublabel="Plan details · Billing history · Cancel" onClick={() => navigate('/account/subscription')}/>
            )}
            <Row icon={<Icon name="bookmark" className="w-5 h-5 text-[#10B981]" />} label="Saved Ideas" onClick={() => navigate('/saved-ideas')}/>
          </Section>

          <Section title="Notifications">
            <Row icon={<Icon name="lightbulb"      className="w-5 h-5 text-[#F59E0B]" />} label="New Idea Alerts" sublabel="When creators you follow post" right={<Toggle value={notifs.newIdeas}    onChange={v => setNotifs({...notifs, newIdeas: v})}/>}/>
            <Row icon={<Icon name="heart"          className="w-5 h-5 text-[#EF4444]" />} label="Likes"           sublabel="When someone likes your idea"  right={<Toggle value={notifs.likes}      onChange={v => setNotifs({...notifs, likes: v})}/>}/>
            <Row icon={<Icon name="message-square" className="w-5 h-5 text-[#3B82F6]" />} label="Comments"        sublabel="When someone comments"         right={<Toggle value={notifs.comments}   onChange={v => setNotifs({...notifs, comments: v})}/>}/>
          </Section>

          <Section title="Privacy">
            <Row icon={<Icon name="globe"    className="w-5 h-5 text-[#3B82F6]" />} label="Public Profile"   sublabel="Others can find your profile" right={<Toggle value={privacy.publicProfile} onChange={v => setPrivacy({...privacy, publicProfile: v})}/>}/>
            <Row icon={<Icon name="activity" className="w-5 h-5 text-[#3347E8]" />} label="Activity Status"  sublabel="Show when you're active"      right={<Toggle value={privacy.showActivity}  onChange={v => setPrivacy({...privacy, showActivity: v})}/>}/>
          </Section>

          <Section title="Support">
            <Row icon={<Icon name="file-text"  className="w-5 h-5 text-[#546E7A]" />} label="Terms of Service" onClick={() => {}}/>
            <Row icon={<Icon name="lock"       className="w-5 h-5 text-[#546E7A]" />} label="Privacy Policy"   onClick={() => {}}/>
            <Row icon={<Icon name="headphones" className="w-5 h-5 text-[#546E7A]" />} label="Contact Support"  onClick={() => navigate('/assistant')}/>
          </Section>

          <Section title="Danger Zone">
            <Row icon={<Icon name="log-out" className="w-5 h-5 text-red-500" />} label="Logout" danger onClick={handleLogout}/>
            <Row
              icon={<Icon name="trash" className="w-5 h-5 text-red-500" />}
              label={deleting ? 'Deleting...' : 'Delete Account'}
              sublabel="Permanently delete your account and data"
              danger
              onClick={() => setShowDeleteConfirm(true)}
            />
          </Section>

          <p className="text-center text-[#90A4AE] text-xs pb-6">SoCreate v1.0.0</p>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-lg">
            <h2 className="text-lg font-bold text-red-600 mb-2">Delete Account</h2>
            <p className="text-sm text-[#546E7A] mb-4">
              This action cannot be undone. Please enter your password to confirm account deletion.
            </p>

            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full border border-[#BBDEFB] rounded-xl px-3 py-2 text-sm outline-none mb-4"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                }}
                className="flex-1 py-2 rounded-xl border border-[#CBD5E1] text-[#546E7A] text-sm font-medium"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}