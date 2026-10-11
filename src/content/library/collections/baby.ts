/**
 * Baby — themed templates (see ./themed): pregnancy announcements, gender reveals (pink, blue and neutral), baby showers,
 * sprinkles, twins, birth announcements, welcome baby, first birthdays, naming ceremonies, aqeeqah, brit milah and
 * newborn photo cards. Palettes: blush, baby blue, sage & sand neutrals, watercolour, twinkle night.
 * Arabic: عقيقة (aqeeqah), مبروك المولود (congratulations on the newborn). Hebrew: ברית מילה (brit milah), מזל טוב (mazel tov).
 */
import { spec, type Look, type Native, type ThemedSet } from './themed';

const BLUSH = { title: '#9a5f50', ink: '#5a4a44', muted: '#8a7a72', accent: '#d39a86', onAccent: '#ffffff', panel: '#ffffff' };
const PINK = { title: '#c2577a', ink: '#5a3a44', muted: '#8a6a72', accent: '#e58fb0', onAccent: '#ffffff', panel: '#ffffff' };
const BLUE = { title: '#3a6a9a', ink: '#33405a', muted: '#5a6a82', accent: '#6fa3d6', onAccent: '#ffffff', panel: '#ffffff' };
const SAGE = { title: '#5a6a4a', ink: '#4a4a3e', muted: '#7a7a6a', accent: '#c98a6b', onAccent: '#ffffff', panel: '#fbfaf5' };
const NIGHT = { title: '#fff3c4', ink: '#e6ebf7', muted: '#c6d0ea', accent: '#f6d27a', onAccent: '#1f2b4d', glow: '#ffe08a', panel: '#fbf8f0' };

const L = (o: Partial<Look> & Pick<Look, 'scene' | 'pal' | 'hero'>): Look => ({ title: ['Parisienne', 400], body: ['Quicksand', 600], ...o });
const ROUND = (o: Partial<Look> & Pick<Look, 'scene' | 'pal' | 'hero'>): Look => ({ title: ['Fredoka', 700], body: ['Quicksand', 700], ...o });
const ar = (text: string, color: string): Native => ({ text, script: 'ar', font: ['Amiri', 700], color });
const he = (text: string, color: string): Native => ({ text, script: 'he', font: ['Frank Ruhl Libre', 700], color });

export const BABY: ThemedSet[] = [
  { sub: 'pregnancy-announcement', label: 'Pregnancy announcements', specs: [
    spec('baby-coming-soon-onesie', 'Baby Coming Soon', 'post', 'social', 'hero', 'Playful', ['blush', 'cream'], 'announcement', ['pregnancy announcement', 'baby on the way', 'coming soon', 'expecting', 'onesie'],
      ROUND({ scene: 'bb-bg-blush', pal: PINK, hero: 'bb-onesie', top: 'bb-hearts' }),
      { eyebrow: 'Our little secret', title: 'Baby Coming Soon', sub: 'Arriving spring 2027 · we can’t wait to meet you' }),
    spec('little-one-on-the-way-story', 'Little One on the Way', 'story', 'social', 'medallion', 'Minimalist', ['sage', 'sand'], 'announcement', ['pregnancy', 'expecting', 'boho', 'rainbow', 'neutral', 'story'],
      L({ scene: 'bb-bg-sage', pal: SAGE, hero: 'bb-rainbow' }),
      { title: 'A Little One Is on the Way', sub: 'Baby Miller · due April 2027', cta: 'Family of three soon' }),
    spec('we-are-expecting-photo', 'We’re Expecting Photo Card', 'card', 'social', 'photo', 'Elegant', ['cream', 'sand'], 'announcement', ['we are expecting', 'pregnancy announcement', 'photo', 'ultrasound', 'bump'],
      L({ scene: 'bb-bg-watercolor', pal: BLUSH, hero: 'bb-footprints', photo: { mask: 'arch', tint: ['#e8cfc4', '#fffaf5', '#d39a86'] } }),
      { title: 'We’re Expecting!', sub: 'Baby arrives May 2027', details: ['Sam & Alex'] }),
  ] },
  { sub: 'gender-reveal', label: 'Gender reveals', specs: [
    spec('he-or-she-reveal-party', 'He or She Reveal Party', 'card', 'party', 'framed', 'Playful', ['pink', 'blue'], 'party', ['gender reveal', 'he or she', 'boy or girl', 'pink or blue', 'party', 'balloons', 'rsvp'],
      ROUND({ scene: 'bb-bg-watercolor', pal: { ...BLUSH, title: '#7a5a8a' }, hero: 'bb-reveal-balloons', corner: 'bb-stars' }),
      { eyebrow: 'Pink or blue?', title: 'He or She?', sub: 'Join us as we find out together', details: ['Saturday, March 13 · 3 PM', 'Our backyard · 9 Elm Court'], cta: 'Wear your guess!' }),
    spec('team-pink-team-blue-post', 'Team Pink or Team Blue', 'post', 'party', 'hero', 'Playful', ['pink', 'blue'], 'party', ['gender reveal', 'team pink', 'team blue', 'vote', 'social'],
      ROUND({ scene: 'bb-bg-sky', pal: { ...BLUE, title: '#7a5a8a' }, hero: 'bb-reveal-balloons' }),
      { title: 'Team Pink or Team Blue?', sub: 'Cast your vote — the big reveal is Saturday!' }),
    spec('gender-reveal-neutral', 'Gender Reveal Neutral', 'card', 'invitation', 'arch', 'Minimalist', ['sage', 'sand'], 'party', ['gender reveal', 'neutral', 'boho', 'rainbow', 'invitation'],
      L({ scene: 'bb-bg-sage', pal: SAGE, hero: 'bb-rainbow', corner: 'bb-stars', cornerColors: ['#d9b48a', '#a8b89a', '#e8c9b5'] }),
      { eyebrow: 'Boy or girl?', title: 'Gender Reveal', sub: 'A little celebration for a big surprise', details: ['Sunday, April 11 · 2 PM', 'The Garden Room'], cta: 'RSVP to Chloe' }),
  ] },
  { sub: 'baby-shower', label: 'Baby showers', specs: [
    spec('oh-baby-teddy-shower', 'Oh Baby Teddy Shower', 'card', 'invitation', 'framed', 'Playful', ['cream', 'blush', 'beige'], 'party', ['oh baby', 'baby shower invitation', 'teddy bear', 'neutral', 'watercolour', 'rsvp'],
      L({ scene: 'bb-bg-watercolor', pal: BLUSH, hero: 'bb-teddy', heroColors: ['#c99a6e', '#f2dcc2', '#f4b6c2'], corner: 'bb-flowers' }),
      { eyebrow: 'Oh baby!', title: 'Baby Shower', sub: 'Please join us for a baby shower honouring Emma Johnson', details: ['Sunday, May 16 · 2 PM', '14 Willow Lane, Portland'], cta: 'RSVP to Lily · 555-0142' }),
    spec('twinkle-little-star-shower', 'Twinkle Little Star Shower', 'card', 'invitation', 'medallion', 'Elegant', ['navy', 'gold'], 'party', ['twinkle twinkle little star', 'baby shower', 'moon', 'stars', 'boy', 'neutral'],
      L({ scene: 'bb-bg-night', pal: { ...NIGHT, panelTitle: '#1f2b4d', panelInk: '#33405a', panelMuted: '#5a6a82', panel: '#fbf8f0' }, hero: 'bb-moon' }),
      { eyebrow: 'Twinkle twinkle little star', title: 'Baby Shower', sub: 'For Olivia & James', details: ['Saturday, June 12 · 1 PM', 'Starlight Café'], cta: 'RSVP by June 1' }),
    spec('baby-shower-blooms', 'Baby Shower in Bloom', 'post', 'invitation', 'hero', 'Elegant', ['blush', 'pink'], 'party', ['baby shower', 'floral', 'watercolour', 'girl', 'its a girl', 'flowers'],
      L({ scene: 'bb-bg-blush', pal: PINK, hero: 'bb-flowers' }),
      { eyebrow: 'A baby is blooming', title: 'Baby Shower', sub: 'Honouring Grace · Sunday, May 2 · 2 PM', cta: 'Tea · cake · games' }),
    spec('little-elephant-shower', 'Little Elephant Shower', 'flyer', 'invitation', 'poster', 'Playful', ['blue', 'grey'], 'party', ['baby shower', 'elephant', 'safari', 'boy', 'its a boy', 'blue'],
      ROUND({ scene: 'bb-bg-sky', pal: BLUE, hero: 'bb-elephant', corner: 'bb-balloons' }),
      { eyebrow: 'It’s a boy!', title: 'Baby Shower', sub: 'Celebrating Mia and her little one', details: ['Saturday, April 24 · 11 AM', 'Brunch at The Lemon Tree'], cta: 'Diaper raffle!' }),
  ] },
  { sub: 'baby-sprinkle', label: 'Baby sprinkles', specs: [
    spec('baby-sprinkle-rainbow', 'Baby Sprinkle Rainbow', 'card', 'invitation', 'framed', 'Playful', ['sage', 'sand', 'blush'], 'party', ['baby sprinkle', 'sprinkle', 'second baby', 'rainbow baby', 'boho', 'rsvp'],
      L({ scene: 'bb-bg-sage', pal: SAGE, hero: 'bb-rainbow', corner: 'bb-stars', cornerColors: ['#d9b48a', '#a8b89a', '#e8c9b5'] }),
      { eyebrow: 'Join us for a', title: 'Baby Sprinkle', sub: 'A little shower for baby number two', details: ['Sunday, March 7 · 3 PM', 'Home of Ava Brooks'], cta: 'Diapers & hugs welcome' }),
    spec('sprinkle-hearts-post', 'Sprinkle Hearts', 'post', 'party', 'medallion', 'Playful', ['pink', 'white'], 'party', ['baby sprinkle', 'hearts', 'pink', 'girl', 'party'],
      ROUND({ scene: 'bb-bg-blush', pal: PINK, hero: 'bb-hearts' }),
      { title: 'Let’s Sprinkle Baby Girl', sub: 'With love and little gifts', cta: 'Saturday · 2 PM' }),
  ] },
  { sub: 'twins', label: 'Twins', specs: [
    spec('double-the-love-twins', 'Double the Love Twins', 'card', 'invitation', 'framed', 'Playful', ['blue', 'pink'], 'party', ['twins', 'double the love', 'twin baby shower', 'two', 'teddy bears'],
      ROUND({ scene: 'bb-bg-watercolor', pal: { ...BLUSH, title: '#7a5a8a' }, hero: 'bb-reveal-balloons', heroColors: ['#f4a6c0', '#94c6ec', '#ffffff'], corner: 'bb-teddy' }),
      { eyebrow: 'Double the love', title: 'Twin Baby Shower', sub: 'Two little reasons to celebrate', details: ['Saturday, May 29 · 1 PM', 'Riverside Pavilion'], cta: 'RSVP to Nora' }),
    spec('twins-announcement-post', 'Twins Announcement', 'post', 'social', 'hero', 'Minimalist', ['sage', 'cream'], 'announcement', ['twins', 'twin announcement', 'two of a kind', 'neutral', 'footprints'],
      L({ scene: 'bb-bg-sage', pal: SAGE, hero: 'bb-footprints', heroColors: ['#c98a6b'] }),
      { eyebrow: 'Surprise!', title: 'Two of a Kind', sub: 'Twins arriving summer 2027' }),
  ] },
  { sub: 'birth-announcement', label: 'Birth announcements', specs: [
    spec('hello-world-birth-photo', 'Hello World Birth Photo', 'card', 'social', 'photo', 'Elegant', ['cream', 'blush'], 'announcement', ['birth announcement', 'hello world', 'newborn', 'photo', 'stats', 'its a girl'],
      L({ scene: 'bb-bg-watercolor', pal: BLUSH, hero: 'bb-flowers', photo: { mask: 'arch', tint: ['#ecd2c8', '#fffaf5', '#d39a86'] } }),
      { title: 'Hello, Amelia Rose', sub: 'Born March 3 · 7 lb 2 oz · 20 in', details: ['With love, Kate & Ben'] }),
    spec('its-a-boy-announcement', 'It’s a Boy Announcement', 'post', 'social', 'medallion', 'Playful', ['blue', 'white'], 'announcement', ['its a boy', 'birth announcement', 'newborn', 'blue', 'teddy'],
      ROUND({ scene: 'bb-bg-sky', pal: BLUE, hero: 'bb-teddy', heroColors: ['#c99a6e', '#f2dcc2', '#94c6ec'] }),
      { eyebrow: 'Welcome to the world', title: 'It’s a Boy!', sub: 'Leo Martin · born April 12', cta: '8 lb 1 oz · 21 in' }),
    spec('its-a-girl-announcement', 'It’s a Girl Announcement', 'story', 'social', 'hero', 'Playful', ['pink', 'white'], 'announcement', ['its a girl', 'birth announcement', 'newborn', 'pink', 'balloons', 'story'],
      ROUND({ scene: 'bb-bg-blush', pal: PINK, hero: 'bb-balloons', heroColors: ['#f7b8c8', '#ffd0dc', '#f6e3a1', '#ffffff'] }),
      { eyebrow: 'Welcome, little one', title: 'It’s a Girl!', sub: 'Isla Grace · born May 20 · 6 lb 14 oz' }),
  ] },
  { sub: 'welcome-baby', label: 'Welcome baby', specs: [
    spec('welcome-home-baby', 'Welcome Home Baby', 'landscape', 'social', 'split', 'Playful', ['blue', 'cream'], 'announcement', ['welcome home', 'welcome baby', 'banner', 'pram', 'newborn'],
      ROUND({ scene: 'bb-bg-sky', pal: BLUE, hero: 'bb-pram' }),
      { title: 'Welcome Home, Baby!', sub: 'We are so happy you’re here', cta: 'Love, the Parker family' }),
    spec('sip-and-see', 'Sip & See Invitation', 'card', 'invitation', 'arch', 'Elegant', ['blush', 'gold'], 'party', ['sip and see', 'meet the baby', 'newborn', 'invitation', 'tea party'],
      L({ scene: 'bb-bg-blush', pal: { ...BLUSH, panel: '#ffffff' }, hero: 'bb-flowers', corner: 'bb-hearts' }),
      { eyebrow: 'Come meet our little one', title: 'Sip & See', details: ['Sunday, June 20 · 2 – 4 PM', 'The Harper home'], cta: 'Tea, treats & cuddles' }),
  ] },
  { sub: 'first-birthday', label: 'First birthdays', specs: [
    spec('one-little-star-birthday', 'One Little Star', 'card', 'invitation', 'medallion', 'Playful', ['navy', 'gold'], 'party', ['first birthday', '1st birthday', 'twinkle little star', 'one', 'party', 'rsvp'],
      ROUND({ scene: 'bb-bg-night', pal: { ...NIGHT, panelTitle: '#1f2b4d', panelInk: '#33405a', panelMuted: '#5a6a82', panel: '#fbf8f0' }, hero: 'bb-moon' }),
      { eyebrow: 'Twinkle twinkle, look who’s one', title: 'Ella Turns 1!', details: ['Saturday, July 10 · 3 PM', '12 Starling Road'], cta: 'RSVP to Mum' }),
    spec('wild-one-birthday', 'Wild One Birthday', 'poster', 'party', 'poster', 'Playful', ['blue', 'yellow'], 'party', ['first birthday', 'wild one', 'safari', 'giraffe', 'elephant', 'kids party'],
      ROUND({ scene: 'bb-bg-sky', pal: { ...BLUE, title: '#c27a1a', accent: '#e8a33a', panel: 'rgba(255,255,255,0.94)' }, hero: 'bb-giraffe', corner: 'bb-elephant' }),
      { eyebrow: 'Join the safari', title: 'Wild ONE', sub: 'Jack’s first birthday adventure', details: ['Sunday, August 1 · 11 AM', 'City Zoo Picnic Lawn'], cta: 'Animal ears encouraged' }),
    spec('first-birthday-balloons', 'First Birthday Balloons', 'post', 'party', 'hero', 'Playful', ['pastel', 'pink'], 'party', ['first birthday', 'balloons', 'cake smash', 'party', 'social'],
      ROUND({ scene: 'bb-bg-blush', pal: PINK, hero: 'bb-balloons', top: 'bb-stars' }),
      { title: 'Happy 1st Birthday!', sub: 'One year of smiles, giggles and love' }),
  ] },
  { sub: 'naming-ceremony', label: 'Naming ceremonies', specs: [
    spec('naming-ceremony-invite', 'Naming Ceremony Invitation', 'card', 'invitation', 'framed', 'Elegant', ['sage', 'cream'], 'ceremony', ['naming ceremony', 'naming day', 'baby naming', 'namkaran', 'invitation'],
      L({ scene: 'bb-bg-sage', pal: SAGE, hero: 'bb-moon', heroColors: ['#d9b48a', '#f6e3a1', '#ffffff'], corner: 'bb-flowers' }),
      { eyebrow: 'Please join us as we name our baby', title: 'A Naming Celebration', details: ['Saturday, May 15 · 11 AM', 'Willow Hall · Lunch to follow'], cta: 'RSVP to Ravi & Meera' }),
    spec('meet-baby-name-post', 'Meet Our Baby Name', 'post', 'social', 'minimal', 'Minimalist', ['cream', 'sand'], 'announcement', ['baby name', 'name reveal', 'naming day', 'minimal'],
      L({ scene: 'bb-bg-watercolor', pal: BLUSH, hero: 'bb-cloud' }),
      { eyebrow: 'Say hello to', title: 'Aria Noor', sub: 'Aria means “air” · Noor means “light”', cta: 'Welcome, little one' }),
  ] },
  { sub: 'aqeeqah', label: 'Aqeeqah', specs: [
    spec('aqeeqah-invitation', 'Aqeeqah Invitation', 'card', 'invitation', 'arch', 'Traditional', ['emerald', 'gold', 'cream'], 'ceremony', ['aqeeqah', 'aqiqah', 'akika', 'muslim baby', 'newborn', 'invitation', 'arabic'],
      L({ scene: 'is-bg-emerald', pal: { ...SAGE, title: '#0e3b36', accent: '#b8862b', panel: '#fffaf0' }, hero: 'is-crescent-stars', heroColors: ['#b8862b', '#ffe9a8'], corner: 'is-sheep', title: ['Cinzel', 700], body: ['Montserrat', 600] }),
      { eyebrow: 'You are invited to the', native: ar('عقيقة', '#1f6f6a'), title: 'Aqeeqah of Yusuf', sub: 'Celebrating the blessing of our son with family and friends', details: ['Sunday, April 18 · 1 PM', 'Al-Noor Hall'], cta: 'Lunch will be served' }),
    spec('mabrook-newborn-post', 'Mabrook on Your Newborn', 'post', 'greeting', 'medallion', 'Elegant', ['emerald', 'gold'], 'greeting', ['mabrook', 'congratulations', 'newborn', 'muslim baby', 'arabic', 'aqeeqah'],
      L({ scene: 'is-bg-emerald', pal: { ...SAGE, title: '#ffffff', ink: '#f3ead7', muted: '#cfe3d9', panelTitle: '#0e3b36', panelInk: '#2e3a36', panelMuted: '#5f6f68', accent: '#e8c46a', onAccent: '#0e3b36', panel: '#fffaf0' }, hero: 'bb-moon', heroColors: ['#e8c46a', '#fff3c4', '#ffffff'], title: ['Cinzel', 700], body: ['Montserrat', 600] }),
      { native: ar('مبروك المولود', '#1f6f6a'), title: 'Congratulations', sub: 'May your little one be a joy and a blessing', cta: 'Mabrook!' }),
  ] },
  { sub: 'brit-milah', label: 'Brit milah', specs: [
    spec('brit-milah-invitation', 'Brit Milah Invitation', 'card', 'invitation', 'framed', 'Traditional', ['white', 'blue', 'gold'], 'ceremony', ['brit milah', 'bris', 'bris milah', 'jewish baby', 'invitation', 'hebrew', 'mazel tov'],
      L({ scene: 'jh-bg-parchment', pal: { ...BLUE, title: '#1f3a6a', accent: '#2f5fa8' }, hero: 'jh-star', corner: 'jh-sparkles', title: ['Cormorant Garamond', 700], body: ['Montserrat', 600] }),
      { native: he('ברית מילה', '#2f5fa8'), title: 'Please Join Us for the Bris', sub: 'of our son, son of David and Rachel Katz', details: ['Thursday, May 6 · 9 AM', 'Congregation Beth Israel · Breakfast to follow'], cta: 'Mazel tov!' }),
    spec('mazel-tov-baby-boy', 'Mazel Tov Baby Boy', 'post', 'greeting', 'medallion', 'Elegant', ['blue', 'white'], 'greeting', ['mazel tov', 'baby boy', 'brit milah', 'hebrew', 'congratulations'],
      L({ scene: 'bb-bg-sky', pal: { ...BLUE, title: '#1f3a6a' }, hero: 'jh-star', title: ['Cormorant Garamond', 700] }),
      { native: he('מזל טוב', '#2f5fa8'), title: 'Welcome, Baby Boy', sub: 'Wishing your family endless joy', cta: 'Mazel tov!' }),
  ] },
  { sub: 'newborn-photo-card', label: 'Newborn photo cards', specs: [
    spec('newborn-photo-circle', 'Newborn Photo Circle', 'post', 'social', 'photo', 'Playful', ['blue', 'white'], 'announcement', ['newborn', 'photo card', 'baby photo', 'circle', 'stats'],
      ROUND({ scene: 'bb-bg-sky', pal: BLUE, hero: 'bb-duck', photo: { mask: 'circle', tint: ['#bcd8ee', '#f5fbff', '#6fa3d6'] } }),
      { title: 'Hello, Theo!', sub: 'Born June 2 · 7 lb 9 oz', cta: 'Our hearts are full' }),
    spec('newborn-milestone-story', 'Newborn Milestone Story', 'story', 'social', 'photo', 'Minimalist', ['sage', 'sand'], 'announcement', ['newborn', 'one month', 'milestone', 'photo', 'story'],
      L({ scene: 'bb-bg-sage', pal: SAGE, hero: 'bb-cloud', photo: { mask: 'rounded', tint: ['#d9d3c2', '#fbfaf5', '#c98a6b'] } }),
      { eyebrow: 'One month old', title: 'Little Hazel', sub: 'Sleepy, cuddly and growing every day' }),
  ] },
];
