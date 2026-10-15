/**
 * Careers: résumés / CVs (US Letter, `document`) and business cards (3.5 × 2 in, `bizcard`) — the two kinds the critic
 * found missing ("resume" found nothing, "business card" four). Original layouts on the team kit's themes and photo frames;
 * every word is live text, every photo a tap-to-fill frame, sample people are fictional.
 *
 * - `sidebar`  coloured column with a round photo, contact, skills and languages; name, profile, experience, education right
 * - `classic`  no photo: centred serif name, contact line, headings in a left column, one calm column of content
 * - `banner`   name band across the top with the photo on its edge, experience left, a tinted column of extras right
 * - cards: `minimal`, `monogram` (dark), `band` (coloured side with initials) and `portrait` (round photo)
 */
import {box, text as kitText, type CollectionTemplate, type Kit, type TOpts } from './kit';
import { fitText } from '../../../editor/render';
/** Live text measured with 4% slack: if a web font is still loading when a template is built, the real (wider) letters
 * still fit on the lines that were measured, so a name never wraps onto the line below it. */
const text = (c: Kit, s: string, x: number, y: number, w: number, o: TOpts): TextEl => {
  const el = kitText(c, s, x, y, w * 0.96, o);
  el.w = w;
  fitText(el);
  return el;
};
import type { TextEl } from '../../../editor/types';
import { T, type Theme } from './team';
import { themePic } from './teamStyles';
import type { Format } from '../layouts';

interface Job { role: string; org: string; dates: string; points: string[] }
interface Cv {
  name: string; role: string; contact: string[]; profile: string;
  jobs: Job[]; school: [degree: string, place: string][]; skills: string[]; langs?: string[];
}

const MAYA: Cv = {
  name: 'Maya Chen', role: 'Product Designer',
  contact: ['(555) 010-4455', 'maya.chen@email.com', 'mayachen.design', 'Portland, OR'],
  profile: 'Product designer with 7 years of experience turning complex problems into simple, friendly apps. I love research, clean systems and shipping with small teams.',
  jobs: [
    { role: 'Senior Product Designer', org: 'Brightside Health', dates: '2022 – Present', points: ['Led the patient app redesign, rated 4.8★', 'Built a design system for 6 teams', 'Cut sign-up time from 6 to 2 minutes'] },
    { role: 'Product Designer', org: 'Studio North', dates: '2019 – 2022', points: ['Designed booking for 30+ local shops', 'Ran weekly user tests with clients'] },
    { role: 'UX Designer', org: 'Little Pine Labs', dates: '2017 – 2019', points: ['Shaped v1 of a reading app for kids', 'Prototyped 40+ ideas with teachers'] },
  ],
  school: [['BFA, Interaction Design', 'Oregon College of Art · 2017']],
  skills: ['User research', 'Prototyping', 'Design systems', 'Figma', 'Accessibility', 'Workshop facilitation'],
  langs: ['English', 'Mandarin'],
};
const JORDAN: Cv = {
  name: 'Jordan Ellis', role: 'Marketing Manager',
  contact: ['(555) 010-7781', 'jordan.ellis@email.com', 'Austin, TX'],
  profile: 'Marketing manager who mixes data and storytelling. Eight years of growing brands through content, partnerships and well-run campaigns.',
  jobs: [
    { role: 'Marketing Manager', org: 'Harbor Coffee Co.', dates: '2021 – Present', points: ['Grew online sales 64% in two years', 'Launched a loyalty app (90k members)', 'Managed a $1.2M yearly budget'] },
    { role: 'Content Lead', org: 'Fieldnote Media', dates: '2018 – 2021', points: ['Led content across 5 channels', 'Doubled newsletter readers to 48,000'] },
    { role: 'Marketing Coordinator', org: 'Bluebird Events', dates: '2016 – 2018', points: ['Planned 40+ events for 2,000 guests'] },
  ],
  school: [['BA, Communications', 'University of Texas · 2016'], ['Google Analytics Certificate', '2020']],
  skills: ['Campaign strategy', 'Content & SEO', 'Email marketing', 'Analytics', 'Budgeting', 'Team leadership'],
  langs: ['English', 'Spanish (working)'],
};
const SAM: Cv = {
  name: 'Sam Rivera', role: 'Registered Nurse',
  contact: ['(555) 010-3320', 'sam.rivera@email.com', 'Denver, CO'],
  profile: 'Caring registered nurse with 5 years in busy emergency and surgical units. Calm under pressure, clear with patients and families, and a dependable team player.',
  jobs: [
    { role: 'Emergency Room Nurse', org: 'St. Lucia Medical Center', dates: '2022 – Present', points: ['Triage and care for 25+ patients a shift', 'Mentor new graduate nurses', 'Charge nurse on weekend nights'] },
    { role: 'Surgical Nurse', org: 'Mountain View Hospital', dates: '2019 – 2022', points: ['Pre- and post-op care for 4 teams', 'Cut post-op readmissions by 12%'] },
    { role: 'Nursing Assistant', org: 'Mercy Community Clinic', dates: '2017 – 2019', points: ['Supported a 12-bed day surgery unit', 'Trained 6 new nursing assistants'] },
  ],
  school: [['BSN, Nursing', 'University of Colorado · 2019'], ['BLS & ACLS Certified', 'Renewed 2026']],
  skills: ['Emergency care', 'Patient education', 'IV therapy', 'Epic charting', 'Bilingual (EN/ES)'],
};

// Résumés are built from a few multi-line text boxes (owner's critic: "a résumé is 48 separate one-line text boxes"):
// each job is a title, a "company · dates" line and ONE box of bullet points ("•  " + Enter adds a bullet), contact,
// skills and languages are one box each. `sp` stretches the gaps between sections so the page is filled top to bottom.
const BULLET = '•  ';
/** A multi-line text box at a set size (wraps inside `w`; Enter adds a line, the box grows). */
function para(c: Kit, s: string, x: number, y: number, w: number, o: { font: string; weight: number; size: number; fill: string; lh?: number; name: string; align?: 'left' | 'center' | 'right'; upper?: boolean; spacing?: number }): TextEl {
  return text(c, s, x, y, w, { lines: 60, align: o.align ?? 'left', lh: o.lh ?? 1.5, font: o.font, weight: o.weight, size: o.size, fill: o.fill, upper: o.upper, spacing: o.spacing, name: o.name });
}
/** A section heading with a short rule under it. Returns the y where the section's content starts. */
function heading(c: Kit, s: string, x: number, y: number, w: number, ink: string, accent: string, font: string, center = false): number {
  const t = text(c, s, x, y, w, { font, weight: 800, size: c.u * 0.026, fill: ink, upper: true, spacing: c.u * 0.004, align: center ? 'center' : 'left', name: 'Heading' });
  const rw = c.u * 0.05;
  box(c, center ? x + (w - rw) / 2 : x, t.y + t.h + c.u * 0.008, rw, c.u * 0.0045, accent, { radius: c.u * 0.002, name: 'Rule' });
  return t.y + t.h + c.u * 0.034;
}
/** The jobs, one under another: role, "place · dates", then one box of bullet points. Returns the next y. */
function jobs(c: Kit, list: Job[], x: number, y: number, w: number, ink: string, muted: string, font: string, sp = 1): number {
  const u = c.u;
  list.forEach((j, i) => {
    const r = text(c, j.role, x, y, w, { font, weight: 800, size: u * 0.03, fill: ink, align: 'left', name: 'Job title' });
    const o = text(c, `${j.org}  ·  ${j.dates}`, x, r.y + r.h + u * 0.004, w, { font, weight: 600, size: u * 0.022, fill: muted, align: 'left', name: 'Company & dates' });
    const b = para(c, j.points.map((p) => BULLET + p).join('\n'), x, o.y + o.h + u * 0.01, w, { font, weight: 500, size: u * 0.022, fill: ink, name: 'Achievements' });
    // room for one more bullet before the next job (text boxes don't push each other down)
    y = b.y + b.h + (i < list.length - 1 ? u * 0.048 * sp : 0);
  });
  return y;
}
function schools(c: Kit, list: Cv['school'], x: number, y: number, w: number, ink: string, muted: string, font: string, align: 'left' | 'center' = 'left'): number {
  list.forEach(([d, p], i) => {
    const a = text(c, d, x, y, w, { font, weight: 800, size: c.u * 0.024, fill: ink, lines: 2, lh: 1.2, align, name: 'Degree' });
    const b = text(c, p, x, a.y + a.h + c.u * 0.004, w, { font, weight: 600, size: c.u * 0.021, fill: muted, align, name: 'School' });
    y = b.y + b.h + (i < list.length - 1 ? c.u * 0.02 : 0);
  });
  return y;
}
/** One box, one item per line (contact, skills, languages). */
const lines = (c: Kit, items: string[], x: number, y: number, w: number, ink: string, font: string, name: string, size = 0.022) =>
  para(c, items.join('\n'), x, y, w, { font, weight: 600, size: c.u * size, fill: ink, lh: 1.65, name });

/** Coloured column with a round photo, contact, skills, languages; the rest on the right. */
function sidebar(c: Kit, th: Theme, cv: Cv, sp: number): void {
  const { W, H, u } = c, sw = W * 0.34, font = th.nFont, light = 'rgba(255,255,255,0.88)';
  c.bg = '#ffffff';
  box(c, 0, 0, sw, H, th.head, { name: 'Side column' });
  const d = sw * 0.6, py = u * 0.075;
  box(c, (sw - d) / 2 - u * 0.01, py - u * 0.01, d + u * 0.02, d + u * 0.02, th.bar, { shape: 'ellipse', name: 'Photo ring' });
  themePic(c, th, 0, (sw - d) / 2, py, d, d, 'circle');
  const sx = sw * 0.14, sw2 = sw * 0.74, gap = u * 0.055 * sp;
  let y = py + d + u * 0.07;
  y = heading(c, 'Contact', sx, y, sw2, '#ffffff', th.bar, th.kFont[0]);
  const ct = lines(c, cv.contact, sx, y, sw2, light, font, 'Contact');
  y = ct.y + ct.h + gap;
  y = heading(c, 'Skills', sx, y, sw2, '#ffffff', th.bar, th.kFont[0]);
  const sk = lines(c, cv.skills, sx, y, sw2, light, font, 'Skills');
  y = sk.y + sk.h + gap;
  if (cv.langs) { y = heading(c, 'Languages', sx, y, sw2, '#ffffff', th.bar, th.kFont[0]); lines(c, cv.langs, sx, y, sw2, light, font, 'Languages'); }
  // right column
  const x = sw + W * 0.065, w = W - x - W * 0.065;
  const n = text(c, cv.name, x, u * 0.085, w, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.075, fill: th.ink, align: 'left', upper: th.upper ?? true, name: 'Name' });
  const r = text(c, cv.role, x, n.y + n.h + u * 0.01, w, { font: th.kFont[0], weight: th.kFont[1], size: u * 0.026, fill: th.frame, upper: true, spacing: u * 0.006, align: 'left', name: 'Job title' });
  y = r.y + r.h + u * 0.06 * sp;
  y = heading(c, 'Profile', x, y, w, th.ink, th.bar, th.kFont[0]);
  const p = para(c, cv.profile, x, y, w, { font, weight: 500, size: u * 0.023, fill: th.ink, name: 'Profile' });
  y = heading(c, 'Experience', x, p.y + p.h + gap, w, th.ink, th.bar, th.kFont[0]);
  y = jobs(c, cv.jobs, x, y, w, th.ink, '#5b6170', font, sp);
  y = heading(c, 'Education', x, y + gap, w, th.ink, th.bar, th.kFont[0]);
  schools(c, cv.school, x, y, w, th.ink, '#5b6170', font);
}

/** No photo: centred serif name and contact line, headings in a left column, one calm column of content. */
function classic(c: Kit, cv: Cv, accent: string, sp: number): void {
  const { W, u } = c, ink = '#1f2328', muted = '#5b6170', serif = 'Playfair Display', sans = 'Inter';
  c.bg = '#ffffff';
  box(c, 0, 0, W, u * 0.014, accent, { name: 'Top edge' });
  const n = text(c, cv.name, W * 0.1, u * 0.085, W * 0.8, { font: serif, weight: 700, size: u * 0.08, fill: ink, name: 'Name' });
  const r = text(c, cv.role, W * 0.1, n.y + n.h + u * 0.008, W * 0.8, { font: sans, weight: 600, size: u * 0.024, fill: accent, upper: true, spacing: u * 0.008, name: 'Job title' });
  const ct = text(c, cv.contact.join('   ·   '), W * 0.08, r.y + r.h + u * 0.025, W * 0.84, { font: sans, weight: 500, size: u * 0.021, fill: muted, name: 'Contact' });
  let y = ct.y + ct.h + u * 0.04 * sp;
  box(c, W * 0.08, y, W * 0.84, Math.max(2, u * 0.002), '#d6d8dc', { name: 'Divider' });
  y += u * 0.045 * sp;
  const hx = W * 0.08, hw = W * 0.2, x = W * 0.31, w = W * 0.61;
  const row = (label: string, draw: (y: number) => number, last = false) => {
    text(c, label, hx, y + u * 0.004, hw, { font: sans, weight: 800, size: u * 0.021, fill: accent, upper: true, spacing: u * 0.004, align: 'left', name: 'Heading' });
    y = draw(y);
    if (!last) { y += u * 0.035 * sp; box(c, hx, y, W * 0.84, Math.max(1, u * 0.0012), '#e6e7ea', { name: 'Divider' }); y += u * 0.035 * sp; }
  };
  row('Profile', (y0) => { const t = para(c, cv.profile, x, y0, w, { font: sans, weight: 500, size: u * 0.023, fill: ink, name: 'Profile' }); return t.y + t.h; });
  row('Experience', (y0) => jobs(c, cv.jobs, x, y0, w, ink, muted, sans, sp));
  row('Education', (y0) => schools(c, cv.school, x, y0, w, ink, muted, sans));
  row('Skills', (y0) => { const t = para(c, cv.skills.join('  ·  '), x, y0, w, { font: sans, weight: 600, size: u * 0.022, fill: ink, lh: 1.6, name: 'Skills' }); return t.y + t.h; }, true);
}

/** Name band across the top with the photo on its edge; experience left, a tinted column of extras right. */
function banner(c: Kit, th: Theme, cv: Cv, sp: number): void {
  const { W, H, u } = c, font = th.nFont;
  c.bg = th.page;
  const bh = H * 0.17;
  box(c, 0, 0, W, bh, th.head, { name: 'Name band' });
  const d = bh * 0.95, px = W * 0.08, py = bh - d * 0.55;
  box(c, px - u * 0.012, py - u * 0.012, d + u * 0.024, d + u * 0.024, th.page, { shape: 'ellipse', name: 'Photo ring' });
  themePic(c, th, 0, px, py, d, d, 'circle');
  const nx = px + d + W * 0.05, nw = W - nx - W * 0.06;
  const n = text(c, cv.name, nx, 0, nw, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.075, fill: '#ffffff', align: 'left', upper: th.upper ?? true, name: 'Name' });
  const r = text(c, cv.role, nx, 0, nw, { font: th.kFont[0], weight: th.kFont[1], size: u * 0.025, fill: th.kicker, upper: true, spacing: u * 0.006, align: 'left', name: 'Job title' });
  n.y = (bh - n.h - r.h - u * 0.01) / 2; r.y = n.y + n.h + u * 0.01;
  // right column: a tinted panel to the bottom margin
  const rx = W * 0.645, rw = W * 0.29, top = bh + u * 0.1, gap = u * 0.055 * sp;
  box(c, rx - W * 0.03, top - u * 0.035, rw + W * 0.06, H - top - u * 0.025, th.bubble, { radius: u * 0.02, name: 'Side panel' });
  let y = heading(c, 'Contact', rx, top, rw, th.ink, th.frame, th.kFont[0]);
  let b = lines(c, cv.contact, rx, y, rw, th.ink, font, 'Contact', 0.021);
  y = heading(c, 'Skills', rx, b.y + b.h + gap, rw, th.ink, th.frame, th.kFont[0]);
  b = lines(c, cv.skills, rx, y, rw, th.ink, font, 'Skills', 0.021);
  y = heading(c, 'Education', rx, b.y + b.h + gap, rw, th.ink, th.frame, th.kFont[0]);
  y = schools(c, cv.school, rx, y, rw, th.ink, '#4f5563', font);
  if (cv.langs) { y = heading(c, 'Languages', rx, y + gap, rw, th.ink, th.frame, th.kFont[0]); lines(c, cv.langs, rx, y, rw, th.ink, font, 'Languages', 0.021); }
  // left column, starting below the photo that sits on the band's edge
  const x = W * 0.08, w = W * 0.5;
  y = heading(c, 'Profile', x, Math.max(top, py + d + u * 0.05), w, th.ink, th.frame, th.kFont[0]);
  const p = para(c, cv.profile, x, y, w, { font, weight: 500, size: u * 0.023, fill: th.ink, name: 'Profile' });
  y = heading(c, 'Experience', x, p.y + p.h + gap, w, th.ink, th.frame, th.kFont[0]);
  jobs(c, cv.jobs, x, y, w, th.ink, '#4f5563', font, sp);
}

// ---------- business cards ----------
interface Card { name: string; role: string; org: string; lines: string[]; initials: string }
const CARD_MAYA: Card = { name: 'Maya Chen', role: 'Product Designer', org: 'Studio North', lines: ['(555) 010-4455', 'maya@studionorth.co', 'studionorth.co'], initials: 'MC' };
const CARD_OLIVER: Card = { name: 'Oliver Grant', role: 'Founder & Head Baker', org: 'Grant & Crumb Bakery', lines: ['(555) 010-2210', 'hello@grantandcrumb.com', '14 Mill Street, Burlington'], initials: 'GC' };
const CARD_AISHA: Card = { name: 'Aisha Rahman', role: 'Real Estate Agent', org: 'Harbor Homes Realty', lines: ['(555) 010-6633', 'aisha@harborhomes.com', 'harborhomes.com'], initials: 'AR' };
const CARD_LEO: Card = { name: 'Leo Martins', role: 'Personal Trainer', org: 'Strong Start Fitness', lines: ['(555) 010-9087', 'leo@strongstart.fit', '@leotrains'], initials: 'LM' };

function contact(c: Kit, lines: string[], x: number, y: number, w: number, ink: string, font: string, align: 'left' | 'right' = 'left', size = 0.05): TextEl {
  return para(c, lines.join('\n'), x, y, w, { font, weight: 600, size: c.u * size, fill: ink, lh: 1.5, align, name: 'Contact' });
}
/** Every card has a back (page 2), like a printed card: a solid colour with the mark and one line. */
function cardBack(c: Kit, bg: string, mark: string, markFont: [string, number], ink: string, line: string, lineInk: string, lineFont: string, frame?: string): void {
  const { W, H, u } = c;
  c.bg = bg;
  if (frame) { box(c, u * 0.05, u * 0.05, W - u * 0.1, H - u * 0.1, 'rgba(0,0,0,0)', { stroke: frame, strokeWidth: u * 0.004, name: 'Frame' }); box(c, u * 0.068, u * 0.068, W - u * 0.136, H - u * 0.136, 'rgba(0,0,0,0)', { stroke: frame, strokeWidth: u * 0.0016, name: 'Frame' }); }
  const m = text(c, mark, W * 0.1, 0, W * 0.8, { font: markFont[0], weight: markFont[1], size: u * 0.3, fill: ink, lines: 2, lh: 1, name: 'Mark' });
  const l = text(c, line, W * 0.15, 0, W * 0.7, { font: lineFont, weight: 700, size: u * 0.045, fill: lineInk, upper: true, spacing: u * 0.012, name: 'Line' });
  m.y = (H - m.h - l.h - u * 0.06) / 2; l.y = m.y + m.h + u * 0.06;
}
/** White card: name and role top-left, monogram top-right, company bottom-left and contact bottom-right on one baseline. */
function cardMinimal(c: Kit, k: Card, accent: string): void {
  const { W, H, u } = c, ink = '#1f2328', sans = 'Inter', m = u * 0.1;
  c.bg = '#ffffff';
  box(c, 0, H - u * 0.03, W, u * 0.03, accent, { name: 'Accent edge' });
  const n = text(c, k.name, m, m * 0.95, W * 0.6, { font: 'Playfair Display', weight: 700, size: u * 0.12, fill: ink, align: 'left', name: 'Name' });
  const r = text(c, k.role, m, n.y + n.h + u * 0.01, W * 0.6, { font: sans, weight: 700, size: u * 0.042, fill: accent, upper: true, spacing: u * 0.008, align: 'left', name: 'Job title' });
  box(c, m, r.y + r.h + u * 0.045, u * 0.12, u * 0.008, accent, { name: 'Rule' });
  text(c, k.initials, W - m - W * 0.2, m * 0.85, W * 0.2, { font: 'Playfair Display', weight: 700, size: u * 0.1, fill: accent, align: 'right', name: 'Monogram' });
  const ct = contact(c, k.lines, W * 0.48, 0, W * 0.52 - m, ink, sans, 'right', 0.046);
  ct.y = H - u * 0.03 - m * 0.85 - ct.h;
  const o = text(c, k.org, m, 0, W * 0.4, { font: sans, weight: 800, size: u * 0.046, fill: ink, align: 'left', lines: 2, lh: 1.2, name: 'Company' });
  o.y = ct.y + ct.h - o.h;
}
/** Dark card with a gold monogram ring, serif name, contact in soft white. */
function cardMonogram(c: Kit, k: Card): void {
  const { W, H, u } = c, gold = '#d2ae5a', sans = 'Montserrat';
  c.bg = '#1c1c22';
  const d = H * 0.46, cx = W * 0.2, cy = H * 0.5;
  box(c, cx - d / 2, cy - d / 2, d, d, 'rgba(0,0,0,0)', { shape: 'ellipse', stroke: gold, strokeWidth: u * 0.008, name: 'Monogram ring' });
  box(c, cx - d / 2 - u * 0.022, cy - d / 2 - u * 0.022, d + u * 0.044, d + u * 0.044, 'rgba(0,0,0,0)', { shape: 'ellipse', stroke: gold, strokeWidth: u * 0.003, name: 'Monogram ring' });
  const m = text(c, k.initials, cx - d / 2, 0, d, { font: 'DM Serif Display', weight: 400, size: d * 0.42, fill: gold, name: 'Monogram' });
  m.y = cy - m.h / 2;
  box(c, W * 0.385, H * 0.16, Math.max(2, u * 0.003), H * 0.68, 'rgba(210,174,90,0.5)', { name: 'Divider' });
  const x = W * 0.43, w = W * 0.5;
  const n = text(c, k.name, x, 0, w, { font: 'DM Serif Display', weight: 400, size: u * 0.115, fill: gold, align: 'left', name: 'Name' });
  const r = text(c, k.role, x, 0, w, { font: sans, weight: 700, size: u * 0.038, fill: '#ffffff', upper: true, spacing: u * 0.008, align: 'left', name: 'Job title' });
  const ct = contact(c, k.lines, x, 0, w, 'rgba(255,255,255,0.86)', sans, 'left', 0.042);
  const total = n.h + u * 0.01 + r.h + u * 0.07 + ct.h;
  n.y = (H - total) / 2; r.y = n.y + n.h + u * 0.01; ct.y = r.y + r.h + u * 0.07;
}
/** A coloured side with big initials and the company; name, role and contact on white. */
function cardBand(c: Kit, k: Card, th: Theme): void {
  const { W, H, u } = c, sans = th.nFont;
  c.bg = '#ffffff';
  const bw = W * 0.36;
  box(c, 0, 0, bw, H, th.head, { name: 'Colour side' });
  box(c, bw, 0, u * 0.02, H, th.bar === th.bubble ? th.kicker : th.bar, { name: 'Accent edge' });
  const m = text(c, k.initials, bw * 0.1, 0, bw * 0.8, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.24, fill: '#ffffff', name: 'Initials' });
  const o = text(c, k.org, bw * 0.12, 0, bw * 0.76, { font: sans, weight: 700, size: u * 0.04, fill: th.kicker, upper: true, spacing: u * 0.006, lines: 2, lh: 1.2, name: 'Company' });
  m.y = (H - m.h - o.h - u * 0.03) / 2; o.y = m.y + m.h + u * 0.03;
  const x = bw + W * 0.075, w = W - x - W * 0.06;
  const n = text(c, k.name, x, 0, w, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.105, fill: th.ink, align: 'left', name: 'Name' });
  const r = text(c, k.role, x, 0, w, { font: sans, weight: 700, size: u * 0.04, fill: th.frame, upper: true, spacing: u * 0.006, align: 'left', name: 'Job title' });
  const ct = contact(c, k.lines, x, 0, w, th.ink, sans, 'left', 0.046);
  const total = n.h + u * 0.012 + r.h + u * 0.08 + ct.h;
  n.y = (H - total) / 2; r.y = n.y + n.h + u * 0.012;
  box(c, x, r.y + r.h + u * 0.035, u * 0.1, u * 0.008, th.bar === th.bubble ? th.kicker : th.bar, { name: 'Rule' });
  ct.y = r.y + r.h + u * 0.08;
}
/** A full-height photo on the left, the words on the right, a colour edge (the old version left the right half empty). */
function cardPortrait(c: Kit, k: Card, th: Theme): void {
  const { W, H, u } = c, sans = th.nFont;
  c.bg = th.page;
  const pw = W * 0.38;
  themePic(c, th, 0, 0, 0, pw, H, 'none', 0);
  box(c, pw, 0, u * 0.025, H, th.bar, { name: 'Accent edge' });
  const x = pw + W * 0.07, w = W - x - W * 0.06;
  const n = text(c, k.name, x, 0, w, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.11, fill: th.ink, align: 'left', name: 'Name' });
  const r = text(c, k.role, x, 0, w, { font: sans, weight: 800, size: u * 0.042, fill: th.frame, upper: true, spacing: u * 0.005, align: 'left', name: 'Job title' });
  const o = text(c, k.org, x, 0, w, { font: sans, weight: 600, size: u * 0.042, fill: th.ink, align: 'left', name: 'Company' });
  const ct = contact(c, k.lines, x, 0, w, th.ink, sans, 'left', 0.045);
  const total = n.h + u * 0.012 + r.h + u * 0.012 + o.h + u * 0.09 + ct.h;
  n.y = (H - total) / 2; r.y = n.y + n.h + u * 0.012; o.y = r.y + r.h + u * 0.012;
  box(c, x, o.y + o.h + u * 0.04, w, Math.max(2, u * 0.003), th.shadow, { name: 'Divider' });
  ct.y = o.y + o.h + u * 0.09;
}

/** Lay a page out as large as it fits: draw it, and if any words run past the bottom margin, draw it again a little smaller
 * (every size and gap here comes from `u`, so scaling `u` scales the type and spacing together). */
export function fitPage(c: Kit, draw: (c: Kit) => void): void {
  for (let k = 1.15; ; k *= 0.94) { // short ones may grow a little to fill the page
    const t: Kit = { ...c, u: c.u * k, els: [], assets: {} };
    draw(t);
    const bottom = Math.max(0, ...t.els.filter((e) => e.type === 'text').map((e) => e.y + e.h));
    if (bottom <= c.H - c.u * 0.05 || k < 0.7) { c.els.push(...t.els); Object.assign(c.assets, t.assets); c.bg = t.bg; return; }
  }
}
/** Lay a résumé out to fill its page: the largest type (×0.7–1.06) that fits above the bottom margin, then the widest
 * section spacing (×1–2.2) that still fits, so a short résumé doesn't leave the bottom third empty. */
function fillPage(c: Kit, draw: (c: Kit, sp: number) => void): void {
  const bottomOf = (k: number, sp: number) => {
    const t: Kit = { ...c, u: c.u * k, els: [], assets: {} };
    draw(t, sp);
    return { t, bottom: Math.max(0, ...t.els.filter((e) => e.type === 'text').map((e) => e.y + e.h)) };
  };
  const limit = c.H - c.u * 0.07;
  let k = 1.06;
  while (k > 0.7 && bottomOf(k, 1).bottom > limit) k *= 0.96;
  let best = bottomOf(k, 1);
  for (let sp = 1.15; sp <= 2.2; sp += 0.15) { const r = bottomOf(k, sp); if (r.bottom > limit) break; best = r; }
  c.els.push(...best.t.els); Object.assign(c.assets, best.t.assets); c.bg = best.t.bg;
}
const career = (id: string, name: string, format: Format, style: string, colors: string[], tags: string[], build: (c: Kit) => void, more?: ((c: Kit) => void)[]): CollectionTemplate =>
  ({ id, name, format, style, colors, occasion: 'career', tags, build, more });
const cv = (id: string, name: string, style: string, colors: string[], tags: string[], draw: (c: Kit, sp: number) => void) =>
  career(id, name, 'document', style, colors, tags, (c) => fillPage(c, draw));
const CV_TAGS = ['resume', 'résumé', 'cv', 'curriculum vitae', 'job application', 'career', 'work history', 'professional'];
const CARD_TAGS = ['business card', 'visiting card', 'contact card', 'name card', 'networking', 'small business', 'print'];

export const CAREER_SETS: { sub: string; label: string; cover: string; list: CollectionTemplate[] }[] = [
  { sub: 'resume', label: 'Résumés & CVs', cover: 'resume-sidebar-navy', list: [
    cv('resume-sidebar-navy', 'Modern Sidebar Résumé', 'Modern', ['navy', 'coral', 'white'], [...CV_TAGS, 'photo', 'designer', 'modern'], (c, sp) => sidebar(c, T.coral, MAYA, sp)),
    cv('resume-classic-serif', 'Classic Serif Résumé', 'Elegant', ['white', 'black'], [...CV_TAGS, 'no photo', 'simple', 'ats friendly', 'marketing'], (c, sp) => classic(c, JORDAN, '#2f5d8a', sp)),
    cv('resume-banner-teal', 'Photo Banner Résumé', 'Modern', ['teal', 'yellow', 'white'], [...CV_TAGS, 'photo', 'nurse', 'healthcare'], (c, sp) => banner(c, T.teal, SAM, sp)),
    cv('resume-sidebar-forest', 'Green Sidebar CV', 'Minimal', ['green', 'cream'], [...CV_TAGS, 'photo', 'marketing'], (c, sp) => sidebar(c, T.forest, JORDAN, sp)),
    cv('resume-classic-rose', 'Soft Classic CV', 'Elegant', ['white', 'pink'], [...CV_TAGS, 'no photo', 'simple', 'nurse'], (c, sp) => classic(c, SAM, '#a8475e', sp)),
    cv('resume-banner-luxe', 'Black & Gold Résumé', 'Elegant', ['black', 'gold', 'cream'], [...CV_TAGS, 'photo', 'executive', 'designer'], (c, sp) => banner(c, T.luxe, MAYA, sp)),
  ] },
  { sub: 'business-card', label: 'Business cards', cover: 'card-minimal-raspberry', list: [
    career('card-minimal-raspberry', 'Minimal Business Card', 'bizcard', 'Minimal', ['white', 'pink'], [...CARD_TAGS, 'designer', 'simple', 'front and back'], (c) => cardMinimal(c, CARD_MAYA, '#c2255c'),
      [(c) => cardBack(c, '#c2255c', CARD_MAYA.initials, ['Playfair Display', 700], '#ffffff', 'studionorth.co', 'rgba(255,255,255,0.9)', 'Inter')]),
    career('card-monogram-gold', 'Gold Monogram Card', 'bizcard', 'Elegant', ['black', 'gold'], [...CARD_TAGS, 'luxury', 'monogram', 'bakery', 'front and back'], (c) => cardMonogram(c, CARD_OLIVER),
      [(c) => cardBack(c, '#1c1c22', 'Grant & Crumb', ['DM Serif Display', 400], '#d2ae5a', 'Baked fresh every morning', '#ffffff', 'Montserrat', '#d2ae5a')]),
    career('card-band-navy', 'Bold Initials Card', 'bizcard', 'Bold', ['navy', 'coral', 'white'], [...CARD_TAGS, 'real estate', 'realtor', 'initials', 'front and back'], (c) => cardBand(c, CARD_AISHA, T.coral),
      [(c) => cardBack(c, T.coral.head, 'Harbor Homes', [T.coral.tFont[0], T.coral.tFont[1]], '#ffffff', 'Your next home starts here', T.coral.kicker, T.coral.nFont)]),
    career('card-portrait-teal', 'Photo Business Card', 'bizcard', 'Modern', ['teal', 'yellow'], [...CARD_TAGS, 'photo', 'trainer', 'fitness', 'headshot', 'front and back'], (c) => cardPortrait(c, CARD_LEO, T.teal),
      [(c) => cardBack(c, T.teal.head, 'Strong Start', [T.teal.tFont[0], T.teal.tFont[1]], '#ffffff', 'First session free  ·  @leotrains', T.teal.kicker, T.teal.nFont)]),
    career('card-minimal-blue', 'Clean Blue Card', 'bizcard', 'Minimal', ['white', 'blue'], [...CARD_TAGS, 'realtor', 'simple', 'front and back'], (c) => cardMinimal(c, CARD_AISHA, '#2f5d8a'),
      [(c) => cardBack(c, '#2f5d8a', CARD_AISHA.initials, ['Playfair Display', 700], '#ffffff', 'harborhomes.com', 'rgba(255,255,255,0.9)', 'Inter')]),
    career('card-band-forest', 'Green Initials Card', 'bizcard', 'Modern', ['green', 'cream'], [...CARD_TAGS, 'bakery', 'cafe', 'initials', 'front and back'], (c) => cardBand(c, CARD_OLIVER, T.forest),
      [(c) => cardBack(c, T.forest.head, 'Grant & Crumb', [T.forest.tFont[0], T.forest.tFont[1]], '#ffffff', 'Fresh bread daily  ·  since 2014', T.forest.kicker, T.forest.nFont)]),
  ] },
];

/** Font weights these templates use (previews wait for them so text is measured exactly). */
export const CAREER_FONTS: [string, number][] = [
  ...[500, 600, 700, 800].map((w) => ['Inter', w] as [string, number]), ...[500, 600, 700, 800].map((w) => ['Poppins', w] as [string, number]),
  ...[500, 600, 700, 800, 900].map((w) => ['Montserrat', w] as [string, number]), ...[600, 700, 800, 900].map((w) => ['Nunito', w] as [string, number]),
  ['Playfair Display', 700], ['DM Serif Display', 400],
];
