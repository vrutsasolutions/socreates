import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav';
import api from '../api/axiosInstance';

const CATEGORIES = ['Technology','Design','Business','Science','Art','Health','Education','Finance','Music','Travel','Food','Sports'];
const STEPS = ['Details', 'Media', 'Publish'];

export default function AddIdea() {
  const navigate = useNavigate();
  const fileRef  = useRef();
  const [step, setStep]             = useState(0);
  const [form, setForm]             = useState({ title: '', description: '', category: '', isPremium: false });
  const [image, setImage]           = useState(null);
  const [preview, setPreview]       = useState(null);
  const [checking, setChecking]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [error, setError]           = useState('');

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

  const inputCls = 'w-full bg-[#0f0f1a] border border-[#2a2a3e] rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition';

  return (
    <div className="min-h-screen bg-[#0f0f1a] pb-28">
      <header className="sticky top-0 z-30 bg-[#0f0f1a]/90 backdrop-blur-xl border-b border-[#2a2a3e] px-4 py-4 flex items-center gap-3">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)} className="text-slate-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Add New Idea</h1>
        <span className="text-slate-500 text-sm">{step + 1}/{STEPS.length}</span>
      </header>

      <div className="flex gap-1.5 px-4 pt-4 pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 text-center">
            <div className={`h-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-violet-500' : 'bg-[#2a2a3e]'}`}/>
            <span className={`text-[10px] mt-1 block ${i === step ? 'text-violet-400' : 'text-slate-600'}`}>{s}</span>
          </div>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-5">
        {step === 0 && <>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">Idea Title *</label>
            <input name="title" value={form.title} onChange={handleChange} placeholder="What's your big idea?" className={inputCls}/>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">Description *</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={5}
              placeholder="Describe your idea. Include the problem it solves and how it works."
              className={`${inputCls} resize-none`}/>
            <div className="text-right text-slate-600 text-xs mt-1">{form.description.length}/1000</div>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">Category *</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setForm({ ...form, category: cat })}
                  className={`py-2.5 rounded-xl text-xs font-medium border transition-all
                    ${form.category === cat ? 'bg-violet-600/20 border-violet-500 text-violet-300' : 'bg-[#1a1a2e] border-[#2a2a3e] text-slate-400'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </>}

        {step === 1 && <>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">Cover Image (optional)</label>
            {preview ? (
              <div className="relative rounded-2xl overflow-hidden">
                <img src={preview} alt="preview" className="w-full h-48 object-cover"/>
                <button onClick={() => { setImage(null); setPreview(null); }} className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white">✕</button>
              </div>
            ) : (
              <div onClick={() => fileRef.current.click()} className="border-2 border-dashed border-[#2a2a3e] rounded-2xl h-44 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-violet-500/50 transition-colors bg-[#1a1a2e]">
                <div className="w-12 h-12 bg-[#2a2a3e] rounded-xl flex items-center justify-center text-2xl">📷</div>
                <div className="text-center"><p className="text-slate-300 text-sm font-medium">Tap to upload image</p><p className="text-slate-600 text-xs mt-1">Max 10MB</p></div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden"/>
          </div>
          <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div><div className="text-white font-semibold text-sm">⭐ Premium Content</div><div className="text-slate-500 text-xs mt-0.5">Only paid members can view this</div></div>
              <button onClick={() => setForm({ ...form, isPremium: !form.isPremium })}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.isPremium ? 'bg-violet-600' : 'bg-[#2a2a3e]'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow ${form.isPremium ? 'translate-x-7' : 'translate-x-1'}`}/>
              </button>
            </div>
            {form.isPremium && <div className="mt-3 bg-amber-400/10 border border-amber-400/20 rounded-xl p-3 text-amber-400 text-xs">💰 Premium ideas earn revenue when members view them.</div>}
          </div>
        </>}

        {step === 2 && <div className="space-y-4">
          <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-2xl overflow-hidden">
            {preview && <img src={preview} alt="cover" className="w-full h-40 object-cover"/>}
            {!preview && <div className="h-24 bg-gradient-to-br from-violet-900/40 to-purple-900/40 flex items-center justify-center"><span className="text-4xl opacity-30">💡</span></div>}
            <div className="p-4">
              <div className="flex gap-2 flex-wrap mb-2">
                {form.isPremium && <span className="bg-amber-400/20 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full">⭐ Premium</span>}
                <span className="bg-violet-600/20 text-violet-400 text-xs px-2.5 py-1 rounded-full">{form.category}</span>
              </div>
              <h3 className="text-white font-bold text-base mb-2">{form.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{form.description}</p>
            </div>
          </div>
          <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-2xl p-4">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Security Check</p>
            {[
              { label: 'Cosine Similarity Check', done: checkResult !== null && checkResult !== 'flagged' },
              { label: 'Plagiarism Detection',    done: checkResult === 'ok' },
              { label: 'Publish to Feed',         done: publishing && checkResult === 'ok' },
            ].map(({ label, done }, idx) => (
              <div key={label} className="flex items-center gap-3 mb-2.5 last:mb-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs transition-colors
                  ${done ? 'bg-emerald-500/20 text-emerald-400' : checking && idx === 0 ? 'border-2 border-violet-400 border-t-transparent animate-spin' : 'bg-[#2a2a3e] text-slate-600'}`}>
                  {done && '✓'}
                </div>
                <span className={`text-sm ${done ? 'text-emerald-400' : 'text-slate-500'}`}>{label}</span>
              </div>
            ))}
          </div>
          {checkResult === 'flagged' && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">⚠️ {error}</div>}
        </div>}

        {error && step < 2 && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}

        {step < 2 ? (
          <button onClick={nextStep} className="w-full bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-violet-500/25">Continue →</button>
        ) : (
          <button onClick={handlePublish} disabled={checking || publishing || checkResult === 'flagged'}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50">
            {checking ? '🔍 Checking...' : publishing ? '🚀 Publishing...' : checkResult === 'flagged' ? '⚠️ Cannot publish' : '🚀 Publish Idea'}
          </button>
        )}
      </div>
      <BottomNav/>
    </div>
  );
}
