// a tiny browser stand-in so the store and the account code can run in Node
const mem = new Map<string, string>();
const ls = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = ls; g.sessionStorage = ls;
g.addEventListener = () => undefined; g.removeEventListener = () => undefined; g.dispatchEvent = () => true;
if (!g.CustomEvent) g.CustomEvent = class { constructor(public type: string, public init?: unknown) {} };
export {};
