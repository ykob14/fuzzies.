/** Fuzzies topic icons, part FUN — original flat vector artwork drawn in code. */
import type { AssetDef } from '../index';
import { asset, dk, lt, mix, sparkle } from '../draw';
const A = asset('icons', ['icon']);

/** Soft ground shadow under an object. */
const shadow = (cx: number, cy: number, rx: number, ry = 8) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity=".10"/>`;
/** A heart centred on (cx, cy), `s` = half width. */
const heart = (cx: number, cy: number, s: number, fill: string) => {
  const p = (x: number, y: number) => `${(cx + x * s).toFixed(1)} ${(cy + y * s).toFixed(1)}`;
  return `<path d="M${p(0, 0.95)} C${p(-0.55, 0.6)} ${p(-1.05, 0.2)} ${p(-1, -0.3)} C${p(-0.95, -0.85)} ${p(-0.25, -0.95)} ${p(0, -0.45)} C${p(0.25, -0.95)} ${p(0.95, -0.85)} ${p(1, -0.3)} C${p(1.05, 0.2)} ${p(0.55, 0.6)} ${p(0, 0.95)}Z" fill="${fill}"/>`;
};
/** A tone that stands out on `c`: lighter on dark colours, darker on light ones. */
const onTone = (c: string) => { const n = parseInt(c.slice(1, 7), 16); const l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); return l < 140 ? lt(c, 0.55) : dk(c, 0.45); };
const R = 'stroke-linecap="round" stroke-linejoin="round" fill="none"';
/** An eighth note: head at (x, y), stem up to `top`. */
const note = (x: number, y: number, top: number, c: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="15" ry="11.5" transform="rotate(-22 ${x} ${y})" fill="${c}"/>` +
  `<path d="M${x + 12} ${y - 3} V${top}" stroke="${c}" stroke-width="9" ${R}/>` +
  `<path d="M${x + 12} ${top} Q${x + 18} ${top + 18} ${x + 32} ${top + 22} Q${x + 30} ${top + 36} ${x + 22} ${top + 44}" stroke="${c}" stroke-width="9" ${R}/>`;
/** A five-point star centred on (cx, cy). */
const starPath = (cx: number, cy: number, ro: number, ri: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro, t = -Math.PI / 2 + (i * Math.PI) / 5;
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(t)).toFixed(1)} ${(cy + r * Math.sin(t)).toFixed(1)}`;
  }
  return d + 'Z';
};

export const ICONS_FUN: AssetDef[] = [
  A('ic-open-mic', 'Open mic', 'illustration', 240, 240, ['#e5487b', '#2f3350'], ['open mic', 'microphone', 'mic', 'stand', 'stage', 'poetry', 'spoken word', 'performance'], ([m, a]) =>
    shadow(120, 213, 66) +
    `<ellipse cx="120" cy="203" rx="56" ry="12" fill="${a}"/>` +
    `<path d="M120 150 V200" stroke="${a}" stroke-width="12" ${R}/>` +
    `<path d="M104 114 H136 L130 156 Q120 162 110 156 Z" fill="${lt(a, 0.25)}"/>` +
    `<rect x="74" y="16" width="92" height="96" rx="46" fill="${m}"/>` +
    `<path d="M88 44 H152 M82 62 H158 M82 80 H158 M88 98 H152" stroke="${dk(m, 0.18)}" stroke-width="7" ${R}/>` +
    `<path d="M120 24 V106" stroke="${dk(m, 0.18)}" stroke-width="7" ${R}/>` +
    `<path d="M96 34 Q104 26 114 24" stroke="#fff" stroke-width="7" opacity=".55" ${R}/>` +
    `<rect x="72" y="104" width="96" height="18" rx="9" fill="${a}"/>`),

  A('ic-karaoke', 'Karaoke', 'illustration', 240, 240, ['#7a5af5', '#f2b134'], ['karaoke', 'microphone', 'singing', 'sing', 'music', 'notes', 'song', 'party'], ([m, a]) =>
    `<g transform="translate(106 128) rotate(-32)">` +
    `<path d="M-17 -8 H17 L11 82 Q0 90 -11 82 Z" fill="${dk(m, 0.3)}"/>` +
    `<rect x="-14" y="54" width="28" height="10" rx="4" fill="${a}"/>` +
    `<circle cx="0" cy="-48" r="38" fill="${m}"/>` +
    `<path d="M-30 -60 H30 M-36 -44 H36 M-30 -28 H30 M-8 -82 V-14 M14 -80 V-16" stroke="${dk(m, 0.2)}" stroke-width="6" ${R}/>` +
    `<path d="M-24 -70 Q-16 -80 -4 -82" stroke="#fff" stroke-width="7" opacity=".55" ${R}/>` +
    `<rect x="-22" y="-16" width="44" height="16" rx="8" fill="${a}"/>` +
    `</g>` +
    note(150, 108, 46, a) +
    `<ellipse cx="190" cy="82" rx="12" ry="9.5" transform="rotate(-22 190 82)" fill="${a}"/>` +
    `<path d="M200 79 V30" stroke="${a}" stroke-width="8" ${R}/>` +
    sparkle(196, 150, 13, a) + sparkle(64, 34, 9, a)),

  A('ic-bingo', 'Bingo ball', 'illustration', 240, 240, ['#e5483d', '#24304d'], ['bingo', 'ball', 'lottery', 'number', 'game night', 'raffle', 'lucky'], ([m, a]) =>
    shadow(120, 214, 70) +
    `<circle cx="120" cy="116" r="92" fill="${dk(m, 0.18)}"/>` +
    `<circle cx="113" cy="109" r="85" fill="${m}"/>` +
    `<circle cx="120" cy="116" r="54" fill="${a}"/>` +
    `<circle cx="120" cy="116" r="44" fill="#fff"/>` +
    `<path d="M101 95 H139 L113 140" stroke="${a}" stroke-width="15" ${R}/>` +
    `<path d="M54 82 Q66 52 96 38" stroke="#fff" stroke-width="12" opacity=".4" ${R}/>`),

  A('ic-comedy', 'Comedy & tragedy masks', 'illustration', 240, 240, ['#f2b134', '#3b3f73'], ['comedy', 'theatre', 'theater', 'masks', 'drama', 'stand up', 'improv', 'play', 'acting'], ([m, a]) => {
    const mask = 'M-56 -58 Q0 -80 56 -58 Q62 6 32 48 Q0 74 -32 48 Q-62 6 -56 -58Z';
    return shadow(126, 212, 70, 7) +
      `<g transform="translate(80 90) rotate(-14) scale(.92)"><path d="${mask}" fill="${a}"/>` +
      `<path d="M-38 -16 L-14 -28 M38 -16 L14 -28" stroke="${onTone(a)}" stroke-width="11" ${R}/>` +
      `<path d="M-28 36 Q0 6 28 36 Q0 24 -28 36Z" fill="${onTone(a)}" stroke="${onTone(a)}" stroke-width="6" stroke-linejoin="round"/></g>` +
      `<g transform="translate(158 138) rotate(12) scale(.92)"><path d="${mask}" fill="${m}"/>` +
      `<path d="M-38 -20 Q-24 -36 -10 -20 M38 -20 Q24 -36 10 -20" stroke="${dk(a, 0.1)}" stroke-width="11" ${R}/>` +
      `<path d="M-32 10 Q0 52 32 10 Q0 24 -32 10Z" fill="${dk(a, 0.1)}" stroke="${dk(a, 0.1)}" stroke-width="6" stroke-linejoin="round"/>` +
      `<path d="M-44 -50 Q-28 -60 -8 -63" stroke="#fff" stroke-width="7" opacity=".5" ${R}/></g>`;
  }),

  A('ic-concert', 'Electric guitar', 'illustration', 240, 240, ['#e2463f', '#2b2d42'], ['concert', 'guitar', 'electric guitar', 'rock', 'band', 'live music', 'gig', 'music'], ([m, a]) =>
    `<g transform="translate(124 118) rotate(40) scale(.86) translate(0 48)">` +
    `<rect x="-11" y="-150" width="22" height="156" rx="6" fill="${lt(a, 0.3)}"/>` +
    `<path d="M-18 -176 Q-18 -194 0 -196 Q18 -194 18 -176 L13 -146 H-13 Z" fill="${a}"/>` +
    `<circle cx="-24" cy="-182" r="7" fill="${a}"/><circle cx="-24" cy="-162" r="7" fill="${a}"/><circle cx="24" cy="-182" r="7" fill="${a}"/><circle cx="24" cy="-162" r="7" fill="${a}"/>` +
    `<path d="M-22 -8 C-30 -44 -62 -46 -58 -16 C-55 4 -66 22 -64 46 C-62 84 -32 100 0 100 C32 100 62 84 64 46 C66 22 52 4 54 -18 C56 -44 28 -42 20 -8 Z" fill="${m}"/>` +
    `<path d="M-18 6 C-36 4 -46 20 -42 44 C-38 66 -18 76 4 74 L16 6 Z" fill="${lt(m, 0.75)}"/>` +
    `<rect x="-11" y="-12" width="22" height="70" rx="5" fill="${lt(a, 0.3)}"/>` +
    `<rect x="-20" y="8" width="40" height="13" rx="5" fill="${a}"/><rect x="-20" y="32" width="40" height="13" rx="5" fill="${a}"/>` +
    `<rect x="-22" y="62" width="44" height="12" rx="5" fill="${a}"/>` +
    `<circle cx="38" cy="54" r="8" fill="${a}"/><circle cx="30" cy="76" r="8" fill="${a}"/>` +
    `</g>`),

  A('ic-dj-night', 'DJ headphones', 'illustration', 240, 240, ['#2ec4b6', '#2b2d42'], ['dj', 'dj night', 'headphones', 'music', 'party', 'club', 'dance', 'beats'], ([m, a]) =>
    shadow(120, 210, 84) +
    `<path d="M48 138 C46 22 194 22 192 138" stroke="${a}" stroke-width="20" ${R}/>` +
    `<path d="M62 92 C82 46 158 46 178 92" stroke="${lt(a, 0.3)}" stroke-width="7" opacity=".7" ${R}/>` +
    `<rect x="40" y="102" width="18" height="30" rx="6" fill="${a}"/><rect x="182" y="102" width="18" height="30" rx="6" fill="${a}"/>` +
    `<rect x="24" y="116" width="54" height="84" rx="24" fill="${m}"/>` +
    `<rect x="162" y="116" width="54" height="84" rx="24" fill="${m}"/>` +
    `<rect x="66" y="126" width="22" height="64" rx="10" fill="${a}"/>` +
    `<rect x="152" y="126" width="22" height="64" rx="10" fill="${a}"/>` +
    `<path d="M36 136 V170 M204 136 V170" stroke="${lt(m, 0.4)}" stroke-width="8" ${R}/>`),

  A('ic-talent-show', 'Star with spotlight rays', 'illustration', 240, 240, ['#f5b82e', '#e5487b'], ['talent show', 'star', 'spotlight', 'stage', 'show', 'performance', 'competition', 'audition'], ([m, a]) => {
    let rays = '';
    for (let i = 0; i < 10; i++) {
      const t = (i * 36 + 18) * Math.PI / 180, w = 0.2, r = 96;
      const pt = (rr: number, tt: number) => `${(120 + rr * Math.cos(tt)).toFixed(1)} ${(124 + rr * Math.sin(tt)).toFixed(1)}`;
      rays += `<path d="M120 124 L${pt(r, t - w)} Q${pt(r + 8, t)} ${pt(r, t + w)} Z" fill="${i % 2 ? lt(a, 0.55) : lt(a, 0.3)}"/>`;
    }
    return rays + sparkle(196, 40, 11, a) + sparkle(44, 200, 9, a) +
      `<path d="${starPath(120, 128, 70, 32)}" fill="${m}" stroke="${m}" stroke-width="14" stroke-linejoin="round"/>` +
      `<path d="M98 92 L108 80" stroke="#fff" stroke-width="8" opacity=".6" ${R}/>`;
  }),

  A('ic-trivia', 'Trivia question', 'illustration', 240, 240, ['#3a86d6', '#f2b134'], ['trivia', 'quiz', 'question', 'question mark', 'pub quiz', 'game night', 'speech bubble', 'faq'], ([m, a]) =>
    `<rect x="104" y="22" width="118" height="92" rx="30" fill="${a}"/>` +
    `<path d="M186 104 L210 138 L162 112 Z" fill="${a}" stroke="${a}" stroke-width="6" stroke-linejoin="round"/>` +
    `<rect x="18" y="58" width="168" height="126" rx="38" fill="${m}"/>` +
    `<path d="M62 172 L46 214 L108 178 Z" fill="${m}" stroke="${m}" stroke-width="6" stroke-linejoin="round"/>` +
    `<path d="M80 102 C80 76 124 74 124 100 C124 118 102 120 102 138" stroke="#fff" stroke-width="18" ${R}/>` +
    `<circle cx="102" cy="162" r="11" fill="#fff"/>`),

  A('ic-gaming', 'Arcade joystick', 'illustration', 240, 240, ['#e5483d', '#2f3350'], ['gaming', 'games', 'arcade', 'joystick', 'video games', 'retro', 'esports', 'game night'], ([m, a]) =>
    shadow(120, 212, 98) +
    `<path d="M50 130 H190 L216 162 H24 Z" fill="${lt(a, 0.28)}" stroke="${lt(a, 0.28)}" stroke-width="8" stroke-linejoin="round"/>` +
    `<rect x="20" y="158" width="200" height="46" rx="12" fill="${a}"/>` +
    `<path d="M44 182 H196" stroke="${lt(a, 0.12)}" stroke-width="8" ${R}/>` +
    `<ellipse cx="104" cy="148" rx="28" ry="10" fill="${dk(a, 0.25)}"/>` +
    `<path d="M104 146 V72" stroke="${lt(a, 0.55)}" stroke-width="14" ${R}/>` +
    `<circle cx="104" cy="60" r="34" fill="${m}"/>` +
    `<ellipse cx="92" cy="46" rx="11" ry="8" transform="rotate(-30 92 46)" fill="#fff" opacity=".55"/>` +
    `<ellipse cx="164" cy="149" rx="15" ry="7" fill="${dk(m, 0.35)}"/><ellipse cx="164" cy="145" rx="15" ry="7" fill="${m}"/>` +
    `<ellipse cx="194" cy="149" rx="12" ry="6" fill="${dk(m, 0.35)}"/><ellipse cx="194" cy="145" rx="12" ry="6" fill="${m}"/>`),

  A('ic-movie-night', 'Clapperboard', 'illustration', 240, 240, ['#e5483d', '#2b2d42'], ['movie night', 'movie', 'film', 'cinema', 'clapperboard', 'screening', 'director', 'hollywood'], ([m, a]) => {
    const stripes = (y: number) => {
      let s = '';
      for (let i = 0; i < 6; i++) { const x = 40 + i * 34; s += `<path d="M${x} ${y} H${x + 17} L${x + 3} ${y + 24} H${x - 14} Z" fill="#fff"/>`; }
      return s;
    };
    return shadow(120, 214, 88) +
      `<clipPath id="ic-movie-night-c1"><rect x="34" y="88" width="172" height="24" rx="5"/></clipPath>` +
      `<clipPath id="ic-movie-night-c2"><rect x="34" y="62" width="172" height="24" rx="5"/></clipPath>` +
      `<rect x="34" y="106" width="172" height="102" rx="12" fill="${a}"/>` +
      `<path d="M56 140 H184 M56 166 H120 M144 166 H184 M56 188 H96" stroke="${lt(a, 0.3)}" stroke-width="9" ${R}/>` +
      `<g clip-path="url(#ic-movie-night-c1)"><rect x="34" y="88" width="172" height="24" fill="${m}"/>${stripes(88)}</g>` +
      `<g transform="rotate(-13 38 86)"><g clip-path="url(#ic-movie-night-c2)"><rect x="34" y="62" width="172" height="24" fill="${m}"/>${stripes(62)}</g></g>` +
      `<circle cx="42" cy="86" r="8" fill="${a}"/>`;
  }),

  A('ic-festival', 'Festival tent', 'illustration', 240, 240, ['#e5483d', '#2f3350'], ['festival', 'tent', 'fair', 'carnival', 'circus', 'fete', 'event', 'marquee'], ([m, a]) => {
    const tint = lt(m, 0.82);
    let roof = '', body = '', scal = '';
    const L = 26, Rr = 214, n = 8, w = (Rr - L) / n;
    for (let i = 0; i < n; i++) roof += `<path d="M120 52 L${L + i * w} 124 L${L + (i + 1) * w} 124 Z" fill="${i % 2 ? tint : m}" stroke="${i % 2 ? tint : m}" stroke-width="2" stroke-linejoin="round"/>`;
    for (let i = 0; i < 6; i++) body += `<rect x="${44 + i * 25.3}" y="124" width="25.8" height="80" fill="${i % 2 ? m : tint}"/>`;
    for (let i = 0; i < n; i++) scal += `<path d="M${L + i * w} 122 A${w / 2} ${w / 2} 0 0 0 ${L + (i + 1) * w} 122 Z" fill="${i % 2 ? tint : m}"/>`;
    return shadow(120, 210, 94) + body +
      `<path d="M98 204 V164 Q120 132 142 164 V204 Z" fill="${a}"/>` +
      roof + scal +
      `<path d="M120 54 V20" stroke="${a}" stroke-width="8" ${R}/>` +
      `<path d="M122 20 L158 30 L122 42 Z" fill="${a}" stroke="${a}" stroke-width="6" stroke-linejoin="round"/>`;
  }),

  A('ic-fundraiser', 'Donation jar', 'illustration', 240, 240, ['#e5487b', '#f2b134'], ['fundraiser', 'donation', 'charity', 'jar', 'donate', 'giving', 'heart', 'coin', 'raise money'], ([m, a]) =>
    shadow(120, 212, 70) +
    `<rect x="48" y="84" width="144" height="124" rx="36" fill="${lt(m, 0.78)}"/>` +
    `<rect x="70" y="72" width="100" height="20" rx="6" fill="${lt(m, 0.62)}"/>` +
    `<rect x="62" y="52" width="116" height="26" rx="9" fill="${a}"/>` +
    `<rect x="100" y="60" width="40" height="9" rx="4.5" fill="${dk(a, 0.4)}"/>` +
    `<circle cx="120" cy="32" r="15" fill="${a}"/><circle cx="120" cy="32" r="8" fill="${lt(a, 0.45)}"/>` +
    heart(120, 150, 38, m) +
    `<rect x="64" y="104" width="11" height="58" rx="5.5" fill="#fff" opacity=".6"/>`),

  A('ic-charity-run', 'Running shoe with heart', 'illustration', 240, 240, ['#3a86d6', '#ef476f'], ['charity run', 'fun run', '5k', 'run', 'running', 'marathon', 'sneaker', 'race', 'walkathon', 'fitness'], ([m, a]) =>
    shadow(118, 212, 96) +
    `<path d="M26 170 L32 116 Q34 100 50 100 H86 Q96 100 100 110 L110 128 L166 140 Q208 150 208 178 Z" fill="${m}"/>` +
    `<path d="M32 116 Q34 100 50 100 H72 L66 172 H28 Z" fill="${dk(m, 0.2)}"/>` +
    `<path d="M150 137 Q194 146 206 166 L200 172 H150 Z" fill="${lt(m, 0.35)}"/>` +
    `<path d="M100 126 L114 116 M116 134 L130 124 M132 140 L146 130" stroke="#fff" stroke-width="8" ${R}/>` +
    `<path d="M22 170 H210 Q216 170 216 180 V184 Q216 200 200 200 H36 Q22 200 22 186 Z" fill="#fff"/>` +
    `<path d="M22 186 Q22 200 36 200 H200 Q214 200 216 188 Z" fill="${dk(m, 0.4)}"/>` +
    heart(176, 70, 34, a)),

  A('ic-market', 'Market basket', 'illustration', 240, 240, ['#e5483d', '#a8743f'], ['market', 'farmers market', 'basket', 'produce', 'fruit', 'vegetables', 'shopping', 'local food', 'bazaar'], ([m, a]) =>
    shadow(120, 212, 84) +
    `<path d="M56 124 Q120 18 184 124" stroke="${dk(a, 0.15)}" stroke-width="14" ${R}/>` +
    `<path d="M150 70 Q160 50 178 46 Q174 66 156 76 Z" fill="${dk(a, 0.25)}"/>` +
    `<circle cx="150" cy="104" r="32" fill="${lt(m, 0.3)}"/>` +
    `<circle cx="86" cy="104" r="30" fill="${dk(m, 0.15)}"/>` +
    `<path d="M86 74 Q84 64 90 56" stroke="${dk(a, 0.35)}" stroke-width="7" ${R}/>` +
    `<path d="M90 64 Q104 54 112 64 Q100 72 90 64 Z" fill="${dk(a, 0.25)}"/>` +
    `<circle cx="120" cy="116" r="28" fill="${m}"/>` +
    `<path d="M108 102 Q114 96 122 96" stroke="#fff" stroke-width="7" opacity=".5" ${R}/>` +
    `<path d="M36 126 H204 L186 196 Q183 206 172 206 H68 Q57 206 54 196 Z" fill="${a}"/>` +
    `<path d="M50 148 H190 M56 172 H184" stroke="${dk(a, 0.18)}" stroke-width="7" ${R}/>` +
    `<path d="M76 134 V200 M106 134 V202 M134 134 V202 M164 134 V200" stroke="${lt(a, 0.22)}" stroke-width="7" ${R}/>` +
    `<rect x="28" y="116" width="184" height="20" rx="10" fill="${lt(a, 0.18)}"/>`),

  A('ic-volunteering', 'Hands holding a heart', 'illustration', 240, 240, ['#e5487b', '#f0a868'], ['volunteering', 'volunteer', 'helping hands', 'community', 'care', 'kindness', 'charity', 'support', 'heart'], ([m, a]) => {
    const hand = `<path d="M40 214 L35 178 Q30 150 40 124 Q46 108 60 114 Q70 120 67 136 L70 150 Q94 158 112 162 Q126 166 124 180 Q122 194 106 194 L88 196 L86 214 Z" fill="${a}"/>` +
      `<path d="M74 172 H104 M80 182 H100" stroke="${dk(a, 0.15)}" stroke-width="6" opacity=".8" ${R}/>` +
      `<path d="M38 200 H88 V214 H40 Z" fill="${dk(a, 0.3)}"/>`;
    return heart(120, 100, 54, m) +
      `<path d="M92 70 Q100 62 110 63" stroke="#fff" stroke-width="8" opacity=".55" ${R}/>` +
      hand + `<g transform="translate(240 0) scale(-1 1)">${hand}</g>`;
  }),

  A('ic-workshop', 'Hammer and wrench', 'illustration', 240, 240, ['#f2a03d', '#3d4a5c'], ['workshop', 'tools', 'hammer', 'wrench', 'diy', 'repair', 'build', 'maker', 'class', 'fix'], ([m, a]) =>
    `<g transform="translate(120 128) rotate(40)">` +
    `<rect x="-12" y="-40" width="24" height="124" rx="12" fill="${lt(a, 0.45)}"/>` +
    `<path d="M-12 -95.4 A34 34 0 1 0 12 -95.4 L12 -66 Q12 -58 0 -58 Q-12 -58 -12 -66 Z" fill="${lt(a, 0.45)}"/>` +
    `<circle cx="0" cy="68" r="6" fill="${a}"/>` +
    `</g>` +
    `<g transform="translate(120 128) rotate(-40)">` +
    `<rect x="-11" y="-50" width="22" height="134" rx="11" fill="${m}"/>` +
    `<rect x="-11" y="52" width="22" height="32" rx="11" fill="${dk(m, 0.2)}"/>` +
    `<path d="M-50 -88 H24 Q30 -88 34 -84 L58 -64 L50 -56 L28 -64 V-56 Q28 -48 20 -48 H-50 Q-58 -48 -58 -56 V-80 Q-58 -88 -50 -88 Z" fill="${a}"/>` +
    `<rect x="-58" y="-88" width="14" height="40" rx="5" fill="${lt(a, 0.2)}"/>` +
    `</g>`),

  A('ic-local-event', 'Map pin', 'illustration', 240, 240, ['#e5483d', '#3a86d6'], ['local event', 'location', 'map', 'pin', 'venue', 'near me', 'community', 'directions', 'meetup'], ([m, a]) =>
    `<path d="M24 160 L80 146 V206 L24 218 Z" fill="${lt(a, 0.55)}"/>` +
    `<path d="M80 146 L160 162 V218 L80 206 Z" fill="${lt(a, 0.72)}"/>` +
    `<path d="M160 162 L216 148 V206 L160 218 Z" fill="${lt(a, 0.55)}"/>` +
    `<path d="M40 196 Q70 180 98 192 M146 196 Q176 202 200 182" stroke="${a}" stroke-width="7" stroke-dasharray="2 14" ${R}/>` +
    `<ellipse cx="120" cy="190" rx="22" ry="6" fill="#000" opacity=".12"/>` +
    `<path d="M120 188 C108 172 60 126 60 84 A60 60 0 0 1 180 84 C180 126 132 172 120 188 Z" fill="${m}"/>` +
    `<path d="M120 188 C132 172 180 126 180 84 A60 60 0 0 0 150 32 C168 60 160 116 120 188 Z" fill="${dk(m, 0.15)}"/>` +
    `<circle cx="120" cy="84" r="25" fill="#fff"/>`),

  A('ic-garden', 'Sunflower', 'illustration', 240, 240, ['#f5b82e', '#4f8f3a'], ['garden', 'gardening', 'sunflower', 'flower', 'plant', 'spring', 'summer', 'nature', 'grow'], ([m, a]) => {
    let petals = '';
    for (let i = 0; i < 14; i++) petals += `<ellipse cx="120" cy="${84 - 44}" rx="14" ry="27" transform="rotate(${i * (360 / 14)} 120 84)" fill="${i % 2 ? dk(m, 0.1) : m}"/>`;
    let seeds = '';
    for (const [x, y] of [[-12, -12], [6, -16], [18, -2], [-18, 4], [0, 2], [12, 14], [-6, 18]]) seeds += `<circle cx="${120 + x}" cy="${84 + y}" r="4" fill="${dk(m, 0.72)}"/>`;
    return shadow(120, 214, 40, 6) +
      `<path d="M120 120 Q112 168 120 212" stroke="${a}" stroke-width="12" ${R}/>` +
      `<path d="M118 186 Q90 150 56 160 Q80 194 118 186 Z" fill="${a}"/>` +
      `<path d="M120 164 Q150 128 186 140 Q162 172 120 164 Z" fill="${dk(a, 0.15)}"/>` +
      petals + `<circle cx="120" cy="84" r="34" fill="${dk(m, 0.55)}"/>` + seeds;
  }),

  A('ic-book-club', 'Stack of books', 'illustration', 240, 240, ['#3a86d6', '#e5483d'], ['book club', 'books', 'reading', 'library', 'literature', 'study', 'novel', 'read'], ([m, a]) =>
    shadow(120, 212, 92) +
    `<rect x="26" y="166" width="188" height="40" rx="9" fill="${a}"/><rect x="180" y="173" width="30" height="26" rx="4" fill="#fff"/>` +
    `<path d="M52 166 V206 M64 166 V206" stroke="${lt(a, 0.35)}" stroke-width="6"/>` +
    `<rect x="36" y="126" width="168" height="40" rx="9" fill="${m}"/><rect x="40" y="133" width="30" height="26" rx="4" fill="#fff"/>` +
    `<path d="M170 126 V166 M182 126 V166" stroke="${lt(m, 0.35)}" stroke-width="6"/>` +
    `<rect x="46" y="88" width="152" height="38" rx="9" fill="${lt(m, 0.45)}"/><rect x="164" y="95" width="30" height="24" rx="4" fill="#fff"/>` +
    `<path d="M72 88 V126" stroke="${m}" stroke-width="6"/>` +
    `<g transform="rotate(-7 120 70)"><rect x="40" y="50" width="146" height="38" rx="9" fill="${dk(a, 0.15)}"/><rect x="44" y="57" width="28" height="24" rx="4" fill="#fff"/>` +
    `<path d="M150 50 V88" stroke="${lt(a, 0.3)}" stroke-width="6"/>` +
    `<path d="M126 86 V108 L134 101 L142 108 V86 Z" fill="${lt(m, 0.15)}"/></g>`),

  A('ic-birthday', 'Birthday cake', 'illustration', 240, 240, ['#f06292', '#ffb703'], ['birthday', 'cake', 'candles', 'party', 'celebration', 'anniversary', 'happy birthday', 'bday'], ([m, a]) => {
    const candle = (x: number) =>
      `<rect x="${x - 7}" y="72" width="14" height="46" rx="4" fill="${lt(m, 0.7)}"/>` +
      `<path d="M${x - 7} 86 L${x + 7} 80 M${x - 7} 102 L${x + 7} 96" stroke="${m}" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M${x} 36 Q${x + 13} 52 ${x + 9} 60 Q${x} 70 ${x - 9} 60 Q${x - 13} 52 ${x} 36 Z" fill="${a}"/>` +
      `<ellipse cx="${x}" cy="59" rx="4" ry="6" fill="#fff"/>`;
    return `<ellipse cx="120" cy="198" rx="100" ry="14" fill="${dk(m, 0.3)}"/>` +
      `<ellipse cx="120" cy="194" rx="100" ry="14" fill="${lt(m, 0.55)}"/>` +
      candle(84) + candle(120) + candle(156) +
      `<rect x="40" y="116" width="160" height="78" rx="14" fill="${m}"/>` +
      `<path d="M40 168 H200" stroke="${dk(m, 0.15)}" stroke-width="8"/>` +
      `<rect x="36" y="112" width="168" height="24" rx="12" fill="#fff"/>` +
      `<rect x="56" y="122" width="16" height="32" rx="8" fill="#fff"/><rect x="98" y="122" width="16" height="24" rx="8" fill="#fff"/>` +
      `<rect x="140" y="122" width="16" height="38" rx="8" fill="#fff"/><rect x="176" y="122" width="16" height="22" rx="8" fill="#fff"/>` +
      `<circle cx="80" cy="178" r="4.5" fill="${a}"/><circle cx="122" cy="182" r="4.5" fill="${a}"/><circle cx="164" cy="178" r="4.5" fill="${a}"/>` +
      `<circle cx="100" cy="158" r="4.5" fill="${lt(m, 0.6)}"/><circle cx="182" cy="160" r="4.5" fill="${lt(m, 0.6)}"/><circle cx="60" cy="160" r="4.5" fill="${lt(m, 0.6)}"/>`;
  }),

  A('ic-new-year', 'Clinking glasses', 'illustration', 240, 240, ['#f2c14e', '#3a3f6b'], ['new year', 'new years eve', 'nye', 'cheers', 'champagne', 'toast', 'glasses', 'celebration', 'countdown'], ([m, a]) => {
    const glass = `<path d="M-27 -90 H27 L19 -22 Q14 4 0 6 Q-14 4 -19 -22 Z" fill="${lt(a, 0.8)}"/>` +
      `<path d="M-23.8 -62 H23.8 L19 -22 Q14 4 0 6 Q-14 4 -19 -22 Z" fill="${m}"/>` +
      `<circle cx="-4" cy="-40" r="4" fill="#fff"/><circle cx="6" cy="-24" r="3.5" fill="#fff"/><circle cx="-2" cy="-8" r="3" fill="#fff"/>` +
      `<rect x="-5" y="4" width="10" height="56" rx="4" fill="${mix(a, '#ffffff', 0.35)}"/>` +
      `<ellipse cx="0" cy="62" rx="30" ry="8" fill="${a}"/>`;
    return shadow(120, 212, 90, 6) +
      `<g transform="translate(80 132) rotate(16) scale(1.12)">${glass}</g>` +
      `<g transform="translate(160 132) rotate(-16) scale(1.12)">${glass}</g>` +
      sparkle(120, 30, 16, m) + sparkle(48, 54, 10, a) + sparkle(194, 62, 12, a);
  }),
];
