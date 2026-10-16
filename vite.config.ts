import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * In `npm run dev`, answer /api/* with the same functions Vercel runs (api/*.ts), so the whole app
 * including accounts works locally. Needs DATABASE_URL in .env.local (see BACKEND.md).
 */
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'fuzzies-dev-api',
    configureServer(server: ViteDevServer) {
      for (const k of ['DATABASE_URL', 'POSTGRES_URL', 'AUTH_SECRET']) if (env[k] && !process.env[k]) process.env[k] = env[k];
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const m = /^\/api\/([a-z]+)(?:[?#].*)?$/.exec(req.url ?? '');
        if (!m) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.ts`);
          const fn = mod[req.method ?? 'GET'];
          if (typeof fn !== 'function') { res.statusCode = 405; res.end(); return; }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          const request = new Request(`http://localhost${req.url}`, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined });
          const out: Response = await fn(request);
          res.statusCode = out.status;
          out.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await out.arrayBuffer()));
        } catch (e) {
          console.error(e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Dev API crashed — see the terminal.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env } as Record<string, string>;
  // Cloud accounts are on when a database is connected (Vercel's Neon integration sets DATABASE_URL).
  // Only this yes/no reaches the app — the database address and password never do.
  const cloud = !!(env.DATABASE_URL || env.POSTGRES_URL || env.VITE_CLOUD === '1') && env.VITE_CLOUD !== '0';
  return {
    base: './',
    // __BUILD__: when this version was built (shown in Settings → about, so it's easy to tell which version a phone is running)
    define: { __CLOUD__: JSON.stringify(cloud), __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC') },
    plugins: [devApi(env)],
    build: { outDir: 'dist', target: 'es2022', chunkSizeWarningLimit: 1500 },
  };
});
