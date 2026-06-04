import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav.premium';
import api from '../api/axiosInstance';
import { AddIdeaSkeleton, PublishingSkeleton, ButtonLoadingState } from '../components/common/LoadingStates.premium';
import { UploadError, AIError, ValidationError, FormError } from '../components/common/ErrorStates.premium';
import {
  AIAssistantBar,
  AIThinkingBubble,
  AISuggestionCard,
  AISuggestionList,
  AITagSuggestions,
  AIDescriptionHelper,
  AIResultPanel,
  AIPlagiarismResult,
} from '../components/common/AIInteractions.premium';

const CATEGORIES = ['Technology','Design','Business','Science','Art','Health','Education','Finance','Music','Travel','Food','Sports'];
const STEPS = ['Details', 'Media', 'Publish'];

export default function AddIdea() {
  const navigate = useNavigate();
  const fileRef  = useRef();
  const [step, setStep]               = useState(0);
  const [form, setForm]               = useState({ title: '', description: '', category: '', Premium: false });
  const [image, setImage]             = useState(null);
  const [preview, setPreview]         = useState(null);
  const [checking, setChecking]       = useState(false);
  const [publishing, setPublishing]   = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [error, setError]             = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file); setPreview(URL.createObjectURL(file));
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

  const handlePublish = async () => {
    setChecking(true); setCheckResult(null); setError('');
    try {
      const { data: plag } = await api.post('/plagiarism/check', { description: form.description });
      if (plag.isPlagiarized) { setCheckResult('flagged'); setError(plag.message); setChecking(false); return; }
      setCheckResult('ok'); setChecking(false); setPublishing(true);
      const fd = new FormData();
      fd.append('idea', new Blob([JSON.stringify(form)], { type: 'application/json' }));
      if (image) fd.append('image', image);
      await api.post('/ideas', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish.'); setChecking(false); setPublishing(false);
    }
  };

  const inputCls = 'w-full bg-[#F0F6FF] border border-[#BBDEFB] rounded-xl px-4 py-3 text-black placeholder-[#90A4AE] text-sm focus:outline-none focus:border-[#1565C0] focus:ring-1 focus:ring-[#1565C0] transition';

  return (
    <div className="min-h-screen bg-[#F0F6FF] pb-28">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1565C0] px-4 py-4 flex items-center gap-3">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)} className="text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Add New Idea</h1>
        <span className="text-blue-200 text-sm">{step + 1}/{STEPS.length}</span>
      </header>

      {/* Step Progress */}
      <div className="flex gap-1.5 px-4 pt-4 pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 text-center">
            <div className={`h-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-[#1565C0]' : 'bg-[#BBDEFB]'}`}/>
            <span className={`text-[10px] mt-1 block font-medium ${i === step ? 'text-[#1565C0]' : 'text-[#90A4AE]'}`}>{s}</span>
          </div>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-5">

        {/* Step 0 — Details */}
        {step === 0 && <>
          <div>
            <label className="block text-black text-xs font-semibold uppercase tracking-widest mb-2">Idea Title *</label>
            <AIAssistantBar onAsk={() => { /* your AI logic */ }} />
            <input name="title" value={form.title} onChange={handleChange} placeholder="What's your big idea?" className={inputCls}/>
          </div>
          <div>
            <label className="block text-black text-xs font-semibold uppercase tracking-widest mb-2">Description *</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={5}
              placeholder="Describe your idea. Include the problem it solves and how it works."
              className={`${inputCls} resize-none`}/>
            <div className="text-right text-[#90A4AE] text-xs mt-1">{form.description.length}/1000</div>
          </div>
          <div>
            <label className="block text-black text-xs font-semibold uppercase tracking-widest mb-2">Category *</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setForm({ ...form, category: cat })}
                  className={`py-2.5 rounded-xl text-xs font-medium border transition-all
                    ${form.category === cat
                      ? 'bg-[#1565C0] border-[#1565C0] text-white'
                      : 'bg-white border-[#BBDEFB] text-black hover:border-[#1565C0]'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </>}

        {/* Step 1 — Media */}
        {step === 1 && <>
          <div>
            <label className="block text-black text-xs font-semibold uppercase tracking-widest mb-2">Cover Image (optional)</label>
            {preview ? (
              <div className="relative rounded-2xl overflow-hidden">
                <img src={preview} alt="preview" className="w-full h-48 object-cover"/>
                <button onClick={() => { setImage(null); setPreview(null); }}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white text-sm">✕</button>
              </div>
            ) : (
              <div onClick={() => fileRef.current.click()}
                className="border-2 border-dashed border-[#BBDEFB] rounded-2xl h-44 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#1565C0] transition-colors bg-white">
                <div className="w-12 h-12 bg-[#F0F6FF] border border-[#BBDEFB] rounded-xl flex items-center justify-center text-2xl">📷</div>
                <div className="text-center">
                  <p className="text-black text-sm font-medium">Tap to upload image</p>
                  <p className="text-[#90A4AE] text-xs mt-1">Max 10MB</p>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden"/>
          </div>

          {/* Premium Toggle */}
          <div className="bg-white border border-[#BBDEFB] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-black font-semibold text-sm">⭐ Premium Content</div>
                <div className="text-[#90A4AE] text-xs mt-0.5">Only paid members can view this</div>
              </div>
              <button onClick={() => setForm({ ...form, Premium: !form.Premium })}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.Premium ? 'bg-[#1565C0]' : 'bg-[#BBDEFB]'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow ${form.Premium ? 'translate-x-7' : 'translate-x-1'}`}/>
              </button>
            </div>
            {form.Premium && (
              <div className="mt-3 bg-[#FFF8E1] border border-[#FFE082] rounded-xl p-3 text-[#F9A825] text-xs">
                💰 Premium ideas earn revenue when members view them.
              </div>
            )}
          </div>
        </>}

        {/* Step 2 — Publish Preview */}
        {step === 2 && <div className="space-y-4">
          <div className="bg-white border border-[#BBDEFB] rounded-2xl overflow-hidden">
            {preview && <img src={preview} alt="cover" className="w-full h-40 object-cover"/>}
            {!preview && (
              <div className="h-24 bg-[#E3F2FD] flex items-center justify-center">
                <span className="text-4xl opacity-40">💡</span>
              </div>
            )}
            <div className="p-4">
              <div className="flex gap-2 flex-wrap mb-2">
                {form.Premium && (
                  <span className="bg-[#FFF8E1] text-[#F9A825] text-xs font-bold px-2.5 py-1 rounded-full">⭐ Premium</span>
                )}
                <span className="bg-[#E3F2FD] text-[#1565C0] text-xs px-2.5 py-1 rounded-full">{form.category}</span>
              </div>
              <h3 className="text-black font-bold text-base mb-2">{form.title}</h3>
              <p className="text-[#546E7A] text-sm leading-relaxed line-clamp-3">{form.description}</p>
            </div>
          </div>

          {/* Security Check */}
          <div className="bg-white border border-[#BBDEFB] rounded-2xl p-4">
            <p className="text-black text-xs font-semibold uppercase tracking-widest mb-3">Security Check</p>
            {[
              { label: 'Cosine Similarity Check', done: checkResult !== null && checkResult !== 'flagged' },
              { label: 'Plagiarism Detection',    done: checkResult === 'ok' },
              { label: 'Publish to Feed',         done: publishing && checkResult === 'ok' },
            ].map(({ label, done }, idx) => (
              <div key={label} className="flex items-center gap-3 mb-2.5 last:mb-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs transition-colors
                  ${done
                    ? 'bg-green-100 text-green-600'
                    : checking && idx === 0
                      ? 'border-2 border-[#1565C0] border-t-transparent animate-spin'
                      : 'bg-[#F0F6FF] text-[#90A4AE]'}`}>
                  {done && '✓'}
                </div>
                <span className={`text-sm ${done ? 'text-green-600' : 'text-black'}`}>{label}</span>
              </div>
            ))}
          </div>

          {checkResult === 'flagged' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-500 text-sm">⚠️ {error}</div>
          )}
        </div>}

        {/* Inline error for steps 0 & 1 */}
        {error && step < 2 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-500 text-sm">{error}</div>
        )}

        {/* Action Button */}
        {step < 2 ? (
          <button onClick={nextStep}
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition-all shadow-md shadow-blue-200">
            Continue →
          </button>
        ) : (
          <button onClick={handlePublish} disabled={checking || publishing || checkResult === 'flagged'}
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition-all shadow-md shadow-blue-200 disabled:opacity-50">
            {checking ? '🔍 Checking...' : publishing ? '🚀 Publishing...' : checkResult === 'flagged' ? '⚠️ Cannot publish' : '🚀 Publish Idea'}
          </button>
        )}
      </div>

      <BottomNav/>
    </div>
  );
}
