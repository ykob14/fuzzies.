/** Recolourable vector graphics, grouped in packs. Each one is an SVG built from up to three colours. */
import { loadedAsset } from './assets';

export interface Art {
  id: string;
  name: string;
  pack: string;
  ratio: number; // width / height
  colors: string[];
  svg: (c: string[]) => string;
}

export interface ArtPack { id: string; name: string; cost: number; blurb: string }

export const ART_PACKS: ArtPack[] = [
  { id: 'art-basics', name: 'Basics', cost: 0, blurb: 'Blobs, waves, scribbles and frames' },
  { id: 'art-retro', name: 'Retro Sunshine', cost: 20, blurb: '70s suns, rainbows and groovy flowers' },
  { id: 'art-party', name: 'Party Time', cost: 20, blurb: 'Confetti, balloons, crowns and ribbons' },
  { id: 'art-nature', name: 'Into Nature', cost: 25, blurb: 'Leaves, mountains, clouds and moons' },
  { id: 'art-memphis', name: 'Memphis Pop', cost: 30, blurb: 'Bold 80s patterns and shapes' },
];

/** Explicit width/height keep every browser happy when the SVG is drawn to a canvas; "none" lets it stretch with its box. */
const S = (vb: string, body: string) => {
  const [, , w, h] = vb.split(' ').map(Number);
  const k = 600 / Math.max(w, h);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${Math.round(w * k)}" height="${Math.round(h * k)}" preserveAspectRatio="none">${body}</svg>`;
};

function starPts(cx: number, cy: number, n: number, r1: number, r2: number, rot = -90): string {
  const p: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    p.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return p.join(' ');
}

export const ARTS: Art[] = [
  // ----- basics -----
  { id: 'blob1', name: 'Blob', pack: 'art-basics', ratio: 1, colors: ['#ffb4d6'], svg: (c) => S('0 0 200 200', `<path fill="${c[0]}" d="M44.7,-58.5C57.6,-49.6,67.6,-35.6,72.1,-19.7C76.6,-3.8,75.6,14,68.2,28.6C60.8,43.2,47,54.6,31.4,62.4C15.8,70.2,-1.6,74.4,-18.8,71.3C-36,68.2,-53,57.8,-63.6,42.7C-74.2,27.6,-78.4,7.8,-74.4,-9.6C-70.4,-27,-58.2,-42,-43.5,-50.6C-28.8,-59.2,-14.4,-61.4,1.1,-62.8C16.6,-64.2,31.8,-67.4,44.7,-58.5Z" transform="translate(100 100) scale(1.3)"/>`) },
  { id: 'blob2', name: 'Soft blob', pack: 'art-basics', ratio: 1, colors: ['#b8a4ff'], svg: (c) => S('0 0 200 200', `<path fill="${c[0]}" d="M38.6,-49.2C50.8,-37.2,61.5,-24.9,66.1,-9.6C70.7,5.7,69.2,24,59.9,36.4C50.6,48.8,33.5,55.3,16.2,61C-1.1,66.7,-18.6,71.6,-34.3,66.4C-50,61.2,-63.9,45.9,-69.3,28.4C-74.7,10.9,-71.6,-8.8,-62.6,-24.3C-53.6,-39.8,-38.7,-51.1,-23.6,-62.4C-8.5,-73.7,6.8,-85,20.2,-81.4C33.6,-77.8,26.4,-61.2,38.6,-49.2Z" transform="translate(100 100) scale(1.25)"/>`) },
  { id: 'wave', name: 'Wave', pack: 'art-basics', ratio: 4, colors: ['#7c4dff', '#ff7ac2'], svg: (c) => S('0 0 400 100', `<path fill="${c[1]}" opacity=".55" d="M0 55 C60 15 120 15 200 50 S340 90 400 40 V100 H0Z"/><path fill="${c[0]}" d="M0 70 C70 35 140 40 210 68 S330 95 400 62 V100 H0Z"/>`) },
  { id: 'squiggle', name: 'Squiggle', pack: 'art-basics', ratio: 4, colors: ['#ff4f9a'], svg: (c) => S('0 0 400 100', `<path d="M10 50 Q35 10 60 50 T110 50 T160 50 T210 50 T260 50 T310 50 T360 50 T390 40" fill="none" stroke="${c[0]}" stroke-width="14" stroke-linecap="round"/>`) },
  { id: 'underline', name: 'Scribble underline', pack: 'art-basics', ratio: 6, colors: ['#ffb000'], svg: (c) => S('0 0 600 100', `<path d="M15 60 C150 30 330 25 585 45 M40 78 C200 55 380 58 560 70" fill="none" stroke="${c[0]}" stroke-width="16" stroke-linecap="round"/>`) },
  { id: 'sparkle', name: 'Sparkle', pack: 'art-basics', ratio: 1, colors: ['#ffd23f', '#ffffff'], svg: (c) => S('0 0 100 100', `<path fill="${c[0]}" d="M50 0 C55 35 65 45 100 50 C65 55 55 65 50 100 C45 65 35 55 0 50 C35 45 45 35 50 0Z"/><circle cx="50" cy="50" r="6" fill="${c[1]}"/>`) },
  { id: 'dots', name: 'Dot grid', pack: 'art-basics', ratio: 1, colors: ['#1c1830'], svg: (c) => { let d = ''; for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) d += `<circle cx="${10 + x * 16}" cy="${10 + y * 16}" r="4" fill="${c[0]}"/>`; return S('0 0 100 100', d); } },
  { id: 'arrow', name: 'Curvy arrow', pack: 'art-basics', ratio: 1.6, colors: ['#1c1830'], svg: (c) => S('0 0 160 100', `<path d="M12 80 C40 20 100 10 140 40" fill="none" stroke="${c[0]}" stroke-width="7" stroke-linecap="round"/><path d="M118 28 L142 41 L126 63" fill="none" stroke="${c[0]}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`) },
  { id: 'circle-scribble', name: 'Circle scribble', pack: 'art-basics', ratio: 1.4, colors: ['#ff4f9a'], svg: (c) => S('0 0 140 100', `<path d="M95 14 C60 2 14 14 10 48 C6 82 60 96 100 86 C135 76 140 40 110 20 C90 8 60 8 40 12" fill="none" stroke="${c[0]}" stroke-width="5" stroke-linecap="round"/>`) },
  { id: 'frame', name: 'Rounded frame', pack: 'art-basics', ratio: 0.8, colors: ['#ffffff', '#1c1830'], svg: (c) => S('0 0 160 200', `<rect x="6" y="6" width="148" height="188" rx="22" fill="none" stroke="${c[0]}" stroke-width="8"/><rect x="18" y="18" width="124" height="164" rx="14" fill="none" stroke="${c[1]}" stroke-width="2" stroke-dasharray="6 6"/>`) },
  { id: 'badge', name: 'Seal badge', pack: 'art-basics', ratio: 1, colors: ['#ff5e62', '#ffffff'], svg: (c) => S('0 0 100 100', `<polygon points="${starPts(50, 50, 16, 49, 42)}" fill="${c[0]}"/><circle cx="50" cy="50" r="34" fill="none" stroke="${c[1]}" stroke-width="2" stroke-dasharray="3 3"/>`) },
  { id: 'brush', name: 'Brush stroke', pack: 'art-basics', ratio: 3.5, colors: ['#2ec4b6'], svg: (c) => S('0 0 350 100', `<path fill="${c[0]}" d="M14 40 C60 18 160 22 250 20 C300 19 330 24 340 34 C346 42 338 52 330 56 C300 70 250 74 180 78 C120 82 60 86 24 76 C6 70 2 50 14 40Z"/><path fill="${c[0]}" opacity=".5" d="M30 84 C90 92 170 90 260 82 L262 88 C170 98 90 98 32 90Z"/>`) },

  // ----- retro -----
  { id: 'retro-sun', name: 'Retro sun', pack: 'art-retro', ratio: 1, colors: ['#ff7a59', '#ffd23f', '#ff4f9a'], svg: (c) => S('0 0 200 200', `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[1]}"/><stop offset=".55" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient><clipPath id="k"><circle cx="100" cy="100" r="92"/></clipPath></defs><g clip-path="url(#k)"><rect width="200" height="200" fill="url(#g)"/>${[118, 136, 152, 166, 178].map((y, i) => `<rect y="${y}" width="200" height="${4 + i * 1.6}" fill="#fff" opacity=".9"/>`).join('')}</g>`) },
  { id: 'rainbow', name: 'Rainbow', pack: 'art-retro', ratio: 2, colors: ['#ff5e62', '#ffb000', '#2ec4b6'], svg: (c) => S('0 0 200 100', `${[[c[0], 95], [c[1], 73], [c[2], 51]].map(([col, r]) => `<path d="M${100 - Number(r)} 100 A${r} ${r} 0 0 1 ${100 + Number(r)} 100" fill="none" stroke="${col}" stroke-width="20"/>`).join('')}`) },
  { id: 'flower70', name: 'Groovy flower', pack: 'art-retro', ratio: 1, colors: ['#ff7ac2', '#ffd23f'], svg: (c) => { let p = ''; for (let i = 0; i < 8; i++) p += `<ellipse cx="100" cy="48" rx="26" ry="44" fill="${c[0]}" transform="rotate(${i * 45} 100 100)"/>`; return S('0 0 200 200', p + `<circle cx="100" cy="100" r="34" fill="${c[1]}"/>`); } },
  { id: 'starburst', name: 'Starburst', pack: 'art-retro', ratio: 1, colors: ['#ffd23f'], svg: (c) => S('0 0 100 100', `<polygon points="${starPts(50, 50, 20, 50, 34)}" fill="${c[0]}"/>`) },
  { id: 'checker', name: 'Checker strip', pack: 'art-retro', ratio: 5, colors: ['#1c1830', '#ffffff'], svg: (c) => { let d = `<rect width="500" height="100" fill="${c[1]}"/>`; for (let x = 0; x < 10; x++) for (let y = 0; y < 2; y++) if ((x + y) % 2 === 0) d += `<rect x="${x * 50}" y="${y * 50}" width="50" height="50" fill="${c[0]}"/>`; return S('0 0 500 100', d); } },
  { id: 'smiley', name: 'Smiley', pack: 'art-retro', ratio: 1, colors: ['#ffd23f', '#1c1830'], svg: (c) => S('0 0 100 100', `<circle cx="50" cy="50" r="48" fill="${c[0]}"/><ellipse cx="36" cy="40" rx="5" ry="9" fill="${c[1]}"/><ellipse cx="64" cy="40" rx="5" ry="9" fill="${c[1]}"/><path d="M26 58 Q50 84 74 58" fill="none" stroke="${c[1]}" stroke-width="6" stroke-linecap="round"/>`) },

  // ----- party -----
  { id: 'confetti', name: 'Confetti', pack: 'art-party', ratio: 1.5, colors: ['#ff4f9a', '#ffd23f', '#4cc9f0'], svg: (c) => { let d = ''; const rnd = mulberry(7); for (let i = 0; i < 46; i++) { const x = rnd() * 300, y = rnd() * 200, col = c[i % 3], r = rnd() * 360; d += i % 3 === 0 ? `<circle cx="${x}" cy="${y}" r="${3 + rnd() * 4}" fill="${col}"/>` : `<rect x="${x}" y="${y}" width="${5 + rnd() * 6}" height="${12 + rnd() * 8}" rx="2" fill="${col}" transform="rotate(${r} ${x} ${y})"/>`; } return S('0 0 300 200', d); } },
  { id: 'balloons', name: 'Balloons', pack: 'art-party', ratio: 0.8, colors: ['#ff4f9a', '#7c4dff', '#ffd23f'], svg: (c) => S('0 0 160 200', `<path d="M48 92 Q60 150 80 196 M112 82 Q100 140 80 196 M80 70 Q86 130 80 196" stroke="#8a8a9a" stroke-width="2" fill="none"/>${[[48, 56, c[0]], [112, 48, c[1]], [80, 38, c[2]]].map(([x, y, col]) => `<ellipse cx="${x}" cy="${y}" rx="30" ry="36" fill="${col}"/><ellipse cx="${Number(x) - 10}" cy="${Number(y) - 14}" rx="7" ry="10" fill="#fff" opacity=".4"/><path d="M${Number(x) - 5} ${Number(y) + 37} l5 -6 l5 6z" fill="${col}"/>`).join('')}`) },
  { id: 'crown', name: 'Crown', pack: 'art-party', ratio: 1.4, colors: ['#ffc83d', '#ff4f9a'], svg: (c) => S('0 0 140 100', `<path d="M10 30 L40 60 L70 15 L100 60 L130 30 L118 88 H22Z" fill="${c[0]}" stroke-linejoin="round"/><rect x="22" y="78" width="96" height="12" rx="3" fill="${c[0]}"/><circle cx="70" cy="58" r="8" fill="${c[1]}"/><circle cx="40" cy="66" r="5" fill="${c[1]}"/><circle cx="100" cy="66" r="5" fill="${c[1]}"/>`) },
  { id: 'ribbon', name: 'Ribbon banner', pack: 'art-party', ratio: 4, colors: ['#ff5e62', '#c23a4a'], svg: (c) => S('0 0 400 100', `<path d="M0 30 H50 V90 H0 L18 60Z" fill="${c[1]}"/><path d="M400 30 H350 V90 H400 L382 60Z" fill="${c[1]}"/><rect x="36" y="14" width="328" height="62" rx="4" fill="${c[0]}"/>`) },
  { id: 'gift', name: 'Gift', pack: 'art-party', ratio: 1, colors: ['#7c4dff', '#ffd23f'], svg: (c) => S('0 0 100 100', `<rect x="12" y="40" width="76" height="54" rx="5" fill="${c[0]}"/><rect x="6" y="28" width="88" height="18" rx="4" fill="${c[0]}"/><rect x="44" y="28" width="12" height="66" fill="${c[1]}"/><path d="M50 28 C30 2 14 18 30 28 M50 28 C70 2 86 18 70 28" fill="none" stroke="${c[1]}" stroke-width="7" stroke-linecap="round"/>`) },
  { id: 'cake', name: 'Cake', pack: 'art-party', ratio: 0.9, colors: ['#ffb4d6', '#7c4dff', '#ffd23f'], svg: (c) => S('0 0 90 100', `<rect x="10" y="50" width="70" height="44" rx="6" fill="${c[0]}"/><path d="M10 62 q8 10 17 0 q9 10 18 0 q9 10 18 0 q8 10 17 0" fill="none" stroke="#fff" stroke-width="5"/><rect x="42" y="24" width="6" height="26" rx="2" fill="${c[1]}"/><path d="M45 6 C52 14 50 22 45 22 C40 22 38 14 45 6Z" fill="${c[2]}"/>`) },

  // ----- nature -----
  { id: 'leaf', name: 'Leaf', pack: 'art-nature', ratio: 0.7, colors: ['#2f9e5b', '#1f6e3e'], svg: (c) => S('0 0 70 100', `<path d="M35 2 C70 30 70 72 35 96 C0 72 0 30 35 2Z" fill="${c[0]}"/><path d="M35 14 V96 M35 40 L20 30 M35 56 L50 44 M35 70 L18 60" stroke="${c[1]}" stroke-width="3" fill="none" stroke-linecap="round"/>`) },
  { id: 'mountains', name: 'Mountains', pack: 'art-nature', ratio: 2, colors: ['#5b6cff', '#9aa6ff', '#ffffff'], svg: (c) => S('0 0 200 100', `<path d="M0 100 L60 30 L95 70 L130 20 L200 100Z" fill="${c[1]}"/><path d="M0 100 L45 55 L80 100Z M70 100 L130 20 L200 100Z" fill="${c[0]}"/><path d="M130 20 L144 38 L136 34 L128 40 L120 33Z" fill="${c[2]}"/>`) },
  { id: 'cloud', name: 'Cloud', pack: 'art-nature', ratio: 1.7, colors: ['#ffffff'], svg: (c) => S('0 0 170 100', `<path d="M40 90 a30 30 0 0 1 -4 -60 a38 38 0 0 1 70 -10 a30 30 0 0 1 44 28 a22 22 0 0 1 -6 42z" fill="${c[0]}"/>`) },
  { id: 'moon', name: 'Moon & stars', pack: 'art-nature', ratio: 1, colors: ['#ffd23f', '#ffffff'], svg: (c) => S('0 0 100 100', `<path d="M58 10 A40 40 0 1 0 90 66 A32 32 0 1 1 58 10Z" fill="${c[0]}"/><polygon points="${starPts(78, 24, 5, 8, 3.5)}" fill="${c[1]}"/><polygon points="${starPts(88, 46, 5, 5, 2.2)}" fill="${c[1]}"/>`) },
  { id: 'flower', name: 'Daisy', pack: 'art-nature', ratio: 1, colors: ['#ffffff', '#ffc83d'], svg: (c) => { let p = ''; for (let i = 0; i < 12; i++) p += `<ellipse cx="50" cy="24" rx="9" ry="22" fill="${c[0]}" transform="rotate(${i * 30} 50 50)"/>`; return S('0 0 100 100', p + `<circle cx="50" cy="50" r="15" fill="${c[1]}"/>`); } },
  { id: 'sunburst-lines', name: 'Sun rays', pack: 'art-nature', ratio: 1, colors: ['#ffb000'], svg: (c) => { let p = `<circle cx="50" cy="50" r="18" fill="${c[0]}"/>`; for (let i = 0; i < 12; i++) p += `<rect x="48" y="4" width="4" height="18" rx="2" fill="${c[0]}" transform="rotate(${i * 30} 50 50)"/>`; return S('0 0 100 100', p); } },

  // ----- memphis -----
  { id: 'zigzag', name: 'Zigzag', pack: 'art-memphis', ratio: 4, colors: ['#1c1830'], svg: (c) => S('0 0 400 100', `<path d="M10 70 L50 30 L90 70 L130 30 L170 70 L210 30 L250 70 L290 30 L330 70 L370 30 L390 50" fill="none" stroke="${c[0]}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>`) },
  { id: 'half-circle', name: 'Half circle', pack: 'art-memphis', ratio: 2, colors: ['#ff7a59'], svg: (c) => S('0 0 200 100', `<path d="M0 100 A100 100 0 0 1 200 100Z" fill="${c[0]}"/>`) },
  { id: 'pill-stripes', name: 'Striped pill', pack: 'art-memphis', ratio: 2.5, colors: ['#4cc9f0', '#1c1830'], svg: (c) => { let d = ''; for (let i = 0; i < 12; i++) d += `<rect x="${i * 24 - 30}" y="-20" width="9" height="160" fill="${c[1]}" transform="rotate(30 ${i * 24} 50)"/>`; return S('0 0 250 100', `<defs><clipPath id="p"><rect x="2" y="2" width="246" height="96" rx="48"/></clipPath></defs><rect x="2" y="2" width="246" height="96" rx="48" fill="${c[0]}"/><g clip-path="url(#p)">${d}</g>`); } },
  { id: 'triangles', name: 'Triangle confetti', pack: 'art-memphis', ratio: 1.5, colors: ['#ff4f9a', '#ffd23f', '#2ec4b6'], svg: (c) => { let d = ''; const rnd = mulberry(3); for (let i = 0; i < 18; i++) { const x = 15 + rnd() * 270, y = 15 + rnd() * 170; d += `<polygon points="${x},${y - 12} ${x + 11},${y + 8} ${x - 11},${y + 8}" fill="none" stroke="${c[i % 3]}" stroke-width="4" stroke-linejoin="round" transform="rotate(${rnd() * 360} ${x} ${y})"/>`; } return S('0 0 300 200', d); } },
  { id: 'cross-pattern', name: 'Plus pattern', pack: 'art-memphis', ratio: 1, colors: ['#7c4dff'], svg: (c) => { let d = ''; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) d += `<path d="M${14 + x * 24} ${8 + y * 24} v12 M${8 + x * 24} ${14 + y * 24} h12" stroke="${c[0]}" stroke-width="4" stroke-linecap="round"/>`; return S('0 0 100 100', d); } },
  { id: 'squiggle-blob', name: 'Pop blob', pack: 'art-memphis', ratio: 1, colors: ['#ffd23f', '#1c1830'], svg: (c) => S('0 0 100 100', `<path d="M50 6 C78 6 96 26 92 52 C88 80 66 96 44 92 C18 88 4 66 8 42 C12 20 28 6 50 6Z" fill="${c[0]}" stroke="${c[1]}" stroke-width="4"/><path d="M24 50 q8 -8 16 0 t16 0 t16 0" fill="none" stroke="${c[1]}" stroke-width="4" stroke-linecap="round"/>`) },
];

function mulberry(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Built-in packs first, then any loaded asset collection (see content/assets). */
export const artById = (id: string): Art | undefined => ARTS.find((a) => a.id === id) ?? loadedAsset(id);

export function artDataUrl(id: string, colors: string[]): string {
  const a = artById(id);
  if (!a) return '';
  const cols = a.colors.map((d, i) => colors[i] || d);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(a.svg(cols));
}
