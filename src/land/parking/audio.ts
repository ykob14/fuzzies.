/**
 * Fuzzies Parking Escape — MUSIC & SOUNDS, all made live with Web Audio (original, no music files, nothing borrowed): three cheerful
 * tracks (marimba, xylophone, a light piano, a soft bass and gentle percussion) that play on a look-ahead scheduler — so the loop has
 * no gaps — and take turns every few loops; plus every sound effect of the game. Music, effects and "mute all" have their own
 * volumes (saved with the game's progress). Audio starts on the first tap (browsers' rule), pauses when the page is hidden and
 * comes back when you return.
 */
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

interface Track { name: string; bpm: number; swing: number; root: number; chords: number[][]; lead: 'xylo' | 'piano' | 'marimba'; arp: 'marimba' | 'pluck' | 'piano'; groove: 'pop' | 'bounce' | 'soft'; seed: number }
/** progression as scale degrees → MIDI chord tones (root + intervals) */
const TRACKS: Track[] = [
  { name: 'Sunny Lot', bpm: 112, swing: 0, root: 60, chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], lead: 'xylo', arp: 'marimba', groove: 'pop', seed: 3 },
  { name: 'Honk Honk Hop', bpm: 122, swing: 0.16, root: 65, chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], lead: 'piano', arp: 'pluck', groove: 'bounce', seed: 11 },
  { name: 'Rainbow Roundabout', bpm: 96, swing: 0.08, root: 55, chords: [[0, 4, 7, 11], [4, 7, 11, 14], [5, 9, 12, 16], [7, 11, 14, 17]], lead: 'marimba', arp: 'piano', groove: 'soft', seed: 29 },
  // one theme per neighbourhood (index 3 + neighbourhood), then the clock and the holidays
  { name: 'Sunday Drive', bpm: 108, swing: 0.1, root: 62, chords: [[0, 4, 7], [5, 9, 12], [9, 12, 16], [7, 11, 14]], lead: 'xylo', arp: 'pluck', groove: 'pop', seed: 41 },
  { name: 'Downtown Doo-Wop', bpm: 118, swing: 0.2, root: 58, chords: [[0, 4, 7, 9], [9, 12, 16], [5, 9, 12, 14], [7, 11, 14]], lead: 'piano', arp: 'piano', groove: 'bounce', seed: 53 },
  { name: 'Shopping Spree', bpm: 124, swing: 0, root: 64, chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], lead: 'xylo', arp: 'marimba', groove: 'pop', seed: 67 },
  { name: 'Sandy Toes', bpm: 100, swing: 0.18, root: 60, chords: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14]], lead: 'marimba', arp: 'pluck', groove: 'bounce', seed: 71 },
  { name: 'Snowflake Waltz', bpm: 90, swing: 0, root: 65, chords: [[0, 4, 7], [9, 12, 16], [2, 5, 9], [7, 11, 14]], lead: 'xylo', arp: 'piano', groove: 'soft', seed: 83 },
  { name: 'Gate 7 Groove', bpm: 116, swing: 0.12, root: 57, chords: [[0, 4, 7, 11], [2, 5, 9, 12], [4, 7, 11, 14], [5, 9, 12, 16]], lead: 'piano', arp: 'marimba', groove: 'pop', seed: 97 },
  { name: 'Festival Fanfare', bpm: 128, swing: 0.06, root: 67, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], lead: 'xylo', arp: 'pluck', groove: 'bounce', seed: 101 },
  { name: 'Pine Trail', bpm: 94, swing: 0.08, root: 55, chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], lead: 'marimba', arp: 'piano', groove: 'soft', seed: 113 },
  { name: 'Velvet Garage', bpm: 98, swing: 0.22, root: 57, chords: [[0, 3, 7, 10], [5, 9, 12, 15], [2, 5, 9, 12], [7, 10, 14, 17]], lead: 'piano', arp: 'piano', groove: 'soft', seed: 127 },
  { name: 'City Lights', bpm: 120, swing: 0.14, root: 62, chords: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], lead: 'xylo', arp: 'marimba', groove: 'bounce', seed: 131 },
  { name: 'Beat the Clock', bpm: 138, swing: 0, root: 62, chords: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 11, 14]], lead: 'xylo', arp: 'pluck', groove: 'pop', seed: 137 },
  { name: 'Holiday Bells', bpm: 112, swing: 0.1, root: 67, chords: [[0, 4, 7], [5, 9, 12], [2, 5, 9], [7, 11, 14]], lead: 'xylo', arp: 'marimba', groove: 'bounce', seed: 149 },
];
/** the playlists: a neighbourhood's own theme with the classic tunes in between; the countdown; the holidays */
export type Mood = { env: number } | 'timed' | 'season';
const playlist = (m: Mood): number[] => (m === 'timed' ? [13] : m === 'season' ? [14, 0] : [3 + (m.env % 10), (m.env % 3)]);
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const LOOPS_PER_TRACK = 4;

export interface AudioPrefs { music: number; sfx: number; mute: boolean }

export class ParkAudio {
  private ac: AudioContext | null = null;
  private master!: GainNode; private musicBus!: GainNode; private sfxBus!: GainNode; private verb!: ConvolverNode; private verbSend!: GainNode;
  private noise!: AudioBuffer;
  private timer: ReturnType<typeof setInterval> | undefined;
  private step = 0; private nextAt = 0; private track = 0; private loops = 0;
  private melody: (number | null)[][] = [];
  private playing = false; private wanted = false; private hidden = false;
  /** notes scheduled so far (the tests read it to know the music really runs) */
  scheduled = 0;
  private list: number[] = [0, 1, 2]; private li = 0;
  constructor(public prefs: AudioPrefs, track = 0) {
    this.li = track % this.list.length; this.track = this.list[this.li];
    document.addEventListener('visibilitychange', this.onVis);
  }
  private onVis = () => {
    if (!this.ac) return;
    this.hidden = document.hidden;
    if (document.hidden) { void this.ac.suspend(); } else { void this.ac.resume(); if (this.wanted && this.playing) this.nextAt = Math.max(this.nextAt, this.ac.currentTime + 0.05); }
  };
  /** call from a tap / click: creates or wakes the audio (and starts the music if it should be playing) */
  wake(): void {
    try {
      if (!this.ac) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ac = new AC();
        const a = this.ac;
        this.master = a.createGain(); this.musicBus = a.createGain(); this.sfxBus = a.createGain();
        const comp = a.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
        this.verb = a.createConvolver(); this.verb.buffer = this.impulse(1.8); this.verbSend = a.createGain(); this.verbSend.gain.value = 0.22;
        this.musicBus.connect(this.master); this.sfxBus.connect(this.master); this.verbSend.connect(this.verb).connect(this.master);
        this.master.connect(comp).connect(a.destination);
        this.noise = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.apply(true);
      }
      if (this.ac.state === 'suspended' && !document.hidden) void this.ac.resume();
      if (this.wanted && !this.playing) this.startMusic();
    } catch { this.ac = null; }
  }
  get ready(): boolean { return !!this.ac && this.ac.state === 'running'; }
  get trackName(): string { return TRACKS[this.track].name; }
  /** switch the playlist (a neighbourhood, the countdown, a holiday): the new tune starts at once if it's a different one */
  mood(m: Mood): void {
    const list = playlist(m); if (list.join() === this.list.join()) return;
    this.list = list; this.li = 0;
    if (this.track === list[0]) return;
    this.track = list[0];
    if (this.playing) { this.stopMusic(); this.startMusic(); }
  }
  set(prefs: Partial<AudioPrefs>): void { Object.assign(this.prefs, prefs); this.apply(); }
  private apply(now = false): void {
    if (!this.ac) return;
    const t = this.ac.currentTime, tc = now ? 0.001 : 0.08;
    this.master.gain.setTargetAtTime(this.prefs.mute ? 0 : 1, t, tc);
    this.musicBus.gain.setTargetAtTime(this.prefs.music * 0.55, t, tc);
    this.sfxBus.gain.setTargetAtTime(this.prefs.sfx * 0.9, t, tc);
  }
  /** music on (it really starts with the first tap if the browser hasn't allowed sound yet) */
  music(on: boolean): void { this.wanted = on; if (on) { if (this.ac) this.startMusic(); } else this.stopMusic(); }
  private startMusic(): void {
    if (!this.ac || this.playing) return;
    this.playing = true; this.step = 0; this.loops = 0; this.melody = this.compose(TRACKS[this.track]);
    this.nextAt = this.ac.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 30);
  }
  private stopMusic(): void { this.playing = false; if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  /** dim the music for a moment (the victory fanfare) */
  duck(secs = 2.5): void { if (!this.ac) return; const t = this.ac.currentTime, g = this.musicBus.gain, v = this.prefs.music * 0.55; g.cancelScheduledValues(t); g.setTargetAtTime(v * 0.25, t, 0.05); g.setTargetAtTime(v, t + secs, 0.6); }
  destroy(): void { this.stopMusic(); document.removeEventListener('visibilitychange', this.onVis); try { void this.ac?.close(); } catch { /* */ } this.ac = null; }

  // ---------- the music ----------
  /** a 16-bar melody per track: chord tones on the beats, passing notes between, rests to breathe; bars 9–16 answer bars 1–8 */
  private compose(t: Track): (number | null)[][] {
    let s = t.seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const bars: (number | null)[][] = [];
    const scale = (deg: number) => t.root + 12 + MAJOR[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7);
    let deg = 4;
    for (let b = 0; b < 8; b++) {
      const chord = t.chords[b % t.chords.length]; const notes: (number | null)[] = [];
      for (let k = 0; k < 8; k++) { // eighth notes
        if (k % 2 === 0) {
          // land on a chord tone
          const tones = chord.map((c) => t.root + 12 + c); const target = tones[Math.floor(r() * tones.length)] + (r() < 0.3 ? 12 : 0);
          notes.push(r() < (k === 0 ? 0.08 : 0.22) ? null : target);
          const d = MAJOR.indexOf(((target - t.root) % 12 + 12) % 12); if (d >= 0) deg = d + 7 * (Math.floor((target - t.root - 12) / 12) + 1);
        } else { deg += r() < 0.5 ? 1 : -1; notes.push(r() < 0.45 ? null : scale(Math.max(0, Math.min(13, deg)))); }
      }
      if (b % 4 === 3) { notes[6] = null; notes[7] = null; } // phrase ends breathe
      bars.push(notes);
    }
    // the answer: same rhythm, a little lower and resolved at the end
    for (let b = 0; b < 8; b++) bars.push(bars[b].map((n, k) => (n === null ? null : b === 7 && k >= 4 ? null : n - (b % 2 ? 2 : 0))));
    bars[15][0] = t.root + 12;
    return bars;
  }
  private schedule(): void {
    if (!this.ac || !this.playing || this.hidden) return;
    const a = this.ac, tr = TRACKS[this.track];
    const sixteenth = 60 / tr.bpm / 4;
    while (this.nextAt < a.currentTime + 0.18) {
      const st = this.step, bar = Math.floor(st / 16) % 16, inBar = st % 16;
      const swing = inBar % 2 ? sixteenth * tr.swing : 0;
      const t = this.nextAt + swing;
      const chord = tr.chords[bar % tr.chords.length].map((c) => tr.root + c);
      // drums
      if (tr.groove !== 'soft') {
        if (inBar % 8 === 0) this.kick(t, 0.5);
        if (tr.groove === 'bounce' && inBar === 10) this.kick(t, 0.35);
        if (inBar % 8 === 4) this.snap(t, tr.groove === 'pop' ? 0.18 : 0.22);
      } else { if (inBar === 0) this.kick(t, 0.32); if (inBar === 8) this.snap(t, 0.1); }
      if (inBar % 2 === 0) this.shaker(t, inBar % 4 === 2 ? 0.07 : 0.04);
      // bass: root on 1, fifth on 3, a pickup on the "and" of 4
      if (inBar === 0) this.bass(t, chord[0] - 24, sixteenth * 5);
      if (inBar === 8) this.bass(t, chord[0] - 17, sixteenth * 4);
      if (inBar === 14 && tr.groove === 'bounce') this.bass(t, chord[0] - 22, sixteenth * 2);
      // arpeggio (8ths) or soft piano chords
      if (tr.arp === 'piano') { if (inBar === 0 || inBar === 6 || inBar === 12) for (const n of chord) this.piano(t, n, 0.035, sixteenth * 6); }
      else if (inBar % 2 === 0) { const n = chord[(inBar / 2) % chord.length] + (inBar >= 8 ? 12 : 0); if (tr.arp === 'marimba') this.marimba(t, n, 0.06); else this.pluck(t, n, 0.05); }
      // the melody (eighth notes)
      if (inBar % 2 === 0) { const n = this.melody[bar]?.[inBar / 2]; if (n != null) { if (tr.lead === 'xylo') this.xylo(t, n, 0.07); else if (tr.lead === 'piano') this.piano(t, n, 0.08, sixteenth * 3); else this.marimba(t, n, 0.09); } }
      this.nextAt += sixteenth; this.step++;
      if (this.step % (16 * 16) === 0) { // a whole loop played
        this.loops++;
        if (this.loops >= LOOPS_PER_TRACK) { this.loops = 0; this.li = (this.li + 1) % this.list.length; this.track = this.list[this.li]; this.melody = this.compose(TRACKS[this.track]); }
        this.step = 0;
      }
    }
  }
  private env(g: GainNode, t: number, peak: number, attack: number, decay: number): void { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay); }
  private osc(type: OscillatorType, f: number, t: number, dur: number, peak: number, attack: number, out: AudioNode, detune = 0): OscillatorNode {
    const a = this.ac!, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; o.detune.value = detune;
    this.env(g, t, peak, attack, dur); o.connect(g).connect(out); o.start(t); o.stop(t + attack + dur + 0.05); this.scheduled++; return o;
  }
  private marimba(t: number, n: number, v: number): void { const f = hz(n); this.osc('sine', f, t, 0.5, v, 0.003, this.musicBus); this.osc('sine', f * 4, t, 0.12, v * 0.28, 0.002, this.musicBus); this.osc('sine', f, t, 0.4, v * 0.35, 0.003, this.verbSend); }
  private xylo(t: number, n: number, v: number): void { const f = hz(n + 12); this.osc('sine', f, t, 0.28, v, 0.002, this.musicBus); this.osc('triangle', f * 3, t, 0.08, v * 0.25, 0.001, this.musicBus); this.osc('sine', f, t, 0.3, v * 0.4, 0.002, this.verbSend); }
  private piano(t: number, n: number, v: number, len: number): void {
    const a = this.ac!, f = hz(n), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2800, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.6); lp.connect(this.musicBus); lp.connect(this.verbSend);
    const d = Math.max(0.5, len * 2.2); this.osc('triangle', f, t, d, v, 0.004, lp); this.osc('sine', f * 2, t, d * 0.6, v * 0.35, 0.004, lp); this.osc('sine', f * 3, t, d * 0.3, v * 0.12, 0.004, lp, 3);
  }
  private pluck(t: number, n: number, v: number): void { const a = this.ac!, lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(400, t + 0.18); lp.connect(this.musicBus); this.osc('sawtooth', hz(n), t, 0.22, v, 0.002, lp); }
  private bass(t: number, n: number, len: number): void { const a = this.ac!, lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.connect(this.musicBus); this.osc('sine', hz(n), t, Math.min(0.5, len), 0.22, 0.008, lp); this.osc('triangle', hz(n), t, Math.min(0.3, len), 0.06, 0.008, lp); }
  private kick(t: number, v: number): void { const a = this.ac!, o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); this.env(g, t, v * 0.6, 0.002, 0.22); o.connect(g).connect(this.musicBus); o.start(t); o.stop(t + 0.3); this.scheduled++; }
  private noiseHit(t: number, v: number, type: BiquadFilterType, f: number, dur: number, out: AudioNode, q = 1): void { const a = this.ac!, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); s.buffer = this.noise; fl.type = type; fl.frequency.value = f; fl.Q.value = q; this.env(g, t, v, 0.002, dur); s.connect(fl).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); this.scheduled++; }
  private snap(t: number, v: number): void { this.noiseHit(t, v, 'bandpass', 1900, 0.09, this.musicBus, 1.4); this.noiseHit(t, v * 0.5, 'bandpass', 1900, 0.12, this.verbSend, 1.4); }
  private shaker(t: number, v: number): void { this.noiseHit(t, v, 'highpass', 7000, 0.04, this.musicBus); }
  private impulse(secs: number): AudioBuffer { const a = this.ac!, len = Math.floor(a.sampleRate * secs), b = a.createBuffer(2, len, a.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); } return b; }

  // ---------- sound effects ----------
  private get now(): number { return this.ac ? this.ac.currentTime + 0.005 : 0; }
  private ok(): boolean { if (!this.ac || this.ac.state !== 'running') return false; return true; }
  private sfx(type: OscillatorType, f0: number, f1: number, dur: number, v: number, delay = 0): void {
    const a = this.ac!, t = this.now + delay, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    this.env(g, t, v, 0.006, dur); o.connect(g).connect(this.sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  /** picking up a vehicle: a soft "bloop" */
  select(): void { if (!this.ok()) return; this.sfx('sine', 520, 780, 0.08, 0.22); this.sfx('triangle', 1560, 1560, 0.03, 0.05); }
  /** a slide: tyres whooshing over the asphalt (longer slides sound longer) */
  slide(cells: number): void { if (!this.ok()) return; const a = this.ac!, t = this.now, dur = 0.1 + Math.min(4, Math.abs(cells)) * 0.045; const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = this.noise; f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(1800, t + dur); this.env(g, t, 0.16, 0.02, dur); s.connect(f).connect(g).connect(this.sfxBus); s.start(t); s.stop(t + dur + 0.05); }
  /** stopping in a bay: a soft thud */
  stop(): void { if (!this.ok()) return; this.sfx('sine', 170, 80, 0.1, 0.25); this.noiseHit(this.now, 0.06, 'lowpass', 600, 0.06, this.sfxBus); }
  /** ran into another vehicle: a rubbery boing */
  bump(): void { if (!this.ok()) return; const a = this.ac!, t = this.now, o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), g = a.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(130, t + 0.22); lfo.frequency.value = 22; lg.gain.value = 18; lfo.connect(lg).connect(o.frequency); this.env(g, t, 0.24, 0.005, 0.22); o.connect(g).connect(this.sfxBus); o.start(t); lfo.start(t); o.stop(t + 0.3); lfo.stop(t + 0.3); }
  /** a move that can't happen (or a blocked exit): a little "meep meep" horn */
  blocked(): void { if (!this.ok()) return; for (const [d, f] of [[0, 392], [0.13, 392]] as [number, number][]) { const a = this.ac!, t = this.now + d, lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.connect(this.sfxBus); for (const ff of [f, f * 1.26]) { const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = ff; this.env(g, t, 0.05, 0.01, 0.09); o.connect(g).connect(lp); o.start(t); o.stop(t + 0.12); } } }
  /** a Fuzzy cheering "yippee!": quick rising chirps with a wobble */
  cheer(): void { if (!this.ok()) return; [0, 0.09, 0.18].forEach((d, k) => { const a = this.ac!, t = this.now + d, o = a.createOscillator(), g = a.createGain(), bp = a.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(620 + k * 140, t); o.frequency.exponentialRampToValueAtTime(980 + k * 160, t + 0.08); bp.type = 'bandpass'; bp.frequency.value = 1400 + k * 200; bp.Q.value = 4; this.env(g, t, 0.16, 0.005, 0.1); o.connect(bp).connect(g).connect(this.sfxBus); o.start(t); o.stop(t + 0.14); }); }
  /** the hero car drives out: an engine rev and a happy double honk */
  escape(): void {
    if (!this.ok()) return; const a = this.ac!, t = this.now, o = a.createOscillator(), lp = a.createBiquadFilter(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(230, t + 0.75); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(1700, t + 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); o.connect(lp).connect(g).connect(this.sfxBus); o.start(t); o.stop(t + 0.95);
    for (const d of [0.85, 1.02]) { const tt = this.now + d, l2 = a.createBiquadFilter(); l2.type = 'lowpass'; l2.frequency.value = 1500; l2.connect(this.sfxBus); for (const f of [440, 554]) { const h = a.createOscillator(), hg = a.createGain(); h.type = 'square'; h.frequency.value = f; this.env(hg, tt, 0.05, 0.01, 0.12); h.connect(hg).connect(l2); h.start(tt); h.stop(tt + 0.15); } }
  }
  /** a coin landing in your counter */
  coin(delay = 0): void { if (!this.ok()) return; this.sfx('sine', 988, 988, 0.08, 0.14, delay); this.sfx('sine', 1319, 1319, 0.22, 0.14, delay + 0.07); }
  /** level complete: a bright marimba fanfare over a chord */
  complete(): void { if (!this.ok()) return; this.duck(2.6); const t = this.now; [60, 64, 67, 72, 76].forEach((n, k) => this.marimbaSfx(t + k * 0.09, n + 12, 0.16)); for (const n of [60, 64, 67, 72]) this.pianoSfx(t + 0.48, n, 0.06); this.sparkle(t + 0.5); }
  /** the next level opens: a rising sparkle */
  unlock(): void { if (!this.ok()) return; this.sparkle(this.now); }
  /** taps on buttons */
  button(): void { if (!this.ok()) return; this.sfx('sine', 1250, 1100, 0.04, 0.09); }
  /** a hint: a magic shimmer */
  hint(): void { if (!this.ok()) return; const t = this.now; [84, 88, 91, 96, 91].forEach((n, k) => this.marimbaSfx(t + k * 0.05, n, 0.06)); }
  /** last seconds of a timed level */
  warn(urgent = false): void { if (!this.ok()) return; this.sfx('sine', urgent ? 1046 : 880, urgent ? 1046 : 880, 0.07, 0.16); this.sfx('sine', urgent ? 1046 : 880, urgent ? 1046 : 880, 0.05, 0.08, 0.12); }
  /** time's up / out of moves: a gentle "wah wah" */
  fail(): void { if (!this.ok()) return; this.duck(2); [[392, 0], [349, 0.28], [311, 0.56]].forEach(([f, d]) => this.sfx('triangle', f, f * 0.96, 0.32, 0.16, d)); }
  /** a special challenge or milestone won: a bigger fanfare and a cymbal swell */
  special(): void { if (!this.ok()) return; this.duck(3.2); const t = this.now; [67, 72, 76, 79, 84].forEach((n, k) => { this.marimbaSfx(t + k * 0.1, n, 0.15); this.pianoSfx(t + k * 0.1, n - 12, 0.05); }); const a = this.ac!, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = this.noise; f.type = 'highpass'; f.frequency.value = 5000; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); s.connect(f).connect(g).connect(this.sfxBus); s.start(t); s.stop(t + 1.7); for (const n of [72, 76, 79, 84]) this.pianoSfx(t + 0.6, n, 0.05); }
  // ---------- the Fuzzies' little voices ----------
  private lastVoice = 0;
  /**
   * A Fuzzy says something: each of the 15 Fuzzies has its own pitch. hi = "eep?" (picked up), go = "wee!" (a slide), oops = "uh-oh"
   * (blocked), yay = "wheee!" + a giggle (escaped), giggle = "hee-hee-hee", coo = a soft little hum.
   */
  /** the player's "Fuzzy voices" setting */
  voicesOn = true;
  voice(id: number, kind: 'hi' | 'go' | 'oops' | 'yay' | 'giggle' | 'coo', delay = 0): void {
    if (!this.ok() || !this.voicesOn) return;
    const now = this.ac!.currentTime;
    if (kind !== 'yay' && kind !== 'giggle' && now - this.lastVoice < 0.12 && !delay) return; // never a babble
    this.lastVoice = now;
    const f = 560 * Math.pow(2, (((id % 15) + 15) % 15) / 15 * 0.85); // 560–1000 Hz
    const t = this.now + delay;
    const syl = (at: number, f0: number, f1: number, dur: number, vol: number, vowel: 'ee' | 'oo' | 'ah', wob = 0.03) => this.syllable(t + at, f * f0, f * f1, dur, vol, vowel, wob);
    if (kind === 'hi') syl(0, 1, 1.35, 0.14, 0.2, 'ee');
    else if (kind === 'go') { syl(0, 1.1, 1.2, 0.08, 0.16, 'ah'); syl(0.1, 1.25, 1.45, 0.11, 0.16, 'ee'); }
    else if (kind === 'oops') { syl(0, 1.2, 1.1, 0.12, 0.18, 'oo'); syl(0.16, 0.92, 0.72, 0.2, 0.18, 'oo', 0.05); }
    else if (kind === 'yay') { syl(0, 1, 1.9, 0.42, 0.22, 'ee', 0.06); this.voice(id, 'giggle', delay + 0.48); }
    else if (kind === 'giggle') [1.32, 1.2, 1.28, 1.14].forEach((k, n) => syl(n * 0.095, k, k * 0.92, 0.07, 0.15, 'ee', 0.02));
    else syl(0, 0.9, 1.0, 0.3, 0.08, 'oo', 0.02);
  }
  private syllable(t: number, f0: number, f1: number, dur: number, vol: number, vowel: 'ee' | 'oo' | 'ah', wob: number): void {
    const a = this.ac!;
    const o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), g = a.createGain(), dry = a.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t + dur);
    lfo.frequency.value = 9; lg.gain.value = f0 * wob; lfo.connect(lg).connect(o.frequency);
    // two formant filters give the "ee" / "oo" / "ah" colour — a tiny cartoon voice
    const F: Record<string, [number, number]> = { ee: [700, 2700], oo: [450, 1050], ah: [950, 1600] };
    for (const [k, fq] of F[vowel].entries()) { const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 5; const bg = a.createGain(); bg.gain.value = k ? 0.6 : 1; o.connect(bp).connect(bg).connect(g); }
    dry.gain.value = 0.35; o.connect(dry).connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.sfxBus); g.connect(this.verbSend);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.03); lfo.stop(t + dur + 0.03);
    this.voices++;
  }
  /** voices spoken so far (the tests read it) */
  voices = 0;
  private marimbaSfx(t: number, n: number, v: number): void { const f = hz(n); const o = this.ac!.createOscillator(), g = this.ac!.createGain(); o.frequency.value = f; this.env(g, t, v, 0.002, 0.4); o.connect(g).connect(this.sfxBus); o.start(t); o.stop(t + 0.45); const o2 = this.ac!.createOscillator(), g2 = this.ac!.createGain(); o2.frequency.value = f * 4; this.env(g2, t, v * 0.25, 0.002, 0.1); o2.connect(g2).connect(this.sfxBus); o2.start(t); o2.stop(t + 0.15); }
  private pianoSfx(t: number, n: number, v: number): void { const o = this.ac!.createOscillator(), g = this.ac!.createGain(); o.type = 'triangle'; o.frequency.value = hz(n); this.env(g, t, v, 0.005, 1.2); o.connect(g).connect(this.sfxBus); o.start(t); o.stop(t + 1.3); }
  private sparkle(t: number): void { [88, 91, 95, 100, 103].forEach((n, k) => { const o = this.ac!.createOscillator(), g = this.ac!.createGain(); o.frequency.value = hz(n); this.env(g, t + k * 0.06, 0.07, 0.002, 0.25); o.connect(g).connect(this.sfxBus); o.connect(this.verbSend); o.start(t + k * 0.06); o.stop(t + k * 0.06 + 0.3); }); }
}
