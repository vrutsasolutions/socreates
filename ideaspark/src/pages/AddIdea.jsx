import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav.premium';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { hasCreatorPro } from '../api/paymentApi';
import { AIAssistantBar } from '../components/common/AIInteractions.premium';

const CATEGORIES = [
  'Technology','Design','Business','Science','Art','Health',
  'Education','Finance','Music','Travel','Food','Sports'
];

const STEPS = ['Details', 'Media', 'Publish'];

export default function AddIdea() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const { user } = useAuth();
  const creatorPro = hasCreatorPro(user);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    isPremium: false
  });

  const MAX_IMAGES = 5;
  const [images, setImages] = useState([]);     // File[]
  const [previews, setPreviews] = useState([]); // object-URL string[] (index-aligned with images)

  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [error, setError] = useState('');

  const inputCls =
    "w-full bg-[#F4F7FF] border border-[#BBDEFB] rounded-2xl px-4 py-3 text-[#0D2137] text-sm focus:outline-none focus:border-[#1565C0]";

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleImage = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages((prev) => [...prev, ...files].slice(0, MAX_IMAGES));
    setPreviews((prev) => {
      const room = MAX_IMAGES - prev.length;
      return [...prev, ...files.slice(0, room).map((f) => URL.createObjectURL(f))];
    });
    e.target.value = ''; // let the user re-pick the same file
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const nextStep = () => {
    if (step === 0) {
      if (!form.title.trim()) return setError('Title is required');
      if (!form.description.trim()) return setError('Description is required');
      if (!form.category) return setError('Please select a category');
      setError('');
    }
    setStep((s) => s + 1);
  };

  const handlePublish = async () => {
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

      // Non-Pro creators can never publish premium content.
      const payload = { ...form, isPremium: creatorPro ? form.isPremium : false };

      const fd = new FormData();
      fd.append('idea', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      // Backwards-compatible: current backend stores a single cover via `image`.
      // Also send every file as repeated `images` parts for the multi-image
      // contract (API_CONTRACT §3) once Vishakha implements it.
      if (images[0]) fd.append('image', images[0]);
      images.forEach((img) => fd.append('images', img));

      await api.post('/ideas', fd);

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

      {/* HEADER */}
      <div className="bg-[#1565C0] px-4 pt-5 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-44 h-44 rounded-full border-[28px] border-white/5 -top-16 -right-12" />
          <div className="absolute w-36 h-36 rounded-full border-[22px] border-white/5 -bottom-14 -left-10" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => (step > 0 ? setStep(s => s - 1) : navigate(-1))}
            className="text-white text-xl"
          >
            ←
          </button>

          <h1 className="text-white font-bold text-lg flex-1">
            Add New Idea
          </h1>

          <span className="text-blue-100 text-sm">
            {step + 1}/{STEPS.length}
          </span>
        </div>

        {/* STEP BAR */}
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
            <AIAssistantBar onAsk={() => {}} />

            <div>
              <label className="text-xs font-bold text-[#0D2137]">Idea Title</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0D2137]">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
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
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {previews.map((src, i) => (
                    <div key={src} className="relative aspect-square rounded-xl overflow-hidden border border-[#BBDEFB]">
                      <img src={src} className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label="Remove image"
                        className="absolute top-1 right-1 w-5 h-5 bg-black/55 text-white rounded-full flex items-center justify-center text-xs leading-none active:scale-90"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {previews.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileRef.current.click()}
                      className="aspect-square rounded-xl border-dashed border-2 border-[#BBDEFB] bg-[#F4F7FF] text-[#90A4AE] flex flex-col items-center justify-center text-xs active:scale-95"
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
              /* Creator Pro — premium publishing allowed */
              <div className="border border-[#BBDEFB] rounded-2xl p-4 bg-[#F4F7FF] flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm text-[#0D2137]">Premium Content</p>
                  <p className="text-xs text-[#90A4AE]">Paid users only</p>
                </div>

                <button
                  onClick={() =>
                    setForm({ ...form, isPremium: !form.isPremium })
                  }
                  className={`w-12 h-6 rounded-full transition ${
                    form.isPremium ? 'bg-[#1565C0]' : 'bg-[#BBDEFB]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full ml-1 transition-transform ${
                      form.isPremium ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            ) : (
              /* Free creator — premium publishing locked behind Creator Pro */
              <div className="space-y-5">
                <div className="border border-[#E2E6F0] rounded-2xl p-4 bg-white">
                  <p className="font-bold text-[#0D2137]">Premium Content</p>
                  <p className="text-xs text-[#90A4AE] mt-1">
                    Premium publishing requires Creator Pro.
                  </p>

                  <div className="flex justify-between items-center mt-5">
                    <p className="font-bold text-sm text-[#0D2137]">Premium Toggle</p>
                    <span className="bg-[#E2E6F0] text-[#546E7A] text-xs font-bold px-3 py-1.5 rounded-full select-none">
                      OFF
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/creator-pro')}
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
                <p className="text-sm text-[#546E7A] line-clamp-3">
                  {form.description}
                </p>
              </div>
            </div>

            <div className="border border-[#BBDEFB] rounded-2xl p-4 bg-[#F4F7FF]">
              <p className="text-xs font-bold text-[#0D2137]">Security Check</p>
              <p className="text-sm text-[#546E7A]">
                AI + plagiarism + validation checks
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pb-6">
          {step < 2 ? (
            <button
              onClick={nextStep}
              className="w-full bg-[#1565C0] text-white py-3 rounded-2xl font-semibold"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handlePublish}
              className="w-full bg-[#1565C0] text-white py-3 rounded-2xl font-semibold"
            >
              {checking
                ? 'Checking...'
                : publishing
                ? 'Publishing...'
                : 'Publish'}
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}