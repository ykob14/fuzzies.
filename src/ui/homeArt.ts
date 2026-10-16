/**
 * Illustrated scenes for the Home cards (Fuzzy Crossing, Fuzzies Land) and the owner's Fuzzy friends as mission faces.
 * Drawn in code as inline SVG (no new image files except the owner's own Fuzzy pictures); the motion is CSS (.ha-*).
 */
import { friendUrl } from '../content/friends';

const img = (id: string, x: number, y: number, s: number, cls = '') =>
  `<image class="${cls}" href="${friendUrl(id)}" x="${x}" y="${y}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid meet"/>`;

function svg(viewBox: string, body: string, label: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'ha-scene';
  wrap.innerHTML = `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMax slice" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  return wrap;
}

const car = (x: number, y: number, body: string, roof: string, cls: string) =>
  `<g class="ha-car ${cls}" transform="translate(${x} ${y})"><rect x="0" y="6" width="54" height="20" rx="8" fill="${body}"/><path d="M12 6 q4 -12 14 -12 h8 q9 0 12 12z" fill="${roof}"/><rect x="17" y="-3" width="9" height="8" rx="2" fill="#dff2ff"/><rect x="29" y="-3" width="9" height="8" rx="2" fill="#dff2ff"/><circle cx="14" cy="27" r="6" fill="#23232e"/><circle cx="40" cy="27" r="6" fill="#23232e"/><circle cx="14" cy="27" r="2.4" fill="#cfd2dc"/><circle cx="40" cy="27" r="2.4" fill="#cfd2dc"/><rect x="49" y="12" width="5" height="5" rx="2" fill="#ffe89a"/></g>`;

/** Fuzzy Crossing: a busy road, a river with a log, and the owner's Fuzzy hopping across. */
export function crossingArt(): HTMLElement {
  const lane = (y: number, fill: string) => `<rect x="0" y="${y}" width="400" height="44" fill="${fill}"/>`;
  return svg('0 0 400 200', `
    <defs>
      <linearGradient id="haw" x1="0" x2="1"><stop offset="0" stop-color="#2f86da"/><stop offset="1" stop-color="#1f6fc4"/></linearGradient>
      <radialGradient id="hag" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#f6a928"/></radialGradient>
    </defs>
    <rect width="400" height="200" fill="#58b85a"/>
    <rect y="0" width="400" height="22" fill="#6fcb64"/>
    ${[18, 98, 178, 258, 338].map((x) => `<ellipse cx="${x + 22}" cy="11" rx="20" ry="8" fill="#4aa850"/><circle cx="${x + 22}" cy="10" r="4" fill="#fff3c4"/>`).join('')}
    ${lane(22, '#3b3b4f')}
    <g stroke="#f4f1e8" stroke-width="3" stroke-dasharray="22 18" opacity=".55"><line x1="0" y1="44" x2="400" y2="44"/></g>
    ${lane(66, 'url(#haw)')}
    <g fill="#fff" opacity=".35" class="ha-ripple"><rect x="20" y="78" width="40" height="3" rx="2"/><rect x="200" y="96" width="50" height="3" rx="2"/><rect x="300" y="76" width="36" height="3" rx="2"/></g>
    ${lane(110, '#3b3b4f')}
    <g stroke="#f4f1e8" stroke-width="3" stroke-dasharray="22 18" opacity=".55"><line x1="0" y1="132" x2="400" y2="132"/></g>
    <rect y="154" width="400" height="46" fill="#6fcb64"/>
    ${[30, 120, 230, 330].map((x, i) => `<circle cx="${x}" cy="${172 + (i % 2) * 14}" r="5" fill="#fff3c4"/><circle cx="${x + 12}" cy="${182 - (i % 2) * 8}" r="3.5" fill="#ffb3cf"/>`).join('')}
    ${car(10, 28, '#e5484d', '#c93a3f', 'ha-car-a')}${car(210, 28, '#f5c542', '#d9a926', 'ha-car-b')}
    ${car(40, 116, '#4f8ef7', '#3a74d8', 'ha-car-c')}${car(250, 116, '#ff7aa8', '#e0568a', 'ha-car-d')}
    <g class="ha-log"><rect x="0" y="76" width="130" height="22" rx="11" fill="#a8693a"/><rect x="0" y="76" width="130" height="8" rx="4" fill="#c2824f"/><ellipse cx="124" cy="87" rx="6" ry="9" fill="#d9a36a"/></g>
    <g class="ha-log ha-log2"><rect x="0" y="72" width="100" height="22" rx="11" fill="#a8693a"/><rect x="0" y="72" width="100" height="8" rx="4" fill="#c2824f"/></g>
    <g class="ha-coin"><circle cx="318" cy="132" r="11" fill="url(#hag)"/><image href="/art/fuzzy-hero.webp" x="309" y="123" width="18" height="18"/></g>
    <g class="ha-hop"><ellipse cx="200" cy="176" rx="22" ry="5" fill="#000" opacity=".18"/><image href="/art/fuzzy-hero.webp" x="170" y="126" width="60" height="60"/></g>
  `, 'The Fuzzy hops across a road and a river');
}

/** Fuzzies Land: a little town with cottages, a barn, a field, trees and three Fuzzy neighbours. */
export function landArt(): HTMLElement {
  const tree = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="-4" width="6" height="16" rx="2" fill="#9a6a3c"/><circle cx="0" cy="-14" r="15" fill="#3f9f4a"/><circle cx="-8" cy="-8" r="10" fill="#4cb356"/><circle cx="9" cy="-9" r="10" fill="#47ad52"/><circle cx="-4" cy="-19" r="5" fill="#6bc873" opacity=".7"/></g>`;
  const cottage = (x: number, y: number, roof: string, shade: string, w = 64) => `<g transform="translate(${x} ${y})"><rect x="0" y="0" width="${w}" height="40" rx="3" fill="#fff4df"/><path d="M-6 2 L${w / 2} -30 L${w + 6} 2z" fill="${roof}"/><path d="M${w / 2} -30 L${w + 6} 2 L${w / 2} 2z" fill="${shade}" opacity=".45"/><rect x="${w / 2 - 7}" y="14" width="14" height="26" rx="6" fill="#b8763f"/><rect x="8" y="12" width="14" height="14" rx="3" fill="#bfe6ff" stroke="#fff" stroke-width="2"/><rect x="${w - 22}" y="12" width="14" height="14" rx="3" fill="#bfe6ff" stroke="#fff" stroke-width="2"/><rect x="${w - 16}" y="-26" width="9" height="16" fill="#e9d3b0"/></g>`;
  return svg('0 0 400 200', `
    <defs><linearGradient id="has" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ff"/><stop offset="1" stop-color="#fff3de"/></linearGradient></defs>
    <rect width="400" height="200" fill="url(#has)"/>
    <circle cx="332" cy="38" r="20" fill="#ffe27a"/><circle cx="332" cy="38" r="30" fill="#ffe27a" opacity=".25"/>
    <g class="ha-cloud" fill="#fff" opacity=".95"><ellipse cx="70" cy="36" rx="30" ry="11"/><ellipse cx="92" cy="30" rx="20" ry="11"/><ellipse cx="52" cy="31" rx="16" ry="9"/></g>
    <g class="ha-cloud ha-cloud2" fill="#fff" opacity=".85"><ellipse cx="230" cy="58" rx="26" ry="9"/><ellipse cx="248" cy="53" rx="16" ry="9"/></g>
    <path d="M0 118 Q70 84 150 108 T300 100 T400 112 V200 H0z" fill="#a9dd7e"/>
    <path d="M0 140 Q90 118 190 136 T400 128 V200 H0z" fill="#8fd05f"/>
    ${tree(26, 112, .9)}${tree(372, 108, 1)}${tree(352, 122, .7)}
    ${cottage(54, 92, '#d6336c', '#8e1d45')}
    ${cottage(250, 100, '#f08a3c', '#a85420', 56)}
    <g transform="translate(160 94)"><rect x="0" y="0" width="60" height="42" rx="3" fill="#e0526f"/><path d="M-6 2 L30 -26 L66 2z" fill="#a82e4a"/><rect x="20" y="14" width="20" height="28" rx="3" fill="#fff4df"/><path d="M20 14 L40 42 M40 14 L20 42" stroke="#e0526f" stroke-width="3"/></g>
    <path d="M0 176 Q120 150 200 164 T400 150 V200 H0z" fill="#6cbf45"/>
    <path d="M150 200 Q175 170 205 160 Q240 150 260 142" stroke="#f1d9a8" stroke-width="16" fill="none" stroke-linecap="round" opacity=".9"/>
    <g transform="translate(12 160)">${[0, 12, 24].map((i) => `<rect x="0" y="${i}" width="92" height="7" rx="3" fill="#a9703c"/>${[8, 26, 44, 62, 80].map((x) => `<circle cx="${x}" cy="${i - 1}" r="4" fill="#58c45a"/>`).join('')}`).join('')}</g>
    ${[300, 322, 346, 372].map((x, i) => `<circle cx="${x}" cy="${178 + (i % 2) * 10}" r="3.5" fill="${['#fff3c4', '#ffb3cf', '#fff', '#ffd27a'][i]}"/>`).join('')}
    <g class="ha-smoke"><circle cx="107" cy="58" r="4" fill="#fff" opacity=".8"/><circle cx="112" cy="48" r="5" fill="#fff" opacity=".6"/><circle cx="118" cy="36" r="6" fill="#fff" opacity=".4"/></g>
    <g class="ha-walk ha-w1">${img('f01', 116, 138, 42)}</g>
    <g class="ha-walk ha-w2">${img('f37', 206, 136, 40)}</g>
    <g class="ha-walk ha-w3">${img('f20', 292, 134, 38)}</g>
    <g class="ha-coin"><circle cx="196" cy="120" r="8" fill="#ffd34d" stroke="#e8a317" stroke-width="2"/><text x="196" y="124" text-anchor="middle" font-size="10" font-weight="800" fill="#b97a08">$</text></g>
  `, 'A little town with cottages, a barn, a field and three Fuzzy neighbours');
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
