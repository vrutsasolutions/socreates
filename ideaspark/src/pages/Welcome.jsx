import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/home', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">

      {/* Blue header */}
      <div className="bg-[#1565C0] px-6 pt-16 pb-20 text-center relative overflow-hidden">
        <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
        <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#F4F7FF] rounded-t-[2rem]" />
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl mb-5 shadow-xl">
          <span className="text-4xl">💡</span>
        </div>
        <h1 className="text-white text-3xl font-black tracking-tight">IdeaSpark</h1>
        <p className="text-blue-200 text-sm mt-2">Where ideas come alive</p>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pt-6">
        <p className="text-[#546E7A] text-sm text-center leading-relaxed max-w-xs mb-8">
          Discover, share, and save creative ideas from brilliant minds around the world.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {['💡 Share Ideas', '🔍 Discover', '⭐ Go Premium', '🛡️ Original'].map((f) => (
            <div key={f} className="bg-[#F0F6FF] border border-[#BBDEFB] text-[#1565C0] text-xs font-medium px-3 py-1.5 rounded-full">
              {f}
            </div>
          ))}
        </div>

        <div className="flex gap-8 mb-8">
          {[['10K+', 'Ideas'], ['5K+', 'Creators'], ['50K+', 'Users']].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="text-[#1565C0] font-black text-xl">{n}</div>
              <div className="text-[#90A4AE] text-xs">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-10 space-y-3 max-w-sm mx-auto w-full">
        <button onClick={() => navigate('/register')}
                className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl text-sm transition-all active:scale-95 shadow-lg shadow-blue-300/40 btn-hover">
          Get Started — It's Free
        </button>
        <button onClick={() => navigate('/login')}
                className="w-full bg-[#F0F6FF] border border-[#BBDEFB] hover:bg-[#E3F2FD] text-[#1565C0] font-semibold py-4 rounded-2xl text-sm transition-all active:scale-95 btn-hover">
          I already have an account
        </button>
        <p className="text-center text-[#90A4AE] text-xs pt-1">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}