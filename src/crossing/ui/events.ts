/**
 * Events screen: the event that is on (countdown, its own Fuzzy, challenges with progress and Claim, keepsakes), the calendar of what is
 * coming, and the collection of everything earned in past events. Rules and data: events.ts / eventData.ts; this file only draws.
 */
import { h, toast } from '../../ui/dom';
import type { PanelOpen } from '../hub';
import { EVENT_NAME, RARITY_COLOR, type EventId } from '../characters';
import { equipCosmetic, hasCharacter, save } from '../store';
import { claimChallenge } from '../eventsLive';
import {
  EVENTS, EVENT_IDS, allKeepsakes, challengeStates, challengesOf, claimable, eventFuzzy, fuzzyStatus, keepsakeStates, nextOccurrence, occKey, occurrenceAt, occurrenceOf,
  parseKey, phaseOf, tokensOf, activeOccurrences, type ChallengeState, type KeepsakeState, type Occurrence, setOf,
} from '../events';
import { countdown, inDays, now as clockNow, EVENT_ORDER } from '../shopData';
import { coinAmount, rarityTag } from './kit';
import { characterPortrait, cosmeticBadge } from './portrait';
import './events.css';

type Tab = 'now' | 'calendar' | 'collection';
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dm = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MONTH[d.getMonth()]}`; };
const range = (o: Occurrence): string => `${dm(o.start)} – ${dm(o.endsAt - 1)}`;
const evStyle = (id: EventId): string => `--ev:${EVENTS[id].theme.palette[0]};--ev-deep:${EVENTS[id].theme.palette[1]};--ev-soft:${EVENTS[id].theme.palette[2]}`;

export const open: PanelOpen = (ctx, focus) => {
  ctx.title('Events');
  const t = (): number => clockNow();
  let tab: Tab = 'now';
  const wanted = focus && focus.to === 'events' && focus.id && (EVENT_IDS as string[]).includes(focus.id) ? (focus.id as EventId) : null;
  let selected: EventId | null = wanted;
  let openCal: EventId | null = wanted && !occurrenceAt(wanted, t()) ? wanted : null;
  if (wanted && !occurrenceAt(wanted, t())) tab = 'calendar';
  const body = h('div', { class: 'evx' });
  ctx.root.replaceChildren(body);

  async function celebrate(): Promise<void> {
    try { const m = await import('./celebrate'); await m.celebrateAll(ctx.root, { equipChanged: ctx.equipChanged, go: ctx.go }); } catch (e) { console.error(e); }
  }
  function claim(key: string, chId: string, label: string): void {
    const r = claimChallenge(key, chId);
    if (!r) { toast('Already claimed', 'info', 1400); return; }
    toast(`${label}: +${r.coins} coins · +${r.xp} Pass XP${r.tokens ? ` · +${r.tokens} token` : ''}`, 'good', 2800);
    draw();
    void celebrate().then(draw);
  }

  // ───────── pieces ─────────
  const portraitOf = (id: EventId, size: number, dim: boolean): HTMLElement => {
    const f = eventFuzzy(id)!;
    const p = characterPortrait(f, size);
    if (dim) p.classList.add('evx-dim');
    return p;
  };
  function chip(text: string, cls = ''): HTMLElement { return h('span', { class: `evx-chip ${cls}` }, text); }

  function challengeCard(c: ChallengeState, key: string, id: EventId): HTMLElement {
    const pct = Math.round((c.progress / c.def.target) * 100);
    const ready = c.done && !c.claimed;
    const reward = h('small', { class: 'evx-reward' }, coinAmount(c.def.coins, 14), h('span', null, ` · +${c.def.xp} XP`), c.def.tokens ? chip(`🎟 +${c.def.tokens}`, 'tok') : null,
      c.def.finale ? chip(`${eventFuzzy(id)?.name ?? 'Event Fuzzy'}`, 'fz') : null);
    const btnEl = h('button', { class: 'evx-claim', type: 'button', disabled: !ready, onclick: () => claim(key, c.def.id, c.def.text) }, c.claimed ? 'Claimed ✓' : ready ? 'Claim' : c.def.finale ? `${c.progress} / ${c.def.target}` : `${c.progress} / ${c.def.target}`);
    return h('article', { class: `evx-card${ready ? ' ready' : ''}${c.claimed ? ' claimed' : ''}${c.def.finale ? ' finale' : ''}`, 'data-challenge': c.def.id },
      h('span', { class: 'evx-ic' }, c.def.icon),
      h('div', { class: 'evx-t' }, h('b', null, c.def.text), h('div', { class: 'evx-bar', role: 'progressbar', 'aria-valuenow': String(c.progress), 'aria-valuemax': String(c.def.target) }, h('i', { style: `width:${pct}%` })), reward),
      btnEl);
  }

  function keepsakeTile(k: KeepsakeState, live: boolean): HTMLElement {
    const s = save();
    const worn = s.equipped[k.cosmetic.slot] === k.id;
    const status = k.owned ? `Earned in ${EVENT_NAME[k.event]} ${k.year}` : live ? k.how : `Only in ${EVENT_NAME[k.event]} ${k.year}`;
    const tile = h('div', { class: `evx-keep${k.owned ? ' owned' : ''}`, 'data-keepsake': k.id, style: `--rar:${RARITY_COLOR[k.cosmetic.rarity]}` },
      cosmeticBadge(k.cosmetic, 52),
      h('b', null, k.cosmetic.name),
      h('small', null, status),
      k.owned
        ? h('button', { class: 'evx-wear', type: 'button', disabled: worn, onclick: () => { equipCosmetic(k.id); ctx.equipChanged(); toast(`${k.cosmetic.name} equipped`, 'good', 1500); draw(); } }, worn ? 'Wearing' : 'Wear')
        : h('span', { class: 'evx-lock', 'aria-label': 'Not earned yet' }, '🔒'));
    return tile;
  }

  // ───────── NOW ─────────
  function nowTab(): HTMLElement {
    const s = save(), active = activeOccurrences(t());
    const wrap = h('div', { class: 'evx-sec' });
    // finished challenges from events that are over but still waiting to be claimed
    const pending = Object.keys(s.events).filter((k) => !active.some((o) => o.key === k) && claimable(s, k).length);
    if (!active.length) {
      const next = EVENT_ORDER.map((id) => nextOccurrence(id, t())).filter((o): o is Occurrence => !!o).sort((a, b) => a.startDay - b.startDay)[0];
      wrap.append(h('section', { class: 'evx-empty' },
        h('span', { class: 'evx-empty-ic' }, next ? EVENTS[next.id].theme.icon : '🗓️'),
        h('b', null, 'No event right now'),
        next ? h('p', null, `${EVENT_NAME[next.id]} starts ${inDays(t(), next.start)} (${dm(next.start)}). Each event has its own challenges, keepsakes and a Fuzzy you can only earn while it is on.`) : h('p', null, 'The next event dates are not published yet. New ones come every year.'),
        h('button', { class: 'evx-link', type: 'button', onclick: () => { tab = 'calendar'; draw(); } }, 'See the calendar')));
    } else {
      if (!selected || !active.some((o) => o.id === selected)) selected = active[0].id;
      if (active.length > 1) wrap.append(h('div', { class: 'evx-chips', role: 'tablist' }, ...active.map((o) => h('button', { type: 'button', role: 'tab', class: `evx-pick${selected === o.id ? ' on' : ''}`, style: evStyle(o.id), onclick: () => { selected = o.id; draw(); } }, `${EVENTS[o.id].theme.icon} ${EVENT_NAME[o.id]}`))));
      const o = active.find((x) => x.id === selected)!;
      wrap.append(liveEvent(o));
    }
    if (pending.length) {
      wrap.append(h('section', { class: 'evx-past' }, h('h3', null, 'Waiting for you'), h('p', { class: 'evx-note' }, 'You finished these before the event ended — claim them any time.'),
        ...pending.map((k) => { const p = parseKey(k)!; return h('div', { class: 'evx-list' }, h('div', { class: 'evx-subhead' }, `${EVENT_NAME[p.id]} ${p.year}`), ...challengeStates(s, p.id, p.year).filter((c) => c.done && !c.claimed).map((c) => challengeCard(c, k, p.id))); })));
    }
    return wrap;
  }

  function liveEvent(o: Occurrence): HTMLElement {
    const s = save(), def = EVENTS[o.id], key = o.key, states = challengeStates(s, o.id, o.year);
    const tokens = tokensOf(s, key), claimedN = states.filter((c) => !c.def.finale && c.claimed).length, total = states.filter((c) => !c.def.finale).length;
    const f = eventFuzzy(o.id)!, fs = fuzzyStatus(s, o.id, t());
    const hero = h('section', { class: 'evx-hero', style: evStyle(o.id), 'data-event': o.id },
      h('span', { class: 'evx-hero-ic', 'aria-hidden': 'true' }, def.theme.icon),
      h('div', { class: 'evx-hero-t' },
        h('small', null, `Live now · ${o.year}`),
        h('h2', null, EVENT_NAME[o.id]),
        h('p', null, def.theme.blurb),
        h('div', { class: 'evx-count' }, h('b', { 'data-countdown': String(o.endsAt) }, `Ends in ${countdown(o.endsAt - t())}`), h('span', null, ` · ${range(o)}`))),
      h('div', { class: 'evx-tokens', title: 'Event tokens: one for most finished challenges' }, h('b', null, `🎟 ${tokens}`), h('small', null, 'tokens')));
    const fuzzy = h('section', { class: `evx-fuzzy${hasCharacter(f.id) ? ' owned' : ''}`, style: evStyle(o.id), 'data-fuzzy': f.id },
      portraitOf(o.id, 72, !hasCharacter(f.id)),
      h('div', { class: 'evx-fuzzy-t' },
        h('small', null, 'Event Fuzzy'),
        h('b', null, f.name), rarityTag(f.rarity),
        h('p', null, f.tagline),
        h('em', null, fs.state === 'owned' ? `✓ ${fs.text}` : `${claimedN} of ${total} challenges done · ${fs.text}`)),
      hasCharacter(f.id) ? h('button', { class: 'evx-link', type: 'button', onclick: () => ctx.go({ to: 'locker', id: f.id }) }, 'See it') : null);
    const keeps = keepsakeStates(s, o.id, o.year);
    return h('div', { class: 'evx-live' }, hero, fuzzy,
      h('h3', null, 'Challenges'),
      h('div', { class: 'evx-list' }, ...states.map((c) => challengeCard(c, key, o.id))),
      h('p', { class: 'evx-note' }, `Counts what you do in Fuzzy Crossing while ${EVENT_NAME[o.id]} is on. ${def.theme.item.plural.charAt(0).toUpperCase()}${def.theme.item.plural.slice(1)} pop up on the board now and then.`),
      keeps.length ? h('h3', null, `${EVENT_NAME[o.id]} ${o.year} keepsakes`) : null,
      keeps.length ? h('div', { class: 'evx-grid' }, ...keeps.map((k) => keepsakeTile(k, true))) : h('p', { class: 'evx-note' }, `No keepsakes for ${EVENT_NAME[o.id]} ${o.year} — the challenges and the event Fuzzy still count.`),
      keeps.length ? h('p', { class: 'evx-note' }, `Keepsakes are earned only during ${EVENT_NAME[o.id]} ${o.year}. They stay in your Locker forever, are never sold, and next year brings new ones.`) : null);
  }

  // ───────── CALENDAR ─────────
  function calendarTab(): HTMLElement {
    const s = save();
    const rows = EVENT_ORDER.map((id) => { const live = occurrenceAt(id, t()); return { id, o: live ?? nextOccurrence(id, t()), live: !!live }; })
      .sort((a, b) => (a.live === b.live ? (a.o?.startDay ?? 1e9) - (b.o?.startDay ?? 1e9) : a.live ? -1 : 1));
    return h('div', { class: 'evx-sec' }, h('div', { class: 'evx-list' }, ...rows.map(({ id, o, live }) => {
      const f = eventFuzzy(id)!, owned = hasCharacter(f.id), expanded = openCal === id;
      const when = o ? (live ? `On now · ends in ${countdown(o.endsAt - t())}` : `${inDays(t(), o.start).replace(/^in /, 'In ')} · ${range(o)} ${o.year}`) : 'Dates not published yet';
      return h('article', { class: `evx-cal${live ? ' live' : ''}`, style: evStyle(id), 'data-cal': id },
        h('button', { class: 'evx-cal-head', type: 'button', 'aria-expanded': String(expanded), onclick: () => { if (live) { selected = id; tab = 'now'; } else openCal = expanded ? null : id; draw(); } },
          h('span', { class: 'evx-ic big' }, EVENTS[id].theme.icon),
          h('div', { class: 'evx-t' }, h('b', null, EVENT_NAME[id]), h('small', null, when), h('small', { class: 'evx-fz' }, owned ? `✓ ${f.name} — yours` : `Earn ${f.name}`)),
          portraitOf(id, 44, !owned)),
        expanded ? h('div', { class: 'evx-cal-body' },
          h('p', null, fuzzyStatus(s, id, t()).text),
          h('b', null, 'Challenges'),
          h('ul', null, ...challengesOf(id).map((c) => h('li', null, `${c.icon} ${c.text}`))),
          o && setOf(occKey(id, o.year)).length ? h('p', { class: 'evx-note' }, `${EVENT_NAME[id]} ${o.year} keepsakes: ${setOf(occKey(id, o.year)).map((k) => k.name).join(', ')}.`) : null) : null);
    })));
  }

  // ───────── COLLECTION ─────────
  function collectionTab(): HTMLElement {
    const s = save();
    const all = allKeepsakes(s);
    const groups = new Map<string, KeepsakeState[]>();
    for (const k of all) { const key = occKey(k.event, k.year); (groups.get(key) ?? groups.set(key, []).get(key)!).push(k); }
    const keys = [...groups.keys()].sort((a, b) => (parseKey(b)!.year - parseKey(a)!.year) || a.localeCompare(b));
    const ownedN = all.filter((k) => k.owned).length;
    return h('div', { class: 'evx-sec' },
      h('h3', null, 'Event Fuzzies'),
      h('div', { class: 'evx-fz-grid' }, ...EVENT_ORDER.map((id) => {
        const f = eventFuzzy(id)!, owned = hasCharacter(f.id), st = fuzzyStatus(s, id, t());
        return h('button', { class: `evx-fz-card${owned ? ' owned' : ''}`, type: 'button', style: evStyle(id), 'data-fuzzy': f.id, onclick: () => ctx.go({ to: 'locker', id: f.id }) },
          portraitOf(id, 56, !owned), h('b', null, f.name), h('small', null, owned ? `✓ ${EVENT_NAME[id]}` : st.state === 'now' ? `${EVENT_NAME[id]} · earn it now` : `${EVENT_NAME[id]} · next ${st.startsAt ? dm(st.startsAt) : 'year'}`));
      })),
      h('h3', null, `Keepsakes · ${ownedN} of ${all.length}`),
      h('p', { class: 'evx-note' }, 'Each event run has its own keepsakes, earned only while it is on. Ones you earned stay in your Locker forever; ones you missed are not sold later — a new set comes next year.'),
      ...keys.map((k) => {
        const p = parseKey(k)!, o = occurrenceOf(p.id, p.year), ph = o ? phaseOf(o, t()) : 'over';
        const tag = ph === 'live' ? 'On now' : ph === 'upcoming' ? `Coming ${o ? dm(o.start) : p.year}` : 'Ended';
        return h('section', { class: 'evx-group', 'data-group': k },
          h('div', { class: 'evx-subhead' }, `${EVENTS[p.id].theme.icon} ${EVENT_NAME[p.id]} ${p.year}`, chip(tag, ph === 'live' ? 'live' : '')),
          h('div', { class: 'evx-grid' }, ...groups.get(k)!.map((x) => keepsakeTile(x, ph === 'live'))));
      }));
  }

  // ───────── frame ─────────
  const tabs = h('div', { class: 'seg seg-sm evx-tabs', role: 'tablist' });
  const main = h('div', { class: 'evx-main' });
  body.append(tabs, main);
  function draw(): void {
    const dot = Object.keys(save().events).some((k) => claimable(save(), k).length);
    tabs.replaceChildren(...(['now', 'calendar', 'collection'] as Tab[]).map((x) => h('button', { type: 'button', role: 'tab', class: tab === x ? 'on' : '', 'aria-selected': String(tab === x), onclick: () => { tab = x; draw(); main.scrollTop = 0; ctx.root.scrollTop = 0; } },
      x === 'now' ? 'Now' : x === 'calendar' ? 'Calendar' : 'Collection', x === 'now' && dot ? h('i', { class: 'evx-dot' }) : null)));
    main.replaceChildren(tab === 'now' ? nowTab() : tab === 'calendar' ? calendarTab() : collectionTab());
  }
  draw();
  let raf = 0;
  const on = (): void => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
  addEventListener('fz:crossing', on);
  const shown = activeOccurrences(t()).map((o) => o.key).join();
  const tick = setInterval(() => { for (const el of body.querySelectorAll<HTMLElement>('[data-countdown]')) el.textContent = `Ends in ${countdown(Number(el.dataset.countdown) - t())}`; if (activeOccurrences(t()).map((o) => o.key).join() !== shown) draw(); }, 30_000);
  return () => { removeEventListener('fz:crossing', on); clearInterval(tick); cancelAnimationFrame(raf); };
};
