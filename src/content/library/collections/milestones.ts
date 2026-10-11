/**
 * Life milestones — themed templates (see ./themed): Mother's and Father's Day, Valentine's Day, anniversaries,
 * engagements, weddings, graduations, retirements, housewarmings, quinceañeras, sweet 16s, bar and bat mitzvahs, and
 * memorials / celebrations of life (calm, respectful palettes, no party colours).
 * Hebrew: מזל טוב (mazel tov), בר מצווה (bar mitzvah), בת מצווה (bat mitzvah). Spanish: Mis XV Años (my fifteenth).
 */
import { spec, type Look, type Native, type ThemedSet } from './themed';

const BLUSH = { title: '#8a4a5a', ink: '#4a3a40', muted: '#7a6a70', accent: '#c98a6b', onAccent: '#ffffff', panel: '#fffaf8' };
const ROSE = { title: '#b2355a', ink: '#4a2a34', muted: '#7a5a64', accent: '#d9506e', onAccent: '#ffffff', panel: '#ffffff' };
const GREEN = { title: '#3f5f45', ink: '#3a4038', muted: '#6a7066', accent: '#a8834a', onAccent: '#ffffff', panel: '#ffffff' };
const NAVY = { title: '#ffffff', ink: '#e6ebf7', muted: '#c6d0ea', accent: '#e8c46a', onAccent: '#14203a', glow: '#ffd27a', panel: '#fbf8f0' };
const PARTY = { title: '#7a3a8a', ink: '#3a2a40', muted: '#6a5a70', accent: '#e8607e', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.94)' };
const CALM = { title: '#3a4a5e', ink: '#3a4250', muted: '#6a7282', accent: '#8a9ab0', onAccent: '#ffffff', panel: '#ffffff' };
const DAD = { title: '#1f3a6a', ink: '#2a3550', muted: '#5a6680', accent: '#2f5fa8', onAccent: '#ffffff', panel: '#ffffff' };

const L = (o: Partial<Look> & Pick<Look, 'scene' | 'pal' | 'hero'>): Look => ({ title: ['Cormorant Garamond', 700], body: ['Montserrat', 600], ...o });
const he = (text: string, color: string): Native => ({ text, script: 'he', font: ['Frank Ruhl Libre', 700], color });

export const MILESTONES: ThemedSet[] = [
  { sub: 'mothers-day', label: 'Mother’s Day', specs: [
    spec('mothers-day-bouquet', 'Mother’s Day Bouquet', 'card', 'greeting', 'framed', 'Elegant', ['blush', 'pink'], 'greeting', ['mothers day', "mother's day", 'mom', 'mum', 'bouquet', 'card'],
      L({ scene: 'ms-bg-blush', pal: ROSE, hero: 'ms-bouquet', title: ['Parisienne', 400] }),
      { title: 'Happy Mother’s Day', sub: 'To the woman who made our house a home', details: ['With all our love'] }),
    spec('mothers-day-brunch', 'Mother’s Day Brunch', 'post', 'flyer', 'poster', 'Modern', ['cream', 'pink'], 'event', ['mothers day brunch', 'restaurant', 'special', 'flowers', 'cafe'],
      L({ scene: 'ms-bg-eucalyptus', pal: { ...ROSE, panel: 'rgba(255,255,255,0.94)' }, hero: 'ms-mug', heroColors: ['#e8a0b0', '#c8b8b0'], title: ['Playfair Display', 800] }),
      { eyebrow: 'Sunday, May 9', title: 'Mother’s Day Brunch', details: ['Free mimosa for every mum', 'Bloom Café · 10 AM – 2 PM'], cta: 'Book a table' }),
  ] },
  { sub: 'fathers-day', label: 'Father’s Day', specs: [
    spec('fathers-day-tie', 'Father’s Day Tie', 'post', 'greeting', 'hero', 'Playful', ['blue', 'gold'], 'greeting', ['fathers day', "father's day", 'dad', 'tie', 'best dad'],
      L({ scene: 'bb-bg-sky', pal: DAD, hero: 'ms-tie', title: ['Montserrat', 900] }),
      { eyebrow: 'Happy Father’s Day', title: 'World’s Best Dad', sub: 'Thanks for everything, today and every day' }),
    spec('fathers-day-card', 'Father’s Day Card', 'card', 'greeting', 'minimal', 'Minimalist', ['navy', 'cream'], 'greeting', ['fathers day', 'dad', 'coffee', 'card', 'minimal'],
      L({ scene: 'jh-bg-parchment', pal: DAD, hero: 'ms-mug', heroColors: ['#2f5fa8', '#b8a898'], title: ['Playfair Display', 800] }),
      { eyebrow: 'For Dad', title: 'You’re Our Hero', sub: 'Coffee’s on us this morning', cta: 'Love, your kids' }),
  ] },
  { sub: 'valentines', label: 'Valentine’s Day', specs: [
    spec('valentines-two-hearts', 'Two Hearts Valentine', 'post', 'greeting', 'hero', 'Playful', ['pink', 'red'], 'greeting', ['valentines day', "valentine's", 'hearts', 'love', 'romance', 'galentines'],
      L({ scene: 'ms-bg-blush', pal: ROSE, hero: 'ms-hearts', title: ['Pacifico', 400] }),
      { title: 'Be My Valentine', sub: 'You make every day feel like February 14' }),
    spec('valentines-dinner-flyer', 'Valentine’s Dinner', 'flyer', 'flyer', 'poster', 'Luxury', ['red', 'gold'], 'dinner', ['valentines dinner', 'date night', 'restaurant', 'romantic', 'menu', 'champagne'],
      L({ scene: 'ms-bg-blush', pal: { ...ROSE, panel: 'rgba(255,255,255,0.94)' }, hero: 'ms-champagne', corner: 'ms-hearts', title: ['Playfair Display', 800] }),
      { eyebrow: 'February 14', title: 'Valentine’s Dinner for Two', details: ['Five-course tasting menu', 'Live piano · Glass of bubbly', 'La Rosa Bistro'], cta: 'Reserve now' }),
  ] },
  { sub: 'anniversary', label: 'Anniversaries', specs: [
    spec('anniversary-rings', 'Happy Anniversary Rings', 'post', 'greeting', 'medallion', 'Elegant', ['blush', 'gold'], 'greeting', ['anniversary', 'happy anniversary', 'rings', 'marriage', 'love'],
      L({ scene: 'ms-bg-blush', pal: BLUSH, hero: 'ms-rings' }),
      { title: 'Happy Anniversary', sub: 'Here’s to many more years of love and laughter', cta: '10 years together' }),
    spec('golden-anniversary-party', 'Golden Anniversary Party', 'card', 'invitation', 'arch', 'Luxury', ['navy', 'gold'], 'party', ['50th anniversary', 'golden anniversary', 'anniversary party', 'invitation', 'champagne', 'rsvp'],
      L({ scene: 'ms-bg-navy-gold', pal: { ...BLUSH, title: '#14203a', accent: '#b8862b', panel: '#fbf8f0' }, hero: 'ms-champagne', corner: 'ms-confetti', title: ['Cinzel', 700] }),
      { eyebrow: 'Celebrating 50 golden years', title: 'Margaret & Robert', details: ['Saturday, June 19 · 6 PM', 'The Grand Ballroom'], cta: 'RSVP by June 1' }),
  ] },
  { sub: 'engagement', label: 'Engagements', specs: [
    spec('she-said-yes', 'She Said Yes', 'post', 'social', 'hero', 'Elegant', ['blush', 'gold'], 'announcement', ['engagement', 'she said yes', 'engaged', 'proposal', 'ring', 'announcement'],
      L({ scene: 'ms-bg-blush', pal: BLUSH, hero: 'ms-diamond-ring', top: 'ms-confetti', title: ['Parisienne', 400] }),
      { title: 'She Said Yes!', sub: 'Engaged · Sophie & Daniel' }),
    spec('engagement-party-invite', 'Engagement Party Invitation', 'card', 'invitation', 'framed', 'Elegant', ['green', 'cream'], 'party', ['engagement party', 'invitation', 'eucalyptus', 'greenery', 'rsvp'],
      L({ scene: 'ms-bg-eucalyptus', pal: GREEN, hero: 'ms-diamond-ring', title: ['Parisienne', 400] }),
      { eyebrow: 'Please join us to celebrate the engagement of', title: 'Hannah & Omar', details: ['Saturday, April 17 · 7 PM', 'The Glasshouse'], cta: 'Cocktails & dancing' }),
  ] },
  { sub: 'wedding', label: 'Weddings', specs: [
    spec('floral-arch-wedding', 'Floral Arch Wedding Invitation', 'card', 'invitation', 'framed', 'Elegant', ['blush', 'green', 'gold'], 'ceremony', ['wedding invitation', 'floral', 'arch', 'romantic', 'ceremony', 'reception', 'rsvp'],
      L({ scene: 'ms-bg-blush', pal: BLUSH, hero: 'ms-floral-arch', title: ['Parisienne', 400] }),
      { eyebrow: 'Together with their families', title: 'Isabella & Lucas', sub: 'request the pleasure of your company at their wedding', details: ['Saturday, September 18 · 4 PM', 'Rosewood Gardens'], cta: 'RSVP by August 1' }),
    spec('save-the-date-eucalyptus', 'Save the Date Eucalyptus', 'post', 'invitation', 'minimal', 'Minimalist', ['sage', 'white'], 'announcement', ['save the date', 'wedding', 'eucalyptus', 'greenery', 'minimal'],
      L({ scene: 'ms-bg-eucalyptus', pal: GREEN, hero: 'ms-rings', heroColors: ['#c9a86a', '#d9dfe8', '#e6f2ff'], title: ['Cormorant Garamond', 700] }),
      { eyebrow: 'Save the date', title: 'Ava & Noah', details: ['09 · 18 · 2027', 'Napa Valley, California'], cta: 'Invitation to follow' }),
    spec('wedding-reception-poster', 'Wedding Welcome Sign', 'poster', 'poster', 'arch', 'Luxury', ['blush', 'gold'], 'ceremony', ['wedding welcome sign', 'reception', 'sign', 'cake', 'ceremony'],
      L({ scene: 'ms-bg-blush', pal: BLUSH, hero: 'ms-cake', title: ['Parisienne', 400] }),
      { eyebrow: 'Welcome to the wedding of', title: 'Isabella & Lucas', details: ['September 18, 2027'], cta: 'Let the celebration begin' }),
  ] },
  { sub: 'graduation', label: 'Graduations', specs: [
    spec('class-of-graduation', 'Class of Graduation Party', 'card', 'party', 'poster', 'Modern', ['navy', 'gold'], 'party', ['graduation party', 'class of 2027', 'grad party', 'congrats grad', 'cap'],
      L({ scene: 'ms-bg-navy-gold', pal: { ...NAVY, panelInk: '#14203a', panelMuted: '#4a5a7a', panel: 'rgba(251,248,240,0.95)' }, hero: 'ms-grad-cap', corner: 'ms-diploma', title: ['Montserrat', 900] }),
      { eyebrow: 'Class of 2027', title: 'Graduation Party', sub: 'Help us celebrate Maya’s big day', details: ['Saturday, June 5 · 4 PM', '27 Oak Drive · Backyard BBQ'], cta: 'Bring your best advice' }),
    spec('congrats-grad-post', 'Congrats Grad', 'post', 'greeting', 'hero', 'Playful', ['navy', 'gold'], 'greeting', ['congrats grad', 'congratulations', 'graduate', 'graduation', 'social'],
      L({ scene: 'ms-bg-navy-gold', pal: NAVY, hero: 'ms-grad-cap', top: 'ms-confetti', title: ['Montserrat', 900] }),
      { title: 'Congrats, Grad!', sub: 'The tassel was worth the hassle' }),
    spec('graduation-photo-announcement', 'Graduation Photo Announcement', 'card', 'social', 'photo', 'Elegant', ['navy', 'gold'], 'announcement', ['graduation announcement', 'senior photo', 'photo', 'class of', 'degree'],
      L({ scene: 'ms-bg-navy-gold', pal: NAVY, hero: 'ms-grad-cap', photo: { mask: 'rounded', tint: ['#2a3a5e', '#fbf8f0', '#e8c46a'] }, title: ['Cinzel', 700] }),
      { eyebrow: 'Proudly announcing', title: 'Jordan Lee', sub: 'Bachelor of Science · Class of 2027' }),
  ] },
  { sub: 'retirement', label: 'Retirements', specs: [
    spec('happy-retirement-beach', 'Happy Retirement Beach', 'post', 'greeting', 'hero', 'Playful', ['blue', 'orange'], 'greeting', ['retirement', 'happy retirement', 'retired', 'beach', 'vacation'],
      L({ scene: 'as-bg-river', pal: { ...DAD, accent: '#e8913a' }, hero: 'ms-beach-chair', title: ['Montserrat', 900] }),
      { title: 'Happy Retirement!', sub: 'Your next adventure starts now' }),
    spec('retirement-party-invite', 'Retirement Party Invitation', 'card', 'invitation', 'arch', 'Elegant', ['navy', 'gold'], 'party', ['retirement party', 'farewell', 'invitation', 'office', 'champagne', 'rsvp'],
      L({ scene: 'ms-bg-navy-gold', pal: { ...BLUSH, title: '#14203a', accent: '#b8862b', panel: '#fbf8f0' }, hero: 'ms-champagne', title: ['Cinzel', 700] }),
      { eyebrow: 'After 32 wonderful years', title: 'Linda Is Retiring!', details: ['Friday, June 25 · 5 PM', 'Riverside Hotel Lounge'], cta: 'Come raise a glass' }),
  ] },
  { sub: 'housewarming', label: 'Housewarmings', specs: [
    spec('housewarming-party', 'Housewarming Party', 'card', 'invitation', 'framed', 'Playful', ['cream', 'terracotta', 'green'], 'party', ['housewarming', 'new home', 'party', 'moving', 'invitation', 'rsvp'],
      L({ scene: 'bb-bg-sage', pal: { ...GREEN, accent: '#c4573a' }, hero: 'ms-house', corner: 'ms-plant', title: ['Playfair Display', 800] }),
      { eyebrow: 'We’ve moved!', title: 'Housewarming Party', details: ['Saturday, May 22 · 6 PM', '48 Maple Avenue'], cta: 'Bring a plant · or yourself!' }),
    spec('new-home-announcement', 'New Home Announcement', 'post', 'social', 'medallion', 'Minimalist', ['cream', 'terracotta'], 'announcement', ['new home', 'we moved', 'moving announcement', 'new address', 'keys'],
      L({ scene: 'jh-bg-parchment', pal: { ...GREEN, accent: '#c4573a', panel: '#ffffff' }, hero: 'ms-house', title: ['Playfair Display', 800] }),
      { title: 'We’ve Moved!', sub: 'Our new address: 48 Maple Avenue, Springfield', cta: 'Come visit soon' }),
  ] },
  { sub: 'quinceanera', label: 'Quinceañeras', specs: [
    spec('mis-xv-anos', 'Mis XV Años', 'card', 'invitation', 'arch', 'Luxury', ['blush', 'gold'], 'party', ['quinceanera', 'quinceañera', 'mis xv años', 'xv', 'fifteen', 'tiara', 'spanish', 'rsvp'],
      L({ scene: 'ms-bg-blush', pal: { ...ROSE, panel: '#ffffff' }, hero: 'ms-tiara', corner: 'ms-bouquet', title: ['Parisienne', 400] }),
      { eyebrow: 'Te invito a celebrar', native: { text: 'Mis XV Años', script: 'latin', font: ['Great Vibes', 400], color: '#b8862b' }, title: 'Valentina', details: ['Sábado 10 de julio · 7 PM', 'Salón Las Rosas'], cta: 'Confirmar asistencia' }),
    spec('quinceanera-celebration-post', 'Quinceañera Celebration', 'post', 'party', 'hero', 'Elegant', ['navy', 'gold'], 'party', ['quinceanera', 'xv', 'celebration', 'tiara', 'party'],
      L({ scene: 'ms-bg-navy-gold', pal: NAVY, hero: 'ms-tiara', top: 'ms-confetti', title: ['Parisienne', 400] }),
      { eyebrow: 'Quinceañera', title: 'Sofia’s XV', sub: 'A night to remember · July 10' }),
  ] },
  { sub: 'sweet-16', label: 'Sweet 16', specs: [
    spec('sweet-sixteen-party', 'Sweet Sixteen Party', 'card', 'party', 'poster', 'Playful', ['pink', 'gold'], 'party', ['sweet 16', 'sweet sixteen', '16th birthday', 'party', 'balloons', 'rsvp'],
      L({ scene: 'ms-bg-confetti', pal: PARTY, hero: 'ms-number-balloons', corner: 'ms-tiara', title: ['Pacifico', 400] }),
      { eyebrow: 'You’re invited', title: 'Sweet Sixteen', sub: 'Chloe’s birthday bash', details: ['Saturday, August 14 · 8 PM', 'Skyline Rooftop'], cta: 'Dress to impress' }),
    spec('sweet-16-story', 'Sweet 16 Story', 'story', 'social', 'medallion', 'Playful', ['pink', 'white'], 'party', ['sweet 16', 'birthday', 'story', 'tiara', 'party'],
      L({ scene: 'ms-bg-blush', pal: { ...ROSE, panel: '#ffffff' }, hero: 'ms-tiara', title: ['Pacifico', 400] }),
      { title: 'Sweet 16', sub: 'Celebrating Ava · this Saturday!', cta: 'Party at 8' }),
  ] },
  { sub: 'bar-bat-mitzvah', label: 'Bar & Bat Mitzvahs', specs: [
    spec('bar-mitzvah-invitation', 'Bar Mitzvah Invitation', 'card', 'invitation', 'arch', 'Traditional', ['navy', 'gold', 'white'], 'ceremony', ['bar mitzvah', 'invitation', 'torah', 'hebrew', 'mazel tov', 'rsvp'],
      L({ scene: 'jh-bg-twilight', pal: { ...DAD, panel: '#fbf8f0' }, hero: 'jh-torah', corner: 'jh-star', cornerColors: ['#2f5fa8', '#e8c46a'], title: ['Cinzel', 700] }),
      { eyebrow: 'Please join us as our son is called to the Torah', native: he('בר מצווה', '#2f5fa8'), title: 'Ethan Goldberg', details: ['Saturday, May 1 · 10 AM', 'Temple Beth Shalom · Kiddush to follow'], cta: 'Mazel tov!' }),
    spec('bat-mitzvah-invitation', 'Bat Mitzvah Invitation', 'card', 'invitation', 'framed', 'Elegant', ['blush', 'gold'], 'ceremony', ['bat mitzvah', 'invitation', 'hebrew', 'mazel tov', 'party', 'rsvp'],
      L({ scene: 'ms-bg-blush', pal: { ...ROSE, title: '#8a3a5a' }, hero: 'jh-star', heroColors: ['#c98a6b', '#e8c46a'], corner: 'ms-bouquet', title: ['Parisienne', 400] }),
      { eyebrow: 'Please celebrate with us as our daughter becomes', native: he('בת מצווה', '#b2355a'), title: 'Leah Cohen', details: ['Saturday, March 6 · 10:30 AM', 'Congregation Beth Israel'], cta: 'Party to follow at 7 PM' }),
    spec('mazel-tov-mitzvah-post', 'Mazel Tov Mitzvah', 'post', 'greeting', 'medallion', 'Modern', ['blue', 'white'], 'greeting', ['mazel tov', 'bar mitzvah', 'bat mitzvah', 'bnei mitzvah', 'hebrew', 'tallit'],
      L({ scene: 'bb-bg-sky', pal: { ...DAD, panel: '#ffffff' }, hero: 'jh-torah' }),
      { native: he('מזל טוב', '#2f5fa8'), title: 'Mazel Tov!', sub: 'So proud of you on your special day', cta: 'With love' }),
  ] },
  { sub: 'memorial', label: 'Memorials & celebrations of life', specs: [
    spec('in-loving-memory-photo', 'In Loving Memory Photo', 'card', 'flyer', 'photo', 'Traditional', ['white', 'blue-grey'], 'remembrance', ['in loving memory', 'memorial', 'funeral', 'photo', 'obituary', 'remembrance'],
      L({ scene: 'ms-bg-soft-light', pal: CALM, hero: 'ms-forget-me-nots', photo: { mask: 'arch', tint: ['#c9d3de', '#f6f8fa', '#8a9ab0'] } }),
      { eyebrow: 'In loving memory of', title: 'Eleanor Grace Smith', sub: '1938 – 2026', details: ['Service · Friday, November 6 · 11 AM', 'St. John’s Chapel'] }),
    spec('celebration-of-life', 'Celebration of Life', 'card', 'invitation', 'framed', 'Elegant', ['sage', 'white'], 'remembrance', ['celebration of life', 'memorial service', 'remembrance', 'gathering', 'invitation'],
      L({ scene: 'ms-bg-eucalyptus', pal: { ...GREEN, title: '#3a4a3e' }, hero: 'cr-dove', heroColors: ['#ffffff', '#9fb6a8'], corner: 'ms-forget-me-nots' }),
      { eyebrow: 'Please join us for a', title: 'Celebration of Life', sub: 'Sharing stories, music and love for James Walker', details: ['Saturday, November 14 · 2 PM', 'Lakeside Pavilion'], cta: 'Wear something bright — he would have loved it' }),
    spec('memorial-candle-post', 'Memorial Candle', 'post', 'social', 'minimal', 'Minimalist', ['white', 'blue-grey'], 'remembrance', ['memorial', 'candle', 'remembrance', 'sympathy', 'forever in our hearts'],
      L({ scene: 'ms-bg-soft-light', pal: CALM, hero: 'ms-candle' }),
      { eyebrow: 'Forever in our hearts', title: 'Remembering Grandpa Joe', cta: '1942 – 2026' }),
  ] },
];
