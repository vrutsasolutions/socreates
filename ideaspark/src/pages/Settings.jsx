import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Toggle = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)}
    className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0
      ${value ? 'bg-[#1565C0]' : 'bg-[#BBDEFB]'}`}>
    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow
      ${value ? 'translate-x-6' : 'translate-x-1'}`}/>
  </button>
);

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [notifs, setNotifs] = useState({ newIdeas: true, likes: true, comments: false, newsletter: false });
  const [privacy, setPrivacy] = useState({ publicProfile: true, showSaved: false, showActivity: true });

  const handleLogout = () => { logout(); navigate('/login'); };

  const Section = ({ title, children }) => (
    <div className="mb-6">
      <h2 className="text-[#90A4AE] text-xs font-semibold uppercase tracking-widest px-4 mb-2">{title}</h2>
      <div className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl overflow-hidden card-hover">{children}</div>
    </div>
  );

  const Row = ({ icon, label, sublabel, right, onClick, danger }) => (
    <div onClick={onClick} className={`flex items-center gap-3 px-4 py-4 border-b border-[#BBDEFB] last:border-0 drawer-item-hover
      ${onClick && !right ? 'cursor-pointer active:bg-[#BBDEFB]/50' : ''}`}>
      <span className="text-lg w-7 text-center shrink-0">{icon}</span>
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
        <button onClick={() => navigate(-1)} className="text-blue-200 hover:text-white transition btn-hover">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
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
            <Row icon="👤" label="Edit Profile"    onClick={() => navigate('/edit-profile')}/>
            <Row icon="💎" label="Membership"      sublabel={user?.isPremium ? 'Active Premium' : 'Free plan'} onClick={() => navigate('/membership')}/>
            <Row icon="🔖" label="Saved Ideas"     onClick={() => navigate('/saved-ideas')}/>
          </Section>

          <Section title="Notifications">
            <Row icon="💡" label="New Idea Alerts"  sublabel="When creators you follow post"  right={<Toggle value={notifs.newIdeas}    onChange={v => setNotifs({...notifs, newIdeas: v})}/>}/>
            <Row icon="❤️" label="Likes"            sublabel="When someone likes your idea"   right={<Toggle value={notifs.likes}      onChange={v => setNotifs({...notifs, likes: v})}/>}/>
            <Row icon="💬" label="Comments"         sublabel="When someone comments"          right={<Toggle value={notifs.comments}   onChange={v => setNotifs({...notifs, comments: v})}/>}/>
            <Row icon="📧" label="Newsletter"       sublabel="Weekly top ideas digest"        right={<Toggle value={notifs.newsletter} onChange={v => setNotifs({...notifs, newsletter: v})}/>}/>
          </Section>

          <Section title="Privacy">
            <Row icon="🌐" label="Public Profile"   sublabel="Others can find your profile"   right={<Toggle value={privacy.publicProfile} onChange={v => setPrivacy({...privacy, publicProfile: v})}/>}/>
            <Row icon="🔖" label="Show Saved Ideas" sublabel="Visible on your profile"        right={<Toggle value={privacy.showSaved}     onChange={v => setPrivacy({...privacy, showSaved: v})}/>}/>
            <Row icon="📊" label="Activity Status"  sublabel="Show when you're active"        right={<Toggle value={privacy.showActivity}  onChange={v => setPrivacy({...privacy, showActivity: v})}/>}/>
          </Section>

          <Section title="Support">
            <Row icon="📋" label="Terms of Service" onClick={() => {}}/>
            <Row icon="🔐" label="Privacy Policy"   onClick={() => {}}/>
            <Row icon="💬" label="Contact Support"  onClick={() => {}}/>
            <Row icon="⭐" label="Rate the App"     onClick={() => {}}/>
          </Section>

          <Section title="Danger Zone">
            <Row icon="🚪" label="Logout" danger onClick={handleLogout}/>
            <Row icon="🗑️" label="Delete Account" sublabel="Permanently delete your account and data" danger onClick={() => {}}/>
          </Section>

          <p className="text-center text-[#90A4AE] text-xs pb-6">IdeaSpark v1.0.0</p>
        </div>
      </div>
    </div>
  );
}