import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/home',    label: 'Home',    icon: (a) => <svg className="w-5 h-5" fill={a?'currentColor':'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
  { to: '/search',  label: 'Search',  icon: (a) => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a?2.5:2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg> },
  { to: '/add-idea',label: 'Add',     isAdd: true, icon: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg> },
  { to: '/premium', label: 'Premium', icon: (a) => <svg className="w-5 h-5" fill={a?'currentColor':'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg> },
  { to: '/profile', label: 'Profile', icon: (a) => <svg className="w-5 h-5" fill={a?'currentColor':'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50
                    bg-white border-t border-[#E3F2FD]
                    flex items-center justify-around
                    px-2 pt-2 pb-4 h-16 shadow-lg shadow-blue-100/50">
      {NAV.map(({ to, label, icon, isAdd }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 min-w-[56px] transition-all
             ${isAdd ? '' : isActive ? 'text-[#1565C0]' : 'text-[#90A4AE] hover:text-[#1565C0]'}`
          }>
          {({ isActive }) =>
            isAdd ? (
              <div className="w-12 h-12 -mt-5 bg-[#1565C0] rounded-2xl
                              flex items-center justify-center text-white
                              shadow-lg shadow-blue-300/50 active:scale-95 transition-transform">
                {icon(false)}
              </div>
            ) : (
              <>
                {icon(isActive)}
                <span className={`text-[10px] font-medium
                  ${isActive ? 'text-[#1565C0]' : 'text-[#90A4AE]'}`}>
                  {label}
                </span>
              </>
            )
          }
        </NavLink>
      ))}
    </nav>
  );
}
