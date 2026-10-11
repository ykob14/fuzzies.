/**
 * "A new version is ready": the app is a single page, so a tab left open keeps running the version it was
 * opened with. Now and then (and whenever you come back to the tab) we peek at the live index.html; if its main
 * script differs from the one running, a small banner offers a one-tap refresh.
 */
const SCRIPT = /assets\/index-[\w-]+\.js/;

export function watchForUpdates(): void {
  const mine = [...document.scripts].map((s) => SCRIPT.exec(s.src)?.[0]).find(Boolean);
  if (!mine) return; // dev server: nothing to compare
  let shown = false;
  const check = async () => {
    if (shown || document.hidden) return;
    try {
      const html = await (await fetch('./index.html', { cache: 'no-store' })).text();
      const live = SCRIPT.exec(html)?.[0];
      if (live && live !== mine) { shown = true; banner(); }
    } catch { /* offline: try again later */ }
  };
  setInterval(check, 120_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void check(); });
  setTimeout(check, 15_000);
}

function banner(): void {
  const el = document.createElement('div');
  el.className = 'update-banner';
  el.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.textContent = 'A new version of Fuzzies is ready ✨';
  const go = document.createElement('button');
  go.type = 'button';
  go.textContent = 'Refresh';
  go.addEventListener('click', () => location.reload());
  const later = document.createElement('button');
  later.type = 'button';
  later.className = 'later';
  later.setAttribute('aria-label', 'Later');
  later.textContent = '✕';
  later.addEventListener('click', () => el.remove());
  el.append(text, go, later);
  document.body.append(el);
}
