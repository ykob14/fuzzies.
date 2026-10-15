/** Fuzzies topic icons, part SPORTS — original flat vector artwork drawn in code. */
import type { AssetDef } from '../index';
import { asset, dk, lt } from '../draw';

const A = asset('icons', ['icon']);

// ---------- shared drawing bits (one outline weight, one shadow, round joins everywhere) ----------
const f = (n: number) => n.toFixed(1);
const R = 'stroke-linecap="round" stroke-linejoin="round"';
/** Stroke attributes (outline) for a filled shape. */
const st = (c: string, w = 10) => `stroke="${c}" stroke-width="${w}" ${R}`;
/** An open line. */
const ln = (c: string, w: number) => `fill="none" stroke="${c}" stroke-width="${w}" ${R}`;
const shadow = (cx = 120, cy = 216, rx = 70) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="8" fill="#000" opacity=".10"/>`;
/** A thick rounded bar with a 10px outline: the outline stroke underneath, the colour on top. */
const bar = (d: string, fill: string, a: string, w: number, o = 10) => `<path d="${d}" ${ln(a, w + o * 2)}/><path d="${d}" ${ln(fill, w)}/>`;
const pts = (list: number[][]) => list.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L');
const poly = (list: number[][]) => `M${pts(list)}Z`;
/** Regular polygon / star points. */
const ngon = (x: number, y: number, r: number, n: number, rot = -90) =>
  Array.from({ length: n }, (_, i) => { const t = ((rot + (i * 360) / n) * Math.PI) / 180; return [x + r * Math.cos(t), y + r * Math.sin(t)]; });
const star = (x: number, y: number, r: number, inner = 0.45) =>
  Array.from({ length: 10 }, (_, i) => { const t = ((-90 + i * 36) * Math.PI) / 180, k = i % 2 ? r * inner : r; return [x + k * Math.cos(t), y + k * Math.sin(t)]; });
/** Short ticks across a quadratic curve (ball stitching). */
function stitches(p0: number[], c: number[], p1: number[], n: number, len: number): string {
  let d = '';
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1), u = 1 - t;
    const x = u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], y = u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1];
    const dx = 2 * u * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]), dy = 2 * u * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]);
    const k = Math.hypot(dx, dy) || 1, nx = -dy / k, ny = dx / k;
    d += `M${f(x - nx * len)} ${f(y - ny * len)}L${f(x + nx * len)} ${f(y + ny * len)}`;
  }
  return d;
}
/** A soft white shine stroke. */
const shine = (d: string, w = 9) => `<path d="${d}" ${ln('#ffffff', w)} opacity=".5"/>`;

// ---------- icons ----------
function soccer([m, a]: string[]): string {
  const cx = 120, cy = 114, r = 26;
  const c0 = ngon(cx, cy, r, 5);
  const outs = [0, 1, 2, 3, 4].map((k) => { const th = -90 + 72 * k, t = (th * Math.PI) / 180; return ngon(cx + 78 * Math.cos(t), cy + 78 * Math.sin(t), r, 5, th + 180); });
  let lines = '';
  for (let k = 0; k < 5; k++) {
    lines += `M${f(c0[k][0])} ${f(c0[k][1])}L${f(outs[k][0][0])} ${f(outs[k][0][1])}`;
    // hexagon edge between neighbouring outer patches
    const A1 = outs[k], B1 = outs[(k + 1) % 5];
    let best = [A1[0], B1[0]], bd = 1e9;
    for (const p of A1.slice(1)) for (const q of B1.slice(1)) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; best = [p, q]; } }
    lines += `M${f(best[0][0])} ${f(best[0][1])}L${f(best[1][0])} ${f(best[1][1])}`;
    // seams running off the edge
    for (const p of [A1[2], A1[3]]) { const dx = p[0] - cx, dy = p[1] - cy, k2 = Math.hypot(dx, dy); lines += `M${f(p[0])} ${f(p[1])}L${f(p[0] + (dx / k2) * 30)} ${f(p[1] + (dy / k2) * 30)}`; }
  }
  return shadow(120, 216, 66) +
    `<defs><clipPath id="ic-soccer-clip"><circle cx="${cx}" cy="${cy}" r="86"/></clipPath></defs>` +
    `<circle cx="${cx}" cy="${cy}" r="88" fill="${lt(m, 0.9)}"/>` +
    `<g clip-path="url(#ic-soccer-clip)"><path d="${lines}" ${ln(a, 7)}/>` +
    `<path d="${[c0, ...outs].map(poly).join('')}" fill="${a}" ${st(a, 6)}/>` +
    `<path d="M120 202A88 88 0 0 0 208 114" ${ln(lt(m, 0.55), 14)} opacity=".55"/></g>` +
    `<circle cx="${cx}" cy="${cy}" r="88" fill="none" ${st(a)}/>`;
}

function volleyball([m, a]: string[]): string {
  const band = `M120 116C120 82 106 50 70 34L96 26C134 46 148 84 146 108Z`;
  const seam = `M120 116C120 82 106 50 70 34M146 108C148 84 134 46 96 26`;
  const rot = [0, 120, 240];
  return shadow(120, 216, 66) +
    `<defs><clipPath id="ic-volleyball-clip"><circle cx="120" cy="116" r="86"/></clipPath></defs>` +
    `<circle cx="120" cy="116" r="88" fill="${lt(m, 0.8)}"/>` +
    `<g clip-path="url(#ic-volleyball-clip)">` +
    rot.map((r) => `<path d="${band}" fill="${m}" transform="rotate(${r} 120 116)"/>`).join('') +
    rot.map((r) => `<path d="${seam}" ${ln(a, 8)} transform="rotate(${r} 120 116)"/>`).join('') +
    `</g><circle cx="120" cy="116" r="88" fill="none" ${st(a)}/>`;
}

function medal([m, a]: string[]): string {
  return shadow(120, 220, 52) +
    `<path d="M58 20H98L140 112L106 124Z" fill="${lt(a, 0.45)}" ${st(a)}/>` +
    `<path d="M182 20H142L100 112L134 124Z" fill="${lt(a, 0.25)}" ${st(a)}/>` +
    `<path d="M78 24L118 112M162 24L122 112" ${ln('#ffffff', 7)} opacity=".6"/>` +
    `<rect x="106" y="98" width="28" height="20" rx="7" fill="${dk(m, 0.2)}" ${st(a, 8)}/>` +
    `<circle cx="120" cy="160" r="52" fill="${m}" ${st(a)}/>` +
    `<circle cx="120" cy="160" r="36" fill="none" stroke="${dk(m, 0.2)}" stroke-width="7"/>` +
    `<path d="${poly(star(120, 161, 24))}" fill="${lt(m, 0.6)}" ${st(dk(m, 0.2), 5)}/>` +
    shine('M84 138A40 40 0 0 1 104 118', 8);
}

export const ICONS_SPORTS: AssetDef[] = [
  A('ic-basketball', 'Basketball', 'illustration', 240, 240, ['#e8743b', '#1f2a44'], ['basketball', 'ball', 'sport', 'hoops', 'nba'], ([m, a]) =>
    shadow(120, 216, 66) +
    `<circle cx="120" cy="114" r="88" fill="${m}" ${st(a)}/>` +
    `<path d="M120 26V202M32 114H208M58 50C94 82 94 146 58 178M182 50C146 82 146 146 182 178" ${ln(a, 9)}/>` +
    shine('M100 44Q108 40 112 39')),

  A('ic-hockey', 'Hockey', 'illustration', 240, 240, ['#3b82c4', '#1f2a44'], ['hockey', 'ice hockey', 'stick', 'puck', 'sport', 'nhl'], ([m, a]) =>
    shadow(120, 210, 92) +
    bar('M178 26L104 160Q94 180 74 180L40 180', m, a, 18) +
    `<path d="M178 26L164 51" ${ln(a, 22)}/>` +
    `<path d="M56 172V188M70 172V188" ${ln('#ffffff', 6)} opacity=".7"/>` +
    `<path d="M128 174V188A40 13 0 0 0 208 188V174Z" fill="${a}" ${st(a)}/>` +
    `<ellipse cx="168" cy="174" rx="40" ry="13" fill="${lt(a, 0.35)}" ${st(a)}/>` +
    shine('M150 170Q160 166 172 166', 7)),

  A('ic-soccer', 'Soccer', 'illustration', 240, 240, ['#3aa655', '#1f2a44'], ['soccer', 'football', 'ball', 'sport', 'futbol', 'fifa'], soccer),

  A('ic-football', 'American football', 'illustration', 240, 240, ['#9a5530', '#2b1d16'], ['american football', 'football', 'nfl', 'super bowl', 'ball', 'sport'], ([m, a]) =>
    shadow(120, 214, 74) +
    `<g transform="rotate(-35 120 116) translate(120 116) scale(1.06) translate(-120 -116)">` +
    `<path d="M24 116Q120 18 216 116Q120 214 24 116Z" fill="${m}" ${st(a)}/>` +
    `<path d="M64 94Q73 116 64 138M176 94Q167 116 176 138" ${ln('#ffffff', 8)}/>` +
    `<path d="M92 116H148M98 106V126M110 106V126M122 106V126M134 106V126M146 106V126" ${ln('#ffffff', 6)}/>` +
    `<path d="M88 84Q110 74 134 74" ${ln('#ffffff', 8)} opacity=".35"/></g>`),

  A('ic-baseball', 'Baseball', 'illustration', 240, 240, ['#d64541', '#2b2d42'], ['baseball', 'bat', 'ball', 'sport', 'mlb', 'home run'], ([m, a]) =>
    shadow(124, 216, 84) +
    `<g transform="translate(34 204) rotate(-48) scale(1.08)">` +
    `<path d="M6 -8L80 -8C110 -9 130 -23 160 -23L184 -23A23 23 0 0 1 184 23L160 23C130 23 110 9 80 8L6 8Z" fill="${lt(m, 0.15)}" ${st(a)}/>` +
    `<rect x="6" y="-8" width="50" height="16" rx="6" fill="${a}"/><ellipse cx="2" cy="0" rx="7" ry="14" fill="${a}" ${st(a, 6)}/>` +
    `<path d="M120 -12C140 -15 160 -13 184 -13" ${ln('#ffffff', 6)} opacity=".45"/></g>` +
    `<circle cx="160" cy="164" r="44" fill="${lt(m, 0.92)}" ${st(a)}/>` +
    `<path d="M136 128Q156 164 136 200M184 128Q164 164 184 200" ${ln(m, 6)}/>` +
    `<path d="${stitches([136, 128], [156, 164], [136, 200], 5, 6)}${stitches([184, 128], [164, 164], [184, 200], 5, 6)}" ${ln(m, 5)}/>`),

  A('ic-volleyball', 'Volleyball', 'illustration', 240, 240, ['#f2b33d', '#1f3a5f'], ['volleyball', 'beach volleyball', 'ball', 'sport'], volleyball),

  A('ic-tennis', 'Tennis', 'illustration', 240, 240, ['#c8dc3c', '#1f3b73'], ['tennis', 'racket', 'racquet', 'ball', 'sport', 'wimbledon'], ([m, a]) => {
    let strings = '';
    for (let x = -32; x <= 32; x += 16) strings += `M${x} -60V60`;
    for (let y = -48; y <= 48; y += 16) strings += `M-50 ${y}H50`;
    return shadow(120, 216, 78) +
      `<g transform="translate(94 96) rotate(-38) scale(.84)">` +
      `<defs><clipPath id="ic-tennis-clip"><ellipse cx="0" cy="0" rx="44" ry="56"/></clipPath></defs>` +
      `<path d="M-30 52L0 100L30 52" ${ln(a, 14)}/>` +
      `<rect x="-11" y="94" width="22" height="80" rx="10" fill="${m}" ${st(a)}/>` +
      `<path d="M-11 112L11 104M-11 130L11 122M-11 148L11 140" ${ln(dk(m, 0.25), 6)}/>` +
      `<g clip-path="url(#ic-tennis-clip)"><path d="${strings}" ${ln(lt(a, 0.55), 6)}/></g>` +
      `<ellipse cx="0" cy="0" rx="52" ry="64" fill="none" ${st(a, 16)}/></g>` +
      `<circle cx="178" cy="66" r="32" fill="${m}" ${st(a)}/>` +
      `<path d="M155.4 43.4Q175 66 155.4 88.6M200.6 43.4Q181 66 200.6 88.6" ${ln('#ffffff', 7)}/>`;
  }),

  A('ic-badminton', 'Badminton', 'illustration', 240, 240, ['#2fb39a', '#1f2a44'], ['badminton', 'shuttlecock', 'birdie', 'racket', 'sport'], ([m, a]) => {
    let strings = '';
    for (let x = -24; x <= 24; x += 12) strings += `M${x} -50V50`;
    for (let y = -36; y <= 36; y += 12) strings += `M-40 ${y}H40`;
    return shadow(120, 216, 80) +
      `<g transform="translate(158 82) rotate(38) scale(.86)">` +
      `<defs><clipPath id="ic-badminton-clip"><ellipse cx="0" cy="0" rx="34" ry="44"/></clipPath></defs>` +
      `<g clip-path="url(#ic-badminton-clip)"><path d="${strings}" ${ln(lt(a, 0.55), 5)}/></g>` +
      `<ellipse cx="0" cy="0" rx="40" ry="50" fill="none" ${st(a, 13)}/>` +
      `<path d="M0 56V112" ${ln(a, 9)}/>` +
      `<rect x="-11" y="108" width="22" height="62" rx="10" fill="${m}" ${st(a)}/>` +
      `<path d="M-11 124L11 116M-11 142L11 134" ${ln(dk(m, 0.25), 6)}/></g>` +
      `<g transform="translate(78 92) rotate(-140)">` +
      `<path d="M-15 6L-40 -68Q0 -80 40 -68L15 6Z" fill="${lt(m, 0.88)}" ${st(a)}/>` +
      `<path d="M-6 4L-14 -72M6 4L14 -72" ${ln(a, 6)}/>` +
      `<path d="M-30 -38Q0 -46 30 -38" ${ln(m, 9)}/>` +
      `<path d="M-19 4H19V14A19 19 0 0 1 -19 14Z" fill="${m}" ${st(a)}/></g>`;
  }),

  A('ic-swimming', 'Swimming', 'illustration', 240, 240, ['#2f8fd8', '#1f2a44'], ['swimming', 'swim', 'pool', 'goggles', 'water', 'sport', 'olympics'], ([m, a]) =>
    `<path d="M26 86Q16 90 18 104M214 86Q224 90 222 104" ${ln(a, 12)}/>` +
    `<path d="M50 90H26M190 90H214" ${ln(a, 12)}/>` +
    `<ellipse cx="82" cy="92" rx="34" ry="27" fill="${m}" ${st(a)}/>` +
    `<ellipse cx="158" cy="92" rx="34" ry="27" fill="${m}" ${st(a)}/>` +
    `<path d="M114 90Q120 80 126 90" ${ln(a, 10)}/>` +
    `<path d="M66 82Q74 74 86 74M142 82Q150 74 162 74" ${ln('#ffffff', 8)} opacity=".75"/>` +
    `<path d="M22 156q16 -16 32 0t32 0t32 0t32 0t32 0t32 0" ${ln(m, 13)}/>` +
    `<path d="M38 194q16 -16 32 0t32 0t32 0t32 0t32 0" ${ln(lt(m, 0.45), 13)}/>`),

  A('ic-boxing', 'Boxing', 'illustration', 240, 240, ['#d93b3b', '#2b1f2a'], ['boxing', 'glove', 'boxing glove', 'fight', 'sport', 'kickboxing'], ([m, a]) => {
    const fist = 'M74 152C58 112 58 58 100 40C142 24 188 44 188 94C188 126 178 146 166 154Z';
    const thumb = '<ellipse cx="72" cy="122" rx="26" ry="34" transform="rotate(-18 72 122)"/>';
    const cuff = '<rect x="80" y="146" width="90" height="60" rx="14"/>';
    return shadow(126, 218, 64) +
      `<g fill="${a}" stroke="${a}" stroke-width="20" ${R}><path d="${fist}"/>${thumb}${cuff}</g>` +
      `<path d="${fist}" fill="${m}"/><g fill="${m}">${thumb}</g><g fill="${lt(m, 0.85)}">${cuff}</g>` +
      `<path d="M80 172H170" ${ln(m, 12)}/>` +
      `<path d="M96 104Q86 128 96 148" ${ln(a, 8)}/>` +
      `<path d="M96 146H160" ${ln(dk(m, 0.25), 8)}/>` +
      shine('M108 58Q132 46 156 54', 10);
  }),

  A('ic-martial-arts', 'Martial arts', 'illustration', 240, 240, ['#d9473f', '#22223b'], ['martial arts', 'karate', 'judo', 'taekwondo', 'belt', 'dojo', 'sport'], ([m, a]) =>
    shadow(120, 216, 70) +
    bar('M24 94Q120 124 216 94', m, a, 30) +
    `<path d="M30 96Q120 122 210 96" fill="none" stroke="${lt(m, 0.45)}" stroke-width="6" stroke-dasharray="10 12" ${R}/>` +
    bar('M106 120L70 198', m, a, 30) + bar('M134 120L170 198', m, a, 30) +
    `<path d="M83 170L77 183M157 170L163 183" fill="none" stroke="${a}" stroke-width="30"/>` +
    `<rect x="88" y="84" width="64" height="54" rx="14" fill="${m}" ${st(a)}/>` +
    `<path d="M96 96L144 126" ${ln(a, 9)}/>` +
    shine('M100 92Q110 90 118 92', 6)),

  A('ic-golf', 'Golf', 'illustration', 240, 240, ['#3aa65b', '#1f2a44'], ['golf', 'flag', 'green', 'golf ball', 'hole', 'sport', 'pga'], ([m, a]) =>
    `<ellipse cx="120" cy="190" rx="98" ry="28" fill="${lt(m, 0.35)}" ${st(a)}/>` +
    `<ellipse cx="128" cy="196" rx="70" ry="16" fill="${m}"/>` +
    `<ellipse cx="146" cy="192" rx="17" ry="7" fill="${a}"/>` +
    `<path d="M146 190V28" ${ln(a, 10)}/>` +
    `<path d="M152 30Q178 34 204 48Q180 62 152 70Z" fill="${m}" ${st(a)}/>` +
    `<circle cx="80" cy="168" r="20" fill="#ffffff" ${st(a, 8)}/>` +
    `<circle cx="74" cy="164" r="3" fill="${lt(a, 0.65)}"/><circle cx="86" cy="164" r="3" fill="${lt(a, 0.65)}"/><circle cx="80" cy="174" r="3" fill="${lt(a, 0.65)}"/>`),

  A('ic-cycling', 'Cycling', 'illustration', 240, 240, ['#e8743b', '#1f2a44'], ['cycling', 'bike', 'bicycle', 'ride', 'tour', 'sport'], ([m, a]) =>
    shadow(120, 200, 100) +
    `<circle cx="60" cy="146" r="44" fill="none" ${st(a, 13)}/><circle cx="180" cy="146" r="44" fill="none" ${st(a, 13)}/>` +
    `<circle cx="60" cy="146" r="31" fill="none" stroke="${lt(m, 0.55)}" stroke-width="6"/><circle cx="180" cy="146" r="31" fill="none" stroke="${lt(m, 0.55)}" stroke-width="6"/>` +
    `<path d="M60 146L108 146L88 84ZM88 84L160 84L108 146M160 84L180 146M160 84L154 64M88 84L84 68" ${ln(a, 24)}/>` +
    `<path d="M60 146L108 146L88 84ZM88 84L160 84L108 146M160 84L180 146M160 84L154 64M88 84L84 68" ${ln(m, 11)}/>` +
    `<path d="M70 64H100" ${ln(a, 12)}/><path d="M142 62Q156 58 170 64" ${ln(a, 11)}/>` +
    `<circle cx="108" cy="146" r="13" fill="${lt(m, 0.55)}" ${st(a, 8)}/>` +
    `<circle cx="60" cy="146" r="7" fill="${a}"/><circle cx="180" cy="146" r="7" fill="${a}"/>`),

  A('ic-running', 'Running', 'illustration', 240, 240, ['#e8743b', '#1f2a44'], ['running', 'run', 'shoe', 'sneaker', 'jogging', 'track', 'sport'], ([m, a]) =>
    shadow(136, 210, 84) +
    `<path d="M14 116H40M8 144H34M18 172H36" ${ln(a, 10)}/>` +
    `<g transform="translate(10 0)">` +
    `<path d="M50 168H202Q222 168 220 184Q218 198 200 198H58Q42 198 42 184Q42 168 50 168Z" fill="${lt(m, 0.85)}" ${st(a)}/>` +
    `<path d="M54 170L56 104Q58 88 74 88Q90 88 96 100Q104 112 116 108Q120 92 132 94Q142 96 142 110L142 122L178 130Q214 138 216 168Z" fill="${m}" ${st(a)}/>` +
    `<path d="M78 152Q120 160 172 140" ${ln(lt(m, 0.5), 9)}/>` +
    `<path d="M118 122L136 116M124 134L144 128M132 146L152 138" ${ln('#ffffff', 7)}/>` +
        `<path d="M50 184H212" ${ln(lt(m, 0.55), 6)} opacity=".8"/></g>`),

  A('ic-marathon', 'Marathon medal', 'illustration', 240, 240, ['#f2b33d', '#2f4fa8'], ['marathon', 'medal', 'finisher', 'race', 'running', '5k', '10k', 'half marathon', 'sport'], medal),

  A('ic-cricket', 'Cricket', 'illustration', 240, 240, ['#e2b36a', '#8f2a2a'], ['cricket', 'bat', 'ball', 'wicket', 'ipl', 'sport'], ([m, a]) =>
    shadow(120, 216, 84) +
    `<g transform="translate(150 22) rotate(30) scale(.84)">` +
    `<rect x="-9" y="0" width="18" height="80" rx="8" fill="${a}" ${st(a, 8)}/>` +
    `<path d="M-9 18H9M-9 36H9M-9 54H9" ${ln(lt(a, 0.45), 6)}/>` +
    `<path d="M-9 74L-25 90V222Q-25 234 -13 234H13Q25 234 25 222V90L9 74Z" fill="${m}" ${st(a)}/>` +
    `<path d="M0 98V218" ${ln(lt(m, 0.45), 8)}/></g>` +
    `<circle cx="168" cy="178" r="30" fill="${a}" ${st(a, 8)}/>` +
    `<path d="M140 170Q168 162 196 170M140 184Q168 176 196 184" ${ln('#ffffff', 5)} stroke-dasharray="1 8"/>` +
    `<path d="M140 177Q168 169 196 177" ${ln(lt(a, 0.4), 6)}/>` +
    shine('M152 160Q158 154 166 152', 7)),

  A('ic-rugby', 'Rugby', 'illustration', 240, 240, ['#2a9d8f', '#1f2a44'], ['rugby', 'rugby ball', 'ball', 'six nations', 'sport'], ([m, a]) => {
    const body = 'M22 116C40 66 84 50 120 50C156 50 200 66 218 116C200 166 156 182 120 182C84 182 40 166 22 116Z';
    return shadow(120, 214, 74) +
      `<g transform="rotate(-32 120 116)">` +
      `<path d="${body}" fill="${m}"/>` +
      `<path d="M24 116C70 84 170 84 216 116C170 148 70 148 24 116Z" fill="${lt(m, 0.85)}"/>` +
      `<path d="M24 116C70 84 170 84 216 116M24 116C70 148 170 148 216 116" ${ln(a, 8)}/>` +
      `<path d="${stitches([24, 116], [120, 52], [216, 116], 9, 6).split('M').slice(3, 8).map((x) => 'M' + x).join('')}" ${ln(a, 5)}/>` +
      `<path d="${body}" fill="none" ${st(a)}/>` +
      `<path d="M70 76Q92 64 116 62" ${ln('#ffffff', 8)} opacity=".45"/></g>`;
  }),

  A('ic-table-tennis', 'Table tennis', 'illustration', 240, 240, ['#d93b3b', '#1f2a44'], ['table tennis', 'ping pong', 'paddle', 'bat', 'sport'], ([m, a]) =>
    shadow(118, 216, 74) +
    bar('M140 140L184 192', lt(m, 0.6), a, 26) +
    `<path d="M171 177L184 192" ${ln(a, 26)}/>` +
    `<circle cx="100" cy="98" r="66" fill="${m}" ${st(a)}/>` +
    `<circle cx="100" cy="98" r="50" fill="none" stroke="${dk(m, 0.18)}" stroke-width="6"/>` +
    shine('M62 74A46 46 0 0 1 86 52', 10) +
    `<circle cx="190" cy="68" r="20" fill="#ffffff" ${st(a, 9)}/>` ),

  A('ic-skiing', 'Skiing', 'illustration', 240, 240, ['#3b82c4', '#1f2a44'], ['skiing', 'ski', 'skis', 'snow', 'mountain', 'winter', 'slopes', 'sport'], ([m, a]) => {
    const ski = 'M-92 0H76Q98 0 96 -18';
    return `<path d="M18 186L100 52L134 104L160 74L222 186Z" fill="${lt(m, 0.55)}" ${st(a)}/>` +
      `<path d="M100 52L123.7 88.8L112 82L100 94L88 82L78 87.9Z" fill="#ffffff" ${st(a, 8)}/>` +
      `<path d="M160 74L171.6 96L164 92L156 98L145.2 91.3Z" fill="#ffffff" ${st(a, 8)}/>` +
      `<g transform="translate(120 172) rotate(-22)">${bar(ski, m, a, 14)}<rect x="-58" y="-11" width="26" height="22" rx="6" fill="${a}"/></g>` +
      `<g transform="translate(120 172) scale(-1 1) rotate(-22)">${bar(ski, m, a, 14)}<rect x="-58" y="-11" width="26" height="22" rx="6" fill="${a}"/></g>`;
  }),

  A('ic-climbing', 'Climbing', 'illustration', 240, 240, ['#e8743b', '#1f2a44'], ['climbing', 'rock climbing', 'bouldering', 'carabiner', 'mountain', 'sport'], ([m, a]) => {
    const ring = 'M-24 -56A24 24 0 0 1 24 -56L40 28A40 40 0 0 1 -40 28Z';
    return `<path d="M16 196L76 100L104 136L150 58L224 196Z" fill="${lt(a, 0.72)}" ${st(a)}/>` +
      `<path d="M150 58L170.7 96.9L160 92L150 102L140 92L130.4 95.4Z" fill="#ffffff" ${st(a, 8)}/>` +
      `<g transform="translate(118 124) rotate(14)">` +
      `<path d="${ring}" ${ln(a, 36)}/><path d="${ring}" ${ln(m, 16)}/>` +
      `<path d="M28 -38L37 14" ${ln(a, 34)}/><path d="M28 -38L37 14" ${ln(lt(m, 0.6), 14)}/>` +
      `<circle cx="37" cy="18" r="9" fill="${a}"/>` +
      `<path d="M-28 -30L-36 20" ${ln('#ffffff', 6)} opacity=".55"/></g>`;
  }),

  A('ic-skateboarding', 'Skateboarding', 'illustration', 240, 240, ['#e8743b', '#1f2a44'], ['skateboarding', 'skateboard', 'skate', 'skatepark', 'sport'], ([m, a]) =>
    shadow(120, 210, 92) +
    `<g transform="rotate(-16 120 120) translate(-12 -8) scale(1.1)">` +
    `<path d="M66 118H86L82 132H70Z" fill="${lt(a, 0.4)}" ${st(a, 8)}/><path d="M154 118H174L170 132H158Z" fill="${lt(a, 0.4)}" ${st(a, 8)}/>` +
    `<circle cx="76" cy="142" r="15" fill="${lt(m, 0.8)}" ${st(a)}/><circle cx="164" cy="142" r="15" fill="${lt(m, 0.8)}" ${st(a)}/>` +
    `<circle cx="76" cy="142" r="4" fill="${a}"/><circle cx="164" cy="142" r="4" fill="${a}"/>` +
    bar('M24 94Q38 112 62 112H178Q202 112 216 94', m, a, 16) +
    `<path d="M70 112H170" ${ln(lt(m, 0.45), 6)}/></g>`),

  A('ic-yoga', 'Yoga', 'illustration', 240, 240, ['#e86a92', '#3b2747'], ['yoga', 'lotus', 'meditation', 'wellness', 'mindfulness', 'pilates', 'zen'], ([m, a]) => {
    const petal = (L: number, W: number) => `M0 0C${W} ${-0.3 * L} ${0.6 * W} ${-0.75 * L} 0 ${-L}C${-0.6 * W} ${-0.75 * L} ${-W} ${-0.3 * L} 0 0Z`;
    const at = (rot: number, L: number, W: number, c: string) => `<path d="${petal(L, W)}" fill="${c}" ${st(a)} transform="translate(120 170) rotate(${rot})"/>`;
    return shadow(120, 210, 84) +
      at(-74, 84, 34, lt(m, 0.5)) + at(74, 84, 34, lt(m, 0.5)) +
      at(-38, 112, 40, lt(m, 0.25)) + at(38, 112, 40, lt(m, 0.25)) +
      at(0, 132, 46, m) +
      `<path d="M120 152V70" ${ln(lt(m, 0.4), 7)} opacity=".8"/>` +
      `<path d="M34 182Q120 206 206 182" ${ln(a, 12)}/>`;
  }),

  A('ic-esports', 'Esports', 'illustration', 240, 240, ['#2fb39a', '#1f2a44'], ['esports', 'gaming', 'video games', 'controller', 'gamer', 'tournament', 'twitch'], ([m, a]) =>
    shadow(120, 208, 92) +
    `<path d="M72 64H168C198 64 212 92 218 126C224 164 212 190 190 190C174 190 166 176 156 160H84C74 176 66 190 50 190C28 190 16 164 22 126C28 92 42 64 72 64Z" fill="${m}" ${st(a)}/>` +
    `<rect x="62" y="92" width="16" height="44" rx="4" fill="${a}"/><rect x="48" y="106" width="44" height="16" rx="4" fill="${a}"/>` +
    `<circle cx="174" cy="96" r="9" fill="#ffffff"/><circle cx="174" cy="132" r="9" fill="${lt(m, 0.55)}"/><circle cx="156" cy="114" r="9" fill="${lt(m, 0.55)}"/><circle cx="192" cy="114" r="9" fill="#ffffff"/>` +
    `<circle cx="100" cy="148" r="14" fill="${a}"/><circle cx="140" cy="148" r="14" fill="${a}"/>` +
    `<path d="M110 98H130" ${ln(dk(m, 0.25), 8)}/>` +
    shine('M64 78Q90 74 118 74', 8)),

  A('ic-pickleball', 'Pickleball', 'illustration', 240, 240, ['#e8743b', '#1f2a44'], ['pickleball', 'paddle', 'ball', 'sport', 'court'], ([m, a]) => {
    const holes = [[0, 0], ...ngon(0, 0, 17, 6, -90)].map(([x, y]) => `<circle cx="${f(180 + x)}" cy="${f(70 + y)}" r="5" fill="${a}"/>`).join('');
    return shadow(126, 216, 80) +
      `<g transform="translate(98 100) rotate(-28)">` +
      `<rect x="-13" y="54" width="26" height="70" rx="10" fill="${a}"/>` +
      `<path d="M-13 76L13 68M-13 96L13 88M-13 116L13 108" ${ln(lt(a, 0.4), 6)}/>` +
      `<path d="M-48 -42Q-48 -80 0 -80Q48 -80 48 -42V30Q48 60 20 60H-20Q-48 60 -48 30Z" fill="${m}" ${st(a)}/>` +
      `<path d="M-34 -40Q-34 -66 0 -66Q34 -66 34 -40V28Q34 46 16 46H-16Q-34 46 -34 28Z" fill="none" stroke="${lt(m, 0.4)}" stroke-width="6"/></g>` +
      `<circle cx="180" cy="70" r="34" fill="${lt(m, 0.65)}" ${st(a)}/>${holes}`;
  }),

  A('ic-softball', 'Softball', 'illustration', 240, 240, ['#f2d43d', '#6b3a1e'], ['softball', 'glove', 'mitt', 'ball', 'sport', 'baseball'], ([m, a]) => {
    const glove = 'M58 198C38 172 34 122 42 94C46 78 62 76 68 90L74 108L78 58C80 38 104 38 106 56L108 50C110 30 136 30 138 50L140 58C144 40 168 42 168 62L166 98C172 82 194 86 192 106C188 142 180 174 160 198Z';
    return shadow(116, 214, 76) +
      `<path d="${glove}" fill="${lt(a, 0.3)}" ${st(a)}/>` +
      `<path d="M106 60L108 112M138 56L136 112M166 98L160 122" ${ln(a, 8)}/>` +
      `<path d="M68 94Q74 128 92 140" ${ln(dk(lt(a, 0.3), 0.2), 8)}/>` +
      `<path d="M88 54Q92 46 98 46" ${ln('#ffffff', 6)} opacity=".45"/>` +
      `<circle cx="128" cy="154" r="42" fill="${m}" ${st(a)}/>` +
      `<path d="M104 120Q124 154 104 188M152 120Q132 154 152 188" ${ln(a, 6)}/>` +
      `<path d="${stitches([104, 120], [124, 154], [104, 188], 4, 6)}${stitches([152, 120], [132, 154], [152, 188], 4, 6)}" ${ln(a, 5)}/>`;
  }),

  A('ic-gymnastics', 'Gymnastics', 'illustration', 240, 240, ['#e05a8a', '#3b2747'], ['gymnastics', 'rhythmic gymnastics', 'ribbon', 'gymnast', 'sport', 'olympics'], ([m, a]) => {
    const rib = 'M86 162C130 160 196 140 182 96C170 58 104 64 108 104C112 140 196 120 200 70C204 34 160 18 120 32C84 44 66 30 58 18';
    const sp = (x: number, y: number, r: number) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${lt(m, 0.35)}" ${st(lt(m, 0.35), 4)}/>`;
    return shadow(80, 216, 40) +
      bar(rib, m, a, 16) +
      `<path d="M50 210L86 160" ${ln(a, 14)}/><circle cx="48" cy="212" r="10" fill="${a}"/>` +
      `<path d="M150 70Q166 68 176 80" ${ln('#ffffff', 6)} opacity=".5"/>` +
      sp(52, 92, 14) + sp(204, 176, 12) + sp(30, 140, 9);
  }),

  A('ic-surfing', 'Surfing', 'illustration', 240, 240, ['#2f8fd8', '#1f2a44'], ['surfing', 'surf', 'surfboard', 'wave', 'beach', 'ocean', 'summer', 'sport'], ([m, a]) =>
    `<g transform="translate(6 22) scale(.86)">` +
    `<path d="M16 210C16 132 64 66 132 62C186 58 214 100 198 138C186 164 150 162 146 136C143 118 160 108 172 116C150 90 116 100 104 124C88 156 92 186 112 210Z" fill="${m}" ${st(a, 11.6)}/>` +
    `<path d="M168 110C146 92 118 104 108 124" ${ln(lt(m, 0.55), 11)}/>` +
    `<path d="M50 120Q82 76 134 72" ${ln('#ffffff', 11)} opacity=".75"/>` +
    `<circle cx="206" cy="112" r="7" fill="#ffffff"/><circle cx="214" cy="94" r="5" fill="#ffffff"/></g>` +
    `<path d="M20 204H220" ${ln(a, 10)}/>` +
    `<g transform="translate(192 120) rotate(12)">` +
    `<path d="M0 -96C22 -64 26 34 14 80Q0 98 -14 80C-26 34 -22 -64 0 -96Z" fill="${lt(m, 0.9)}" ${st(a)}/>` +
    `<path d="M0 -78V78" ${ln(m, 8)}/>` +
    `<path d="M-4 66L-14 94L6 82Z" fill="${a}" ${st(a, 6)}/></g>`),
];
