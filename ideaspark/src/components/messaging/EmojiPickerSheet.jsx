// ════════════════════════════════════════════════════════════════════════
//  EmojiPickerSheet — tap-to-insert emoji tray for Chat's composer.
//  WhatsApp-style: category tabs across the top, a scrollable grid below,
//  a "Recently used" tab that remembers your last picks (localStorage).
//  Tapping an emoji inserts it and keeps the sheet open so you can pick
//  several in a row; tap the backdrop or the emoji toggle button to close.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from "react";

const SHEET_CSS = `
  @keyframes scSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes scFadeIn  { from { opacity: 0; } to { opacity: 1; } }
  .sc-sheet { animation: scSheetUp 220ms cubic-bezier(0.32,0.72,0,1); }
  .sc-backdrop { animation: scFadeIn 160ms ease; }
`;

const RECENTS_KEY = "sc_recent_emojis";
const RECENTS_MAX = 24;

// ── Category data — a wide, curated spread per category (not the full
// Unicode set, but broad enough to feel like a real emoji keyboard). ──────
const CATEGORIES = [
  {
    key: "smileys",
    tab: "😀",
    label: "Smileys & Emotion",
    emojis:
      "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾"
        .split(" "),
  },
  {
    key: "people",
    tab: "👋",
    label: "People & Body",
    emojis:
      "👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦵 🦶 👂 👃 🧠 👀 👁️ 👅 👄 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵️ 💂 👷 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🤱 👼 🎅 🤶 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 💆 💇 🚶 🧍 🧎 🏃 💃 🕺 🧖 🧗 🤺 🏇 🏄 🚣 🏊 🏋️ 🚴 🚵 🤸 🤼 🤽 🤾 🤹 🧘 🛀 🛌 👭 👫 👬 💏 💑 👪"
        .split(" "),
  },
  {
    key: "animals",
    tab: "🐻",
    label: "Animals & Nature",
    emojis:
      "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦟 🦗 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🐃 🐂 🐄 🐎 🐖 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐈 🐓 🦃 🦚 🦜 🦢 🦩 🕊️ 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿️ 🦔 🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🍃 🍂 🍁 🍄 🌾 💐 🌷 🌹 🌺 🌸 🌼 🌻 🌞 🌝 🌛 🌜 🌚 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙 🌎 🌍 🌏 💫 ⭐ 🌟 ✨ ⚡ ☄️ 💥 🔥 🌈 ☀️ ⛅ ☁️ 🌧️ ⛈️ ❄️ ☃️ ⛄ 💨 💧 💦 ☔ 🌊"
        .split(" "),
  },
  {
    key: "food",
    tab: "🍔",
    label: "Food & Drink",
    emojis:
      "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🥙 🧆 🌮 🌯 🥗 🥘 🥫 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 ☕ 🍵 🧃 🥤 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🍾 🧊"
        .split(" "),
  },
  {
    key: "activities",
    tab: "⚽",
    label: "Activities",
    emojis:
      "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚴 🚵 🏅 🎖️ 🏆 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻 🎲 ♟️ 🎯 🎳 🎮 🎰 🧩"
        .split(" "),
  },
  {
    key: "travel",
    tab: "🚗",
    label: "Travel & Places",
    emojis:
      "🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛴 🚲 🛵 🏍️ 🛺 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ ⛽ 🚧 🚦 🚥 🚏 🗺️ 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🏠 🏡 🏘️ 🏗️ 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛️ ⛪ 🕌 🕍 🛕 🕋 ⛩️"
        .split(" "),
  },
  {
    key: "objects",
    tab: "💡",
    label: "Objects",
    emojis:
      "⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🕹️ 💽 💾 💿 📀 📷 📸 📹 🎥 📞 ☎️ 📺 📻 🎙️ 🧭 ⏱️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🔌 💡 🔦 🕯️ 🧯 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🧰 🔧 🔨 ⚒️ 🛠️ ⛏️ 🔩 ⚙️ 🧱 ⛓️ 🧲 🔫 🧨 🪓 🔪 🗡️ 🛡️ ⚰️ 🔮 📿 🔭 🔬 🩹 🩺 💊 💉 🩸 🧬 🧹 🧺 🧻 🚽 🚿 🛁 🧼 🪥 🪒 🧴 🧵 🧶 👓 🕶️ 🥽 🥼 👔 👕 👖 🧣 🧤 🧥 🧦 👗 👘 👙 👚 👛 👜 👝 🎒 👞 👟 👠 👡 👢 👑 👒 🎩 🎓 🧢 💄 💍 💼"
        .split(" "),
  },
  {
    key: "symbols",
    tab: "❤️",
    label: "Symbols",
    emojis:
      "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ ☯️ ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ⚛️ ☢️ ☣️ 📴 📳 ✴️ 💮 ㊙️ ㊗️ 🆚 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❓ ❕ ❔ ‼️ ⁉️ ⚠️ 🚸 🔱 ⚜️ ♻️ ✅ ❇️ ✳️ ❎ 🌐 💠 🌀 💤 🅿️"
        .split(" "),
  },
  {
    key: "flags",
    tab: "🏳️",
    label: "Flags",
    emojis:
      "🏳️ 🏴 🏁 🚩 🏳️‍🌈 🇺🇳 🇮🇳 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇩🇪 🇫🇷 🇮🇹 🇪🇸 🇵🇹 🇳🇱 🇧🇪 🇨🇭 🇸🇪 🇳🇴 🇩🇰 🇫🇮 🇮🇪 🇵🇱 🇦🇹 🇬🇷 🇷🇺 🇺🇦 🇹🇷 🇯🇵 🇰🇷 🇨🇳 🇭🇰 🇸🇬 🇹🇭 🇻🇳 🇵🇭 🇮🇩 🇲🇾 🇧🇩 🇵🇰 🇱🇰 🇳🇵 🇦🇪 🇸🇦 🇶🇦 🇮🇱 🇪🇬 🇿🇦 🇳🇬 🇰🇪 🇧🇷 🇦🇷 🇲🇽 🇨🇱 🇨🇴 🇵🇪 🇳🇿"
        .split(" "),
  },
];

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRecents(list) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, RECENTS_MAX)));
  } catch {
    /* localStorage unavailable — recents just won't persist, non-fatal */
  }
}

export default function EmojiPickerSheet({ onClose, onSelect }) {
  const [recents, setRecents] = useState(loadRecents);
  const [active, setActive] = useState(recents.length ? "recent" : "smileys");

  useEffect(() => {
    // If recents were empty on mount but the user picks one, jump the tab
    // selector's availability without forcing them off their current tab.
  }, []);

  const tabs = useMemo(
    () => [
      ...(recents.length
        ? [{ key: "recent", tab: "🕒", label: "Recently used", emojis: recents }]
        : []),
      ...CATEGORIES,
    ],
    [recents],
  );

  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  const pick = (emoji) => {
    onSelect(emoji);
    setRecents((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, RECENTS_MAX);
      saveRecents(next);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <style>{SHEET_CSS}</style>
      <div
        className="sc-backdrop absolute inset-0 bg-[#0D2137]/45"
        onClick={onClose}
      />
      <div className="sc-sheet relative w-full max-w-[430px] bg-white rounded-t-3xl flex flex-col h-[62vh] max-h-[440px]">
        <div className="w-10 h-1 rounded-full bg-[#DBEAFE] mx-auto mt-3 mb-2 shrink-0" />

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto px-3 pb-2 shrink-0 border-b border-[#F0F6FF]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              aria-label={t.label}
              className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all active:scale-90 ${
                active === t.key
                  ? "bg-[#E3F2FD] ring-2 ring-[#1565C0]"
                  : "hover:bg-[#F0F6FF]"
              }`}
            >
              {t.tab}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <p className="text-[11px] font-bold tracking-widest text-[#90A4AE] uppercase px-2 mb-1.5">
            {current?.label}
          </p>
          <div className="grid grid-cols-7 sm:grid-cols-8">
            {current?.emojis.map((e, i) => (
              <button
                key={`${e}-${i}`}
                onClick={() => pick(e)}
                className="aspect-square flex items-center justify-center text-[26px] rounded-xl hover:bg-[#F0F6FF] active:scale-90 transition-all"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
