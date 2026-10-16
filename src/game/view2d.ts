/** Classic flat 2D look for Fuzzy Crossing (also used when a device has no WebGL). */
import { COLS, ROWS, GOAL, MEDIAN, START, HOMES, type Crossing, type Dir, type Fx, type Obj, type View } from './crossing';
import { sfx } from './sound';

const INTRO_END = 3.2;
const smooth = (a: number, b: number, t: number) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
const bump = (t: number, a: number, b: number, s = 0.08) => Math.min(smooth(a, a + s, t), 1 - smooth(b - s, b, t));

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; text?: string; size: number }

export class View2D implements View {
  private ctx: CanvasRenderingContext2D;
  private parts: Particle[] = [];
  private cell = 40;
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.classList.add('flat');
    this.resize();
  }

  resize(): void {
    const r = this.canvas.parentElement!.getBoundingClientRect();
    this.dpr = Math.min(2.5, devicePixelRatio || 1);
    this.cell = Math.max(16, Math.floor(Math.min(r.width / COLS, r.height / ROWS)));
    const w = this.cell * COLS, hh = this.cell * ROWS;
    this.canvas.width = w * this.dpr; this.canvas.height = hh * this.dpr;
    this.canvas.style.width = `${w}px`; this.canvas.style.height = `${hh}px`;
  }

  reset(): void {}

  private intro: { t: number; done: () => void; winked: boolean; boinged: boolean } | null = null;
  playIntro(_g: Crossing, done: () => void): void { this.intro = { t: 0, done, winked: false, boinged: false }; }
  skipIntro(): void { if (this.intro) this.intro.t = INTRO_END; }
  destroy(): void {}

  fx(e: Fx, g: Crossing): void {
    const text = (x: number, y: number, t: string, color: string, size = 0.55, life = 1) => this.parts.push({ x, y, vx: 0, vy: -1.2, life, max: life, color, text: t, size });
    if (e.kind === 'collect') { text(e.x + 0.5, e.row + 0.2, e.item ? e.item.emoji : `+${e.amount}`, e.gold ? '#ffd23f' : '#fff'); this.burst(e.x + 0.5, e.row + 0.5, e.gold ? '#ffd23f' : e.item ? e.item.colors[0] : '#ff7ac2', e.gold ? 16 : 8); }
    if (e.kind === 'home') { text(e.x + 0.5, 0.2, `+${e.amount}`, '#fff'); this.burst(e.x + 0.5, 0.5, '#ffd23f', 18); }
    if (e.kind === 'level') this.parts.push({ x: COLS / 2, y: ROWS / 2, vx: 0, vy: -0.6, life: 2, max: 2, color: '#fff', text: `LEVEL ${e.level}!`, size: 1.1 });
    if (e.kind === 'death') this.burst(e.x + 0.5, e.row + 0.5, e.how === 'splash' ? '#9be7ff' : g.skin.colors[0], 14);
  }

  private burst(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3;
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, life: 0.6 + Math.random() * 0.4, max: 1, color, size: 0.08 + Math.random() * 0.08 });
    }
  }

  render(g: Crossing, dt: number): void {
    const c = this.ctx, s = this.cell, W = COLS * s;
    this.parts = this.parts.filter((p) => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 6 * dt; return p.life > 0; });
    const t = g.clock;
    // intro: start zoomed in on the Fuzzy, then ease out to the whole board
    const it = this.intro;
    let zoom = 1, ox = 0, oy = 0, blink = 0, wink = 0, hopUp = 0;
    if (it) {
      it.t += dt;
      const W0 = COLS * s, H0 = ROWS * s;
      zoom = 1 + 2.4 * (1 - smooth(1.8, 3.0, it.t)) + 0.15 * smooth(0, 1.6, it.t) * (1 - smooth(1.8, 2.4, it.t));
      const [px, py] = g.visualPos();
      const cx = Math.min(Math.max((px + 0.5) * s, W0 / (2 * zoom)), W0 - W0 / (2 * zoom));
      const cy = Math.min(Math.max((py + 0.5) * s, H0 / (2 * zoom)), H0 - H0 / (2 * zoom));
      ox = W0 / 2 - zoom * cx; oy = H0 / 2 - zoom * cy;
      blink = bump(it.t, 0.35, 0.5, 0.05);
      wink = bump(it.t, 0.85, 1.5);
      const b = it.t - 1.75;
      if (b > 0 && b < 0.45) hopUp = Math.sin((b / 0.45) * Math.PI);
      if (wink > 0.6 && !it.winked) {
        it.winked = true; sfx.wink();
        this.parts.push({ x: px + 0.95, y: py + 0.15, vx: 0, vy: -0.25, life: 1, max: 1, color: '#fff', text: '✨', size: 0.45 });
      }
      if (b > 0 && !it.boinged) { it.boinged = true; sfx.boing(); this.parts.push({ x: px + 0.9, y: py, vx: 0, vy: -0.4, life: 1.1, max: 1.1, color: '#fff', text: '💖', size: 0.4 }); }
      if (it.t >= INTRO_END) { const done = it.done; this.intro = null; done(); }
    }
    c.setTransform(this.dpr * zoom, 0, 0, this.dpr * zoom, this.dpr * ox, this.dpr * oy);

    for (let r = 0; r < ROWS; r++) {
      const y = r * s;
      if (r === GOAL) {
        c.fillStyle = '#2d6a4f'; c.fillRect(0, y, W, s);
        for (let i = 0; i < COLS; i++) { c.fillStyle = i % 2 ? '#40916c' : '#52b788'; c.beginPath(); c.arc(i * s + s / 2, y + s * 0.55, s * 0.42, 0, Math.PI * 2); c.fill(); }
      } else if (g.onRiver(r)) {
        const gr = c.createLinearGradient(0, y, 0, y + s);
        gr.addColorStop(0, '#2b7fd4'); gr.addColorStop(1, '#2370c2');
        c.fillStyle = gr; c.fillRect(0, y, W, s);
        c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = Math.max(1, s * 0.04);
        for (let i = 0; i < 4; i++) {
          const wx = ((i * 3.1 + t * (r % 2 ? 0.6 : -0.5) * 1.3) % (COLS + 2) + COLS + 2) % (COLS + 2) - 1;
          c.beginPath(); c.moveTo(wx * s, y + s * (0.3 + (i % 2) * 0.35)); c.quadraticCurveTo((wx + 0.3) * s, y + s * (0.2 + (i % 2) * 0.35), (wx + 0.6) * s, y + s * (0.3 + (i % 2) * 0.35)); c.stroke();
        }
      } else if (r === MEDIAN || r === START) {
        c.fillStyle = r === START ? '#7ccf6b' : '#8bd47a'; c.fillRect(0, y, W, s);
        c.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < COLS; i++) if ((i * 7 + r) % 3 === 0) { c.beginPath(); c.arc(i * s + s * 0.3, y + s * 0.3, s * 0.05, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = 'rgba(255,214,90,0.8)';
        for (let i = 0; i < COLS; i++) if ((i * 5 + r) % 4 === 1) { c.beginPath(); c.arc(i * s + s * 0.7, y + s * 0.72, s * 0.05, 0, Math.PI * 2); c.fill(); }
      } else {
        c.fillStyle = '#3b3b4f'; c.fillRect(0, y, W, s);
        if (r < 11) { c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = Math.max(1, s * 0.05); c.setLineDash([s * 0.4, s * 0.35]); c.beginPath(); c.moveTo(0, y + s); c.lineTo(W, y + s); c.stroke(); c.setLineDash([]); }
      }
    }
    HOMES.forEach((col, i) => {
      const x = col * s, y = GOAL * s;
      c.fillStyle = '#2b7fd4';
      c.beginPath(); c.roundRect(x + s * 0.06, y + s * 0.12, s * 0.88, s * 0.88, s * 0.3); c.fill();
      c.fillStyle = '#5cc96b';
      c.beginPath(); c.arc(x + s / 2, y + s * 0.58, s * 0.34, 0.3, Math.PI * 2 - 0.3); c.lineTo(x + s / 2, y + s * 0.58); c.fill();
      if (g.homes[i]) this.drawFuzzy(x + s / 2, y + s * 0.55, s * 0.36, g.skin.colors, 'up', 0, true);
    });

    for (const l of g.lanes) {
      const y = l.row * s;
      for (const o of l.objs) {
        const x = o.x * s, w = o.len * s;
        if (x > W + s || x + w < -s) continue;
        if (o.kind === 'log') {
          c.fillStyle = '#6b4226'; c.beginPath(); c.roundRect(x + 2, y + s * 0.16, w - 4, s * 0.72, s * 0.3); c.fill();
          c.fillStyle = '#9c6236'; c.beginPath(); c.roundRect(x + 2, y + s * 0.12, w - 4, s * 0.68, s * 0.3); c.fill();
          c.strokeStyle = 'rgba(70,40,20,0.45)'; c.lineWidth = Math.max(1, s * 0.04);
          for (let i = 1; i < o.len * 2; i++) { c.beginPath(); c.moveTo(x + i * s * 0.5, y + s * 0.3); c.lineTo(x + i * s * 0.5 + s * 0.2, y + s * 0.3); c.stroke(); }
          c.fillStyle = '#d9a066'; c.beginPath(); c.ellipse(x + w - s * 0.2, y + s * 0.46, s * 0.12, s * 0.28, 0, 0, Math.PI * 2); c.fill();
        } else if (o.kind === 'pad') {
          const sink = g.sinkAmount(o);
          c.globalAlpha = g.sunk(o) ? 0.18 : sink > 0 ? 0.6 + Math.sin(g.clock * 30) * 0.2 : 1;
          for (let i = 0; i < o.len; i++) {
            const cx = x + i * s + s / 2, cy = y + s / 2;
            c.fillStyle = '#2f9e44'; c.beginPath(); c.arc(cx, cy + s * 0.04, s * 0.42, 0.35, Math.PI * 2 - 0.35); c.lineTo(cx, cy); c.fill();
            c.fillStyle = '#5cc96b'; c.beginPath(); c.arc(cx, cy, s * 0.4, 0.35, Math.PI * 2 - 0.35); c.lineTo(cx, cy); c.fill();
            if (i === 0) { c.fillStyle = '#ffafcc'; c.beginPath(); c.arc(cx - s * 0.12, cy - s * 0.1, s * 0.09, 0, Math.PI * 2); c.fill(); }
          }
          c.globalAlpha = 1;
        } else this.drawVehicle(o, x, y, w, l.speed > 0);
      }
    }

    for (const tk of g.tokens) {
      c.globalAlpha = tk.life - tk.age < 2 ? 0.4 + 0.6 * Math.abs(Math.sin(tk.age * 10)) : 1;
      const bob = Math.sin(t * 5 + tk.x) * s * 0.06;
      this.drawFuzzy(tk.x * s + s / 2, tk.row * s + s / 2 + bob, s * 0.22, tk.gold ? ['#fff3b0', '#e0a100'] : tk.ev ? tk.ev.colors : ['#ffb3e0', '#ff4f9a'], 'down', 0, false, tk.gold, t);
      c.globalAlpha = 1;
    }

    const [vx, vy, lift] = g.visualPos();
    const d = g.dying;
    if (!d || d.t < 0.45) {
      const cx = vx * s + s / 2, cy = vy * s + s / 2;
      c.fillStyle = 'rgba(0,0,0,0.22)';
      c.beginPath(); c.ellipse(cx, cy + s * 0.32, s * 0.3 * (1 - lift * 0.3), s * 0.1, 0, 0, Math.PI * 2); c.fill();
      c.save();
      c.translate(cx, cy - lift * s * 0.35 - hopUp * s * 0.35);
      if (wink) c.rotate(-0.18 * wink);
      if (d?.kind === 'crash' || d?.kind === 'bonk') c.scale(1 + d.t * 1.2, Math.max(0.15, 1 - d.t * 1.8));
      else { const sq = d ? Math.max(0.05, 1 - d.t * 2) : 1; c.scale(sq * (1 + lift * 0.08), sq * (1 - lift * 0.08 + (g.hop ? 0.05 : 0))); }
      this.drawFuzzy(0, 0, s * 0.4, g.skin.colors, it ? 'down' : g.facing, t, true, false, 0, { blink, wink });
      c.restore();
    }
    if (d?.kind === 'splash') {
      c.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - d.t)})`; c.lineWidth = 2;
      for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(g.px * s + s / 2, g.py * s + s / 2, s * (0.2 + d.t * (0.5 + i * 0.3)), 0, Math.PI * 2); c.stroke(); }
    }

    for (const p of this.parts) {
      c.globalAlpha = Math.max(0, p.life / p.max);
      if (p.text) {
        c.font = `800 ${Math.round(s * p.size)}px "Fredoka", "Poppins", system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = Math.max(2, s * 0.08); c.strokeStyle = 'rgba(28,24,48,0.75)';
        c.strokeText(p.text, p.x * s, p.y * s);
        c.fillStyle = p.color; c.fillText(p.text, p.x * s, p.y * s);
      } else { c.fillStyle = p.color; c.beginPath(); c.arc(p.x * s, p.y * s, p.size * s, 0, Math.PI * 2); c.fill(); }
    }
    c.globalAlpha = 1;
  }

  private drawVehicle(o: Obj, x: number, y: number, w: number, right: boolean): void {
    const c = this.ctx, s = this.cell;
    const top = y + s * 0.14, hh = s * 0.72;
    c.fillStyle = '#111';
    for (const wx of o.kind === 'car' ? [0.22, 0.78] : [0.15, 0.5, 0.85]) {
      c.beginPath(); c.roundRect(x + w * wx - s * 0.12, top - s * 0.04, s * 0.24, hh + s * 0.08, s * 0.05); c.fill();
    }
    c.fillStyle = o.color;
    c.beginPath(); c.roundRect(x + s * 0.05, top, w - s * 0.1, hh, s * 0.2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); c.roundRect(x + s * 0.1, top + s * 0.06, w - s * 0.2, hh * 0.3, s * 0.12); c.fill();
    c.fillStyle = 'rgba(30,40,70,0.75)';
    const wsx = right ? x + w - s * 0.42 : x + s * 0.18;
    c.beginPath(); c.roundRect(wsx, top + hh * 0.18, s * 0.24, hh * 0.64, s * 0.06); c.fill();
    if (o.kind !== 'car') {
      c.fillStyle = 'rgba(30,40,70,0.45)';
      for (let i = 0; i < Math.floor(o.len * 2) - 1; i++) { const wx2 = right ? x + s * 0.2 + i * s * 0.42 : x + w - s * 0.44 - i * s * 0.42; if ((right && wx2 < wsx - s * 0.3) || (!right && wx2 > wsx + s * 0.3)) { c.beginPath(); c.roundRect(wx2, top + hh * 0.22, s * 0.24, hh * 0.56, s * 0.05); c.fill(); } }
    }
    c.fillStyle = '#fff6b0';
    const hx = right ? x + w - s * 0.1 : x + s * 0.04;
    c.fillRect(hx, top + hh * 0.12, s * 0.06, hh * 0.18);
    c.fillRect(hx, top + hh * 0.7, s * 0.06, hh * 0.18);
  }

  private drawFuzzy(cx: number, cy: number, r: number, colors: [string, string], facing: Dir, t: number, face: boolean, sparkle = false, clock = 0, eyes = { blink: 0, wink: 0 }): void {
    const c = this.ctx;
    const gr = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    gr.addColorStop(0, colors[0]); gr.addColorStop(1, colors[1]);
    c.fillStyle = gr;
    c.beginPath();
    const n = 22;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const rr = i % 2 ? r * (1.12 + Math.sin(t * 8 + i) * 0.03) : r * 0.94;
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.fill();
    if (sparkle) {
      c.fillStyle = '#fff';
      const a = clock * 3 + cx;
      for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(cx + Math.cos(a + i * 3) * r * 1.3, cy + Math.sin(a + i * 3) * r * 1.3, r * 0.13, 0, Math.PI * 2); c.fill(); }
    }
    const lx = facing === 'left' ? -0.12 : facing === 'right' ? 0.12 : 0;
    const ly = facing === 'up' ? -0.1 : facing === 'down' ? 0.08 : 0;
    const er = r * (face ? 0.24 : 0.28);
    for (const sx of [-0.33, 0.33]) {
      const shut = Math.max(eyes.blink, sx > 0 ? eyes.wink : 0);
      if (sx > 0 && eyes.wink > 0.6) {
        // happy closed "^" eye for the wink
        c.strokeStyle = '#1c1830'; c.lineWidth = Math.max(1.5, r * 0.11); c.lineCap = 'round';
        c.beginPath(); c.arc(cx + sx * r, cy - r * 0.02, er * 0.85, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke();
        continue;
      }
      c.save();
      c.translate(cx + sx * r + lx * r, cy - r * 0.1 + ly * r);
      c.scale(1, Math.max(0.08, 1 - shut));
      c.translate(-(cx + sx * r + lx * r), -(cy - r * 0.1 + ly * r));
      c.fillStyle = '#fff';
      c.beginPath(); c.ellipse(cx + sx * r + lx * r, cy - r * 0.1 + ly * r, er, er * 1.15, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1c1830';
      c.beginPath(); c.arc(cx + sx * r + lx * r * 1.8, cy - r * 0.06 + ly * r * 1.6, er * 0.55, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    if (face) {
      c.strokeStyle = '#1c1830'; c.lineWidth = Math.max(1, r * 0.1); c.lineCap = 'round';
      c.beginPath(); c.arc(cx + lx * r, cy + r * 0.28 + ly * r, r * (0.18 + eyes.wink * 0.07), 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.35)';
      for (const sx of [-0.6, 0.6]) { c.beginPath(); c.arc(cx + sx * r, cy + r * 0.3, r * 0.12, 0, Math.PI * 2); c.fill(); }
    }
  }
}
