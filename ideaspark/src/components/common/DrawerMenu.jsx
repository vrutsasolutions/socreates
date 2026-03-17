import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const MENU_ITEMS = [
  { to: '/profile',    label: 'Profile',       emoji: '👤' },
  { to: '/saved',      label: 'Saved Ideas',   emoji: '🔖' },
  { to: '/premium',    label: 'Premium',       emoji: '⭐' },
  { to: '/membership', label: 'Membership',    emoji: '💎' },
  { to: '/settings',   label: 'Settings',      emoji: '⚙️' },
];

export default function DrawerMenu({ open, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleLogout = () => { onClose(); logout(); navigate('/login'); };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
           className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300
             ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

      {/* Drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 z-50 bg-white
                       border-r border-[#E3F2FD] flex flex-col
                       transition-transform duration-300 ease-out shadow-2xl
                       ${open ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Header */}
        <div className="bg-[#1565C0] px-6 pt-12 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white
                            flex items-center justify-center text-[#1565C0]
                            text-xl font-black shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold truncate">{user?.name}</div>
              <div className="text-blue-200 text-xs truncate">{user?.email}</div>
              {user?.isPremium && (
                <div className="inline-flex items-center gap-1 mt-1
                                bg-yellow-400/20 text-yellow-300
                                text-xs font-semibold px-2 py-0.5 rounded-full">
                  ⭐ Premium
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {MENU_ITEMS.map(({ to, label, emoji }) => (
            <Link key={to} to={to} onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl
                             text-[#546E7A] hover:text-[#1565C0] hover:bg-[#F0F6FF]
                             transition-all duration-150 mb-1 group">
              <span className="text-lg w-7 text-center">{emoji}</span>
              <span className="font-medium text-sm">{label}</span>
              <svg className="w-3.5 h-3.5 ml-auto text-[#BBDEFB] group-hover:text-[#1565C0] transition-colors"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[#E3F2FD]">
          <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                             text-red-400 hover:bg-red-50 transition-all">
            <span className="text-lg w-7 text-center">🚪</span>
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
