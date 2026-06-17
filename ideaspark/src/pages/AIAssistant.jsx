// ════════════════════════════════════════════════════════════════════════
//  AIAssistant — "SparkBot", the in-app AI idea assistant.
//  Opened from the floating AI button on Home (/assistant).
//
//  Flow: a short scripted onboarding (what brings you here → industry →
//  describe your idea) then hands off to the live assistant endpoint.
//  Data: aiApi.chatWithAssistant(messages) → { reply }  (mock-backed until
//  /api/ai/chat is live — see api/config.js USE_MOCK.ai).
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatWithAssistant } from '../api/aiApi';

// Quick-reply chip sets for the scripted onboarding steps.
const BRING_CHIPS = [
  { label: '💡 Share my ideas', primary: true },
  { label: '🔍 Explore ideas' },
  { label: '🤝 Find collaborators' },
  { label: '📈 Validate idea' },
];

const INDUSTRY_CHIPS = [
  { label: '💻 Tech' },
  { label: '🎓 Education' },
  { label: '🏥 Health' },
  { label: '🎨 Design' },
  { label: 'Other' },
];

// Persistent prompt chips above the composer.
const ACTIONS = [
  { label: 'Generate idea', icon: '💡', color: '#1565C0' },
  { label: 'Refine idea',   icon: '✏️', color: '#1565C0' },
  { label: 'Validate',      icon: '✅', color: '#15803D' },
];

let _seq = 0;
const uid = () => `m${Date.now()}_${_seq++}`;

function BotAvatar() {
  return (
    <div className="w-9 h-9 rounded-full bg-[#1565C0] flex items-center justify-center shrink-0 shadow-sm">
      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l1.6 4.6L18 8.2l-4.4 1.6L12 14l-1.6-4.2L6 8.2l4.4-1.6L12 2z" />
        <path d="M19 13l.8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13z" />
      </svg>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-[#90A4AE] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState(0); // 0: reason · 1: industry · 2: describe · 3+: AI
  const scrollRef = useRef(null);

  // Seed the opening greeting + first question.
  useEffect(() => {
    setMessages([
      {
        id: uid(),
        from: 'bot',
        text: "👋 Hey! Welcome to SoCreates!\n\nI'm SparkBot — your personal idea assistant. Let me get to know you 😊",
      },
      { id: uid(), from: 'bot', text: 'What brings you to SoCreates?', chips: BRING_CHIPS },
    ]);
  }, []);

  // Keep the latest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const pushBot = (msg) =>
    setMessages((prev) => [...prev, { id: uid(), from: 'bot', ...msg }]);

  // Scripted bot reply with a brief typing delay.
  const botSay = (msg, delay = 600) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      pushBot(msg);
    }, delay);
  };

  const handleSend = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;

    const userMsg = { id: uid(), from: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Scripted onboarding steps.
    if (step === 0) {
      setStep(1);
      botSay({ text: 'What industry are you in? 🏭', chips: INDUSTRY_CHIPS });
      return;
    }
    if (step === 1) {
      setStep(2);
      botSay({ text: "Describe your idea in one sentence (or skip if you don't have one) 👇" });
      return;
    }

    // Hand off to the live assistant.
    setStep(3);
    setTyping(true);
    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.from === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
      const { data } = await chatWithAssistant(history);
      pushBot({ text: data?.reply || "Here's a thought — start small and validate with real users first." });
    } catch {
      pushBot({ text: "Hmm, I couldn't reach my brain just now. Mind trying again in a moment?" });
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#EAF1FB]">

      {/* HEADER */}
      <header className="bg-[#1565C0] px-4 pt-4 pb-5 relative shadow-lg shrink-0">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full border-[30px] border-white/5 -top-20 -right-10" />
          <div className="absolute w-24 h-24 rounded-full bg-white/5 -bottom-8 right-16" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="w-10 h-10 rounded-full bg-white/20 border border-white/25 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l1.6 4.6L18 8.2l-4.4 1.6L12 14l-1.6-4.2L6 8.2l4.4-1.6L12 2z" />
              <path d="M19 13l.8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13z" />
            </svg>
          </div>

          <div className="min-w-0">
            <h1 className="text-white font-bold text-lg leading-tight">SparkBot</h1>
            <p className="text-blue-100 text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
              Online — by SoCreates
            </p>
          </div>
        </div>
      </header>

      {/* MESSAGES */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        <div className="flex justify-center">
          <span className="text-[11px] font-semibold text-[#90A4AE] bg-white/60 px-3 py-1 rounded-full">Today</span>
        </div>

        {messages.map((m, idx) => {
          const isLast = idx === messages.length - 1;
          if (m.from === 'user') {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] bg-[#1565C0] text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] font-medium shadow-sm whitespace-pre-line">
                  {m.text}
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className="flex flex-col gap-2.5">
              <div className="flex items-end gap-2">
                <BotAvatar />
                <div className="max-w-[80%] bg-white rounded-2xl rounded-bl-md px-4 py-3 text-[15px] text-[#0D2137] shadow-sm whitespace-pre-line">
                  {m.text}
                </div>
              </div>

              {/* Quick replies — only on the most recent bot message */}
              {m.chips && isLast && !typing && (
                <div className="flex flex-wrap gap-2 pl-11">
                  {m.chips.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => handleSend(c.label)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                        c.primary
                          ? 'bg-[#1565C0] text-white shadow-md shadow-blue-200'
                          : 'bg-white text-[#1565C0] border border-[#1565C0]/60 hover:bg-[#F0F6FF]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {typing && <TypingBubble />}
      </div>

      {/* COMPOSER */}
      <div className="shrink-0 bg-white border-t border-[#E3F2FD]">
        {/* Action prompt chips */}
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto">
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => handleSend(`${a.icon} ${a.label}`)}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#BBDEFB] text-sm font-semibold bg-white hover:bg-[#F0F6FF] active:scale-95 transition-all"
              style={{ color: a.color }}
            >
              <span>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2 px-4 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Type..."
            className="flex-1 bg-[#F0F6FF] border border-[#E3F2FD] rounded-full px-4 py-3 text-[15px] text-[#0D2137] placeholder-[#90A4AE] focus:outline-none focus:border-[#1565C0]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || typing}
            aria-label="Send message"
            className="w-12 h-12 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0 shadow-md hover:bg-[#0D47A1] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
