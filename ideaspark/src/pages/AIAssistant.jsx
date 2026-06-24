import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatWithAssistant } from '../api/aiApi';

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

const ACTIONS = [
  { label: 'Generate idea', icon: '💡', color: '#1565C0' },
  { label: 'Refine idea',   icon: '✏️', color: '#1565C0' },
  { label: 'Validate',      icon: '✅', color: '#15803D' },
  { label: 'Write for me',  icon: '📝', color: '#1565C0' },
];

let _seq = 0;
const uid = () => `m${Date.now()}_${_seq++}`;

function BotAvatar() {
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0
                    border-2 border-[#DBEAFE] bg-white"
         style={{ boxShadow: '0 4px 12px rgba(21,101,192,0.2)' }}>
      
      <img src="/favicon.png" alt="SparkBot" className="w-full h-full object-contain" />
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div className="bg-white border border-[#DBEAFE] rounded-2xl rounded-bl-sm
                      px-4 py-3 shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-2 h-2 rounded-full bg-[#1565C0] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s`, opacity: 0.6 }} />
        ))}
      </div>
    </div>
  );
}

// Animated floating particles in chat background
function ChatBackground() {
  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0px) scale(1);      opacity: 0.12; }
          50%  { transform: translateY(-18px) scale(1.15); opacity: 0.18; }
          100% { transform: translateY(0px) scale(1);      opacity: 0.12; }
        }
        @keyframes sparkle {
          0%,100% { opacity: 0.08; transform: scale(1) rotate(0deg); }
          50%      { opacity: 0.20; transform: scale(1.3) rotate(20deg); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); }
          50%      { box-shadow: 0 0 0 5px rgba(74,222,128,0); }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chat-particle   { animation: floatUp 4s ease-in-out infinite; }
        .chat-sparkle    { animation: sparkle 3s ease-in-out infinite; }
        .ai-header-grad  {
          background: linear-gradient(135deg, #1565C0, #0D47A1, #1976D2, #0A3880);
          background-size: 300% 300%;
          animation: gradientShift 6s ease infinite;
        }
        .online-dot      { animation: pulseGlow 2s ease-in-out infinite; }
        .msg-in          { animation: msgIn 0.3s ease forwards; }
      `}</style>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Floating dots */}
        {[
          { top:'12%', left:'8%',  size:8,  delay:'0s'   },
          { top:'28%', left:'88%', size:6,  delay:'0.8s' },
          { top:'45%', left:'15%', size:10, delay:'1.6s' },
          { top:'62%', left:'80%', size:7,  delay:'0.4s' },
          { top:'78%', left:'25%', size:5,  delay:'1.2s' },
          { top:'90%', left:'70%', size:8,  delay:'2s'   },
        ].map((p, i) => (
          <div key={i} className="chat-particle absolute rounded-full bg-[#1565C0]"
               style={{ top: p.top, left: p.left,
                        width: p.size, height: p.size,
                        animationDelay: p.delay, opacity: 0.12 }} />
        ))}

        {/* Sparkle stars */}
        {[
          { top:'20%', left:'55%', delay:'0.3s' },
          { top:'55%', left:'42%', delay:'1.1s' },
          { top:'75%', left:'10%', delay:'1.8s' },
        ].map((s, i) => (
          <div key={i} className="chat-sparkle absolute text-[#1565C0] select-none"
               style={{ top: s.top, left: s.left, fontSize: 14,
                        animationDelay: s.delay }}>
            ✦
          </div>
        ))}

        {/* Subtle gradient orbs */}
        <div className="absolute rounded-full"
             style={{ top:'10%', right:'-5%', width:180, height:180,
                      background:'radial-gradient(circle, rgba(21,101,192,0.06) 0%, transparent 70%)' }} />
        <div className="absolute rounded-full"
             style={{ bottom:'15%', left:'-8%', width:160, height:160,
                      background:'radial-gradient(circle, rgba(21,101,192,0.05) 0%, transparent 70%)' }} />
      </div>
    </>
  );
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [typing, setTyping]     = useState(false);
  const [step, setStep]         = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        id: uid(), from: 'bot',
        text: "👋 Hey! Welcome to SoCreate!\n\nI'm SparkBot — your personal idea assistant. Let me get to know you 😊",
      },
      { id: uid(), from: 'bot', text: 'What brings you to SoCreate?', chips: BRING_CHIPS },
    ]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const pushBot = (msg) =>
    setMessages((prev) => [...prev, { id: uid(), from: 'bot', ...msg }]);

  const botSay = (msg, delay = 600) => {
    setTyping(true);
    setTimeout(() => { setTyping(false); pushBot(msg); }, delay);
  };

  const handleSend = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;

    const userMsg = { id: uid(), from: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

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

    setStep(3);
    setTyping(true);
    try {
      const { data } = await chatWithAssistant(text, "chat");
      pushBot({ text: data?.reply || "Here's a thought — start small and validate with real users first." });
    } catch {
      pushBot({ text: "Hmm, I couldn't reach my brain just now. Mind trying again in a moment?" });
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F4F7FF]">

      {/* ── HEADER ── */}
      <header className="ai-header-grad px-4 pt-4 pb-5 relative shadow-xl shrink-0 overflow-hidden">

        {/* Decorative rings */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-48 h-48 rounded-full border-[36px] border-white/5 -top-20 -right-12" />
          <div className="absolute w-28 h-28 rounded-full border-[20px] border-white/5 -bottom-10 left-8" />
          <div className="absolute w-16 h-16 rounded-full bg-white/5 top-4 right-28" />
        </div>

        <div className="flex items-center gap-3 relative z-10">

          {/* Back button */}
          <button onClick={() => navigate(-1)} aria-label="Go back"
                  className="w-9 h-9 flex items-center justify-center rounded-full
                             bg-white/15 text-white hover:bg-white/25
                             active:scale-90 transition-all border border-white/10">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>


          <div className="w-11 h-11 rounded-full overflow-hidden shrink-0
                          border-2 border-white/30 bg-white"
               style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
            <img src="/favicon.png" alt="SoCreate favicon"
                 className="w-full h-full object-contain" />
          </div>

          {/* Bot info */}
          <div className="min-w-0 flex-1">
            <h1 className="text-white font-bold text-[17px] leading-tight tracking-[-0.3px]">
              SparkBot
            </h1>
            <p className="text-blue-100/70 text-[12px] flex items-center gap-1.5 mt-0.5">
              <span className="online-dot w-2 h-2 rounded-full bg-[#4ADE80] inline-block
                               shrink-0" />
              Online — by SoCreate
            </p>
          </div>

        </div>

        {/* Tagline banner */}
        <div className="relative z-10 mt-4 rounded-2xl px-4 py-2.5 flex items-center gap-3
                        bg-white/10 border border-white/15 backdrop-blur-sm">
          <span className="text-lg shrink-0">✨</span>
          <p className="text-white/80 text-[12px] leading-relaxed">
            Ask me anything about ideas — I'll help you generate, refine & validate them.
          </p>
        </div>
      </header>

      {/* ── MESSAGES ── */}
      <div ref={scrollRef}
           className="flex-1 overflow-y-auto px-4 py-5 space-y-5 relative">
        <ChatBackground />

        

        {messages.map((m, idx) => {
          const isLast = idx === messages.length - 1;
          if (m.from === 'user') {
            return (
              <div key={m.id} className="flex justify-end relative z-10 msg-in">
                <div className="max-w-[80%] text-white rounded-2xl rounded-br-sm
                                px-4 py-3 text-[14px] font-medium leading-relaxed
                                whitespace-pre-line"
                     style={{ background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
                              boxShadow: '0 4px 14px rgba(21,101,192,0.30)' }}>
                  {m.text}
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className="flex flex-col gap-2.5 relative z-10 msg-in">
              <div className="flex items-end gap-2">
                <BotAvatar />
                <div className="max-w-[80%] bg-white border border-[#DBEAFE]
                                rounded-2xl rounded-bl-sm px-4 py-3
                                text-[14px] text-[#0D2137] leading-relaxed
                                shadow-sm whitespace-pre-line">
                  {m.text}
                </div>
              </div>

              {/* Quick reply chips */}
              {m.chips && isLast && !typing && (
                <div className="flex flex-wrap gap-2 pl-11">
                  {m.chips.map((c) => (
                    <button key={c.label} onClick={() => handleSend(c.label)}
                            className={`px-4 py-2 rounded-full text-[13px] font-semibold
                                        transition-all active:scale-95
                                        ${c.primary
                                          ? 'text-white shadow-md shadow-blue-300/40'
                                          : 'bg-white text-[#1565C0] border-[1.5px] border-[#DBEAFE] hover:bg-[#F4F7FF]'}`}
                            style={c.primary
                              ? { background: 'linear-gradient(135deg, #1565C0, #0D47A1)' }
                              : {}}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {typing && (
          <div className="relative z-10">
            <TypingBubble />
          </div>
        )}
      </div>

      {/* ── COMPOSER ── */}
      <div className="shrink-0 bg-white border-t border-[#DBEAFE]"
           style={{ boxShadow: '0 -4px 20px rgba(21,101,192,0.07)' }}>

        {/* Action chips */}
        <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto">
          {ACTIONS.map((a) => (
            <button key={a.label}
                    onClick={() => handleSend(`${a.icon} ${a.label}`)}
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2
                               rounded-full border-[1.5px] border-[#DBEAFE]
                               text-[12px] font-semibold bg-white
                               hover:bg-[#F4F7FF] active:scale-95 transition-all"
                    style={{ color: a.color }}>
              <span>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Ask SparkBot anything..."
            className="flex-1 bg-[#F4F7FF] border-[1.5px] border-[#DBEAFE]
                       rounded-full px-4 py-3 text-[14px] text-[#0D2137]
                       placeholder-[#90A4AE] focus:outline-none
                       focus:border-[#1565C0] focus:ring-2
                       focus:ring-[#1565C0]/10 transition-all"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || typing}
            aria-label="Send message"
            className="w-12 h-12 rounded-full text-white flex items-center
                       justify-center shrink-0 active:scale-95 transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
                     boxShadow: '0 4px 14px rgba(21,101,192,0.35)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
}