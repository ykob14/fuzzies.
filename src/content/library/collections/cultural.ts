/**
 * Cultural festivals — themed templates (see ./themed). Greetings in their own scripts, checked phrase by phrase:
 * Hindi शुभ दीपावली (auspicious Diwali), दीपावली की शुभकामनाएँ (Diwali wishes), होली की शुभकामनाएँ (Holi wishes),
 * बुरा न मानो होली है (don't mind, it's Holi), शुभ नवरात्रि (auspicious Navratri), गणपति बप्पा मोरया (Ganpati Bappa Morya);
 * Malayalam ഓണാശംസകൾ (Onam wishes); Punjabi ਵਿਸਾਖੀ ਦੀਆਂ ਵਧਾਈਆਂ (Vaisakhi greetings); Chinese 新年快乐 (Happy New Year),
 * 恭喜发财 (wishing you prosperity), 中秋节快乐 (Happy Mid-Autumn Festival), 端午节安康 (wishing you well this Dragon Boat
 * Festival); Persian نوروز مبارک (Happy Nowruz), سال نو مبارک (Happy New Year); Swahili Heri za Kwanzaa (Happy Kwanzaa),
 * Habari gani (what's the news — the Kwanzaa greeting); Spanish Día de los Muertos. Each festival keeps its own symbols.
 */
import { spec, type Look, type Native, type Script, type ThemedSet } from './themed';

const n = (text: string, script: Script, font: [string, number], color?: string): Native => ({ text, script, font, color });
const DIWALI_NIGHT = { title: '#ffffff', ink: '#ffe9d0', muted: '#f6cfa8', accent: '#ffb238', onAccent: '#3a1030', glow: '#ff9a3a', panel: '#fdf6ea' };
const MAROON = { title: '#7a1a2e', ink: '#4a2a20', muted: '#8a5a40', accent: '#c9932e', onAccent: '#ffffff', panel: '#fdf6ea' };
const SAFFRON = { title: '#7a1a2e', ink: '#4a2a20', muted: '#7a4a30', accent: '#c4402d', onAccent: '#ffffff', panel: 'rgba(255,250,240,0.92)' };
const HOLI = { title: '#c2185b', ink: '#3a2a40', muted: '#6a5a70', accent: '#7b1fa2', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.92)' };
const LUCKY = { title: '#ffe9a8', ink: '#fff1d6', muted: '#ffd9a8', accent: '#e8b94a', onAccent: '#8f0f1f', glow: '#ffb238', panel: '#fff8ea' };
const PLUM = { title: '#8f0f1f', ink: '#4a3328', muted: '#7a5a4a', accent: '#c8182e', onAccent: '#ffffff', panel: '#fffaf2' };
const MOON = { title: '#fff1c4', ink: '#e6ebf7', muted: '#c6d0ea', accent: '#f2c14e', onAccent: '#0f1c3d', glow: '#ffe08a', panel: '#fbf6ea' };
const RIVER = { title: '#0f4a5a', ink: '#24404a', muted: '#4a6a72', accent: '#c4402d', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.9)' };
const SPRING = { title: '#2f6a3a', ink: '#33402e', muted: '#5f6f58', accent: '#c8263a', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.92)' };
const PERSIAN = { title: '#ffffff', ink: '#e6f4f2', muted: '#bfe0dc', accent: '#e8c46a', onAccent: '#0f5c63', glow: '#ffe08a', panel: '#fbf8ef' };
const KENTE = { title: '#ffffff', ink: '#f2ece2', muted: '#d8cfc2', accent: '#e8b94a', onAccent: '#14100e', panel: '#fbf6ea' };
const MUERTOS = { title: '#ffffff', ink: '#f6e6f2', muted: '#e0c6dc', accent: '#f6a03a', onAccent: '#1d1430', glow: '#ff9a3a', panel: '#fff6e8' };
const FIESTA = { title: '#8a1f5a', ink: '#3a2a30', muted: '#6a5a60', accent: '#e8574a', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.92)' };
const DAWN = { title: '#7a3a10', ink: '#4a3020', muted: '#7a5a40', accent: '#c4622d', onAccent: '#ffffff', panel: 'rgba(255,250,240,0.9)' };

const L = (o: Partial<Look> & Pick<Look, 'scene' | 'pal' | 'hero'>): Look => ({ title: ['Cinzel', 700], body: ['Montserrat', 600], ...o });

export const CULTURAL: ThemedSet[] = [
  { sub: 'diwali', label: 'Diwali', specs: [
    spec('diwali-night-invitation', 'Diwali Night Invitation', 'card', 'invitation', 'arch', 'Traditional', ['maroon', 'gold', 'cream'], 'party', ['diwali party', 'deepavali', 'invitation', 'hindi', 'diyas', 'marigold', 'rangoli', 'rsvp'],
      L({ scene: 'in-bg-maroon', pal: MAROON, top: 'in-toran', hero: 'in-diyas', corner: 'in-rangoli' }),
      { eyebrow: 'You’re invited to', native: n('शुभ दीपावली', 'hi', ['Yatra One', 400], '#c4622d'), title: 'Diwali Night', sub: 'An evening of lights, music, rangoli and sweets', details: ['Saturday, November 7 · 6:30 PM', 'The Sharma Home · 42 Lotus Ave'], cta: 'RSVP to Priya by Nov 1' }),
    spec('happy-diwali-diyas-post', 'Happy Diwali Diyas', 'post', 'greeting', 'hero', 'Luxury', ['purple', 'gold', 'orange'], 'greeting', ['happy diwali', 'diyas', 'festival of lights', 'hindi', 'greeting', 'lights'],
      L({ scene: 'in-bg-diwali-night', pal: DIWALI_NIGHT, hero: 'in-diyas', title: ['Cinzel', 700] }),
      { native: n('दीपावली की शुभकामनाएँ', 'hi', ['Rozha One', 400]), title: 'Happy Diwali', sub: 'May the festival of lights fill your home with joy' }),
    spec('diwali-rangoli-story', 'Diwali Rangoli Story', 'story', 'social', 'medallion', 'Playful', ['saffron', 'red', 'gold'], 'greeting', ['rangoli', 'diwali', 'story', 'colourful', 'hindi', 'kandil'],
      L({ scene: 'in-bg-saffron', pal: { ...SAFFRON, panel: '#fffaf0' }, top: 'in-kandil', hero: 'in-rangoli', title: ['Cinzel', 700] }),
      { native: n('शुभ दीपावली', 'hi', ['Yatra One', 400], '#c4402d'), title: 'Happy Diwali', sub: 'Light, colour and sweets to everyone we love', cta: 'Happy Deepavali' }),
    spec('diwali-mela-poster', 'Diwali Mela Poster', 'poster', 'poster', 'poster', 'Modern', ['purple', 'gold'], 'festival', ['diwali mela', 'diwali festival', 'community', 'food stalls', 'fireworks', 'dance'],
      L({ scene: 'in-bg-diwali-night', pal: { ...DIWALI_NIGHT, panelInk: '#3a1030', panelMuted: '#6a4060', panel: 'rgba(255,248,236,0.94)' }, top: 'in-lights', hero: 'in-fireworks', corner: 'in-diya', title: ['Montserrat', 900] }),
      { eyebrow: 'Festival of Lights', title: 'Diwali Mela', native: n('शुभ दीपावली', 'hi', ['Yatra One', 400]), details: ['Sunday, November 8 · 4 – 10 PM', 'Food · Dance · Rangoli · Fireworks', 'Civic Centre Plaza'], cta: 'Free entry' }),
  ] },
  { sub: 'holi', label: 'Holi', specs: [
    spec('happy-holi-splash', 'Happy Holi Splash', 'post', 'greeting', 'hero', 'Playful', ['colourful', 'pink', 'yellow'], 'greeting', ['happy holi', 'holi', 'colours', 'hindi', 'gulal', 'spring'],
      L({ scene: 'in-bg-holi', pal: HOLI, hero: 'in-gulal', title: ['Montserrat', 900] }),
      { native: n('होली की शुभकामनाएँ', 'hi', ['Rozha One', 400], '#7b1fa2'), title: 'Happy Holi!', sub: 'Wishing you a life as bright as the colours of Holi' }),
    spec('holi-party-poster', 'Holi Colour Party', 'poster', 'party', 'poster', 'Playful', ['colourful', 'white'], 'party', ['holi party', 'colour run', 'color party', 'dj', 'gulal', 'community'],
      L({ scene: 'in-bg-holi', pal: HOLI, hero: 'in-holi-splash', corner: 'in-pichkari', title: ['Montserrat', 900] }),
      { eyebrow: 'Bura na mano, Holi hai!', title: 'Holi Colour Party', native: n('बुरा न मानो होली है', 'hi', ['Baloo 2', 800], '#c2185b'), details: ['Saturday, March 20 · 12 – 5 PM', 'Colours · DJ · Thandai · Chaat', 'Lakeside Fields'], cta: 'Wear white!' }),
    spec('holi-wishes-story', 'Holi Wishes Story', 'story', 'social', 'minimal', 'Minimalist', ['white', 'pink'], 'greeting', ['holi', 'story', 'minimal', 'colours', 'wishes'],
      L({ scene: 'in-bg-holi', pal: HOLI, hero: 'in-gulal', title: ['Playfair Display', 800] }),
      { eyebrow: 'Happy Holi', native: n('होली की शुभकामनाएँ', 'hi', ['Rozha One', 400], '#c2185b'), title: 'Play, Forgive and Celebrate', cta: 'From our family to yours' }),
  ] },
  { sub: 'navratri', label: 'Navratri & Garba', specs: [
    spec('garba-night-poster', 'Garba Night Poster', 'poster', 'party', 'poster', 'Traditional', ['maroon', 'gold', 'orange'], 'party', ['garba', 'dandiya', 'garba night', 'raas', 'navratri', 'dance', 'chaniya choli'],
      L({ scene: 'in-bg-maroon', pal: { ...MAROON, title: '#ffe9c4', ink: '#fff1dc', muted: '#f2d6b8', panelInk: '#4a2a20', panelMuted: '#6a4a3a', panel: 'rgba(253,246,234,0.95)' }, top: 'in-toran', hero: 'in-dandiya', corner: 'in-garbi', title: ['Cinzel', 700] }),
      { eyebrow: 'Navratri', title: 'Garba & Dandiya Night', native: n('शुभ नवरात्रि', 'hi', ['Yatra One', 400], '#ffcf6a'), details: ['Saturday, October 17 · 7 PM – late', 'Live dhol · Garba · Dandiya Raas', 'Sunrise Banquet Hall'], cta: 'Traditional dress encouraged' }),
    spec('shubh-navratri-post', 'Shubh Navratri', 'post', 'greeting', 'medallion', 'Luxury', ['saffron', 'gold'], 'greeting', ['shubh navratri', 'navratri wishes', 'hindi', 'garbi', 'nine nights'],
      L({ scene: 'in-bg-saffron', pal: { ...SAFFRON, panel: '#fffaf0' }, hero: 'in-garbi' }),
      { native: n('शुभ नवरात्रि', 'hi', ['Yatra One', 400], '#c4402d'), title: 'Happy Navratri', sub: 'Nine nights of devotion, dance and joy', cta: 'Jai Mata Di' }),
  ] },
  { sub: 'ganesh-chaturthi', label: 'Ganesh Chaturthi', specs: [
    spec('ganesh-chaturthi-wishes', 'Ganesh Chaturthi Wishes', 'post', 'greeting', 'hero', 'Traditional', ['saffron', 'red'], 'greeting', ['ganesh chaturthi', 'ganeshotsav', 'vinayaka chaturthi', 'modak', 'hindi', 'marathi'],
      L({ scene: 'in-bg-saffron', pal: SAFFRON, top: 'in-toran', hero: 'in-modak' }),
      { native: n('गणपति बप्पा मोरया', 'hi', ['Yatra One', 400], '#c4402d'), title: 'Happy Ganesh Chaturthi', sub: 'Wishing you wisdom, prosperity and new beginnings' }),
    spec('ganeshotsav-aarti-flyer', 'Ganeshotsav Aarti Flyer', 'flyer', 'flyer', 'arch', 'Elegant', ['maroon', 'gold'], 'event', ['ganeshotsav', 'aarti', 'pooja', 'community', 'prasad', 'modak'],
      L({ scene: 'in-bg-maroon', pal: MAROON, top: 'in-toran', hero: 'in-modak', corner: 'in-diya' }),
      { eyebrow: 'Ganeshotsav', title: 'Evening Aarti & Prasad', details: ['Daily at 7 PM for ten days', 'Shree Community Hall'], cta: 'All devotees welcome' }),
  ] },
  { sub: 'onam', label: 'Onam', specs: [
    spec('happy-onam-pookalam', 'Happy Onam Pookalam', 'post', 'greeting', 'medallion', 'Traditional', ['gold', 'green', 'cream'], 'greeting', ['onam', 'happy onam', 'pookalam', 'malayalam', 'kerala', 'harvest'],
      L({ scene: 'in-bg-cream', pal: { ...DAWN, title: '#2f5a2a', panel: '#ffffff' }, hero: 'in-pookalam', title: ['Cinzel', 700] }),
      { native: n('ഓണാശംസകൾ', 'ml', ['Manjari', 700], '#c4622d'), title: 'Happy Onam', sub: 'Wishing you a harvest of happiness', cta: 'Onam wishes' }),
    spec('onam-sadya-invitation', 'Onam Sadya Invitation', 'card', 'invitation', 'framed', 'Elegant', ['cream', 'gold', 'green'], 'dinner', ['onam sadya', 'feast', 'banana leaf', 'invitation', 'kerala', 'community'],
      L({ scene: 'in-bg-cream', pal: { ...DAWN, title: '#2f5a2a' }, hero: 'in-pookalam', corner: 'in-diya' }),
      { eyebrow: 'Join us for', native: n('ഓണാശംസകൾ', 'ml', ['Manjari', 700], '#c4622d'), title: 'Onam Sadya', details: ['Thiruvonam Sunday · 12 PM', 'Kerala Samajam Hall'], cta: 'Wear your kasavu!' }),
  ] },
  { sub: 'vaisakhi', label: 'Vaisakhi', specs: [
    spec('vaisakhi-greetings', 'Vaisakhi Greetings', 'post', 'greeting', 'hero', 'Playful', ['saffron', 'gold'], 'greeting', ['vaisakhi', 'baisakhi', 'punjabi', 'harvest', 'bhangra', 'dhol'],
      L({ scene: 'in-bg-saffron', pal: SAFFRON, hero: 'in-dhol', title: ['Montserrat', 900] }),
      { native: n('ਵਿਸਾਖੀ ਦੀਆਂ ਵਧਾਈਆਂ', 'pa', ['Baloo Paaji 2', 800], '#c4402d'), title: 'Happy Vaisakhi', sub: 'Celebrating the harvest with music, dance and gratitude' }),
    spec('vaisakhi-mela-flyer', 'Vaisakhi Mela Flyer', 'flyer', 'flyer', 'poster', 'Playful', ['saffron', 'green'], 'festival', ['vaisakhi mela', 'bhangra', 'community', 'food', 'harvest festival', 'punjabi'],
      L({ scene: 'in-bg-saffron', pal: SAFFRON, top: 'in-toran', hero: 'in-dhol', corner: 'jh-wheat', title: ['Montserrat', 900] }),
      { eyebrow: 'April 14', title: 'Vaisakhi Mela', details: ['Bhangra · Giddha · Langar · Stalls', '11 AM – 6 PM · Town Green'], cta: 'Everyone welcome' }),
  ] },
  { sub: 'vesak', label: 'Vesak', specs: [
    spec('happy-vesak-lotus', 'Happy Vesak Lotus', 'post', 'greeting', 'medallion', 'Elegant', ['saffron', 'gold', 'pink'], 'greeting', ['vesak', 'wesak', 'buddha day', 'buddha purnima', 'lotus', 'peace'],
      L({ scene: 'as-bg-saffron', pal: { ...DAWN, panel: '#fffaf0' }, hero: 'in-lotus', title: ['Cormorant Garamond', 700] }),
      { title: 'Happy Vesak', sub: 'May peace, compassion and wisdom be with you', cta: 'Buddha Day' }),
    spec('vesak-lantern-evening', 'Vesak Lantern Evening', 'flyer', 'flyer', 'framed', 'Traditional', ['saffron', 'gold'], 'event', ['vesak', 'lantern', 'dana', 'temple', 'meditation', 'community'],
      L({ scene: 'as-bg-saffron', pal: DAWN, top: 'as-paper-lanterns', hero: 'as-vesak-lantern', corner: 'as-bodhi-leaf', title: ['Cormorant Garamond', 700] }),
      { eyebrow: 'Vesak', title: 'Lantern Evening & Meditation', details: ['Full-moon evening · 6 PM', 'Dhamma Vihara Temple'], cta: 'Dana (food offering) welcome' }),
  ] },
  { sub: 'lunar-new-year', label: 'Lunar New Year', specs: [
    spec('lunar-new-year-lanterns', 'Lunar New Year Lanterns', 'post', 'greeting', 'hero', 'Traditional', ['red', 'gold'], 'greeting', ['lunar new year', 'chinese new year', 'spring festival', 'lanterns', 'chinese', 'xin nian kuai le'],
      L({ scene: 'as-bg-red', pal: LUCKY, top: 'as-lanterns', hero: 'as-ingot', title: ['Cinzel', 700] }),
      { native: n('新年快乐', 'zh', ['Ma Shan Zheng', 400]), title: 'Happy Lunar New Year', sub: 'Wishing you health, luck and prosperity' }),
    spec('gong-xi-fa-cai-card', 'Gong Xi Fa Cai Card', 'card', 'greeting', 'framed', 'Elegant', ['cream', 'red', 'gold'], 'greeting', ['gong xi fa cai', 'kung hei fat choi', 'prosperity', 'plum blossom', 'chinese', 'red envelope'],
      L({ scene: 'as-bg-cream', pal: PLUM, hero: 'as-envelopes', title: ['Cormorant Garamond', 700] }),
      { native: n('恭喜发财', 'zh', ['Noto Serif SC', 900], '#c8182e'), title: 'Gong Xi Fa Cai', sub: 'May the new year bring you prosperity and joy', details: ['From the Chen family'] }),
    spec('spring-festival-dinner-poster', 'Spring Festival Dinner', 'poster', 'party', 'poster', 'Luxury', ['red', 'gold'], 'dinner', ['reunion dinner', 'spring festival', 'lunar new year party', 'community', 'dumplings', 'lion dance'],
      L({ scene: 'as-bg-red', pal: { ...LUCKY, panelInk: '#5a0f1a', panelMuted: '#7a3a2a', panel: 'rgba(255,248,234,0.95)' }, top: 'as-lanterns', hero: 'as-mandarins', corner: 'as-firecrackers', title: ['Cinzel', 700] }),
      { eyebrow: 'Lunar New Year', title: 'Spring Festival Dinner', native: n('新年快乐', 'zh', ['Ma Shan Zheng', 400]), details: ['Saturday, February 6 · 6 PM', 'Lion dance · Dumplings · Red envelopes', 'Golden Dragon Restaurant'], cta: 'Book by January 30' }),
  ] },
  { sub: 'mid-autumn', label: 'Mid-Autumn Festival', specs: [
    spec('mid-autumn-moon-rabbit', 'Mid-Autumn Moon Rabbit', 'post', 'greeting', 'hero', 'Elegant', ['navy', 'gold'], 'greeting', ['mid-autumn festival', 'moon festival', 'mooncake', 'chinese', 'full moon', 'rabbit'],
      L({ scene: 'as-bg-moon-night', pal: MOON, hero: 'as-moon-rabbit', title: ['Cormorant Garamond', 700] }),
      { native: n('中秋节快乐', 'zh', ['Ma Shan Zheng', 400], '#f2c14e'), title: 'Happy Mid-Autumn Festival', sub: 'Under one moon, wishing you a happy reunion' }),
    spec('mooncake-party-flyer', 'Mooncake & Lantern Party', 'flyer', 'party', 'poster', 'Playful', ['navy', 'gold', 'red'], 'party', ['mooncake', 'lantern party', 'mid-autumn', 'kids', 'tea', 'community'],
      L({ scene: 'as-bg-moon-night', pal: { ...MOON, panelInk: '#0f1c3d', panelMuted: '#4a5a7a', panel: 'rgba(251,246,234,0.95)' }, top: 'as-paper-lanterns', hero: 'as-mooncakes', corner: 'as-rabbit', title: ['Montserrat', 900] }),
      { eyebrow: 'Mid-Autumn Festival', title: 'Lantern & Mooncake Night', details: ['Full-moon evening · 7 PM', 'Lantern walk · Tea · Mooncakes', 'Harbour Park'], cta: 'Bring a lantern!' }),
    spec('mid-autumn-tea-card', 'Mid-Autumn Tea Card', 'card', 'greeting', 'minimal', 'Minimalist', ['cream', 'teal'], 'greeting', ['mid-autumn', 'tea', 'osmanthus', 'minimal', 'family'],
      L({ scene: 'as-bg-cream', pal: PLUM, hero: 'as-tea', corner: 'as-osmanthus', title: ['Cormorant Garamond', 700] }),
      { eyebrow: 'Mid-Autumn', native: n('中秋节快乐', 'zh', ['Noto Serif SC', 700], '#8f0f1f'), title: 'Together Under the Full Moon', cta: 'Happy reunion' }),
  ] },
  { sub: 'dragon-boat', label: 'Dragon Boat Festival', specs: [
    spec('dragon-boat-race-poster', 'Dragon Boat Race Poster', 'poster', 'poster', 'poster', 'Modern', ['blue', 'red'], 'sports', ['dragon boat race', 'duanwu', 'paddling', 'regatta', 'team', 'festival'],
      L({ scene: 'as-bg-river', pal: RIVER, hero: 'as-dragon-boat', corner: 'as-zongzi', title: ['Montserrat', 900] }),
      { eyebrow: 'Dragon Boat Festival', title: 'Dragon Boat Races', native: n('端午节安康', 'zh', ['Ma Shan Zheng', 400], '#c4402d'), details: ['Races from 9 AM · Finals at 3 PM', 'Zongzi stalls · Drums · Family zone', 'Riverside Pier'], cta: 'Free to watch' }),
    spec('duanwu-zongzi-post', 'Duanwu Zongzi', 'post', 'greeting', 'hero', 'Playful', ['blue', 'green'], 'greeting', ['duanwu', 'zongzi', 'dragon boat festival', 'chinese', 'rice dumplings'],
      L({ scene: 'as-bg-river', pal: RIVER, hero: 'as-zongzi', title: ['Cormorant Garamond', 700] }),
      { native: n('端午节安康', 'zh', ['Ma Shan Zheng', 400], '#c4402d'), title: 'Happy Dragon Boat Festival', sub: 'Zongzi, races and good health to you' }),
  ] },
  { sub: 'nowruz', label: 'Nowruz', specs: [
    spec('nowruz-mubarak-haft-sin', 'Nowruz Mubarak Haft-Sin', 'post', 'greeting', 'hero', 'Traditional', ['green', 'cream'], 'greeting', ['nowruz mubarak', 'persian new year', 'haft sin', 'farsi', 'persian', 'spring'],
      L({ scene: 'wd-bg-spring', pal: SPRING, hero: 'wd-haft-sin', title: ['Cormorant Garamond', 700] }),
      { native: n('نوروز مبارک', 'fa', ['Vazirmatn', 800], '#2f6a3a'), title: 'Happy Nowruz', sub: 'Wishing you a fresh start, good health and a joyful spring' }),
    spec('nowruz-celebration-invite', 'Nowruz Celebration Invitation', 'card', 'invitation', 'arch', 'Luxury', ['turquoise', 'gold', 'cream'], 'party', ['nowruz party', 'norooz', 'persian new year', 'invitation', 'sabzeh', 'rsvp'],
      L({ scene: 'wd-bg-persian', pal: { ...SPRING, title: '#0f5c63', accent: '#b8862b', panel: '#fbf8ef' }, hero: 'wd-sabzeh', corner: 'wd-hyacinth', title: ['Cinzel', 700] }),
      { eyebrow: 'Celebrate the new year with us', native: n('سال نو مبارک', 'fa', ['Vazirmatn', 800], '#0f5c63'), title: 'Nowruz Gathering', details: ['Saturday, March 20 · 6 PM', 'Persian Cultural Centre'], cta: 'Music · dinner · dancing' }),
    spec('nowruz-spring-story', 'Nowruz Spring Story', 'story', 'social', 'medallion', 'Elegant', ['green', 'pink'], 'greeting', ['nowruz', 'hyacinth', 'sonbol', 'spring', 'story', 'persian'],
      L({ scene: 'wd-bg-spring', pal: { ...SPRING, panel: '#ffffff' }, hero: 'wd-hyacinth', corner: 'wd-eggs' }),
      { native: n('نوروز مبارک', 'fa', ['Vazirmatn', 800], '#2f6a3a'), title: 'Happy Nowruz', sub: 'May your year bloom like spring', cta: 'Eid-e shoma mobarak' }),
    spec('nowruz-banner-turquoise', 'Nowruz Turquoise Banner', 'landscape', 'social', 'split', 'Luxury', ['turquoise', 'gold'], 'greeting', ['nowruz', 'banner', 'header', 'persian', 'tile', 'goldfish'],
      L({ scene: 'wd-bg-persian', pal: PERSIAN, hero: 'wd-haft-sin', title: ['Cinzel', 700] }),
      { native: n('نوروز مبارک', 'fa', ['Vazirmatn', 800]), title: 'Happy Nowruz', sub: 'Wishing you a year as fresh as spring', cta: 'Saal-e no mobarak' }),
  ] },
  { sub: 'kwanzaa', label: 'Kwanzaa', specs: [
    spec('heri-za-kwanzaa', 'Heri za Kwanzaa', 'post', 'greeting', 'hero', 'Traditional', ['black', 'red', 'green', 'gold'], 'greeting', ['happy kwanzaa', 'heri za kwanzaa', 'kinara', 'swahili', 'seven principles'],
      L({ scene: 'wd-bg-kente', pal: KENTE, hero: 'wd-kinara', title: ['Cinzel', 700] }),
      { native: n('Heri za Kwanzaa', 'latin', ['Berkshire Swash', 400], '#e8b94a'), title: 'Happy Kwanzaa', sub: 'Celebrating family, community and culture · December 26 – January 1' }),
    spec('kwanzaa-karamu-invitation', 'Kwanzaa Karamu Invitation', 'card', 'invitation', 'framed', 'Luxury', ['black', 'gold'], 'party', ['karamu', 'kwanzaa feast', 'invitation', 'unity cup', 'family', 'rsvp'],
      L({ scene: 'wd-bg-kente', pal: KENTE, hero: 'wd-kwanzaa-table', title: ['Cinzel', 700] }),
      { eyebrow: 'Join us for the', title: 'Kwanzaa Karamu', sub: 'A feast of food, music and reflection on the sixth night', details: ['Thursday, December 31 · 6 PM', 'The Johnson Home'], cta: 'Habari gani? Kuumba!' }),
    spec('kwanzaa-principles-story', 'Seven Principles Story', 'story', 'social', 'minimal', 'Modern', ['black', 'gold'], 'education', ['nguzo saba', 'seven principles', 'umoja', 'kujichagulia', 'ujima', 'ujamaa', 'nia', 'kuumba', 'imani'],
      L({ scene: 'wd-bg-kente', pal: KENTE, hero: 'wd-kinara', title: ['Montserrat', 800] }),
      { eyebrow: 'Nguzo Saba', title: 'The Seven Principles', sub: 'Umoja · Kujichagulia · Ujima · Ujamaa · Nia · Kuumba · Imani', cta: 'Habari gani?' }),
  ] },
  { sub: 'dia-de-los-muertos', label: 'Día de los Muertos', specs: [
    spec('dia-de-los-muertos-calavera', 'Día de los Muertos Calavera', 'post', 'greeting', 'hero', 'Playful', ['purple', 'orange'], 'greeting', ['dia de los muertos', 'day of the dead', 'calavera', 'sugar skull', 'marigolds', 'spanish'],
      L({ scene: 'wd-bg-muertos', pal: MUERTOS, top: 'wd-papel-picado', hero: 'wd-calavera', title: ['Berkshire Swash', 400] }),
      { native: n('Día de los Muertos', 'latin', ['Pacifico', 400], '#f6a03a'), title: 'Day of the Dead', sub: 'Remembering with love, colour and marigolds' }),
    spec('ofrenda-gathering-flyer', 'Ofrenda Gathering Flyer', 'flyer', 'flyer', 'poster', 'Traditional', ['cream', 'orange', 'pink'], 'community', ['ofrenda', 'altar', 'community', 'remembrance', 'pan de muerto', 'marigolds'],
      L({ scene: 'wd-bg-fiesta', pal: FIESTA, hero: 'wd-marigolds', corner: 'wd-candles', title: ['Berkshire Swash', 400] }),
      { eyebrow: '1 y 2 de noviembre', title: 'Community Ofrenda', sub: 'Bring a photo or a memory to share on our altar', details: ['November 1 – 2 · 4 – 9 PM', 'Pan de muerto & hot chocolate', 'Plaza Cultural'], cta: 'Todos bienvenidos' }),
    spec('remembering-you-card', 'Remembering You Card', 'card', 'greeting', 'framed', 'Elegant', ['purple', 'orange'], 'remembrance', ['dia de muertos', 'remembrance', 'in memory', 'candles', 'marigolds', 'card'],
      L({ scene: 'wd-bg-muertos', pal: { ...MUERTOS, ink: '#ffe6c8' }, hero: 'wd-candles', corner: 'wd-marigolds', title: ['Cormorant Garamond', 700] }),
      { native: n('Día de los Muertos', 'latin', ['Pacifico', 400], '#f6a03a'), title: 'Always in Our Hearts', sub: 'Lighting a candle for those we love and remember' }),
  ] },
];
