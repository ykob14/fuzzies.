/**
 * Parties and community events — themed templates (see ./themed) added to existing topics: Thanksgiving, birthdays,
 * bingo, open mic, marathons and fun runs, community festivals and game days.
 */
import { spec, type Look, type ThemedSet } from './themed';

const AUTUMN = { title: '#7a2e14', ink: '#4a2a18', muted: '#7a5038', accent: '#c8572a', onAccent: '#ffffff', panel: 'rgba(255,250,240,0.92)' };
const PARTY = { title: '#c2457a', ink: '#3a2a40', muted: '#6a5a70', accent: '#5a8fd6', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.94)' };
const STAGE = { title: '#fff3c4', ink: '#f2ecf7', muted: '#cfc4dc', accent: '#e8574a', onAccent: '#ffffff', glow: '#ffd27a', panel: 'rgba(18,13,28,0.85)' };
const FAIR = { title: '#1f4a7a', ink: '#24364a', muted: '#4a5a6a', accent: '#e8574a', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.92)' };
const TRACK = { title: '#1f2a44', ink: '#24364a', muted: '#4a5a6a', accent: '#c8573a', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.94)' };

const L = (o: Partial<Look> & Pick<Look, 'scene' | 'pal' | 'hero'>): Look => ({ title: ['Montserrat', 900], body: ['Montserrat', 600], ...o });

export const EVENTS: ThemedSet[] = [
  { sub: 'thanksgiving', label: 'Thanksgiving', specs: [
    spec('thanksgiving-dinner-invite', 'Thanksgiving Dinner Invitation', 'card', 'invitation', 'framed', 'Traditional', ['orange', 'brown', 'cream'], 'dinner', ['thanksgiving dinner', 'friendsgiving', 'invitation', 'pie', 'family', 'rsvp'],
      L({ scene: 'ev-bg-autumn', pal: AUTUMN, hero: 'ev-pie', corner: 'ev-leaves', title: ['Playfair Display', 800] }),
      { eyebrow: 'Gather & give thanks', title: 'Thanksgiving Dinner', sub: 'Turkey, pie and the people we’re grateful for', details: ['Thursday, November 26 · 4 PM', 'Grandma Rose’s house'], cta: 'Bring your favourite side' }),
    spec('happy-thanksgiving-cornucopia', 'Happy Thanksgiving Cornucopia', 'post', 'greeting', 'hero', 'Elegant', ['orange', 'gold'], 'greeting', ['happy thanksgiving', 'cornucopia', 'harvest', 'grateful', 'thankful'],
      L({ scene: 'ev-bg-autumn', pal: AUTUMN, hero: 'ev-cornucopia', title: ['Cormorant Garamond', 700] }),
      { title: 'Happy Thanksgiving', sub: 'Grateful for you today and every day' }),
    spec('friendsgiving-party', 'Friendsgiving Party', 'story', 'party', 'poster', 'Playful', ['orange', 'cream'], 'party', ['friendsgiving', 'potluck', 'party', 'turkey', 'friends', 'story'],
      L({ scene: 'ev-bg-autumn', pal: AUTUMN, hero: 'ev-turkey', corner: 'ev-leaves', title: ['Fredoka', 700], body: ['Quicksand', 700] }),
      { eyebrow: 'Potluck', title: 'Friendsgiving', details: ['Saturday, November 21 · 6 PM', 'Bring a dish to share', 'Apartment 4B'], cta: 'Stretchy pants recommended' }),
  ] },
  { sub: 'birthday', label: 'Birthdays', specs: [
    spec('birthday-cake-party', 'Birthday Cake Party', 'card', 'invitation', 'medallion', 'Playful', ['pink', 'blue', 'confetti'], 'party', ['birthday party', 'birthday invitation', 'cake', 'candles', 'kids party', 'rsvp'],
      L({ scene: 'ev-bg-party', pal: { ...PARTY, panel: '#ffffff' }, hero: 'ev-birthday-cake', title: ['Fredoka', 700], body: ['Quicksand', 700] }),
      { eyebrow: 'You’re invited!', title: 'Mia Turns 7', details: ['Saturday, March 13 · 2 PM', 'Fun Zone, 18 Park Lane'], cta: 'RSVP to Jess' }),
    spec('happy-birthday-hat', 'Happy Birthday Party Hat', 'post', 'greeting', 'hero', 'Playful', ['pink', 'blue'], 'greeting', ['happy birthday', 'party hat', 'birthday wishes', 'social', 'celebration'],
      L({ scene: 'ev-bg-party', pal: PARTY, hero: 'ev-party-hat', top: 'ev-sparkles', title: ['Pacifico', 400] }),
      { title: 'Happy Birthday!', sub: 'Wishing you cake, laughter and your best year yet' }),
    spec('milestone-birthday-gold', 'Milestone Birthday Gold', 'card', 'invitation', 'arch', 'Luxury', ['navy', 'gold'], 'party', ['40th birthday', '50th birthday', '60th birthday', 'milestone birthday', 'adult birthday', 'champagne', 'rsvp'],
      L({ scene: 'ms-bg-navy-gold', pal: { ...TRACK, title: '#14203a', accent: '#b8862b', panel: '#fbf8f0' }, hero: 'ms-champagne', corner: 'ms-confetti', title: ['Cinzel', 700] }),
      { eyebrow: 'Cheers to 40 years', title: 'David’s Birthday', details: ['Saturday, April 10 · 8 PM', 'The Velvet Room'], cta: 'Cocktail attire' }),
  ] },
  { sub: 'bingo', label: 'Bingo', specs: [
    spec('bingo-night-poster', 'Bingo Night Poster', 'poster', 'poster', 'poster', 'Playful', ['red', 'blue', 'yellow'], 'event', ['bingo night', 'bingo', 'fundraiser', 'game night', 'prizes', 'community'],
      L({ scene: 'ev-bg-party', pal: { ...PARTY, title: '#c8402a' }, hero: 'ev-bingo-balls', corner: 'ev-bingo-card' }),
      { eyebrow: 'Eyes down!', title: 'Bingo Night', details: ['Friday, February 12 · 7 PM', 'Cash prizes · Snacks · Raffle', 'St. Mark’s Hall'], cta: '$5 per card' }),
    spec('bingo-social-post', 'Bingo Social Post', 'post', 'social', 'split', 'Modern', ['red', 'cream'], 'event', ['bingo', 'game night', 'social', 'tonight'],
      L({ scene: 'ev-bg-party', pal: { ...PARTY, title: '#c8402a' }, hero: 'ev-bingo-card' }),
      { eyebrow: 'Tonight', title: 'Bingo at 7', sub: 'Grab a card, a dauber and a friend', cta: 'Free entry' }),
  ] },
  { sub: 'open-mic', label: 'Open mic', specs: [
    spec('open-mic-night-poster', 'Open Mic Night', 'poster', 'poster', 'poster', 'Modern', ['black', 'red', 'gold'], 'event', ['open mic', 'open mic night', 'poetry', 'comedy', 'music', 'sign up', 'stage'],
      L({ scene: 'ev-bg-stage', pal: STAGE, hero: 'ev-microphone', title: ['Bebas Neue', 400] }),
      { eyebrow: 'Every Thursday', title: 'Open Mic Night', sub: 'Music · Poetry · Comedy · Anything goes', details: ['Sign-up 7:30 PM · Show 8 PM', 'The Corner Café'], cta: '5 minutes of fame' }),
    spec('open-mic-story', 'Open Mic Story', 'story', 'social', 'hero', 'Modern', ['black', 'gold'], 'event', ['open mic', 'story', 'tonight', 'stage', 'spotlight'],
      L({ scene: 'ev-bg-stage', pal: STAGE, hero: 'ev-microphone', title: ['Bebas Neue', 400] }),
      { title: 'Your Stage Awaits', sub: 'Open mic tonight · sign-up at the bar', cta: '8 PM' }),
  ] },
  { sub: 'marathon', label: 'Marathons & runs', specs: [
    spec('city-marathon-poster', 'City Marathon Poster', 'poster', 'poster', 'poster', 'Modern', ['red', 'blue'], 'sports', ['marathon', 'city marathon', 'race', 'running', 'half marathon', '10k', 'register'],
      L({ scene: 'ev-bg-track', pal: TRACK, hero: 'ev-shoe', corner: 'ev-medal' }),
      { eyebrow: 'Registration open', title: 'City Marathon', details: ['Sunday, April 25 · Start 7 AM', 'Full · Half · 10K · Kids’ dash', 'Register at citymarathon.org'], cta: 'Every finisher gets a medal' }),
    spec('fun-run-finish-post', 'Fun Run Finish', 'post', 'social', 'hero', 'Playful', ['red', 'white'], 'sports', ['fun run', '5k', 'charity run', 'finish line', 'running', 'community'],
      L({ scene: 'ev-bg-track', pal: TRACK, hero: 'ev-finish' }),
      { title: 'Community 5K Fun Run', sub: 'Walk, jog or run — all paces welcome' }),
  ] },
  { sub: 'festival', label: 'Community festivals', specs: [
    spec('summer-fair-poster', 'Summer Fair Poster', 'poster', 'poster', 'poster', 'Playful', ['blue', 'red', 'colourful'], 'festival', ['summer fair', 'community festival', 'fete', 'street party', 'bunting', 'food trucks', 'family'],
      L({ scene: 'ev-bg-sunny', pal: FAIR, top: 'ev-bunting', hero: 'ev-tent', corner: 'ev-food-truck' }),
      { eyebrow: 'Free family fun', title: 'Summer Fair', details: ['Saturday, June 26 · 11 AM – 6 PM', 'Live music · Food trucks · Games', 'Town Green'], cta: 'Bring the whole family' }),
    spec('food-truck-festival', 'Food Truck Festival', 'post', 'flyer', 'hero', 'Modern', ['teal', 'yellow'], 'festival', ['food truck festival', 'street food', 'market', 'festival', 'foodie'],
      L({ scene: 'ev-bg-sunny', pal: FAIR, top: 'ev-bunting', hero: 'ev-food-truck' }),
      { eyebrow: 'This weekend', title: 'Food Truck Festival', sub: '20+ trucks · live music · Harbour Square', cta: 'Sat & Sun · 12 – 9 PM' }),
  ] },
  { sub: 'basketball', label: 'Basketball', specs: [
    spec('championship-trophy', 'Championship Trophy', 'post', 'social', 'medallion', 'Luxury', ['navy', 'gold'], 'sports', ['champions', 'championship', 'trophy', 'winners', 'final', 'team'],
      L({ scene: 'ms-bg-navy-gold', pal: { ...TRACK, title: '#ffffff', ink: '#e6ebf7', muted: '#c6d0ea', panelTitle: '#14203a', accent: '#e8c46a', onAccent: '#14203a', panel: '#fbf8f0' }, hero: 'ev-trophy', title: ['Bebas Neue', 400] }),
      { eyebrow: 'Back-to-back', title: 'Champions!', sub: 'Congratulations to the Riverside Hawks', cta: 'Season 2026' }),
  ] },
  { sub: 'soccer', label: 'Soccer', specs: [
    spec('game-day-balls', 'Game Day', 'flyer', 'flyer', 'poster', 'Modern', ['green', 'white'], 'sports', ['game day', 'match day', 'tournament', 'sports day', 'kids league', 'team'],
      L({ scene: 'ev-bg-sunny', pal: FAIR, top: 'ev-bunting', hero: 'ev-balls', corner: 'ev-trophy' }),
      { eyebrow: 'Family sports day', title: 'Game Day', details: ['Saturday, May 8 · 9 AM', 'Soccer · Basketball · Relay races', 'Northside Park'], cta: 'Medals for every kid' }),
  ] },
];
