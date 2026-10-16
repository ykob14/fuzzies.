// Node stand-ins for the browser bits the account store touches (import this FIRST in a DOM-free test).
const mem = new Map<string, string>();
export const memory = mem;
const g = globalThis as Record<string, unknown>;
g.localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k) };
g.addEventListener = () => {};
g.removeEventListener = () => {};
g.dispatchEvent = () => true;
g.CustomEvent = class { detail: unknown; constructor(public type: string, init?: { detail?: unknown }) { this.detail = init?.detail; } };
