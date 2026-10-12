/**
 * Fuzzies Land's own icon set (see ART.md): chunky "sticker" icons — a filled shape, a slightly darker
 * outline and a soft white highlight. Drawn as inline SVG so nothing extra ships.
 */
export type LandIcon =
  | 'coin' | 'star' | 'pop' | 'hammer' | 'crate' | 'barn' | 'sparkles' | 'music' | 'musicOff'
  | 'zoomIn' | 'zoomOut' | 'back' | 'house' | 'wheat' | 'workshop' | 'flower' | 'clock' | 'lock'
  | 'basket' | 'build' | 'parcel' | 'barnBig' | 'portal' | 'chevDown' | 'chevUp' | 'chevRight' | 'chevLeft' | 'rotate' | 'trash' | 'select' | 'edit' | 'box' | 'boxIn' | 'festival' | 'token';

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
  // ---- the dock's big illustrated icons (white sticker outline so they pop on coloured buttons) ----
  basket: `<g stroke="#fff" stroke-width="3.2" stroke-linejoin="round"><path d="M5 15h22l-2.4 11.2a2 2 0 0 1-2 1.6H9.4a2 2 0 0 1-2-1.6z" fill="#c98b55"/><circle cx="11" cy="12" r="4" fill="#ff6b6b"/><circle cx="17.5" cy="10.5" r="4.2" fill="#ffd43b"/><circle cx="22" cy="13" r="3.4" fill="#7ad36b"/></g>
    <path d="M5 15h22l-2.4 11.2a2 2 0 0 1-2 1.6H9.4a2 2 0 0 1-2-1.6z" fill="#c98b55" stroke="#8a5a30" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M8.5 19.5h15M9.3 23.5h13.4" stroke="#8a5a30" stroke-width="1.6" stroke-linecap="round"/><path d="M13 15v12M19 15v12" stroke="#a8713f" stroke-width="1.4"/>
    <circle cx="11" cy="12" r="4" fill="#ff6b6b"/><circle cx="17.5" cy="10.5" r="4.2" fill="#ffd43b"/><circle cx="22" cy="13" r="3.4" fill="#7ad36b"/>
    <ellipse cx="16.3" cy="9" rx="1.4" ry=".9" fill="#fff" opacity=".7"/><ellipse cx="9.8" cy="10.6" rx="1.2" ry=".8" fill="#fff" opacity=".6"/>
    <path d="M26.5 4l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill="#fff"/>`,
  build: `<g stroke="#fff" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"><path d="M3 16L12.5 7.5 22 16v11H3z" fill="#fff4e3"/><g transform="rotate(42 23.5 21)"><rect x="22.1" y="17" width="2.8" height="12" rx="1.4"/><rect x="18.5" y="13.6" width="10" height="4.8" rx="1.6"/></g></g>
    <path d="M5 15.5V27h15V15.5L12.5 8.7z" fill="#fff4e3" stroke="#c9a77e" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M2.5 16.5L12.5 7.5l10 9" fill="none" stroke="#e45a78" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="9.7" y="19.5" width="5.2" height="7.5" rx="2.6" fill="#c98b55"/>
    <g transform="rotate(42 23.5 21)"><rect x="22.1" y="17" width="2.8" height="12" rx="1.4" fill="#d9a066" stroke="#8a5a30" stroke-width="1.2"/>
    <rect x="18.5" y="13.6" width="10" height="4.8" rx="1.6" fill="#a3aec2" stroke="#58627a" stroke-width="1.3"/><rect x="19.5" y="14.4" width="5" height="1.3" rx=".6" fill="#fff" opacity=".6"/></g>`,
  parcel: `<g stroke="#fff" stroke-width="3.4" stroke-linejoin="round"><rect x="4.5" y="10" width="23" height="17" rx="3" fill="#e2b77f"/><path d="M3.5 10.5h25v-3a2 2 0 0 0-2-2h-21a2 2 0 0 0-2 2z" fill="#edc791"/></g>
    <rect x="4.5" y="10" width="23" height="17" rx="3" fill="#e2b77f" stroke="#a87a45" stroke-width="1.5"/>
    <path d="M3.5 10.5h25v-3a2 2 0 0 0-2-2h-21a2 2 0 0 0-2 2z" fill="#edc791" stroke="#a87a45" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M16 5.5V27" stroke="#e45a78" stroke-width="3.2"/><path d="M16 5.5c-3-4-7.5-3-6.5-.3.8 2 4.6 1.3 6.5.3zM16 5.5c3-4 7.5-3 6.5-.3-.8 2-4.6 1.3-6.5.3z" fill="#e45a78" stroke="#b8325a" stroke-width="1.2"/>
    <rect x="19.5" y="17" width="5.5" height="5" rx="1" fill="#fffaf2" stroke="#a87a45" stroke-width="1"/><path d="M20.6 19h3.2M20.6 20.6h2" stroke="#a87a45" stroke-width=".9"/>`,
  barnBig: `<g stroke="#fff" stroke-width="3.4" stroke-linejoin="round"><path d="M3.5 14.5L16 4.5l12.5 10V28h-25z" fill="#f2785c"/></g>
    <path d="M3.5 14.5L16 4.5l12.5 10V28h-25z" fill="#f2785c" stroke="#b84f36" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M3 15L16 4.5 29 15" fill="none" stroke="#fff4e3" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="10" y="16" width="12" height="12" fill="#fff4e3" stroke="#b84f36" stroke-width="1.4"/><path d="M10 16l12 12M22 16L10 28" stroke="#f2785c" stroke-width="2"/>
    <rect x="13.6" y="9" width="4.8" height="4" rx="1" fill="#fff4e3" stroke="#b84f36" stroke-width="1"/><path d="M15 6.5c1-1.2 3-1.2 2 .5" fill="#ffd43b"/>`,
  // Town Edit Mode: a pencil over a little house; a storage crate; a crate with an arrow dropping in
  edit: `<path d="M5 15.5v11h12v-11L11 10z" fill="#fff4e3" stroke="#c9a77e" ${O}/><path d="M3.5 16.5L11 9.5l7.5 7" fill="none" stroke="#e0527f" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="8.8" y="20" width="4.4" height="6.5" rx="2.2" fill="#c98b55"/>
    <g transform="rotate(45 22 14)"><rect x="19.6" y="3" width="4.8" height="17" rx="1.4" fill="#ffc94a" stroke="#d1900f" ${O}/><path d="M19.6 20l2.4 5 2.4-5z" fill="#f4d9b5" stroke="#d1900f" ${O}/><path d="M21.2 22.5l.8 1.6.8-1.6z" fill="#3d2f2a"/><rect x="19.6" y="3" width="4.8" height="3.2" rx="1.2" fill="#ff9fc8" stroke="#d6336c" stroke-width="1.6"/></g>`,
  box: `<path d="M4.5 12.5h23V26a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2z" fill="#c98b55" stroke="#8a5a30" ${O}/>
    <path d="M3 8.5h26v4.5H3z" fill="#e2b77f" stroke="#8a5a30" ${O}/>
    <path d="M13 16.5h6" stroke="#8a5a30" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="10.5" cy="7.5" r="3.2" fill="#ff9fc8" stroke="#d6336c" stroke-width="1.6"/><circle cx="17" cy="6" r="3.6" fill="#7fc8f0" stroke="#3a8fc0" stroke-width="1.6"/><circle cx="23" cy="7.5" r="3" fill="#7ad36b" stroke="#58a14a" stroke-width="1.6"/>
    <ellipse cx="9" cy="22" rx="2.2" ry="1.2" ${HL}/>`,
  boxIn: `<path d="M4.5 15.5h23V26a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2z" fill="#c98b55" stroke="#8a5a30" ${O}/>
    <path d="M3 11.5h26v4.5H3z" fill="#e2b77f" stroke="#8a5a30" ${O}/>
    <path d="M13 19.5h6" stroke="#8a5a30" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M16 2.5v9M12 8l4 4 4-4" fill="none" stroke="#e0527f" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  // seasonal events: a string of bunting with a star; an event token (a round ticket)
  festival: `<path d="M3 7q13 6 26 0" fill="none" stroke="#8a5a30" stroke-width="2" stroke-linecap="round"/>
    <path d="M5 7.5l2.6 6 2.8-5.6zM11 9.4l2.4 6.2 3-5.8zM17.5 9.8l2.6 5.8 2.8-6zM23.6 8.4l2.4 5.6 2.6-6.4z" fill="#e45a78" stroke="#a8325a" ${O}/>
    <path d="M11 9.4l2.4 6.2 3-5.8z" fill="#ffc94a" stroke="#d1900f" ${O}/><path d="M17.5 9.8l2.6 5.8 2.8-6z" fill="#33ab9b" stroke="#1f7d71" ${O}/>
    <path d="M16 15.5l2.2 4.6 5 .7-3.6 3.5.9 5L16 26.9l-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="#ffc94a" stroke="#d1900f" ${O}/>
    <path d="M16 19l1.4 2.9 3.2.5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`,
  token: `<circle cx="16" cy="16.5" r="11.5" fill="#c8326e" stroke="#8f1f4c" ${O}/><circle cx="16" cy="15.5" r="11" fill="#ff6b9a"/>
    <circle cx="16" cy="15.5" r="7.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="2.4 2"/>
    <path d="M16 10.3l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z" fill="#fff"/>
    <circle cx="16" cy="16.5" r="11.5" fill="none" stroke="#8f1f4c" stroke-width="2"/><ellipse cx="11" cy="9.5" rx="3" ry="1.6" ${HL} transform="rotate(-35 11 9.5)"/>`,
  select: `<rect x="4.5" y="5.5" width="17" height="15" rx="3.5" fill="#fff4e3" stroke="#c9a77e" stroke-dasharray="3.2 2.6" ${O}/>
    <rect x="8" y="9" width="5" height="4.5" rx="1.2" fill="#7ad36b" stroke="#58a14a" ${O}/><rect x="14" y="12.5" width="4.5" height="4" rx="1.2" fill="#ff9fc8" stroke="#c8326e" ${O}/>
    <path d="M18.5 17l9 3.5-4 1.6 3.4 4.2-2.2 1.7-3.4-4.2-2.2 3.7z" fill="#fff" stroke="#3d2f2a" ${O}/>`,
  portal: `<path d="M6 28V14a10 10 0 0 1 20 0v14" fill="none" stroke="#58a14a" stroke-width="5" stroke-linecap="round"/>
    <path d="M6 28V14a10 10 0 0 1 20 0v14" fill="none" stroke="#7ad36b" stroke-width="3" stroke-linecap="round"/>
    <circle cx="9" cy="10" r="1.6" fill="#ff9fc8"/><circle cx="16" cy="5.2" r="1.6" fill="#ffd43b"/><circle cx="23" cy="10" r="1.6" fill="#fff"/>
    <path d="M9 28V15a7 7 0 0 1 14 0v13z" fill="#ffd6ea"/>
    <circle cx="16" cy="21" r="5.6" fill="#ff86bb" stroke="#d6336c" stroke-width="1.4"/>
    <circle cx="14" cy="20.2" r="1.3" fill="#fff"/><circle cx="18" cy="20.2" r="1.3" fill="#fff"/><circle cx="14.2" cy="20.5" r=".7" fill="#18171c"/><circle cx="18.2" cy="20.5" r=".7" fill="#18171c"/>
    <path d="M14.6 23q1.4 1.2 2.8 0" fill="none" stroke="#18171c" stroke-width=".9" stroke-linecap="round"/>`,
  chevDown: `<path d="M9 12l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  chevUp: `<path d="M9 20l7-7 7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  chevRight: `<path d="M12 9l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  chevLeft: `<path d="M20 9l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  rotate: `<path d="M24 12a9 9 0 1 0 1.5 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M25.5 5.5v7h-7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  trash: `<path d="M7 10h18M13 10V7h6v3M9 10l1.2 15a2 2 0 0 0 2 1.8h7.6a2 2 0 0 0 2-1.8L23 10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
};

/** One of Fuzzies Land's sticker icons as an inline SVG element. */
export function landIcon(name: LandIcon, size = 24): SVGSVGElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg class="li li-${name}" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${ART[name]}</svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}
