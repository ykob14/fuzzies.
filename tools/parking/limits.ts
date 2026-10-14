/** timed: a calm budget for a person who has to think (≈ 20 s + 5 s per optimal move); limited: the optimal moves plus a fair margin */
export const limitFor = (t: string, o: number): number | undefined => (t === 't' ? Math.round((20 + o * 5) / 5) * 5 : t === 'm' ? o + Math.max(3, Math.ceil(o * 0.5)) : undefined);
