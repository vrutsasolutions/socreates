import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/*
 * ProfileVerification — frontend-only "Creator Verification" workflow.
 * Views: form → face (live camera) → processing → success / failed.
 * Marks user.verified = true on Submit (form filled + face passed).
 * Entry origins via ?from=  →  onboarding | premium | settings.
 */

const inputCls =
  'w-full bg-[#F4F7FF] border border-[#BBDEFB] rounded-2xl px-4 py-3 text-[#0D2137] text-sm focus:outline-none focus:border-[#1565C0]';

function Header({ title, subtitle }) {
  return (
    <header className="bg-[#1565C0] px-4 pt-6 pb-8 relative overflow-hidden rounded-b-[28px]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-16 -right-10" />
        <div className="absolute w-32 h-32 rounded-full border-[24px] border-white/5 -bottom-12 -left-8" />
      </div>
      <h1 className="text-white font-bold text-2xl relative z-10">{title}</h1>
      {subtitle && <p className="text-blue-100 text-sm mt-1 relative z-10">{subtitle}</p>}
    </header>
  );
}

export default function ProfileVerification() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [params] = useSearchParams();
  const origin = params.get('from') || 'settings';

  const initialView = () => {
    const s = user?.verificationStatus;
    if (s === 'pending') return 'pending';
    if (s === 'approved') return 'approved';
    if (s === 'rejected') return 'rejected';
    return 'form';
  };
  const [view, setView] = useState(initialView); // form|face|processing|success|failed|pending|approved|rejected
  const [form, setForm] = useState({
    fullName: user?.name || '',
    bio: user?.bio || '',
    portfolio: '',
    social: '',
  });
  const [faceVerified, setFaceVerified] = useState(!!user?.verified);
  const [docName, setDocName] = useState('');
  const [stage, setStage] = useState(0);
  const [camReady, setCamReady] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const canSubmit = form.fullName.trim() && form.bio.trim() && faceVerified;

  /* ── camera lifecycle (only while on the face view) ───────────── */
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled) setView('failed');
      }
    })();
    return () => { cancelled = true; stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Safety: stop camera if the component unmounts.
  useEffect(() => () => stopCamera(), []);

  /* ── processing → success animation ───────────────────────────── */
  useEffect(() => {
    if (view !== 'processing') return;
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 900);
    const t2 = setTimeout(() => setStage(2), 1800);
    const t3 = setTimeout(() => setView('success'), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [view]);

  const capture = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (v && c && v.videoWidth) {
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    }
    stopCamera();
    setView('processing');
  };

  // Submitting the application moves the profile into "pending" review.
  const submitApplication = () => {
    updateUser({
      verificationStatus: 'pending',
      name: form.fullName.trim() || user?.name,
      bio: form.bio.trim(),
    });
    setView('pending');
  };

  // Demo-only stand-ins for the admin decision (no backend).
  const approve = () => { updateUser({ verificationStatus: 'approved', verified: true }); setView('approved'); };
  const reject  = () => { updateUser({ verificationStatus: 'rejected', verified: false }); setView('rejected'); };
  const reapply = () => { updateUser({ verificationStatus: 'none' }); setFaceVerified(false); setView('form'); };

  /* ════════════════════ FORM ════════════════════ */
  if (view === 'form') {
    return (
      <div className="min-h-screen bg-[#F4F7FF] pb-10">
        <Header title="Creator Verification" subtitle="Apply for a verified creator badge" />

        <div className="px-4 pt-6 space-y-5">
          {user?.verified && (
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2">
              <span>✓</span> Your profile is verified.
            </div>
          )}

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

          {/* Live Face Verification */}
          <div>
            <h2 className="text-[#1565C0] font-bold text-base mb-2">Live Face Verification</h2>
            <div className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[#0D2137] font-semibold text-sm">📷 Verify your identity</p>
                <p className={`text-xs mt-0.5 ${faceVerified ? 'text-[#10B981]' : 'text-[#90A4AE]'}`}>
                  {faceVerified ? 'Identity confirmed ✓' : 'Required before submitting application'}
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

          {/* ID Proof / Work Samples (optional) */}
          <div>
            <label className="text-xs font-bold text-[#0D2137]">ID Proof / Work Samples</label>
            <label className="mt-1 h-20 border-dashed border-2 border-[#BBDEFB] rounded-2xl flex items-center justify-center bg-[#F4F7FF] text-[#1565C0] font-semibold text-sm cursor-pointer">
              📎 {docName || 'Upload Documents'}
              <input type="file" hidden accept="image/*,application/pdf"
                onChange={(e) => setDocName(e.target.files?.[0]?.name || '')} />
            </label>
          </div>

          <button
            onClick={submitApplication}
            disabled={!canSubmit}
            className="w-full bg-[#1565C0] disabled:opacity-40 text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]"
          >
            Submit Application
          </button>

          {!canSubmit && (
            <p className="text-center text-[#90A4AE] text-xs -mt-2">
              Add your name, bio, and complete face verification to submit.
            </p>
          )}

          {origin === 'onboarding' && (
            <button onClick={() => navigate('/home')}
              className="w-full text-[#1565C0] font-semibold py-2 text-sm">
              Skip for now
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════ FACE (camera) ════════════════════ */
  if (view === 'face') {
    return (
      <div className="min-h-screen bg-[#F4F7FF] flex flex-col">
        <Header title="Face Verification" />
        <div className="px-4 pt-6 flex-1 flex flex-col">
          <h2 className="text-[#0D2137] font-bold text-base mb-4">Position your face inside the frame</h2>

          <div className="bg-white rounded-[28px] shadow-sm p-5 flex items-center justify-center">
            <div className="relative w-56 h-72 rounded-full overflow-hidden bg-[#EAF1FB] border-2 border-[#1565C0]">
              <video
                ref={videoRef}
                autoPlay playsInline muted
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
            <li>✓ Keep face centered</li>
            <li>✓ Remove sunglasses</li>
            <li>✓ Ensure good lighting</li>
          </ul>

          <div className="mt-auto pt-6 pb-6">
            <button
              onClick={capture}
              disabled={!camReady}
              className="w-full bg-[#1565C0] disabled:opacity-40 text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]"
            >
              Capture Selfie
            </button>
            <button onClick={() => setView('form')}
              className="w-full text-[#1565C0] font-semibold py-3 text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════ PROCESSING ════════════════════ */
  if (view === 'processing') {
    const stages = ['Selfie Captured', 'Matching Face', 'Verifying Identity'];
    return (
      <div className="min-h-screen bg-[#F4F7FF]">
        <Header title="Verification Processing" />
        <div className="px-4 pt-10 flex flex-col items-center text-center">
          <h2 className="text-[#0D2137] font-bold text-xl mb-8">Verifying Identity</h2>
          <div className="w-40 h-40 rounded-full bg-white shadow-sm flex items-center justify-center text-5xl mb-10">
            ⏳
          </div>
          <div className="space-y-4">
            {stages.map((s, i) => (
              <p key={s}
                className={`text-[15px] font-semibold ${
                  i < stage ? 'text-[#10B981]' : i === stage ? 'text-[#0D2137]' : 'text-[#90A4AE]'
                }`}>
                {s}{i < stage ? ' ✓' : ''}
              </p>
            ))}
            <p className="text-[#90A4AE] text-sm pt-2">Please wait…</p>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════ SUCCESS ════════════════════ */
  if (view === 'success') {
    return (
      <div className="min-h-screen bg-[#F4F7FF] flex flex-col">
        <Header title="Verification Success" />
        <div className="px-4 pt-10 flex-1 flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full bg-[#E7F8EE] flex items-center justify-center mb-8">
            <svg className="w-16 h-16 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-[#0D2137] font-bold text-xl mb-3">Face Verification Complete</h2>
          <p className="text-[#22C55E] font-medium">Face Match Successful</p>
          <p className="text-[#22C55E] mt-4">Identity Confirmed</p>

          <div className="mt-auto w-full pb-8">
            <button
              onClick={() => { setFaceVerified(true); setView('form'); }}
              className="w-full bg-[#1565C0] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════ PENDING ════════════════════ */
  if (view === 'pending') {
    const steps = [
      { label: 'Application Submitted', icon: '✓' },
      { label: 'Identity Verification', icon: '●' },
      { label: 'Content Review', icon: '○' },
      { label: 'Badge Issued', icon: '○' },
    ];
    return (
      <div className="min-h-screen bg-[#F4F7FF] pb-8">
        <Header title="Verification" subtitle="Application submitted" />
        <div className="px-4 pt-8 flex flex-col items-center text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-[#0D2137] font-bold text-xl mb-2">Application Under Review</h2>
          <p className="text-[#90A4AE] text-sm mb-8">Review usually takes 3-5 business days</p>
        </div>
        <div className="px-4 space-y-3">
          {steps.map((s) => (
            <div key={s.label} className="bg-[#F0F6FF] rounded-2xl px-4 py-4 flex items-center gap-3">
              <span className="text-[#1565C0] text-base w-4 text-center">{s.icon}</span>
              <span className="text-[#0D2137] font-semibold text-sm">{s.label}</span>
            </div>
          ))}
        </div>
        {/* Demo-only stand-in for the admin decision (no backend). */}
        <div className="px-4 mt-8">
          <p className="text-center text-[#90A4AE] text-xs mb-3">Demo: simulate the admin decision</p>
          <div className="flex gap-3">
            <button onClick={approve} className="flex-1 bg-[#22C55E] text-white font-semibold py-3 rounded-2xl active:scale-95 transition-all">Simulate Approve</button>
            <button onClick={reject} className="flex-1 bg-[#EF4444] text-white font-semibold py-3 rounded-2xl active:scale-95 transition-all">Simulate Reject</button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════ APPROVED ════════════════════ */
  if (view === 'approved') {
    const perks = ['Premium Publishing', 'Creator Dashboard', 'Verified Badge', 'Featured Placement'];
    return (
      <div className="min-h-screen bg-[#F4F7FF] flex flex-col">
        <Header title="Verification" subtitle="Congratulations" />
        <div className="px-4 pt-8 flex-1 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#22C55E] flex items-center justify-center mb-5 shadow-md">
            <svg className="w-11 h-11 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-[#0D2137] font-bold text-2xl mb-2">You Are Verified!</h2>
          <p className="text-[#90A4AE] text-sm mb-8">Your profile now shows the verified badge</p>
          <div className="w-full space-y-3">
            {perks.map((p) => (
              <div key={p} className="bg-[#F0F6FF] rounded-2xl px-4 py-4 flex items-center gap-3">
                <span className="text-[#1565C0]">✓</span>
                <span className="text-[#0D2137] font-semibold text-sm">{p}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto w-full pt-8 pb-8">
            <button onClick={() => navigate('/creator-dashboard')}
              className="w-full bg-[#1565C0] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]">
              Go To Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════ REJECTED ════════════════════ */
  if (view === 'rejected') {
    const reasons = ['Incomplete ID Proof', 'Portfolio Quality Issues', 'Insufficient Content History'];
    return (
      <div className="min-h-screen bg-[#F4F7FF] flex flex-col">
        <Header title="Verification" subtitle="Application Result" />
        <div className="px-4 pt-8 flex-1 flex flex-col items-center text-center">
          <svg className="w-16 h-16 text-[#EF4444] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
          <h2 className="text-[#0D2137] font-bold text-xl mb-2">Application Not Approved</h2>
          <p className="text-[#90A4AE] text-sm mb-8">You may re-apply after updating documents</p>
          <div className="w-full space-y-3">
            {reasons.map((r) => (
              <div key={r} className="bg-[#FEF2F2] rounded-2xl px-4 py-4 flex items-center gap-3">
                <span className="text-[#EF4444]">✕</span>
                <span className="text-[#EF4444] font-semibold text-sm">{r}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto w-full pt-8 pb-8">
            <button onClick={reapply}
              className="w-full bg-[#1565C0] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]">
              Re-Apply
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════ FAILED ════════════════════ */
  return (
    <div className="min-h-screen bg-[#F4F7FF] flex flex-col">
      <Header title="Face Verification" subtitle="Identity verification failed" />
      <div className="px-4 pt-10 flex-1 flex flex-col items-center text-center">
        <svg className="w-20 h-20 text-[#EF4444] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
        <h2 className="text-[#0D2137] font-bold text-xl mb-2">Verification Failed</h2>
        <p className="text-[#90A4AE] text-sm">We could not clearly verify your face.</p>

        <div className="bg-[#F0F6FF] border border-[#BBDEFB] rounded-2xl p-4 mt-6 w-full text-left">
          <p className="text-[#0D2137] font-bold text-sm mb-2">Possible Reasons</p>
          <ul className="text-[#37474F] text-sm space-y-1">
            <li>• Face not fully visible</li>
            <li>• Poor lighting conditions</li>
            <li>• Camera blurry or blocked</li>
          </ul>
        </div>

        <div className="mt-auto w-full pb-8 space-y-3">
          <button onClick={() => setView('face')}
            className="w-full bg-[#1565C0] text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-blue-200 text-[15px]">
            Retry Verification
          </button>
          <button onClick={() => setView('form')}
            className="w-full text-[#1565C0] font-bold py-3 text-sm">
            Back to Form
          </button>
        </div>
      </div>
    </div>
  );
}
