import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav.premium';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { hasCreatorPro, isVerified } from '../api/paymentApi';
import { AIAssistantBar, AIThinkingBubble } from '../components/common/AIInteractions.premium';
import { saveIdeaDraft, takeIdeaDraft, clearIdeaDraft } from '../state/ideaDraft';
import { setEditorInput, takeEditorOutput } from '../state/imageEditorStore';
import { filesToCompressedDataURLs, dataURLsToFiles } from '../state/imageCodec';

const CATEGORIES = [
  'Technology','Design','Business','Science','Art','Health',
  'Education','Finance','Music','Travel','Food','Sports'
];

const STEPS = ['Details', 'Media', 'Publish'];

// ── Aspect-fit preview tile ─────────────────────────────────────────────────
// Renders an image at a fixed row-height, with width derived from the image's
// own natural aspect ratio (capped at maxWidth). The full image is always
// visible — nothing is cropped. While dimensions are unknown, falls back to a
// square box so layout doesn't jump.
function PreviewTile({ src, height = 116, maxWidth = 220, className = '', children }) {
  const [ratio, setRatio] = useState(null); // width / height of the natural image

  const handleLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      setRatio(naturalWidth / naturalHeight);
    }
  };

  const width = ratio ? Math.min(Math.round(height * ratio), maxWidth) : height;

  return (
    <div
      className={`relative shrink-0 rounded-xl overflow-hidden border border-[#BBDEFB] bg-[#F4F7FF] ${className}`}
      style={{ width, height }}
    >
      <img
        src={src}
        onLoad={handleLoad}
        className="w-full h-full object-contain"
      />
      {children}
    </div>
  );
}

// ── AI Refine Modal ────────────────────────────────────────────────────────────
// Color system: brand blue (#1565C0 family) throughout — matches the rest of
// the app exactly. "AI-ness" is communicated through the gradient sheen,
// sparkle icon, and glow/shadow treatment, NOT through a different hue.
function AIRefineModal({ original, onAccept, onClose }) {
  // "select" → user picks a mode
  // "loading" → calling API
  // "done"    → show results
  // "error"   → show error
  const [screen, setScreen]   = useState('select');
  const [mode, setMode]       = useState('enhance');  // "enhance" | "grammar"
  const [refined, setRefined] = useState(null);
  const [errMsg, setErrMsg]   = useState('');

  const callApi = (selectedMode) => {
    setScreen('loading');
    setRefined(null);
    setErrMsg('');
    api.post('/ai/enhance', {
      title:       original.title,
      description: original.description,
      mode:        selectedMode,
    })
      .then(({ data }) => { setRefined(data); setScreen('done'); })
      .catch((err)    => {
        setErrMsg(err?.response?.data?.message || 'AI service unavailable. Try again.');
        setScreen('error');
      });
  };

  const handleRun = () => callApi(mode);

  const handleRerun = () => callApi(mode);

  // Sparkle SVG icon — filled (not stroke-only) so it stays crisp at small sizes
  const SparkleIcon = ({ size = 16, color = '#fff' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z"/>
      <path d="M5 4l0.9 2.2L8 7l-2.1 0.8L5 10l-0.9-2.2L2 7l2.1-0.8L5 4z" opacity="0.85"/>
    </svg>
  );

  return (
    // Full-screen overlay — centered, not bottom-anchored
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Card — wider, centered, taller */}
      <div
        className="bg-white w-full rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}
      >

        {/* ── Header (always visible) ── */}
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-300/40"
                 style={{ background: 'linear-gradient(135deg,#1565C0,#4536F2)' }}>
              <SparkleIcon size={18} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#0D2137] text-[15px] leading-tight">SoCreate AI</p>
              <p className="text-[11px] text-[#90A4AE]">
                {screen === 'select'
                  ? 'Choose how AI should help you'
                  : mode === 'grammar'
                  ? 'Spelling & grammar fix · Same words'
                  : 'Clarity · Flow · Impact · Same idea'}
              </p>
            </div>
            <button onClick={onClose}
                    className="text-[#90A4AE] text-lg leading-none hover:text-[#0D2137] ml-2">
              ✕
            </button>
          </div>
          <div className="h-px bg-[#EEF2FF] mt-4" />
        </div>

        <div className="px-6 py-5">

          {/* ══ SCREEN: mode selection ══ */}
          {screen === 'select' && (
            <div className="space-y-4">

              <p className="text-[11px] font-bold text-[#90A4AE] uppercase tracking-widest mb-3">
                Select mode
              </p>

              {/* Option 1 — Rewrite & Enhance
                  Selected-state colors match AIAssistantBar's "Try AI" box
                  exactly: #4536F2 border/shadow, light-blue gradient bg —
                  so this card reads as the SAME AI treatment, not a third
                  variant of blue. */}
              <button
                onClick={() => setMode('enhance')}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                  mode === 'enhance' ? 'text-left' : 'border-[#E3E8F0] bg-white hover:border-[#93C5FD]'
                }`}
                style={mode === 'enhance' ? {
                  borderColor: '#4536F2',
                  background: 'linear-gradient(135deg, #EEF0FE 0%, #E4E9FF 100%)',
                  boxShadow: '0 8px 24px rgba(69,54,242,0.18), 0 2px 6px rgba(69,54,242,0.12)',
                } : undefined}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#DBEAFE]">
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
                       stroke="#1565C0" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#0D2137] text-sm mb-1">Rewrite &amp; enhance</p>
                  <p className="text-xs text-[#546E7A] leading-relaxed mb-2">
                    Improves flow, clarity and makes your idea more compelling — same concept, better words.
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {['Clarity', 'Flow', 'Impact'].map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#0D47A1] font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  mode === 'enhance' ? 'border-[#4536F2] bg-[#4536F2]' : 'border-[#CBD5E1]'
                }`}>
                  {mode === 'enhance' && (
                    <svg width={10} height={10} viewBox="0 0 12 12" fill="none"
                         stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6l3 3 5-5"/>
                    </svg>
                  )}
                </div>
              </button>

              {/* Option 2 — Fix Spelling & Grammar */}
              <button
                onClick={() => setMode('grammar')}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                  mode === 'grammar'
                    ? 'border-[#1565C0] bg-[#EFF6FF] shadow-sm shadow-blue-200/60'
                    : 'border-[#E3E8F0] bg-white hover:border-[#93C5FD]'
                }`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#DBEAFE]">
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
                       stroke="#1565C0" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M4 12h10M4 17h6"/>
                    <circle cx="19" cy="17" r="3"/>
                    <path d="M17.5 17l1 1 2-2"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#0D2137] text-sm mb-1">Fix spelling &amp; grammar</p>
                  <p className="text-xs text-[#546E7A] leading-relaxed mb-2">
                    Corrects spelling, punctuation and grammar only. Zero changes to your meaning or style.
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {['Spelling', 'Grammar', 'Punctuation'].map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  mode === 'grammar' ? 'border-[#1565C0] bg-[#1565C0]' : 'border-[#CBD5E1]'
                }`}>
                  {mode === 'grammar' && (
                    <svg width={10} height={10} viewBox="0 0 12 12" fill="none"
                         stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6l3 3 5-5"/>
                    </svg>
                  )}
                </div>
              </button>

              {/* Run button — same brand blue for both modes now, with a
                  brighter top-to-bottom sheen so it still feels like a
                  special "AI" action without changing the hue. */}
              <button
                onClick={handleRun}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white mt-2 active:scale-95 transition-transform shadow-lg shadow-blue-300/40 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#1565C0,#4536F2)' }}
              >
                <SparkleIcon size={14} color="#fff" /> Run AI
              </button>

              <button onClick={onClose}
                      className="w-full bg-[#F4F7FF] text-[#546E7A] py-3 rounded-2xl font-semibold text-sm">
                Cancel
              </button>
            </div>
          )}

          {/* ══ SCREEN: loading ══ */}
          {screen === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <AIThinkingBubble message={
                mode === 'grammar' ? 'Checking spelling & grammar…' : 'Polishing your idea…'
              } />
            </div>
          )}

          {/* ══ SCREEN: error ══ */}
          {screen === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-500">
                {errMsg}
              </div>
              <button onClick={handleRerun}
                      className="w-full bg-[#1565C0] text-white py-3 rounded-2xl font-semibold text-sm">
                Try Again
              </button>
              <button onClick={() => setScreen('select')}
                      className="w-full bg-[#F4F7FF] text-[#546E7A] py-3 rounded-2xl font-semibold text-sm">
                ← Change mode
              </button>
            </div>
          )}

          {/* ══ SCREEN: results ══ */}
          {screen === 'done' && refined && (
            <div className="space-y-4">

              {/* Mode badge */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#DBEAFE] text-[#0D47A1]">
                  {mode === 'grammar' ? '🔤 Spelling & grammar fixed' : '✨ Rewritten & enhanced'}
                </span>
              </div>

              {/* Title comparison */}
              <div className="rounded-2xl border border-[#BBDEFB] overflow-hidden">
                <div className="bg-[#F4F7FF] px-4 py-2 border-b border-[#BBDEFB]">
                  <p className="text-[11px] font-bold text-[#90A4AE] uppercase tracking-wide">Title</p>
                </div>
                <div className="px-4 py-3 border-b border-[#F0F2F8]">
                  <p className="text-[10px] text-[#90A4AE] font-semibold mb-1">Original</p>
                  <p className="text-sm text-[#546E7A] line-through decoration-red-300">
                    {original.title || <span className="italic">No title</span>}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] text-[#1565C0] font-semibold mb-1">✦ Refined</p>
                  <p className="text-sm font-semibold text-[#0D2137]">{refined.title}</p>
                </div>
              </div>

              {/* Description comparison */}
              <div className="rounded-2xl border border-[#BBDEFB] overflow-hidden">
                <div className="bg-[#F4F7FF] px-4 py-2 border-b border-[#BBDEFB]">
                  <p className="text-[11px] font-bold text-[#90A4AE] uppercase tracking-wide">Description</p>
                </div>
                <div className="px-4 py-3 border-b border-[#F0F2F8] max-h-32 overflow-y-auto">
                  <p className="text-[10px] text-[#90A4AE] font-semibold mb-1">Original</p>
                  <p className="text-sm text-[#546E7A]">
                    {original.description || <span className="italic">No description</span>}
                  </p>
                </div>
                <div className="px-4 py-3 max-h-44 overflow-y-auto">
                  <p className="text-[10px] text-[#1565C0] font-semibold mb-1">✦ Refined</p>
                  <p className="text-sm text-[#0D2137] leading-relaxed">{refined.description}</p>
                </div>
              </div>

              {/* Accept */}
              <button
                onClick={() => onAccept(refined)}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white active:scale-95 transition-transform shadow-lg shadow-blue-300/40"
                style={{ background: 'linear-gradient(135deg,#1565C0,#4536F2)' }}
              >
                ✓ Accept Changes
              </button>

              <div className="flex gap-3">
                <button onClick={handleRerun}
                        className="flex-1 bg-[#F4F7FF] text-[#1565C0] border border-[#BBDEFB] py-2.5 rounded-2xl font-semibold text-sm active:scale-95 transition-transform">
                  ↺ Re-run AI
                </button>
                <button onClick={() => setScreen('select')}
                        className="flex-1 bg-[#F4F7FF] text-[#546E7A] border border-[#BBDEFB] py-2.5 rounded-2xl font-semibold text-sm active:scale-95 transition-transform">
                  ← Change mode
                </button>
              </div>

              <button onClick={onClose}
                      className="w-full bg-[#F4F7FF] text-[#546E7A] py-2.5 rounded-2xl font-semibold text-sm">
                Discard
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
// ── End AIRefineModal ──────────────────────────────────────────────────────────


export default function AddIdea() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fileRef = useRef();
  const { user } = useAuth();
  const creatorPro = hasCreatorPro(user);
  // Verified is now granted by any paid membership (no separate flow).
  const verified = isVerified(user);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    isPremium: false,
    price: '99'
  });

  // ── AI modal state ─────────────────────────────────────────────────────────
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const handleAiActivate = () => {
    if (!form.title.trim() && !form.description.trim()) {
      setError('Please write a title or description before using AI.');
      return;
    }
    setError('');
    setAiModalOpen(true);
  };

  const handleAiAccept = (refined) => {
    setForm((prev) => ({
      ...prev,
      title:       (refined.title       || prev.title).slice(0, TITLE_MAX),
      description: (refined.description || prev.description).slice(0, DESC_MAX),
    }));
    setAiModalOpen(false);
  };
  // ──────────────────────────────────────────────────────────────────────────

  const requestPremiumToggle = async () => {
    if (form.isPremium) { setForm((f) => ({ ...f, isPremium: false })); return; }
    const imageDataURLs = await filesToCompressedDataURLs(images);
    saveIdeaDraft({ form, imageDataURLs, step });
    navigate('/create-premium');
  };

  // Non-premium users tap "Upgrade to Creator Pro". Persist the in-progress
  // draft first so their title/description/images survive the round-trip and
  // are restored when they navigate back (see the restore effect below).
  const goToCreatorPro = async () => {
    const imageDataURLs = await filesToCompressedDataURLs(images);
    saveIdeaDraft({ form, imageDataURLs, step });
    navigate('/creator-pro');
  };

  useEffect(() => {
    // Restore a stashed draft — covers three cases with the same code path:
    //   1. A plain page refresh on /add-idea (no query params at all).
    //   2. Coming back from the premium gate (`?premium=1`).
    //   3. Coming back from the image editor (`?edited=1`).
    // takeIdeaDraft() clears it after one read so it doesn't reappear later.
    const d = takeIdeaDraft();
    const premiumReturn = params.get('premium') === '1';
    const editorReturn  = params.get('edited')  === '1';
    if (!d) return;
    const p = params.get('price');
    setForm((f) => ({
      ...f,
      ...(d.form || {}),
      ...(premiumReturn && creatorPro && verified
        ? { isPremium: true, price: p || d.form?.price || f.price }
        : {}),
    }));
    // When returning from the image editor, DON'T restore draft images —
    // the editor-output effect below will apply the edited (or original)
    // files instead. Restoring draft images here would overwrite them.
    if (!editorReturn && Array.isArray(d.imageDataURLs) && d.imageDataURLs.length > 0) {
      const restoredFiles = dataURLsToFiles(d.imageDataURLs, 'restored');
      setImages(restoredFiles);
      setPreviews(restoredFiles.map((f) => URL.createObjectURL(f)));
    }
    // Return the user to the step they left from (the Media / upload-image
    // step where the premium toggle lives) instead of resetting to step 0.
    if (typeof d.step === 'number') setStep(d.step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const MAX_IMAGES = 5;
  const TITLE_MAX  = 200;
  const DESC_MAX   = 3000;
  const [images,   setImages]   = useState([]);
  const [previews, setPreviews] = useState([]);

  // ── Auto-save draft on every change ─────────────────────────────────────
  // Debounced so we're not re-encoding images on every keystroke. This is
  // what makes a plain page refresh (no navigation involved) recoverable —
  // the explicit saveIdeaDraft() calls elsewhere only cover the moments
  // right before a route change.
  useEffect(() => {
    const handle = setTimeout(() => {
      filesToCompressedDataURLs(images).then((imageDataURLs) => {
        // Nothing entered at all yet — don't leave an empty draft sitting around.
        const isEmpty =
          !form.title.trim() && !form.description.trim() &&
          !form.category && imageDataURLs.length === 0;
        if (isEmpty) {
          clearIdeaDraft();
          return;
        }
        saveIdeaDraft({ form, imageDataURLs, step });
      });
    }, 500);
    return () => clearTimeout(handle);
  }, [form, images, step]);

  // Shared row height for image preview tiles. Each tile's width is derived
  // from the image's own natural aspect ratio, so wide photos get wide boxes
  // and tall photos get narrow/tall boxes — full image always visible.
  const PREVIEW_TILE_HEIGHT = 116;
  const PREVIEW_TILE_MAX_WIDTH = 220; // cap so a panoramic image can't eat the whole row

  const [checking,     setChecking]     = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [checkResult,  setCheckResult]  = useState(null);
  const [error,        setError]        = useState('');

  const inputCls =
    "w-full bg-[#F4F7FF] border border-[#BBDEFB] rounded-2xl px-4 py-3 text-[#0D2137] text-sm focus:outline-none focus:border-[#1565C0]";

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v =
      name === 'title'       ? value.slice(0, TITLE_MAX)
      : name === 'description' ? value.slice(0, DESC_MAX)
      : value;
    setForm({ ...form, [name]: v });
  };

  // ── Image editor integration ───────────────────────────────────────────────
  // When the user selects files from disk, we send them to /edit-images first.
  // The editor is optional — if they tap Skip it writes null and navigates back
  // with no ?edited=1 param, so we just re-apply the originals.
  const handleImage = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    // Stash the current draft so the images/form survive navigation.
    const imageDataURLs = await filesToCompressedDataURLs(images);
    saveIdeaDraft({ form, imageDataURLs, step });
    // Hand the newly selected files to the editor store.
    setEditorInput(
      [...images, ...files].slice(0, MAX_IMAGES),
      '/add-idea'
    );
    navigate('/edit-images');
  };

  // Called when navigating back from /edit-images (with ?edited=1).
  // Also handles the skip case: editor writes null output but navigates back
  // without ?edited=1. In that case the draft restore already has the originals.
  useEffect(() => {
    if (params.get('edited') !== '1') return;
    const edited = takeEditorOutput();
    if (edited && edited.length > 0) {
      // User applied edits — swap in the processed files.
      setPreviews((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return edited.map((f) => URL.createObjectURL(f));
      });
      setImages(edited);
    }
    // If edited is null/empty the editor had an error — draft restore already
    // put the originals back via the !editorReturn branch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeImage = (idx) => {
    setImages((prev)   => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const nextStep = () => {
    if (step === 0) {
      if (!form.title.trim())       return setError('Title is required');
      if (!form.description.trim()) return setError('Description is required');
      if (!form.category)           return setError('Please select a category');
      setError('');
    }
    setStep((s) => s + 1);
  };

  // Step back within the wizard (Media -> Details, Publish -> Media).
  // Whatever was entered stays in state (and keeps auto-saving via the
  // draft effect), so going back and forward again doesn't lose anything.
  const prevStep = () => {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  };

  // Header back arrow: step back within the wizard if we're past step 0,
  // otherwise leave the Add Idea flow entirely (previous screen/page).
  const handleHeaderBack = () => {
    if (step > 0) {
      prevStep();
    } else {
      navigate(-1);
    }
  };

  const handlePublish = async () => {
    if (form.isPremium && creatorPro && !verified) {
      navigate('/create-premium');
      return;
    }

    setChecking(true);
    setError('');

    try {
      const { data: plag } = await api.post('/plagiarism/check', {
        description: form.description
      });

      if (plag.isPlagiarized) {
        setCheckResult('flagged');
        setError(plag.message);
        return;
      }

      setCheckResult('ok');
      setPublishing(true);

      const payload = { ...form, isPremium: creatorPro ? form.isPremium : false };

      const fd = new FormData();
      fd.append('idea', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      if (images[0]) fd.append('image', images[0]);
      images.forEach((img) => fd.append('images', img));

      await api.post('/ideas', fd);

      clearIdeaDraft();
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish.');
    } finally {
      setChecking(false);
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-24">

      {/* AI Refine Modal */}
      {aiModalOpen && (
        <AIRefineModal
          original={{ title: form.title, description: form.description }}
          onAccept={handleAiAccept}
          onClose={() => setAiModalOpen(false)}
        />
      )}

      {/* HEADER */}
      <div className="bg-[#1565C0] px-4 pt-5 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-44 h-44 rounded-full border-[28px] border-white/5 -top-16 -right-12" />
          <div className="absolute w-36 h-36 rounded-full border-[22px] border-white/5 -bottom-14 -left-10" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
           onClick={handleHeaderBack}
               aria-label="Go back"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
         >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
             </svg>
        </button>

          <h1 className="text-white font-bold text-lg flex-1">Add New Idea</h1>
          <span className="text-blue-100 text-sm">{step + 1}/{STEPS.length}</span>
        </div>

        <div className="mt-4 flex gap-2 relative z-10">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{ width: i <= step ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="bg-white rounded-t-[28px] -mt-6 relative z-10 px-4 pt-6">

        {step === 0 && (
          <div className="space-y-4">
            <AIAssistantBar onActivate={handleAiActivate} />

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0D2137]">Idea Title</label>
                <span className={`text-[11px] ${form.title.length >= TITLE_MAX ? 'text-[#E53935]' : 'text-[#90A4AE]'}`}>
                  {form.title.length}/{TITLE_MAX}
                </span>
              </div>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                maxLength={TITLE_MAX}
                className={inputCls}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0D2137]">Description</label>
                <span className={`text-[11px] ${form.description.length >= DESC_MAX ? 'text-[#E53935]' : 'text-[#90A4AE]'}`}>
                  {form.description.length}/{DESC_MAX}
                </span>
              </div>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                maxLength={DESC_MAX}
                rows={5}
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0D2137]">Category</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setForm({ ...form, category: cat })}
                    className={`text-xs py-2 rounded-xl border transition ${
                      form.category === cat
                        ? 'bg-[#1565C0] text-white border-[#1565C0]'
                        : 'bg-[#F4F7FF] border-[#BBDEFB] text-[#0D2137]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#0D2137]">
                Images <span className="text-[#90A4AE] font-normal">(up to {MAX_IMAGES})</span>
              </label>

              {previews.length === 0 ? (
                <div
                  onClick={() => fileRef.current.click()}
                  className="h-44 border-dashed border-2 border-[#BBDEFB] rounded-2xl flex items-center justify-center bg-[#F4F7FF] text-[#90A4AE] mt-2 cursor-pointer"
                >
                  Upload Images
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {previews.map((src, i) => (
                    <PreviewTile
                      key={src}
                      src={src}
                      height={PREVIEW_TILE_HEIGHT}
                      maxWidth={PREVIEW_TILE_MAX_WIDTH}
                    >
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
                          Cover
                        </span>
                      )}
                      {/* Edit button — opens editor for all current images */}
                      <button
                        type="button"
                        onClick={async () => {
                          const imageDataURLs = await filesToCompressedDataURLs(images);
                          saveIdeaDraft({ form, imageDataURLs, step });
                          setEditorInput([...images], '/add-idea');
                          navigate('/edit-images');
                        }}
                        aria-label="Edit image"
                        className="absolute bottom-1 right-1 w-6 h-6 bg-black/55 text-white rounded-full flex items-center justify-center text-xs leading-none active:scale-90"
                        title="Edit images"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label="Remove image"
                        className="absolute top-1 right-1 w-5 h-5 bg-black/55 text-white rounded-full flex items-center justify-center text-xs leading-none active:scale-90"
                      >
                        ×
                      </button>
                    </PreviewTile>
                  ))}
                  {previews.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileRef.current.click()}
                      className="shrink-0 rounded-xl border-dashed border-2 border-[#BBDEFB] bg-[#F4F7FF] text-[#90A4AE] flex flex-col items-center justify-center text-xs active:scale-95"
                      style={{ width: PREVIEW_TILE_HEIGHT, height: PREVIEW_TILE_HEIGHT }}
                    >
                      <span className="text-xl leading-none">+</span>
                      Add
                    </button>
                  )}
                </div>
              )}

              <p className="text-[11px] text-[#90A4AE] mt-2">The first image is used as the cover.</p>
              <input ref={fileRef} type="file" hidden multiple accept="image/*" onChange={handleImage} />
            </div>

            {creatorPro ? (
              <div className="border border-[#BBDEFB] rounded-2xl p-4 bg-[#F4F7FF] flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm text-[#0D2137]">Premium Content</p>
                  <p className="text-xs text-[#90A4AE]">Paid users only</p>
                </div>
                <button
                  onClick={requestPremiumToggle}
                  className={`w-12 h-6 rounded-full transition ${form.isPremium ? 'bg-[#1565C0]' : 'bg-[#BBDEFB]'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full ml-1 transition-transform ${form.isPremium ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="border border-[#E3F2FD] rounded-2xl p-4 bg-white">
                  <p className="font-bold text-[#0D2137]">Premium Content</p>
                  <p className="text-xs text-[#90A4AE] mt-1">Premium publishing requires Creator Pro.</p>
                  <div className="flex justify-between items-center mt-5">
                    <p className="font-bold text-sm text-[#0D2137]">Premium Toggle</p>
                    <span className="bg-[#E2E6F0] text-[#546E7A] text-xs font-bold px-3 py-1.5 rounded-full select-none">OFF</span>
                  </div>
                </div>
                <button
                  onClick={goToCreatorPro}
                  className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all"
                >
                  Upgrade to Creator Pro
                </button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="border rounded-2xl overflow-hidden border-[#BBDEFB] bg-white">
              {previews[0] && (
                <div className="relative">
                  <img src={previews[0]} className="h-40 w-full object-cover" />
                  {previews.length > 1 && (
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      +{previews.length - 1} more
                    </span>
                  )}
                </div>
              )}
              <div className="p-4">
                <p className="text-xs text-[#1565C0]">{form.category}</p>
                <h2 className="font-bold text-[#0D2137]">{form.title}</h2>
                <p className="text-sm text-[#546E7A] line-clamp-3">{form.description}</p>
              </div>
            </div>

            <div className="border border-[#BBDEFB] rounded-2xl p-4 bg-[#F4F7FF]">
              <p className="text-xs font-bold text-[#0D2137]">Security Check</p>
              <p className="text-sm text-[#546E7A]">AI + plagiarism + validation checks</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm">{error}</div>
            )}
          </div>
        )}

        <div className="mt-6 pb-6">
          {step < 2 ? (
            <button onClick={nextStep} className="w-full bg-[#1565C0] text-white py-3 rounded-2xl font-semibold">
              Continue 
            </button>
          ) : (
            <button onClick={handlePublish} className="w-full bg-[#1565C0] text-white py-3 rounded-2xl font-semibold">
              {checking ? 'Checking...' : publishing ? 'Publishing...' : 'Publish'}
            </button>
          )}
        </div>

        {error && step === 0 && (
          <p className="text-xs text-red-400 text-center -mt-4 pb-2">{error}</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}