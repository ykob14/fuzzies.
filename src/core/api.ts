/**
 * Talks to the Fuzzies backend (the /api functions on Vercel, backed by a Neon database).
 * Cloud accounts are on when the build found a database (see vite.config.ts); otherwise the app keeps
 * everything on the device and never calls the API.
 */
export const cloudEnabled = __CLOUD__;

const TOKEN_KEY = 'fz.token';
export const token = {
  get: (): string => localStorage.getItem(TOKEN_KEY) ?? '',
  set: (t: string): void => localStorage.setItem(TOKEN_KEY, t),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

/** An error from the API: `status` 0 means we couldn't reach it (offline). */
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const loggedOutListeners = new Set<() => void>();
/** Called when the server says the login is no longer valid (password changed elsewhere, account deleted…). */
export function onLoggedOut(fn: () => void): () => void { loggedOutListeners.add(fn); return () => loggedOutListeners.delete(fn); }

export async function api<T = Record<string, unknown>>(endpoint: 'auth' | 'data', action: string, body: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`./api/${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token.get() ? { authorization: `Bearer ${token.get()}` } : {}) },
      body: JSON.stringify({ ...body, action }),
    });
  } catch {
    throw new ApiError(0, 'Can’t reach Fuzzies right now — check your internet and try again.');
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    if (res.status === 401 && token.get() && action !== 'login') { token.clear(); for (const l of loggedOutListeners) l(); }
    if (res.status === 413) throw new ApiError(413, 'This design is too big to sync (too many large photos).');
    throw new ApiError(res.status, data.error || 'Something went wrong — please try again.');
  }
  return data;
}
