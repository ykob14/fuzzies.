/**
 * The Fuzzy Locker — the collection room for all 50 Fuzzies. A 3D showroom (turn them 360°, watch their jump, celebration and moods,
 * try outfit pieces and effects), collection progress by rarity, filters, search and sorting, equip, and for every locked Fuzzy a
 * clear "How to Unlock" with live progress and a button straight to the right Pass level / Shop item / world / board.
 * New Fuzzies unlocked anywhere (Pass, Shop, achievements, worlds…) appear immediately (it listens to `fz:crossing`).
 * Layout: computers = cards | showroom | details; tablets = showroom + details | cards; phones = showroom on top, cards below, details
 * in a sheet.
 */
import { h, icon, toast } from '../../ui/dom';
import { CHARACTERS, CHARACTER_BY_ID, RARITIES, RARITY_COLOR, RARITY_NAME, unlockText, ACHIEVEMENT_HINT, EVENT_NAME, WORLD_NAME, type CharacterDef, type Rarity, type Mood } from '../characters';
import { SLOTS, SLOT_NAME, cosmeticsOf, type CosmeticDef, type CosmeticSlot } from '../cosmetics';
import * as store from '../store';
import { panelAvailable, type NavTarget, type PanelName, type PanelOpen } from '../hub';
import { coinMark, rarityTag, newDot } from './kit';
import { friendUrl } from '../../content/friends';
import { MOOD_NAME } from '../character3d';
import { equipSound, lockedSound } from '../audio';
import type { Showroom } from './showroom';
import { gicon, gtile, SLOT_ICON } from './gicons';
import './gameui.css';
import './locker.css';

type Status = 'all' | 'owned' | 'locked' | 'new';
type Sort = 'collection' | 'rarity' | 'name' | 'owned';
const MOODS: Mood[] = ['happy', 'cool', 'sleepy', 'proud', 'silly', 'fierce', 'calm'];
const isSecret = (d: CharacterDef) => d.unlock.kind === 'secret';
const kids = (...xs: (Node | string | null | undefined | false)[]): (Node | string)[] => xs.filter((x): x is Node | string => !!x);

/** a short "how to get" for a card */
function shortHint(d: CharacterDef): string {
  const k = d.unlock;
  switch (k.kind) {
    case 'start': return 'Starter';
    case 'pass': return `Pass Lv ${k.level}`;
    case 'shop': return `${k.price.toLocaleString()} coins`;
    case 'season': return `${EVENT_NAME[k.event]} event`;
    case 'achievement': { const t = ACHIEVEMENT_HINT[k.id] ?? 'Achievement'; return t.charAt(0).toUpperCase() + t.slice(1).replace(/ \(.*\)$/, ''); }
    case 'world': return `Clear world ${k.world}`;
    case 'endless': return `Endless ${k.score}`;
    case 'weekly': return k.top === 1 ? 'Weekly #1' : `Weekly top ${k.top}`;
    case 'challenge': return 'Flawless world';
    case 'secret': return 'Secret';
  }
}
/** where "How to Unlock" goes, and whether that screen exists yet */
function unlockTarget(d: CharacterDef): { nav: NavTarget; panel: PanelName; label: string } | null {
  const k = d.unlock;
  switch (k.kind) {
    case 'pass': return { nav: { to: 'pass', level: k.level }, panel: 'pass', label: `Go to Pass level ${k.level}` };
    case 'shop': return { nav: { to: 'shop', item: d.id }, panel: 'shop', label: k.slot === 'permanent' ? 'See it in the Shop' : 'Check the Shop' };
    case 'world': return { nav: { to: 'worlds', world: k.world }, panel: 'worlds', label: `Play world ${k.world}` };
    case 'endless': return { nav: { to: 'endless' }, panel: 'endless', label: 'Play Endless Crossing' };
    case 'weekly': return { nav: { to: 'leaderboard' }, panel: 'leaderboard', label: 'See the weekly boards' };
    case 'season': return { nav: { to: 'events', id: k.event }, panel: 'events', label: `${EVENT_NAME[k.event]} event` };
    case 'achievement': return { nav: { to: 'missions' }, panel: 'missions', label: 'See achievements' };
    case 'challenge': return { nav: { to: 'worlds' }, panel: 'worlds', label: 'Pick a world' };
    default: return null;
  }
}
/** live progress towards an unlock (null when there's nothing to count) */
function progress(d: CharacterDef): { now: number; need: number; text: string } | null {
  const c = store.save(), k = d.unlock;
  switch (k.kind) {
    case 'pass': { const lv = store.passInfo().level; return { now: lv, need: k.level, text: `You're on level ${lv} of ${k.level}` }; }
    case 'shop': { const have = store.coins(); return { now: Math.min(have, k.price), need: k.price, text: have >= k.price ? `You have ${have.toLocaleString()} coins — enough!` : `You have ${have.toLocaleString()} of ${k.price.toLocaleString()} coins` }; }
    case 'world': { let n = 0; for (let l = 1; l <= 15; l++) if (c.worlds[`${k.world}-${l}`]) n++; return { now: n, need: 15, text: `${n} of 15 levels cleared in ${WORLD_NAME[k.world - 1]}` }; }
    case 'endless': return { now: Math.min(c.endless.best, k.score), need: k.score, text: c.endless.best ? `Your best: ${c.endless.best}` : 'No Endless run yet' };
    case 'weekly': return c.weeklyBest ? { now: 1, need: 1, text: `Your best finish: #${c.weeklyBest}` } : null;
    case 'achievement': {
      const m: Record<string, [number, number]> = { 'nests-100': [c.stats.nests, 100], 'lives-100': [c.stats.lives, 100], 'games-100': [c.stats.games, 100], 'coins-10000': [c.coinsEarned, 10000], 'gold-250': [c.stats.goldPickups, 250], 'collection-45': [c.owned.length, 45] };
      const v = m[k.id]; if (!v) return null;
      return { now: Math.min(v[0], v[1]), need: v[1], text: `${Math.min(v[0], v[1]).toLocaleString()} / ${v[1].toLocaleString()}` };
    }
    case 'challenge': return { now: c.flawlessWorlds.length ? 1 : 0, need: 1, text: c.flawlessWorlds.length ? 'Done!' : 'Not yet — any world counts' };
    default: return null;
  }
}
function cosmeticHow(x: CosmeticDef): string {
  const k = x.unlock;
  switch (k.kind) {
    case 'free': return 'Free';
    case 'pass': return `Fuzzy Pass level ${k.level}`;
    case 'shop': return k.slot === 'permanent' ? `Fuzzy Shop · ${k.price} coins` : `Fuzzy Shop (${k.slot} pick) · ${k.price} coins`;
    case 'season': return `${EVENT_NAME[k.event]} event · ${k.price} coins`;
    case 'weekly': return `Finish in a weekly top ${k.top}`;
    case 'achievement': return `Achievement: ${ACHIEVEMENT_HINT[k.id] ?? k.id}`;
  }
}
function cosmeticTarget(x: CosmeticDef): { nav: NavTarget; panel: PanelName } | null {
  const k = x.unlock;
  if (k.kind === 'pass') return { nav: { to: 'pass', level: k.level }, panel: 'pass' };
  if (k.kind === 'shop') return { nav: { to: 'shop', item: x.id }, panel: 'shop' };
  if (k.kind === 'season') return { nav: { to: 'events', id: k.event }, panel: 'events' };
  if (k.kind === 'weekly') return { nav: { to: 'leaderboard' }, panel: 'leaderboard' };
  if (k.kind === 'achievement') return { nav: { to: 'missions' }, panel: 'missions' };
  return null;
}

export const open: PanelOpen = async (ctx, focus) => {
  ctx.title('Fuzzy Locker');
  const root = h('div', { class: 'fzl' });
  ctx.root.replaceChildren(root);
  ctx.root.classList.add('fzl-body');
  const layer = ctx.root.closest('.fzx-layer') as HTMLElement | null;
  const cleanups: (() => void)[] = [];

  let selected: CharacterDef = CHARACTER_BY_ID[(focus?.to === 'locker' && focus.id) || store.save().equipped.character] ?? CHARACTERS[0];
  let rarity: Rarity | 'all' = 'all', status: Status = 'all', sort: Sort = 'collection', query = '';
  let moodIdx = Math.max(0, MOODS.indexOf(selected.mood));
  let sheetOpen = false;
  const mobile = matchMedia('(pointer: coarse)').matches;

  // ---------- the showroom (lazy: three.js is its own download) ----------
  const stageWrap = h('div', { class: 'fzl-stagewrap' });
  const stageFallback = h('div', { class: 'fzl-fallback' });
  stageWrap.append(h('div', { class: 'fzx-rays fzl-rays', 'aria-hidden': 'true' }), stageFallback);
  let room: Showroom | null = null;
  let thumbs: typeof import('./showroom') | null = null;
  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();

  const stageTop = h('div', { class: 'fzl-stagetop' });
  const actBtn = (label: string, ic: Parameters<typeof icon>[0], fn: () => void, cls = '') => h('button', { class: `fzx-round fzl-act ${cls}`, type: 'button', title: label, 'aria-label': label, onclick: fn }, icon(ic, 19));
  const moodBtn = actBtn('Mood', 'heart', () => { moodIdx = (moodIdx + 1) % MOODS.length; room?.mood(MOODS[moodIdx]); paintMood(); });
  const paintMood = () => { moodBtn.title = `Mood: ${MOOD_NAME[MOODS[moodIdx]]}`; };
  const actions = h('div', { class: 'fzl-actions', role: 'toolbar', 'aria-label': 'Preview moves' },
    actBtn('Jump', 'up', () => room?.play('jump')),
    actBtn('Celebrate', 'sparkles', () => room?.play('celebrate')),
    actBtn('Look around', 'eye', () => room?.play('look')),
    moodBtn,
    actBtn('Reset view', 'fit', () => room?.reset(), 'fzl-act-icon'));
  stageWrap.append(stageTop, actions);

  // ---------- collection header: progress ring + per-rarity bars ----------
  const prog = h('div', { class: 'fzx-prog' });
  const head = h('div', { class: 'fzl-progress' }, gtile('fuzzy', 40), h('div', { class: 'fzl-prog-t' }, h('b', null, 'My Fuzzies'), prog));
  const raritySel = h('select', { class: 'fzl-sort fzl-rsel', 'aria-label': 'Rarity', onchange: () => { rarity = raritySel.value as Rarity | 'all'; paintGrid(); } },
    h('option', { value: 'all' }, 'All rarities'), ...RARITIES.map((r) => h('option', { value: r }, RARITY_NAME[r]))) as HTMLSelectElement;
  const statusChips = h('div', { class: 'fzl-chips fzl-chips-s', role: 'tablist', 'aria-label': 'Show' });
  const search = h('input', { class: 'fzl-search', type: 'search', placeholder: 'Search Fuzzies', 'aria-label': 'Search Fuzzies' }) as HTMLInputElement;
  const sortSel = h('select', { class: 'fzl-sort', 'aria-label': 'Sort' },
    h('option', { value: 'collection' }, 'Collection order'), h('option', { value: 'rarity' }, 'Rarity'), h('option', { value: 'owned' }, 'Owned first'), h('option', { value: 'name' }, 'Name')) as HTMLSelectElement;
  const grid = h('div', { class: 'fzl-grid', role: 'listbox', 'aria-label': 'Fuzzies' });
  const empty = h('p', { class: 'fzl-empty', hidden: true }, 'No Fuzzies match — try another filter.');
  const coll = h('section', { class: 'fzl-coll fzx-card', 'aria-label': 'Your collection' }, head, h('div', { class: 'fzl-tools' }, statusChips, h('div', { class: 'fzl-tools2' }, search, raritySel, sortSel)), grid, empty);

  // ---------- details ----------
  const details = h('section', { class: 'fzl-details fzx-card', 'aria-live': 'polite' });
  const summary = h('div', { class: 'fzl-summary fzx-card' }); // phones: name + main button under the stage
  const sheet = h('div', { class: 'fzl-sheet', hidden: true, role: 'dialog', 'aria-label': 'Fuzzy details' });
  const sheetBack = h('div', { class: 'fzl-sheet-back', hidden: true, onclick: () => setSheet(false) });

  root.append(stageWrap, summary, coll, details, sheetBack, sheet);

  // ---------- layout by the room's width ----------
  const ro = new ResizeObserver(() => {
    const w = root.clientWidth;
    root.classList.toggle('wide', w >= 980);
    root.classList.toggle('mid', w >= 660 && w < 980);
    root.classList.toggle('narrow', w < 660);
    if (w >= 660 && sheetOpen) setSheet(false);
    placeDetails();
  });
  ro.observe(root);
  function placeDetails(): void {
    const narrow = root.classList.contains('narrow');
    const host = narrow ? sheet : root;
    if (details.parentElement !== host) host.append(details);
  }
  function setSheet(on: boolean): void {
    sheetOpen = on; sheet.hidden = !on; sheetBack.hidden = !on;
    sheet.classList.toggle('in', on);
    if (on) sheet.scrollTop = 0;
  }

  // ---------- cards ----------
  const cards = new Map<string, HTMLButtonElement>();
  function portrait(d: CharacterDef, owned: boolean): HTMLElement {
    const pic = h('span', { class: 'fzl-pic' });
    const secretLocked = isSecret(d) && !owned;
    const cached = thumbs?.cachedThumbnail(d, !owned);
    if (cached) pic.append(h('img', { src: cached, alt: '', draggable: 'false' }));
    else {
      // owned: the friend picture until the 3D one is ready; locked: a round rarity-rimmed silhouette (a blacked-out drawing reads as a blob)
      if (d.friend && owned) pic.append(h('img', { src: friendUrl(d.friend), alt: '', class: 'fzl-flat', draggable: 'false' }));
      else pic.append(h('span', { class: 'fzl-blob', style: `--c0:${d.color[0]};--c1:${d.color[1]}` }));
      if (hasGL) void loadThumbs().then((m) => m?.thumbnail(d, { locked: !owned }).then((url) => { if (url && pic.isConnected) pic.replaceChildren(h('img', { src: url, alt: '', draggable: 'false' })); }));
    }
    if (secretLocked) pic.append(h('b', { class: 'fzl-q' }, '?'));
    return pic;
  }
  function card(d: CharacterDef): HTMLButtonElement {
    const owned = store.hasCharacter(d.id), eq = store.save().equipped.character === d.id, secret = isSecret(d) && !owned;
    const b = h('button', {
      class: `fzl-card ${owned ? 'owned' : 'locked'} ${eq ? 'eq' : ''} ${d.id === selected.id ? 'sel' : ''}`, type: 'button', role: 'option',
      'aria-selected': d.id === selected.id ? 'true' : 'false', 'data-id': d.id, style: `--rar:${RARITY_COLOR[d.rarity]}`,
      'aria-label': `${secret ? 'Secret Fuzzy' : d.name}, ${RARITY_NAME[d.rarity]}${owned ? eq ? ', equipped' : ', owned' : ', locked'}`,
      onclick: () => select(d),
    },
    h('span', { class: 'fzl-card-in' },
      portrait(d, owned),
      h('span', { class: 'fzl-cname' }, secret ? '???' : d.name),
      h('span', { class: 'fzl-cmeta' }, eq ? h('em', { class: 'fzl-eqtag' }, 'Equipped') : owned ? '' : d.unlock.kind === 'shop' ? h('span', { class: 'fzl-price' }, coinMark(13), d.unlock.price.toLocaleString()) : h('span', { class: 'fzl-lock' }, gicon('lock', 13), shortHint(d)))));
    if (owned && store.isNew(d.id) && d.id !== 'classic') b.append(newDot());
    return b;
  }
  function list(): CharacterDef[] {
    const q = query.trim().toLowerCase();
    let xs = CHARACTERS.filter((d) => {
      const owned = store.hasCharacter(d.id);
      if (rarity !== 'all' && d.rarity !== rarity) return false;
      if (status === 'owned' && !owned) return false;
      if (status === 'locked' && owned) return false;
      if (status === 'new' && !(owned && store.isNew(d.id) && d.id !== 'classic')) return false;
      if (q) { if (isSecret(d) && !owned) return '???'.includes(q) || 'secret'.includes(q); return `${d.name} ${d.tagline} ${d.personality} ${RARITY_NAME[d.rarity]}`.toLowerCase().includes(q); }
      return true;
    });
    const idx = (d: CharacterDef) => CHARACTERS.indexOf(d);
    if (sort === 'rarity') xs = [...xs].sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || idx(a) - idx(b));
    if (sort === 'name') xs = [...xs].sort((a, b) => (isSecret(a) && !store.hasCharacter(a.id) ? 'zzz' : a.name).localeCompare(isSecret(b) && !store.hasCharacter(b.id) ? 'zzz' : b.name));
    if (sort === 'owned') xs = [...xs].sort((a, b) => Number(store.hasCharacter(b.id)) - Number(store.hasCharacter(a.id)) || idx(a) - idx(b));
    return xs;
  }
  function paintGrid(): void {
    const xs = list();
    cards.clear();
    grid.replaceChildren(...xs.map((d) => { const c = card(d); cards.set(d.id, c); return c; }));
    empty.hidden = xs.length > 0;
  }
  function paintHead(): void {
    const n = store.save().owned.length, total = CHARACTERS.length;
    prog.classList.toggle('full', n === total);
    prog.replaceChildren(h('i', { style: `width:${Math.max(8, Math.round((n / total) * 100))}%` }), h('b', null, `${n} / ${total}`));
    prog.setAttribute('aria-label', `${n} of ${total} Fuzzies collected`);
  }
  function paintChips(): void {
    raritySel.value = rarity;
    const newCount = CHARACTERS.filter((d) => store.hasCharacter(d.id) && store.isNew(d.id) && d.id !== 'classic').length;
    statusChips.replaceChildren(...(['all', 'owned', 'locked', 'new'] as Status[]).map((s) => h('button', {
      class: `fzl-chip ${status === s ? 'on' : ''}`, type: 'button', role: 'tab', 'aria-selected': status === s ? 'true' : 'false',
      onclick: () => { status = status === s && s !== 'all' ? 'all' : s; paintChips(); paintGrid(); },
    }, { all: 'All', owned: 'Owned', locked: 'Locked', new: 'New' }[s], s === 'new' && newCount ? h('b', { class: 'fzl-count' }, String(newCount)) : null)));
  }

  // ---------- details panel ----------
  function go(t: { nav: NavTarget; panel: PanelName } | null): void {
    if (!t) return;
    if (!panelAvailable(t.panel)) { toast('That part of Fuzzy Crossing is coming soon!', 'info'); return; }
    ctx.go(t.nav);
  }
  function equip(d: CharacterDef): void {
    if (!store.equipCharacter(d.id)) return;
    store.markSeen(d.id);
    ctx.equipChanged();
    equipSound();
    room?.play('celebrate');
    toast(`${d.name} is ready to hop!`, 'good');
  }
  function paintDetails(): void {
    const d = selected, owned = store.hasCharacter(d.id), eq = store.save().equipped.character === d.id, secret = isSecret(d) && !owned;
    const mainBtn = owned
      ? h('button', { class: 'fzx-bigbtn fzl-equip', type: 'button', disabled: eq, onclick: () => equip(d) }, gicon(eq ? 'check' : 'star', 24), h('span', null, eq ? 'Equipped' : 'Equip'))
      : null;
    // How to Unlock
    let how: HTMLElement | null = null;
    if (!owned) {
      const t = unlockTarget(d), p = progress(d);
      const avail = t ? panelAvailable(t.panel) : false;
      how = h('div', { class: 'fzl-how', style: `--rar:${RARITY_COLOR[d.rarity]}` },
        h('div', { class: 'fzl-how-t' }, gtile('lock', 34, 'soft'), h('div', null, h('b', null, 'How to Unlock'), h('p', { class: 'fzl-how-x' }, unlockText(d)))),
        p ? h('div', { class: 'fzx-prog fzl-how-p' }, h('i', { style: `width:${Math.max(8, Math.round((p.now / Math.max(1, p.need)) * 100))}%` }), h('b', null, p.text)) : null,
        t ? avail ? h('button', { class: 'fzx-bigbtn fzl-go', type: 'button', onclick: () => go(t) }, h('span', null, t.label), gicon('play', 22)) : h('p', { class: 'fzl-soon' }, `${t.label}: coming soon`) : null);
    }
    const chips = (slot: CosmeticSlot) => {
      const eqId = store.save().equipped[slot];
      return h('div', { class: 'fzl-cos-row' }, h('p', { class: 'fzl-cos-t' }, SLOT_NAME[slot]),
        h('div', { class: 'fzl-cos-list' }, ...cosmeticsOf(slot).map((x) => {
          const have = store.hasCosmetic(x.id), on = eqId === x.id;
          return h('button', {
            class: `fzl-cos ${have ? '' : 'locked'} ${on ? 'on' : ''}`, type: 'button', style: `--rar:${RARITY_COLOR[x.rarity]}`,
            title: have ? `${x.name} — ${x.blurb}` : `${x.name} — ${cosmeticHow(x)}`, 'aria-pressed': on ? 'true' : 'false',
            onclick: () => pickCosmetic(x),
          }, gtile(have ? SLOT_ICON[x.slot] : 'lock', 24, `fzl-cos-ic ${have ? '' : 'grey'}`), h('span', { class: 'fzl-cos-n' }, x.name));
        })));
    };
    const cosHelp = h('p', { class: 'fzl-cos-help', id: 'fzl-cos-help' });
    details.replaceChildren(...kids(
      h('div', { class: 'fzl-d-head' },
        h('div', null, h('h2', { class: 'fzl-name' }, secret ? '???' : d.name), h('div', { class: 'fzl-tags' }, rarityTag(d.rarity))),
        h('button', { class: 'fzl-close-sheet', type: 'button', 'aria-label': 'Close details', onclick: () => setSheet(false) }, icon('close', 18))),
      h('p', { class: 'fzl-tagline' }, secret ? 'Nobody knows. Nobody has the courage to ask.' : d.tagline),
      mainBtn, how,
      owned || secret ? h('div', { class: 'fzl-cos-wrap' }, h('h3', null, 'Style'), ...SLOTS.map(chips), cosHelp) : null));
    // phones: summary bar under the stage
    summary.replaceChildren(...kids(
      h('div', { class: 'fzl-sum-t' }, h('b', null, secret ? '???' : d.name), h('span', null, rarityTag(d.rarity))),
      owned ? h('button', { class: 'fzx-bigbtn fzl-sum-btn', type: 'button', disabled: eq, onclick: () => equip(d) }, gicon(eq ? 'check' : 'star', 20), h('span', null, eq ? 'Equipped' : 'Equip')) : h('button', { class: 'fzx-bigbtn fzl-sum-btn', type: 'button', onclick: () => setSheet(true) }, gicon('lock', 20), h('span', null, 'How to Unlock')),
      owned ? h('button', { class: 'fzx-round fzl-more', type: 'button', title: 'Style', 'aria-label': 'Style', onclick: () => setSheet(true) }, icon('more', 18)) : null));
    stageTop.replaceChildren(h('span', { class: 'fzl-st-name' }, secret ? '???' : d.name), rarityTag(d.rarity));
    stageWrap.style.setProperty('--rar', RARITY_COLOR[d.rarity]);
    stageWrap.classList.toggle('locked', !owned);
  }
  function pickCosmetic(x: CosmeticDef): void {
    room?.preview(x);
    if (store.hasCosmetic(x.id)) {
      if (store.save().equipped[x.slot] !== x.id) { store.equipCosmetic(x.id); ctx.equipChanged(); equipSound(); }
      const help = details.querySelector('#fzl-cos-help'); if (help) help.textContent = `${x.name}: ${x.blurb}`;
    } else {
      lockedSound();
      const help = details.querySelector('#fzl-cos-help');
      if (help) {
        const t = cosmeticTarget(x);
        help.replaceChildren(...kids(h('b', null, `${x.name} `), `— ${cosmeticHow(x)}. Trying it on for now.`, t && panelAvailable(t.panel) ? h('button', { class: 'link', type: 'button', onclick: () => go(t) }, ' Get it →') : null));
      }
    }
  }

  // ---------- selection ----------
  async function select(d: CharacterDef, scroll = false): Promise<void> {
    selected = d;
    moodIdx = Math.max(0, MOODS.indexOf(d.mood)); paintMood();
    for (const [id, c] of cards) { const on = id === d.id; c.classList.toggle('sel', on); c.setAttribute('aria-selected', on ? 'true' : 'false'); }
    if (scroll) cards.get(d.id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const owned = store.hasCharacter(d.id);
    if (owned && store.isNew(d.id)) store.markSeen(d.id); // repaints through fz:crossing
    paintDetails();
    showStage(d);
  }
  function showStage(d: CharacterDef): void {
    const owned = store.hasCharacter(d.id), eq = store.save().equipped;
    const extra = eq.extra !== 'extra-none' ? eq.extra : null;
    if (room) void room.show(d, { locked: !owned, secret: isSecret(d) && !owned, extra, fx: { trail: eq.trail, jump: eq.jump, celebration: eq.celebration } });
    else {
      stageFallback.replaceChildren(portrait(d, owned));
      stageFallback.classList.toggle('locked', !owned);
    }
  }
  async function loadThumbs(): Promise<typeof import('./showroom') | null> {
    if (thumbs) return thumbs;
    try { thumbs = await import('./showroom'); } catch { thumbs = null; }
    return thumbs;
  }

  // ---------- live updates (an unlock anywhere shows here at once) ----------
  let pend = 0;
  const onStore = (e: Event) => {
    const kind = (e as CustomEvent).detail?.kind as string | undefined;
    if (pend) return;
    pend = requestAnimationFrame(() => {
      pend = 0;
      const st = grid.scrollTop;
      paintHead(); paintChips(); paintGrid(); grid.scrollTop = st;
      paintDetails();
      if (kind === 'unlock' || kind === 'change') showStage(selected);
    });
  };
  addEventListener('fz:crossing', onStore);
  cleanups.push(() => removeEventListener('fz:crossing', onStore), () => { if (pend) cancelAnimationFrame(pend); });

  // keys: ← → pick, Enter equips, J jump, C celebrate
  const onKey = (e: KeyboardEvent) => {
    if (!root.isConnected || (e.target as HTMLElement)?.closest?.('input, select, textarea') || document.querySelector('.modal-backdrop')) return;
    const xs = list(), i = xs.findIndex((d) => d.id === selected.id);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); void select(xs[(i + 1) % xs.length], true); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); void select(xs[(i - 1 + xs.length) % xs.length], true); }
    else if (e.key === 'Enter' && store.hasCharacter(selected.id)) equip(selected);
    else if (e.key.toLowerCase() === 'j') room?.play('jump');
    else if (e.key.toLowerCase() === 'c') room?.play('celebrate');
    else if (e.key === 'Escape' && sheetOpen) { e.stopPropagation(); setSheet(false); }
  };
  addEventListener('keydown', onKey);
  cleanups.push(() => removeEventListener('keydown', onKey));

  search.addEventListener('input', () => { query = search.value; paintGrid(); });
  sortSel.addEventListener('change', () => { sort = sortSel.value as Sort; paintGrid(); });

  // first paint
  paintHead(); paintChips(); paintGrid(); paintDetails(); placeDetails();
  requestAnimationFrame(() => cards.get(selected.id)?.scrollIntoView({ block: 'nearest' }));
  // the room takes the whole window: lift the layer out of the page (whose animation makes a stacking context under the app's bars)
  if (layer) { layer.classList.add('fzl-open'); document.body.append(layer); }

  const cleanup = () => {
    cleanups.forEach((f) => f());
    ro.disconnect();
    room?.dispose(); room = null;
    thumbs?.disposeThumbnails();
    layer?.classList.remove('fzl-open');
  };
  if (hasGL) {
    try {
      const m = await loadThumbs();
      if (!m || !root.isConnected) return cleanup;
      room = await m.createShowroom({ mobile });
      if (!root.isConnected) { room.dispose(); room = null; return cleanup; }
      stageFallback.replaceWith(room.el);
      room.onTap = () => { const r = room?.rig(); if (!r) return; if (store.hasCharacter(selected.id)) room?.play(Math.random() < 0.5 ? 'jump' : 'celebrate'); else { lockedSound(); r.play('look'); } };
      showStage(selected);
    } catch (e) { console.warn('Locker 3D unavailable', e); showStage(selected); }
  } else showStage(selected);
  return cleanup;
};
