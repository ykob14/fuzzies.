/**
 * Particle effects for Fuzzy Crossing cosmetics — the same look in the Locker's showroom, the unlock celebration and the game:
 *  - trails (what drifts behind a hop): sparkles, hearts, leaves, bubbles, petals, snowflakes, rainbow, embers, neon lines
 *  - landing effects: cloud puff, sparkle pop, ripple, star landing, petal burst, shockwave, glow, lightning
 *  - celebrations: spin sparkles, dance notes, heart pop, flip stars, confetti, fireworks, moon dust, champion trophy
 * Pooled sprites with small canvas-drawn textures (no image files), one group to add to any scene; `update(dt)` each frame.
 */
import * as THREE from 'three';

type Tex = 'spark' | 'dot' | 'heart' | 'leaf' | 'petal' | 'snow' | 'bubble' | 'flame' | 'star' | 'confetti' | 'note' | 'bolt' | 'trophy' | 'moon';
const texCache = new Map<Tex, THREE.Texture>();
function tex(kind: Tex): THREE.Texture {
  let t = texCache.get(kind);
  if (t) return t;
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d')!;
  g.translate(S / 2, S / 2);
  const star = (n: number, ro: number, ri: number) => { g.beginPath(); for (let i = 0; i <= n * 2; i++) { const a = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? ri : ro; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); };
  const soft = (r: number, a = 1) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.4, `rgba(255,255,255,${a * 0.45})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2); };
  g.fillStyle = '#fff';
  switch (kind) {
    case 'dot': soft(30); break;
    case 'spark': soft(18, 0.8); star(4, 30, 5); g.fill(); break;
    case 'star': star(5, 28, 12); g.fill(); g.fillStyle = 'rgba(0,0,0,0.12)'; star(5, 16, 7); g.fill(); break;
    case 'heart': g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-34, 0, -20, -26, 0, -10); g.bezierCurveTo(20, -26, 34, 0, 0, 22); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-11, -8, 5, 3.5, -0.6, 0, 7); g.fill(); break;
    case 'leaf': g.beginPath(); g.moveTo(0, -28); g.quadraticCurveTo(22, -6, 0, 28); g.quadraticCurveTo(-22, -6, 0, -28); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -24); g.lineTo(0, 24); g.stroke(); break;
    case 'petal': g.beginPath(); g.ellipse(0, 0, 14, 26, 0.3, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.08)'; g.beginPath(); g.ellipse(4, 6, 6, 14, 0.3, 0, 7); g.fill(); break;
    case 'snow': g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { g.save(); g.rotate((i / 6) * Math.PI * 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -26); g.moveTo(0, -14); g.lineTo(-8, -21); g.moveTo(0, -14); g.lineTo(8, -21); g.stroke(); g.restore(); } break;
    case 'bubble': g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3.5; g.beginPath(); g.arc(0, 0, 25, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill(); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(-9, -10, 6, 4, -0.7, 0, 7); g.fill(); break;
    case 'flame': soft(30, 0.9); g.beginPath(); g.moveTo(0, -26); g.quadraticCurveTo(18, 4, 0, 22); g.quadraticCurveTo(-18, 4, 0, -26); g.fill(); break;
    case 'confetti': g.fillRect(-14, -8, 28, 16); break;
    case 'note': g.beginPath(); g.ellipse(-8, 14, 11, 8, -0.4, 0, 7); g.fill(); g.fillRect(0, -22, 5, 36); g.beginPath(); g.moveTo(0, -22); g.quadraticCurveTo(18, -18, 18, -2); g.quadraticCurveTo(12, -12, 5, -12); g.fill(); break;
    case 'bolt': soft(30, 0.6); g.beginPath(); g.moveTo(4, -30); g.lineTo(-12, 2); g.lineTo(0, 2); g.lineTo(-6, 30); g.lineTo(14, -6); g.lineTo(2, -6); g.lineTo(10, -30); g.closePath(); g.fill(); break;
    case 'trophy': g.beginPath(); g.moveTo(-16, -22); g.lineTo(16, -22); g.quadraticCurveTo(16, 6, 0, 8); g.quadraticCurveTo(-16, 6, -16, -22); g.fill(); g.fillRect(-4, 6, 8, 12); g.fillRect(-13, 18, 26, 6); g.lineWidth = 4; g.strokeStyle = '#fff'; g.beginPath(); g.arc(-17, -12, 7, Math.PI / 2, Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(17, -12, 7, -Math.PI / 2, Math.PI / 2); g.stroke(); break;
    case 'moon': g.beginPath(); g.arc(0, 0, 24, 0, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(10, -6, 20, 0, 7); g.fill(); break;
  }
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(kind, t);
  return t;
}

interface P { s: THREE.Sprite; v: THREE.Vector3; life: number; max: number; g: number; drag: number; spin: number; grow: number; size: number; fade: number; on: boolean }
interface Ring { m: THREE.Mesh; life: number; max: number; size: number; on: boolean; op: number }
const RAINBOW = ['#ff5d5d', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
const CONFETTI = ['#ff4f8b', '#ffd23f', '#46c2ff', '#7ae582', '#ff8c42', '#ffffff'];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(xs: T[]): T => xs[(Math.random() * xs.length) | 0];

export class FxLayer {
  readonly group = new THREE.Group();
  private ps: P[] = [];
  private rings: Ring[] = [];
  private ringGeo = new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2);
  private trailAcc = 0;
  /** `unit` = how big one "Fuzzy radius" is in this scene (the game's Fuzzy is ~0.3, the showroom's 1) */
  constructor(private unit = 1, private max = 220) { this.group.name = 'crossing-fx'; }

  private spawn(kind: Tex, color: string, at: THREE.Vector3, o: { v?: THREE.Vector3; life?: number; g?: number; drag?: number; size?: number; spin?: number; grow?: number; fade?: number; additive?: boolean } = {}): void {
    let p = this.ps.find((x) => !x.on);
    if (!p) {
      if (this.ps.length >= this.max) p = this.ps.reduce((a, b) => (a.life < b.life ? a : b));
      else { const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); this.group.add(s); p = { s, v: new THREE.Vector3(), life: 0, max: 1, g: 0, drag: 0, spin: 0, grow: 0, size: 1, fade: 1, on: false }; this.ps.push(p); }
    }
    const m = p.s.material;
    m.map = tex(kind); m.color.set(color); m.blending = o.additive ? THREE.AdditiveBlending : THREE.NormalBlending; m.rotation = Math.random() * Math.PI * 2; m.opacity = 1; m.needsUpdate = true;
    p.s.position.copy(at); p.v.copy(o.v ?? new THREE.Vector3()).multiplyScalar(this.unit);
    p.life = p.max = o.life ?? 1; p.g = (o.g ?? 0) * this.unit; p.drag = o.drag ?? 0; p.spin = o.spin ?? 0; p.grow = o.grow ?? 0; p.size = (o.size ?? 0.2) * this.unit; p.fade = o.fade ?? 0.6;
    p.s.scale.setScalar(p.size); p.s.visible = true; p.on = true;
  }
  private ring(at: THREE.Vector3, color: string, size: number, life = 0.7, op = 0.7): void {
    let r = this.rings.find((x) => !x.on);
    if (!r) { const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); this.group.add(m); r = { m, life: 0, max: 1, size: 1, on: false, op: 1 }; this.rings.push(r); }
    (r.m.material as THREE.MeshBasicMaterial).color.set(color);
    r.m.position.copy(at).add(new THREE.Vector3(0, 0.01 * this.unit, 0)); r.life = r.max = life; r.size = size * this.unit; r.on = true; r.op = op; r.m.visible = true; r.m.scale.setScalar(0.05);
  }
  /** a burst of sparkles of any colour (used for collects, unlocks…) */
  sparkles(at: THREE.Vector3, color: string, n = 16, power = 1): void {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = rnd(0.8, 2.2) * power; this.spawn('spark', color, at, { v: new THREE.Vector3(Math.cos(a) * s, rnd(1.5, 3.5) * power, Math.sin(a) * s), life: rnd(0.6, 1.1), g: -5, drag: 1.5, size: rnd(0.12, 0.26), additive: true }); }
  }
  confetti(at: THREE.Vector3, n = 40, power = 1): void {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = rnd(0.6, 2.4) * power; this.spawn('confetti', pick(CONFETTI), at, { v: new THREE.Vector3(Math.cos(a) * s, rnd(3, 6) * power, Math.sin(a) * s), life: rnd(1.4, 2.4), g: -4, drag: 1.2, size: rnd(0.08, 0.14), spin: rnd(-8, 8), fade: 0.3 }); }
  }
  fireworks(at: THREE.Vector3, n = 3): void {
    for (let k = 0; k < n; k++) {
      const c = pick(CONFETTI.slice(0, 5)), o = at.clone().add(new THREE.Vector3(rnd(-1.6, 1.6), rnd(1.6, 2.8), rnd(-0.6, 0.4)).multiplyScalar(this.unit));
      setTimeout(() => {
        for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, e = rnd(-0.6, 0.6); this.spawn('spark', c, o, { v: new THREE.Vector3(Math.cos(a) * Math.cos(e) * 2.6, Math.sin(e) * 2.6 + 0.4, Math.sin(a) * Math.cos(e) * 2.6), life: rnd(0.9, 1.3), g: -2, drag: 1.8, size: 0.18, additive: true }); }
        this.spawn('dot', c, o, { life: 0.35, size: 1.4, grow: 1.5, fade: 1, additive: true });
      }, k * 260);
    }
  }
  /** what drifts behind a hop (call every frame while hopping) */
  trail(id: string, at: THREE.Vector3, dt: number, strength = 1): void {
    if (!id || id === 'trail-none') return;
    this.trailAcc += dt * 26 * strength;
    while (this.trailAcc >= 1) {
      this.trailAcc -= 1;
      const p = at.clone().add(new THREE.Vector3(rnd(-0.35, 0.35), rnd(-0.3, 0.3), rnd(-0.35, 0.35)).multiplyScalar(this.unit));
      const up = new THREE.Vector3(rnd(-0.2, 0.2), rnd(0.2, 0.7), rnd(-0.2, 0.2));
      switch (id) {
        case 'trail-sparkle': this.spawn('spark', pick(['#ffe27a', '#ffffff', '#ffd1e8']), p, { v: up, life: 0.7, size: rnd(0.14, 0.24), additive: true, drag: 1 }); break;
        case 'trail-hearts': this.spawn('heart', pick(['#ff4f8b', '#ff8fb8', '#d6336c']), p, { v: up.multiplyScalar(1.4), life: 0.9, size: rnd(0.16, 0.24), drag: 1 }); break;
        case 'trail-leaves': this.spawn('leaf', pick(['#6cc24a', '#9be564', '#3f9b2f']), p, { v: up.setY(-0.3), life: 1.1, size: rnd(0.16, 0.24), g: -0.6, spin: rnd(-4, 4), drag: 0.8 }); break;
        case 'trail-bubbles': this.spawn('bubble', '#bff0ff', p, { v: up.multiplyScalar(1.6), life: 1.0, size: rnd(0.12, 0.24), drag: 0.6 }); break;
        case 'trail-petals': this.spawn('petal', pick(['#ffc2dd', '#ff9cc7', '#fff0f6']), p, { v: up.setY(-0.2), life: 1.2, size: rnd(0.14, 0.2), g: -0.5, spin: rnd(-5, 5) }); break;
        case 'trail-snow': this.spawn('snow', '#ffffff', p, { v: up.setY(-0.25), life: 1.2, size: rnd(0.14, 0.22), g: -0.3, spin: rnd(-2, 2) }); break;
        case 'trail-rainbow': this.spawn('dot', pick(RAINBOW), at.clone(), { life: 0.8, size: 0.32, grow: -0.2, additive: true, fade: 0.9 }); break;
        case 'trail-fire': this.spawn('flame', pick(['#ffb347', '#ff6b1a', '#ffd166']), p, { v: up.multiplyScalar(1.8), life: 0.6, size: rnd(0.16, 0.26), grow: -0.25, additive: true }); break;
        case 'trail-neon': this.spawn('dot', pick(['#46ffe7', '#ff4fd8', '#5b8cff']), at.clone(), { life: 0.55, size: 0.22, additive: true, fade: 1 }); break;
      }
    }
  }
  /** the little effect where you land */
  land(id: string, at: THREE.Vector3): void {
    const u = this.unit;
    switch (id) {
      case 'jump-pop': this.sparkles(at, '#ffe27a', 12, 0.8); break;
      case 'jump-ripple': this.ring(at, '#9fe3ff', 1.6, 0.8); this.ring(at, '#ffffff', 1.1, 0.6, 0.5); break;
      case 'jump-star': for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.spawn('star', '#ffd23f', at.clone().add(new THREE.Vector3(0, 0.1 * u, 0)), { v: new THREE.Vector3(Math.cos(a) * 1.8, 1.4, Math.sin(a) * 1.8), life: 0.7, g: -5, size: 0.2, spin: 3 }); } break;
      case 'jump-petal': for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2; this.spawn('petal', pick(['#ffd23f', '#ffffff', '#ff9cc7']), at, { v: new THREE.Vector3(Math.cos(a) * 1.6, rnd(1, 2), Math.sin(a) * 1.6), life: 0.9, g: -3, size: 0.16, spin: rnd(-6, 6) }); } break;
      case 'jump-shock': this.ring(at, '#ff7ad9', 2.4, 0.5, 0.9); this.ring(at, '#ffffff', 1.6, 0.4, 0.8); break;
      case 'jump-glow': this.spawn('dot', '#fff1a8', at, { life: 0.6, size: 1.6, grow: 1.2, additive: true, fade: 1 }); this.ring(at, '#ffd23f', 1.4, 0.6, 0.6); break;
      case 'jump-bolt': this.spawn('bolt', '#fff27a', at.clone().add(new THREE.Vector3(0, 1.2 * u, 0)), { life: 0.35, size: 1.4, additive: true, fade: 1 }); this.ring(at, '#fff27a', 1.8, 0.4, 0.9); this.sparkles(at, '#fff27a', 10, 0.7); break;
      default: for (let i = 0; i < 7; i++) { const a = Math.random() * Math.PI * 2; this.spawn('dot', '#f1ece4', at, { v: new THREE.Vector3(Math.cos(a) * 1.0, rnd(0.2, 0.6), Math.sin(a) * 1.0), life: 0.6, size: 0.24, grow: 0.5, drag: 3, fade: 0.9 }); } // cloud puff
    }
  }
  /** the celebration effect (the Fuzzy's own move is played by its rig) */
  celebrate(id: string, at: THREE.Vector3): void {
    const u = this.unit, top = at.clone().add(new THREE.Vector3(0, 1.2 * u, 0));
    switch (id) {
      case 'cele-dance': for (let i = 0; i < 6; i++) setTimeout(() => this.spawn('note', pick(['#d6336c', '#3d8bfd', '#ffb703']), top.clone().add(new THREE.Vector3(rnd(-0.8, 0.8) * u, 0, 0)), { v: new THREE.Vector3(rnd(-0.4, 0.4), 1.2, 0), life: 1.2, size: 0.24 }), i * 220); break;
      case 'cele-heart': for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2; this.spawn('heart', pick(['#ff4f8b', '#ff8fb8', '#d6336c']), top, { v: new THREE.Vector3(Math.cos(a) * 1.6, rnd(1, 2.5), Math.sin(a) * 1.6), life: 1.3, g: -1.5, drag: 1.2, size: rnd(0.2, 0.32) }); } break;
      case 'cele-flip': for (let i = 0; i < 8; i++) setTimeout(() => this.spawn('star', '#ffd23f', top, { v: new THREE.Vector3(rnd(-1.5, 1.5), rnd(1, 2), rnd(-0.5, 0.5)), life: 1.0, g: -3, size: 0.2, spin: 4 }), 300 + i * 40); break;
      case 'cele-confetti': this.confetti(top, 50); break;
      case 'cele-fireworks': this.fireworks(at, 3); break;
      case 'cele-moon': for (let i = 0; i < 10; i++) setTimeout(() => this.spawn('dot', '#cfd8ff', at.clone().add(new THREE.Vector3(rnd(-0.3, 0.3) * u, 0.05 * u, rnd(-0.3, 0.3) * u)), { v: new THREE.Vector3(rnd(-0.3, 0.3), 0.4, 0), life: 0.8, size: 0.26, grow: 0.4, fade: 0.9 }), i * 120); this.spawn('moon', '#fff3c4', top.clone().add(new THREE.Vector3(0, 0.4 * u, 0)), { life: 1.8, size: 0.5, v: new THREE.Vector3(0, 0.15, 0), additive: false }); break;
      case 'cele-champion': this.spawn('trophy', '#ffcf3f', top.clone().add(new THREE.Vector3(0, 0.3 * u, 0)), { life: 2.0, size: 0.6, v: new THREE.Vector3(0, 0.25, 0) }); this.sparkles(top, '#ffd23f', 24, 1.1); this.confetti(top, 24, 0.8); break;
      default: for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; this.spawn('spark', pick(['#ffe27a', '#ffffff', '#ff8fb8']), at.clone().add(new THREE.Vector3(Math.cos(a) * 0.9 * u, 0.3 * u, Math.sin(a) * 0.9 * u)), { v: new THREE.Vector3(Math.cos(a + 1.6) * 1.4, 1.4, Math.sin(a + 1.6) * 1.4), life: 0.9, size: 0.2, additive: true, drag: 1 }); } // happy spin ring
    }
  }
  update(dt: number): void {
    for (const p of this.ps) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; p.s.visible = false; continue; }
      p.v.y += p.g * dt; if (p.drag) p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.s.position.addScaledVector(p.v, dt);
      const k = p.life / p.max;
      p.s.material.rotation += p.spin * dt;
      p.s.scale.setScalar(Math.max(0.001, p.size + (1 - k) * p.grow * this.unit));
      p.s.material.opacity = k < p.fade ? k / p.fade : 1;
    }
    for (const r of this.rings) {
      if (!r.on) continue;
      r.life -= dt;
      if (r.life <= 0) { r.on = false; r.m.visible = false; continue; }
      const k = 1 - r.life / r.max;
      r.m.scale.setScalar(0.05 + k * r.size);
      (r.m.material as THREE.MeshBasicMaterial).opacity = r.op * (1 - k);
    }
  }
  dispose(): void {
    for (const p of this.ps) p.s.material.dispose();
    for (const r of this.rings) (r.m.material as THREE.Material).dispose();
    this.ringGeo.dispose();
    this.group.removeFromParent();
    this.ps = []; this.rings = [];
  }
}
