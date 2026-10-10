/** Emoji sticker packs. Two are free; the rest unlock with Fuzzies. */

export interface StickerPack { id: string; name: string; cost: number; items: string[] }

export const STICKER_PACKS: StickerPack[] = [
  { id: 'stk-faces', name: 'Feelings', cost: 0, items: '😀 😂 🥰 😍 😎 🤩 🥳 😜 🤔 😴 😭 😡 🤯 🥺 😇 🤗 🙌 👏 👍 ✌️ 🤞 💪 👀 🔥'.split(' ') },
  { id: 'stk-love', name: 'Love & Sparkle', cost: 0, items: '❤️ 🧡 💛 💚 💙 💜 🤍 🖤 💖 💝 💕 ✨ ⭐ 🌟 💫 🌈 ☀️ 🎵 🎶 💬'.split(' ') },
  { id: 'stk-party', name: 'Party', cost: 15, items: '🎉 🎊 🎈 🎂 🍰 🧁 🎁 🎀 🪅 🥂 🍾 🎤 🎧 🎸 🪩 🕺 💃 🎆 🎇 🏆 🥇 👑'.split(' ') },
  { id: 'stk-nature', name: 'Nature', cost: 15, items: '🌸 🌺 🌻 🌷 🌹 🌼 🍀 🌿 🍃 🌵 🌴 🌲 🍁 🍄 🌊 🌙 ⛰️ 🌋 ❄️ 🌤️ 🦋 🐝'.split(' ') },
  { id: 'stk-food', name: 'Yummy', cost: 15, items: '🍕 🍔 🍟 🌮 🍣 🍩 🍪 🍫 🍦 🍓 🍉 🍑 🍋 🥑 🥐 🧋 ☕ 🍹 🥤 🍿'.split(' ') },
  { id: 'stk-animals', name: 'Cute Animals', cost: 20, items: '🐶 🐱 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐸 🐵 🐧 🐥 🦄 🐙 🐳 🐬 🦖 🐢 🦔'.split(' ') },
  { id: 'stk-space', name: 'Space & Magic', cost: 25, items: '🚀 🛸 🪐 🌍 🌌 ☄️ 👽 🤖 🔮 🪄 🧿 💎 🦄 🧚 🧞 🐉 ⚡ 🌠'.split(' ') },
  { id: 'stk-travel', name: 'Travel', cost: 20, items: '✈️ 🗺️ 🏝️ 🏖️ 🗽 🗼 🏰 🎡 🚗 🚲 ⛵ 🏕️ 📸 🧳 🎒 🌅 🌄 🏔️'.split(' ') },
];
