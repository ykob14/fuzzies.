/**
 * Fuzzy Crossing's own picture icons: chunky, filled, rounded — drawn to sit on a raspberry tile (`.fzx-ic`) or to stand alone.
 * No emoji anywhere in the game screens (emoji look different on every phone and read as a prototype).
 * Glyphs are white (`currentColor`); little cut-outs use the tile colour (`var(--tile)`), so they work on any tile.
 */
const NS = 'http://www.w3.org/2000/svg';

function fuzzBall(cx: number, cy: number, r: number, spikes = 16): string {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.86 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="currentColor" stroke-linejoin="round" stroke="currentColor" stroke-width="1.6"/>`;
}
function star(cx: number, cy: number, r: number, fill = 'var(--tile, #d6336c)'): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="1.2" stroke-linejoin="round"/>`;
}
const CUT = 'var(--tile, #d6336c)';

const G: Record<string, string> = {
  /** a Fuzzy face */
  fuzzy: `${fuzzBall(16, 16.5, 12.5)}<circle cx="12" cy="15" r="2.1" fill="${CUT}"/><circle cx="20" cy="15" r="2.1" fill="${CUT}"/><path d="M12.6 20.2q3.4 3 6.8 0" stroke="${CUT}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`,
  /** ticket with a star */
  pass: `<path d="M3.5 10.5a2.5 2.5 0 0 1 2.5-2.5h20a2.5 2.5 0 0 1 2.5 2.5v3a3 3 0 0 0 0 6v3a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5v-3a3 3 0 0 0 0-6z" fill="currentColor"/>${star(16, 16, 6.2)}`,
  /** clipboard with a tick */
  missions: `<rect x="6" y="6" width="20" height="23" rx="4" fill="currentColor"/><rect x="11" y="3" width="10" height="6" rx="2.4" fill="currentColor" stroke="${CUT}" stroke-width="1.6"/><path d="M11 18.2l3.6 3.6L21.5 14" stroke="${CUT}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  /** shopping bag with a smile */
  shop: `<path d="M5.5 11.5h21l-1.7 15.2a2.5 2.5 0 0 1-2.5 2.3H9.7a2.5 2.5 0 0 1-2.5-2.3z" fill="currentColor"/><path d="M11 12.5V10a5 5 0 0 1 10 0v2.5" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="12.6" cy="18" r="1.5" fill="${CUT}"/><circle cx="19.4" cy="18" r="1.5" fill="${CUT}"/><path d="M12.4 21.6q3.6 3 7.2 0" stroke="${CUT}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`,
  /** trophy */
  trophy: `<path d="M9 4.5h14v8a7 7 0 0 1-14 0z" fill="currentColor"/><path d="M9 7H5.5v2a4.5 4.5 0 0 0 4 4.4M23 7h3.5v2a4.5 4.5 0 0 1-4 4.4" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="14" y="18.5" width="4" height="5" fill="currentColor"/><rect x="9.5" y="23" width="13" height="4.5" rx="2" fill="currentColor"/>${star(16, 11.2, 3.6)}`,
  /** globe */
  worlds: `<circle cx="16" cy="16" r="12.5" fill="currentColor"/><path d="M8 11.5c2.5-2.6 5.2-1.4 6.2.8 1 2.3-.8 3.3-2.7 3.9-2 .6-2.2 2.4-.9 3.6" fill="${CUT}"/><path d="M19 8.5c2 .4 4.6 1.8 5 4.4.3 2-1.4 2.6-2.6 2.2-1.8-.6-1.8-2.2-3-3.2-1-.8-1.2-2.8.6-3.4z" fill="${CUT}"/><path d="M17.5 21c1.8-.8 4.2-.2 4.6 1.8.3 1.6-1.2 3-3 2.6-1.8-.4-3-3-1.6-4.4z" fill="${CUT}"/>`,
  /** infinity loop */
  endless: `<path d="M16 16c-2.6-4.6-9.5-5.6-9.5 0s6.9 4.6 9.5 0 9.5-4.6 9.5 0-6.9 5.6-9.5 0z" stroke="currentColor" stroke-width="4.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  /** gift box */
  events: `<rect x="5" y="12.5" width="22" height="15" rx="2.6" fill="currentColor"/><rect x="3.5" y="9" width="25" height="6.2" rx="2.4" fill="currentColor" stroke="${CUT}" stroke-width="1.4"/><rect x="14" y="9" width="4" height="18.6" fill="${CUT}"/><path d="M16 9C12 9 9 7.5 9.6 5.4 10.4 3 14.4 4.6 16 9zM16 9c4 0 7-1.5 6.4-3.6C21.6 3 17.6 4.6 16 9z" fill="currentColor"/>`,
  /** play triangle */
  play: `<path d="M11 7.2v17.6a1 1 0 0 0 1.5.85l14-8.8a1 1 0 0 0 0-1.7l-14-8.8A1 1 0 0 0 11 7.2z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
  plus: `<path d="M16 8v16M8 16h16" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/>`,
  /** question mark in a disc */
  help: `<circle cx="16" cy="16" r="12.5" fill="currentColor"/><path d="M12.4 12.8c.2-2.2 1.8-3.4 3.8-3.4 2.1 0 3.7 1.2 3.7 3.1 0 2.8-3.6 2.8-3.6 5.4" stroke="${CUT}" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="16.2" cy="22.6" r="1.7" fill="${CUT}"/>`,
  /** cog */
  gear: `<path d="M13.4 3.5h5.2l.7 3.2 2 .9 2.8-1.8 3.7 3.7-1.8 2.8.9 2 3.2.7v5.2l-3.2.7-.9 2 1.8 2.8-3.7 3.7-2.8-1.8-2 .9-.7 3.2h-5.2l-.7-3.2-2-.9-2.8 1.8-3.7-3.7 1.8-2.8-.9-2-3.2-.7v-5.2l3.2-.7.9-2-1.8-2.8 3.7-3.7 2.8 1.8 2-.9z" fill="currentColor" transform="translate(2 2) scale(.875)"/><circle cx="16" cy="16" r="4.4" fill="${CUT}"/>`,
  /** a rounded home / town */
  town: `<path d="M16 4.5 3.8 15.2a1 1 0 0 0 .7 1.7H7V26a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9.1h2.5a1 1 0 0 0 .7-1.7z" fill="currentColor"/><rect x="13" y="19" width="6" height="9" rx="1.6" fill="${CUT}"/>`,
  /** lock */
  lock: `<rect x="6.5" y="14" width="19" height="14" rx="3.6" fill="currentColor"/><path d="M10.5 14v-3.6a5.5 5.5 0 0 1 11 0V14" stroke="currentColor" stroke-width="3" fill="none"/><circle cx="16" cy="20.5" r="2.2" fill="${CUT}"/>`,
  /** a tick */
  check: `<path d="M7 16.8l6.2 6.2L25.5 10" stroke="currentColor" stroke-width="4.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  star: star(16, 16.6, 13, 'currentColor'),
  /** treasure chest (the daily bonus) */
  chest: `<path d="M4.5 14.5a11.5 11.5 0 0 1 23 0z" fill="currentColor"/><rect x="4.5" y="14" width="23" height="13" rx="2.4" fill="currentColor" stroke="${CUT}" stroke-width="1.4"/><rect x="13.4" y="12.5" width="5.2" height="7.4" rx="1.6" fill="${CUT}"/><circle cx="16" cy="16.2" r="1.4" fill="currentColor"/>`,
  /** medal on a ribbon */
  medal: `<path d="M9.5 3.5h5l2 7.6-3 .8zM22.5 3.5h-5l-2 7.6 3 .8z" fill="currentColor" opacity=".75"/><circle cx="16" cy="19.5" r="8.8" fill="currentColor"/><circle cx="16" cy="19.5" r="5.8" fill="none" stroke="${CUT}" stroke-width="1.6"/>${star(16, 19.6, 3.7)}`,
  /** road lanes (crossing) */
  road: `<path d="M10.5 3.5h11l5 25h-21z" fill="currentColor"/><path d="M16 6.5v4M16 14v5M16 22.5v4" stroke="${CUT}" stroke-width="2.4" stroke-linecap="round"/>`,
  /** coin */
  coin: `<circle cx="16" cy="16" r="12.5" fill="currentColor"/><circle cx="16" cy="16" r="8.4" fill="none" stroke="${CUT}" stroke-width="2"/>${star(16, 16.4, 4.4)}`,
  /** hop (paw) */
  hop: `<ellipse cx="16" cy="21" rx="7" ry="5.6" fill="currentColor"/><circle cx="8.6" cy="14.2" r="2.8" fill="currentColor"/><circle cx="13.2" cy="9.6" r="2.8" fill="currentColor"/><circle cx="19.2" cy="9.6" r="2.8" fill="currentColor"/><circle cx="23.8" cy="14.2" r="2.8" fill="currentColor"/>`,
  /** a nest */
  nest: `<ellipse cx="16" cy="19.5" rx="12" ry="7.5" fill="currentColor"/><ellipse cx="16" cy="17" rx="7.6" ry="3.8" fill="${CUT}"/><ellipse cx="12.6" cy="15" rx="2.6" ry="3.4" fill="currentColor"/><ellipse cx="19.4" cy="15" rx="2.6" ry="3.4" fill="currentColor"/>`,
  /** flag */
  flag: `<rect x="7" y="4" width="3.2" height="24" rx="1.6" fill="currentColor"/><path d="M10 5.5h15l-3.8 5.2 3.8 5.2H10z" fill="currentColor"/>`,
  /** gamepad */
  runs: `<path d="M9.5 9h13a6 6 0 0 1 5.9 5l1.2 7.4a3.2 3.2 0 0 1-5.6 2.5L21 20.5h-10L8 23.9a3.2 3.2 0 0 1-5.6-2.5L3.6 14a6 6 0 0 1 5.9-5z" fill="currentColor"/><path d="M10 12.8v5M7.5 15.3h5" stroke="${CUT}" stroke-width="2.2" stroke-linecap="round"/><circle cx="21" cy="14" r="1.5" fill="${CUT}"/><circle cx="24" cy="16.6" r="1.5" fill="${CUT}"/>`,
  /** a single splash / crash */
  boom: `<path d="M16 3l3 7 7-3-3 7 7 3-7 3 3 7-7-3-3 7-3-7-7 3 3-7-7-3 7-3-3-7 7 3z" fill="currentColor" transform="scale(.9) translate(1.8 1.8)"/>`,
  /** train */
  train: `<rect x="7" y="5" width="18" height="18" rx="5" fill="currentColor"/><rect x="10" y="9" width="12" height="6.4" rx="2" fill="${CUT}"/><circle cx="12.5" cy="19" r="1.5" fill="${CUT}"/><circle cx="19.5" cy="19" r="1.5" fill="${CUT}"/><path d="M10 28l3-4.5M22 28l-3-4.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>`,
  /** crown (mythic etc.) */
  crown: `<path d="M4.5 22.5 3.4 9.6l7.2 5.6L16 6l5.4 9.2 7.2-5.6-1.1 12.9z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><rect x="5.5" y="24" width="21" height="3.4" rx="1.7" fill="currentColor"/>`,
};

export type GIcon = keyof typeof G;

/** a bare icon (white / currentColor); put it in `.fzx-ic` for the raspberry tile */
export function gicon(name: GIcon, size = 24): SVGSVGElement {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 32 32');
  s.setAttribute('width', String(size));
  s.setAttribute('height', String(size));
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'fzx-gi');
  s.innerHTML = G[name] ?? G.star;
  return s;
}

/** the raspberry tile with the icon on it — the standard "button picture" of the game screens */
export function gtile(name: GIcon, size = 44, cls = ''): HTMLElement {
  const t = document.createElement('span');
  t.className = `fzx-ic ${cls}`.trim();
  t.style.setProperty('--sz', `${size}px`);
  t.append(gicon(name, Math.round(size * 0.62)));
  return t;
}

/** which picture goes with a mission metric */
export const METRIC_ICON: Record<string, GIcon> = {
  hops: 'hop', rows: 'road', pickups: 'coin', gold: 'star', nests: 'nest', levels: 'flag', flawless: 'crown', runs: 'runs', score: 'trophy',
  deaths: 'boom', splashes: 'boom', crashes: 'boom', trains: 'train', distinct: 'fuzzy', endlessRows: 'endless', endlessRecord: 'endless',
};

/** the picture for each cosmetic slot (no emoji in the game screens) */
export const SLOT_ICON: Record<'trail' | 'jump' | 'celebration' | 'extra', GIcon> = { trail: 'star', jump: 'hop', celebration: 'crown', extra: 'fuzzy' };
