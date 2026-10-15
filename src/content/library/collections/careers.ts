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
import { box, text, type CollectionTemplate, type Kit } from './kit';
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
    { role: 'Senior Product Designer', org: 'Brightside Health', dates: '2022 – Present', points: ['Led the redesign of the patient app (4.8★, 1M+ users)', 'Built the design system used by 6 product teams'] },
    { role: 'Product Designer', org: 'Studio North', dates: '2019 – 2022', points: ['Designed booking flows for 30+ local businesses', 'Ran weekly user tests and shared what we learned'] },
    { role: 'UX Designer', org: 'Little Pine Labs', dates: '2017 – 2019', points: ['Shaped the first version of a reading app for kids'] },
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
    { role: 'Marketing Manager', org: 'Harbor Coffee Co.', dates: '2021 – Present', points: ['Grew online sales 64% in two years', 'Launched the loyalty app and its first three campaigns'] },
    { role: 'Content Lead', org: 'Fieldnote Media', dates: '2018 – 2021', points: ['Ran a 12-person content calendar across 5 channels', 'Doubled newsletter subscribers to 48,000'] },
    { role: 'Marketing Coordinator', org: 'Bluebird Events', dates: '2016 – 2018', points: ['Planned 40+ events for up to 2,000 guests'] },
  ],
  school: [['BA, Communications', 'University of Texas · 2016'], ['Google Analytics Certificate', '2020']],
  skills: ['Campaign strategy', 'Content & SEO', 'Email marketing', 'Analytics', 'Budgeting', 'Team leadership'],
};
const SAM: Cv = {
  name: 'Sam Rivera', role: 'Registered Nurse',
  contact: ['(555) 010-3320', 'sam.rivera@email.com', 'Denver, CO'],
  profile: 'Caring registered nurse with 5 years in busy emergency and surgical units. Calm under pressure, clear with patients and families, and a dependable team player.',
  jobs: [
    { role: 'Emergency Room Nurse', org: 'St. Lucia Medical Center', dates: '2022 – Present', points: ['Triage and care for 25+ patients a shift', 'Precept and mentor new graduate nurses'] },
    { role: 'Surgical Nurse', org: 'Mountain View Hospital', dates: '2019 – 2022', points: ['Pre- and post-op care across 4 surgical teams'] },
  ],
  school: [['BSN, Nursing', 'University of Colorado · 2019'], ['BLS & ACLS Certified', 'Renewed 2026']],
  skills: ['Emergency care', 'Patient education', 'IV therapy', 'Epic charting', 'Bilingual (EN/ES)'],
};

/** A section heading with a short rule under it. */
function heading(c: Kit, s: string, x: number, y: number, w: number, ink: string, accent: string, font: string, center = false): number {
  const t = text(c, s, x, y, w, { font, weight: 800, size: c.u * 0.026, fill: ink, upper: true, spacing: c.u * 0.004, align: center ? 'center' : 'left', name: 'Heading' });
  const rw = c.u * 0.05;
  box(c, center ? x + (w - rw) / 2 : x, t.y + t.h + c.u * 0.008, rw, c.u * 0.0045, accent, { radius: c.u * 0.002, name: 'Rule' });
  return t.y + t.h + c.u * 0.036;
}
/** The jobs, one under another: role, place · dates, then bullet points. Returns the next y. */
function jobs(c: Kit, list: Job[], x: number, y: number, w: number, ink: string, muted: string, accent: string, font: string, size = 1): number {
  const u = c.u * size;
  for (const j of list) {
    const r = text(c, j.role, x, y, w, { font, weight: 800, size: u * 0.031, fill: ink, align: 'left', name: 'Job title' });
    const o = text(c, `${j.org}  ·  ${j.dates}`, x, r.y + r.h + u * 0.004, w, { font, weight: 600, size: u * 0.022, fill: muted, align: 'left', name: 'Company & dates' });
    y = o.y + o.h + u * 0.014;
    for (const p of j.points) {
      box(c, x, y + u * 0.01, u * 0.009, u * 0.009, accent, { shape: 'ellipse', name: 'Bullet' });
      const t = text(c, p, x + u * 0.024, y, w - u * 0.024, { font, weight: 500, size: u * 0.022, fill: ink, lines: 2, lh: 1.35, align: 'left', name: 'Achievement' });
      y = t.y + t.h + u * 0.008;
    }
    y += u * 0.034;
  }
  return y;
}
function schools(c: Kit, list: Cv['school'], x: number, y: number, w: number, ink: string, muted: string, font: string, align: 'left' | 'center' = 'left'): number {
  for (const [d, p] of list) {
    const a = text(c, d, x, y, w, { font, weight: 800, size: c.u * 0.025, fill: ink, lines: 2, lh: 1.2, align, name: 'Degree' });
    const b = text(c, p, x, a.y + a.h + c.u * 0.004, w, { font, weight: 600, size: c.u * 0.021, fill: muted, align, name: 'School' });
    y = b.y + b.h + c.u * 0.024;
  }
  return y;
}
function list(c: Kit, items: string[], x: number, y: number, w: number, ink: string, font: string, name: string, size = 0.023): number {
  for (const s of items) { const t = text(c, s, x, y, w, { font, weight: 600, size: c.u * size, fill: ink, align: 'left', name }); y = t.y + t.h + c.u * 0.013; }
  return y;
}

/** Coloured column with a round photo, contact, skills, languages; the rest on the right. */
function sidebar(c: Kit, th: Theme, cv: Cv): void {
  const { W, H, u } = c, sw = W * 0.34, font = th.nFont, light = 'rgba(255,255,255,0.86)';
  c.bg = '#ffffff';
  box(c, 0, 0, sw, H, th.head, { name: 'Side column' });
  const d = sw * 0.62, py = u * 0.07;
  box(c, (sw - d) / 2 - u * 0.01, py - u * 0.01, d + u * 0.02, d + u * 0.02, th.bar, { shape: 'ellipse', name: 'Photo ring' });
  themePic(c, th, 0, (sw - d) / 2, py, d, d, 'circle');
  const sx = sw * 0.14, sw2 = sw * 0.72;
  let y = py + d + u * 0.07;
  y = heading(c, 'Contact', sx, y, sw2, '#ffffff', th.bar, th.kFont[0]);
  y = list(c, cv.contact, sx, y, sw2, light, font, 'Contact line', 0.022) + u * 0.05;
  y = heading(c, 'Skills', sx, y, sw2, '#ffffff', th.bar, th.kFont[0]);
  y = list(c, cv.skills, sx, y, sw2, light, font, 'Skill', 0.022) + u * 0.05;
  if (cv.langs) { y = heading(c, 'Languages', sx, y, sw2, '#ffffff', th.bar, th.kFont[0]); list(c, cv.langs, sx, y, sw2, light, font, 'Language', 0.022); }
  // right column
  const x = sw + W * 0.06, w = W - x - W * 0.06;
  const n = text(c, cv.name, x, u * 0.08, w, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.07, fill: th.ink, align: 'left', upper: th.upper ?? true, name: 'Name' });
  const r = text(c, cv.role, x, n.y + n.h + u * 0.008, w, { font: th.kFont[0], weight: th.kFont[1], size: u * 0.026, fill: th.frame, upper: true, spacing: u * 0.006, align: 'left', name: 'Job title' });
  y = r.y + r.h + u * 0.06;
  y = heading(c, 'Profile', x, y, w, th.ink, th.bar, th.kFont[0]);
  const p = text(c, cv.profile, x, y, w, { font, weight: 500, size: u * 0.024, fill: th.ink, lines: 6, lh: 1.45, align: 'left', name: 'Profile' });
  y = heading(c, 'Experience', x, p.y + p.h + u * 0.06, w, th.ink, th.bar, th.kFont[0]);
  y = jobs(c, cv.jobs, x, y, w, th.ink, '#6b7280', th.frame, font);
  y = heading(c, 'Education', x, y + u * 0.03, w, th.ink, th.bar, th.kFont[0]);
  schools(c, cv.school, x, y, w, th.ink, '#6b7280', font);
}

/** No photo: centred serif name and contact line, headings in a left column, one calm column of content. */
function classic(c: Kit, cv: Cv, accent: string): void {
  const { W, u } = c, ink = '#1f2328', muted = '#6b7280', serif = 'Playfair Display', sans = 'Inter';
  c.bg = '#ffffff';
  const n = text(c, cv.name, W * 0.1, u * 0.08, W * 0.8, { font: serif, weight: 700, size: u * 0.075, fill: ink, name: 'Name' });
  const r = text(c, cv.role, W * 0.1, n.y + n.h + u * 0.008, W * 0.8, { font: sans, weight: 600, size: u * 0.024, fill: accent, upper: true, spacing: u * 0.008, name: 'Job title' });
  const ct = text(c, cv.contact.join('   ·   '), W * 0.08, r.y + r.h + u * 0.025, W * 0.84, { font: sans, weight: 500, size: u * 0.021, fill: muted, name: 'Contact' });
  let y = ct.y + ct.h + u * 0.04;
  box(c, W * 0.08, y, W * 0.84, u * 0.002, '#d6d8dc', { name: 'Divider' });
  y += u * 0.045;
  const hx = W * 0.08, hw = W * 0.2, x = W * 0.31, w = W * 0.61;
  const row = (label: string, draw: (y: number) => number) => {
    text(c, label, hx, y, hw, { font: sans, weight: 800, size: u * 0.022, fill: accent, upper: true, spacing: u * 0.004, align: 'left', name: 'Heading' });
    y = draw(y) + u * 0.05;
  };
  row('Profile', (y0) => { const t = text(c, cv.profile, x, y0, w, { font: sans, weight: 500, size: u * 0.024, fill: ink, lines: 6, lh: 1.5, align: 'left', name: 'Profile' }); return t.y + t.h; });
  row('Experience', (y0) => jobs(c, cv.jobs, x, y0, w, ink, muted, accent, sans) - u * 0.022);
  row('Education', (y0) => schools(c, cv.school, x, y0, w, ink, muted, sans));
  row('Skills', (y0) => { const t = text(c, cv.skills.join('  ·  '), x, y0, w, { font: sans, weight: 600, size: u * 0.022, fill: ink, lines: 3, lh: 1.6, align: 'left', name: 'Skills' }); return t.y + t.h; });
}

/** Name band across the top with the photo on its edge; experience left, a tinted column of extras right. */
function banner(c: Kit, th: Theme, cv: Cv): void {
  const { W, H, u } = c, font = th.nFont;
  c.bg = th.page;
  const bh = H * 0.17;
  box(c, 0, 0, W, bh, th.head, { name: 'Name band' });
  const d = bh * 0.95, px = W * 0.08, py = bh - d * 0.55;
  box(c, px - u * 0.012, py - u * 0.012, d + u * 0.024, d + u * 0.024, th.page, { shape: 'ellipse', name: 'Photo ring' });
  themePic(c, th, 0, px, py, d, d, 'circle');
  const nx = px + d + W * 0.05, nw = W - nx - W * 0.06;
  const n = text(c, cv.name, nx, 0, nw, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.07, fill: '#ffffff', align: 'left', upper: th.upper ?? true, name: 'Name' });
  const r = text(c, cv.role, nx, 0, nw, { font: th.kFont[0], weight: th.kFont[1], size: u * 0.024, fill: th.kicker, upper: true, spacing: u * 0.006, align: 'left', name: 'Job title' });
  n.y = (bh - n.h - r.h - u * 0.01) / 2; r.y = n.y + n.h + u * 0.01;
  // right column: tinted panel
  const rx = W * 0.64, rw = W * 0.3, top = bh + u * 0.11;
  box(c, rx - W * 0.025, top - u * 0.03, rw + W * 0.05, H - top - u * 0.03, th.bubble, { radius: u * 0.02, name: 'Side panel' });
  let y = heading(c, 'Contact', rx, top, rw, th.ink, th.frame, th.kFont[0]);
  y = list(c, cv.contact, rx, y, rw, th.ink, font, 'Contact line', 0.021) + u * 0.05;
  y = heading(c, 'Skills', rx, y, rw, th.ink, th.frame, th.kFont[0]);
  y = list(c, cv.skills, rx, y, rw, th.ink, font, 'Skill', 0.021) + u * 0.05;
  y = heading(c, 'Education', rx, y, rw, th.ink, th.frame, th.kFont[0]);
  schools(c, cv.school, rx, y, rw, th.ink, '#5b6170', font);
  // left column
  const x = W * 0.08, w = W * 0.5;
  // the left column starts below the photo that sits on the band's edge (it used to cover the Profile heading)
  y = heading(c, 'Profile', x, Math.max(top, py + d + u * 0.05), w, th.ink, th.frame, th.kFont[0]);
  const p = text(c, cv.profile, x, y, w, { font, weight: 500, size: u * 0.023, fill: th.ink, lines: 7, lh: 1.5, align: 'left', name: 'Profile' });
  y = heading(c, 'Experience', x, p.y + p.h + u * 0.055, w, th.ink, th.frame, th.kFont[0]);
  jobs(c, cv.jobs, x, y, w, th.ink, '#5b6170', th.frame, font);
}

// ---------- business cards ----------
interface Card { name: string; role: string; org: string; lines: string[]; initials: string }
const CARD_MAYA: Card = { name: 'Maya Chen', role: 'Product Designer', org: 'Studio North', lines: ['(555) 010-4455', 'maya@studionorth.co', 'studionorth.co'], initials: 'MC' };
const CARD_OLIVER: Card = { name: 'Oliver Grant', role: 'Founder & Head Baker', org: 'Grant & Crumb Bakery', lines: ['(555) 010-2210', 'hello@grantandcrumb.com', '14 Mill Street, Burlington'], initials: 'GC' };
const CARD_AISHA: Card = { name: 'Aisha Rahman', role: 'Real Estate Agent', org: 'Harbor Homes Realty', lines: ['(555) 010-6633', 'aisha@harborhomes.com', 'harborhomes.com'], initials: 'AR' };
const CARD_LEO: Card = { name: 'Leo Martins', role: 'Personal Trainer', org: 'Strong Start Fitness', lines: ['(555) 010-9087', 'leo@strongstart.fit', '@leotrains'], initials: 'LM' };

function contact(c: Kit, lines: string[], x: number, y: number, w: number, ink: string, font: string, align: 'left' | 'right' = 'left'): void {
  for (const s of lines) { const t = text(c, s, x, y, w, { font, weight: 600, size: c.u * 0.05, fill: ink, align, name: 'Contact line' }); y = t.y + t.h + c.u * 0.022; }
}
/** White card: name and role left, a thin accent rule, contact right, a small monogram corner. */
function cardMinimal(c: Kit, k: Card, accent: string): void {
  const { W, H, u } = c, ink = '#1f2328', sans = 'Inter';
  c.bg = '#ffffff';
  box(c, 0, H - u * 0.035, W, u * 0.035, accent, { name: 'Accent edge' });
  const n = text(c, k.name, W * 0.08, H * 0.2, W * 0.5, { font: 'Playfair Display', weight: 700, size: u * 0.11, fill: ink, align: 'left', name: 'Name' });
  const r = text(c, k.role, W * 0.08, n.y + n.h + u * 0.015, W * 0.5, { font: sans, weight: 700, size: u * 0.042, fill: accent, upper: true, spacing: u * 0.008, align: 'left', name: 'Job title' });
  box(c, W * 0.08, r.y + r.h + u * 0.05, u * 0.12, u * 0.008, accent, { name: 'Rule' });
  text(c, k.org, W * 0.08, r.y + r.h + u * 0.1, W * 0.5, { font: sans, weight: 600, size: u * 0.045, fill: '#6b7280', align: 'left', name: 'Company' });
  contact(c, k.lines, W * 0.52, H * 0.52, W * 0.4, ink, sans, 'right');
  const m = text(c, k.initials, W * 0.78, H * 0.12, W * 0.14, { font: 'Playfair Display', weight: 700, size: u * 0.09, fill: accent, align: 'right', name: 'Monogram' });
  void m;
}
/** Dark card with a gold monogram ring, serif name, contact in soft white. */
function cardMonogram(c: Kit, k: Card): void {
  const { W, H, u } = c, gold = '#d2ae5a', sans = 'Montserrat';
  c.bg = '#1c1c22';
  const d = H * 0.42, cx = W * 0.2, cy = H * 0.5;
  box(c, cx - d / 2, cy - d / 2, d, d, 'rgba(0,0,0,0)', { shape: 'ellipse', stroke: gold, strokeWidth: u * 0.008, name: 'Monogram ring' });
  const m = text(c, k.initials, cx - d / 2, 0, d, { font: 'DM Serif Display', weight: 400, size: d * 0.42, fill: gold, name: 'Monogram' });
  m.y = cy - m.h / 2;
  const x = W * 0.38, w = W * 0.55;
  const n = text(c, k.name, x, H * 0.18, w, { font: 'DM Serif Display', weight: 400, size: u * 0.11, fill: gold, align: 'left', name: 'Name' });
  const r = text(c, k.role, x, n.y + n.h + u * 0.01, w, { font: sans, weight: 700, size: u * 0.04, fill: '#ffffff', upper: true, spacing: u * 0.008, align: 'left', name: 'Job title' });
  box(c, x, r.y + r.h + u * 0.045, u * 0.1, u * 0.006, gold, { name: 'Rule' });
  contact(c, [k.org, ...k.lines], x, r.y + r.h + u * 0.09, w, 'rgba(255,255,255,0.82)', sans);
}
/** A coloured side with big initials and the company; name, role and contact on white. */
function cardBand(c: Kit, k: Card, th: Theme): void {
  const { W, H, u } = c, sans = th.nFont;
  c.bg = '#ffffff';
  const bw = W * 0.36;
  box(c, 0, 0, bw, H, th.head, { name: 'Colour side' });
  const m = text(c, k.initials, bw * 0.1, 0, bw * 0.8, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.22, fill: '#ffffff', name: 'Initials' });
  const o = text(c, k.org, bw * 0.1, 0, bw * 0.8, { font: sans, weight: 700, size: u * 0.04, fill: th.kicker, upper: true, spacing: u * 0.006, lines: 2, lh: 1.2, name: 'Company' });
  m.y = (H - m.h - o.h - u * 0.03) / 2; o.y = m.y + m.h + u * 0.03;
  const x = bw + W * 0.07, w = W - x - W * 0.06;
  const n = text(c, k.name, x, H * 0.17, w, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.1, fill: th.ink, align: 'left', name: 'Name' });
  const r = text(c, k.role, x, n.y + n.h + u * 0.012, w, { font: sans, weight: 700, size: u * 0.042, fill: th.frame, upper: true, spacing: u * 0.006, align: 'left', name: 'Job title' });
  contact(c, k.lines, x, r.y + r.h + u * 0.08, w, th.ink, sans);
}
/** A round photo on a soft page, name and contact beside it, a colour strip at the bottom. */
function cardPortrait(c: Kit, k: Card, th: Theme): void {
  const { W, H, u } = c, sans = th.nFont;
  c.bg = th.page;
  box(c, 0, H - u * 0.07, W, u * 0.07, th.head, { name: 'Colour strip' });
  const d = H * 0.56, px = W * 0.07, py = (H - u * 0.07 - d) / 2;
  box(c, px - u * 0.012, py - u * 0.012, d + u * 0.024, d + u * 0.024, th.bar, { shape: 'ellipse', name: 'Photo ring' });
  themePic(c, th, 0, px, py, d, d, 'circle');
  const x = px + d + W * 0.06, w = W - x - W * 0.05;
  const n = text(c, k.name, x, H * 0.14, w, { font: th.tFont[0], weight: th.tFont[1], size: u * 0.1, fill: th.ink, align: 'left', name: 'Name' });
  const r = text(c, `${k.role} · ${k.org}`, x, n.y + n.h + u * 0.012, w, { font: sans, weight: 700, size: u * 0.038, fill: th.frame, lines: 2, lh: 1.2, align: 'left', name: 'Job title' });
  contact(c, k.lines, x, r.y + r.h + u * 0.06, w, th.ink, sans);
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
const career = (id: string, name: string, format: Format, style: string, colors: string[], tags: string[], build: (c: Kit) => void): CollectionTemplate =>
  ({ id, name, format, style, colors, occasion: 'career', tags, build: format === 'document' ? (c) => fitPage(c, build) : build });
const CV_TAGS = ['resume', 'résumé', 'cv', 'curriculum vitae', 'job application', 'career', 'work history', 'professional'];
const CARD_TAGS = ['business card', 'visiting card', 'contact card', 'name card', 'networking', 'small business', 'print'];

export const CAREER_SETS: { sub: string; label: string; cover: string; list: CollectionTemplate[] }[] = [
  { sub: 'resume', label: 'Résumés & CVs', cover: 'resume-sidebar-navy', list: [
    career('resume-sidebar-navy', 'Modern Sidebar Résumé', 'document', 'Modern', ['navy', 'coral', 'white'], [...CV_TAGS, 'photo', 'designer', 'modern'], (c) => sidebar(c, T.coral, MAYA)),
    career('resume-classic-serif', 'Classic Serif Résumé', 'document', 'Elegant', ['white', 'black'], [...CV_TAGS, 'no photo', 'simple', 'ats friendly', 'marketing'], (c) => classic(c, JORDAN, '#2f5d8a')),
    career('resume-banner-teal', 'Photo Banner Résumé', 'document', 'Modern', ['teal', 'yellow', 'white'], [...CV_TAGS, 'photo', 'nurse', 'healthcare'], (c) => banner(c, T.teal, SAM)),
    career('resume-sidebar-forest', 'Green Sidebar CV', 'document', 'Minimal', ['green', 'cream'], [...CV_TAGS, 'photo', 'marketing'], (c) => sidebar(c, T.forest, JORDAN)),
    career('resume-classic-rose', 'Soft Classic CV', 'document', 'Elegant', ['white', 'pink'], [...CV_TAGS, 'no photo', 'simple', 'nurse'], (c) => classic(c, SAM, '#a8475e')),
    career('resume-banner-luxe', 'Black & Gold Résumé', 'document', 'Elegant', ['black', 'gold', 'cream'], [...CV_TAGS, 'photo', 'executive', 'designer'], (c) => banner(c, T.luxe, MAYA)),
  ] },
  { sub: 'business-card', label: 'Business cards', cover: 'card-minimal-raspberry', list: [
    career('card-minimal-raspberry', 'Minimal Business Card', 'bizcard', 'Minimal', ['white', 'pink'], [...CARD_TAGS, 'designer', 'simple'], (c) => cardMinimal(c, CARD_MAYA, '#c2255c')),
    career('card-monogram-gold', 'Gold Monogram Card', 'bizcard', 'Elegant', ['black', 'gold'], [...CARD_TAGS, 'luxury', 'monogram', 'bakery'], (c) => cardMonogram(c, CARD_OLIVER)),
    career('card-band-navy', 'Bold Initials Card', 'bizcard', 'Bold', ['navy', 'coral', 'white'], [...CARD_TAGS, 'real estate', 'realtor', 'initials'], (c) => cardBand(c, CARD_AISHA, T.coral)),
    career('card-portrait-teal', 'Photo Business Card', 'bizcard', 'Modern', ['teal', 'yellow'], [...CARD_TAGS, 'photo', 'trainer', 'fitness', 'headshot'], (c) => cardPortrait(c, CARD_LEO, T.teal)),
    career('card-minimal-blue', 'Clean Blue Card', 'bizcard', 'Minimal', ['white', 'blue'], [...CARD_TAGS, 'realtor', 'simple'], (c) => cardMinimal(c, CARD_AISHA, '#2f5d8a')),
    career('card-band-forest', 'Green Initials Card', 'bizcard', 'Modern', ['green', 'cream'], [...CARD_TAGS, 'bakery', 'cafe', 'initials'], (c) => cardBand(c, CARD_OLIVER, T.forest)),
  ] },
];

/** Font weights these templates use (previews wait for them so text is measured exactly). */
export const CAREER_FONTS: [string, number][] = [['Inter', 500], ['Inter', 600], ['Inter', 700], ['Inter', 800], ['Playfair Display', 700], ['DM Serif Display', 400], ['Montserrat', 700], ['Poppins', 700], ['Poppins', 800], ['Nunito', 600], ['Nunito', 800], ['Nunito', 900]];
