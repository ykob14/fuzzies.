/**
 * Islamic celebrations — themed templates (see ./themed). Arabic, checked phrase by phrase:
 * رمضان كريم (Ramadan Kareem), رمضان مبارك (Ramadan Mubarak), إفطار (iftar), سحور (suhoor), عيد مبارك (Eid Mubarak),
 * عيد فطر سعيد (a happy Eid al-Fitr), عيد أضحى مبارك (a blessed Eid al-Adha), كل عام وأنتم بخير (may you be well every
 * year), عام هجري سعيد (happy Hijri New Year), المولد النبوي الشريف (the noble Mawlid), صدقة (sadaqah, charity).
 * Arabic is set in Arabic fonts with no letter spacing so letters join; Eid al-Fitr and Eid al-Adha are kept apart.
 */
import { spec, type Look, type Native, type ThemedSet } from './themed';

const ar = (text: string, font: [string, number] = ['Aref Ruqaa', 700], color?: string): Native => ({ text, font, script: 'ar', color });
const NIGHT = { title: '#ffffff', ink: '#f3ead7', muted: '#cfe3df', accent: '#e8c46a', onAccent: '#0b1f2e', glow: '#ffcf6a' };
const EMERALD = { title: '#ffffff', ink: '#f3ead7', muted: '#cfe3d9', accent: '#e8c46a', onAccent: '#0e3b36', glow: '#ffcf6a' };
const IVORY = { title: '#0e3b36', ink: '#2e3a36', muted: '#5f6f68', accent: '#b8862b', onAccent: '#ffffff', panel: '#fffaf0' };
const ROYAL = { title: '#ffffff', ink: '#e6ebf7', muted: '#c6d0ea', accent: '#e8c46a', onAccent: '#14244d', glow: '#ffd27a', panel: '#fbf6ea' };
const DUSK = { title: '#ffffff', ink: '#fff1e2', muted: '#ffe0c8', accent: '#ffcf6a', onAccent: '#3b1f4a', glow: '#ffb46a' };
const ON_IVORY_PANEL = { title: '#0e3b36', ink: '#2e3a36', muted: '#6a6a5a', accent: '#b8862b', onAccent: '#ffffff', panel: '#fffaf0' };

const L = (o: Partial<Look> & Pick<Look, 'scene' | 'pal' | 'hero'>): Look => ({ title: ['Cinzel', 700], body: ['Montserrat', 600], ...o });

export const ISLAMIC: ThemedSet[] = [
  { sub: 'ramadan', label: 'Ramadan', specs: [
    spec('ramadan-kareem-lanterns', 'Ramadan Kareem Lanterns', 'post', 'greeting', 'hero', 'Luxury', ['green', 'gold'], 'greeting', ['ramadan kareem', 'ramadan mubarak', 'arabic', 'lanterns', 'fanous', 'mosque', 'emerald'],
      L({ scene: 'is-bg-emerald', pal: EMERALD, top: 'is-lanterns', topColors: ['#d4a940', '#2a8f86', '#ffcf6a'], hero: 'is-mosque', heroColors: ['#d4a940', '#fff3c4'] }),
      { native: ar('رمضان كريم'), title: 'Ramadan Kareem', sub: 'Wishing you a blessed month of peace, reflection and joy' }),
    spec('ramadan-mubarak-night-story', 'Ramadan Mubarak Night Story', 'story', 'social', 'hero', 'Elegant', ['navy', 'gold'], 'greeting', ['ramadan mubarak', 'story', 'night', 'crescent', 'stars', 'arabic'],
      L({ scene: 'is-bg-royal', pal: ROYAL, top: 'is-lanterns', hero: 'is-crescent-stars', title: ['Cormorant Garamond', 700] }),
      { native: ar('رمضان مبارك', ['Amiri', 700]), title: 'Ramadan Mubarak', sub: 'May this month bring you light, mercy and peace' }),
    spec('ramadan-timetable-flyer', 'Ramadan Prayer Timetable', 'flyer', 'flyer', 'framed', 'Traditional', ['ivory', 'green', 'gold'], 'community', ['timetable', 'prayer times', 'taraweeh', 'mosque', 'suhoor', 'iftar', 'calendar'],
      L({ scene: 'is-bg-cream', pal: IVORY, hero: 'is-crescent', heroColors: ['#b8862b'], corner: 'is-lantern', title: ['Cinzel', 700] }),
      { eyebrow: 'Ramadan 1448', title: 'Daily Prayer & Iftar Times', sub: 'Taraweeh nightly after Isha · Qur’an circle on weekends', details: ['Suhoor ends 4:52 AM · Iftar 7:38 PM', 'Al-Noor Community Mosque'], cta: 'Full timetable at the front desk' }),
    spec('ramadan-banner-crescent', 'Ramadan Crescent Banner', 'landscape', 'social', 'split', 'Modern', ['navy', 'gold'], 'greeting', ['banner', 'header', 'website', 'crescent', 'lanterns', 'arabic'],
      L({ scene: 'is-bg-royal', pal: ROYAL, hero: 'is-lanterns', heroColors: ['#e8c46a', '#2a8f86', '#ffcf6a'] }),
      { native: ar('رمضان كريم'), title: 'Ramadan Kareem', sub: 'From all of us, a peaceful and blessed month' }),
  ] },
  { sub: 'iftar-suhoor', label: 'Iftar & Suhoor', specs: [
    spec('community-iftar-invitation', 'Community Iftar Invitation', 'card', 'invitation', 'arch', 'Traditional', ['emerald', 'gold', 'ivory'], 'event', ['community iftar', 'iftar dinner', 'invitation', 'breaking fast', 'dates', 'rsvp'],
      L({ scene: 'is-bg-emerald', pal: ON_IVORY_PANEL, top: 'is-lanterns', hero: 'is-iftar', corner: 'is-rosette', cornerColors: ['#b8862b'] }),
      { eyebrow: 'You are warmly invited', native: ar('إفطار', ['Reem Kufi', 700], '#1f6f6a'), title: 'Community Iftar', sub: 'Break the fast together with family, friends and neighbours', details: ['Friday, March 5 · Maghrib 6:12 PM', 'Al-Noor Hall · 22 Garden Street'], cta: 'All are welcome' }),
    spec('iftar-at-sunset-post', 'Iftar at Sunset', 'post', 'social', 'hero', 'Modern', ['sunset', 'orange', 'purple'], 'greeting', ['iftar', 'sunset', 'maghrib', 'dates', 'social', 'fast'],
      L({ scene: 'is-bg-cream', pal: IVORY, hero: 'is-iftar', top: 'is-lanterns', title: ['Montserrat', 800] }),
      { native: ar('إفطار شهي', ['Reem Kufi', 700]), title: 'Iftar Time', sub: 'Dates, water and gratitude as the sun goes down' }),
    spec('suhoor-night-story', 'Suhoor Gathering Story', 'story', 'party', 'poster', 'Elegant', ['navy', 'gold'], 'event', ['suhoor', 'sehri', 'suhoor party', 'tent', 'night', 'coffee'],
      L({ scene: 'is-bg-starry', pal: { ...NIGHT, panel: 'rgba(255,250,240,0.94)', panelInk: '#0b1f2e', panelMuted: '#4a5a62' }, hero: 'is-dallah', heroColors: ['#d4a940', '#3a2a20'], title: ['Cinzel', 700] }),
      { eyebrow: 'Suhoor night', title: 'Suhoor Under the Stars', native: ar('سحور', ['Aref Ruqaa', 700]), details: ['Every Saturday in Ramadan', '11 PM – 3 AM · Rooftop Garden'], cta: 'Arabic coffee & sweets' }),
  ] },
  { sub: 'eid-al-fitr', label: 'Eid al-Fitr', specs: [
    spec('eid-al-fitr-mubarak', 'Eid al-Fitr Mubarak', 'post', 'greeting', 'medallion', 'Luxury', ['emerald', 'gold'], 'greeting', ['eid mubarak', 'eid al fitr', 'eid ul fitr', 'arabic', 'greeting', 'crescent'],
      L({ scene: 'is-bg-emerald', pal: { ...EMERALD, panelTitle: '#0e3b36', panelInk: '#2e3a36', panelMuted: '#5f6f68', panel: '#fffaf0' }, hero: 'is-crescent-stars', heroColors: ['#b8862b', '#ffe9a8'] }),
      { native: ar('عيد مبارك', ['Aref Ruqaa', 700], '#b8862b'), title: 'Eid Mubarak', sub: 'Wishing you and your family a joyful Eid al-Fitr', cta: 'Eid al-Fitr' }),
    spec('eid-fitr-family-card', 'Eid al-Fitr Family Card', 'card', 'greeting', 'framed', 'Elegant', ['ivory', 'gold', 'green'], 'greeting', ['eid card', 'family', 'eid al fitr', 'kul am wa antum bikhair', 'arabic'],
      L({ scene: 'is-bg-cream', pal: IVORY, frame: 'is-frame', frameColors: ['#b8862b'], hero: 'is-lantern', title: ['Cormorant Garamond', 700] }),
      { native: ar('عيد فطر سعيد', ['Amiri', 700], '#1f6f6a'), title: 'A Joyful Eid al-Fitr', sub: 'May every year find you and your loved ones well', details: ['With love, the Rahman family'] }),
    spec('eid-fitr-festival-poster', 'Eid Festival Poster', 'poster', 'poster', 'poster', 'Playful', ['blue', 'gold'], 'festival', ['eid festival', 'eid party', 'fair', 'kids', 'food', 'henna', 'community'],
      L({ scene: 'is-bg-royal', pal: { ...ROYAL, panelInk: '#14244d', panelMuted: '#4a5a7a', panel: 'rgba(255,255,255,0.92)' }, hero: 'is-gifts', top: 'is-lanterns', title: ['Montserrat', 900] }),
      { eyebrow: 'Eid al-Fitr', title: 'Eid Festival', native: ar('عيد سعيد', ['Reem Kufi', 700]), details: ['Sunday, March 21 · 11 AM – 6 PM', 'Food stalls · Henna · Rides · Gifts', 'Riverside Park'], cta: 'Free entry · all welcome' }),
  ] },
  { sub: 'eid-al-adha', label: 'Eid al-Adha', specs: [
    spec('eid-al-adha-mubarak', 'Eid al-Adha Mubarak', 'post', 'greeting', 'hero', 'Traditional', ['dusk', 'gold'], 'greeting', ['eid al adha', 'eid ul adha', 'bakrid', 'eid mubarak', 'arabic', 'mosque'],
      L({ scene: 'is-bg-starry', sceneColors: ['#3b1f4a', '#c4574a', '#f6b26b'], pal: DUSK, top: 'is-sparkles', topColors: ['#ffe9a8', '#fff3c4'], hero: 'is-mosque', heroColors: ['#2a1436', '#ffcf6a'] }),
      { native: ar('عيد أضحى مبارك'), title: 'Eid al-Adha Mubarak', sub: 'May your sacrifices be accepted and your home be blessed' }),
    spec('eid-adha-kids-card', 'Eid al-Adha Kids Card', 'card', 'greeting', 'framed', 'Playful', ['cream', 'green'], 'greeting', ['eid al adha', 'kids', 'sheep', 'cute', 'family', 'qurbani'],
      L({ scene: 'is-bg-cream', pal: IVORY, hero: 'is-sheep', corner: 'is-sparkles', title: ['Fredoka', 700], body: ['Quicksand', 600] }),
      { native: ar('عيد مبارك', ['Reem Kufi', 700], '#1f6f6a'), title: 'Happy Eid al-Adha!', sub: 'Wishing you a day full of family, food and smiles', details: ['Love, Yusuf & Maryam'] }),
    spec('eid-adha-qurbani-flyer', 'Qurbani Appeal Flyer', 'flyer', 'flyer', 'poster', 'Modern', ['emerald', 'gold'], 'charity', ['qurbani', 'udhiyah', 'charity', 'appeal', 'donate', 'eid al adha'],
      L({ scene: 'is-bg-emerald', pal: { ...EMERALD, panelInk: '#0e3b36', panelMuted: '#3e5e58', panel: 'rgba(255,250,240,0.94)' }, hero: 'is-charity', heroColors: ['#1f6f6a', '#d4a940', '#ffffff'], title: ['Montserrat', 900] }),
      { eyebrow: 'Eid al-Adha', title: 'Share Your Qurbani', sub: 'Help families in need celebrate Eid with a meal', details: ['Orders close Thursday, May 13', 'Collected and distributed by our volunteers'], cta: 'Donate at the mosque office' }),
  ] },
  { sub: 'islamic-new-year', label: 'Islamic New Year', specs: [
    spec('hijri-new-year-greeting', 'Happy Hijri New Year', 'post', 'greeting', 'hero', 'Elegant', ['navy', 'gold'], 'greeting', ['islamic new year', 'hijri new year', 'muharram', 'arabic', 'crescent', 'new year'],
      L({ scene: 'is-bg-starry', pal: NIGHT, hero: 'is-crescent', heroColors: ['#e8c46a'], top: 'is-sparkles' }),
      { native: ar('عام هجري سعيد'), title: 'Happy Hijri New Year', sub: 'A new year of hope, faith and good deeds' }),
    spec('muharram-reflection-story', 'Muharram Reflection Story', 'story', 'social', 'minimal', 'Minimalist', ['ivory', 'gold'], 'greeting', ['muharram', 'islamic new year', 'reflection', 'minimal', 'story'],
      L({ scene: 'is-bg-cream', pal: IVORY, hero: 'is-crescent', heroColors: ['#b8862b'], corner: 'is-rosette', cornerColors: ['#b8862b'], title: ['Cormorant Garamond', 700] }),
      { eyebrow: '1 Muharram', native: ar('عام هجري سعيد', ['Amiri', 700], '#1f6f6a'), title: 'A New Hijri Year Begins', sub: 'Time to reflect, renew our intentions and begin again', cta: 'Happy new year' }),
  ] },
  { sub: 'mawlid', label: 'Mawlid', specs: [
    spec('mawlid-celebration-post', 'Mawlid Celebration', 'post', 'greeting', 'medallion', 'Traditional', ['emerald', 'gold'], 'greeting', ['mawlid', 'mawlid an nabi', 'milad', 'prophet birthday', 'arabic', 'rabi al awwal'],
      L({ scene: 'is-bg-emerald', pal: { ...EMERALD, panelTitle: '#0e3b36', panelInk: '#2e3a36', panelMuted: '#5f6f68', panel: '#fffaf0' }, hero: 'is-rosette', heroColors: ['#b8862b'] }),
      { native: ar('المولد النبوي الشريف', ['Amiri', 700], '#1f6f6a'), title: 'Mawlid Mubarak', sub: 'Celebrating with salawat, poetry and gratitude', cta: '12 Rabi al-Awwal' }),
    spec('mawlid-gathering-flyer', 'Mawlid Gathering Flyer', 'flyer', 'flyer', 'arch', 'Elegant', ['ivory', 'gold', 'green'], 'event', ['mawlid', 'milad', 'nasheed', 'gathering', 'mosque', 'evening'],
      L({ scene: 'is-bg-royal', pal: ON_IVORY_PANEL, hero: 'is-lanterns', corner: 'is-rosette', cornerColors: ['#b8862b'] }),
      { eyebrow: 'Join us for a', title: 'Mawlid Evening', sub: 'Nasheeds, a short talk and dinner for the whole family', details: ['Thursday, September 3 · 7 PM', 'Masjid Al-Huda Main Hall'], cta: 'Sisters’ and brothers’ seating' }),
  ] },
  { sub: 'mosque-events', label: 'Mosque events', specs: [
    spec('quran-class-flyer', 'Qur’an Class Flyer', 'flyer', 'flyer', 'framed', 'Modern', ['ivory', 'green'], 'education', ['quran class', 'islamic school', 'madrasa', 'kids', 'weekend school', 'tajweed'],
      L({ scene: 'is-bg-cream', pal: IVORY, hero: 'is-rehal', corner: 'is-rosette', cornerColors: ['#b8862b'], title: ['Montserrat', 800] }),
      { eyebrow: 'Enrolment open', title: 'Weekend Qur’an Classes', sub: 'Reading, tajweed and memorisation for ages 6–14', details: ['Saturdays & Sundays · 10 AM – 12 PM', 'Al-Noor Community Mosque'], cta: 'Register at the office' }),
    spec('mosque-open-day-poster', 'Mosque Open Day', 'poster', 'poster', 'poster', 'Modern', ['blue', 'gold'], 'community', ['open day', 'visit my mosque', 'interfaith', 'community', 'tour', 'mosque'],
      L({ scene: 'is-bg-royal', pal: { ...ROYAL, panelInk: '#14244d', panelMuted: '#4a5a7a', panel: 'rgba(255,255,255,0.92)' }, hero: 'is-mosque', heroColors: ['#e8c46a', '#fff3c4'], title: ['Montserrat', 900] }),
      { eyebrow: 'Everyone welcome', title: 'Mosque Open Day', sub: 'Tours, tea and conversation with our community', details: ['Saturday, October 10 · 11 AM – 4 PM', 'Guided tours every hour', '15 Hill Road'], cta: 'Free · bring a friend' }),
    spec('jumuah-reminder-post', 'Jumu’ah Reminder', 'post', 'social', 'minimal', 'Minimalist', ['ivory', 'green'], 'reminder', ['jumuah', 'jummah', 'friday prayer', 'khutbah', 'reminder', 'minimal'],
      L({ scene: 'is-bg-cream', pal: IVORY, hero: 'is-mosque', heroColors: ['#1f6f6a', '#e8c46a'], title: ['Cormorant Garamond', 700] }),
      { eyebrow: 'Friday reminder', native: ar('جمعة مباركة', ['Aref Ruqaa', 700], '#1f6f6a'), title: 'Jumu’ah Mubarak', details: ['Khutbah 1:15 PM · Prayer 1:45 PM'] }),
  ] },
  { sub: 'islamic-charity', label: 'Charity & Zakat', specs: [
    spec('zakat-al-fitr-reminder', 'Zakat al-Fitr Reminder', 'post', 'social', 'medallion', 'Modern', ['emerald', 'gold'], 'charity', ['zakat al fitr', 'fitrana', 'zakat', 'charity', 'ramadan', 'reminder'],
      L({ scene: 'is-bg-emerald', pal: { ...EMERALD, panelTitle: '#0e3b36', panelInk: '#2e3a36', panelMuted: '#5f6f68', panel: '#fffaf0' }, hero: 'is-charity' }),
      { native: ar('زكاة الفطر', ['Reem Kufi', 700], '#1f6f6a'), title: 'Pay Zakat al-Fitr', sub: 'Due before the Eid prayer · given for every member of the family', cta: '$12 per person' }),
    spec('sadaqah-drive-flyer', 'Sadaqah Food Drive', 'flyer', 'flyer', 'poster', 'Playful', ['green', 'gold'], 'charity', ['sadaqah', 'food drive', 'charity', 'donation', 'volunteer', 'food bank'],
      L({ scene: 'is-bg-cream', pal: { ...IVORY, panel: 'rgba(255,255,255,0.95)' }, hero: 'is-charity', title: ['Montserrat', 900] }),
      { eyebrow: 'Sadaqah', title: 'Community Food Drive', sub: 'Bring non-perishable food for local families', details: ['Drop-off all through Ramadan', 'After Taraweeh · Main entrance'], cta: 'Every gift counts' }),
  ] },
];
