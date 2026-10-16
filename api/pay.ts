/**
 * Crypto payments and gift boxes (POST { action, ... }). See _lib/pay.ts for how payments are checked.
 *   pay.config                          → { enabled, networks, packs, walletFeeCents, walletGift }
 *   pay.quote  { kind: 'pack'|'wallet', item, network, asset } (logged in) → { payment }
 *   pay.check  { id, tx? } (logged in)  → { payment, state: 'paid'|'pending'|'confirming'|'expired', detail?, gift? }
 *   pay.precheck { id, from } (logged in) → { ok } | { ok: false, short } (not enough for payment + network fee: what to add),
 *                                         or 400 when a smart wallet tries to pay in ETH (only USDC can be matched)
 *   pay.history (logged in)             → { payments } (paid ones, newest first)
 *   gift.list  (logged in)              → { gifts } (unopened)
 *   gift.open  { id } (logged in)       → { amount } — adds the Fuzzies to the account, once
 *   friday.status { day } (logged in)   → { available } — day = the player's local date (YYYY-MM-DD); true on a real Friday not yet claimed
 *   friday.claim  { day } (logged in)   → { amount, already } — a random 50–100 Fuzzies, once per player per Friday
 */
import { db, q } from './_lib/db.js';
import { handle, requireUser, HttpError, clientIp } from './_lib/auth.js';
import { payConfig, createQuote, publicPayment, verifyOnChain, fulfil, applyCredits, isSmartWallet, fundsProblem, isEvm, NETS, type PaymentRow } from './_lib/pay.js';

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** the player's local date as "YYYY-MM-DD" — accepted only when it is a Friday within a day of the server's date (time zones), so only a real Friday can be claimed */
export function fridayDay(v: unknown, now = Date.now()): string | null {
  const m = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v) : null;
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(t);
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null; // 2026-02-30 etc.
  if (d.getUTCDay() !== 5) return null;
  const today = Math.floor(now / 86_400_000) * 86_400_000;
  return Math.abs(t - today) <= 86_400_000 ? m[0] : null;
}

export function POST(req: Request): Promise<Response> {
  return handle(req, async (b) => {
    await db();
    switch (b.action) {
      case 'pay.config':
        return payConfig();
      case 'pay.quote': {
        const u = await requireUser(req);
        const kind = b.kind === 'wallet' ? 'wallet' : b.kind === 'pack' ? 'pack' : null;
        const network = (NETS as string[]).includes(b.network as string) ? (b.network as 'base') : null;
        const asset = ['ETH', 'USDC', 'USDT', 'SOL', 'BTC'].includes(b.asset as string) ? (b.asset as 'ETH') : null;
        if (!kind || !network || !asset) throw new HttpError(400, 'Unknown payment.');
        return { payment: publicPayment(await createQuote(u.id, kind, str(b.item, 64), network, asset, clientIp(req))) };
      }
      case 'pay.check': {
        const u = await requireUser(req);
        const { rows } = await q<PaymentRow>('select * from fz_payments where id = $1 and user_id = $2', [str(b.id, 64), u.id]);
        let p = rows[0];
        if (!p) throw new HttpError(404, 'Payment not found.');
        if (p.status === 'paid') return { payment: publicPayment(p), state: 'paid', ...(await fulfil(p)) };
        const tx = str(b.tx, 100);
        // the blockchain is asked at most once every 4 seconds per payment (protects the providers and the server)
        const { rows: gate } = await q("update fz_payments set checked_at = now() where id = $1 and (checked_at is null or checked_at < now() - interval '4 seconds') returning id", [p.id]);
        if (!gate[0]) return { payment: publicPayment(p), state: 'pending', wait: true };
        if (isEvm(p.network)) {
          if (!tx && p.asset !== 'USDC' && p.asset !== 'USDT') return { payment: publicPayment(p), state: new Date(p.expires_at).getTime() + 60 * 60_000 < Date.now() ? 'expired' : 'pending' };
          if (tx) {
          if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) throw new HttpError(400, 'That transaction id doesn’t look right.');
          const { rows: used } = await q('select 1 from fz_payments where tx = $1 and id <> $2', [tx.toLowerCase(), p.id]);
          if (used[0]) throw new HttpError(409, 'That transaction was already used for another payment.');
          }
        }
        const v = await verifyOnChain(p, tx ? tx.toLowerCase() : undefined);
        if (!v.ok) {
          const expired = v.why === 'pending' && new Date(p.expires_at).getTime() + (p.network === 'bitcoin' ? 60 * 60_000 : 0) < Date.now(); // Bitcoin: explorers can be slow to show a new payment
          return { payment: publicPayment(p), state: expired ? 'expired' : v.why === 'wrong' ? 'pending' : v.why, detail: v.why === 'wrong' ? v.detail : undefined, confirmations: v.confirmations };
        }
        try {
          const { rows: done } = await q<PaymentRow>("update fz_payments set status = 'paid', tx = $2, payer = $3, paid_at = now() where id = $1 and status <> 'paid' returning *", [p.id, isEvm(p.network) ? (v.tx ?? '').toLowerCase() : v.tx, v.payer]);
          if (done[0]) p = done[0];
          else p = (await q<PaymentRow>('select * from fz_payments where id = $1', [p.id])).rows[0];
        } catch (e) {
          if ((e as { code?: string }).code === '23505') throw new HttpError(409, 'That transaction was already used for another payment.');
          throw e;
        }
        return { payment: publicPayment(p), state: 'paid', ...(await fulfil(p)) };
      }
      case 'pay.precheck': {
        const u = await requireUser(req);
        const { rows } = await q<PaymentRow>('select * from fz_payments where id = $1 and user_id = $2', [str(b.id, 64), u.id]);
        if (!rows[0]) throw new HttpError(404, 'Payment not found.');
        const from = str(b.from, 42);
        if (!/^0x[0-9a-fA-F]{40}$/.test(from)) throw new HttpError(400, 'That wallet address doesn’t look right.');
        if (rows[0].asset === 'ETH' && isEvm(rows[0].network) && (await isSmartWallet(rows[0], from)))
          throw new HttpError(400, 'This is a smart wallet — please go back and choose USDC (ETH from smart wallets can’t be matched to your order).');
        // enough for the payment and the network fee? (otherwise the wallet would fail with "insufficient funds")
        const short = await fundsProblem(rows[0], from);
        return short ? { ok: false, short } : { ok: true };
      }
      case 'pay.history': {
        const u = await requireUser(req);
        const { rows } = await q<PaymentRow>("select * from fz_payments where user_id = $1 and status = 'paid' order by paid_at desc limit 50", [u.id]);
        return { payments: rows.map(publicPayment) };
      }
      case 'gift.list': {
        const u = await requireUser(req);
        await applyCredits(u.id); // anything paid while the profile wasn't saved yet
        const { rows } = await q('select id, amount, reason from fz_gifts where user_id = $1 and opened_at is null order by created_at', [u.id]);
        return { gifts: rows };
      }
      case 'gift.open': {
        const u = await requireUser(req);
        const { rows } = await q<{ id: string; amount: number }>('update fz_gifts set opened_at = now() where id = $1 and user_id = $2 and opened_at is null returning id, amount', [str(b.id, 64), u.id]);
        if (!rows[0]) throw new HttpError(404, 'This gift was already opened.');
        await q('insert into fz_credits (id, user_id, amount, reason) values ($1, $2, $3, $4) on conflict (id) do nothing', [rows[0].id, u.id, rows[0].amount, 'gift']);
        await applyCredits(u.id);
        return { amount: rows[0].amount };
      }
      case 'friday.status': {
        const u = await requireUser(req);
        const day = fridayDay(b.day);
        if (!day) return { available: false };
        const { rows } = await q('select 1 from fz_friday where user_id = $1 and day = $2', [u.id, day]);
        return { available: !rows[0] };
      }
      case 'friday.claim': {
        const u = await requireUser(req);
        const day = fridayDay(b.day);
        if (!day) throw new HttpError(400, 'The Friday gift is only here on Fridays.');
        const amount = 50 + Math.floor(Math.random() * 51); // 50–100, chosen here so it can't be edited in the browser
        const { rows } = await q<{ amount: number }>('insert into fz_friday (user_id, day, amount) values ($1, $2, $3) on conflict do nothing returning amount', [u.id, day, amount]);
        if (!rows[0]) return { already: true, amount: 0 };
        await q('insert into fz_credits (id, user_id, amount, reason) values ($1, $2, $3, $4) on conflict (id) do nothing', [`friday:${u.id}:${day}`, u.id, amount, 'friday']);
        await applyCredits(u.id);
        return { already: false, amount };
      }
      default:
        throw new HttpError(400, 'Unknown action.');
    }
  });
}
