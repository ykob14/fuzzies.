/**
 * Christian celebrations (beyond the Christmas collection) — themed templates (see ./themed): Easter, Good Friday, Palm
 * Sunday, Advent, Epiphany, Pentecost, baptisms and christenings, First Communion and Confirmation. Symbols follow the
 * liturgical year (three purple and one rose Advent candle, the empty tomb at Easter, the dove for Pentecost and
 * Confirmation, the shell for Baptism, chalice and host for First Communion). Spanish lines: ¡Felices Pascuas! (Happy
 * Easter), Día de Reyes (Epiphany), Mi Primera Comunión (my First Communion), Mi Bautizo (my baptism).
 */
import { spec, type Look, type ThemedSet } from './themed';

const SUNRISE = { title: '#5a3218', ink: '#4a3020', muted: '#7a5a40', accent: '#c76b2c', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.88)' };
const MEADOW = { title: '#3a5a8a', ink: '#3a4050', muted: '#6a7080', accent: '#e58fb4', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.92)' };
const IVORY = { title: '#5a4520', ink: '#3a3328', muted: '#7a6c58', accent: '#b8862b', onAccent: '#ffffff', panel: '#fffdf6' };
const SKY = { title: '#2a4a7a', ink: '#33405a', muted: '#5a6a82', accent: '#5a8fc9', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.92)' };
const ADVENT = { title: '#ffffff', ink: '#ece4f7', muted: '#d2c6ea', accent: '#e8c46a', onAccent: '#2a1a4a', glow: '#ffd27a', panel: '#fbf7ef' };

const L = (o: Partial<Look> & Pick<Look, 'scene' | 'pal' | 'hero'>): Look => ({ title: ['Playfair Display', 800], body: ['Montserrat', 600], ...o });

export const CHRISTIAN: ThemedSet[] = [
  { sub: 'easter', label: 'Easter', specs: [
    spec('he-is-risen-sunrise-service', 'He Is Risen Sunrise Service', 'poster', 'poster', 'poster', 'Traditional', ['peach', 'gold', 'green'], 'service', ['he is risen', 'easter sunday', 'sunrise service', 'church', 'worship', 'empty tomb', 'lilies'],
      L({ scene: 'cr-bg-sunrise', pal: SUNRISE, hero: 'cr-tomb', corner: 'cr-lilies' }),
      { eyebrow: 'Easter Sunday', title: 'He Is Risen', sub: 'Celebrate the joy of the resurrection with us', details: ['Sunday, March 28', 'Sunrise service 7 AM · Worship 10 AM', 'Grace Community Church · 210 Hill Street'], cta: 'All are welcome' }),
    spec('happy-easter-cross-post', 'Happy Easter Cross', 'post', 'greeting', 'hero', 'Elegant', ['peach', 'gold'], 'greeting', ['happy easter', 'cross', 'sunrise', 'resurrection', 'greeting'],
      L({ scene: 'cr-bg-lily', pal: IVORY, hero: 'cr-cross-sunrise', title: ['Cormorant Garamond', 700] }),
      { title: 'Happy Easter', sub: 'Christ is risen — wishing you hope, joy and new life' }),
    spec('easter-egg-hunt-flyer', 'Easter Egg Hunt', 'flyer', 'party', 'poster', 'Playful', ['pastel', 'pink', 'blue'], 'kids-event', ['egg hunt', 'easter egg hunt', 'kids', 'bunny', 'spring', 'family', 'community'],
      L({ scene: 'cr-bg-meadow', pal: MEADOW, hero: 'cr-basket', corner: 'cr-bunny', title: ['Fredoka', 700], body: ['Quicksand', 700] }),
      { eyebrow: 'Hop on over!', title: 'Easter Egg Hunt', details: ['Saturday, March 27 · 10 AM', 'Ages 2–10 · Bring a basket', 'Maple Street Park'], cta: 'Free · rain or shine' }),
    spec('felices-pascuas-story', 'Felices Pascuas Story', 'story', 'greeting', 'medallion', 'Playful', ['pastel', 'pink'], 'greeting', ['felices pascuas', 'feliz pascua', 'spanish', 'easter eggs', 'chicks', 'story'],
      L({ scene: 'cr-bg-meadow', pal: { ...MEADOW, title: '#c2457a' }, hero: 'cr-eggs', corner: 'cr-chicks', title: ['Fredoka', 700], body: ['Quicksand', 700] }),
      { native: { text: '¡Felices Pascuas!', font: ['Pacifico', 400], script: 'latin', color: '#3a5a8a' }, title: 'Happy Easter', sub: 'Eggs, chicks and spring sunshine for you', cta: 'Happy Easter!' }),
  ] },
  { sub: 'good-friday', label: 'Good Friday', specs: [
    spec('good-friday-service', 'Good Friday Service', 'poster', 'poster', 'minimal', 'Minimalist', ['ivory', 'brown'], 'service', ['good friday', 'holy week', 'service', 'cross', 'stations of the cross', 'reflection'],
      L({ scene: 'cr-bg-lily', pal: IVORY, hero: 'cr-cross', heroColors: ['#6b5038'], title: ['Cormorant Garamond', 700] }),
      { eyebrow: 'Holy Week', title: 'Good Friday Service', sub: 'A quiet service of readings, prayer and music', details: ['Friday, March 26 · 12 PM & 7 PM', 'St. Andrew’s Church'], cta: 'All are welcome' }),
    spec('good-friday-reflection', 'Good Friday Reflection', 'post', 'social', 'medallion', 'Traditional', ['ivory', 'brown'], 'greeting', ['good friday', 'crown of thorns', 'lent', 'reflection', 'prayer'],
      L({ scene: 'cr-bg-sky', pal: { ...SKY, title: '#4a3828', accent: '#6b5038', panel: '#fffdf6' }, hero: 'cr-thorns', title: ['Cormorant Garamond', 700] }),
      { title: 'Good Friday', sub: '“Greater love has no one than this” — John 15:13', cta: 'Holy Week' }),
  ] },
  { sub: 'palm-sunday', label: 'Palm Sunday', specs: [
    spec('palm-sunday-hosanna', 'Hosanna Palm Sunday', 'post', 'greeting', 'hero', 'Traditional', ['green', 'gold'], 'greeting', ['palm sunday', 'hosanna', 'palms', 'holy week', 'domingo de ramos'],
      L({ scene: 'cr-bg-lily', pal: { ...IVORY, title: '#2f5a2a' }, hero: 'cr-palms', title: ['Cinzel', 700] }),
      { title: 'Hosanna!', sub: 'Palm Sunday · the beginning of Holy Week' }),
    spec('palm-sunday-procession', 'Palm Sunday Procession', 'flyer', 'flyer', 'framed', 'Elegant', ['ivory', 'green'], 'service', ['palm sunday', 'procession', 'church', 'holy week', 'service'],
      L({ scene: 'cr-bg-lily', pal: { ...IVORY, accent: '#5e8f3a' }, hero: 'cr-palms', corner: 'cr-spring-flowers', title: ['Cormorant Garamond', 700] }),
      { eyebrow: 'Holy Week begins', title: 'Palm Sunday Procession', details: ['Sunday, March 21 · 9:30 AM', 'Gather in the courtyard · Palms provided'], cta: 'Children welcome' }),
  ] },
  { sub: 'advent', label: 'Advent', specs: [
    spec('advent-wreath-post', 'Advent Wreath', 'post', 'greeting', 'hero', 'Traditional', ['purple', 'gold', 'green'], 'greeting', ['advent', 'advent wreath', 'hope peace joy love', 'candles', 'church'],
      L({ scene: 'cr-bg-advent', pal: ADVENT, hero: 'cr-advent-wreath', title: ['Cinzel', 700] }),
      { title: 'A Blessed Advent', sub: 'Hope · Peace · Joy · Love' }),
    spec('advent-calendar-flyer', 'Advent Services Flyer', 'flyer', 'flyer', 'arch', 'Elegant', ['purple', 'gold'], 'service', ['advent services', 'lessons and carols', 'church', 'candle lighting', 'schedule'],
      L({ scene: 'cr-bg-advent', pal: { ...IVORY, title: '#4a2f7a', accent: '#6b3fa0' }, hero: 'cr-advent-wreath', corner: 'cr-sparkles', cornerColors: ['#b8862b', '#ffffff'], title: ['Cinzel', 700] }),
      { eyebrow: 'Prepare the way', title: 'Advent at St. Mary’s', details: ['Sundays from November 29 · 10 AM', 'Lessons & Carols · December 20 · 6 PM'], cta: 'Everyone is welcome' }),
  ] },
  { sub: 'epiphany', label: 'Epiphany', specs: [
    spec('epiphany-three-kings', 'Epiphany Three Kings', 'post', 'greeting', 'medallion', 'Traditional', ['navy', 'gold'], 'greeting', ['epiphany', 'three kings', 'magi', 'wise men', 'star', 'twelfth night'],
      L({ scene: 'cr-bg-advent', pal: { ...ADVENT, panelTitle: '#2a1a4a', panelInk: '#3a3050', panelMuted: '#6a6080', panel: '#fbf7ef' }, hero: 'cr-epiphany', title: ['Cinzel', 700] }),
      { title: 'Happy Epiphany', sub: 'Follow the star — January 6', cta: 'Feast of the Epiphany' }),
    spec('dia-de-reyes-party', 'Día de Reyes Party', 'card', 'party', 'framed', 'Playful', ['cream', 'gold', 'red'], 'party', ['dia de reyes', 'three kings day', 'rosca de reyes', 'spanish', 'party', 'kids'],
      L({ scene: 'cr-bg-lily', pal: { ...IVORY, accent: '#c8263a' }, hero: 'cr-epiphany', corner: 'cr-sparkles', cornerColors: ['#b8862b', '#c8263a'], title: ['Playfair Display', 800] }),
      { native: { text: 'Día de Reyes', font: ['Pacifico', 400], script: 'latin', color: '#c8263a' }, title: 'Three Kings Party', sub: 'Rosca de Reyes, hot chocolate and gifts for the kids', details: ['Wednesday, January 6 · 5 PM', 'Casa Hernández'], cta: 'Who will find the baby?' }),
  ] },
  { sub: 'pentecost', label: 'Pentecost', specs: [
    spec('pentecost-sunday', 'Pentecost Sunday', 'post', 'greeting', 'hero', 'Modern', ['red', 'gold'], 'greeting', ['pentecost', 'whitsunday', 'holy spirit', 'dove', 'flame', 'church'],
      L({ scene: 'cr-bg-sky', pal: { ...SKY, title: '#a8321e', accent: '#d9682b' }, hero: 'cr-dove-flame', title: ['Playfair Display', 800] }),
      { title: 'Happy Pentecost', sub: 'Come, Holy Spirit — renew the face of the earth' }),
    spec('pentecost-worship-flyer', 'Pentecost Worship Flyer', 'flyer', 'flyer', 'poster', 'Modern', ['red', 'white'], 'service', ['pentecost', 'worship', 'service', 'church', 'wear red'],
      L({ scene: 'cr-bg-sky', pal: { ...SKY, title: '#a8321e', accent: '#c8402a' }, hero: 'cr-dove-flame', title: ['Montserrat', 900] }),
      { eyebrow: 'Pentecost Sunday', title: 'Wear Red & Worship', details: ['Sunday, May 16 · 10 AM', 'Fellowship lunch to follow', 'Hope Chapel'], cta: 'Bring the whole family' }),
  ] },
  { sub: 'baptism', label: 'Baptism & Christening', specs: [
    spec('baptism-invitation-blue', 'Baptism Invitation', 'card', 'invitation', 'arch', 'Elegant', ['blue', 'white', 'gold'], 'ceremony', ['baptism', 'christening', 'invitation', 'baby boy', 'dove', 'church', 'rsvp'],
      L({ scene: 'cr-bg-sky', pal: { ...SKY, panel: '#ffffff' }, hero: 'cr-dove', corner: 'cr-cross', cornerColors: ['#b8862b'], title: ['Cormorant Garamond', 700] }),
      { eyebrow: 'Please join us for the baptism of', title: 'Noah James', sub: 'Surrounded by family, friends and God’s love', details: ['Sunday, June 6 · 11 AM', 'St. Peter’s Church · Lunch to follow'], cta: 'RSVP to Emily' }),
    spec('christening-photo-card', 'Christening Photo Card', 'card', 'greeting', 'photo', 'Elegant', ['ivory', 'gold'], 'ceremony', ['christening', 'baptism', 'photo', 'baby', 'keepsake', 'thank you'],
      L({ scene: 'cr-bg-lily', pal: IVORY, hero: 'cr-shell', photo: { mask: 'arch', tint: ['#d9c8a8', '#fff8ea', '#b8862b'] }, title: ['Parisienne', 400] }),
      { title: 'Sophia’s Christening', sub: 'Thank you for celebrating with us', details: ['May 9 · St. Anne’s Church'] }),
    spec('mi-bautizo-post', 'Mi Bautizo', 'post', 'invitation', 'medallion', 'Playful', ['blue', 'white'], 'ceremony', ['bautizo', 'mi bautizo', 'spanish', 'baptism', 'shell', 'invitation'],
      L({ scene: 'cr-bg-sky', pal: { ...SKY, panel: '#ffffff' }, hero: 'cr-shell', title: ['Playfair Display', 800] }),
      { native: { text: 'Mi Bautizo', font: ['Great Vibes', 400], script: 'latin', color: '#2a4a7a' }, title: 'Mateo', sub: 'Domingo 13 de junio · 12 PM', cta: 'Parroquia San José' }),
  ] },
  { sub: 'first-communion', label: 'First Communion', specs: [
    spec('first-communion-invitation', 'First Communion Invitation', 'card', 'invitation', 'framed', 'Elegant', ['ivory', 'gold'], 'ceremony', ['first communion', 'first holy communion', 'chalice', 'invitation', 'church', 'rsvp'],
      L({ scene: 'cr-bg-lily', pal: IVORY, frame: 'cr-frame', frameColors: ['#b8862b'], hero: 'cr-chalice', title: ['Parisienne', 400] }),
      { eyebrow: 'Please join us to celebrate', title: 'Olivia’s First Holy Communion', details: ['Saturday, May 8 · 10 AM', 'St. Anne’s Church · Reception at home'], cta: 'RSVP by May 1' }),
    spec('mi-primera-comunion', 'Mi Primera Comunión', 'post', 'greeting', 'medallion', 'Traditional', ['ivory', 'gold'], 'ceremony', ['primera comunion', 'mi primera comunión', 'spanish', 'chalice', 'communion'],
      L({ scene: 'cr-bg-lily', pal: { ...IVORY, panel: '#ffffff' }, hero: 'cr-chalice', title: ['Cormorant Garamond', 700] }),
      { native: { text: 'Mi Primera Comunión', font: ['Great Vibes', 400], script: 'latin', color: '#b8862b' }, title: 'Lucía', sub: 'Sábado 8 de mayo', cta: 'Parroquia Santa María' }),
  ] },
  { sub: 'confirmation', label: 'Confirmation', specs: [
    spec('confirmation-celebration', 'Confirmation Celebration', 'card', 'invitation', 'arch', 'Modern', ['white', 'red', 'gold'], 'ceremony', ['confirmation', 'holy spirit', 'dove', 'invitation', 'church', 'party'],
      L({ scene: 'cr-bg-sky', pal: { ...SKY, title: '#a8321e', accent: '#c8402a', panel: '#ffffff' }, hero: 'cr-dove-flame', title: ['Cormorant Garamond', 700] }),
      { eyebrow: 'Celebrating the confirmation of', title: 'Daniel Ruiz', sub: 'Confirmed in faith, sealed with the Spirit', details: ['Sunday, May 23 · 2 PM', 'Holy Family Parish Hall'], cta: 'Lunch & cake to follow' }),
    spec('confirmation-blessings-post', 'Confirmation Blessings', 'post', 'greeting', 'minimal', 'Minimalist', ['white', 'red'], 'greeting', ['confirmation', 'congratulations', 'blessings', 'dove', 'minimal'],
      L({ scene: 'cr-bg-lily', pal: { ...IVORY, accent: '#c8402a' }, hero: 'cr-dove', title: ['Cormorant Garamond', 700] }),
      { eyebrow: 'Congratulations', title: 'Blessings on Your Confirmation', cta: 'With love and prayers' }),
  ] },
];
