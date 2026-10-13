/**
 * The hero Fuzzy — drawn to match the owner's reference picture: a ball of long, soft, glowing pink fur, two huge glossy eyes
 * with magenta irises and big sparkles, and a wide open smile with two little fangs and a pink tongue. No brows, no hands, no
 * feet: it moves like a fluffy ball (bounces, squashes, rolls into a lean) and its fur trails behind when it runs.
 *
 * The fur is layered "shells": the same ball drawn N times, each a little further out, keeping only the texels where a strand
 * of hair is that long (strands grow in clumps with tapered tips, so the outline is wispy, not a hard edge). Strands bend under
 * gravity and with the run; the fur is shorter around the eyes and mouth so the face sits clean. Any skin colour works — the
 * fur is shaded from the colour itself (dark roots, bright tips), no texture tinting needed.
 *
 *   const f = makeHero(skin, { height: 1.4, lite })   scene.add(f.group)
 *   f.move(0..1, vx)  f.act('hop' | 'cheer')  f.dizzy(on)  f.mood('laugh' | 'happy' | 'o' | 'smile' | 'sad', hold)  f.look(p)  f.update(dt)
 */
import * as THREE from 'three';

export type HeroMood = 'laugh' | 'happy' | 'o' | 'smile' | 'sad';
export interface HeroFuzzy {
  group: THREE.Group;
  /** the part that bounces / squashes (put a hat or a basket on it) */
  body: THREE.Group;
  height: number;
  /** the top of the fur, in body space */
  top: number;
  move(k: number, vx?: number): void;
  act(a: 'hop' | 'cheer'): void;
  dizzy(on: boolean): void;
  mood(m: HeroMood, hold?: number): void;
  look(p: THREE.Vector3 | null): void;
  blink(): void;
  update(dt: number): void;
}

const R = 0.4;      // the skin ball
const FUR = 0.2;    // hair length
const EYE = 0.138;  // eyeball radius

// ---------- textures (shared) ----------
let strandsTex: THREE.DataTexture | null = null;
/** R = strand length 0..1 (clumps of hair with tapered tips), G = a per-clump random (colour variation). */
function strands(): THREE.DataTexture {
  if (strandsTex) return strandsTex;
  const S = 256, CELL = 16, N = S / CELL;
  const data = new Uint8Array(S * S * 4);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cx: number[] = [], cy: number[] = [], len: number[] = [], tint: number[] = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { cx.push((i + 0.15 + rnd() * 0.7) * CELL); cy.push((j + 0.15 + rnd() * 0.7) * CELL); len.push(0.55 + rnd() * 0.45); tint.push(rnd()); }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const ci = Math.floor(x / CELL), cj = Math.floor(y / CELL);
    let best = 0, bt = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = (ci + di + N) % N, jj = (cj + dj + N) % N, k = jj * N + ii;
      let dx = x - cx[k], dy = y - cy[k];
      if (dx > S / 2) dx -= S; if (dx < -S / 2) dx += S; if (dy > S / 2) dy -= S; if (dy < -S / 2) dy += S;
      const d = Math.hypot(dx * 1.2, dy * 0.8) / (CELL * 0.95);
      const h = len[k] * Math.pow(Math.max(0, 1 - d), 0.55);
      if (h > best) { best = h; bt = tint[k]; }
    }
    const hair = rnd() < 0.82 ? 1 : 0.45; // single strands come out shorter → stringy tips
    const o = (y * S + x) * 4;
    data[o] = Math.round(Math.min(1, best * hair) * 255); data[o + 1] = Math.round(bt * 255); data[o + 2] = 0; data[o + 3] = 255;
  }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
  strandsTex = t; return t;
}

let irisTex: THREE.CanvasTexture | null = null;
function iris(): THREE.CanvasTexture {
  if (irisTex) return irisTex;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d')!;
  const m = S / 2;
  const rad = g.createRadialGradient(m, m, 0, m, m, m);
  rad.addColorStop(0, '#08030a'); rad.addColorStop(0.4, '#08030a'); rad.addColorStop(0.43, '#6a1240');
  rad.addColorStop(0.55, '#c22a78'); rad.addColorStop(0.78, '#e65aa6'); rad.addColorStop(0.9, '#a01860'); rad.addColorStop(0.97, '#3a0622'); rad.addColorStop(1, '#3a0622');
  g.fillStyle = rad; g.fillRect(0, 0, S, S);
  // iris fibres: thin light and dark spokes between the pupil and the rim
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2 + Math.sin(i * 7.1) * 0.02, r0 = m * (0.46 + Math.random() * 0.06), r1 = m * (0.8 + Math.random() * 0.12);
    g.strokeStyle = i % 2 ? 'rgba(255,190,225,0.32)' : 'rgba(90,10,50,0.28)'; g.lineWidth = 1 + Math.random() * 1.5;
    g.beginPath(); g.moveTo(m + Math.cos(a) * r0, m + Math.sin(a) * r0); g.lineTo(m + Math.cos(a) * r1, m + Math.sin(a) * r1); g.stroke();
  }
  // a soft lighter crescent low in the iris (light coming through the cornea)
  const lo = g.createRadialGradient(m * 1.1, m * 1.45, 0, m * 1.1, m * 1.45, m * 0.6); lo.addColorStop(0, 'rgba(255,170,215,0.55)'); lo.addColorStop(1, 'rgba(255,170,215,0)');
  g.globalCompositeOperation = 'lighter'; g.fillStyle = lo; g.beginPath(); g.arc(m, m, m * 0.9, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'source-over';
  // keep the pupil pure black on top
  g.fillStyle = '#060207'; g.beginPath(); g.arc(m, m, m * 0.41, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  irisTex = t; return t;
}

// ---------- geometry ----------
const dirOf = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();
const EYES = [dirOf(-0.36, 0.26, 0.9), dirOf(0.36, 0.26, 0.9)];
const MOUTH = dirOf(0, -0.16, 0.99);

function ballGeometry(lite: boolean): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(R, lite ? 48 : 72, lite ? 36 : 54);
  const p = g.attributes.position, n = g.attributes.normal, mask = new Float32Array(p.count);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(n, i);
    let m = 1;
    for (const e of EYES) m = Math.min(m, THREE.MathUtils.smoothstep(Math.acos(Math.min(1, v.dot(e))), 0.28, 0.46));
    // the mouth: a wide oval — shorter fur all round it
    const mx = v.x / 0.58, my = (v.y + 0.38) / 0.32, md = Math.hypot(mx, my) * (v.z > 0 ? 1 : 9);
    m = Math.min(m, THREE.MathUtils.smoothstep(md, 0.85, 1.3));
    mask[i] = m;
  }
  g.setAttribute('mask', new THREE.BufferAttribute(mask, 1));
  return g;
}

function furMaterial(color: THREE.Color, k: number, u: { uTime: { value: number }; uDrag: { value: THREE.Vector3 } }, core: boolean): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 });
  const uK = { value: k };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uK = uK; sh.uniforms.uLen = { value: FUR }; sh.uniforms.uTime = u.uTime; sh.uniforms.uDrag = u.uDrag; sh.uniforms.uStrands = { value: strands() };
    sh.vertexShader = 'attribute float mask;\nuniform float uK, uLen, uTime;\nuniform vec3 uDrag;\nvarying vec2 vFurUv;\nvarying float vMask;\nvarying vec3 vN;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vFurUv = uv; vMask = mask; vN = normal;
      float k = uK;
      // hair stands out, droops under its weight (less on top, where it sticks up), sways and trails behind a run
      float top = smoothstep(0.45, 0.95, normal.y);
      vec3 droop = vec3(0.0, -0.7, 0.0) * (1.0 - top) + vec3(0.0, 0.55, 0.0) * top;
      float sway = sin(uTime * 2.3 + position.x * 9.0 + position.y * 7.0) * 0.18 + sin(uTime * 3.7 + position.z * 11.0) * 0.08;
      vec3 bend = droop + vec3(sway, 0.0, sway * 0.6) + uDrag;
      transformed += (normal * uLen * k + bend * uLen * k * k) * mask;`);
    sh.fragmentShader = 'uniform float uK;\nuniform sampler2D uStrands;\nvarying vec2 vFurUv;\nvarying float vMask;\nvarying vec3 vN;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec4 st = texture2D(uStrands, vFurUv * vec2(3.0, 1.6));
      ${core ? '' : 'if (st.r * vMask < uK + 0.015) discard;'}
      // roots in shadow, tips catching the light, a little colour variation per clump
      float k2 = ${core ? '0.0' : 'uK'};
      diffuseColor.rgb *= mix(0.42, 1.18, k2) * (0.88 + 0.24 * st.g);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.8, 0.9), k2 * k2 * 0.07);`);
  };
  m.customProgramCacheKey = () => (core ? 'fz-fur-core' : 'fz-fur');
  return m;
}

// ---------- the face ----------
function eye(side: number): { g: THREE.Group; look: THREE.Group; lid: THREE.Mesh; llid: THREE.Mesh } {
  const g = new THREE.Group();
  const d = EYES[side < 0 ? 0 : 1];
  g.position.copy(d).multiplyScalar(R + 0.035);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
  const white = new THREE.Mesh(new THREE.SphereGeometry(EYE, 32, 24), new THREE.MeshPhysicalMaterial({ color: '#fffafc', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }));
  white.scale.set(1, 1.07, 0.82); g.add(white);
  const look = new THREE.Group(); g.add(look);
  // the iris + pupil: a cap on the eyeball's front with the painted iris, under a clear glossy cornea
  const cap = new THREE.SphereGeometry(EYE * 1.006, 40, 20, 0, Math.PI * 2, 0, 0.66).rotateX(Math.PI / 2);
  { const p = cap.attributes.position, uv = cap.attributes.uv; const s = Math.sin(0.66) * EYE; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * s) + 0.5, p.getY(i) / (2 * s) + 0.5); }
  const irisMesh = new THREE.Mesh(cap, new THREE.MeshPhysicalMaterial({ map: iris(), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03 }));
  irisMesh.scale.set(1, 1.07, 0.82); look.add(irisMesh);
  // catchlights (they stay put while the eye looks around): a big one up-left, a small one down-right, a tiny sparkle
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const [x, y, r] of [[-0.045, 0.05, 0.034], [0.04, -0.035, 0.016], [-0.005, 0.072, 0.009]] as const) {
    const s = new THREE.Mesh(new THREE.CircleGeometry(r, 20), shine); s.position.set(x, y, EYE * 0.84); g.add(s);
  }
  // lids (fur-coloured), hidden behind the eye until a blink or a squint
  const lidGeo = new THREE.SphereGeometry(EYE * 1.06, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2);
  const lidMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  const lid = new THREE.Mesh(lidGeo, lidMat); lid.scale.set(1, 1.07, 0.85); g.add(lid);
  const llid = new THREE.Mesh(lidGeo, lidMat); llid.scale.set(1, 1.07, 0.85); g.add(llid);
  return { g, look, lid, llid };
}

function mouth(): { g: THREE.Group; fangs: THREE.Object3D[] } {
  const g = new THREE.Group();
  g.position.copy(MOUTH).multiplyScalar(R + 0.012);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), MOUTH);
  const W = 0.2, H = 0.17;
  // the D: a flat top edge, a round bottom; bent onto the ball so it hugs the face
  const shape = new THREE.Shape(); shape.moveTo(-W, 0.02);
  shape.quadraticCurveTo(0, 0.045, W, 0.02);
  shape.bezierCurveTo(W * 0.98, -H * 0.85, W * 0.45, -H * 1.05, 0, -H * 1.05);
  shape.bezierCurveTo(-W * 0.45, -H * 1.05, -W * 0.98, -H * 0.85, -W, 0.02);
  const bend = (geo: THREE.BufferGeometry, lift: number) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const rr = R + 0.012; p.setZ(i, lift - (x * x + y * y) / (2 * rr)); } geo.computeVertexNormals(); return geo; };
  const inner = bend(new THREE.ShapeGeometry(shape, 24), 0);
  { const p = inner.attributes.position, col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i); const edge = Math.min(1, Math.hypot(x / W, (y + H * 0.45) / (H * 0.6))); const c = new THREE.Color('#2a0410').lerp(new THREE.Color('#7a1430'), Math.pow(edge, 3)); col.set([c.r, c.g, c.b], i * 3); } inner.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  g.add(new THREE.Mesh(inner, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })));
  // the tongue: fills the bottom of the mouth, its top edge bulging up either side of a little groove, lighter where it's lit
  const ts = new THREE.Shape(); ts.moveTo(-W * 0.7, -H * 0.62);
  ts.quadraticCurveTo(-W * 0.36, -H * 0.36, -W * 0.02, -H * 0.5); ts.quadraticCurveTo(W * 0.36, -H * 0.36, W * 0.7, -H * 0.62);
  ts.bezierCurveTo(W * 0.6, -H * 0.9, W * 0.32, -H * 1.0, 0, -H * 1.0); ts.bezierCurveTo(-W * 0.32, -H * 1.0, -W * 0.6, -H * 0.9, -W * 0.7, -H * 0.62);
  const tg = bend(new THREE.ShapeGeometry(ts, 16), 0.003);
  { const p = tg.attributes.position, col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const k = THREE.MathUtils.clamp((p.getY(i) + H) / (H * 0.6), 0, 1); const c = new THREE.Color('#c84a66').lerp(new THREE.Color('#ff9aae'), k * 0.9); col.set([c.r, c.g, c.b], i * 3); } tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  g.add(new THREE.Mesh(tg, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, clearcoat: 0.5 })));
  // two little fangs hanging from the top lip
  const fangs: THREE.Object3D[] = [];
  const fangMat = new THREE.MeshPhysicalMaterial({ color: '#fffaf6', roughness: 0.25, clearcoat: 1 });
  for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.072, 14), fangMat); f.rotation.x = Math.PI; f.scale.z = 0.7; f.position.set(sx * W * 0.58, -0.012, 0.004); g.add(f); fangs.push(f); }
  return { g, fangs };
}

// ---------- the Fuzzy ----------
const SHAPES: Record<HeroMood, { sx: number; sy: number; flip: number; squint: number; lid: number }> = {
  // the owner's picture: eyes always wide open — moods change the mouth (and lids only for sad)
  laugh: { sx: 1, sy: 1, flip: 0, squint: 0, lid: 0 },
  happy: { sx: 1.1, sy: 1.12, flip: 0, squint: 0, lid: 0 },
  o: { sx: 0.52, sy: 0.8, flip: 0, squint: 0, lid: 0 },
  smile: { sx: 0.95, sy: 0.32, flip: 0, squint: 0, lid: 0 },
  sad: { sx: 0.6, sy: 0.3, flip: 1, squint: 0, lid: 0.22 },
};

export function makeHero(skin: [string, string], opts: { height?: number; lite?: boolean; shadow?: boolean } = {}): HeroFuzzy {
  const lite = !!opts.lite;
  const group = new THREE.Group();
  const body = new THREE.Group(); group.add(body);
  const ball = new THREE.Group(); ball.position.y = R + 0.02; body.add(ball);
  const geo = ballGeometry(lite);
  const color = new THREE.Color(skin[0]);
  // a touch more saturated and brighter: the reference fur glows
  { const hsl = { h: 0, s: 0, l: 0 }; color.getHSL(hsl); color.setHSL(hsl.h, Math.min(1, hsl.s * 1.1 + 0.06), Math.min(0.66, hsl.l)); }
  const u = { uTime: { value: 0 }, uDrag: { value: new THREE.Vector3() } };
  const core = new THREE.Mesh(geo, furMaterial(color, 0, u, true)); core.castShadow = opts.shadow ?? true; core.receiveShadow = true; ball.add(core);
  const N = lite ? 22 : 36;
  for (let i = 1; i <= N; i++) { const s = new THREE.Mesh(geo, furMaterial(color, i / N, u, false)); s.castShadow = false; s.receiveShadow = true; s.renderOrder = i; ball.add(s); }
  // a few long wisps on top so the silhouette has that messy crown
  const eyes = [eye(-1), eye(1)];
  for (const e of eyes) { (e.lid.material as THREE.MeshStandardMaterial).color.copy(color).multiplyScalar(0.92); ball.add(e.g); }
  const m = mouth(); ball.add(m.g);
  const scale = (opts.height ?? 1) / ((R + FUR) * 2 + 0.02);
  group.scale.setScalar(scale);

  // ---- state ----
  let mv = 0, vx = 0, hopPhase = 0, y = 0, vy = 0, squash = 0, sqV = 0, spin = 0, dizzyOn = false, t = 0;
  let cur: HeroMood = 'laugh', base: HeroMood = 'laugh', hold = 0;
  const shp = { ...SHAPES.laugh };
  let blinkT = 2, blinking = -1;
  let target: THREE.Vector3 | null = null; const glance = new THREE.Vector2(); let glanceT = 1;
  const tmp = new THREE.Vector3(), q = new THREE.Quaternion(), e3 = new THREE.Euler();
  const ease = (a: number, b: number, k: number, dt: number) => a + (b - a) * Math.min(1, dt * k);
  const LID_OPEN = -2.6, LLID_HIDE = 3.05;

  const f: HeroFuzzy = {
    group, body, height: opts.height ?? 1, top: R + 0.02 + R + FUR * 0.7,
    move(k, v = 0) { mv = Math.max(0, Math.min(1, k)); vx = v; },
    act(a) { if (y < 0.02) { vy = a === 'cheer' ? 2.6 : 1.7; squash = -0.18; } if (a === 'cheer') spin = 1; },
    dizzy(on) { dizzyOn = on; },
    mood(mo, h = 0) { if (h > 0) { cur = mo; hold = h; } else { base = mo; if (hold <= 0) cur = mo; } },
    look(p) { target = p ? (target ?? new THREE.Vector3()).copy(p) : null; },
    blink() { if (blinking < 0) blinking = 0; },
    update(dt) {
      t += dt; u.uTime.value = t;
      // bouncing along: little hops in rhythm while running, a soft breath when still
      if (mv > 0.08 && y < 0.001 && vy <= 0) { hopPhase += dt * (5 + mv * 4); if (hopPhase > 1) { hopPhase = 0; vy = 0.55 + mv * 0.55; squash = -0.08; } }
      vy -= 9.8 * dt; y = Math.max(0, y + vy * dt);
      if (y === 0 && vy < 0) { if (vy < -0.8) { sqV -= vy * 0.25; } vy = 0; }
      // squash & stretch spring (positive = squashed)
      sqV += (-squash * 120 - sqV * 11) * dt; squash += sqV * dt;
      const breathe = Math.sin(t * 2.2) * 0.018 * (1 - mv);
      const sq = squash + breathe + (vy > 0.2 ? -0.05 : 0);
      body.position.y = y;
      body.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
      spin = Math.max(0, spin - dt * 1.6);
      ball.rotation.y = spin > 0 ? (1 - spin) * Math.PI * 2 : 0;
      ball.rotation.z = dizzyOn ? Math.sin(t * 9) * 0.16 : ease(ball.rotation.z, 0, 8, dt);
      ball.rotation.x = dizzyOn ? Math.cos(t * 9) * 0.12 : ease(ball.rotation.x, mv * 0.12, 6, dt);
      // the fur trails behind the run and lifts on a hop
      u.uDrag.value.set(ease(u.uDrag.value.x, -vx * 0.09, 6, dt), ease(u.uDrag.value.y, -vy * 0.12, 8, dt), 0);
      // face
      if (hold > 0) { hold -= dt; if (hold <= 0) cur = base; }
      const S = SHAPES[dizzyOn ? 'o' : cur];
      for (const k of ['sx', 'sy', 'flip', 'squint', 'lid'] as const) shp[k] = ease(shp[k], S[k], 12, dt);
      m.g.scale.set(shp.sx, shp.sy * (1 - 2 * shp.flip), 1);
      m.fangs.forEach((fg) => { fg.visible = shp.flip < 0.5 && shp.sy > 0.5; });
      blinkT -= dt; if (blinkT <= 0 && blinking < 0) { blinking = 0; blinkT = 2 + Math.random() * 3.5; }
      let shut = 0; if (blinking >= 0) { blinking += dt; const b = blinking / 0.15; shut = b < 0.5 ? b * 2 : Math.max(0, 2 - b * 2); if (b >= 1) blinking = -1; }
      glanceT -= dt; if (glanceT <= 0) { glanceT = 1 + Math.random() * 2.5; glance.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.4) * 0.3); }
      for (const e of eyes) {
        let yaw = glance.x, pitch = glance.y;
        if (target) { e.g.updateWorldMatrix(true, false); tmp.copy(target); e.g.worldToLocal(tmp); tmp.normalize(); yaw = Math.atan2(tmp.x, tmp.z); pitch = Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)); }
        if (dizzyOn) { yaw = Math.cos(t * 7 + e.g.position.x * 9) * 0.35; pitch = Math.sin(t * 7 + e.g.position.x * 9) * 0.3; }
        yaw = Math.max(-0.42, Math.min(0.42, yaw)); pitch = Math.max(-0.32, Math.min(0.32, pitch));
        q.setFromEuler(e3.set(-pitch, yaw, 0, 'YXZ')); e.look.quaternion.slerp(q, Math.min(1, dt * 14));
        e.lid.rotation.x = LID_OPEN + (0 - LID_OPEN) * Math.max(shut, shp.lid);
        e.llid.rotation.x = LLID_HIDE + (0.75 - LLID_HIDE) * shp.squint;
      }
    },
  };
  f.update(0);
  return f;
}
