/* Launch screen — loaded right after its markup in index.html (kept out of the page so the site can forbid inline scripts). */
// Launch screen (runs before the app loads). Shows once per visit; tap to skip.
// The owner's Fuzzy pops in, bounces, winks and giggles (synthesised sound); the background follows your app icon (src/core/appicon.ts).
(function () {
  var sp = document.getElementById('splash');
  var get = function (store, k) { try { return store.getItem(k); } catch (e) { return null; } };
  if (get(sessionStorage, 'fz.splashed') === '1' || location.hash.indexOf('#/s/') === 0) { sp.remove(); return; }
  try { sessionStorage.setItem('fz.splashed', '1'); } catch (e) {}
  // the owner's Fuzzy (public/art/fuzzy-hero*.webp) is the launch picture; the app-icon colours still tint the background
  var look = {};
  try { look = JSON.parse(get(localStorage, 'fz.look') || '{}'); } catch (e) {}
  if (look.bg) sp.style.setProperty('--sp-bg', look.bg);
  if (look.dark === false) sp.classList.add('light');
  var meta = document.querySelector('meta[name="theme-color"]');
  sp.dataset.themeColor = meta.content;
  meta.content = look.bg || '#18171c';
  var img = document.getElementById('sp-img');
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) sp.classList.add('still');
  // sound: off when the person switched sounds off in Settings
  var muted = false;
  try { var sid = get(localStorage, 'fz.session'), me = sid && JSON.parse(get(localStorage, 'fz.accounts') || '{}')[sid];
    muted = !!(me && me.settings && me.settings.sound === false); } catch (e) {}

  // ---- little synth: a pop, a sparkle and a giggle (no sound files) ----
  var ac = null, played = false;
  function ctx() { if (!ac) { var A = window.AudioContext || window.webkitAudioContext; if (A) ac = new A(); } return ac; }
  function tone(type, f0, f1, t, dur, vol, at) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, at + t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, at + t + dur);
    g.gain.setValueAtTime(0.0001, at + t); g.gain.exponentialRampToValueAtTime(vol, at + t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + t + dur);
    o.connect(g).connect(ac.destination); o.start(at + t); o.stop(at + t + dur + 0.02);
  }
  function giggle(t, at) { // "hee-hee-hee": short bright syllables through a vowel filter
    for (var k = 0; k < 4; k++) {
      var o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), s0 = at + t + k * 0.11, p = 620 + k * 40 - (k === 3 ? 90 : 0);
      o.type = 'sawtooth'; o.frequency.setValueAtTime(p * 1.15, s0); o.frequency.exponentialRampToValueAtTime(p, s0 + 0.08);
      f.type = 'bandpass'; f.frequency.value = 2300; f.Q.value = 3.2;
      g.gain.setValueAtTime(0.0001, s0); g.gain.exponentialRampToValueAtTime(0.16, s0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, s0 + 0.085);
      o.connect(f).connect(g).connect(ac.destination); o.start(s0); o.stop(s0 + 0.1);
    }
  }
  // the whole greeting, timed to the animation; `from` = seconds already past (a late start skips the pop)
  function greet(from) {
    if (played || muted) return; var c = ctx(); if (!c || c.state !== 'running') return;
    played = true; var at = c.currentTime;
    if (from > 0.3) { // the browser held the sound until a tap: the sparkle, wink and giggle play straight away
      [1568, 2093, 2637, 3136].forEach(function (f, i) { tone('triangle', f, 0, 0.02 + i * 0.07, 0.3, 0.07, at); });
      tone('sine', 1760, 2349, 0.2, 0.14, 0.12, at); tone('sine', 2349, 0, 0.32, 0.22, 0.09, at); giggle(0.42, at); return;
    }
    tone('sine', 260, 820, 0.05, 0.18, 0.22, at);                                                // pop in
    [1568, 2093, 2637, 3136].forEach(function (f, i) { tone('triangle', f, 0, 0.55 + i * 0.09, 0.32, 0.07, at); }); // sparkles
    tone('sine', 1760, 2349, 1.62, 0.14, 0.12, at); tone('sine', 2349, 0, 1.74, 0.22, 0.09, at); // the wink "bling"
    giggle(1.95, at);
  }
  var t0 = 0;
  function tryAudio() { var c = ctx(); if (!c) return; if (c.state === 'running') greet(t0 ? (performance.now() - t0) / 1000 : 0); else c.resume().then(function () { greet(t0 ? (performance.now() - t0) / 1000 : 0); }, function () {}); }

  var done = false, started = false;
  function exit() {
    if (done) return;
    done = true;
    meta.content = sp.dataset.themeColor; // the app's theme colour (set by applyTheme while we were showing)
    sp.classList.add('out');
    setTimeout(function () { sp.remove(); }, 600);
  }
  function wink() { if (!still && !done) { sp.classList.add('winking'); setTimeout(function () { sp.classList.remove('winking'); }, 520); } }
  function start() {
    if (started) return;
    started = true; t0 = performance.now();
    sp.classList.add('go');
    try { if (!muted) tryAudio(); } catch (e) {} // most browsers only allow sound after a tap — then it plays on the first tap
    setTimeout(wink, 1650);
    setTimeout(exit, still ? 1300 : 3000);
  }
  if (img.complete && img.naturalWidth) start(); else { img.onload = start; img.onerror = start; setTimeout(start, 600); }
  // a tap: if the browser held the sound back, it plays now (with a wink) and the screen leaves a moment later; otherwise skip
  sp.addEventListener('pointerdown', function () {
    if (!played && !muted) { try { tryAudio(); } catch (e) {} wink(); setTimeout(exit, 900); } else exit();
  });
  addEventListener('keydown', exit, { once: true });
})();

// the web fonts load without blocking the first paint (no inline handler, so the strict security policy allows it)
(function () {
  var l = document.getElementById('fz-fonts');
  if (!l) return;
  var on = function () { l.media = 'all'; };
  if (l.sheet) on(); else l.addEventListener('load', on);
})();
