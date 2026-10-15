/** Everyday illustrations — café, food, flowers, music, home, party and creator pieces for the classic templates and the
 *  Elements panel. Original flat vector artwork drawn in code: colour slots with shading derived from them (dk/lt/mix),
 *  white highlights and a soft ground shadow, so every piece recolours cleanly. */
import type { AssetDef } from '../index';
import { asset, dk, lt, mix, sparkle, starPts } from '../draw';

const A = asset('everyday', ['everyday']);
const R = 'stroke-linecap="round" stroke-linejoin="round" fill="none"';
const RICE = '#fbf6ee';
/** Soft ground shadow under an object. */
const shadow = (cx: number, cy: number, rx: number, ry = 9) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity=".10"/>`;
/** Deterministic little random numbers so a piece looks the same every time. */
const rnd = (seed: number) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

/** One tulip head centred at (0,0), opening upwards. */
const tulip = (c: string) =>
  `<path d="M-30 -4 Q-36 -46 -16 -62 L0 -40 L16 -62 Q36 -46 30 -4 Q0 20 -30 -4Z" fill="${c}"/>` +
  `<path d="M-14 -2 Q-18 -40 0 -66 Q18 -40 14 -2 Q0 8 -14 -2Z" fill="${dk(c, 0.14)}"/>` +
  `<path d="M-22 -14 Q-26 -36 -16 -50" stroke="#fff" stroke-width="5" opacity=".45" ${R}/>`;

export const ASSETS: AssetDef[] = [
  A('ed-latte', 'Latte cup', 'illustration', 240, 240, ['#e8724a', '#7a4a2c'], ['coffee', 'latte', 'cup', 'cafe', 'café', 'espresso', 'cappuccino', 'drink', 'breakfast', 'morning'], ([m, a]) =>
    shadow(120, 214, 92) +
    `<ellipse cx="120" cy="196" rx="96" ry="22" fill="${dk(m, 0.2)}"/>` +
    `<ellipse cx="120" cy="190" rx="96" ry="20" fill="${lt(m, 0.55)}"/>` +
    `<ellipse cx="120" cy="190" rx="60" ry="10" fill="${lt(m, 0.4)}"/>` +
    `<path d="M186 120 C232 116 230 176 176 168" stroke="${dk(m, 0.12)}" stroke-width="15" ${R}/>` +
    `<path d="M48 108 H192 Q190 168 154 188 H86 Q50 168 48 108Z" fill="${m}"/>` +
    `<path d="M150 108 H192 Q190 168 154 188 H138 Q168 162 150 108Z" fill="${dk(m, 0.14)}"/>` +
    `<path d="M64 124 Q66 154 86 172" stroke="#fff" stroke-width="8" opacity=".45" ${R}/>` +
    `<ellipse cx="120" cy="108" rx="72" ry="18" fill="${lt(m, 0.3)}"/>` +
    `<ellipse cx="120" cy="109" rx="62" ry="13" fill="${a}"/>` +
    `<ellipse cx="120" cy="110" rx="52" ry="9.5" fill="${mix(a, '#f3d9b8', 0.55)}"/>` +
    `<path d="M120 117 C108 109 104 104 110 101 C114 99 118 101 120 104 C122 101 126 99 130 101 C136 104 132 109 120 117Z" fill="${lt(a, 0.85)}"/>` +
    `<path d="M100 76 Q90 62 100 50 Q110 38 100 24 M132 80 Q122 64 134 50 Q144 38 134 22" stroke="${mix(a, '#c8c0b8', 0.6)}" stroke-width="8" opacity=".55" ${R}/>`),

  A('ed-croissant', 'Croissant', 'illustration', 240, 240, ['#eaa24e', '#a8572a'], ['croissant', 'pastry', 'bakery', 'breakfast', 'cafe', 'café', 'bread', 'french'], ([m, a]) => {
    // Layers of dough arched round a point below the pastry: the ends first, the big middle layer last.
    const seg = (deg: number, rx: number, ry: number, c: string) => {
      const t = (deg * Math.PI) / 180, x = 120 + 100 * Math.sin(t), y = 236 - 100 * Math.cos(t);
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg})"><ellipse rx="${rx}" ry="${ry}" fill="${c}" stroke="${dk(a, 0.15)}" stroke-opacity=".45" stroke-width="3"/>` +
        `<path d="M${-rx * 0.5} ${-ry * 0.62} Q0 ${-ry * 0.98} ${rx * 0.5} ${-ry * 0.62}" stroke="#fff" stroke-width="${Math.max(4, rx * 0.16).toFixed(1)}" opacity=".4" ${R}/>` +
        `<path d="M${-rx * 0.62} ${ry * 0.35} Q0 ${ry * 0.7} ${rx * 0.62} ${ry * 0.35}" stroke="${a}" stroke-width="3" opacity=".35" ${R}/></g>`;
    };
    return shadow(120, 206, 96) +
      `<path d="M8 196 Q12 172 34 166 L42 190 Q24 202 8 196Z M232 196 Q228 172 206 166 L198 190 Q216 202 232 196Z" fill="${mix(m, a, 0.45)}"/>` +
      seg(-64, 20, 32, mix(m, a, 0.35)) + seg(64, 20, 32, mix(m, a, 0.35)) +
      seg(-34, 31, 46, mix(m, a, 0.15)) + seg(34, 31, 46, mix(m, a, 0.15)) +
      seg(0, 42, 60, m);
  }),

  A('ed-pizza', 'Pizza slice', 'illustration', 240, 240, ['#f7c548', '#d8432e', '#d98a3d'], ['pizza', 'slice', 'food', 'italian', 'pepperoni', 'dinner', 'party', 'takeaway'], ([m, a, c]) =>
    `<path d="M46 60 Q120 40 194 60 L128 210 Q120 224 112 210Z" fill="${m}"/>` +
    `<path d="M150 56 Q176 56 194 60 L128 210 Q124 218 120 218 Z" fill="${dk(m, 0.08)}"/>` +
    `<path d="M58 70 Q56 98 70 104 Q80 98 78 80Z M168 72 Q180 96 172 108 Q160 104 160 86Z" fill="${m}"/>` +
    `<circle cx="98" cy="96" r="19" fill="${a}"/><circle cx="148" cy="104" r="16" fill="${a}"/><circle cx="120" cy="148" r="14" fill="${a}"/><circle cx="84" cy="128" r="8" fill="${a}"/>` +
    `<circle cx="92" cy="90" r="4" fill="${dk(a, 0.25)}"/><circle cx="104" cy="102" r="3" fill="${dk(a, 0.25)}"/><circle cx="152" cy="98" r="3.5" fill="${dk(a, 0.25)}"/><circle cx="116" cy="152" r="3" fill="${dk(a, 0.25)}"/>` +
    `<path d="M91 87 Q96 82 103 83" stroke="#fff" stroke-width="4" opacity=".55" ${R}/>` +
    `<path d="M34 56 Q120 26 206 56 Q212 76 198 80 Q120 54 42 80 Q28 76 34 56Z" fill="${c}"/>` +
    `<path d="M50 54 Q120 34 190 54" stroke="${lt(c, 0.45)}" stroke-width="7" opacity=".7" ${R}/>` +
    `<path d="M64 112 Q86 160 108 196" stroke="#fff" stroke-width="6" opacity=".35" ${R}/>`),

  A('ed-sushi', 'Sushi', 'illustration', 240, 240, ['#ff8a5c', '#22302e'], ['sushi', 'nigiri', 'maki', 'salmon', 'japanese', 'food', 'dinner', 'restaurant'], ([m, a]) => {
    const grains = (x0: number, y0: number, w: number, h: number, seed: number) => {
      const r = rnd(seed); let s = '';
      for (let i = 0; i < 16; i++) s += `<ellipse cx="${(x0 + r() * w).toFixed(1)}" cy="${(y0 + r() * h).toFixed(1)}" rx="4" ry="2.4" transform="rotate(${Math.round(r() * 180)} ${(x0 + w / 2).toFixed(0)} ${(y0 + h / 2).toFixed(0)})" fill="#e9dfcf"/>`;
      return s;
    };
    return shadow(120, 206, 96) +
      `<circle cx="172" cy="96" r="44" fill="${a}"/><circle cx="172" cy="96" r="44" fill="none" stroke="${lt(a, 0.15)}" stroke-width="3"/>` +
      `<circle cx="172" cy="96" r="34" fill="${RICE}"/>` +
      `<circle cx="172" cy="96" r="15" fill="${m}"/><circle cx="182" cy="104" r="7" fill="#7cc36a"/>` +
      `<path d="M148 76 Q158 64 172 62" stroke="#fff" stroke-width="5" opacity=".6" ${R}/>` +
      `<rect x="34" y="128" width="140" height="66" rx="32" fill="${RICE}"/>` +
      `<path d="M38 170 Q60 194 104 194 H142 Q170 192 174 166 V178 Q166 196 140 196 H66 Q38 194 38 170Z" fill="#e6dccb"/>` +
      grains(52, 148, 110, 36, 7) +
      `<path d="M24 132 Q50 92 104 98 Q160 94 186 118 Q190 140 170 144 Q110 130 48 150 Q22 152 24 132Z" fill="${m}"/>` +
      `<path d="M44 128 Q60 110 82 106 M72 138 Q90 116 116 110 M104 134 Q124 114 148 112 M136 132 Q154 118 174 120" stroke="#fff" stroke-width="6" opacity=".55" ${R}/>` +
      `<path d="M96 100 L118 98 L124 192 L102 194Z" fill="${a}"/>` +
      `<path d="M100 104 L104 190" stroke="${lt(a, 0.2)}" stroke-width="3" ${R}/>`;
  }),

  A('ed-tulips', 'Tulip bouquet', 'illustration', 240, 240, ['#ff6f91', '#3f8f5a', '#efdcc0'], ['tulips', 'flowers', 'bouquet', 'spring', 'garden', 'mother', 'floral', 'fair', 'easter'], ([m, g, w]) =>
    shadow(120, 222, 54, 7) +
    `<path d="M94 84 Q102 150 114 196 M120 62 V196 M150 92 Q138 150 126 196" stroke="${g}" stroke-width="7" ${R}/>` +
    `<path d="M112 172 Q70 150 58 98 Q96 116 112 160Z" fill="${g}"/>` +
    `<path d="M128 170 Q172 146 182 104 Q144 120 128 158Z" fill="${dk(g, 0.15)}"/>` +
    `<path d="M70 108 Q86 130 104 150" stroke="#fff" stroke-width="4" opacity=".3" ${R}/>` +
    `<g transform="translate(92 86) rotate(-14)">${tulip(lt(m, 0.18))}</g>` +
    `<g transform="translate(152 94) rotate(14)">${tulip(dk(m, 0.06))}</g>` +
    `<g transform="translate(120 66)">${tulip(m)}</g>` +
    `<path d="M76 158 L164 158 L144 222 L96 222Z" fill="${w}"/>` +
    `<path d="M120 158 L164 158 L144 222 L120 222Z" fill="${dk(w, 0.1)}"/>` +
    `<path d="M98 186 Q120 196 142 186 L140 196 Q120 206 100 196Z" fill="${m}"/>` +
    `<path d="M120 192 Q102 210 96 226 M120 192 Q138 210 146 224" stroke="${m}" stroke-width="5" ${R}/>`),

  A('ed-guitar', 'Acoustic guitar', 'illustration', 240, 300, ['#e2863b', '#3a2a24'], ['guitar', 'acoustic', 'music', 'live music', 'concert', 'band', 'gig', 'open mic', 'folk'], ([m, a]) =>
    `<g transform="translate(112 168) scale(.86) rotate(22)">` +
    `<rect x="-11" y="-150" width="22" height="120" rx="4" fill="${a}"/>` +
    `<path d="M-15 -184 Q0 -192 15 -184 L13 -146 H-13Z" fill="${a}"/>` +
    [-176, -166, -156].map((y) => `<circle cx="-19" cy="${y}" r="4.5" fill="${lt(a, 0.55)}"/><circle cx="19" cy="${y}" r="4.5" fill="${lt(a, 0.55)}"/>`).join('') +
    [-130, -112, -94, -76, -58].map((y) => `<path d="M-11 ${y} H11" stroke="${lt(a, 0.45)}" stroke-width="2"/>`).join('') +
    `<circle cx="0" cy="66" r="66" fill="${m}"/><circle cx="0" cy="-10" r="50" fill="${m}"/><rect x="-46" y="-6" width="92" height="50" fill="${m}"/>` +
    `<path d="M0 132 A66 66 0 0 0 52 26 Q36 64 0 132Z" fill="${dk(m, 0.14)}"/>` +
    `<path d="M-50 -24 Q-42 -50 -18 -58" stroke="#fff" stroke-width="7" opacity=".4" ${R}/>` +
    `<path d="M-56 40 Q-62 70 -46 100" stroke="#fff" stroke-width="7" opacity=".3" ${R}/>` +
    `<circle cx="0" cy="14" r="25" fill="${lt(m, 0.35)}"/><circle cx="0" cy="14" r="20" fill="${a}"/>` +
    `<rect x="-28" y="78" width="56" height="12" rx="5" fill="${a}"/>` +
    [-6, -2, 2, 6].map((x) => `<path d="M${x} -186 V84" stroke="${lt(m, 0.7)}" stroke-width="1.6" opacity=".9"/>`).join('') +
    `</g>`),

  A('ed-armchair', 'Retro armchair', 'illustration', 240, 240, ['#2fa39a', '#8a5a3b'], ['armchair', 'chair', 'sofa', 'couch', 'furniture', 'home', 'yard sale', 'interior', 'living room'], ([m, w]) =>
    shadow(120, 214, 96) +
    `<path d="M62 176 L50 210 M178 176 L190 210" stroke="${w}" stroke-width="9" ${R}/>` +
    `<path d="M84 180 L80 206 M156 180 L160 206" stroke="${dk(w, 0.2)}" stroke-width="8" ${R}/>` +
    `<path d="M58 54 Q120 30 182 54 L176 140 H64Z" fill="${m}"/>` +
    `<path d="M150 42 Q170 46 182 54 L176 140 H160Z" fill="${dk(m, 0.12)}"/>` +
    `<path d="M120 62 V128" stroke="${dk(m, 0.15)}" stroke-width="5" ${R}/>` +
    `<circle cx="96" cy="88" r="4" fill="${dk(m, 0.25)}"/><circle cx="144" cy="88" r="4" fill="${dk(m, 0.25)}"/><circle cx="96" cy="114" r="4" fill="${dk(m, 0.25)}"/><circle cx="144" cy="114" r="4" fill="${dk(m, 0.25)}"/>` +
    `<path d="M72 60 Q96 48 122 46" stroke="#fff" stroke-width="7" opacity=".4" ${R}/>` +
    `<rect x="60" y="130" width="120" height="42" rx="18" fill="${lt(m, 0.12)}"/>` +
    `<rect x="26" y="104" width="44" height="80" rx="22" fill="${m}"/><rect x="170" y="104" width="44" height="80" rx="22" fill="${dk(m, 0.1)}"/>` +
    `<path d="M36 118 Q40 110 50 108" stroke="#fff" stroke-width="6" opacity=".4" ${R}/>` +
    `<path d="M70 140 Q110 134 150 138" stroke="#fff" stroke-width="5" opacity=".3" ${R}/>`),

  A('ed-sun', 'Happy sun', 'illustration', 240, 240, ['#ffc23c', '#ff8a3c'], ['sun', 'sunshine', 'summer', 'morning', 'weather', 'motivation', 'bright', 'day'], ([m, a]) => {
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const long = i % 2 === 0, r1 = 68, r2 = long ? 106 : 92;
      rays += `<path d="M120 ${120 - r1} V${120 - r2}" transform="rotate(${i * 30} 120 120)" stroke="${long ? a : lt(a, 0.25)}" stroke-width="${long ? 14 : 11}" ${R}/>`;
    }
    return rays +
      `<circle cx="120" cy="120" r="56" fill="${m}"/>` +
      `<path d="M120 64 A56 56 0 0 1 120 176 A70 70 0 0 0 120 64Z" fill="${dk(m, 0.08)}"/>` +
      `<path d="M84 98 Q92 78 114 72" stroke="#fff" stroke-width="9" opacity=".5" ${R}/>`;
  }),

  A('ed-vlog-camera', 'Vlog camera', 'illustration', 240, 240, ['#2b2d42', '#ff4f7a'], ['camera', 'vlog', 'video', 'youtube', 'creator', 'filming', 'recording', 'content', 'photography'], ([m, a]) =>
    shadow(120, 206, 92) +
    `<rect x="148" y="70" width="70" height="98" rx="12" fill="${dk(m, 0.15)}"/>` +
    `<rect x="156" y="78" width="54" height="82" rx="6" fill="${mix(m, '#7fd3ff', 0.55)}"/>` +
    `<path d="M162 140 L178 118 L190 132 L198 122 L208 140Z" fill="#fff" opacity=".55"/>` +
    `<circle cx="168" cy="90" r="5" fill="${a}"/>` +
    `<rect x="30" y="74" width="136" height="104" rx="20" fill="${m}"/>` +
    `<rect x="44" y="58" width="44" height="22" rx="8" fill="${dk(m, 0.2)}"/>` +
    `<rect x="120" y="62" width="28" height="16" rx="6" fill="${a}"/>` +
    `<path d="M44 92 Q48 82 60 80" stroke="#fff" stroke-width="6" opacity=".35" ${R}/>` +
    `<circle cx="96" cy="128" r="40" fill="${dk(m, 0.35)}"/><circle cx="96" cy="128" r="31" fill="${lt(m, 0.22)}"/>` +
    `<circle cx="96" cy="128" r="22" fill="${dk(m, 0.55)}"/><circle cx="96" cy="128" r="11" fill="${mix(m, a, 0.45)}"/>` +
    `<circle cx="86" cy="118" r="6" fill="#fff" opacity=".8"/><circle cx="104" cy="138" r="3" fill="#fff" opacity=".5"/>` +
    `<circle cx="146" cy="94" r="6" fill="${a}"/>`),

  A('ed-wow', 'Wow burst', 'decoration', 240, 240, ['#ffe14d', '#1c1830'], ['wow', 'burst', 'exclamation', 'surprise', 'shock', 'sticker', 'comic', 'pop', 'thumbnail', 'omg'], ([m, a]) => {
    const r = rnd(11); const pts: string[] = [];
    for (let i = 0; i < 26; i++) { const t = (i / 26) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 66 + r() * 10 : 100 + r() * 12; pts.push(`${(120 + Math.cos(t) * rr).toFixed(1)},${(120 + Math.sin(t) * rr * 0.96).toFixed(1)}`); }
    const p = pts.join(' ');
    return `<polygon points="${p}" fill="${a}" transform="translate(9 10)"/>` +
      `<polygon points="${p}" fill="${m}" stroke="${a}" stroke-width="7" stroke-linejoin="round"/>` +
      `<path d="M108 66 H134 L128 140 H114Z" fill="${a}" stroke="${a}" stroke-width="8" stroke-linejoin="round"/>` +
      `<circle cx="121" cy="166" r="15" fill="${a}"/>` +
      `<path d="M66 92 Q72 74 88 66" stroke="#fff" stroke-width="8" opacity=".6" ${R}/>`;
  }),

  A('ed-party-popper', 'Party popper', 'illustration', 240, 240, ['#ff4f9a', '#ffd23f', '#4cc9f0'], ['party', 'popper', 'celebrate', 'confetti', 'birthday', 'invitation', 'new year', 'congrats', 'hooray'], ([m, b, c]) => {
    const r = rnd(5); let conf = '';
    const cols = [m, b, c, lt(m, 0.3), b];
    for (let i = 0; i < 16; i++) {
      const t = -Math.PI / 2 + (r() - 0.15) * 1.6, d = 70 + r() * 80, x = 92 + Math.cos(t) * d, y = 140 + Math.sin(t) * d;
      if (x > 228 || y < 10) continue;
      conf += i % 3 ? `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="12" height="7" rx="2" transform="rotate(${Math.round(r() * 180)} ${x.toFixed(0)} ${y.toFixed(0)})" fill="${cols[i % 5]}"/>` : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${cols[i % 5]}"/>`;
    }
    return conf +
      `<path d="M104 120 Q120 70 104 40 Q96 26 110 18" stroke="${b}" stroke-width="7" ${R}/>` +
      `<path d="M118 132 Q160 116 176 76 Q182 62 198 62" stroke="${c}" stroke-width="7" ${R}/>` +
      `<path d="M120 146 Q170 160 200 132" stroke="${m}" stroke-width="7" ${R}/>` +
      `<path d="M32 214 L84 108 L136 160Z" fill="${m}"/>` +
      `<path d="M66 142 L102 178 M52 172 L80 200 M76 120 L118 162" stroke="${b}" stroke-width="10" ${R}/>` +
      `<path d="M32 214 L136 160 L118 150Z" fill="${dk(m, 0.15)}"/>` +
      `<ellipse cx="110" cy="134" rx="38" ry="12" transform="rotate(45 110 134)" fill="${dk(m, 0.3)}"/>` +
      `<path d="M58 168 L80 122" stroke="#fff" stroke-width="5" opacity=".45" ${R}/>` +
      sparkle(186, 30, 12, b) + sparkle(50, 70, 9, c);
  }),

  A('ed-megaphone', 'Megaphone', 'illustration', 240, 240, ['#ff4f7a', '#ffd23f'], ['megaphone', 'announcement', 'news', 'loud', 'big news', 'promotion', 'speaker', 'shout', 'launch'], ([m, a]) =>
    shadow(110, 210, 80) +
    `<path d="M70 134 L84 192 Q86 200 96 198 L110 194 Q118 192 116 184 L104 140Z" fill="${dk(m, 0.25)}"/>` +
    `<rect x="26" y="96" width="34" height="56" rx="12" fill="${dk(m, 0.2)}"/>` +
    `<path d="M56 98 L150 46 Q164 40 166 56 L172 182 Q172 198 156 192 L56 150Z" fill="${m}"/>` +
    `<path d="M56 130 L170 168 L172 182 Q172 198 156 192 L56 150Z" fill="${dk(m, 0.12)}"/>` +
    `<ellipse cx="168" cy="119" rx="16" ry="70" fill="${lt(m, 0.25)}"/><ellipse cx="170" cy="119" rx="9" ry="56" fill="${dk(m, 0.35)}"/>` +
    `<path d="M70 104 L140 66" stroke="#fff" stroke-width="7" opacity=".4" ${R}/>` +
    `<path d="M198 86 Q212 119 198 152 M214 66 Q238 119 214 172" stroke="${a}" stroke-width="9" ${R}/>`),

  A('ed-plane', 'Little plane', 'illustration', 240, 240, ['#ffffff', '#ff6b4a'], ['plane', 'airplane', 'travel', 'flight', 'trip', 'vacation', 'holiday', 'getaway', 'airport'], ([m, a]) =>
    `<path d="M12 150 Q50 140 80 132" stroke="${m}" stroke-width="6" opacity=".55" stroke-dasharray="2 14" ${R}/>` +
    `<g transform="translate(130 112) rotate(-14)">` +
    `<path d="M-6 6 L-40 64 Q-42 72 -32 70 L22 10Z" fill="${dk(a, 0.12)}"/>` +
    `<path d="M-74 -6 L-92 -44 Q-94 -52 -84 -50 L-50 -10Z" fill="${a}"/>` +
    `<path d="M-90 -8 Q-90 -24 -70 -24 H62 Q98 -24 100 0 Q98 22 62 22 H-70 Q-90 22 -90 8Z" fill="${m}"/>` +
    `<path d="M-90 4 H98 Q94 22 62 22 H-70 Q-90 22 -90 8Z" fill="${dk(m, 0.1)}"/>` +
    `<path d="M70 -18 Q90 -16 94 -4 H70Z" fill="${mix(a, '#2b3a55', 0.6)}"/>` +
    [-44, -24, -4, 16, 36].map((x) => `<circle cx="${x}" cy="-6" r="5.5" fill="${mix(a, '#2b3a55', 0.6)}"/>`).join('') +
    `<path d="M-6 -6 L-36 -66 Q-40 -74 -30 -72 L24 -8Z" fill="${a}"/>` +
    `<path d="M-74 -18 H40" stroke="#fff" stroke-width="5" opacity=".6" ${R}/>` +
    `</g>`),

  A('ed-ice-cream', 'Ice cream cone', 'illustration', 240, 240, ['#ff8fab', '#fff0c9', '#e3a35a'], ['ice cream', 'cone', 'summer', 'dessert', 'sweet', 'treat', 'gelato', 'sale', 'scoop'], ([m, b, c]) =>
    `<path d="M74 128 L120 228 L166 128Z" fill="${c}"/>` +
    `<path d="M120 128 L166 128 L120 228Z" fill="${dk(c, 0.1)}"/>` +
    `<path d="M84 150 L148 128 M92 170 L160 146 M102 192 L150 176 M90 128 L146 192 M112 128 L156 160 M80 140 L130 214" stroke="${dk(c, 0.22)}" stroke-width="4" ${R}/>` +
    `<circle cx="120" cy="66" r="40" fill="${m}"/>` +
    `<path d="M80 72 Q84 98 104 100 Q120 108 136 100 Q156 98 160 72 A40 40 0 0 1 80 72Z" fill="${dk(m, 0.08)}"/>` +
    `<path d="M66 122 Q64 92 92 92 Q104 80 120 88 Q136 80 148 92 Q176 92 174 122 Q172 136 160 132 Q150 142 138 134 Q126 144 114 134 Q100 144 90 134 Q74 140 66 122Z" fill="${b}"/>` +
    `<path d="M150 132 Q152 150 144 152 Q138 148 140 134Z" fill="${b}"/>` +
    `<path d="M92 50 Q100 34 118 32" stroke="#fff" stroke-width="7" opacity=".55" ${R}/>` +
    `<path d="M82 108 Q90 98 104 98" stroke="#fff" stroke-width="6" opacity=".6" ${R}/>` +
    `<path d="M116 22 Q122 12 130 20" stroke="${c}" stroke-width="5" ${R}/><circle cx="120" cy="22" r="9" fill="#e5383b"/><circle cx="117" cy="19" r="2.5" fill="#fff" opacity=".7"/>` +
    [[104, 54], [134, 50], [120, 76], [96, 72], [144, 72]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="10" height="4" rx="2" transform="rotate(${i * 50} ${x} ${y})" fill="${i % 2 ? '#4cc9f0' : '#ffd23f'}"/>`).join('')),

  A('ed-photo-frame', 'Instant photo', 'decoration', 240, 240, ['#ffffff', '#ff6f91'], ['photo', 'polaroid', 'frame', 'instant photo', 'memories', 'scrapbook', 'picture'], ([m, a]) =>
    shadow(124, 220, 84, 7) +
    `<g transform="rotate(-6 120 120)"><rect x="42" y="26" width="156" height="186" rx="6" fill="${m}"/>` +
    `<rect x="54" y="38" width="132" height="128" fill="${mix(a, '#ffffff', 0.55)}"/>` +
    `<circle cx="154" cy="70" r="14" fill="${lt(a, 0.85)}"/>` +
    `<path d="M54 166 L96 112 L126 146 L146 124 L186 166Z" fill="${a}"/>` +
    `<rect x="98" y="16" width="44" height="18" fill="${lt(a, 0.6)}" opacity=".8" transform="rotate(4 120 25)"/></g>`),

  A('ed-sparkles', 'Twinkle stars', 'decoration', 240, 240, ['#ffd86b', '#ffffff'], ['sparkle', 'sparkles', 'stars', 'twinkle', 'magic', 'shine', 'night', 'dream'], ([m, a]) =>
    sparkle(92, 104, 62, m) + sparkle(176, 58, 28, a) + sparkle(174, 170, 20, m) + sparkle(46, 196, 12, a) +
    `<circle cx="92" cy="104" r="8" fill="${a}" opacity=".9"/>` +
    `<polygon points="${starPts(200, 120, 5, 7, 3)}" fill="${a}"/>`),
];

