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

  // ---- the opening jingle: a music-box tune timed to the animation (all synthesised, no sound files) ----
  // pop in → two bouncy "boing"s as the Fuzzy lands → one note per letter of "fuzzies" → a warm chord under the tagline
  // → the wink "bling" → a giggle. A late start (the browser waited for a tap) plays a short version straight away.
  var ac = null, played = false, out = null, echo = null;
  function ctx() {
    if (!ac) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); }
    if (!out) {
      out = ac.createGain(); out.gain.value = 0.85; out.connect(ac.destination);
      // a soft echo makes the bells sparkle
      echo = ac.createDelay(0.5); echo.delayTime.value = 0.19;
      var fb = ac.createGain(); fb.gain.value = 0.28; var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
      var wet = ac.createGain(); wet.gain.value = 0.32;
      echo.connect(lp); lp.connect(fb); fb.connect(echo); lp.connect(wet); wet.connect(out);
    }
    return ac;
  }
  function env(g, at, a, peak, d) { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + a); g.gain.exponentialRampToValueAtTime(0.0001, at + a + d); }
  function tone(type, f0, f1, t, dur, vol, at, wet) {
    var o = ac.createOscillator(), g = ac.createGain(), s0 = at + t;
    o.type = type; o.frequency.setValueAtTime(f0, s0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, s0 + dur);
    env(g, s0, 0.012, vol, dur); o.connect(g); g.connect(out); if (wet) g.connect(echo);
    o.start(s0); o.stop(s0 + dur + 0.05);
  }
  // a music-box / marimba note: a pure tone plus a quiet bell partial, quick decay, into the echo
  function bell(f, t, vol, at) {
    var s0 = at + t, g = ac.createGain();
    env(g, s0, 0.006, vol, 0.55); g.connect(out); g.connect(echo);
    [[1, 1], [4, 0.18], [2.76, 0.08]].forEach(function (h) {
      var o = ac.createOscillator(), gg = ac.createGain(); o.type = 'sine'; o.frequency.value = f * h[0]; gg.gain.value = h[1];
      o.connect(gg); gg.connect(g); o.start(s0); o.stop(s0 + 0.65);
    });
  }
  // a cartoon "boing" when the Fuzzy lands
  function boing(t, at, f) { tone('sine', f * 1.9, f, t, 0.22, 0.13, at); tone('triangle', f * 0.5, f * 0.45, t, 0.16, 0.06, at); }
  // a warm chord that swells under the tagline
  function chord(fs, t, at, len) {
    var s0 = at + t, lp = ac.createBiquadFilter(), g = ac.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 1600; g.gain.setValueAtTime(0.0001, s0);
    g.gain.exponentialRampToValueAtTime(0.09, s0 + 0.28); g.gain.exponentialRampToValueAtTime(0.0001, s0 + len);
    lp.connect(g); g.connect(out); g.connect(echo);
    fs.forEach(function (f, i) { [-4, 4].forEach(function (cents) {
      var o = ac.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = cents;
      o.connect(lp); o.start(s0); o.stop(s0 + len + 0.05);
    }); });
  }
  function giggle(t, at) { // "hee-hee-hee": short bright syllables through a vowel filter
    for (var k = 0; k < 4; k++) {
      var o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), s0 = at + t + k * 0.11, p = 620 + k * 40 - (k === 3 ? 90 : 0);
      o.type = 'sawtooth'; o.frequency.setValueAtTime(p * 1.15, s0); o.frequency.exponentialRampToValueAtTime(p, s0 + 0.08);
      f.type = 'bandpass'; f.frequency.value = 2300; f.Q.value = 3.2;
      g.gain.setValueAtTime(0.0001, s0); g.gain.exponentialRampToValueAtTime(0.16, s0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, s0 + 0.085);
      o.connect(f).connect(g).connect(out); o.start(s0); o.stop(s0 + 0.1);
    }
  }
  // C major, bright: one note per letter of "fuzzies", ending high
  var LETTERS = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1318.5];
  var CHORD = [130.81, 261.63, 329.63, 392, 587.33]; // C3 · C4 E4 G4 · D5 (a soft add9)
  function wink(t, at) { tone('sine', 1760, 2349, t, 0.14, 0.12, at, true); tone('sine', 2349, 0, t + 0.12, 0.22, 0.09, at, true); }
  // the whole greeting, timed to the animation; `from` = seconds already past (a late start plays the short version)
  function greet(from) {
    if (played || muted) return; var c = ctx(); if (!c || c.state !== 'running') return;
    played = true; hint(false); var at = c.currentTime + 0.02;
    if (from > 0.3 || still) { // short version: a quick run up the letters, the chord, the wink and a giggle
      LETTERS.forEach(function (f, i) { bell(f, i * 0.06, 0.11, at); });
      chord(CHORD, 0.3, at, 1.8); wink(0.5, at); giggle(0.72, at); return;
    }
    tone('sine', 260, 820, 0.05, 0.18, 0.2, at);                 // pop in
    boing(0.62, at, 392); boing(1.12, at, 330); boing(1.52, at, 440); // it lands, bounces, lands again
    LETTERS.forEach(function (f, i) { bell(f, 1.02 + i * 0.055, 0.1, at); }); // "f-u-z-z-i-e-s" glides up
    chord(CHORD, 1.5, at, 2.4);                                    // a warm chord under the tagline
    [2093, 2637, 3136].forEach(function (f, i) { tone('triangle', f, 0, 1.45 + i * 0.08, 0.3, 0.05, at, true); }); // sparkles
    wink(1.66, at);                                                // the wink "bling"
    giggle(1.95, at);
    bell(1567.98, 2.55, 0.07, at); bell(2093, 2.7, 0.06, at);      // a last twinkle as the screen fades
  }
  var t0 = 0;
  function tryAudio() { var c = ctx(); if (!c) return; if (c.state === 'running') greet(t0 ? (performance.now() - t0) / 1000 : 0); else c.resume().then(function () { greet(t0 ? (performance.now() - t0) / 1000 : 0); }, function () {}); }

  // browsers keep sound off until the first tap: then a small "Tap for sound" button shows on the launch screen
  var pill = null;
  function hint(on) {
    if (on && !pill && !muted && !played) {
      pill = document.createElement('div'); pill.className = 'sp-sound';
      pill.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Tap for sound</span>';
      sp.appendChild(pill);
    }
    if (pill) pill.classList.toggle('on', !!on);
  }

  var done = false, started = false;
  function exit() {
    if (done) return;
    done = true;
    meta.content = sp.dataset.themeColor; // the app's theme colour (set by applyTheme while we were showing)
    sp.classList.add('out');
    setTimeout(function () { sp.remove(); }, 600);
  }
  function winkFace() { if (!still && !done) { sp.classList.add('winking'); setTimeout(function () { sp.classList.remove('winking'); }, 520); } }
  function start() {
    if (started) return;
    started = true; t0 = performance.now();
    sp.classList.add('go');
    // the jingle plays straight away when the browser allows sound (a returning visitor often is); otherwise
    // "Tap for sound" shows and the first tap plays it (browsers never allow sound before a tap on a first visit)
    if (!muted) {
      var policy = ''; try { policy = navigator.getAutoplayPolicy ? navigator.getAutoplayPolicy('audiocontext') : ''; } catch (e) {}
      if (policy !== 'disallowed') { try { tryAudio(); } catch (e) {} }
      setTimeout(function () { if (!played && !done) hint(true); }, 450);
    }
    setTimeout(winkFace, 1650);
    setTimeout(exit, still ? 1300 : 3000);
  }
  if (img.complete && img.naturalWidth) start(); else { img.onload = start; img.onerror = start; setTimeout(start, 600); }
  // a tap on the launch screen: the hello plays now (with a wink) and the screen leaves a moment later
  sp.addEventListener('pointerdown', function () {
    if (!played && !muted) { try { tryAudio(); } catch (e) {} winkFace(); setTimeout(exit, 1300); } else exit();
  });
  addEventListener('keydown', function () { try { if (!muted) tryAudio(); } catch (e) {} exit(); }, { once: true });
  // missed it? the Fuzzy still giggles hello on the first tap in the next few seconds
  var bootAt = Date.now();
  addEventListener('pointerdown', function first() {
    removeEventListener('pointerdown', first, true);
    if (!played && !muted && Date.now() - bootAt < 9000) { try { tryAudio(); } catch (e) {} }
  }, true);
})();

// the web fonts load without blocking the first paint (no inline handler, so the strict security policy allows it)
(function () {
  var l = document.getElementById('fz-fonts');
  if (!l) return;
  var on = function () { l.media = 'all'; };
  if (l.sheet) on(); else l.addEventListener('load', on);
})();
