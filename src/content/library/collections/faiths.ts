/**
 * Multicultural celebrations built with the themed template system (./themed). Each set belongs to a topic in
 * taxonomy.json. Greetings in their own scripts, checked word by word:
 * - Arabic: رمضان كريم (Ramadan Kareem — "generous Ramadan").
 * - Hebrew: שנה טובה ומתוקה (Shana tova u'metuka — "a good and sweet year").
 * - Hindi: शुभ दीपावली (Shubh Deepavali — "auspicious Diwali").
 * Symbols follow each tradition (see the asset collections' notes); holidays are never mixed or swapped.
 */
import { fontsOf, themed, type ThemedSpec } from './themed';

// ---------- palettes ----------
const EMERALD_GOLD = { title: '#ffffff', ink: '#f3ead7', muted: '#cfe3d9', accent: '#e8c46a', onAccent: '#0e3b36', glow: '#ffcf6a' };
const HONEY_RED = { title: '#7a1426', ink: '#4a3a30', muted: '#7a6658', accent: '#b3243b', onAccent: '#ffffff' };
const SUNRISE = { title: '#5a3218', ink: '#4a3020', muted: '#7a5a40', accent: '#c76b2c', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.88)' };
const MAROON_GOLD = { title: '#7a1a2e', ink: '#4a2a20', muted: '#8a5a40', accent: '#c9932e', onAccent: '#ffffff', panel: '#fdf6ea' };
const BLUSH_SAND = { title: '#9a5f50', ink: '#5a4a44', muted: '#8a7a72', accent: '#d39a86', onAccent: '#ffffff' };

export const RAMADAN: ThemedSpec[] = [
  { id: 'ramadan-kareem-lanterns', name: 'Ramadan Kareem Lanterns', format: 'post', use: 'greeting', layout: 'hero', style: 'Luxury', colors: ['green', 'gold'], occasion: 'greeting',
    tags: ['ramadan kareem', 'ramadan mubarak', 'arabic', 'lanterns', 'fanous', 'mosque', 'greeting', 'emerald'],
    look: { scene: 'is-bg-emerald', pal: EMERALD_GOLD, title: ['Cinzel', 700], body: ['Montserrat', 600], top: 'is-lanterns', topColors: ['#d4a940', '#2a8f86', '#ffcf6a'], hero: 'is-mosque', heroColors: ['#d4a940', '#fff3c4'] },
    words: { native: { text: 'رمضان كريم', font: ['Aref Ruqaa', 700], script: 'ar' }, title: 'Ramadan Kareem', sub: 'Wishing you a blessed month of peace, reflection and joy' } },
];

export const ROSH_HASHANAH: ThemedSpec[] = [
  { id: 'shana-tova-umetuka', name: 'Shana Tova Umetuka', format: 'card', use: 'greeting', layout: 'framed', style: 'Elegant', colors: ['cream', 'red', 'gold'], occasion: 'greeting',
    tags: ['shana tova', 'shanah tovah', 'sweet new year', 'hebrew', 'apples and honey', 'greeting card'],
    look: { scene: 'jh-bg-parchment', pal: HONEY_RED, title: ['Parisienne', 400], body: ['Montserrat', 600], hero: 'jh-apple-honey', corner: 'jh-bee' },
    words: { native: { text: 'שנה טובה ומתוקה', font: ['Frank Ruhl Libre', 700], script: 'he' }, title: 'Shana Tova', sub: 'Wishing you a good and sweet New Year', details: ['With love, the Cohen family'] } },
];

export const EASTER: ThemedSpec[] = [
  { id: 'he-is-risen-sunrise-service', name: 'He Is Risen Sunrise Service', format: 'poster', use: 'poster', layout: 'poster', style: 'Traditional', colors: ['peach', 'gold', 'green'], occasion: 'service',
    tags: ['he is risen', 'easter sunday', 'sunrise service', 'church', 'worship', 'empty tomb', 'lilies'],
    look: { scene: 'cr-bg-sunrise', pal: SUNRISE, title: ['Playfair Display', 800], body: ['Montserrat', 600], hero: 'cr-tomb', corner: 'cr-lilies' },
    words: { eyebrow: 'Easter Sunday', title: 'He Is Risen', sub: 'Celebrate the joy of the resurrection with us', details: ['Sunday, April 5', 'Sunrise service 7 AM · Worship 10 AM', 'Grace Community Church · 210 Hill Street'], cta: 'All are welcome' } },
];

export const DIWALI: ThemedSpec[] = [
  { id: 'diwali-night-invitation', name: 'Diwali Night Invitation', format: 'card', use: 'invitation', layout: 'arch', style: 'Traditional', colors: ['maroon', 'gold', 'cream'], occasion: 'party',
    tags: ['diwali party', 'deepavali', 'invitation', 'hindi', 'diyas', 'marigold', 'rangoli', 'rsvp'],
    look: { scene: 'in-bg-maroon', pal: MAROON_GOLD, title: ['Cinzel', 700], body: ['Montserrat', 600], top: 'in-toran', hero: 'in-diyas', corner: 'in-rangoli' },
    words: { eyebrow: 'You’re invited to', native: { text: 'शुभ दीपावली', font: ['Yatra One', 400], script: 'hi', color: '#c4622d' }, title: 'Diwali Night', sub: 'An evening of lights, music, rangoli and sweets', details: ['Saturday, November 7 · 6:30 PM', 'The Sharma Home · 42 Lotus Ave'], cta: 'RSVP to Priya by Nov 1' } },
];

export const BABY_SHOWER: ThemedSpec[] = [
  { id: 'oh-baby-teddy-shower', name: 'Oh Baby Teddy Shower', format: 'card', use: 'invitation', layout: 'framed', style: 'Playful', colors: ['cream', 'blush', 'beige'], occasion: 'party',
    tags: ['oh baby', 'baby shower invitation', 'teddy bear', 'neutral', 'watercolour', 'rsvp'],
    look: { scene: 'bb-bg-watercolor', pal: BLUSH_SAND, title: ['Parisienne', 400], body: ['Quicksand', 600], hero: 'bb-teddy', heroColors: ['#c99a6e', '#f2dcc2', '#f4b6c2'], corner: 'bb-flowers' },
    words: { eyebrow: 'Oh baby!', title: 'Baby Shower', sub: 'Please join us for a baby shower honouring Emma Johnson', details: ['Sunday, May 17 · 2 PM', '14 Willow Lane, Portland'], cta: 'RSVP to Lily · 555-0142' } },
];

const ALL = [...RAMADAN, ...ROSH_HASHANAH, ...EASTER, ...DIWALI, ...BABY_SHOWER];
export const FAITHS_FONTS = fontsOf(ALL);
export const FAITH_SETS = [
  { sub: 'ramadan', label: 'Ramadan', cover: RAMADAN[0].id, list: RAMADAN.map(themed) },
  { sub: 'rosh-hashanah', label: 'Rosh Hashanah', cover: ROSH_HASHANAH[0].id, list: ROSH_HASHANAH.map(themed) },
  { sub: 'easter', label: 'Easter', cover: EASTER[0].id, list: EASTER.map(themed) },
  { sub: 'diwali', label: 'Diwali', cover: DIWALI[0].id, list: DIWALI.map(themed) },
  { sub: 'baby-shower', label: 'Baby', cover: BABY_SHOWER[0].id, list: BABY_SHOWER.map(themed) },
];
