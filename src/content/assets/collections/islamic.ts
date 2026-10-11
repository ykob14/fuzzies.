/**
 * Islamic celebrations collection (Ramadan, Eid al-Fitr, Eid al-Adha, Islamic New Year, Mawlid, Iftar, Suhoor, mosque
 * events) — original vector artwork drawn in code for Fuzzies (licence: original Fuzzies artwork).
 * Imagery follows common Islamic decorative tradition: lanterns (fanous), crescent and star, mosque silhouettes and
 * geometric patterns (eight-pointed stars, rosettes). No figures or faces are depicted.
 */
import type { AssetDef } from '../index';
import { asset, backgrounds, bokeh, dk, f1, frame, gift, glowDef, lt, mix, rng, sparkle, starPts, stars } from '../draw';

const A = asset('islamic', ['islamic', 'muslim', 'ramadan', 'eid', 'ramadan kareem', 'eid mubarak', 'رمضان', 'عيد']);

// ---------- drawings ----------
/** An eight-pointed star (two squares) — the classic geometric motif. */
const eightStar = (cx: number, cy: number, r: number) => `${starPts(cx, cy, 8, r, r * 0.76, -90)}`;

/** A fanous lantern: ring, onion dome, glowing coloured glass panels, tapered base. */
function lantern(id: string, x: number, y: number, s: number, metal: string, glass: string, glowC: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><defs>${glowDef(`${id}h`, glowC, 0.55)}<linearGradient id="${id}m" x1="0" x2="1"><stop offset="0" stop-color="${lt(metal, 0.35)}"/><stop offset=".5" stop-color="${metal}"/><stop offset="1" stop-color="${dk(metal, 0.3)}"/></linearGradient><radialGradient id="${id}g" cy="55%"><stop offset="0" stop-color="${lt(glowC, 0.75)}"/><stop offset=".55" stop-color="${glowC}"/><stop offset="1" stop-color="${glass}"/></radialGradient></defs>`;
  g += `<circle cx="60" cy="122" r="74" fill="url(#${id}h)"/>`;
  g += `<circle cx="60" cy="10" r="8" fill="none" stroke="url(#${id}m)" stroke-width="3.5"/><path d="M60 18 V28" stroke="${metal}" stroke-width="3"/>`;
  g += `<path d="M60 26 C44 36 32 50 34 64 H86 C88 50 76 36 60 26 Z" fill="url(#${id}m)"/><path d="M60 26 C52 40 50 52 52 64 H68 C70 52 68 40 60 26 Z" fill="${lt(metal, 0.25)}" opacity=".5"/>`;
  g += `<rect x="28" y="62" width="64" height="8" rx="3" fill="${dk(metal, 0.15)}"/>`;
  g += `<path d="M32 70 L24 150 H96 L88 70 Z" fill="url(#${id}g)"/>`;
  g += `<path d="M32 70 L24 150 M88 70 L96 150 M60 70 V150 M46 70 L42 150 M74 70 L78 150" stroke="url(#${id}m)" stroke-width="3.5"/>`;
  g += `<path d="M30 100 H90 M27 126 H93" stroke="url(#${id}m)" stroke-width="2.5"/>`;
  g += [[39, 86], [53, 86], [67, 86], [81, 86]].map(([cx, cy]) => `<path d="M${cx - 4} ${cy + 8} V${cy} Q${cx} ${cy - 7} ${cx + 4} ${cy} V${cy + 8} Z" fill="${dk(glass, 0.35)}" opacity=".55"/>`).join('');
  g += `<polygon points="${eightStar(60, 138, 7)}" fill="${dk(glass, 0.35)}" opacity=".5"/>`;
  g += `<rect x="20" y="150" width="80" height="9" rx="3" fill="${dk(metal, 0.15)}"/><path d="M28 159 L48 182 H72 L92 159 Z" fill="url(#${id}m)"/><path d="M48 182 L60 198 L72 182 Z" fill="${dk(metal, 0.2)}"/><circle cx="60" cy="202" r="4" fill="${metal}"/>`;
  return g + `</g>`;
}

/** A crescent moon (outer circle minus an offset circle) with a star. */
function crescent(id: string, cx: number, cy: number, r: number, c: string, withStar = true): string {
  // Two circles: the outer moon and an offset inner one; the path runs between their intersection points.
  const ix = cx + r * 0.52, iy = r * 0.854, ri = r * 0.86;
  const d = `M${f1(ix)} ${f1(cy - iy)} A${r} ${r} 0 1 0 ${f1(ix)} ${f1(cy + iy)} A${f1(ri)} ${f1(ri)} 0 1 1 ${f1(ix)} ${f1(cy - iy)} Z`;
  let g = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(c, 0.45)}"/><stop offset="1" stop-color="${dk(c, 0.25)}"/></linearGradient></defs><path d="${d}" fill="url(#${id})"/>`;
  if (withStar) g += `<polygon points="${starPts(cx + r * 0.62, cy - r * 0.12, 5, r * 0.26, r * 0.11)}" fill="url(#${id})"/>`;
  return g;
}

/** Mosque silhouette: central dome, side domes, two minarets with crescent finials, arched windows. */
function mosque(c: string, win: string, w = 420, h = 230): string {
  const k = w / 420;
  let g = `<g transform="scale(${f1(k)} ${f1(h / 230)})">`;
  const minaret = (x: number, top: number) => `<rect x="${x - 9}" y="${top}" width="18" height="${230 - top}" fill="${c}"/><path d="M${x - 13} ${top + 20} H${x + 13} V${top + 26} H${x - 13} Z M${x - 13} ${top + 70} H${x + 13} V${top + 76} H${x - 13} Z" fill="${c}"/><path d="M${x - 9} ${top} Q${x} ${top - 26} ${x + 9} ${top} Z" fill="${c}"/><path d="M${x} ${top - 22} V${top - 34}" stroke="${c}" stroke-width="2"/><path d="M${x + 3} ${top - 44} a6 6 0 1 0 0 10 a5 5 0 1 1 0 -10 Z" fill="${c}"/>`;
  g += minaret(60, 40) + minaret(360, 40);
  g += `<path d="M110 230 V150 H310 V230 Z" fill="${c}"/>`;
  g += `<path d="M140 152 C140 96 180 70 210 52 C240 70 280 96 280 152 Z" fill="${c}"/><path d="M210 52 V30" stroke="${c}" stroke-width="3"/><path d="M214 20 a8 8 0 1 0 0 14 a6.5 6.5 0 1 1 0 -14 Z" fill="${c}"/>`;
  g += `<path d="M110 152 C110 128 124 116 136 108 C148 116 162 128 162 152 Z M258 152 C258 128 272 116 284 108 C296 116 310 128 310 152 Z" fill="${c}"/>`;
  g += `<path d="M84 230 V176 H110 V230 Z M310 230 V176 H336 V230 Z" fill="${c}"/>`;
  for (const x of [134, 166, 254, 286]) g += `<path d="M${x - 8} 200 V184 Q${x} 172 ${x + 8} 184 V200 Z" fill="${win}"/>`;
  g += `<path d="M196 230 V196 Q210 176 224 196 V230 Z" fill="${win}"/>`;
  return g + `</g>`;
}

function rosette(cx: number, cy: number, r: number, c: string, sw: number): string {
  let g = `<g fill="none" stroke="${c}" stroke-width="${f1(sw)}" stroke-linejoin="round">`;
  g += `<polygon points="${eightStar(cx, cy, r)}"/><polygon points="${eightStar(cx, cy, r * 0.62)}"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 0.26)}"/>`;
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g += `<path d="M${f1(cx + Math.cos(a) * r * 0.26)} ${f1(cy + Math.sin(a) * r * 0.26)} L${f1(cx + Math.cos(a) * r * 0.62)} ${f1(cy + Math.sin(a) * r * 0.62)}"/>`; }
  return g + `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 1.08)}"/></g>`;
}

/** Repeating eight-point-star lattice for patterns. */
const patternTile = (id: string, size: number, c: string, o: number) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g fill="none" stroke="${c}" stroke-width="${f1(size * 0.018)}" opacity="${o}"><polygon points="${eightStar(size / 2, size / 2, size * 0.3)}"/><polygon points="${eightStar(0, 0, size * 0.3)}"/><polygon points="${eightStar(size, 0, size * 0.3)}"/><polygon points="${eightStar(0, size, size * 0.3)}"/><polygon points="${eightStar(size, size, size * 0.3)}"/><path d="M${size / 2} 0 V${size * 0.2} M${size / 2} ${size * 0.8} V${size} M0 ${size / 2} H${size * 0.2} M${size * 0.8} ${size / 2} H${size}"/></g></pattern>`;

// ---------- the collection ----------
const ILLUSTRATIONS: AssetDef[] = [
  A('is-lantern', 'Ramadan lantern (fanous)', 'illustration', 120, 210, ['#d4a940', '#1f6f6a', '#ffcf6a'], ['lantern', 'fanous', 'fanoos', 'light', 'glow', 'ramadan'], (c) => lantern('l', 0, 0, 1, c[0], c[1], c[2])),
  A('is-lanterns', 'Hanging lanterns', 'decoration', 420, 300, ['#d4a940', '#1f6f6a', '#ffcf6a'], ['lanterns', 'hanging', 'border', 'fanous', 'decoration'], (c) => {
    let g = '';
    for (const [x, len, s] of [[40, 30, 0.62], [140, 90, 0.8], [270, 50, 0.7], [360, 10, 0.55]]) g += `<path d="M${x + 60 * s} 0 V${len}" stroke="${c[0]}" stroke-width="1.6"/>` + lantern(`l${x}`, x, len, s, c[0], x % 2 ? mix(c[1], '#7b2d4f', 0.6) : c[1], c[2]);
    return g + sparkle(110, 40, 8, c[2]) + sparkle(240, 20, 6, c[2]) + sparkle(330, 120, 7, c[2]);
  }),
  A('is-crescent', 'Crescent & star', 'illustration', 200, 200, ['#d4a940'], ['crescent', 'moon', 'hilal', 'star', 'new moon'], (c) => crescent('c', 96, 100, 84, c[0])),
  A('is-crescent-stars', 'Crescent with hanging stars', 'decoration', 260, 260, ['#d4a940', '#fff3c4'], ['crescent', 'moon', 'stars', 'hanging', 'night'], (c) =>
    `<defs>${glowDef('cg', c[1], 0.35)}</defs><circle cx="120" cy="110" r="110" fill="url(#cg)"/>` + crescent('c', 110, 110, 86, c[0], false) +
    [[170, 70, 120], [200, 40, 160], [228, 60, 110]].map(([x, top, len]) => `<path d="M${x} ${top} V${len}" stroke="${c[0]}" stroke-width="1.6"/><polygon points="${starPts(x, len + 10, 5, 10, 4.2)}" fill="${c[0]}"/>`).join('') + sparkle(60, 220, 7, c[1]) + sparkle(220, 220, 5, c[1])),
  A('is-mosque', 'Mosque silhouette', 'illustration', 420, 230, ['#123a3a', '#ffcf6a'], ['mosque', 'masjid', 'silhouette', 'domes', 'minarets', 'skyline'], (c) => mosque(c[0], c[1])),
  A('is-rosette', 'Geometric rosette', 'decoration', 200, 200, ['#d4a940'], ['geometric', 'pattern', 'rosette', 'star', 'islamic art', 'mandala'], (c) => rosette(100, 100, 86, c[0], 3)),
  A('is-arch-frame', 'Arch window frame', 'decoration', 400, 540, ['#d4a940', '#ffffff'], ['arch', 'frame', 'window', 'border', 'invitation', 'elegant'], (c) => {
    const arch = (inset: number) => `M${inset} 540 V${190 + inset * 0.6} C${inset} ${100 + inset} ${110 + inset * 0.3} ${40 + inset} 200 ${inset} C${290 - inset * 0.3} ${40 + inset} ${400 - inset} ${100 + inset} ${400 - inset} ${190 + inset * 0.6} V540`;
    return `<path d="${arch(10)}" fill="none" stroke="${c[0]}" stroke-width="6"/><path d="${arch(26)}" fill="none" stroke="${c[0]}" stroke-width="1.8"/><polygon points="${eightStar(200, 40, 16)}" fill="${c[0]}"/>` +
      [70, 330].map((x) => `<polygon points="${eightStar(x, 520, 10)}" fill="none" stroke="${c[0]}" stroke-width="2"/>`).join('');
  }),
  A('is-frame', 'Geometric border frame', 'decoration', 400, 520, ['#d4a940'], ['frame', 'border', 'geometric', 'elegant'], (c) =>
    frame(400, 520, c[0], 16, (k) => `<polygon points="${eightStar(32, 32, 16)}" fill="none" stroke="${k}" stroke-width="2.4"/><polygon points="${eightStar(32, 32, 7)}" fill="${k}"/>`)),
  A('is-dates', 'Bowl of dates', 'illustration', 220, 150, ['#7a3e1d', '#d4a940', '#f3ead7'], ['dates', 'iftar', 'food', 'bowl', 'breaking fast'], (c) => {
    let g = `<ellipse cx="110" cy="140" rx="96" ry="7" fill="#000" opacity=".15"/>`;
    const r = rng(3);
    for (let i = 0; i < 11; i++) { const x = 46 + (i % 6) * 26 + (i > 5 ? 13 : 0), y = i > 5 ? 54 : 70, rot = (r() - 0.5) * 50; g += `<g transform="rotate(${f1(rot)} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="16" ry="10" fill="${i % 3 ? c[0] : dk(c[0], 0.15)}"/><path d="M${x - 9} ${y - 3} Q${x} ${y - 7} ${x + 9} ${y - 2}" stroke="${lt(c[0], 0.3)}" stroke-width="2" fill="none"/></g>`; }
    g += `<path d="M14 72 H206 C200 116 164 136 110 136 C56 136 20 116 14 72 Z" fill="${c[2]}"/><path d="M14 72 H206 C206 80 194 84 110 84 C26 84 14 80 14 72 Z" fill="${dk(c[2], 0.08)}"/>`;
    g += `<path d="M30 96 H190" stroke="${c[1]}" stroke-width="4"/>` + [50, 80, 110, 140, 170].map((x) => `<polygon points="${eightStar(x, 112, 6)}" fill="${c[1]}"/>`).join('');
    return g;
  }),
  A('is-dallah', 'Arabic coffee pot (dallah)', 'illustration', 180, 220, ['#d4a940', '#3a2a20'], ['coffee', 'dallah', 'gahwa', 'hospitality', 'eid', 'arabic coffee'], (c) =>
    `<defs><linearGradient id="dg" x1="0" x2="1"><stop offset="0" stop-color="${lt(c[0], 0.4)}"/><stop offset=".5" stop-color="${c[0]}"/><stop offset="1" stop-color="${dk(c[0], 0.3)}"/></linearGradient></defs>` +
    `<path d="M66 20 Q80 4 94 20 L98 40 H62 Z" fill="url(#dg)"/><circle cx="80" cy="12" r="5" fill="${c[0]}"/><path d="M58 40 H102 L108 70 C130 90 136 130 126 170 C120 196 104 206 80 206 C56 206 40 196 34 170 C24 130 30 90 52 70 Z" fill="url(#dg)"/>` +
    `<path d="M40 110 C20 80 6 60 2 40 C16 50 28 68 46 92" stroke="url(#dg)" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M126 96 C160 100 166 150 128 160" stroke="${dk(c[0], 0.2)}" stroke-width="9" fill="none"/>` +
    `<path d="M40 130 H120 M38 150 H122" stroke="${dk(c[0], 0.35)}" stroke-width="2.5"/>` + [60, 80, 100].map((x) => `<polygon points="${eightStar(x, 140, 6)}" fill="${dk(c[0], 0.3)}"/>`).join('') +
    `<ellipse cx="80" cy="212" rx="56" ry="5" fill="#000" opacity=".15"/><path d="M150 196 H174 L170 212 H154 Z" fill="${c[1]}"/><path d="M150 196 H174" stroke="${c[0]}" stroke-width="3"/>`),
  A('is-sheep', 'Cute sheep', 'illustration', 200, 170, ['#fbf7ef', '#3a2f2a', '#ff9bb3'], ['sheep', 'lamb', 'eid al adha', 'qurbani', 'kids', 'cute'], (c) => {
    let g = `<ellipse cx="100" cy="162" rx="70" ry="6" fill="#000" opacity=".12"/><path d="M62 130 V158 M84 136 V160 M118 136 V160 M140 130 V158" stroke="${c[1]}" stroke-width="9" stroke-linecap="round"/>`;
    for (const [x, y, r] of [[60, 100, 30], [90, 84, 32], [124, 84, 32], [150, 104, 28], [104, 118, 34], [70, 124, 26], [138, 126, 26]]) g += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c[0]}" stroke="${dk(c[0], 0.08)}" stroke-width="2"/>`;
    g += `<ellipse cx="42" cy="90" rx="26" ry="30" fill="${c[1]}"/><ellipse cx="22" cy="78" rx="14" ry="7" fill="${c[1]}" transform="rotate(-30 22 78)"/><ellipse cx="62" cy="70" rx="13" ry="6" fill="${c[1]}" transform="rotate(30 62 70)"/>`;
    g += `<circle cx="40" cy="70" r="13" fill="${c[0]}"/><circle cx="52" cy="66" r="10" fill="${c[0]}"/><circle cx="33" cy="90" r="4" fill="#fff"/><circle cx="51" cy="90" r="4" fill="#fff"/><circle cx="34" cy="91" r="2" fill="#000"/><circle cx="52" cy="91" r="2" fill="#000"/><ellipse cx="42" cy="106" rx="7" ry="4" fill="${c[2]}" opacity=".7"/>`;
    return g;
  }),
  A('is-gifts', 'Eid gifts', 'illustration', 320, 220, ['#1f6f6a', '#d4a940', '#7b2d4f'], ['gifts', 'eidi', 'presents', 'eid'], (c) => gift('a', 20, 92, 120, 120, c[2], c[1], lt(c[2], 0.4)) + gift('c', 196, 112, 104, 100, c[1], c[0]) + gift('b', 98, 56, 140, 156, c[0], c[1], c[1])),
  A('is-iftar', 'Iftar table', 'illustration', 420, 200, ['#7a3e1d', '#d4a940', '#f3ead7', '#c4622d', '#8fc3e6'], ['iftar', 'ifṭār', 'إفطار', 'suhoor', 'sehri', 'dinner', 'breaking fast', 'community iftar', 'food'], (c) => {
    let g = `<rect x="0" y="150" width="420" height="50" rx="6" fill="${c[2]}"/><path d="M0 160 H420" stroke="${c[1]}" stroke-width="4"/>`;
    g += `<ellipse cx="90" cy="150" rx="70" ry="14" fill="${c[1]}"/><ellipse cx="90" cy="146" rx="60" ry="10" fill="${lt(c[1], 0.3)}"/>`;
    for (let i = 0; i < 9; i++) { const x = 50 + (i % 5) * 20, y = 140 - Math.floor(i / 5) * 10; g += `<ellipse cx="${x}" cy="${y}" rx="11" ry="6.5" fill="${i % 2 ? c[0] : dk(c[0], 0.15)}" transform="rotate(${i * 17} ${x} ${y})"/>`; }
    g += `<path d="M160 120 C160 150 190 158 210 158 C230 158 260 150 260 120 Z" fill="${c[2]}" stroke="${dk(c[2], 0.15)}" stroke-width="3"/><ellipse cx="210" cy="120" rx="50" ry="10" fill="${c[3]}"/><path d="M196 104 c-6 -10 6 -14 0 -24 M214 102 c-6 -10 6 -14 0 -24" stroke="#bbb" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`;
    g += `<path d="M300 90 H330 L326 156 H304 Z" fill="${c[4]}" opacity=".55" stroke="${dk(c[4], 0.2)}" stroke-width="2"/><path d="M302 110 H328" stroke="#fff" stroke-width="2" opacity=".6"/>`;
    g += lantern('il', 330, 4, 0.7, c[1], '#2a8f86', '#ffcf6a');
    return g;
  }),
  A('is-charity', 'Charity box', 'illustration', 240, 240, ['#1f6f6a', '#d4a940', '#ffffff'], ['charity', 'zakat', 'sadaqah', 'zakat al-fitr', 'donation', 'giving', 'fundraiser', 'زكاة', 'صدقة'], (c) =>
    `<ellipse cx="120" cy="228" rx="90" ry="7" fill="#000" opacity=".12"/><path d="M40 110 H200 V222 H40 Z" fill="${c[0]}"/><path d="M200 110 L224 92 V204 L200 222 Z" fill="${dk(c[0], 0.25)}"/><path d="M40 110 L64 92 H224 L200 110 Z" fill="${lt(c[0], 0.2)}"/>` +
    `<rect x="106" y="97" width="70" height="8" rx="4" fill="${dk(c[0], 0.5)}" transform="skewX(-30)"/>` +
    `<path d="M120 154 C108 140 88 144 90 160 C92 174 110 182 120 194 C130 182 148 174 150 160 C152 144 132 140 120 154 Z" fill="${c[2]}"/><path d="M48 124 H192" stroke="${c[1]}" stroke-width="4"/>` +
    [[124, 60, 16], [148, 26, 13], [104, 30, 11]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c[1]}"/><circle cx="${x}" cy="${y}" r="${(r as number) * 0.66}" fill="none" stroke="${dk(c[1], 0.25)}" stroke-width="2"/>`).join('')),
  A('is-rehal', 'Book on a stand (rehal)', 'illustration', 260, 220, ['#8a5a34', '#1f6f6a', '#d4a940'], ['rehal', 'quran stand', 'book stand', 'islamic school', 'quran class', 'mosque', 'learning', 'madrasa'], (c) =>
    `<ellipse cx="130" cy="212" rx="100" ry="6" fill="#000" opacity=".12"/>` +
    // two carved boards crossing in an X; the open book rests in the V on top
    `<path d="M50 210 L196 66" stroke="${dk(c[0], 0.15)}" stroke-width="18" stroke-linecap="round"/><path d="M210 210 L64 66" stroke="${c[0]}" stroke-width="18" stroke-linecap="round"/>` +
    `<path d="M106 150 L154 150" stroke="${lt(c[0], 0.2)}" stroke-width="4"/><circle cx="130" cy="138" r="6" fill="${c[2]}"/>` +
    `<path d="M130 112 C104 96 70 92 40 96 L56 52 C86 48 112 54 130 68 Z" fill="${c[1]}"/><path d="M130 112 C156 96 190 92 220 96 L204 52 C174 48 148 54 130 68 Z" fill="${dk(c[1], 0.12)}"/>` +
    `<path d="M130 106 C108 92 80 88 52 90 L64 58 C90 56 112 62 130 74 Z" fill="#f6efe0"/><path d="M130 106 C152 92 180 88 208 90 L196 58 C170 56 148 62 130 74 Z" fill="#ece3d0"/>` +
    [0, 1, 2, 3].map((i) => `<path d="M${70 + i * 2} ${66 + i * 7} C${92 + i} ${66 + i * 6} ${112} ${72 + i * 6} ${124} ${80 + i * 6} M${190 - i * 2} ${66 + i * 7} C${168 - i} ${66 + i * 6} ${148} ${72 + i * 6} ${136} ${80 + i * 6}" stroke="#3a2e28" stroke-width="2" opacity=".35" fill="none"/>`).join('') +
    `<path d="M130 68 V112" stroke="${c[2]}" stroke-width="3"/>`),
  A('is-tasbih', 'Prayer beads (tasbih)', 'illustration', 220, 240, ['#6a3a2a', '#d4a940'], ['tasbih', 'misbaha', 'prayer beads', 'dhikr', 'سبحة', 'peace', 'reflection'], (c) => {
    let g = '';
    for (let i = 0; i < 33; i++) { const a = (i / 33) * Math.PI * 2 - Math.PI / 2, x = 110 + Math.cos(a) * 80, y = 100 + Math.sin(a) * 80; g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="${c[0]}"/><circle cx="${f1(x - 3)}" cy="${f1(y - 3)}" r="3" fill="#fff" opacity=".4"/>`; }
    return g + `<path d="M110 180 V196" stroke="${c[1]}" stroke-width="4"/><path d="M104 196 H116 L114 214 H106 Z" fill="${c[1]}"/>` + [104, 110, 116].map((x) => `<path d="M${x} 214 V236" stroke="${c[1]}" stroke-width="2"/>`).join('');
  }),
  A('is-sparkles', 'Gold stars', 'decoration', 300, 200, ['#d4a940', '#fff3c4'], ['stars', 'sparkles', 'night', 'gold'], (c) => {
    const r = rng(14); let g = '';
    for (let i = 0; i < 18; i++) { const x = r() * 300, y = r() * 200; g += i % 3 ? sparkle(x, y, 3 + r() * 6, c[1], 0.8) : `<polygon points="${eightStar(x, y, 5 + r() * 6)}" fill="${c[0]}" opacity=".85"/>`; }
    return g;
  }),
];

// ---------- backgrounds ----------
const BGS = backgrounds('islamic', ['islamic', 'ramadan', 'eid', 'رمضان', 'عيد'], [
  { id: 'is-bg-night', name: 'Ramadan night skyline', colors: ['#0b1f2e', '#174a52', '#ffcf6a'], tags: ['night', 'mosque', 'skyline', 'stars', 'crescent'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>` +
      stars(W, H * 0.7, '#fff6d8', Math.round((W * H) / 12000), 9, 2.6) +
      `<g transform="translate(${f1(W * 0.5 - u * 0.5)} ${f1(H - u * 0.55)}) scale(${f1(u / 420)})">${mosque(dk(c[0], 0.35), c[2])}</g>` +
      `<rect y="${f1(H - u * 0.02)}" width="${W}" height="${f1(u * 0.02)}" fill="${dk(c[0], 0.35)}"/>`;
  } },
  { id: 'is-bg-starry', name: 'Starry night sky', colors: ['#0b1f2e', '#1d4a5a', '#ffcf6a'], tags: ['night', 'stars', 'sky', 'calm', 'blue'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>${glowDef('g', c[2], 0.22)}</defs><rect width="${W}" height="${H}" fill="url(#s)"/>` +
      `<ellipse cx="${f1(W / 2)}" cy="${f1(H)}" rx="${f1(W * 0.8)}" ry="${f1(u * 0.45)}" fill="url(#g)"/>` + stars(W, H, '#fff6d8', Math.round((W * H) / 9000), 27, 2.4);
  } },
  { id: 'is-bg-emerald', name: 'Emerald geometric', colors: ['#0e3b36', '#d4a940'], tags: ['pattern', 'geometric', 'green', 'gold', 'elegant'], draw: (c, W, H) =>
    `<defs>${patternTile('p', 140, c[1], 0.32)}<radialGradient id="r" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="${lt(c[0], 0.12)}"/><stop offset="1" stop-color="${dk(c[0], 0.35)}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/><rect width="${W}" height="${H}" fill="url(#p)"/>` },
  { id: 'is-bg-cream', name: 'Ivory & gold', colors: ['#fbf5e8', '#c99b2e'], tags: ['cream', 'ivory', 'light', 'elegant', 'minimal', 'pattern'], draw: (c, W, H) => {
    const m = Math.min(W, H) * 0.045;
    return `<defs>${patternTile('p', 120, c[1], 0.12)}</defs><rect width="${W}" height="${H}" fill="${c[0]}"/><rect width="${W}" height="${H}" fill="url(#p)"/><rect x="${f1(m)}" y="${f1(m)}" width="${f1(W - m * 2)}" height="${f1(H - m * 2)}" fill="none" stroke="${c[1]}" stroke-width="${f1(m * 0.12)}"/>`;
  } },
  { id: 'is-bg-royal', name: 'Royal blue & gold', colors: ['#14244d', '#2a3f7a', '#e8c46a'], tags: ['blue', 'gold', 'luxury', 'bokeh', 'night'], draw: (c, W, H) =>
    `<defs>${patternTile('p', 160, c[2], 0.12)}<radialGradient id="r" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/><rect width="${W}" height="${H}" fill="url(#p)"/>` + bokeh(W, H, [c[2], lt(c[2], 0.4)], Math.round((W * H) / 40000), 7, Math.min(W, H) * 0.06, 'bk') },
  { id: 'is-bg-dusk', name: 'Iftar sunset', colors: ['#3b1f4a', '#c4574a', '#f6b26b'], tags: ['sunset', 'iftar', 'maghrib', 'dusk', 'warm'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".6" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>` +
      stars(W, H * 0.35, '#ffffff', Math.round((W * H) / 30000), 4, 2) +
      `<g transform="translate(${f1(W * 0.5 - u * 0.48)} ${f1(H - u * 0.52)}) scale(${f1((u * 0.96) / 420)})">${mosque(dk(c[0], 0.3), c[2])}</g>`;
  } },
]);

export const ASSETS: AssetDef[] = [...ILLUSTRATIONS, ...BGS];
