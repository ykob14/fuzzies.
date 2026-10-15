/**
 * Professional photo templates (owner: "add any more templates that you think are really good and professional").
 * Built on the team kit (team.ts themes, header band, pills; teamStyles.ts photo helpers), every photo a tap-to-fill frame:
 *
 * - `feature`  header band + one big photo frame + a label and lines (bullets) + a closing pill. Square pages put the photo
 *              left and the words right; tall pages stack them. Hiring, webinars, home listings, RA floor meetings & events.
 * - `quote`    a customer review: big quote mark, the words, five stars, a round photo, name and role on a light page.
 * Speaker line-ups and the RA duty rota reuse `circles` and `directory` from teamStyles.ts.
 */
import { box, text, type CollectionTemplate, type Kit } from './kit';
import { widthOf } from '../layouts';
import { header, NAMES, RA_TAGS, T, tpl, type Theme } from './team';
import { L, lookPic, pic, themePic, type Look } from './teamStyles';

const para = (c: Kit, s: string, x: number, y: number, w: number, o: { font: string; weight: number; size: number; fill: string; lh?: number; align?: 'left' | 'center'; name: string; upper?: boolean; spacing?: number }) =>
  text(c, s, x, y, w, { lines: 40, lh: o.lh ?? 1.35, align: o.align ?? 'left', font: o.font, weight: o.weight, size: o.size, fill: o.fill, upper: o.upper, spacing: o.spacing, name: o.name });
/** Small spaced capitals. */
const caps = (c: Kit, s: string, x: number, y: number, w: number, fill: string, font: string, size: number, align: 'left' | 'center' = 'left', name = 'Label') =>
  text(c, s, x, y, w, { font, weight: 700, size: c.u * size, fill, upper: true, spacing: c.u * 0.005, align, name });

// ---------- hiring: a square post split into words + a full-bleed photo ----------
function hiringSplit(c: Kit, th: Theme, o: { brand: string; title: string; roles: string[]; apply: string; sticker: string }): void {
  const { W, H, u } = c, m = W * 0.075, lw = W * 0.47;
  c.bg = th.page;
  themePic(c, th, 0, W * 0.52, 0, W * 0.48, H, 'none', 0);
  caps(c, o.brand, m, m, lw, th.frame, th.kFont[0], 0.028, 'left', 'Brand');
  const t = text(c, o.title, m, m + u * 0.06, lw, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.14, fill: th.head, lh: 0.95, lines: 2, align: 'left', name: 'Title' });
  box(c, m, t.y + t.h + u * 0.035, u * 0.1, u * 0.012, th.kicker, { name: 'Rule' });
  const l = caps(c, 'Open roles', m, t.y + t.h + u * 0.09, lw, th.frame, th.kFont[0], 0.03);
  para(c, o.roles.join('\n'), m, l.y + l.h + u * 0.02, lw - m * 0.3, { font: th.nFont, weight: 600, size: u * 0.052, fill: th.ink, lh: 1.4, name: 'Roles' });
  const ap = text(c, o.apply, m, 0, lw - m * 0.3, { font: th.nFont, weight: 800, size: u * 0.04, fill: th.head, lines: 2, lh: 1.15, align: 'left', name: 'Apply' });
  ap.y = H - m - ap.h;
  const al = caps(c, 'Apply today', m, 0, lw, th.frame, th.kFont[0], 0.026); al.y = ap.y - al.h - u * 0.012;
  // one motif: a round sticker on the photo's edge
  const d = u * 0.24, sx = W * 0.52 + u * 0.05, sy = H - d - u * 0.06;
  box(c, sx, sy, d, d, th.kicker, { shape: 'ellipse', name: 'Sticker' });
  const st = text(c, o.sticker, sx + d * 0.14, 0, d * 0.72, { font: th.kFont[0], weight: 800, size: d * 0.16, fill: th.head, upper: true, lines: 3, lh: 1.05, name: 'Sticker text' });
  st.y = sy + (d - st.h) / 2;
}

// ---------- hiring story: photo on top, a dark panel with the roles ----------
function hiringStory(c: Kit, th: Theme, o: { kicker: string; title: string; roles: string[]; apply: string; note: string }): void {
  const { W, H, u } = c, m = W * 0.09;
  c.bg = th.head;
  themePic(c, th, 0, 0, 0, W, H * 0.4, 'none', 0);
  box(c, 0, H * 0.4, W, u * 0.012, th.bar, { name: 'Accent edge' });
  let y = H * 0.4 + u * 0.09;
  const k = caps(c, o.kicker, m, y, W - m * 2, th.kicker, th.kFont[0], 0.034, 'left', 'Kicker');
  const t = text(c, o.title, m, k.y + k.h + u * 0.02, W - m * 2, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.17, fill: '#ffffff', lh: 0.98, lines: 2, align: 'left', name: 'Title' });
  y = t.y + t.h + u * 0.06;
  const rl = para(c, o.roles.join('\n'), m, y, W - m * 2, { font: th.nFont, weight: 600, size: u * 0.052, fill: '#ffffff', lh: 1.55, name: 'Roles' });
  const lh = rl.h / o.roles.length;
  for (let i = 0; i <= o.roles.length; i++) box(c, m, rl.y + i * lh - (i === 0 ? u * 0.004 : u * 0.001), W - m * 2, Math.max(2, u * 0.002), 'rgba(216,180,92,0.45)', { name: 'Divider' });
  const n = text(c, o.note, m, 0, W - m * 2, { font: th.nFont, weight: 500, size: u * 0.038, fill: 'rgba(255,255,255,0.8)', align: 'left', name: 'Note' });
  const ap = text(c, o.apply, m, 0, W - m * 2, { font: th.kFont[0], weight: 800, size: u * 0.045, fill: th.kicker, upper: true, spacing: u * 0.004, align: 'left', name: 'Apply' });
  ap.y = Math.max(H - u * 0.14 - ap.h, rl.y + rl.h + u * 0.08 + n.h + u * 0.02); n.y = ap.y - n.h - u * 0.02;
}

// ---------- speakers: a conference poster ----------
interface Speaker { name: string; topic: string; time: string }
function speakers(c: Kit, o: { kicker: string; title: string; sub: string; date: string; place: string; cta: string }, ps: Speaker[]): void {
  const { W, H, u } = c, m = W * 0.075, navy = '#0e1a3a', blue = '#4f8cff', soft = '#c9d6f5', ph: [string, string, string] = ['#3b5aa8', '#c9d6f5', '#4f8cff'];
  c.bg = navy;
  box(c, W * 0.62, -W * 0.18, W * 0.6, W * 0.6, 'rgba(79,140,255,0)', { shape: 'ring', stroke: blue, strokeWidth: u * 0.05, opacity: 0.35, name: 'Ring' });
  const k = caps(c, o.kicker, m + u * 0.06, H * 0.05, W * 0.6, blue, 'Inter', 0.026, 'left', 'Kicker');
  box(c, m, k.y + k.h / 2 - u * 0.003, u * 0.045, u * 0.006, blue, { name: 'Kicker bar' });
  const t = text(c, o.title, m, k.y + k.h + u * 0.015, W * 0.86, { font: 'Inter', weight: 900, size: u * 0.11, fill: '#ffffff', lh: 0.98, lines: 2, align: 'left', name: 'Title' });
  const s = text(c, o.sub, m, t.y + t.h + u * 0.025, W * 0.8, { font: 'Inter', weight: 500, size: u * 0.034, fill: soft, align: 'left', name: 'Subtitle' });
  const bandH = H * 0.13, top = s.y + s.h + u * 0.07, bottom = H - bandH - u * 0.06;
  const cols = 3, gap = W * 0.035, cw = (W - m * 2 - gap * (cols - 1)) / cols, rows = Math.ceil(ps.length / cols), rowH = (bottom - top - u * 0.04 * (rows - 1)) / rows;
  ps.forEach((p, i) => {
    const x = m + (i % cols) * (cw + gap), y = top + Math.floor(i / cols) * (rowH + u * 0.04);
    const capH = u * 0.1, phH = Math.min(cw * 1.05, rowH - capH);
    pic(c, 'speakers', ph, i, x, y, cw, phH, 'none', u * 0.016);
    const ts = u * 0.022, tw = widthOf(p.time.toUpperCase(), 'Inter', 800, ts, false, ts * 0.04) + ts * 1.6, th2 = ts * 1.9;
    box(c, x + u * 0.018, y + u * 0.018, tw, th2, blue, { radius: u * 0.008, name: 'Time tag' });
    const tag = text(c, p.time, x + u * 0.018, 0, tw, { font: 'Inter', weight: 800, size: ts, fill: navy, upper: true, spacing: ts * 0.04, name: 'Time' });
    tag.y = y + u * 0.018 + (th2 - tag.h) / 2;
    const n = text(c, p.name, x, y + phH + u * 0.022, cw, { font: 'Inter', weight: 800, size: u * 0.034, fill: '#ffffff', align: 'left', name: 'Name' });
    text(c, p.topic, x, n.y + n.h + u * 0.006, cw, { font: 'Inter', weight: 600, size: u * 0.025, fill: soft, lines: 2, lh: 1.2, align: 'left', name: 'Talk' });
  });
  box(c, 0, H - bandH, W, bandH, blue, { name: 'Info band' });
  const d = text(c, o.date, m, 0, W * 0.45, { font: 'Inter', weight: 900, size: u * 0.04, fill: navy, align: 'left', name: 'Date' });
  const pl = text(c, o.place, m, 0, W * 0.45, { font: 'Inter', weight: 600, size: u * 0.028, fill: navy, align: 'left', name: 'Place' });
  d.y = H - bandH + (bandH - d.h - pl.h - u * 0.01) / 2; pl.y = d.y + d.h + u * 0.01;
  const ct = text(c, o.cta, W * 0.56, 0, W * 0.44 - m, { font: 'Inter', weight: 800, size: u * 0.03, fill: '#ffffff', upper: true, spacing: u * 0.003, lines: 2, lh: 1.25, align: 'right', name: 'Tickets' });
  ct.y = H - bandH + (bandH - ct.h) / 2;
}

// ---------- webinar: a coloured panel of words + a round host photo ----------
function webinar(c: Kit, th: Theme, o: { chip: string; title: string; when: string[]; host: string; hostRole: string; cta: string }): void {
  const { W, H, u } = c, m = W * 0.07, pw = W * 0.58;
  c.bg = th.page;
  box(c, 0, 0, pw, H, th.head, { name: 'Panel' });
  const chs = u * 0.028, chw = widthOf(o.chip.toUpperCase(), th.kFont[0], 800, chs, false, u * 0.004) + chs * 1.8, chh = chs * 2.1;
  const cb = box(c, m, m, chw, chh, th.bar, { radius: chh / 2, name: 'Chip' });
  const chip = text(c, o.chip, m, 0, chw, { font: th.kFont[0], weight: 800, size: chs, fill: th.barInk, upper: true, spacing: u * 0.004, name: 'Chip text' });
  chip.y = m + (chh - chip.h) / 2;
  const d = W * 0.4, px = pw - d * 0.2, py = H * 0.2, tw = px - m - W * 0.03;
  const t = text(c, o.title, m, cb.y + cb.h + u * 0.05, tw, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.12, fill: '#ffffff', lh: 1, lines: 3, align: 'left', name: 'Title' });
  box(c, m, t.y + t.h + u * 0.04, u * 0.09, u * 0.01, th.bar, { name: 'Rule' });
  para(c, o.when.join('\n'), m, t.y + t.h + u * 0.09, tw, { font: th.nFont, weight: 700, size: u * 0.042, fill: '#ffffff', lh: 1.4, name: 'When' });
  const cta = text(c, o.cta, m, 0, pw - m * 1.6, { font: th.kFont[0], weight: 800, size: u * 0.034, fill: th.bar, upper: true, spacing: u * 0.003, align: 'left', name: 'Register' });
  cta.y = H - m - cta.h;
  box(c, px - u * 0.016, py - u * 0.016, d + u * 0.032, d + u * 0.032, th.bar, { shape: 'ellipse', name: 'Photo ring' });
  themePic(c, th, 0, px, py, d, d, 'circle');
  const hx = px, hw = W - hx - W * 0.05;
  const hl = caps(c, 'Your host', hx, py + d + u * 0.06, hw, th.frame, th.kFont[0], 0.026);
  const hn = text(c, o.host, hx, hl.y + hl.h + u * 0.01, hw, { font: th.nFont, weight: 900, size: u * 0.05, fill: th.ink, align: 'left', name: 'Host' });
  text(c, o.hostRole, hx, hn.y + hn.h + u * 0.008, hw, { font: th.nFont, weight: 600, size: u * 0.032, fill: th.ink, lines: 3, lh: 1.25, align: 'left', name: 'Host role' });
}

// ---------- real estate ----------
interface Listing { kicker: string; price: string; address: string; stats: [string, string][]; open: string; agent: string; agentLine: string }
/** Three numbers side by side with hairlines between (beds / baths / size). */
function stats(c: Kit, list: [string, string][], x: number, y: number, w: number, ink: string, label: string, line: string, numFont: [string, number], labFont: string, size: number): number {
  const cw = w / list.length;
  let bottom = y;
  list.forEach(([n, l], i) => {
    if (i) box(c, x + cw * i, y + size * 0.1, Math.max(2, c.u * 0.002), size * 1.9, line, { name: 'Divider' });
    const ne = text(c, n, x + cw * i, y, cw, { font: numFont[0], weight: numFont[1], size, fill: ink, name: 'Number' });
    const le = text(c, l, x + cw * i, ne.y + ne.h + size * 0.08, cw, { font: labFont, weight: 700, size: size * 0.38, fill: label, upper: true, spacing: size * 0.04, name: 'Label' });
    bottom = le.y + le.h;
  });
  return bottom;
}
function listingFlyer(c: Kit, th: Theme, o: Listing): void {
  const { W, H, u } = c, m = W * 0.08;
  c.bg = th.page;
  const ph = H * 0.47;
  themePic(c, th, 0, 0, 0, W, ph, 'none', 0);
  const bh = u * 0.11, bw = W * 0.5;
  box(c, 0, ph - bh * 0.5, bw, bh, th.head, { name: 'Banner' });
  const k = text(c, o.kicker, m, 0, bw - m * 1.4, { font: th.kFont[0], weight: 700, size: bh * 0.4, fill: th.kicker, upper: true, spacing: u * 0.008, align: 'left', name: 'Kicker' });
  k.y = ph - bh * 0.5 + (bh - k.h) / 2;
  const p = text(c, o.price, m, ph + bh * 0.5 + u * 0.06, W - m * 2, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.12, fill: th.ink, align: 'left', name: 'Price' });
  const a = text(c, o.address, m, p.y + p.h + u * 0.012, W - m * 2, { font: th.nFont, weight: 600, size: u * 0.038, fill: th.ink, align: 'left', name: 'Address' });
  const sy = a.y + a.h + u * 0.06;
  box(c, m, sy - u * 0.03, W - m * 2, Math.max(2, u * 0.002), th.bar, { name: 'Divider' });
  const sb = stats(c, o.stats, m, sy, W - m * 2, th.ink, th.muted ?? th.frame, th.shadow, [th.tFont[0], th.tFont[1]], th.kFont[0], u * 0.075);
  box(c, m, sb + u * 0.035, W - m * 2, Math.max(2, u * 0.002), th.bar, { name: 'Divider' });
  const op = text(c, o.open, m, sb + u * 0.075, W - m * 2, { font: th.nFont, weight: 700, size: u * 0.036, fill: th.ink, name: 'Open house' });
  // agent strip
  const ah = H * 0.12, ay = H - ah;
  box(c, 0, ay, W, ah, th.head, { name: 'Agent strip' });
  const d = ah * 0.7;
  box(c, m - u * 0.008, ay + (ah - d) / 2 - u * 0.008, d + u * 0.016, d + u * 0.016, th.bar, { shape: 'ellipse', name: 'Photo ring' });
  themePic(c, th, 1, m, ay + (ah - d) / 2, d, d, 'circle');
  const ax = m + d + u * 0.04;
  const an = text(c, o.agent, ax, 0, W - ax - m, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.05, fill: '#ffffff', align: 'left', name: 'Agent' });
  const al = text(c, o.agentLine, ax, 0, W - ax - m, { font: th.nFont, weight: 600, size: u * 0.03, fill: th.kicker, align: 'left', name: 'Agent contact' });
  an.y = ay + (ah - an.h - al.h - u * 0.008) / 2; al.y = an.y + an.h + u * 0.008;
  void op;
}
function listingPost(c: Kit, th: Theme, o: Listing): void {
  const { W, H, u } = c, m = W * 0.07;
  c.bg = th.page;
  const ph = H * 0.58;
  themePic(c, th, 0, 0, 0, W, ph, 'none', 0);
  const ks = u * 0.034, kw = widthOf(o.kicker.toUpperCase(), th.kFont[0], 800, ks, false, u * 0.008) + ks * 1.6, kh = ks * 2;
  box(c, m, m, kw, kh, th.head, { radius: u * 0.01, name: 'Kicker box' });
  const k = text(c, o.kicker, m, 0, kw, { font: th.kFont[0], weight: 800, size: ks, fill: '#ffffff', upper: true, spacing: u * 0.008, name: 'Kicker' });
  k.y = m + (kh - k.h) / 2;
  const prs = u * 0.06, pw = widthOf(o.price, th.tFont[0], th.tFont[1], prs) + prs * 1.2, prh = prs * 1.7, py = ph - u * 0.05 - prh;
  box(c, W - m - pw, py, pw, prh, th.bar, { radius: u * 0.012, name: 'Price tag' });
  const pr = text(c, o.price, W - m - pw, 0, pw, { font: th.tFont[0], weight: th.tFont[1], size: prs, fill: th.barInk, name: 'Price' });
  pr.y = py + (prh - pr.h) / 2;
  const a = text(c, o.address, m, ph + u * 0.05, W - m * 2, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.06, fill: th.ink, align: 'left', name: 'Address' });
  const sb = stats(c, o.stats, m, a.y + a.h + u * 0.04, W - m * 2, th.ink, th.muted ?? th.frame, th.shadow, [th.tFont[0], th.tFont[1]], th.kFont[0], u * 0.06);
  const op = text(c, o.open, m, 0, W - m * 2, { font: th.nFont, weight: 700, size: u * 0.034, fill: th.head, name: 'Open house' });
  op.y = Math.max(sb + u * 0.04, H - m * 0.8 - op.h);
}

// ---------- residence life: meeting, duty rota, event ----------
function meeting(c: Kit, th: Theme, o: { kicker: string; title: string; sub: string; facts: [string, string][]; agenda: string[]; ra: string; footer: string }): void {
  const { W, H, u } = c, m = W * 0.08;
  c.bg = th.page;
  header(c, th, { kicker: o.kicker, title: o.title, sub: o.sub, h: H * 0.2, size: 0.1, kr: 0.4, sr: 0.26 });
  // when / where card
  const cy = H * 0.24, ch = u * 0.36;
  box(c, m, cy, W - m * 2, ch, '#ffffff', { radius: u * 0.03, shadow: { color: 'rgba(37,18,77,0.12)', blur: u * 0.03, x: 0, y: u * 0.008 }, name: 'Card' });
  const rh = ch / o.facts.length;
  o.facts.forEach(([l, v], i) => {
    const y = cy + i * rh;
    if (i) box(c, m + u * 0.04, y, W - m * 2 - u * 0.08, Math.max(2, u * 0.002), th.shadow, { name: 'Divider' });
    const le = caps(c, l, m + u * 0.05, 0, W * 0.2, th.frame, th.kFont[0], 0.028);
    const ve = text(c, v, m + W * 0.25, 0, W - m * 2 - W * 0.29, { font: th.nFont, weight: 800, size: u * 0.05, fill: th.ink, align: 'left', name: 'Detail' });
    le.y = y + (rh - le.h) / 2; ve.y = y + (rh - ve.h) / 2;
  });
  const al = caps(c, 'On the agenda', m, cy + ch + u * 0.07, W - m * 2, th.frame, th.kFont[0], 0.03);
  let y = al.y + al.h + u * 0.03;
  o.agenda.forEach((s, i) => {
    const n = text(c, String(i + 1).padStart(2, '0'), m, y, u * 0.12, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.05, fill: th.bar === '#fdc94a' ? th.frame : th.bar, align: 'left', name: 'Number' });
    const t = text(c, s, m + u * 0.12, y, W - m * 2 - u * 0.12, { font: th.nFont, weight: 600, size: u * 0.045, fill: th.ink, align: 'left', name: 'Agenda item' });
    t.y = n.y + (n.h - t.h) / 2;
    y = n.y + n.h + u * 0.035;
  });
  // the RA, small, bottom left; closing line right
  const d = u * 0.15, py = H - u * 0.08 - d;
  box(c, m - u * 0.008, py - u * 0.008, d + u * 0.016, d + u * 0.016, th.bar, { shape: 'ellipse', name: 'Photo ring' });
  themePic(c, th, 0, m, py, d, d, 'circle');
  const rl = caps(c, 'Your RA', m + d + u * 0.04, 0, W * 0.5, th.frame, th.kFont[0], 0.026);
  const rn = text(c, o.ra, m + d + u * 0.04, 0, W - m * 2 - d, { font: th.nFont, weight: 800, size: u * 0.045, fill: th.ink, align: 'left', name: 'RA name' });
  const rf = text(c, o.footer, m + d + u * 0.04, 0, W - m * 2 - d, { font: th.nFont, weight: 600, size: u * 0.03, fill: th.ink, align: 'left', name: 'Footer text' });
  const tot = rl.h + rn.h + rf.h + u * 0.016;
  rl.y = py + (d - tot) / 2; rn.y = rl.y + rl.h + u * 0.008; rf.y = rn.y + rn.h + u * 0.008;
}
type Duty = [day: string, date: string, name: string, hours: string];
function dutyRota(c: Kit, th: Theme, o: { kicker: string; title: string; sub: string; phone: string; note: string }, rows: Duty[]): void {
  const { W, H, u } = c, m = W * 0.07;
  c.bg = th.page;
  header(c, th, { kicker: o.kicker, title: o.title, sub: o.sub, h: H * 0.16, size: 0.09, kr: 0.42, sr: 0.28 });
  // the duty phone, big
  const py = H * 0.185, ph = u * 0.13;
  box(c, m, py, W - m * 2, ph, th.bar, { radius: u * 0.025, name: 'Phone box' });
  const pl = caps(c, 'Duty phone · 24/7', m + u * 0.05, 0, W * 0.4, th.barInk, th.kFont[0], 0.026);
  const pn = text(c, o.phone, m + u * 0.05, 0, W - m * 2 - u * 0.1, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.06, fill: th.barInk, align: 'left', name: 'Phone' });
  pl.y = py + (ph - pl.h - pn.h - u * 0.004) / 2; pn.y = pl.y + pl.h + u * 0.004;
  const top = py + ph + u * 0.04, bottom = H - u * 0.11, gap = u * 0.016, rh = (bottom - top - gap * (rows.length - 1)) / rows.length;
  rows.forEach(([day, date, name, hours], i) => {
    const y = top + i * (rh + gap), x = m, rw = W - m * 2;
    box(c, x, y, rw, rh, '#ffffff', { radius: rh * 0.16, shadow: { color: 'rgba(37,18,77,0.10)', blur: u * 0.016, x: 0, y: u * 0.004 }, name: 'Row' });
    const dw = rh * 1.15;
    box(c, x, y, dw, rh, th.head, { radius: rh * 0.16, name: 'Day box' });
    const de = text(c, day, x, 0, dw, { font: th.kFont[0], weight: 800, size: rh * 0.26, fill: th.kicker, upper: true, spacing: rh * 0.02, name: 'Day' });
    const dd = text(c, date, x, 0, dw, { font: th.tFont[0], weight: th.tFont[1], size: rh * 0.36, fill: '#ffffff', name: 'Date' });
    de.y = y + (rh - de.h - dd.h) / 2; dd.y = de.y + de.h;
    const d = rh * 0.7, px = x + rw - d - rh * 0.18;
    themePic(c, th, i, px, y + (rh - d) / 2, d, d, 'circle');
    const tx = x + dw + rh * 0.3, tw = px - tx - rh * 0.2;
    const n = text(c, name, tx, 0, tw, { font: th.nFont, weight: 800, size: rh * 0.32, fill: th.ink, align: 'left', name: 'Name' });
    const h = text(c, hours, tx, 0, tw, { font: th.nFont, weight: 600, size: rh * 0.22, fill: th.frame, align: 'left', name: 'Hours' });
    n.y = y + (rh - n.h - h.h - rh * 0.03) / 2; h.y = n.y + n.h + rh * 0.03;
  });
  const nt = text(c, o.note, m, 0, W - m * 2, { font: th.nFont, weight: 700, size: u * 0.03, fill: th.ink, name: 'Footer text' });
  nt.y = H - u * 0.055 - nt.h;
}
function nightEvent(c: Kit, th: Theme, o: { kicker: string; title: string; badge: string; when: string; where: string; lines: string; footer: string }): void {
  const { W, H, u } = c, m = W * 0.08, night = '#24104f';
  c.bg = night;
  for (let i = 0; i < 26; i++) { const r = ((i * 7919) % 97) / 97, q = ((i * 104729) % 89) / 89, d = u * (0.005 + (i % 3) * 0.003); box(c, r * W, q * H * 0.42, d, d, '#ffffff', { shape: 'ellipse', opacity: 0.35 + (i % 4) * 0.12, name: 'Star' }); }
  const k = caps(c, o.kicker, m, H * 0.06, W - m * 2, th.kicker, th.kFont[0], 0.036, 'left', 'Kicker');
  const t = text(c, o.title, m, k.y + k.h + u * 0.02, W - m * 2, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.2, fill: '#ffffff', upper: true, lh: 0.95, lines: 2, align: 'left', name: 'Title' });
  const py = t.y + t.h + u * 0.07, phH = H * 0.32;
  themePic(c, th, 0, m, py, W - m * 2, phH, 'none', u * 0.04);
  const d = u * 0.26;
  box(c, W - m - d * 0.75, py - d * 0.35, d, d, th.kicker, { shape: 'burst', rotation: 12, name: 'Badge' });
  const be = text(c, o.badge, W - m - d * 0.75 + d * 0.15, 0, d * 0.7, { font: th.kFont[0], weight: 900, size: d * 0.24, fill: night, upper: true, name: 'Badge text' });
  be.y = py - d * 0.35 + (d - be.h) / 2; be.rotation = 12;
  const w = text(c, o.when, m, py + phH + u * 0.07, W - m * 2, { font: th.nFont, weight: 900, size: u * 0.062, fill: '#ffffff', align: 'left', name: 'When' });
  const wh = text(c, o.where, m, w.y + w.h + u * 0.012, W - m * 2, { font: th.nFont, weight: 700, size: u * 0.046, fill: th.kicker, align: 'left', name: 'Where' });
  const dt = para(c, o.lines, m, wh.y + wh.h + u * 0.04, W - m * 2, { font: th.nFont, weight: 600, size: u * 0.04, fill: 'rgba(255,255,255,0.86)', lh: 1.4, name: 'Details' });
  const f = caps(c, o.footer, m, 0, W - m * 2, th.kicker, th.kFont[0], 0.032);
  f.y = Math.max(H - u * 0.14 - f.h, dt.y + dt.h + u * 0.09);
  box(c, m, f.y - u * 0.03, u * 0.1, u * 0.008, th.kicker, { name: 'Rule' });
}

/** A customer review: quote mark, the words, stars, a round photo, name and role. */
function quote(c: Kit, l: Look, o: { quote: string; name: string; role: string; brand: string }): void {
  const { W, H, u } = c, x = W * 0.14, w = W * 0.72;
  c.bg = l.bg;
  box(c, W * 0.06, H * 0.06, W * 0.88, H * 0.88, '#ffffff', { radius: u * 0.04, shadow: { color: 'rgba(40,30,20,0.10)', blur: u * 0.04, x: 0, y: u * 0.01 }, name: 'Card' });
  const bt = text(c, o.brand, x, H * 0.13, w, { font: l.bFont, weight: 700, size: u * 0.028, fill: l.accent, upper: true, spacing: u * 0.006, align: 'left', name: 'Brand' });
  const s = text(c, '★★★★★', x, bt.y + bt.h + u * 0.05, w, { font: l.bFont, weight: 700, size: u * 0.05, fill: l.accent, spacing: u * 0.012, align: 'left', name: 'Stars' });
  const q = text(c, '“', x - u * 0.01, s.y + s.h + u * 0.01, u * 0.2, { font: l.tFont[0], weight: 700, size: u * 0.2, fill: l.ring, lh: 0.8, align: 'left', name: 'Quote mark' });
  const t = text(c, o.quote, x, q.y + q.h * 0.62, w, { font: l.tFont[0], weight: 700, size: u * 0.064, fill: l.ink, lines: 5, lh: 1.22, align: 'left', name: 'Review' });
  const d = u * 0.14, py = Math.max(t.y + t.h + u * 0.06, H * 0.94 - u * 0.07 - d);
  box(c, x, py - u * 0.035, u * 0.1, Math.max(2, u * 0.004), l.accent, { name: 'Rule' });
  box(c, x - u * 0.008, py + u * 0.0 - u * 0.008, d + u * 0.016, d + u * 0.016, l.ring, { shape: 'ellipse', name: 'Photo ring' });
  lookPic(c, l, 0, x, py, d, d, 'circle');
  const n = text(c, o.name, x + d + u * 0.04, 0, w - d - u * 0.04, { font: l.bFont, weight: 800, size: u * 0.042, fill: l.ink, align: 'left', name: 'Name' });
  const r = text(c, o.role, x + d + u * 0.04, 0, w - d - u * 0.04, { font: l.bFont, weight: 600, size: u * 0.03, fill: l.muted, upper: true, spacing: u * 0.004, align: 'left', name: 'Role' });
  n.y = py + (d - n.h - r.h - u * 0.006) / 2; r.y = n.y + n.h + u * 0.006;
}

const PURPLE = ['purple', 'gold', 'white'];
const DUTY: Duty[] = [
  ['Mon', '19', NAMES[0], '8 PM – 8 AM'], ['Tue', '20', NAMES[1], '8 PM – 8 AM'], ['Wed', '21', NAMES[2], '8 PM – 8 AM'],
  ['Thu', '22', NAMES[3], '8 PM – 8 AM'], ['Fri', '23', NAMES[4], '8 PM – 8 AM'], ['Sat', '24', NAMES[5], 'All day & night'], ['Sun', '25', NAMES[6], 'All day & night'],
];

export const PRO_SETS: { sub: string; label: string; cover: string; list: CollectionTemplate[] }[] = [
  { sub: 'hiring', label: 'Now hiring', cover: 'now-hiring-post', list: [
    tpl('now-hiring-post', 'We’re Hiring Post', 'post', 'social', 'Modern', ['green', 'cream'], 'announcement', ['now hiring', 'we are hiring', 'job opening', 'join our team', 'careers', 'recruiting', 'staff wanted', 'instagram', 'photo'],
      (c) => hiringSplit(c, T.forest, { brand: 'Green Leaf Café', title: 'We’re hiring!', roles: ['Baristas', 'Line Cook', 'Weekend Host'], apply: 'jobs@greenleaf.cafe', sticker: 'Full & part time' }), T.forest),
    tpl('now-hiring-story', 'Join Our Team Story', 'story', 'social', 'Elegant', ['black', 'gold', 'cream'], 'announcement', ['now hiring', 'join our team', 'careers', 'job opening', 'recruiting', 'story', 'photo'],
      (c) => hiringStory(c, T.luxe, { kicker: 'Studio North is hiring', title: 'Join our team', roles: ['Senior Designer', 'Project Manager', 'Design Intern (summer)'], note: 'Apply by Friday, November 20', apply: 'studionorth.co/jobs' }), T.luxe),
  ] },
  { sub: 'workshop', label: 'Speakers & webinars', cover: 'speaker-lineup-poster', list: [
    tpl('speaker-lineup-poster', 'Speaker Line-up Poster', 'poster', 'poster', 'Bold', ['navy', 'blue', 'white'], 'event', ['speakers', 'speaker lineup', 'conference', 'summit', 'panel', 'keynote', 'agenda', 'event program', '6 photos'],
      (c) => speakers(c, { kicker: 'Meet the speakers', title: 'Design Summit 2027', sub: 'One day of talks on branding, type and research', date: 'Saturday, March 6, 2027', place: 'Riverside Hall  ·  9 AM – 5 PM', cta: 'Tickets at designsummit.org' }, [
        { name: NAMES[0], topic: 'Keynote: Design that lasts', time: '9:00' }, { name: NAMES[1], topic: 'Brands people remember', time: '10:30' },
        { name: NAMES[2], topic: 'Type that does the work', time: '11:30' }, { name: NAMES[3], topic: 'Research on a budget', time: '1:30' },
        { name: NAMES[4], topic: 'Motion in small doses', time: '2:30' }, { name: NAMES[5], topic: 'Closing panel', time: '4:00' },
      ]), T.coral),
    tpl('live-webinar-post', 'Live Webinar Post', 'post', 'social', 'Modern', ['teal', 'yellow', 'white'], 'event', ['webinar', 'live webinar', 'online class', 'workshop', 'masterclass', 'speaker', 'zoom', 'register', 'instagram', 'photo'],
      (c) => webinar(c, T.teal, { chip: 'Free live webinar', title: 'Design Systems 101', when: ['Thursday, Nov 12', '1 PM EST  ·  60 min + Q&A'], host: 'Maya Chen', hostRole: 'Head of Design, Studio North', cta: 'Register · link in bio' }), T.teal),
  ] },
  { sub: 'promotion', label: 'Customer reviews', cover: 'customer-review-post', list: [
    tpl('customer-review-post', 'Customer Review Post', 'post', 'social', 'Elegant', ['cream', 'terracotta'], 'announcement', ['testimonial', 'customer review', 'review', 'happy customer', 'feedback', '5 stars', 'quote', 'small business', 'instagram', 'photo'],
      (c) => quote(c, L.cream, { quote: 'The best haircut I’ve had in years — friendly, on time, and they really listened.', name: 'Sofia Martinez', role: 'Happy client', brand: 'Willow & Co. Salon' }), T.coral),
  ] },
  { sub: 'advertisement', label: 'Real estate', cover: 'just-listed-flyer', list: [
    tpl('just-listed-flyer', 'Just Listed Flyer', 'flyer', 'flyer', 'Elegant', ['black', 'gold', 'cream'], 'announcement', ['just listed', 'real estate', 'house for sale', 'home for sale', 'open house', 'realtor', 'property', 'listing', 'photo'],
      (c) => listingFlyer(c, T.luxe, { kicker: 'Just listed', price: '$489,000', address: '128 Maple Street, Halifax', stats: [['4', 'Beds'], ['3', 'Baths'], ['2,150', 'Sq ft']], open: 'Open house  ·  Saturday, Oct 24  ·  1 – 3 PM', agent: 'Maya Chen', agentLine: 'Harbor Homes Realty  ·  (555) 010-4455' }), T.luxe),
    tpl('just-listed-post', 'Just Listed Post', 'post', 'social', 'Modern', ['green', 'cream'], 'announcement', ['just listed', 'real estate', 'home for sale', 'open house', 'realtor', 'property', 'listing', 'instagram', 'photo'],
      (c) => listingPost(c, T.forest, { kicker: 'Just listed', price: '$489,000', address: '128 Maple Street', stats: [['4', 'Beds'], ['3', 'Baths'], ['2,150', 'Sq ft']], open: 'Open Sat 1–3 PM  ·  Call Maya (555) 010-4455', agent: '', agentLine: '' }), T.forest),
  ] },
  { sub: 'residence-life', label: 'Residence Life (floor life)', cover: 'ra-floor-meeting-flyer', list: [
    tpl('ra-floor-meeting-flyer', 'Floor Meeting Flyer', 'flyer', 'flyer', 'Bold', PURPLE, 'event', [...RA_TAGS, 'floor meeting', 'house meeting', 'first floor meeting', 'agenda', 'flyer', 'photo'],
      (c) => meeting(c, T.reslife, { kicker: 'You’re invited to our', title: 'Floor Meeting', sub: 'Maple Hall  •  Floor 3', facts: [['When', 'Sunday, Nov 1'], ['Time', '8 – 8:45 PM'], ['Where', 'Floor 3 lounge']], agenda: ['Meet your floor mates', 'Quiet hours & safety', 'Fall events and trips', 'Free pizza after!'], ra: NAMES[2], footer: 'Questions? Knock on room 309' }), T.reslife),
    tpl('ra-on-duty-schedule', 'RA On Duty Schedule', 'flyer', 'flyer', 'Modern', PURPLE, 'announcement', [...RA_TAGS, 'ra on duty', 'duty schedule', 'on call', 'rota', 'weekly schedule', 'duty phone', 'flyer', 'photos'],
      (c) => dutyRota(c, T.reslife, { kicker: 'This week’s', title: 'RA On Duty', sub: 'Maple Hall  •  Week of Oct 19', phone: '(555) 010-2024', note: 'Emergency? Call 911 first, then campus safety.' }, DUTY), T.reslife),
    tpl('ra-floor-event-story', 'Floor Event Story', 'story', 'social', 'Playful', PURPLE, 'party', [...RA_TAGS, 'floor event', 'movie night', 'hall event', 'social', 'story', 'photo'],
      (c) => nightEvent(c, T.reslife, { kicker: 'Floor 3 presents', title: 'Movie Night', badge: 'Free', when: 'Friday, Oct 23  ·  9 PM', where: 'Maple Hall Lounge', lines: 'Popcorn, blankets & a cozy pick.\nBring a friend from your floor!', footer: 'Hosted by your RA' }), T.reslife),
  ] },
];

/** Font weights these templates use beyond the team kits (previews wait for them). */
export const PRO_FONTS: [string, number][] = [['Inter', 900], ['Inter', 500], ['Montserrat', 900], ['Montserrat', 700], ['Nunito', 700], ['Nunito', 800], ['Nunito', 900], ['Poppins', 700], ['Poppins', 800], ['Poppins', 600], ['Nunito', 600], ['Montserrat', 600], ['Montserrat', 800], ['Playfair Display', 700], ['Inter', 600], ['Inter', 800]];
