/** Fuzzies the server adds to an account (paid packs, opened gifts) — kept light: used by every profile download. */
import { q } from './db.js';

/** Add any waiting Fuzzies to the account's cloud profile, in one step (the app's sync merges them in on every device). */
export async function applyCredits(userId: string): Promise<number> {
  const { rows } = await q<{ n: number }>(`
    with c as (
      update fz_credits set applied_at = now()
      where user_id = $1 and applied_at is null and exists (select 1 from fz_profiles where user_id = $1)
      returning amount
    ), s as (select coalesce(sum(amount), 0)::int as n from c)
    update fz_profiles p set
      data = jsonb_set(jsonb_set(p.data, '{fuzzies}', to_jsonb(coalesce((p.data->>'fuzzies')::int, 0) + s.n)),
                       '{totalFuzzies}', to_jsonb(coalesce((p.data->>'totalFuzzies')::int, 0) + s.n)),
      updated_at = greatest(p.updated_at + 1, (extract(epoch from clock_timestamp()) * 1000)::bigint)
    from s where p.user_id = $1 and s.n > 0
    returning s.n`, [userId]);
  return rows[0]?.n ?? 0;
}
