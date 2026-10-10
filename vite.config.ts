import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Cloud accounts (Supabase). Only the project URL and the public (anon/publishable) key are ever
  // put into the app; they are safe to ship. Several names are accepted so Vercel's Supabase
  // integration works without renaming anything. Never add the service-role key here.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const first = (...names: string[]) => names.map((n) => env[n]).find((v) => !!v) ?? '';
  const url = first('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
  const key = first('VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');
  return {
    base: './',
    define: { __SUPABASE_URL__: JSON.stringify(url), __SUPABASE_KEY__: JSON.stringify(key) },
    build: { outDir: 'dist', target: 'es2022', chunkSizeWarningLimit: 1500 },
  };
});
