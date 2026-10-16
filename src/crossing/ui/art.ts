/**
 * Illustrated pictures for the Fuzzy Crossing menu cards (Locker, Pass, Shop, Boards, Missions, Worlds, Endless, Events).
 * Sticker-style cartoon art: chunky dark-raspberry outlines, glossy gradients, white highlights. Raspberry + cream with gold
 * for the shiny things. Drawn in code (no image files); every picture is a 120×100 SVG.
 */
const OUT = '#8a1d49';        // outline
const R1 = '#ff7aa8', R2 = '#d6336c', R3 = '#a8244f';   // raspberry light → dark
const P1 = '#ffe3ee', P2 = '#ffc2d8';                    // pinks
const CR = '#fff7ec';                                     // cream
const G1 = '#ffe08a', G2 = '#f5b014', G3 = '#c98200';     // gold

let n = 0;
const ln = (id: string, a: string, b: string, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const st = (w = 3) => `stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const shine = (d: string, o = 0.55) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;
const spark = (x: number, y: number, s = 6, c = '#fff') => `<path d="M${x} ${y - s}q1.2 ${s - 1.2} ${s} ${s}q-${s - 1.2} 1.2 -${s} ${s}q-1.2 -${s - 1.2} -${s} -${s}q${s - 1.2} -1.2 ${s} -${s}z" fill="${c}"/>`;

const ART: Record<string, (u: string) => string> = {
  /** an open locker with room for the Fuzzy (the menu puts the picture on top of it) */
  locker: (u) => `<defs>${ln('a' + u, R1, R2)}${ln('b' + u, R3, '#6e1739')}${ln('c' + u, P1, P2)}</defs>
    <ellipse cx="62" cy="92" rx="40" ry="5" fill="#000" opacity=".14"/>
    <rect x="30" y="8" width="62" height="82" rx="8" fill="url(#b${u})" ${st()}/>
    <rect x="35" y="13" width="52" height="72" rx="5" fill="#5a1233" opacity=".55"/>
    <path d="M30 14 8 22v66l22 2z" fill="url(#a${u})" ${st()}/>
    <path d="M13 28 26 24M13 36l13-4M13 44l13-4" stroke="${OUT}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
    <circle cx="25" cy="58" r="3" fill="${G1}" ${st(2)}/>
    ${shine('M32 17 12 24v10l20-7z', 0.4)}
    <rect x="38" y="76" width="46" height="9" rx="3" fill="${P2}" ${st(2.4)}/>
    <path d="M50 76v9M62 76v9M74 76v9" stroke="${OUT}" stroke-width="1.8" opacity=".5"/>`,

  /** a golden ticket with a star */
  pass: (u) => `<defs>${ln('a' + u, G1, G2)}${ln('b' + u, R1, R3)}</defs>
    <g transform="rotate(-9 60 52)">
    <ellipse cx="62" cy="90" rx="40" ry="5" fill="#000" opacity=".13" transform="rotate(9 60 52)"/>
    <path d="M12 26a8 8 0 0 1 8-8h80a8 8 0 0 1 8 8v10a9 9 0 0 0 0 18v10a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8V54a9 9 0 0 0 0-18z" fill="url(#a${u})" ${st()}/>
    <path d="M80 20v50" stroke="${G3}" stroke-width="2.6" stroke-dasharray="3 5" stroke-linecap="round"/>
    <circle cx="46" cy="45" r="18" fill="url(#b${u})" ${st()}/>
    <path d="M46 31l4.2 8.6 9.4 1.3-6.8 6.7 1.6 9.4-8.4-4.5-8.4 4.5 1.6-9.4-6.8-6.7 9.4-1.3z" fill="${G1}" ${st(2.2)}/>
    <path d="M90 32h10M90 42h10M90 52h10" stroke="${G3}" stroke-width="3.4" stroke-linecap="round"/>
    ${shine('M16 24a5 5 0 0 1 5-4h58l-4 8H18z', 0.5)}
    </g>${spark(14, 18, 6)}${spark(108, 80, 5)}${spark(106, 14, 4, G1)}`,

  /** a little shop with a striped awning */
  shop: (u) => `<defs>${ln('a' + u, R1, R2)}${ln('c' + u, CR, P1)}</defs>
    <ellipse cx="60" cy="92" rx="46" ry="5" fill="#000" opacity=".13"/>
    <rect x="20" y="40" width="80" height="48" rx="4" fill="url(#c${u})" ${st()}/>
    <rect x="30" y="52" width="34" height="26" rx="3" fill="#ffd9e6" ${st(2.4)}/>
    ${shine('M32 54h14l-14 14z', 0.7)}
    <rect x="70" y="52" width="22" height="36" rx="3" fill="${R3}" ${st(2.4)}/>
    <circle cx="75" cy="72" r="2" fill="${G1}"/>
    <path d="M14 22h92l5 20H9z" fill="#fff" ${st()}/>
    <path d="M24 22l-3 20M44 22l-1 20M64 22v20M84 22l1 20M104 22l3 20" stroke="${R2}" stroke-width="10" stroke-linecap="butt" opacity="1" clip-path="inset(0)"/>
    <path d="M14 22h92l5 20H9z" fill="none" ${st()}/>
    <path d="M9 42a8.4 8 0 0 0 16.8 0 8.4 8 0 0 0 16.8 0 8.4 8 0 0 0 16.8 0 8.4 8 0 0 0 16.8 0 8.4 8 0 0 0 16.8 0z" fill="${R2}" ${st()}/>
    <path d="M17 8h86l5 14H12z" fill="url(#a${u})" ${st()}/>
    ${shine('M22 12h40l-3 6H20z', 0.5)}
    <circle cx="96" cy="94" r="0"/>`,

  /** a gold trophy with a star and a ribbon */
  boards: (u) => `<defs>${ln('a' + u, G1, G2)}${ln('b' + u, R1, R3)}</defs>
    <ellipse cx="60" cy="93" rx="30" ry="4.5" fill="#000" opacity=".14"/>
    <path d="M30 22H14c-2 14 6 26 20 28M90 22h16c2 14-6 26-20 28" fill="none" ${st(3.4)}/>
    <path d="M30 22H14c-2 14 6 26 20 28M90 22h16c2 14-6 26-20 28" fill="none" stroke="${G2}" stroke-width="3"/>
    <path d="M28 10h64v26c0 18-14 30-32 30S28 54 28 36z" fill="url(#a${u})" ${st()}/>
    ${shine('M34 14h14c-6 4-10 16-8 30-5-6-6-16-6-30z', 0.55)}
    <path d="M60 22l4.4 9 9.8 1.4-7.1 7 1.7 9.8-8.8-4.7-8.8 4.7 1.7-9.8-7.1-7 9.8-1.4z" fill="url(#b${u})" ${st(2.4)}/>
    <rect x="53" y="64" width="14" height="14" fill="${G2}" ${st(2.6)}/>
    <rect x="38" y="76" width="44" height="14" rx="4" fill="url(#b${u})" ${st()}/>
    ${shine('M42 79h20l-2 3H42z', 0.5)}${spark(108, 12, 6)}${spark(8, 70, 4)}`,

  /** a clipboard with ticks and a pencil */
  missions: (u) => `<defs>${ln('a' + u, CR, P1)}${ln('b' + u, R1, R2)}</defs>
    <ellipse cx="58" cy="93" rx="36" ry="4.5" fill="#000" opacity=".13"/>
    <rect x="22" y="12" width="64" height="78" rx="8" fill="url(#b${u})" ${st()}/>
    <rect x="29" y="22" width="50" height="62" rx="4" fill="url(#a${u})" ${st(2.4)}/>
    <rect x="40" y="6" width="28" height="14" rx="5" fill="${G1}" ${st()}/>
    <path d="M35 38l4 4 7-8M35 54l4 4 7-8M35 70l4 4 7-8" fill="none" stroke="${R2}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M52 38h20M52 54h20M52 70h14" stroke="${OUT}" stroke-width="3.4" stroke-linecap="round" opacity=".4"/>
    <g transform="rotate(32 98 56)"><rect x="92" y="30" width="12" height="50" rx="3" fill="${G2}" ${st(2.6)}/><path d="M92 80l6 12 6-12z" fill="${P2}" ${st(2.4)}/><rect x="92" y="30" width="12" height="9" rx="3" fill="${R2}" ${st(2.4)}/></g>`,

  /** a globe with a pin */
  worlds: (u) => `<defs><radialGradient id="a${u}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${R1}"/><stop offset="1" stop-color="${R3}"/></radialGradient></defs>
    <ellipse cx="60" cy="93" rx="32" ry="4.5" fill="#000" opacity=".14"/>
    <path d="M44 88h32l-6-10H50z" fill="${G2}" ${st(2.6)}/>
    <circle cx="60" cy="46" r="36" fill="url(#a${u})" ${st()}/>
    <path d="M36 32c8-8 16-2 18 4s-6 8-10 12-2 10 4 10-4 8-10 4-8-18-2-30z" fill="${P1}" ${st(2.2)}/>
    <path d="M70 22c8 2 18 8 18 16s-8 6-12 4-2-8-8-8-4-10 2-12z" fill="${P1}" ${st(2.2)}/>
    <path d="M66 62c6-2 14 0 14 8s-8 10-12 6-6-12-2-14z" fill="${P1}" ${st(2.2)}/>
    ${shine('M34 28a30 30 0 0 1 18-14c-10 6-16 16-18 30z', 0.5)}${spark(104, 24, 6)}`,

  /** an infinity loop */
  endless: (u) => `<defs>${ln('a' + u, R1, R3, 1, 0)}</defs>
    <ellipse cx="60" cy="84" rx="40" ry="4.5" fill="#000" opacity=".13"/>
    <path d="M60 46C50 28 16 28 16 50s34 22 44 4c10 18 44 18 44-4S70 28 60 46z" fill="none" ${st(17)}/>
    <path d="M60 46C50 28 16 28 16 50s34 22 44 4c10 18 44 18 44-4S70 28 60 46z" fill="none" stroke="url(#a${u})" stroke-width="11" stroke-linecap="round"/>
    <path d="M60 46C50 28 16 28 16 50s34 22 44 4c10 18 44 18 44-4S70 28 60 46z" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="1 9" stroke-linecap="round" opacity=".8"/>
    <path d="M20 40c6-8 18-9 28-3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>${spark(102, 20, 6)}${spark(14, 76, 4, G1)}`,

  /** a gift with a bow */
  events: (u) => `<defs>${ln('a' + u, R1, R2)}${ln('b' + u, G1, G2)}</defs>
    <ellipse cx="60" cy="93" rx="36" ry="4.5" fill="#000" opacity=".14"/>
    <rect x="22" y="42" width="76" height="48" rx="6" fill="url(#a${u})" ${st()}/>
    <rect x="16" y="30" width="88" height="20" rx="6" fill="url(#a${u})" ${st()}/>
    <rect x="52" y="30" width="16" height="60" fill="url(#b${u})" ${st(2.6)}/>
    ${shine('M26 46h14l-14 20z', 0.4)}${shine('M20 34h30l-4 8H20z', 0.4)}
    <path d="M60 30C48 30 30 26 36 14c6-10 20 4 24 16z" fill="url(#b${u})" ${st()}/>
    <path d="M60 30c12 0 30-4 24-16-6-10-20 4-24 16z" fill="url(#b${u})" ${st()}/>
    <circle cx="60" cy="30" r="6" fill="${G2}" ${st(2.6)}/>${spark(10, 20, 6)}${spark(110, 40, 5, G1)}${spark(100, 8, 4)}`,
};

export type ArtName = keyof typeof ART;
/** the SVG markup for a picture (unique gradient ids per call, so the same picture can sit on a page many times) */
export function artSvg(name: ArtName, size = 96): string {
  const u = String(++n);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" width="${size}" height="${Math.round(size * 100 / 120)}" aria-hidden="true" class="fzx-art">${(ART[name] ?? ART.events)(u)}</svg>`;
}
export function art(name: ArtName, size = 96): HTMLElement {
  const d = document.createElement('span');
  d.className = 'fzx-art-w';
  d.innerHTML = artSvg(name, size);
  return d;
}
