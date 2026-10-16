/**
 * Weekly Boards: three leaderboards (highest score, fastest crossing, survival streak) for the current and the last week, your own
 * standing, the rewards the top places earn, and the collect button for last week's rewards.
 * Everyone can read the boards; only signed-in cloud accounts get a place on them. Everything from the server is shown with DOM
 * methods (textContent) — never as HTML.
 */
import { h, btn, icon, fuzzyMark, modal } from '../../ui/dom';
import { accounts } from '../../core/account';
import { cloudEnabled } from '../../core/api';
import { friendUrl } from '../../content/friends';
import { CHARACTER_BY_ID } from '../characters';
import { COSMETIC_BY_ID } from '../cosmetics';
import { BOARDS, BOARD_IDS, TIERS, TIER_DEFS, formatLeft, formatValue, tierOf, trophyName, weekLabel, type Board, type Tier } from '../rewards-weekly';
import * as net from '../net';
import * as store from '../store';
import { coinMark, rarityTag } from './kit';
import type { PanelOpen } from '../hub';
import './leaderboard.css';

/** The small picture of the Fuzzy someone played with. One helper so a 3D thumbnail can replace it later. */
export function fuzzyPic(characterId: string | null | undefined, size = 22): Element {
  const def = characterId && Object.hasOwn(CHARACTER_BY_ID, characterId) ? CHARACTER_BY_ID[characterId] : null;
  if (def?.friend) return h('img', { class: 'fzb-fz', src: friendUrl(def.friend), alt: '', width: size, height: size, loading: 'lazy' });
  const mark = fuzzyMark(size, def?.color ?? ['#ff8fbf', '#c8326e']);
  mark.classList.add('fzb-fz');
  return mark;
}
const fuzzyName = (id: string | null | undefined): string => (id && Object.hasOwn(CHARACTER_BY_ID, id) ? CHARACTER_BY_ID[id].name : 'Fuzzy');

function avatar(a: net.BoardRow['avatar'], size: number): HTMLElement {
  const color = /^#[0-9a-fA-F]{6}$/.test(a.color) ? a.color : '#d6336c';
  const el = h('span', { class: 'fzb-av', style: `--s:${size}px;background:${color}` });
  if (a.friend && /^f\d{2}$/.test(a.friend)) el.append(h('img', { src: friendUrl(a.friend), alt: '', width: size, height: size, loading: 'lazy' }));
  else el.textContent = a.emoji;
  return el;
}

const BOARD_ICON: Record<Board, 'star' | 'bolt' | 'trophy'> = { score: 'star', fastest: 'bolt', streak: 'trophy' };
const MEDAL = ['', 'gold', 'silver', 'bronze'];

export const open: PanelOpen = (ctx) => {
  const root = ctx.root;
  root.classList.add('fzb-root');
  let board: Board = 'score';
  let which: 'current' | 'previous' = 'current';
  let data: net.BoardData | null = null;
  let loadId = 0;
  let timer = 0;
  let offset = 0; // server clock − device clock, from the last answer
  let closed = false;

  const compete = net.canCompete();
  const isGuest = !compete && cloudEnabled;

  // ---------- header: week + countdown ----------
  const weekEl = h('b', { class: 'fzb-weekname' });
  const leftEl = h('span', { class: 'fzb-left' });
  const toggle = h('div', { class: 'fzb-seg', role: 'group', 'aria-label': 'Which week' });
  const tabs = h('div', { class: 'fzb-tabs', role: 'tablist', 'aria-label': 'Boards' });
  const blurb = h('p', { class: 'fzb-blurb' });
  const noticeEl = h('div', { class: 'fzb-notice' });
  const mineEl = h('div', { class: 'fzb-mine' });
  const listEl = h('ol', { class: 'fzb-list', 'aria-live': 'polite' });
  const pinEl = h('div', { class: 'fzb-pin' });
  const rewardsEl = h('details', { class: 'fzb-rewards' });

  const head = h('header', { class: 'fzb-head' },
    h('div', { class: 'fzb-weekline' }, h('span', { class: 'fzb-cal' }, icon('star', 16)), h('div', { class: 'fzb-weektext' }, leftEl, weekEl)),
    toggle);
  root.replaceChildren(h('div', { class: 'fzb' }, head, noticeEl, tabs, blurb, mineEl, listEl, pinEl, rewardsEl));

  function paintToggle(): void {
    toggle.replaceChildren(...(['current', 'previous'] as const).map((w) => {
      const b = h('button', { type: 'button', class: which === w ? 'on' : '', 'aria-pressed': which === w ? 'true' : 'false', onclick: () => { if (which !== w) { which = w; paintToggle(); void load(); } } }, w === 'current' ? 'This week' : 'Last week');
      return b;
    }));
  }
  function paintTabs(): void {
    tabs.replaceChildren(...BOARD_IDS.map((b) => {
      const el = h('button', { type: 'button', role: 'tab', id: `fzb-tab-${b}`, class: `fzb-tab ${board === b ? 'on' : ''}`, 'aria-selected': board === b ? 'true' : 'false', tabindex: board === b ? '0' : '-1', 'aria-controls': 'fzb-panel',
        onclick: () => select(b) }, icon(BOARD_ICON[b], 18), h('span', null, BOARDS[b].short));
      el.addEventListener('keydown', (e) => {
        const i = BOARD_IDS.indexOf(board);
        const next = e.key === 'ArrowRight' ? BOARD_IDS[(i + 1) % 3] : e.key === 'ArrowLeft' ? BOARD_IDS[(i + 2) % 3] : e.key === 'Home' ? BOARD_IDS[0] : e.key === 'End' ? BOARD_IDS[2] : null;
        if (next) { e.preventDefault(); select(next); (tabs.querySelector(`#fzb-tab-${next}`) as HTMLElement | null)?.focus(); }
      });
      return el;
    }));
    blurb.textContent = BOARDS[board].blurb;
    listEl.id = 'fzb-panel';
    listEl.setAttribute('role', 'tabpanel');
    listEl.setAttribute('aria-labelledby', `fzb-tab-${board}`);
  }
  function select(b: Board): void { if (b === board) return; board = b; paintTabs(); paintRewards(); void load(); }

  // ---------- countdown ----------
  function paintClock(): void {
    if (!data) { leftEl.textContent = ''; return; }
    if (which === 'previous' || data.week !== data.current) { leftEl.replaceChildren(h('span', null, 'Final')); leftEl.classList.add('done'); return; }
    leftEl.classList.remove('done');
    const left = data.weekEnd - (Date.now() + offset);
    leftEl.replaceChildren(icon('bolt', 13), h('span', null, left > 0 ? `Resets in ${formatLeft(left)}` : 'Resetting…'));
    if (left <= 0 && !closed) void load(true); // the week just rolled over: show the new one
  }

  // ---------- the list ----------
  function rowEl(r: net.BoardRow, pinned = false): HTMLElement {
    const medal = MEDAL[r.rank] ?? '';
    const inner = h('button', { class: 'fzb-rowbtn', type: 'button', 'aria-label': `${r.username}, rank ${r.rank}, ${formatValue(board, r.value)}. Open player card`, onclick: () => void openPlayer(r.username) },
      h('span', { class: 'fzb-rank', 'aria-hidden': 'true' }, r.rank <= 3 ? h('span', { class: 'fzb-medal' }, String(r.rank)) : `#${r.rank}`),
      avatar(r.avatar, 38),
      h('span', { class: 'fzb-who' }, h('b', null, r.username, r.you ? h('em', null, 'You') : null), h('small', null, fuzzyPic(r.characterId, 18), h('span', null, fuzzyName(r.characterId)))),
      h('span', { class: 'fzb-val' }, formatValue(board, r.value)));
    return h('li', { class: `fzb-row ${r.you ? 'you' : ''} ${medal ? `medal-${medal}` : ''} ${pinned ? 'pinned' : ''}`, value: r.rank }, inner);
  }
  /** a player's card: who they are, the Fuzzy they played with and their places this week (all from validated results) */
  async function openPlayer(username: string): Promise<void> {
    const week = data?.week ?? 'current';
    const body = h('div', { class: 'fzb-card-body' }, h('p', { class: 'fzb-blurb' }, 'Loading…'));
    const m = modal(username, body, { actions: [btn('Close', { kind: 'primary', onClick: () => m.close() })] });
    try {
      const p = await net.fetchPlayer(username, week);
      const best = BOARD_IDS.map((b) => p.boards[b]).find((x) => x?.characterId);
      const def = best?.characterId && Object.hasOwn(CHARACTER_BY_ID, best.characterId) ? CHARACTER_BY_ID[best.characterId] : null;
      body.replaceChildren(
        h('div', { class: 'fzb-pc-top' }, avatar(p.avatar, 64), h('div', null, h('b', null, p.username), def ? h('span', { class: 'fzb-pc-fz' }, fuzzyPic(def.id, 22), h('span', null, def.name), rarityTag(def.rarity)) : null)),
        h('p', { class: 'fzb-pc-week' }, `${weekLabel(p.week)}${p.week === data?.current ? ' · so far' : ''}`),
        h('div', { class: 'fzb-pc-boards' }, ...BOARD_IDS.map((b) => {
          const e = p.boards[b];
          return h('div', { class: `fzb-pc-b ${e ? '' : 'none'}` }, icon(BOARD_ICON[b], 16), h('small', null, BOARDS[b].short), h('b', null, e ? formatValue(b, e.value) : '—'), h('span', null, e ? `#${e.rank}` : 'no result'));
        })),
        h('p', { class: 'fzb-pc-career' }, `${p.career.weeks} week${p.career.weeks === 1 ? '' : 's'} on the boards${p.career.podiums ? ` · ${p.career.podiums} podium finish${p.career.podiums === 1 ? '' : 'es'}` : ''}${p.career.wins ? ` · ${p.career.wins} win${p.career.wins === 1 ? '' : 's'}` : ''}`));
    } catch (e) {
      body.replaceChildren(h('p', { class: 'fzb-blurb' }, e instanceof Error ? e.message : 'Could not load this player.'));
    }
  }
  function paintList(): void {
    pinEl.replaceChildren();
    if (!data) return;
    if (!data.rows.length) {
      listEl.replaceChildren(h('li', { class: 'fzb-empty' }, h('b', null, which === 'current' ? 'Be the first!' : 'Nobody played that week'),
        h('span', null, which === 'current' ? 'Nobody is on this board yet — play a game and take the top spot.' : 'There are no results for last week.')));
      return;
    }
    listEl.replaceChildren(...data.rows.map((r) => rowEl(r)));
    if (data.me && data.me.rank > data.rows.length) {
      const mine: net.BoardRow = { rank: data.me.rank, username: accounts.current?.username ?? 'You', avatar: { emoji: accounts.current?.avatar.emoji ?? '🙂', color: accounts.current?.avatar.color ?? '#d6336c', ...(accounts.current?.avatar.image?.includes('/art/friends/') ? { friend: /(f\d{2})\.webp/.exec(accounts.current.avatar.image)?.[1] } : {}) }, value: data.me.value, characterId: data.me.characterId, you: true };
      pinEl.replaceChildren(h('div', { class: 'fzb-gap', 'aria-hidden': 'true' }, '· · ·'), h('ol', { class: 'fzb-list pinned' }, rowEl(mine, true)));
    }
  }
  function paintMine(): void {
    mineEl.replaceChildren();
    if (!compete) return;
    const t = data?.me ? tierOf(data.me.rank) : null;
    if (data?.me) {
      mineEl.append(h('div', { class: 'fzb-me' },
        h('div', { class: 'fzb-me-rank' }, h('small', null, which === 'current' ? 'Your place' : 'Your final place'), h('b', null, `#${data.me.rank}`)),
        h('div', { class: 'fzb-me-val' }, h('small', null, BOARDS[board].title), h('b', null, formatValue(board, data.me.value))),
        h('div', { class: 'fzb-me-fz' }, fuzzyPic(data.me.characterId, 34)),
        t ? h('span', { class: 'fzb-me-tier' }, which === 'current' ? `On track for ${TIER_DEFS[t].blurb}` : TIER_DEFS[t].blurb) : null));
    } else if (data && which === 'current') {
      mineEl.append(h('div', { class: 'fzb-me none' }, icon('gamepad', 20), h('span', null, board === 'fastest' ? 'Fill all 5 nests of level 1 without losing a life to get on this board.' : 'Play a game to get on the board.'),
        h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => ctx.close() }, 'Play')));
    }
  }

  // ---------- notices: sign-in, offline, claim ----------
  function paintNotice(extra?: Node | null): void {
    noticeEl.replaceChildren();
    if (!cloudEnabled) noticeEl.append(h('div', { class: 'fzb-card calm' }, icon('lock', 20), h('div', null, h('b', null, 'Boards need an online account'), h('span', null, 'Weekly boards are not switched on in this version of Fuzzies.'))));
    else if (isGuest) noticeEl.append(h('div', { class: 'fzb-card' }, icon('user', 20), h('div', null, h('b', null, 'Sign in to compete'), h('span', null, 'Anyone can watch. Save your Fuzzies account to put your own scores on the boards and win rewards.')),
      h('a', { class: 'btn btn-primary btn-sm', href: '#/profile' }, 'Sign in')));
    if (extra) noticeEl.append(extra);
  }

  async function paintClaim(): Promise<void> {
    if (!compete) return;
    const weeks = await net.claimableDetail(true);
    if (closed || !weeks.length) return;
    const items = weeks.flatMap((w) => w.boards.map((b) => ({ week: w.week, ...b })));
    const best = items.reduce((m, i) => (i.rank < m.rank ? i : m), items[0]);
    const trophyCount = items.length;
    const btnEl = h('button', { class: 'btn btn-primary', type: 'button' }, icon('gift', 18), h('span', null, 'Collect rewards'));
    const card = h('div', { class: 'fzb-card claim', role: 'region', 'aria-label': 'Rewards ready' },
      h('div', { class: 'fzb-trophy', 'aria-hidden': 'true' }, icon('trophy', 26)),
      h('div', null, h('b', null, weeks.length === 1 ? 'Last week’s rewards are ready!' : 'Rewards from past weeks are ready!'),
        h('span', null, `You finished #${best.rank} for ${BOARDS[best.board].title}${trophyCount > 1 ? ` and placed on ${trophyCount - 1} more board${trophyCount > 2 ? 's' : ''}` : ''}.`)),
      btnEl);
    paintNotice(card);
    btnEl.addEventListener('click', async () => {
      btnEl.disabled = true;
      btnEl.classList.add('busy');
      const got = await net.claimLastWeek();
      if (closed) return;
      if (!got.length) { btnEl.disabled = false; btnEl.classList.remove('busy'); card.append(h('p', { class: 'fzb-err', role: 'status' }, 'Could not collect right now — check your connection and try again.')); return; }
      showCollected(card, got);
      ctx.equipChanged();
      if (store.pendingCount()) {
        try { const { celebrateAll } = await import('./celebrate'); await celebrateAll(root, { equipChanged: () => ctx.equipChanged(), go: (t) => ctx.go(t) }); } catch (e) { console.error(e); }
      }
    });
  }
  function showCollected(card: HTMLElement, got: net.ClaimedItem[]): void {
    const coinsGot = got.filter((g) => g.fresh).reduce((n, g) => n + g.reward.coins, 0);
    const chips: HTMLElement[] = [];
    for (const g of got) chips.push(h('li', { class: `fzb-got tier-${g.tier}`, title: trophyName(g.reward.trophy) }, icon('trophy', 15), h('span', null, `${TIER_DEFS[g.tier].blurb} · ${BOARDS[g.board].title}`)));
    for (const id of new Set(got.flatMap((g) => g.reward.characters))) chips.push(h('li', { class: 'fzb-got' }, fuzzyPic(id, 18), h('span', null, fuzzyName(id))));
    for (const id of new Set(got.flatMap((g) => g.reward.cosmetics))) chips.push(h('li', { class: 'fzb-got' }, h('span', { 'aria-hidden': 'true' }, COSMETIC_BY_ID[id]?.icon ?? '✨'), h('span', null, COSMETIC_BY_ID[id]?.name ?? id)));
    if (coinsGot) chips.push(h('li', { class: 'fzb-got' }, coinMark(16), h('span', null, `+${coinsGot.toLocaleString('en')} coins`)));
    card.classList.add('claimed');
    card.replaceChildren(h('div', { class: 'fzb-trophy pop', 'aria-hidden': 'true' }, icon('trophy', 26)),
      h('div', null, h('b', null, 'Rewards collected!'), h('span', null, 'They are in your Locker, your trophies and your coin purse.'), h('ul', { class: 'fzb-gots' }, ...chips)),
      h('div', { class: 'fzb-sparks', 'aria-hidden': 'true' }, ...Array.from({ length: 14 }, (_, i) => h('i', { style: `--a:${i * 26}deg;--d:${i % 3}` }))));
  }

  // ---------- rewards panel ----------
  function paintRewards(): void {
    const my = data?.me ? tierOf(data.me.rank) : null;
    rewardsEl.replaceChildren(h('summary', null, icon('gift', 18), h('span', null, 'Weekly rewards'), icon('chevR', 16)),
      h('div', { class: 'fzb-tiers' },
        h('p', null, 'When the week ends, every board pays by your final place. Better places include everything below them.'),
        ...TIERS.map((t: Tier) => {
          const d = TIER_DEFS[t];
          const items: Node[] = [h('span', { class: 'fzb-item' }, icon('trophy', 15), `${d.name} trophy`)];
          for (const id of d.characters) items.push(h('span', { class: 'fzb-item' }, fuzzyPic(id, 18), fuzzyName(id)));
          for (const id of d.cosmetics) items.push(h('span', { class: 'fzb-item' }, h('i', { 'aria-hidden': 'true' }, COSMETIC_BY_ID[id]?.icon ?? '✨'), COSMETIC_BY_ID[id]?.name ?? id));
          items.push(h('span', { class: 'fzb-item' }, coinMark(15), `${d.coins.toLocaleString('en')} coins`));
          return h('div', { class: `fzb-tier ${my === t ? 'mine' : ''}` }, h('b', null, t === 1 ? '1st place' : `Top ${t}`), h('div', { class: 'fzb-items' }, items));
        })));
  }

  // ---------- loading ----------
  function skeleton(): void {
    listEl.replaceChildren(...Array.from({ length: 6 }, () => h('li', { class: 'fzb-row skel', 'aria-hidden': 'true' }, h('span', { class: 'fzb-rank' }), h('span', { class: 'fzb-av sk' }), h('span', { class: 'fzb-who' }, h('b', null, ' '), h('small', null, ' ')), h('span', { class: 'fzb-val' }))));
    pinEl.replaceChildren();
  }
  async function load(quiet = false): Promise<void> {
    const my = ++loadId;
    if (!quiet) { skeleton(); weekEl.textContent = '…'; }
    try {
      const d = await net.fetchBoard(board, which, 25);
      if (my !== loadId || closed) return;
      data = d;
      offset = d.now - Date.now();
      if (which === 'current' && d.week !== d.current) which = 'current';
      weekEl.textContent = `${weekLabel(d.week)}`;
      paintClock(); paintMine(); paintList(); paintRewards();
    } catch (e) {
      if (my !== loadId || closed) return;
      data = null;
      listEl.replaceChildren(h('li', { class: 'fzb-empty calm' }, icon('lock', 22), h('b', null, 'Can’t reach the boards right now'), h('span', null, e instanceof Error ? e.message : 'Check your internet and try again.'),
        h('button', { class: 'btn btn-soft btn-sm', type: 'button', onclick: () => void load() }, 'Try again')));
      mineEl.replaceChildren(); pinEl.replaceChildren();
    }
  }

  paintToggle(); paintTabs(); paintNotice(); paintRewards();
  void load();
  void paintClaim();
  void net.flushPending();
  timer = window.setInterval(paintClock, 30_000);
  return () => { closed = true; clearInterval(timer); root.classList.remove('fzb-root'); };
};
