import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/common/Icon';

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/home', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* Blue header */}
      <div className="bg-[#1565C0] px-6 pt-16 pb-24 text-center relative overflow-hidden shadow-lg border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
          <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl mb-5 shadow-xl">
            <Icon name="lightbulb" className="w-10 h-10 text-amber-300" />
          </div>
          <h1 className="text-white text-3xl font-black tracking-tight">SoCreate</h1>
          <p className="text-blue-200 text-sm mt-2">Where ideas come alive</p>
        </div>
      </div>

      {/* Content wrapper — matches Home's rounded-t-[32px] white card */}
      <div className="bg-[#1565C0]">
        <div className="bg-white rounded-t-[32px] pt-8 flex-1 flex flex-col items-center px-6">

          <p className="text-[#546E7A] text-sm text-center leading-relaxed max-w-xs mb-8">
            Discover, share, and save creative ideas from brilliant minds around the world.
          </p>

          {/* Feature chips — matches Home's tab pill style */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              { icon: 'lightbulb', label: 'Share Ideas' },
              { icon: 'search',    label: 'Discover' },
              { icon: 'star',      label: 'Go Premium' },
              { icon: 'shield',    label: 'Original' },
            ].map((f) => (
              <div key={f.label} className="bg-[#F0F6FF] border border-[#BBDEFB] text-[#1565C0] text-xs font-semibold px-3 py-1.5 rounded-2xl inline-flex items-center gap-1.5">
                <Icon name={f.icon} className="w-3.5 h-3.5" />{f.label}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-8 mb-10">
            {[['10K+', 'Ideas'], ['5K+', 'Creators'], ['50K+', 'Users']].map(([n, l]) => (
              <div key={l} className="text-center">
                <div className="text-[#1565C0] font-black text-xl">{n}</div>
                <div className="text-[#90A4AE] text-xs mt-0.5">{l}</div>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="pb-10 space-y-3 w-full max-w-sm">
            <button onClick={() => navigate('/register')}
              className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl text-sm transition-all active:scale-95 shadow-lg shadow-blue-300/40 btn-hover">
              Get Started — It's Free
            </button>
            <button onClick={() => navigate('/login')}
              className="w-full bg-[#F0F6FF] border border-[#BBDEFB] hover:bg-[#DBEAFE] hover:border-[#1565C0] text-[#1565C0] font-semibold py-4 rounded-2xl text-sm transition-all active:scale-95 btn-hover">
              I already have an account
            </button>
            <p className="text-center text-[#90A4AE] text-xs pt-1">
              By continuing, you agree to our Terms of Service
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}