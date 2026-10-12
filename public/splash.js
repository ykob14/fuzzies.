/* Launch screen — loaded right after its markup in index.html (kept out of the page so the site can forbid inline scripts). */
// Launch screen (runs before the app loads). Shows once per visit; tap to skip.
// Colours follow your app icon (saved by src/core/appicon.ts); the realistic Fuzzy is saved by src/ui/mascot.ts.
(function () {
  var sp = document.getElementById('splash');
  var get = function (store, k) { try { return store.getItem(k); } catch (e) { return null; } };
  if (get(sessionStorage, 'fz.splashed') === '1' || location.hash.indexOf('#/s/') === 0) { sp.remove(); return; }
  try { sessionStorage.setItem('fz.splashed', '1'); } catch (e) {}
  var look = {}, frames = null;
  try { look = JSON.parse(get(localStorage, 'fz.look') || '{}'); } catch (e) {}
  try { if (!look.color || look.color === 'classic') frames = JSON.parse(get(localStorage, 'fz.splash.frames') || 'null'); } catch (e) {}
  var open = (frames && frames.open) || look.open || './splash-fuzzy.svg';
  var wink = (frames && frames.wink) || look.wink || null;
  if (look.bg) sp.style.setProperty('--sp-bg', look.bg);
  if (look.c) sp.style.setProperty('--sp-c', look.c);
  if (look.dark === false) sp.classList.add('light');
  var meta = document.querySelector('meta[name="theme-color"]');
  sp.dataset.themeColor = meta.content;
  meta.content = look.bg || '#18171c';
  var img = document.getElementById('sp-img');
  if (img.getAttribute('src') !== open) img.src = open;
  if (wink) new Image().src = wink;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) sp.classList.add('still');
  var done = false, started = false;
  function exit() {
    if (done) return;
    done = true;
    meta.content = sp.dataset.themeColor; // the app's theme colour (set by applyTheme while we were showing)
    sp.classList.add('out');
    setTimeout(function () { sp.remove(); }, 600);
  }
  function start() {
    if (started) return;
    started = true;
    sp.classList.add('go');
    if (wink && !still) setTimeout(function () { img.src = wink; setTimeout(function () { img.src = open; }, 380); }, 1650);
    setTimeout(exit, still ? 1100 : 2600);
  }
  if (img.complete && img.naturalWidth) start(); else { img.onload = start; img.onerror = start; setTimeout(start, 450); }
  sp.addEventListener('click', exit);
  addEventListener('keydown', exit, { once: true });
})();

// the web fonts load without blocking the first paint (no inline handler, so the strict security policy allows it)
(function () {
  var l = document.getElementById('fz-fonts');
  if (!l) return;
  var on = function () { l.media = 'all'; };
  if (l.sheet) on(); else l.addEventListener('load', on);
})();
