/**
 * Little Fuzzy illustrations for the welcome screen's feature cards: the same pink Fuzzy doing each
 * thing — painting, decorating with stickers, sharing from a phone, and hopping in the game.
 * Drawn as SVG (no image files); parts are named so CSS can animate them on hover.
 */
import { fuzzySvg } from './dom';

export type Feature = 'design' | 'templates' | 'share' | 'play' | 'land';

const PINK: [string, string] = ['#ff8fbf', '#c8326e'];

/** The Fuzzy itself, placed inside a 100×100 art board. */
function fuzzy(x: number, y: number, size: number, face: 'open' | 'wink' | 'giggle', id: string, colors = PINK): string {
  return fuzzySvg(colors, face, id).replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">',
    `<svg class="fa-fuzzy" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 100 100" overflow="visible">`);
}

const sparkle = (x: number, y: number, r: number, color = '#ffd43b', cls = 'fa-spark') =>
  `<path class="${cls}" style="transform-origin:${x}px ${y}px" d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${color}"/>`;

const ART: Record<Feature, (id: string) => string> = {
  // painting a rainbow stroke with a big brush
  design: (id) => `
    <path class="fa-stroke" d="M12 78 C 28 60, 46 86, 66 66" stroke="#ffd43b" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path class="fa-stroke" d="M12 86 C 28 68, 46 94, 66 74" stroke="#4dabf7" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/>
    ${fuzzy(30, 14, 56, 'open', id)}
    <g class="fa-tool" style="transform-origin:70px 40px">
      <rect x="66" y="12" width="7" height="34" rx="3" fill="#b07745" transform="rotate(28 70 30)"/>
      <rect x="64.5" y="40" width="10" height="7" rx="1.5" fill="#ced4da" transform="rotate(28 70 30)"/>
      <path d="M63 47 h12 q-1 12 -6 14 q-5 -2 -6 -14z" fill="#d6336c" transform="rotate(28 70 30)"/>
    </g>
    ${sparkle(18, 22, 6)}${sparkle(88, 70, 4, '#ff8fbf')}`,
  // surrounded by template cards and sparkly stickers
  templates: (id) => `
    <g class="fa-card1" style="transform-origin:24px 50px"><rect x="8" y="30" width="30" height="40" rx="6" fill="#fff" stroke="#f1d9e3" stroke-width="2" transform="rotate(-12 23 50)"/>
      <rect x="13" y="38" width="20" height="10" rx="3" fill="#ffd8e6" transform="rotate(-12 23 50)"/><rect x="13" y="52" width="14" height="3" rx="1.5" fill="#e9ecef" transform="rotate(-12 23 50)"/></g>
    <g class="fa-card2" style="transform-origin:76px 50px"><rect x="62" y="28" width="30" height="40" rx="6" fill="#fff" stroke="#f1d9e3" stroke-width="2" transform="rotate(12 77 48)"/>
      <circle cx="77" cy="42" r="6" fill="#ffd43b" transform="rotate(12 77 48)"/><rect x="68" y="54" width="18" height="3" rx="1.5" fill="#e9ecef" transform="rotate(12 77 48)"/></g>
    ${fuzzy(24, 24, 54, 'wink', id)}
    <g class="fa-sticker" style="transform-origin:72px 22px"><circle cx="72" cy="22" r="10" fill="#fff" stroke="#ffd8e6" stroke-width="2"/>${sparkle(72, 22, 7, '#d6336c', 'fa-none')}</g>
    ${sparkle(20, 18, 5)}${sparkle(86, 84, 5, '#4dabf7')}`,
  // sending a design from a phone: hearts fly out
  share: (id) => `
    ${fuzzy(10, 22, 56, 'open', id)}
    <g class="fa-tool" style="transform-origin:72px 56px">
      <rect x="58" y="30" width="30" height="50" rx="7" fill="#18171c"/>
      <rect x="61.5" y="35" width="23" height="36" rx="3" fill="#fff"/>
      <rect x="64" y="38" width="18" height="14" rx="2" fill="#ffd8e6"/>
      <circle cx="73" cy="45" r="4" fill="#d6336c"/>
      <rect x="64" y="56" width="14" height="3" rx="1.5" fill="#e9ecef"/><rect x="64" y="62" width="10" height="3" rx="1.5" fill="#e9ecef"/>
    </g>
    <path class="fa-heart h1" d="M78 22 c-3 -5 -10 -3 -9 2 c1 4 9 9 9 9 s8 -5 9 -9 c1 -5 -6 -7 -9 -2z" fill="#ff6b9a"/>
    <path class="fa-heart h2" d="M90 34 c-2 -3 -6 -2 -6 1 c0 3 6 6 6 6 s5 -3 6 -6 c0 -3 -4 -4 -6 -1z" fill="#ffa8c5"/>
    ${sparkle(14, 20, 5)}`,
  // mid-hop over a little road with a coin
  play: (id) => `
    <rect x="6" y="80" width="88" height="12" rx="6" fill="#495057"/>
    <rect x="16" y="85" width="12" height="2.5" rx="1.25" fill="#fff"/><rect x="44" y="85" width="12" height="2.5" rx="1.25" fill="#fff"/><rect x="72" y="85" width="12" height="2.5" rx="1.25" fill="#fff"/>
    <ellipse class="fa-shadow" cx="44" cy="80" rx="16" ry="3.5" fill="#000" opacity=".25"/>
    <g class="fa-hop">${fuzzy(18, 14, 54, 'giggle', id)}</g>
    <path d="M14 52 h10 M10 60 h12 M16 44 h8" stroke="#ffb3d1" stroke-width="3" stroke-linecap="round" class="fa-lines"/>
    <g class="fa-coin" style="transform-origin:80px 40px"><circle cx="80" cy="40" r="11" fill="#ffd43b" stroke="#e0a100" stroke-width="2.5"/>${sparkle(80, 40, 5.5, '#fff6cf', 'fa-none')}</g>
    ${sparkle(90, 18, 5)}`,
  // waving in front of a tiny house
  land: (id) => `
    <rect x="52" y="36" width="36" height="34" rx="4" fill="#fff4e6"/>
    <path d="M46 40 L70 20 L94 40z" fill="#d6336c"/>
    <rect x="64" y="50" width="12" height="20" rx="6" fill="#8a5a34"/>
    <rect x="56" y="44" width="7" height="7" rx="1.5" fill="#9fd4ff"/>
    <rect x="6" y="70" width="88" height="14" rx="7" fill="#69db7c"/>
    ${fuzzy(6, 26, 50, 'wink', id)}
    ${sparkle(30, 18, 5)}`,
};

/** A square illustration for a feature card. */
export function featureArt(kind: Feature): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = `fa fa-${kind}`;
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<svg viewBox="0 0 100 100" overflow="visible">${ART[kind]('fa' + kind + Math.random().toString(36).slice(2, 6))}</svg>`;
  return wrap;
}
