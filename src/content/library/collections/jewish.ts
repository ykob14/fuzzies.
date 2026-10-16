/**
 * Jewish holidays (beyond the Hanukkah and Passover collections) — themed templates (see ./themed). Hebrew, checked
 * phrase by phrase: שנה טובה ומתוקה (a good and sweet year), שנה טובה (a good year), לשנה טובה תכתבו (may you be
 * inscribed for a good year), גמר חתימה טובה (may you be sealed for good), צום קל (an easy fast), חג סוכות שמח (happy
 * Sukkot), שמחת תורה (Simchat Torah), חג שמח (happy holiday), פורים שמח (happy Purim), חג שבועות שמח (happy Shavuot),
 * ט״ו בשבט שמח (happy Tu BiShvat), ל״ג בעומר שמח (happy Lag BaOmer). Hebrew lines carry no Latin punctuation (the
 * gershayim ״ is Hebrew) so they lay out right-to-left cleanly. Each holiday keeps its own symbols.
 */
import { spec, type Look, type Native, type ThemedSet } from './themed';

const he = (text: string, font: [string, number] = ['Frank Ruhl Libre', 700], color?: string): Native => ({ text, font, script: 'he', color });
const PARCHMENT = { title: '#7a1426', ink: '#4a3a30', muted: '#7a6658', accent: '#b3243b', onAccent: '#ffffff' };
const HONEY = { title: '#6a2a10', ink: '#4a3020', muted: '#7a5a40', accent: '#b3243b', onAccent: '#ffffff', panel: 'rgba(255,250,236,0.92)' };
const POMEGRANATE = { title: '#ffffff', ink: '#f6e6d6', muted: '#f0cfc0', accent: '#e8c46a', onAccent: '#5a0f1e', glow: '#ffb46a', panel: '#fbf3e6' };
const TWILIGHT = { title: '#ffffff', ink: '#e6e8f7', muted: '#c6cbea', accent: '#f2c25a', onAccent: '#141a3a', glow: '#ffd27a', panel: '#fbf8f0' };
const WHITE_BLUE = { title: '#1f3a6a', ink: '#2a3550', muted: '#5a6680', accent: '#2f5fa8', onAccent: '#ffffff', panel: '#ffffff' };
const ORCHARD = { title: '#2f5a2a', ink: '#33402e', muted: '#5f6f58', accent: '#b3243b', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.9)' };
const PURIM = { title: '#5a1f6a', ink: '#3a2a40', muted: '#6a5a70', accent: '#d8433a', onAccent: '#ffffff', panel: 'rgba(255,255,255,0.92)' };

const L = (o: Partial<Look> & Pick<Look, 'scene' | 'pal' | 'hero'>): Look => ({ title: ['Cormorant Garamond', 700], body: ['Montserrat', 600], ...o });

export const JEWISH: ThemedSet[] = [
  { sub: 'rosh-hashanah', label: 'Rosh Hashanah', specs: [
    spec('shana-tova-umetuka', 'Shana Tova Umetuka', 'card', 'greeting', 'framed', 'Elegant', ['cream', 'red', 'gold'], 'greeting', ['shana tova', 'shanah tovah', 'sweet new year', 'hebrew', 'apples and honey', 'greeting card'],
      L({ scene: 'jh-bg-parchment', pal: PARCHMENT, title: ['Parisienne', 400], hero: 'jh-apple-honey', corner: 'jh-bee' }),
      { native: he('שנה טובה ומתוקה'), title: 'Shana Tova', sub: 'Wishing you a good and sweet New Year', details: ['With love, the Cohen family'] }),
    spec('rosh-hashanah-honey-post', 'Sweet New Year Honey', 'post', 'social', 'editorial', 'Playful', ['gold', 'honey', 'red'], 'greeting', ['rosh hashanah', 'honey', 'bees', 'sweet', 'social', 'hebrew'],
      L({ scene: 'jh-bg-honey', pal: HONEY, hero: 'jh-honey', corner: 'jh-bee', title: ['Playfair Display', 800] }),
      { native: he('שנה טובה', ['Suez One', 400]), title: 'Have a Sweet New Year', sub: 'Dip, taste and smile — L’Shana Tova' }),
    spec('rosh-hashanah-dinner-invitation', 'Rosh Hashanah Dinner Invitation', 'card', 'invitation', 'arch', 'Luxury', ['burgundy', 'gold', 'cream'], 'dinner', ['rosh hashanah dinner', 'holiday meal', 'invitation', 'pomegranate', 'round challah', 'rsvp'],
      L({ scene: 'jh-bg-pomegranate', pal: { ...PARCHMENT, panel: '#fbf3e6' }, hero: 'jh-pomegranates', corner: 'jh-challah', title: ['Cinzel', 700] }),
      { eyebrow: 'Please join us for', native: he('לשנה טובה תכתבו', ['Frank Ruhl Libre', 700], '#b3243b'), title: 'Rosh Hashanah Dinner', details: ['Friday, September 11 · 7 PM', 'The Levy home · 8 Olive Street'], cta: 'RSVP to Dana by Sept 5' }),
    spec('rosh-hashanah-shofar-story', 'Shofar Story', 'story', 'social', 'panel', 'Traditional', ['red', 'gold'], 'greeting', ['shofar', 'tekiah', 'rosh hashanah', 'story', 'hebrew'],
      L({ scene: 'jh-bg-pomegranate', pal: POMEGRANATE, hero: 'jh-shofar', top: 'jh-sparkles', title: ['Cinzel', 700] }),
      { native: he('שנה טובה'), title: 'Hear the Shofar', sub: 'A good and sweet year to you and yours' }),
  ] },
  { sub: 'yom-kippur', label: 'Yom Kippur', specs: [
    spec('gmar-chatima-tova', 'Gmar Chatima Tova', 'post', 'greeting', 'type', 'Minimalist', ['white', 'blue'], 'greeting', ['yom kippur', 'gmar chatima tova', 'gmar hatima tova', 'hebrew', 'minimal', 'book of life'],
      L({ scene: 'jh-bg-parchment', pal: WHITE_BLUE, hero: 'jh-book', heroColors: ['#f5ead2', '#2f5fa8', '#d4a940'] }),
      { native: he('גמר חתימה טובה', ['Frank Ruhl Libre', 700], '#2f5fa8'), title: 'May You Be Sealed for Good', cta: 'Gmar chatima tova' }),
    spec('yom-kippur-easy-fast-story', 'Easy Fast Story', 'story', 'social', 'band', 'Elegant', ['blue', 'white', 'gold'], 'greeting', ['yom kippur', 'easy fast', 'tzom kal', 'hebrew', 'candles', 'story'],
      L({ scene: 'jh-bg-twilight', pal: { ...TWILIGHT, panelTitle: '#1f3a6a', panelInk: '#2a3550', panelMuted: '#5a6680', panel: '#fbf8f0' }, hero: 'jh-candles' }),
      { native: he('צום קל', ['Frank Ruhl Libre', 700], '#2f5fa8'), title: 'Wishing You an Easy Fast', sub: 'May the year ahead be written with peace and health', cta: 'Gmar chatima tova' }),
    spec('break-fast-invitation', 'Yom Kippur Break-Fast', 'card', 'invitation', 'framed', 'Modern', ['white', 'blue'], 'dinner', ['break fast', 'break the fast', 'yom kippur', 'invitation', 'bagels', 'rsvp'],
      L({ scene: 'jh-bg-parchment', pal: WHITE_BLUE, hero: 'jh-dove', corner: 'jh-sparkles', title: ['Cormorant Garamond', 700] }),
      { eyebrow: 'Join us to', title: 'Break the Fast', sub: 'Bagels, kugel and good company after Neilah', details: ['Monday, September 21 · 7:30 PM', 'Beth Shalom Social Hall'], cta: 'Bring a friend' }),
  ] },
  { sub: 'sukkot', label: 'Sukkot', specs: [
    spec('chag-sukkot-sameach', 'Chag Sukkot Sameach', 'post', 'greeting', 'hero', 'Traditional', ['green', 'gold'], 'greeting', ['sukkot', 'succot', 'chag sameach', 'sukkah', 'hebrew', 'harvest'],
      L({ scene: 'jh-bg-orchard', pal: ORCHARD, hero: 'jh-sukkah', title: ['Cormorant Garamond', 700] }),
      { native: he('חג סוכות שמח', ['Frank Ruhl Libre', 700], '#2f5a2a'), title: 'Happy Sukkot', sub: 'Gather in the sukkah and celebrate the harvest' }),
    spec('sukkah-party-flyer', 'Sukkah Party Flyer', 'flyer', 'party', 'poster', 'Playful', ['green', 'red', 'cream'], 'party', ['sukkah party', 'sukkah hop', 'kids', 'lulav', 'etrog', 'community'],
      L({ scene: 'jh-bg-orchard', pal: ORCHARD, hero: 'jh-sukkah', corner: 'jh-four-species', title: ['Montserrat', 900] }),
      { eyebrow: 'Sukkot', title: 'Sukkah Party', sub: 'Pizza in the sukkah, crafts and shaking the lulav', details: ['Sunday, September 27 · 4 PM', 'Temple courtyard'], cta: 'Families welcome' }),
    spec('four-species-story', 'Lulav & Etrog Story', 'story', 'social', 'editorial', 'Elegant', ['gold', 'green'], 'greeting', ['lulav', 'etrog', 'four species', 'arba minim', 'sukkot', 'story'],
      L({ scene: 'jh-bg-twilight', pal: { ...TWILIGHT, panelTitle: '#2f5a2a', panelInk: '#33402e', panelMuted: '#5f6f58', panel: '#fbf8f0' }, hero: 'jh-four-species' }),
      { native: he('חג שמח', ['Frank Ruhl Libre', 700], '#2f5a2a'), title: 'Chag Sukkot Sameach', sub: 'Wishing you a joyful festival of booths', cta: 'Happy Sukkot' }),
  ] },
  { sub: 'simchat-torah', label: 'Simchat Torah', specs: [
    spec('simchat-torah-celebration', 'Simchat Torah Celebration', 'post', 'party', 'panel', 'Playful', ['blue', 'gold'], 'party', ['simchat torah', 'hakafot', 'dancing', 'torah', 'hebrew', 'flags'],
      L({ scene: 'jh-bg-twilight', pal: { ...TWILIGHT, panelTitle: '#1f3a6a', panelInk: '#2a3550', panelMuted: '#5a6680', panel: '#fbf8f0' }, hero: 'jh-torah' }),
      { native: he('שמחת תורה', ['Suez One', 400], '#2f5fa8'), title: 'Dance with the Torah', sub: 'Hakafot, flags and treats for every child', cta: 'Saturday night, October 3' }),
    spec('simchat-torah-flyer', 'Simchat Torah Flyer', 'flyer', 'flyer', 'framed', 'Traditional', ['cream', 'blue', 'gold'], 'event', ['simchat torah', 'synagogue', 'hakafot', 'kiddush', 'community'],
      L({ scene: 'jh-bg-parchment', pal: WHITE_BLUE, hero: 'jh-torah', corner: 'jh-star', cornerColors: ['#2f5fa8', '#e8c46a'], title: ['Cinzel', 700] }),
      { eyebrow: 'Come rejoice', native: he('חג שמח', ['Frank Ruhl Libre', 700], '#2f5fa8'), title: 'Simchat Torah', details: ['Hakafot 7 PM · Kiddush to follow', 'Congregation Beth Israel'], cta: 'Bring your dancing shoes' }),
  ] },
  { sub: 'purim', label: 'Purim', specs: [
    spec('purim-sameach', 'Purim Sameach', 'post', 'greeting', 'hero', 'Playful', ['purple', 'gold'], 'greeting', ['purim', 'purim sameach', 'happy purim', 'mask', 'hebrew', 'costume'],
      L({ scene: 'jh-bg-twilight', pal: TWILIGHT, hero: 'jh-mask', top: 'jh-sparkles', title: ['Fredoka', 700] }),
      { native: he('פורים שמח', ['Suez One', 400]), title: 'Happy Purim!', sub: 'Masks on, groggers ready — let’s celebrate' }),
    spec('purim-carnival-poster', 'Purim Carnival Poster', 'poster', 'party', 'poster', 'Playful', ['purple', 'red', 'gold'], 'party', ['purim carnival', 'costume party', 'kids', 'games', 'hamantaschen', 'megillah'],
      L({ scene: 'jh-bg-honey', pal: PURIM, hero: 'jh-grogger', top: 'jh-sparkles', corner: 'jh-crown', title: ['Montserrat', 900] }),
      { eyebrow: 'Purim', title: 'Purim Carnival', native: he('פורים שמח', ['Suez One', 400], '#5a1f6a'), details: ['Sunday, March 21 · 11 AM – 3 PM', 'Costume parade · Games · Prizes', 'JCC Gym'], cta: 'Come in costume!' }),
    spec('mishloach-manot-card', 'Mishloach Manot Tag', 'card', 'greeting', 'panel', 'Elegant', ['cream', 'purple', 'gold'], 'greeting', ['mishloach manot', 'shalach manos', 'purim basket', 'hamantaschen', 'gift tag', 'hebrew'],
      L({ scene: 'jh-bg-parchment', pal: PURIM, hero: 'jh-hamantaschen', corner: 'jh-crown', title: ['Cormorant Garamond', 700] }),
      { native: he('פורים שמח', ['Frank Ruhl Libre', 700], '#5a1f6a'), title: 'A Sweet Purim to You', sub: 'Mishloach manot with love', details: ['From the Goldberg family'] }),
  ] },
  { sub: 'shavuot', label: 'Shavuot', specs: [
    spec('chag-shavuot-sameach', 'Chag Shavuot Sameach', 'post', 'greeting', 'editorial', 'Traditional', ['green', 'gold', 'cream'], 'greeting', ['shavuot', 'chag sameach', 'wheat', 'torah', 'hebrew', 'first fruits'],
      L({ scene: 'jh-bg-orchard', pal: ORCHARD, hero: 'jh-wheat', title: ['Cormorant Garamond', 700] }),
      { native: he('חג שבועות שמח', ['Frank Ruhl Libre', 700], '#2f5a2a'), title: 'Happy Shavuot', sub: 'Celebrating the giving of the Torah and the first harvest' }),
    spec('tikkun-leil-shavuot-flyer', 'Tikkun Leil Shavuot', 'flyer', 'flyer', 'band', 'Elegant', ['navy', 'gold'], 'education', ['tikkun leil shavuot', 'all night learning', 'study', 'torah', 'cheesecake'],
      L({ scene: 'jh-bg-twilight', pal: { ...WHITE_BLUE, panel: '#fbf8f0' }, hero: 'jh-torah', corner: 'jh-wheat', cornerColors: ['#d4a940'], title: ['Cinzel', 700] }),
      { eyebrow: 'First night of Shavuot', title: 'Tikkun Leil Shavuot', sub: 'Learn through the night with teachers from our community', details: ['Classes from 10 PM · Sunrise service', 'Cheesecake & coffee all night'], cta: 'Open to all' }),
  ] },
  { sub: 'tu-bishvat', label: 'Tu BiShvat', specs: [
    spec('tu-bishvat-sameach', 'Happy Tu BiShvat', 'post', 'greeting', 'panel', 'Playful', ['green', 'pink'], 'greeting', ['tu bishvat', 'tu bshvat', 'new year of trees', 'trees', 'hebrew', 'nature'],
      L({ scene: 'jh-bg-orchard', pal: ORCHARD, hero: 'jh-tree', title: ['Fredoka', 700], body: ['Quicksand', 600] }),
      { native: he('ט״ו בשבט שמח', ['Suez One', 400], '#2f5a2a'), title: 'Happy New Year of the Trees', sub: 'Plant, taste the seven species and say thank you to nature' }),
    spec('tu-bishvat-seder-flyer', 'Tu BiShvat Seder', 'flyer', 'flyer', 'type', 'Modern', ['green', 'cream'], 'event', ['tu bishvat seder', 'tree planting', 'fruit', 'seven species', 'community'],
      L({ scene: 'jh-bg-orchard', pal: ORCHARD, hero: 'jh-pomegranates', corner: 'jh-tree', title: ['Montserrat', 800] }),
      { eyebrow: 'Tu BiShvat', title: 'Fruit Seder & Tree Planting', sub: 'Four cups, seven species and a sapling for every family', details: ['Sunday · 10 AM', 'Community Garden'], cta: 'Bring gloves' }),
  ] },
  { sub: 'lag-baomer', label: 'Lag BaOmer', specs: [
    spec('lag-baomer-bonfire', 'Lag BaOmer Bonfire', 'post', 'party', 'hero', 'Playful', ['night', 'orange'], 'party', ['lag baomer', "lag b'omer", 'bonfire', 'medura', 'hebrew', 'night'],
      L({ scene: 'jh-bg-twilight', pal: TWILIGHT, hero: 'jh-bonfire', title: ['Montserrat', 900] }),
      { native: he('ל״ג בעומר שמח', ['Suez One', 400]), title: 'Bonfire Night', sub: 'Songs, marshmallows and a big warm fire', cta: 'Sundown at Pine Park' }),
    spec('lag-baomer-picnic-flyer', 'Lag BaOmer Picnic', 'flyer', 'flyer', 'band', 'Playful', ['green', 'orange'], 'event', ['lag baomer', 'picnic', 'parade', 'bow and arrow', 'kids', 'outdoor'],
      L({ scene: 'jh-bg-orchard', pal: { ...ORCHARD, accent: '#d9682b' }, hero: 'jh-bonfire', title: ['Montserrat', 900] }),
      { eyebrow: 'Lag BaOmer', title: 'Family Picnic & Bonfire', details: ['Barbecue from 5 PM · Bonfire at dusk', 'Games, music and a kids’ parade', 'Pine Park, North Field'], cta: 'Free for families' }),
  ] },
];
