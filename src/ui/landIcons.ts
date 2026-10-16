/**
 * Fuzzies Land's own icon set (see ART.md): chunky "sticker" icons — a filled shape, a slightly darker
 * outline and a soft white highlight. Drawn as inline SVG so nothing extra ships.
 */
export type LandIcon =
  | 'coin' | 'star' | 'pop' | 'hammer' | 'crate' | 'barn' | 'sparkles' | 'music' | 'musicOff'
  | 'zoomIn' | 'zoomOut' | 'back' | 'house' | 'wheat' | 'workshop' | 'flower' | 'clock' | 'lock'
  | 'basket' | 'build' | 'parcel' | 'barnBig' | 'portal' | 'chevDown' | 'chevUp' | 'chevRight' | 'chevLeft' | 'rotate' | 'trash' | 'select' | 'edit' | 'box' | 'boxIn' | 'festival' | 'token' | 'boat' | 'compass' | 'car' | 'close' | 'check' | 'undo' | 'redo' | 'hand' | 'help' | 'upload' | 'eye' | 'orbit' | 'tiltUp' | 'tiltDown';

const O = 'stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
const HL = 'fill="#fff" opacity=".55"';

const ART: Record<LandIcon, string> = {
  car: `<path d="M6 19.5l2.2-6.2A3 3 0 0 1 11 11.3h10a3 3 0 0 1 2.8 2l2.2 6.2" fill="#ffd8e5" stroke="#a8325a" ${O}/>
    <rect x="3.5" y="18" width="25" height="7.5" rx="3.2" fill="#e0527f" stroke="#a8325a" ${O}/>
    <circle cx="9.5" cy="25.5" r="3" fill="#3d2f2a" stroke="#1d1612" ${O}/><circle cx="22.5" cy="25.5" r="3" fill="#3d2f2a" stroke="#1d1612" ${O}/>
    <circle cx="16" cy="12.6" r="4.4" fill="#ff86bb" stroke="#b8235f" stroke-width="1.6"/><circle cx="14.6" cy="12" r=".9" fill="#1d1612"/><circle cx="17.4" cy="12" r=".9" fill="#1d1612"/>
    <path d="M6 20.5h3M23 20.5h3" stroke="#fff3b0" stroke-width="2" stroke-linecap="round"/><ellipse cx="9" cy="19.6" rx="3" ry="1.1" ${HL}/>`,
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
  boat: `<path d="M5 20h22l-3 6H8z" fill="#e45a78" stroke="#a8325a" ${O}/><path d="M8 26h16l-1.5 2h-13z" fill="#ffffff" stroke="#a8325a" ${O}/>
    <path d="M16 4v16" stroke="#8a5a30" stroke-width="2.2" stroke-linecap="round"/><path d="M16 5l9 13H16z" fill="#ffc94a" stroke="#d1900f" ${O}/><path d="M15 7L8 18h7z" fill="#ffffff" stroke="#d1900f" ${O}/>
    <path d="M3 28q4-2 8 0t8 0 8 0" fill="none" stroke="#5aaee0" stroke-width="2.2" stroke-linecap="round"/>`,
  compass: `<circle cx="16" cy="16" r="12" fill="#fff6e0" stroke="#8a5a30" ${O}/><circle cx="16" cy="16" r="9" fill="#ffffff" stroke="#e8d9bf" stroke-width="1.5"/>
    <path d="M16 7l3 9-3 9-3-9z" fill="#e45a78" stroke="#a8325a" ${O}/><path d="M16 16l3-9-3 9z" fill="#ffffff"/><circle cx="16" cy="16" r="1.8" fill="#8a5a30"/>`,
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
  eye: `<path d="M2.5 16C6 9.5 11 7 16 7s10 2.5 13.5 9C26 22.5 21 25 16 25S6 22.5 2.5 16z" fill="currentColor" opacity=".18"/><path d="M2.5 16C6 9.5 11 7 16 7s10 2.5 13.5 9C26 22.5 21 25 16 25S6 22.5 2.5 16z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><circle cx="16" cy="16" r="4.6" fill="currentColor"/><circle cx="17.6" cy="14.4" r="1.4" fill="#fff"/>`,
  orbit: `<ellipse cx="16" cy="19" rx="11" ry="5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M26 15.5l1.8 3.2-3.6.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="10" r="4.6" fill="currentColor"/>`,
  tiltUp: `<path d="M5 22l11-12 11 12" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  tiltDown: `<path d="M5 10l11 12 11-12" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  rotate: `<path d="M24 12a9 9 0 1 0 1.5 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M25.5 5.5v7h-7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  // chunky white-on-colour glyphs for the edit toolbar and buttons (filled strokes, no thin outlines)
  close: `<path d="M9 9l14 14M23 9L9 23" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>`,
  check: `<path d="M7.5 17l5.8 5.8L24.5 11" fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  undo: `<path d="M12.5 8L6 14.5l6.500 6.500" fill="none" stroke="currentColor" stroke-width="3.600" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 14.500h11a7 7 0 0 1 0 14h-4" fill="none" stroke="currentColor" stroke-width="3.600" stroke-linecap="round"/>`,
  redo: `<path d="M19.500 8L26 14.500l-6.500 6.500" fill="none" stroke="currentColor" stroke-width="3.600" stroke-linecap="round" stroke-linejoin="round"/><path d="M25 14.500H14a7 7 0 0 0 0 14h4" fill="none" stroke="currentColor" stroke-width="3.600" stroke-linecap="round"/>`,
  hand: `<path d="M16 4v10M10 8v9M22 8v9M6 14v6a9 9 0 0 0 9 9h2a9 9 0 0 0 9-9v-6" fill="none" stroke="currentColor" stroke-width="3.400" stroke-linecap="round" stroke-linejoin="round"/>`,
  help: `<circle cx="16" cy="16" r="12.500" fill="currentColor"/><path d="M12.400 12.800c.2-2.200 1.800-3.400 3.800-3.400 2.100 0 3.700 1.200 3.700 3.100 0 2.800-3.600 2.800-3.600 5.400" stroke="#fff" stroke-width="2.600" fill="none" stroke-linecap="round"/><circle cx="16.200" cy="22.600" r="1.700" fill="#fff"/>`,
  upload: `<path d="M16 24V7M9 13.500L16 6.500l7 7" fill="none" stroke="currentColor" stroke-width="3.800" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 26h20" stroke="currentColor" stroke-width="3.800" stroke-linecap="round"/>`,
  trash: `<path d="M7 10h18M13 10V7h6v3M9 10l1.2 15a2 2 0 0 0 2 1.8h7.6a2 2 0 0 0 2-1.8L23 10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
};

/** One of Fuzzies Land's sticker icons as an inline SVG element. */
export function landIcon(name: LandIcon, size = 24): SVGSVGElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg class="li li-${name}" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${ART[name]}</svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}

// ---------------------------------------------------------------------------------------------------------------------
// Pictures for goods, mini-games and medals — the same chunky "sticker" style as above, so cards and chips never need emoji.
// ---------------------------------------------------------------------------------------------------------------------
const GOOD_ART: Record<string, string> = {
  corn: `<g transform="rotate(-18 16 16)"><path d="M16 27c-7 0-9.5-5.5-9-10.5 3.2 1.2 6.4 4.6 9 10.5zM16 27c7 0 9.5-5.5 9-10.5-3.2 1.2-6.4 4.6-9 10.5z" fill="#7ad36b" stroke="#3f8f3a" ${O}/>
    <ellipse cx="16" cy="14.5" rx="6.4" ry="10.8" fill="#ffd43b" stroke="#d1900f" ${O}/><path d="M12.4 7.5v14M16 4.5v20M19.6 7.5v14M10 12h12M9.8 16.6h12.4" stroke="#e9a91f" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="13.4" cy="9" rx="1.6" ry="3" ${HL}/></g>`,
  carrot: `<path d="M8.5 11.5c3.2-3.6 10.5-2.6 13.5 1.4l5 13c.5 1.4-.8 2.6-2.2 2L12 23.2C6.4 20.5 5 15 8.5 11.5z" fill="#ff9340" stroke="#d9611a" ${O}/>
    <path d="M13 13.5l3 1.2M12 18l4.2 1.6M17.5 12.6l3.2 1.4" stroke="#d9611a" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M10 10.5C8 7 8.6 4.8 10.4 3.8c1.8 1.2 2.4 3.6 1.4 6.2zM12.5 9.6c.4-3.6 2.4-5.4 4.6-5.4.6 2.2-.4 4.4-2.8 6.2zM8.8 11.8C5.4 11 4 9.2 4.4 7.2c2.4-.4 4.6.8 5.8 3.2z" fill="#7ad36b" stroke="#3f8f3a" stroke-width="1.5" stroke-linejoin="round"/><ellipse cx="11" cy="13" rx="1.6" ry="2.6" ${HL} transform="rotate(30 11 13)"/>`,
  candy: `<path d="M21 27.5V12.5a5.5 5.5 0 0 0-11 0" fill="none" stroke="#a8325a" stroke-width="8.4" stroke-linecap="round"/>
    <path d="M21 27.5V12.5a5.5 5.5 0 0 0-11 0" fill="none" stroke="#fff" stroke-width="5.6" stroke-linecap="round"/>
    <path d="M21 27V12.5a5.5 5.5 0 0 0-11 0" fill="none" stroke="#e45a78" stroke-width="5.6" stroke-dasharray="3.2 4.4" stroke-dashoffset="-1"/>
    <path d="M12 8.4c1-1.8 3.4-2.2 4.8-.8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`,
  cotton: `<g stroke="#9fc5e8" stroke-width="2.2" stroke-linejoin="round" fill="#fff"><circle cx="10.5" cy="17.5" r="6"/><circle cx="17" cy="12.5" r="6.8"/><circle cx="23" cy="18" r="5.6"/><rect x="7" y="17.5" width="20" height="7" rx="3.5"/></g>
    <g fill="#fff"><circle cx="10.5" cy="17.5" r="5"/><circle cx="17" cy="12.5" r="5.8"/><circle cx="23" cy="18" r="4.6"/><rect x="8" y="18" width="18" height="5.6" rx="2.8"/></g>
    <path d="M13 9.5c1.4-1.4 3.4-1.6 5-.6" fill="none" stroke="#dbeaf7" stroke-width="1.8" stroke-linecap="round"/><path d="M9 23.2h15" stroke="#dbeaf7" stroke-width="1.6" stroke-linecap="round"/>`,
  bread: `<path d="M4.5 19c0-5.4 5-9.5 11.5-9.5S27.5 13.6 27.5 19c0 3-1 5-2.8 6H7.3C5.5 24 4.5 22 4.5 19z" fill="#e8aa5e" stroke="#a8692a" ${O}/>
    <path d="M10.5 14.5l3 4.2M15.5 13l3 5M20.5 14.5l2.6 4" stroke="#fbe2b3" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="9.5" cy="16" rx="2.4" ry="1.3" ${HL} transform="rotate(-30 9.5 16)"/>`,
  cake: `<path d="M4.5 15l23-5.5v14.5a2.2 2.2 0 0 1-2.2 2.2H6.7a2.2 2.2 0 0 1-2.2-2.2z" fill="#ffb577" stroke="#c4701f" ${O}/>
    <path d="M4.5 21l23-4.2" stroke="#fff4e3" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M4.5 15l23-5.5v4.6L4.5 20z" fill="#fff4e3" stroke="#c9a77e" ${O}/>
    <path d="M16.5 7.5c-1.4-1.2-1.6-3.2-.2-4.2 1.8 0 2.6 2.4 1.6 4.4z" fill="#ff9340" stroke="#d9611a" stroke-width="1.4" stroke-linejoin="round"/><path d="M18 5.6c1-1.6 2.6-1.8 3.6-.8" stroke="#3f8f3a" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
  cookies: `<circle cx="16" cy="16.5" r="12" fill="#d9a05b" stroke="#9c6638" ${O}/>
    <circle cx="11" cy="12" r="2.2" fill="#6e4429"/><circle cx="19" cy="10.5" r="2" fill="#6e4429"/><circle cx="21" cy="18.5" r="2.3" fill="#6e4429"/><circle cx="12.5" cy="20.5" r="2.1" fill="#6e4429"/><circle cx="16.5" cy="15" r="1.6" fill="#6e4429"/>
    <path d="M7 12.5c1.4-3 4-4.800 7-5.400" stroke="#f1c98e" stroke-width="2" stroke-linecap="round" fill="none"/>`,
  popcorn: `<g fill="#fff4e3" stroke="#d1900f" stroke-width="1.6"><circle cx="9.5" cy="10" r="4.2"/><circle cx="16" cy="7.5" r="4.6"/><circle cx="22.5" cy="10" r="4.2"/><circle cx="13" cy="12.5" r="3.8"/><circle cx="19.5" cy="12.5" r="3.8"/></g>
    <circle cx="14.5" cy="6.5" r="1.2" fill="#ffd43b"/><circle cx="23" cy="9" r="1.1" fill="#ffd43b"/>
    <path d="M6.5 13.5h19l-2.2 13.2a2 2 0 0 1-2 1.7H10.7a2 2 0 0 1-2-1.7z" fill="#fff" stroke="#a8325a" ${O}/>
    <path d="M11 13.5l.8 14.600M16 13.500v14.700M21 13.500l-.8 14.600" stroke="#e45a78" stroke-width="3" stroke-linecap="butt"/>
    <path d="M6.500 13.500h19" stroke="#a8325a" stroke-width="2.4" stroke-linecap="round"/>`,
  caramel: `<rect x="9" y="5.5" width="14" height="5" rx="2.4" fill="#c98b55" stroke="#8a5a30" ${O}/>
    <path d="M8 11c-3 2-4 5-4 9 0 4.600 3 7.500 6.500 7.500h11c3.500 0 6.500-2.900 6.500-7.500 0-4-1-7-4-9z" fill="#ffc94a" stroke="#c4871a" ${O}/>
    <path d="M9.500 14.500c4 1.800 9 1.800 13 0" fill="none" stroke="#fff4e3" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    <path d="M13 18c0 3 0 5-1 6.500" stroke="#e9a91f" stroke-width="2" stroke-linecap="round"/><ellipse cx="9.500" cy="19" rx="1.800" ry="3.200" ${HL}/>`,
  yarn: `<circle cx="16" cy="16" r="11.500" fill="#ff86bb" stroke="#b8235f" ${O}/>
    <path d="M7 11c5 3 11 3 17 0M5.500 16.500c6 3.500 14 3.500 20.500 0M8 22c5 2.200 10 2.200 15 0M12 5.500c-1 7 0 14 4 20M18.500 5c3 6 3 13-.5 21" fill="none" stroke="#ffd0e4" stroke-width="1.700" stroke-linecap="round"/>
    <path d="M24 24c2 .500 4 2.500 3.500 4.500" fill="none" stroke="#ff86bb" stroke-width="2.800" stroke-linecap="round"/><ellipse cx="11" cy="9.500" rx="3" ry="1.800" ${HL} transform="rotate(-35 11 9.500)"/>`,
  scarf: `<path d="M5 8.500c4 3 8 3 12 0 4-3 8-3 10 0v7c-2-3-6-3-10 0-4 3-8 3-12 0z" fill="#e45a78" stroke="#a8325a" ${O}/>
    <path d="M9 10.500l.2 7.500M14 11v7.500M19.500 8.500v7.500M24.500 8.500v7" stroke="#fff4e3" stroke-width="2.400" stroke-linecap="round" opacity=".9"/>
    <path d="M8.500 17.500l-.8 9.500h6.600l-.8-8.500z" fill="#e45a78" stroke="#a8325a" ${O}/><path d="M9.800 21h3M9.600 24h3.400" stroke="#fff4e3" stroke-width="2" stroke-linecap="round"/>
    <path d="M9 27.500v2M11 27.500v2.200M13 27.500v2" stroke="#a8325a" stroke-width="1.600" stroke-linecap="round"/>`,
};
const GOOD_FALLBACK: Record<string, LandIcon> = { wheat: 'wheat' };

/** A picture for a crop or product (`wheat`, `bread`, …). */
export function goodIcon(id: string, size = 24): SVGSVGElement {
  if (GOOD_FALLBACK[id]) return landIcon(GOOD_FALLBACK[id], size);
  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg class="li li-good li-${id}" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${GOOD_ART[id] ?? ART.crate}</svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}

const GAME_ART: Record<string, string> = {
  forest: `<rect x="14" y="21" width="4.600" height="7" rx="1.400" fill="#c98b55" stroke="#8a5a30" stroke-width="1.600"/>
    <path d="M16 3.500l7.500 9h-4l5 7h-17l5-7h-4z" fill="#58b65a" stroke="#2f7a3a" ${O}/><path d="M12.500 9.500l3-3.300" stroke="#fff" stroke-width="1.800" stroke-linecap="round" opacity=".55"/>
    <g transform="rotate(35 25 20)"><rect x="24" y="14" width="2.400" height="13" rx="1.200" fill="#d9a066" stroke="#8a5a30" stroke-width="1.200"/><path d="M21 14.500h7.500l1.500 3.500h-9z" fill="#a3aec2" stroke="#58627a" stroke-width="1.300" stroke-linejoin="round"/></g>`,
  vacuum: `<path d="M5 8.500c4 0 6 2 6 6v6" fill="none" stroke="#8a95a8" stroke-width="3" stroke-linecap="round"/>
    <rect x="9" y="13" width="17" height="11.500" rx="5.500" fill="#e45a78" stroke="#a8325a" ${O}/><rect x="13" y="16" width="9" height="5" rx="2.500" fill="#fff4e3"/>
    <circle cx="12.500" cy="26" r="3" fill="#3d2f2a" stroke="#1d1612" stroke-width="1.600"/><circle cx="23.500" cy="26" r="3" fill="#3d2f2a" stroke="#1d1612" stroke-width="1.600"/>
    <path d="M3 6.500h5.500l1 4H3z" fill="#8f9bb0" stroke="#58627a" stroke-width="1.600" stroke-linejoin="round"/>`,
  fruit: `<path d="M16 9.500c-3-2.500-10-1.500-10 6 0 6.500 5 12 10 12s10-5.500 10-12c0-7.500-7-8.500-10-6z" fill="#ff6b6b" stroke="#c0392b" ${O}/>
    <path d="M16 9.500c0-2.500 1-4.500 3-5.500" fill="none" stroke="#8a5a30" stroke-width="2.200" stroke-linecap="round"/><path d="M19 7.500c2-2 5-2 6.500-.5-1.500 2.500-4.500 3-6.500.5z" fill="#7ad36b" stroke="#3f8f3a" stroke-width="1.500" stroke-linejoin="round"/>
    <ellipse cx="11" cy="14" rx="2" ry="3.200" ${HL} transform="rotate(20 11 14)"/>`,
  fishing: `<path d="M5 17c3.500-5 10-6.500 15.500-3.500l5-3.500v13l-5-3.500C15 22.500 8.500 22 5 17z" fill="#5aa2e6" stroke="#2f6fb0" ${O}/>
    <circle cx="10" cy="15.500" r="1.400" fill="#fff"/><circle cx="10.400" cy="15.600" r=".7" fill="#18171c"/><path d="M14 13.500c1 2 1 4.500 0 6.500" stroke="#bfe0ff" stroke-width="1.800" stroke-linecap="round" fill="none"/>
    <path d="M24 3.500v5" stroke="#8a5a30" stroke-width="1.600" stroke-linecap="round"/><path d="M24 9.500c-2 0-2 3 0 3" stroke="#8f9bb0" stroke-width="1.600" fill="none" stroke-linecap="round"/>`,
  treasure: `<path d="M4.500 15a11.500 11.500 0 0 1 23 0z" fill="#c98b55" stroke="#8a5a30" ${O}/><rect x="4.500" y="14.500" width="23" height="13" rx="2.400" fill="#d9a066" stroke="#8a5a30" ${O}/>
    <rect x="4.500" y="14.500" width="23" height="3.200" fill="#ffc94a" stroke="#d1900f" stroke-width="1.400"/><rect x="13.500" y="13" width="5" height="7.500" rx="1.600" fill="#ffc94a" stroke="#d1900f" stroke-width="1.500"/><circle cx="16" cy="16.500" r="1.200" fill="#8a5a30"/>
    <path d="M25 6l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="#ffc94a"/>`,
  obstacle: `<path d="M7 28V9M25 28V9" stroke="#8a5a30" stroke-width="3.200" stroke-linecap="round"/>
    <rect x="5" y="10" width="22" height="6" rx="2.200" fill="#fff" stroke="#a8325a" ${O}/><path d="M10 10.500l-2.500 5M16 10.500l-2.500 5M22 10.500l-2.500 5" stroke="#e45a78" stroke-width="3.200" stroke-linecap="round"/>
    <path d="M19 26.500l2.200-5 2.200 5-2.200-1z" fill="#ffc94a" stroke="#d1900f" stroke-width="1.500" stroke-linejoin="round"/>`,
  brawl: `<path d="M8 15c0-5 3.500-9 9-9 6 0 9 4 9 8.500 0 4-2 6-3.500 7.500V27H11.500v-4C9.500 21.500 8 19 8 15z" fill="#e45a78" stroke="#a8325a" ${O}/>
    <rect x="10.500" y="23.500" width="12" height="5" rx="2" fill="#fff4e3" stroke="#c9a77e" ${O}/><path d="M10.500 14c2-2.500 5-3 8-2.500" fill="none" stroke="#fff" stroke-width="2.200" stroke-linecap="round" opacity=".6"/>
    <path d="M19 15.500c2 .5 4 .5 5.500-.5" fill="none" stroke="#a8325a" stroke-width="1.800" stroke-linecap="round"/>`,
  delivery: `<rect x="4.500" y="10" width="23" height="17" rx="3" fill="#e2b77f" stroke="#a87a45" ${O}/><path d="M3.500 10.500h25v-3a2 2 0 0 0-2-2h-21a2 2 0 0 0-2 2z" fill="#edc791" stroke="#a87a45" ${O}/>
    <path d="M16 5.500V27" stroke="#e45a78" stroke-width="3.200"/><rect x="19.500" y="17" width="5.500" height="5" rx="1" fill="#fffaf2" stroke="#a87a45" stroke-width="1"/>`,
  garden: `<path d="M16 29V15" stroke="#3f8f3a" stroke-width="2.600" stroke-linecap="round"/><path d="M16 24c-4 0-6-2-6-5 3 0 5.500 1.500 6 5zM16 22c4 0 6-2 6-5-3 0-5.500 1.500-6 5z" fill="#7ad36b" stroke="#3f8f3a" stroke-width="1.500" stroke-linejoin="round"/>
    <path d="M9 6.500c0 6 3 9 7 9s7-3 7-9c-2 1.500-4 1-7-1.500C13 7.500 11 8 9 6.500z" fill="#ff86bb" stroke="#d6336c" ${O}/><path d="M16 5v9" stroke="#d6336c" stroke-width="1.500" stroke-linecap="round" opacity=".6"/>`,
  kart: `<path d="M4 20h24v4.500a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="#e45a78" stroke="#a8325a" ${O}/><path d="M9 20v-5.500a2 2 0 0 1 2-2h5l4 4.500v3" fill="#ffd8e5" stroke="#a8325a" ${O}/>
    <circle cx="9.500" cy="26.500" r="3.200" fill="#3d2f2a" stroke="#1d1612" ${O}/><circle cx="23" cy="26.500" r="3.200" fill="#3d2f2a" stroke="#1d1612" ${O}/><path d="M23 12v3.500" stroke="#8f9bb0" stroke-width="2" stroke-linecap="round"/>
    <path d="M24 5l5 2-5 2z" fill="#ffc94a" stroke="#d1900f" stroke-width="1.300" stroke-linejoin="round"/>`,
  balloon: `<path d="M16 3.500c-5.500 0-9 4-9 9.500 0 5.500 4 9 9 10.500 5-1.500 9-5 9-10.500 0-5.500-3.500-9.500-9-9.500z" fill="#e45a78" stroke="#a8325a" ${O}/>
    <path d="M14.500 24l1.500-2 1.500 2z" fill="#a8325a" stroke="#a8325a" stroke-width="1.500" stroke-linejoin="round"/><path d="M16 24.500c-2 2-1 3.500 0 4.500s2 2 0 3" fill="none" stroke="#8f9bb0" stroke-width="1.500" stroke-linecap="round"/>
    <ellipse cx="11.500" cy="10" rx="2.200" ry="3.600" ${HL} transform="rotate(25 11.500 10)"/>`,
  mining: `<path d="M16 9l-11 3.500c1-5 5.500-8 11-8s10 3 11 8z" fill="#a3aec2" stroke="#58627a" ${O}/><path d="M16 9v19" stroke="#d9a066" stroke-width="3.400" stroke-linecap="round"/><path d="M16 9v19" stroke="#8a5a30" stroke-width="1" opacity=".5"/>
    <path d="M22 26l2.500-4 3 2.500-1 4.500z" fill="#7fe6dd" stroke="#2fa89c" stroke-width="1.600" stroke-linejoin="round"/>`,
  fire: `<path d="M16 3c1 5 7.500 8.500 7.500 15.500A7.500 7.500 0 0 1 16 26a7.500 7.500 0 0 1-7.500-7.500c0-3 1.500-4.500 3-6.500.5 2 1.500 3 2.500 3C14 12 14.500 7 16 3z" fill="#ff8c42" stroke="#c4591c" ${O}/>
    <path d="M16 15c.5 3 3.500 4.500 3.500 7.500a3.500 3.500 0 0 1-7 0c0-2 1.500-3 2-4.500.5.800 1 1 1.500 1z" fill="#ffd43b" stroke="#e9a91f" stroke-width="1.500" stroke-linejoin="round"/>`,
  skate: `<path d="M9 4.500h8v10l8 4c2 1 3 2 3 4V24H9z" fill="#fff" stroke="#a8325a" ${O}/><path d="M9 4.500h8v4H9z" fill="#e45a78" stroke="#a8325a" ${O}/>
    <path d="M6 28h22" stroke="#8f9bb0" stroke-width="3.200" stroke-linecap="round"/><path d="M11 24v4M25 24v4" stroke="#58627a" stroke-width="2.200" stroke-linecap="round"/><path d="M12 13h4M12 16.500h6" stroke="#e45a78" stroke-width="1.800" stroke-linecap="round"/>`,
  snowball: `<circle cx="16" cy="16" r="12" fill="#fff" stroke="#8fb7de" ${O}/><path d="M16 7v18M8.500 11.500l15 9M8.500 20.500l15-9" stroke="#bcd7ef" stroke-width="2.200" stroke-linecap="round"/><circle cx="16" cy="16" r="2.400" fill="#8fb7de"/>
    <ellipse cx="11" cy="10" rx="3" ry="1.800" fill="#e8f3fc" transform="rotate(-35 11 10)"/>`,
  beach: `<path d="M3.500 15.500C4.500 8.500 9.500 4 16 4s11.500 4.500 12.500 11.500z" fill="#fff" stroke="#a8325a" ${O}/>
    <path d="M10 15.500C10.500 9.500 12.500 5 16 4M22 15.500C21.500 9.500 19.500 5 16 4" fill="none" stroke="#a8325a" stroke-width="1.500"/>
    <path d="M3.500 15.500c3 0 3.500 1.800 6.500 0 0-6 2.500-11.500 6-11.500-3 .5-3.500 6-4 11.500zM28.500 15.500c-3 0-3.500 1.800-6.500 0 0-6-2.500-11.500-6-11.500 3 .5 3.500 6 4 11.500z" fill="#e45a78" stroke="#a8325a" stroke-width="1.500" stroke-linejoin="round"/>
    <path d="M16 15.500V28" stroke="#8a5a30" stroke-width="2.600" stroke-linecap="round"/><path d="M4 28.500q6-3 12 0t12 0" fill="none" stroke="#f3dca2" stroke-width="2.600" stroke-linecap="round"/>`,
  maze: `<rect x="4.500" y="4.500" width="23" height="23" rx="5" fill="#58b65a" stroke="#2f7a3a" ${O}/>
    <path d="M10 22V10h12v9h-6v-4" fill="none" stroke="#d7f5c9" stroke-width="2.800" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="15" r="1.800" fill="#ffc94a" stroke="#d1900f" stroke-width="1.200"/>`,
  dolphin: `<path d="M3 20c3-8 10-12 18-10 2 .5 3.500 1.500 4.500 3-2-.5-3.500 0-4 1 1 2 3 3 5.500 3-3 1-5 .5-6.500-.5-2 4-7 7.500-12 5.500-2-.8-4-.5-5.500-2z" fill="#5aa2e6" stroke="#2f6fb0" ${O}/>
    <path d="M13 9.500c1-3 3-4.500 5.500-5-1 1.800-1.500 3.500-1.500 5.500z" fill="#5aa2e6" stroke="#2f6fb0" stroke-width="1.800" stroke-linejoin="round"/><circle cx="19" cy="13.500" r="1.200" fill="#18171c"/><path d="M8 20.500c4 2 8 1.500 11-1.500" fill="none" stroke="#cfe6fb" stroke-width="1.800" stroke-linecap="round"/>`,
  cooking: `<path d="M5 14h22v5a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8z" fill="#8f9bb0" stroke="#58627a" ${O}/><path d="M27 15.500h3.500a1.800 1.800 0 0 1 0 3.600H27" fill="none" stroke="#58627a" stroke-width="2.400" stroke-linecap="round"/>
    <path d="M5 14c3-2 6 1 9 0s6-2 9 0 4 0 4 0" fill="#fff" stroke="#c9a77e" stroke-width="1.500"/><path d="M10 9c-1-1.500 1-2.500 0-4M16 9c-1-1.500 1-2.500 0-4M22 9c-1-1.500 1-2.500 0-4" fill="none" stroke="#c9c3bb" stroke-width="2" stroke-linecap="round"/>`,
};
const GAME_FALLBACK: Record<string, LandIcon> = { boatrace: 'boat', harvest: 'wheat' };

/** A picture for a mini-game / adventure id. */
export function gameIcon(id: string, size = 32): SVGSVGElement {
  if (GAME_FALLBACK[id]) return landIcon(GAME_FALLBACK[id], size);
  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg class="li li-game li-${id}" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${GAME_ART[id] ?? ART.compass}</svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}

const MEDALS = [
  { a: '#ffd45a', b: '#d99a00', r: '#e45a78' },   // gold
  { a: '#e9eef4', b: '#8a96a6', r: '#5aa2e6' },   // silver
  { a: '#e3a06a', b: '#a8602a', r: '#33ab9b' },   // bronze
  { a: '#ff86bb', b: '#b8235f', r: '#a8325a' },   // finisher
];
/** A medal for place 1–3 (gold / silver / bronze) or a finisher ribbon. */
export function medalIcon(place: number, size = 22): SVGSVGElement {
  const m = MEDALS[place >= 1 && place <= 3 ? place - 1 : 3];
  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg class="li li-medal m${place}" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">
    <path d="M9 2.500h5.500l3 9-3.500 1zM23 2.500h-5.500l-3 9 3.500 1z" fill="${m.r}" stroke="#fff" stroke-width="1.200" stroke-linejoin="round"/>
    <circle cx="16" cy="19.500" r="9.500" fill="${m.b}"/><circle cx="16" cy="18.800" r="9.500" fill="${m.a}" stroke="${m.b}" stroke-width="1.800"/>
    <circle cx="16" cy="18.800" r="6" fill="none" stroke="${m.b}" stroke-width="1.400" opacity=".7"/>
    ${place >= 1 && place <= 3 ? `<text x="16" y="22.700" text-anchor="middle" font-family="Fredoka, system-ui, sans-serif" font-weight="700" font-size="10.500" fill="${m.b}">${place}</text>` : `<path d="M13 22V14.500l7 2.200-7 2.300" fill="#fff" stroke="#fff" stroke-width="1.500" stroke-linejoin="round"/>`}
    <ellipse cx="11.500" cy="13.800" rx="2.600" ry="1.400" fill="#fff" opacity=".55" transform="rotate(-35 11.500 13.800)"/></svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}
