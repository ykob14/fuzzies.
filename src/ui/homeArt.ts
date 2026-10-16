/**
 * Illustrated scenes for the Home cards (Fuzzy Crossing, Fuzzies Land) and the owner's Fuzzy friends as mission faces.
 * Drawn in code as inline SVG (no new image files except the owner's own Fuzzy pictures); the motion is CSS (.ha-*).
 * The characters are PART of each scene: they stand on contact shadows, are partly hidden by things in front of them,
 * hold props, sit in the cars and ride the logs.
 */
import { friendUrl } from '../content/friends';

const HERO = '/art/fuzzy-hero.webp';
const img = (href: string, x: number, y: number, s: number, cls = '', extra = '') =>
  `<image class="${cls}" href="${href}" x="${x}" y="${y}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid meet" ${extra}/>`;
const fr = (id: string) => friendUrl(id);
const shadow = (cx: number, cy: number, rx: number, ry = rx * 0.28, o = 0.22) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#12301a" opacity="${o}"/>`;

function svg(viewBox: string, body: string, label: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'ha-scene';
  wrap.innerHTML = `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMax slice" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  return wrap;
}

/** A little cartoon car; `driver` shows one of the owner's Fuzzies behind the windscreen (clipped to the window). */
const car = (x: number, y: number, body: string, roof: string, cls: string, id: string, driver?: string) => `<g class="ha-car ${cls}"><g transform="translate(${x} ${y})">
  ${shadow(27, 33, 28, 4, 0.28)}
  <rect x="0" y="6" width="54" height="22" rx="9" fill="${body}"/>
  <path d="M10 8 q3 -15 16 -15 h9 q10 0 13 15z" fill="${roof}"/>
  <clipPath id="${id}"><path d="M14 7 q3 -11 12 -11 h8 q8 0 11 11z"/></clipPath>
  <path d="M14 7 q3 -11 12 -11 h8 q8 0 11 11z" fill="#cfeaff"/>
  ${driver ? `<g clip-path="url(#${id})">${img(driver, 18, -9, 24, 'ha-drv')}</g>` : ''}
  <path d="M14 7 q3 -11 12 -11 h8 q8 0 11 11z" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7"/>
  <rect x="48" y="13" width="6" height="6" rx="2.5" fill="#ffe89a"/><rect x="0" y="14" width="4" height="5" rx="2" fill="#ff6b6b"/>
  <g class="ha-wheel"><circle cx="13" cy="28" r="6.5" fill="#23232e"/><circle cx="13" cy="28" r="2.6" fill="#cfd2dc"/></g>
  <g class="ha-wheel"><circle cx="41" cy="28" r="6.5" fill="#23232e"/><circle cx="41" cy="28" r="2.6" fill="#cfd2dc"/></g>
  <path d="M-14 12 h10 M-18 19 h12" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".45"/>
</g></g>`;

/** Fuzzy Crossing: the owner's Fuzzy rides a log across the river towards its nest, tokens mark the way, friends drive the cars. */
export function crossingArt(): HTMLElement {
  return svg('0 0 400 200', `
    <defs>
      <linearGradient id="haw" x1="0" x2="1"><stop offset="0" stop-color="#2f9be0"/><stop offset="1" stop-color="#1f74c8"/></linearGradient>
      <radialGradient id="hag" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#f6a928"/></radialGradient>
    </defs>
    <rect width="400" height="200" fill="#58b85a"/>
    <!-- the nests at the top: the goal -->
    <rect y="0" width="400" height="30" fill="#6fcb64"/>
    ${[56, 160, 264, 346].map((x, i) => `<g><ellipse cx="${x}" cy="22" rx="22" ry="8" fill="#a8743f"/><ellipse cx="${x}" cy="19" rx="17" ry="6" fill="#c9965a"/><path d="M${x - 16} 20 q8 5 16 1 q8 4 16 -1" stroke="#8a5a2c" stroke-width="2" fill="none"/>${i === 2 ? img(fr('f04'), x - 13, 2, 26, 'ha-nest') + `<path d="M${x + 10} 4 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1z" fill="#ffd34d" class="ha-twinkle"/>` : ''}</g>`).join('')}
    <!-- road 1 -->
    <rect y="30" width="400" height="38" fill="#3b3b4f"/>
    <g stroke="#f4f1e8" stroke-width="3" stroke-dasharray="22 18" opacity=".55"><line x1="0" y1="49" x2="400" y2="49"/></g>
    <!-- river -->
    <rect y="68" width="400" height="52" fill="url(#haw)"/>
    <g fill="#fff" opacity=".28" class="ha-ripple"><rect x="20" y="76" width="42" height="3" rx="2"/><rect x="210" y="108" width="52" height="3" rx="2"/><rect x="318" y="80" width="38" height="3" rx="2"/><rect x="120" y="112" width="30" height="3" rx="2"/></g>
    <!-- road 2 -->
    <rect y="120" width="400" height="36" fill="#3b3b4f"/>
    <g stroke="#f4f1e8" stroke-width="3" stroke-dasharray="22 18" opacity=".55"><line x1="0" y1="138" x2="400" y2="138"/></g>
    <rect y="156" width="400" height="44" fill="#6fcb64"/>
    ${[26, 118, 306, 372].map((x, i) => `<circle cx="${x}" cy="${176 + (i % 2) * 12}" r="4.5" fill="#fff3c4"/><circle cx="${x + 11}" cy="${186 - (i % 2) * 7}" r="3.2" fill="#ffb3cf"/>`).join('')}
    <!-- cars with the owner's Fuzzies at the wheel -->
    ${car(10, 38, '#e5484d', '#c93a3f', 'ha-car-a', 'hacw1', fr('f18'))}${car(215, 38, '#f5c542', '#d9a926', 'ha-car-b', 'hacw2', fr('f23'))}
    ${car(40, 124, '#4f8ef7', '#3a74d8', 'ha-car-c', 'hacw3', fr('f34'))}${car(250, 124, '#ff7aa8', '#e0568a', 'ha-car-d', 'hacw4', fr('f13'))}
    <!-- the way home: a trail of Fuzzy tokens from the hero up to the nest -->
    <g class="ha-trail">${[[212, 66], [224, 56], [236, 50], [250, 47], [262, 46]].map(([x, y], i) => `<g class="ha-tok" style="animation-delay:${-i * 0.25}s"><circle cx="${x}" cy="${y}" r="6" fill="url(#hag)" stroke="#e0a21f" stroke-width="1"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="2" fill="#fff" opacity=".6"/></g>`).join('')}</g>
    <!-- a log drifts; the hero rides it, a friend waves from the other one -->
    <g class="ha-log">
      <rect x="0" y="92" width="150" height="26" rx="13" fill="#9a6232"/><rect x="0" y="92" width="150" height="9" rx="4.5" fill="#c2824f"/>
      <ellipse cx="143" cy="105" rx="7" ry="12" fill="#e1b27a"/><ellipse cx="143" cy="105" rx="3.6" ry="6.4" fill="#c98f4f"/>
      <path d="M12 106 h30 M60 111 h46" stroke="#7d4a22" stroke-width="2" stroke-linecap="round" opacity=".5"/>
      <ellipse cx="75" cy="120" rx="76" ry="5" fill="#fff" opacity=".35" class="ha-foam"/>
      <g class="ha-ride">${shadow(76, 93, 22, 5, 0.3)}${img(HERO, 46, 52, 60, 'ha-hop')}</g>
      <g class="ha-splash"><circle cx="30" cy="121" r="2.2" fill="#fff"/><circle cx="38" cy="124" r="1.8" fill="#fff"/><circle cx="124" cy="122" r="2" fill="#fff"/></g>
    </g>
    <g class="ha-log ha-log2">
      <rect x="0" y="71" width="96" height="21" rx="10.5" fill="#9a6232"/><rect x="0" y="71" width="96" height="8" rx="4" fill="#c2824f"/>
      <g class="ha-ride">${shadow(48, 72, 14, 3.5, 0.28)}${img(fr('f14'), 33, 47, 30, 'ha-wave')}</g>
    </g>
    <!-- grass in front: the starting Fuzzy waits, half hidden behind the tufts -->
    ${shadow(338, 189, 15, 4, 0.25)}${img(fr('f30'), 322, 156, 34, 'ha-cheer')}
    <path d="M312 198 q4 -16 8 0 q4 -20 9 0 q4 -14 8 0 q5 -18 9 0 q4 -12 8 0 q5 -16 8 0 v6 h-50z" fill="#4fae54"/>
    <path d="M150 200 q4 -14 8 0 q4 -18 8 0 q4 -12 8 0 v6 h-24z" fill="#4fae54"/>
  `, 'The Fuzzy rides a log across the river towards its nest while friends drive the cars');
}

/** Fuzzies Land: a living town — one Fuzzy waters the crops, one bakes at the shop, a bee works the flowers, one waves from the cottage. */
export function landArt(): HTMLElement {
  const tree = (x: number, y: number, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})">${shadow(0, 12, 17, 4, 0.2)}<rect x="-3" y="-4" width="6" height="16" rx="2" fill="#9a6a3c"/><circle cx="0" cy="-14" r="15" fill="#3f9f4a"/><circle cx="-8" cy="-8" r="10" fill="#4cb356"/><circle cx="9" cy="-9" r="10" fill="#47ad52"/><circle cx="-4" cy="-19" r="5" fill="#6bc873" opacity=".7"/></g>`;
  const flower = (x: number, y: number, c: string) => `<g transform="translate(${x} ${y})"><path d="M0 0 v8" stroke="#3f9f4a" stroke-width="2"/><circle r="3.2" fill="${c}"/><circle r="1.3" fill="#fff6c0"/></g>`;
  return svg('0 0 400 200', `
    <defs>
      <linearGradient id="has" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ff"/><stop offset="1" stop-color="#fff3de"/></linearGradient>
      <clipPath id="hadoor"><rect x="76" y="108" width="14" height="24" rx="7"/></clipPath>
    </defs>
    <rect width="400" height="200" fill="url(#has)"/>
    <circle cx="340" cy="36" r="19" fill="#ffe27a"/><circle cx="340" cy="36" r="29" fill="#ffe27a" opacity=".25"/>
    <g class="ha-cloud" fill="#fff" opacity=".95"><ellipse cx="70" cy="34" rx="30" ry="11"/><ellipse cx="92" cy="28" rx="20" ry="11"/><ellipse cx="52" cy="29" rx="16" ry="9"/></g>
    <g class="ha-cloud ha-cloud2" fill="#fff" opacity=".85"><ellipse cx="230" cy="56" rx="26" ry="9"/><ellipse cx="248" cy="51" rx="16" ry="9"/></g>
    <path d="M0 118 Q70 84 150 108 T300 100 T400 112 V200 H0z" fill="#a9dd7e"/>
    <path d="M0 140 Q90 118 190 136 T400 128 V200 H0z" fill="#8fd05f"/>
    ${tree(24, 112, .9)}${tree(376, 108, 1)}${tree(356, 124, .7)}
    <!-- cottage with a Fuzzy waving from the door -->
    <g transform="translate(54 92)">
      ${shadow(32, 41, 40, 5, 0.2)}
      <rect x="0" y="0" width="64" height="40" rx="3" fill="#fff4df"/>
      <path d="M-6 2 L32 -30 L70 2z" fill="#d6336c"/><path d="M32 -30 L70 2 L32 2z" fill="#8e1d45" opacity=".45"/>
      <rect x="25" y="14" width="14" height="26" rx="7" fill="#7a4a24"/>
      <g transform="translate(-54 -92)"><g clip-path="url(#hadoor)">${img(fr('f17'), 66, 107, 34, 'ha-peek')}</g></g>
      <rect x="8" y="12" width="14" height="14" rx="3" fill="#bfe6ff" stroke="#fff" stroke-width="2"/><rect x="42" y="12" width="14" height="14" rx="3" fill="#bfe6ff" stroke="#fff" stroke-width="2"/>
      <rect x="48" y="-26" width="9" height="16" fill="#e9d3b0"/>
    </g>
    <!-- the bakery: awning, loaf sign, counter with the chef behind it -->
    <g transform="translate(150 94)">
      ${shadow(36, 42, 44, 5, 0.2)}
      <rect x="0" y="0" width="72" height="42" rx="3" fill="#ffe9d0"/>
      <path d="M-4 2 L36 -26 L76 2z" fill="#a82e4a"/>
      <g>${Array.from({ length: 6 }, (_, i) => `<path d="M${-2 + i * 12.4} 6 h12.4 v12 q-6.2 6 -12.4 0z" fill="${i % 2 ? '#fff' : '#e0526f'}"/>`).join('')}</g>
      <circle cx="36" cy="-8" r="8" fill="#f6c46a"/><path d="M30 -9 q6 -6 12 0" stroke="#c98a2e" stroke-width="2" fill="none"/>
      <rect x="6" y="24" width="60" height="18" rx="3" fill="#b8763f"/><rect x="6" y="24" width="60" height="5" fill="#d99a58"/>
      <g class="ha-steam"><path d="M22 22 q-3 -6 0 -10 q3 -4 0 -9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/><path d="M52 22 q-3 -6 0 -10 q3 -4 0 -9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/></g>
      <g class="ha-baker">${img(fr('f37'), 20, 6, 32, 'ha-chef')}</g>
      <rect x="6" y="30" width="60" height="12" rx="2" fill="#b8763f"/>
      <ellipse cx="18" cy="31" rx="7" ry="3.6" fill="#e9b25c"/><ellipse cx="34" cy="31" rx="7" ry="3.6" fill="#e9b25c"/><ellipse cx="52" cy="31" rx="7" ry="3.6" fill="#e9b25c"/>
    </g>
    <!-- orange cottage -->
    <g transform="translate(262 100)">${shadow(28, 38, 34, 4.5, 0.2)}<rect width="56" height="38" rx="3" fill="#fff4df"/><path d="M-6 2 L28 -24 L62 2z" fill="#f08a3c"/><path d="M28 -24 L62 2 L28 2z" fill="#a85420" opacity=".4"/><rect x="21" y="14" width="14" height="24" rx="7" fill="#9a5a2a"/><rect x="6" y="11" width="11" height="11" rx="2.5" fill="#bfe6ff"/><rect x="39" y="11" width="11" height="11" rx="2.5" fill="#bfe6ff"/></g>
    <path d="M0 176 Q120 150 200 164 T400 150 V200 H0z" fill="#6cbf45"/>
    <path d="M168 200 Q195 172 222 160 Q250 150 272 142" stroke="#f1d9a8" stroke-width="16" fill="none" stroke-linecap="round" opacity=".9"/>
    <!-- the field: the pink Fuzzy waters it, half hidden behind the front row -->
    <g transform="translate(10 150)">
      ${[0, 14].map((i) => `<rect x="0" y="${i + 6}" width="96" height="7" rx="3" fill="#a9703c"/>${[8, 26, 44, 62, 80].map((x) => `<circle cx="${x}" cy="${i + 5}" r="4.4" fill="#58c45a"/><circle cx="${x + 3}" cy="${i + 3}" r="2.6" fill="#7ad67c"/>`).join('')}`).join('')}
      ${shadow(46, 14, 20, 4.5, 0.3)}
      <g class="ha-water">${img(fr('f01'), 28, -22, 38, 'ha-gardener')}
        <g transform="translate(60 -2)"><path d="M0 0 h12 l3 -5 h2 l-3 9 h-12z" fill="#4f8ef7"/><path d="M12 -1 l9 -7" stroke="#4f8ef7" stroke-width="3" stroke-linecap="round"/><rect x="19" y="-12" width="6" height="3" rx="1.5" fill="#3a74d8" transform="rotate(-35 19 -12)"/></g>
        <g class="ha-drops" fill="#6ec3ff"><circle cx="84" cy="-4" r="1.8"/><circle cx="87" cy="3" r="1.8"/><circle cx="82" cy="8" r="1.8"/></g>
      </g>
      <rect x="0" y="22" width="96" height="7" rx="3" fill="#a9703c"/>${[8, 26, 44, 62, 80].map((x) => `<circle cx="${x}" cy="21" r="5" fill="#58c45a"/><circle cx="${x + 3}" cy="19" r="3" fill="#7ad67c"/><circle cx="${x - 2}" cy="17" r="2" fill="#ff7a59"/>`).join('')}
    </g>
    <!-- the flower patch with a busy bee -->
    ${[[300, 170, '#ff9fc4'], [312, 178, '#fff'], [326, 170, '#ffd34d'], [340, 180, '#ff9fc4'], [354, 172, '#fff'], [368, 180, '#ffd34d'], [380, 170, '#ff9fc4']].map(([x, y, c]) => flower(x as number, y as number, c as string)).join('')}
    ${shadow(334, 188, 14, 3.5, 0.22)}
    <g class="ha-bee"><g>${img(fr('f20'), 318, 140, 32, 'ha-buzz')}</g></g>
    <!-- a speech bubble from the gardener -->
    <g class="ha-bubble"><rect x="52" y="116" width="26" height="17" rx="8" fill="#fff"/><path d="M58 132 l-3 6 8 -5z" fill="#fff"/><path d="M65 129 q-6 -4 -5 -8 q2.4 -3 5 0 q2.6 -3 5 0 q1 4 -5 8z" fill="#ff5c8a"/></g>
    <!-- chimney smoke -->
    <g class="ha-smoke"><circle cx="107" cy="58" r="4" fill="#fff" opacity=".8"/><circle cx="112" cy="48" r="5" fill="#fff" opacity=".6"/><circle cx="118" cy="36" r="6" fill="#fff" opacity=".4"/></g>
  `, 'A living town: one Fuzzy waters the crops, the chef bakes at the shop, a bee works the flowers and a bunny waves from the cottage');
}

/** A Fuzzy friend's face for each mission (the owner's sheet), in a soft round badge. */
const MISSION_FRIEND: Record<string, string> = {
  play2: 'f34', fz10: 'f30', fz25: 'f29', nest3: 'f17', level2: 'f22',
  design1: 'f24', template1: 'f37', share1: 'f10', link1: 'f33', photo1: 'f13', sticker3: 'f08', text2: 'f35', create10: 'f15',
};
export function missionFace(id: string, done: boolean): HTMLElement {
  const el = document.createElement('span');
  el.className = `mission-face ${done ? 'done' : ''}`;
  const i = document.createElement('img');
  i.src = friendUrl(MISSION_FRIEND[id] ?? 'f01'); i.alt = ''; i.width = 44; i.height = 44; i.draggable = false; i.loading = 'lazy';
  el.append(i);
  if (done) { const t = document.createElement('i'); t.textContent = '✓'; el.append(t); }
  return el;
}
