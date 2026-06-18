import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const inputCls =
  'w-full bg-[#F4F7FF] border border-[#BBDEFB] rounded-2xl px-4 py-3 text-[#0D2137] text-sm focus:outline-none focus:border-[#1565C0]';

/* ── Shared header — blue bg + decorative circles + floating subtitle card ── */
function Header({ title, subtitle, onBack }) {
  return (
    <header className="bg-[#1565C0] px-4 pt-4 pb-10 relative shadow-lg border-b border-white/10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
        <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-10 -left-8" />
      </div>

      <div className="flex items-center gap-3 relative z-10">
        {onBack ? (
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div className="w-9" />
        )}
        <h1 className="text-white font-bold text-lg flex-1 text-center">{title}</h1>
        <div className="w-9" />
      </div>

      {subtitle && (
        <div className="relative z-10 mt-5 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3">
          <p className="text-blue-100 text-sm">{subtitle}</p>
        </div>
      )}
    </header>
  );
}

/* ── White sheet wrapper that sits below the blue header ── */
function Sheet({ children, className = '' }) {
  return (
    <div className="bg-[#1565C0]">
      <div className={`bg-white rounded-t-[32px] px-4 pt-6 pb-10 ${className}`}>
        {children}
      </div>
    </div>
  );
}

export default function ProfileVerification() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [params] = useSearchParams();
  const origin = params.get('from') || 'settings';

  const initialView = () => {
    const s = user?.verificationStatus;
    if (s === 'pending')  return 'pending';
    if (s === 'approved') return 'approved';
    if (s === 'rejected') return 'rejected';
    return 'form';
  };

  const [view, setView]               = useState(initialView);
  const [form, setForm]               = useState({
    fullName:  user?.name  || '',
    bio:       user?.bio   || '',
    portfolio: '',
    social:    '',
  });
  const [faceVerified, setFaceVerified] = useState(!!user?.verified);
  const [docName, setDocName]           = useState('');
  const [stage, setStage]               = useState(0);
  const [camReady, setCamReady]         = useState(false);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const onChange   = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const canSubmit  = form.fullName.trim() && form.bio.trim() && faceVerified;

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamReady(false);
  };

  useEffect(() => {
    if (view !== 'face') return;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      } catch { if (!cancelled) setView('failed'); }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [view]);

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (view !== 'processing') return;
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 900);
    const t2 = setTimeout(() => setStage(2), 1800);
    const t3 = setTimeout(() => setView('success'), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [view]);

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (v && c && v.videoWidth) {
      c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    }
    stopCamera();
    setView('processing');
  };

  const submitApplication = () => {
    updateUser({ verificationStatus: 'pending', name: form.fullName.trim() || user?.name, bio: form.bio.trim() });
    setView('pending');
  };

  const approve = () => { updateUser({ verificationStatus: 'approved', verified: true });  setView('approved'); };
  const reject  = () => { updateUser({ verificationStatus: 'rejected', verified: false }); setView('rejected'); };
  const reapply = () => { updateUser({ verificationStatus: 'none' }); setFaceVerified(false); setView('form'); };

  /* ── FORM ── */
  if (view === 'form') return (
    <div className="min-h-screen">
      <Header
        title="Creator Verification"
        subtitle="Apply for a verified creator badge"
        onBack={() => navigate(-1)}
      />
      <Sheet>
        {user?.verified && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2 mb-5">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            Your profile is verified.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#0D2137]">Full Name</label>
            <input name="fullName" value={form.fullName} onChange={onChange} className={`${inputCls} mt-1`} />
          </div>
          <div>
            <label className="text-xs font-bold text-[#0D2137]">Creator Bio</label>
            <textarea name="bio" value={form.bio} onChange={onChange} rows={3} className={`${inputCls} mt-1`} />
          </div>
          <div>
            <label className="text-xs font-bold text-[#0D2137]">Portfolio / Website</label>
            <input name="portfolio" value={form.portfolio} onChange={onChange} className={`${inputCls} mt-1`} />
          </div>
          <div>
            <label className="text-xs font-bold text-[#0D2137]">Social Media</label>
            <input name="social" value={form.social} onChange={onChange} className={`${inputCls} mt-1`} />
          </div>
        </div>

        {/* Face verification */}
        <div className="mt-5">
          <h2 className="text-[#1565C0] font-bold text-base mb-2">Live Face Verification</h2>
          <div className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[#0D2137] font-semibold text-sm">Verify your identity</p>
              <p className={`text-xs mt-0.5 ${faceVerified ? 'text-[#10B981]' : 'text-[#90A4AE]'}`}>
                {faceVerified ? 'Identity confirmed ✓' : 'Required before submitting'}
              </p>
            </div>
            <button
              onClick={() => setView('face')}
              className="shrink-0 bg-[#1565C0] hover:bg-[#0D47A1] text-white font-semibold text-sm px-5 py-2.5 rounded-2xl active:scale-95 transition-all"
            >
              {faceVerified ? 'Re-verify' : 'Verify'}
            </button>
          </div>
        </div>

        {/* ID upload */}
        <div className="mt-4">
          <label className="text-xs font-bold text-[#0D2137]">ID Proof / Work Samples</label>
          <label className="mt-1 h-20 border-dashed border-2 border-[#BBDEFB] rounded-2xl flex items-center justify-center bg-[#F4F7FF] text-[#1565C0] font-semibold text-sm cursor-pointer">
            {docName || 'Upload Documents'}
            <input type="file" hidden accept="image/*,application/pdf"
              onChange={(e) => setDocName(e.target.files?.[0]?.name || '')} />
          </label>
        </div>

        <button
          onClick={submitApplication}
          disabled={!canSubmit}
          className="mt-6 w-full bg-[#1565C0] disabled:opacity-40 text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]"
        >
          Submit Application
        </button>

        {!canSubmit && (
          <p className="text-center text-[#90A4AE] text-xs mt-2">
            Add your name, bio, and complete face verification to submit.
          </p>
        )}

        {origin === 'onboarding' && (
          <button onClick={() => navigate('/home')} className="w-full text-[#1565C0] font-semibold py-2 text-sm mt-2">
            Skip for now
          </button>
        )}
      </Sheet>
    </div>
  );

  /* ── FACE ── */
  if (view === 'face') return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">
      <Header title="Face Verification" onBack={() => setView('form')} />
      <Sheet className="flex-1 flex flex-col">
        <h2 className="text-[#0D2137] font-bold text-base mb-4">Position your face inside the frame</h2>
        <div className="bg-[#F4F7FF] rounded-[28px] p-5 flex items-center justify-center">
          <div className="relative w-56 h-72 rounded-full overflow-hidden bg-[#EAF1FB] border-2 border-[#1565C0]">
            <video
              ref={videoRef} autoPlay playsInline muted
              onCanPlay={() => setCamReady(true)}
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {!camReady && (
              <div className="absolute inset-0 flex items-center justify-center text-[#90A4AE] text-sm">
                Starting camera…
              </div>
            )}
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <ul className="mt-6 space-y-2 text-[#37474F] text-sm">
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#10B981] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            Keep face centred
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#10B981] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            Remove sunglasses
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#10B981] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            Ensure good lighting
          </li>
        </ul>

        <div className="mt-auto pt-6 space-y-3">
          <button
            onClick={capture} disabled={!camReady}
            className="w-full bg-[#1565C0] disabled:opacity-40 text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]"
          >
            Capture Selfie
          </button>
          <button onClick={() => setView('form')} className="w-full text-[#1565C0] font-semibold py-3 text-sm">
            Cancel
          </button>
        </div>
      </Sheet>
    </div>
  );

  /* ── PROCESSING ── */
  if (view === 'processing') {
    const stages = ['Selfie Captured', 'Matching Face', 'Verifying Identity'];
    return (
      <div className="min-h-screen">
        <Header title="Verification Processing" />
        <Sheet>
          <div className="flex flex-col items-center text-center pt-4">
            <div className="w-36 h-36 rounded-full bg-[#F0F6FF] border border-[#BBDEFB] flex items-center justify-center mb-8">
              <svg className="w-16 h-16 text-[#1565C0] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
            </div>
            <h2 className="text-[#0D2137] font-bold text-xl mb-6">Verifying Identity</h2>
            <div className="space-y-4 w-full">
              {stages.map((s, i) => (
                <div key={s} className={`flex items-center gap-3 rounded-2xl px-4 py-3
                  ${i < stage  ? 'bg-[#ECFDF5] border border-[#A7F3D0]'
                  : i === stage ? 'bg-[#E3F2FD] border border-[#BBDEFB]'
                  : 'bg-[#F0F6FF] border border-transparent'}`}>
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0
                    ${i < stage  ? 'bg-[#10B981] text-white'
                    : i === stage ? 'bg-[#1565C0] text-white'
                    : 'bg-white text-[#90A4AE] border border-[#BBDEFB]'}`}>
                    {i < stage ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    ) : i === stage ? (
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    ) : '○'}
                  </div>
                  <span className={`text-sm font-semibold
                    ${i < stage ? 'text-[#065F46]' : i === stage ? 'text-[#0D2137]' : 'text-[#90A4AE]'}`}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[#90A4AE] text-sm mt-6">Please wait…</p>
          </div>
        </Sheet>
      </div>
    );
  }

  /* ── SUCCESS ── */
  if (view === 'success') return (
    <div className="min-h-screen">
      <Header title="Verification Complete" />
      <Sheet>
        <div className="flex flex-col items-center text-center pt-4">
          <div className="w-28 h-28 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center mb-6">
            <svg className="w-14 h-14 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-[#0D2137] font-bold text-xl mb-2">Face Verification Complete</h2>
          <p className="text-[#22C55E] font-semibold text-sm">Identity confirmed successfully</p>
          <div className="mt-auto w-full pt-10">
            <button
              onClick={() => { setFaceVerified(true); setView('form'); }}
              className="w-full bg-[#1565C0] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]"
            >
              Continue
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );

  /* ── PENDING ── */
  if (view === 'pending') return (
    <div className="min-h-screen">
      <Header title="Application Submitted" subtitle="Your application is under review" />
      <Sheet>
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-[#FFF8EC] border border-[#FDE68A] flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 className="text-[#0D2137] font-bold text-xl">Application Under Review</h2>
          <p className="text-[#90A4AE] text-sm mt-1">Usually takes 3–5 business days</p>
        </div>

        <div className="space-y-2.5">
          {[
            { label: 'Application Submitted', done: true },
            { label: 'Identity Verification',  active: true },
            { label: 'Content Review',         idle: true },
            { label: 'Badge Issued',           idle: true },
          ].map((s) => (
            <div key={s.label} className={`flex items-center gap-3 rounded-2xl px-4 py-3.5
              ${s.done   ? 'bg-[#ECFDF5] border border-[#A7F3D0]'
              : s.active ? 'bg-[#E3F2FD] border border-[#BBDEFB]'
              : 'bg-[#F0F6FF] border border-transparent'}`}>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0
                ${s.done   ? 'bg-[#10B981] text-white'
                : s.active ? 'bg-[#1565C0] text-white'
                : 'bg-white text-[#90A4AE] border border-[#BBDEFB]'}`}>
                {s.done ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                ) : s.active ? (
                  <div className="w-2 h-2 rounded-full bg-white" />
                ) : '○'}
              </div>
              <span className={`text-sm font-semibold
                ${s.done ? 'text-[#065F46]' : s.active ? 'text-[#0D2137]' : 'text-[#90A4AE]'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Demo admin controls */}
        <div className="mt-8 bg-[#FFF8EC] border border-[#FDE68A] rounded-2xl px-4 py-4">
          <p className="text-[#92400E] text-xs text-center font-medium mb-3">Demo: simulate admin decision</p>
          <div className="flex gap-3">
            <button onClick={approve} className="flex-1 bg-[#22C55E] text-white font-semibold py-3 rounded-2xl active:scale-95 transition-all text-sm">
              Approve
            </button>
            <button onClick={reject} className="flex-1 bg-[#EF4444] text-white font-semibold py-3 rounded-2xl active:scale-95 transition-all text-sm">
              Reject
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );

  /* ── APPROVED ── */
  if (view === 'approved') {
    const perks = ['Premium Publishing', 'Creator Dashboard', 'Verified Badge', 'Featured Placement'];
    return (
      <div className="min-h-screen">
        <Header title="Verification Approved" subtitle="Congratulations — you are now verified!" />
        <Sheet>
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-[#22C55E] flex items-center justify-center mb-4 shadow-md">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-[#0D2137] font-bold text-2xl">You Are Verified!</h2>
            <p className="text-[#90A4AE] text-sm mt-1">Your profile now shows the verified badge</p>
          </div>

          <div className="space-y-2.5">
            {perks.map((p) => (
              <div key={p} className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl px-4 py-3.5 flex items-center gap-3">
                <svg className="w-4 h-4 text-[#10B981] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span className="text-[#065F46] font-semibold text-sm">{p}</span>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/creator-dashboard')}
            className="mt-8 w-full bg-[#1565C0] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]">
            Go to Dashboard
          </button>
        </Sheet>
      </div>
    );
  }

  /* ── REJECTED ── */
  if (view === 'rejected') {
    const reasons = ['Incomplete ID Proof', 'Portfolio Quality Issues', 'Insufficient Content History'];
    return (
      <div className="min-h-screen">
        <Header title="Application Not Approved" subtitle="You may re-apply after updating your documents" />
        <Sheet>
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-[#FEE2E2] flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </div>
            <h2 className="text-[#0D2137] font-bold text-xl">Application Not Approved</h2>
          </div>

          <div className="space-y-2.5">
            {reasons.map((r) => (
              <div key={r} className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl px-4 py-3.5 flex items-center gap-3">
                <svg className="w-4 h-4 text-[#EF4444] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18"/></svg>
                <span className="text-[#991B1B] font-semibold text-sm">{r}</span>
              </div>
            ))}
          </div>

          <button onClick={reapply}
            className="mt-8 w-full bg-[#1565C0] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]">
            Re-Apply
          </button>
        </Sheet>
      </div>
    );
  }

  /* ── FAILED (camera error) ── */
  return (
    <div className="min-h-screen">
      <Header title="Verification Failed" subtitle="We could not access your camera" />
      <Sheet>
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-[#FEE2E2] flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </div>
          <h2 className="text-[#0D2137] font-bold text-xl">Verification Failed</h2>
          <p className="text-[#90A4AE] text-sm mt-1">We could not clearly verify your face.</p>
        </div>

        <div className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 mb-6">
          <p className="text-[#0D2137] font-bold text-sm mb-3">Possible Reasons</p>
          <ul className="space-y-2">
            {['Face not fully visible', 'Poor lighting conditions', 'Camera blurry or blocked'].map((r) => (
              <li key={r} className="flex items-center gap-2 text-sm text-[#37474F]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#90A4AE] shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <button onClick={() => setView('face')}
            className="w-full bg-[#1565C0] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]">
            Retry Verification
          </button>
          <button onClick={() => setView('form')} className="w-full text-[#1565C0] font-bold py-3 text-sm">
            Back to Form
          </button>
        </div>
      </Sheet>
    </div>
  );
}