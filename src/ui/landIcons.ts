/**
 * Fuzzies Land's own icon set (see ART.md): chunky "sticker" icons — a filled shape, a slightly darker
 * outline and a soft white highlight. Drawn as inline SVG so nothing extra ships.
 */
export type LandIcon =
  | 'coin' | 'star' | 'pop' | 'hammer' | 'crate' | 'barn' | 'sparkles' | 'music' | 'musicOff' | 'gate'
  | 'zoomIn' | 'zoomOut' | 'back' | 'house' | 'wheat' | 'workshop' | 'flower' | 'clock' | 'lock';

const O = 'stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
const HL = 'fill="#fff" opacity=".55"';

const ART: Record<LandIcon, string> = {
  coin: `<circle cx="16" cy="16.5" r="11.5" fill="#e9a91f" stroke="#b9780c" ${O}/><circle cx="16" cy="15.5" r="11" fill="#ffc94a"/>
    <circle cx="16" cy="15.5" r="7.2" fill="none" stroke="#e9a91f" stroke-width="2"/>
    <path d="M16 11.5v8M13.6 13.2h3.6a1.6 1.6 0 0 1 0 3.2h-2.4a1.6 1.6 0 0 0 0 3.2h3.6" fill="none" stroke="#b9780c" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="16" cy="16.5" r="11.5" fill="none" stroke="#b9780c" stroke-width="2"/><ellipse cx="11" cy="9.5" rx="3.2" ry="1.8" ${HL} transform="rotate(-35 11 9.5)"/>`,
  star: `<path d="M16 3.5l3.7 7.6 8.3 1.2-6 5.9 1.4 8.3L16 22.6l-7.4 3.9 1.4-8.3-6-5.9 8.3-1.2z" fill="#ffc94a" stroke="#d1900f" ${O}/>
    <path d="M16 7.5l2.4 5 5.4.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>`,
  pop: `<path d="M5 15.5L16 6l11 9.5" fill="#e0527f" stroke="#a8325a" ${O}/><path d="M8 14v12h16V14L16 7.5z" fill="#fff4e3" stroke="#c9a77e" ${O}/>
    <path d="M4.5 15.8L16 5.8l11.5 10" fill="none" stroke="#a8325a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M16 23.5s-4.2-2.6-4.2-5.2a2.2 2.2 0 0 1 4.2-1 2.2 2.2 0 0 1 4.2 1c0 2.6-4.2 5.2-4.2 5.2z" fill="#e0527f"/>`,
  hammer: `<path d="M14.5 13.5l-8.8 8.8a2.3 2.3 0 0 0 3.3 3.3l8.8-8.8z" fill="#c98b55" stroke="#8a5a30" ${O}/>
    <path d="M12.5 8.5l5-5 4 1.5 6.5 6.5-3.5 3.5-3-3-3.5 3.5-5-5z" fill="#8f9bb0" stroke="#58627a" ${O}/>
    <path d="M17.5 5l3 1" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>`,
  crate: `<rect x="5" y="7" width="22" height="20" rx="3.5" fill="#c98b55" stroke="#8a5a30" ${O}/>
    <rect x="8.5" y="4.5" width="15" height="6" rx="2" fill="#fff4e3" stroke="#c9a77e" ${O}/>
    <path d="M10 15h12M10 19.5h12M10 24h7" stroke="#8a5a30" stroke-width="2" stroke-linecap="round"/>
    <circle cx="23.5" cy="23.5" r="4.6" fill="#33ab9b" stroke="#1f7d71" ${O}/><path d="M21.6 23.6l1.4 1.4 2.6-2.8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  barn: `<path d="M4 14.5L16 5l12 9.5V27H4z" fill="#e0527f" stroke="#a8325a" ${O}/>
    <path d="M3.5 15L16 5l12.5 10" fill="none" stroke="#fff4e3" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="10.5" y="16" width="11" height="11" fill="#fff4e3" stroke="#a8325a" ${O}/><path d="M10.5 16l11 11M21.5 16l-11 11" stroke="#e0527f" stroke-width="2"/>
    <circle cx="16" cy="11.5" r="1.8" fill="#fff4e3"/>`,
  sparkles: `<path d="M13 4l2.2 6.3L21.5 12.5l-6.3 2.2L13 21l-2.2-6.3L4.5 12.5l6.3-2.2z" fill="#ffc94a" stroke="#d1900f" ${O}/>
    <path d="M23.5 17l1.2 3.3 3.3 1.2-3.3 1.2-1.2 3.3-1.2-3.3-3.3-1.2 3.3-1.2z" fill="#ff9fc8" stroke="#d6336c" ${O}/>
    <circle cx="24" cy="7.5" r="2" fill="#ff9fc8" stroke="#d6336c" stroke-width="1.6"/>`,
  music: `<path d="M12 22V8.5l13-3V19" fill="none" stroke="#a8325a" stroke-width="2.6" stroke-linejoin="round"/>
    <ellipse cx="9" cy="22.5" rx="4.2" ry="3.4" fill="#e0527f" stroke="#a8325a" ${O}/><ellipse cx="22" cy="19.5" rx="4.2" ry="3.4" fill="#e0527f" stroke="#a8325a" ${O}/>
    <path d="M12 12l13-3" stroke="#a8325a" stroke-width="2.6"/><ellipse cx="7.8" cy="21.3" rx="1.4" ry=".9" ${HL}/>`,
  musicOff: `<path d="M12 22V8.5l13-3V19" fill="none" stroke="#9a9590" stroke-width="2.6" stroke-linejoin="round"/>
    <ellipse cx="9" cy="22.5" rx="4.2" ry="3.4" fill="#c9c3bb" stroke="#9a9590" ${O}/><ellipse cx="22" cy="19.5" rx="4.2" ry="3.4" fill="#c9c3bb" stroke="#9a9590" ${O}/>
    <path d="M5 5l22 22" stroke="#d6336c" stroke-width="3" stroke-linecap="round"/>`,
  gate: `<ellipse cx="16" cy="18" rx="11" ry="9" fill="#6cc35a" stroke="#3f8f3a" ${O}/>
    <circle cx="10.5" cy="10.5" r="4.3" fill="#6cc35a" stroke="#3f8f3a" ${O}/><circle cx="21.5" cy="10.5" r="4.3" fill="#6cc35a" stroke="#3f8f3a" ${O}/>
    <circle cx="10.5" cy="10.5" r="2.2" fill="#fff"/><circle cx="21.5" cy="10.5" r="2.2" fill="#fff"/><circle cx="11" cy="10.8" r="1.2" fill="#18171c"/><circle cx="22" cy="10.8" r="1.2" fill="#18171c"/>
    <path d="M11 19.5q5 4 10 0" fill="none" stroke="#2b6b2a" stroke-width="2" stroke-linecap="round"/><circle cx="8.5" cy="18" r="1.6" fill="#ff9fc8"/><circle cx="23.5" cy="18" r="1.6" fill="#ff9fc8"/>`,
  zoomIn: `<path d="M16 7v18M7 16h18" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`,
  zoomOut: `<path d="M7 16h18" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`,
  back: `<path d="M19 7l-9 9 9 9" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  house: `<path d="M7 14v12h18V14L16 6.5z" fill="#fff4e3" stroke="#c9a77e" ${O}/><path d="M4.5 15.5L16 5.5l11.5 10" fill="none" stroke="#e0527f" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="13" y="18" width="6" height="8" rx="3" fill="#c98b55" stroke="#8a5a30" stroke-width="1.6"/><rect x="20" y="15.5" width="3" height="3" rx=".8" fill="#7fc8f0"/>`,
  wheat: `<path d="M16 28V9" stroke="#b9780c" stroke-width="2.2" stroke-linecap="round"/>
    ${[9, 14, 19].map((y) => `<ellipse cx="12.5" cy="${y + 1}" rx="2.4" ry="3.8" fill="#ffc94a" stroke="#d1900f" stroke-width="1.5" transform="rotate(-35 12.5 ${y + 1})"/><ellipse cx="19.5" cy="${y + 1}" rx="2.4" ry="3.8" fill="#ffc94a" stroke="#d1900f" stroke-width="1.5" transform="rotate(35 19.5 ${y + 1})"/>`).join('')}
    <ellipse cx="16" cy="6" rx="2.2" ry="3.4" fill="#ffc94a" stroke="#d1900f" stroke-width="1.5"/>`,
  workshop: `<path d="M4 27V14l6 4v-4l6 4v-4l6 4V7h6v20z" fill="#33ab9b" stroke="#1f7d71" ${O}/>
    <rect x="8" y="20" width="4" height="4" rx="1" fill="#fff4e3"/><rect x="15" y="20" width="4" height="4" rx="1" fill="#fff4e3"/>
    <circle cx="25" cy="4.5" r="2" fill="#fff" opacity=".8"/>`,
  flower: `${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="16" cy="9.5" rx="4" ry="5" fill="#ff9fc8" stroke="#d6336c" stroke-width="1.6" transform="rotate(${a} 16 15)"/>`).join('')}
    <circle cx="16" cy="15" r="3.6" fill="#ffc94a" stroke="#d1900f" stroke-width="1.6"/><path d="M16 21v8" stroke="#3f8f3a" stroke-width="2.4" stroke-linecap="round"/>`,
  clock: `<circle cx="16" cy="16" r="11" fill="#fff4e3" stroke="#c9a77e" ${O}/><path d="M16 9.5V16l4 2.5" fill="none" stroke="#a8325a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  lock: `<path d="M10.5 14v-3.5a5.5 5.5 0 0 1 11 0V14" fill="none" stroke="#9a9590" stroke-width="3"/>
    <rect x="7" y="13.5" width="18" height="14" rx="4" fill="#c9c3bb" stroke="#9a9590" ${O}/><circle cx="16" cy="20" r="2.2" fill="#7d7872"/>`,
};

/** One of Fuzzies Land's sticker icons as an inline SVG element. */
export function landIcon(name: LandIcon, size = 24): SVGSVGElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg class="li li-${name}" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${ART[name]}</svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}
