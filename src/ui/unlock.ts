/** The "unlock with Fuzzies" dialog shared by templates, packs, fonts and themes. */
import { h, btn, modal, toast, fuzzyMark } from './dom';
import { rewards } from '../core/rewards';

export function unlockDialog(item: { id: string; name: string; cost: number; kind: string; preview?: Node }, onUnlocked?: () => void): void {
  const bal = rewards.balance();
  const enough = bal >= item.cost;
  const body = h('div', { class: 'unlock' },
    item.preview ? h('div', { class: 'unlock-preview' }, item.preview) : h('div', { class: 'unlock-preview' }, fuzzyMark(84)),
    h('p', { class: 'unlock-kind' }, item.kind),
    h('div', { class: 'unlock-cost' }, fuzzyMark(26), h('b', null, String(item.cost)), h('span', null, 'Fuzzies')),
    h('p', { class: 'muted' }, enough
      ? `You have ${bal} Fuzzies. Unlocking keeps it on your account forever.`
      : `You have ${bal} Fuzzies — ${item.cost - bal} more to go! Take a break and collect them in Fuzzy Crossing.`));
  const m = modal(`Unlock ${item.name}`, body, {
    actions: enough
      ? [btn('Not now', { kind: 'ghost', onClick: () => m.close() }), btn(`Unlock for ${item.cost}`, { kind: 'primary', icon: 'unlock', onClick: () => {
          if (rewards.unlock(item.id, item.cost)) { toast(`${item.name} unlocked!`, 'good'); m.close(); onUnlocked?.(); }
        } })]
      : [btn('Later', { kind: 'ghost', onClick: () => m.close() }), btn('Play Fuzzy Crossing', { kind: 'primary', icon: 'gamepad', onClick: () => { m.close(); location.hash = '#/play'; } })],
  });
}
