/**
 * Fuzzies Boat Race — the 3D scene, camera, controls and HUD. Everything that *decides* (laps, places, physics) lives in
 * land/race.ts; this file only draws it and feeds it input. Runs in its own full-screen layer over the town with its own
 * renderer (the town's view is paused meanwhile), then cleans up completely. Art follows ART.md (PAL colours, soft shapes).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as M from '../game/models3d';
import * as T from '../game/textures3d';
import { race as snd, engine as makeEngine } from '../game/sound';
import { RaceSim, LAPS, ISLAND_R, OUTER_R, GATE_W, type Boat } from './race';
import { PAL, std, add } from './models';
import { buildSky } from './environment';

export interface RaceSetup {
  you: { name: string; skin: [string, string] };
  rivals: { name: string; skin: [string, string]; skill: number }[];
  mobile: boolean;
  sound: boolean;
  /** which boat is a resident (index into the town's Fuzzies) — rivals keep their town index, the player is -1 */
  portrait: (index: number) => string;
}
export interface RaceResult { place: number; timeMs: number; order: { name: string; place: number; you: boolean; index: number }[] }
export interface RaceHooks { onFinish: (r: RaceResult) => void; onQuit: () => void }

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; };
const lerpAngle = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

// ---------- models ----------
function paint(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 0.15, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
}
const ROPE = std('#e8d9bf', 0.95), WHITE = std('#fffaf0', 0.5), DARK = std('#3a3f4a', 0.5, 0.3);
const GLASS = new THREE.MeshPhysicalMaterial({ color: '#cfeeff', transmission: 0.7, roughness: 0.05, thickness: 0.2, transparent: true, opacity: 0.75 });

/** A racing boat in the Fuzzies style: a rounded speedboat hull, cockpit, windscreen, engine, number flag — and its Fuzzy at the wheel. */
function boatModel(mats: M.Mats, skin: [string, string], hullColor: string, num: number, mobile: boolean): { g: THREE.Group; fuzzy: M.FuzzyModel; wheel: THREE.Mesh; flag: THREE.Mesh } {
  const g = new THREE.Group();
  // hull: a plan-view shape (pointy bow, flat stern) extruded and bevelled, then smoothed by the clearcoat
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.35); shape.bezierCurveTo(0.55, 1.1, 0.62, 0.2, 0.6, -0.9); shape.lineTo(0.5, -1.15); shape.lineTo(-0.5, -1.15); shape.lineTo(-0.6, -0.9); shape.bezierCurveTo(-0.62, 0.2, -0.55, 1.1, 0, 1.35);
  const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 4, curveSegments: 18 });
  hullGeo.rotateX(Math.PI / 2); hullGeo.translate(0, 0.5, 0); // y up, bow towards +z
  hullGeo.computeVertexNormals();
  const hull = add(g, hullGeo, paint(hullColor), 0, -0.25, 0);
  hull.castShadow = !mobile;
  // a white rub rail round the hull and a racing stripe down the deck
  add(g, new THREE.TorusGeometry(0.58, 0.035, 8, 40).rotateX(Math.PI / 2).scale(1, 1, 2.1), ROPE, 0, 0.17, 0.05, false);
  add(g, new THREE.BoxGeometry(0.16, 0.012, 1.0), WHITE, 0, 0.265, 0.72, false);
  // deck + cockpit well
  add(g, new THREE.BoxGeometry(0.9, 0.08, 1.9).translate(0, 0, 0), std('#f1d38a', 0.8), 0, 0.22, -0.1, false);
  add(g, new THREE.BoxGeometry(0.66, 0.08, 0.9), DARK, 0, 0.23, -0.3, false);
  // windscreen
  const ws = add(g, new THREE.BoxGeometry(0.7, 0.3, 0.04), GLASS, 0, 0.42, 0.35, false);
  ws.rotation.x = -0.35;
  // steering wheel
  const wheel = add(g, new THREE.TorusGeometry(0.1, 0.018, 8, 20), DARK, 0, 0.42, 0.14, false);
  wheel.rotation.x = -0.8;
  // engine at the stern + propeller housing
  add(g, new THREE.BoxGeometry(0.34, 0.3, 0.26).translate(0, 0, 0), DARK, 0, 0.32, -1.1, false);
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10).rotateX(Math.PI / 2), std('#8a8f99', 0.4, 0.6), 0, 0.1, -1.3, false);
  // flag pole with the racer's number
  add(g, new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), std('#6b6f78', 0.5, 0.4), -0.32, 0.6, -0.85, false);
  const flagTex = numberFlag(num, hullColor);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24, 6, 1).translate(0.17, 0, 0), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.set(-0.32, 0.86, -0.85);
  flag.rotation.y = -Math.PI / 2;
  g.add(flag);
  // the Fuzzy at the wheel (a little smaller than in town, sat in the well, facing forward)
  const fuzzy = M.makeFuzzy(mats, skin, 0.24, 0.075, mobile ? 6 : 9);
  fuzzy.group.position.set(0, 0.5, -0.2);
  g.add(fuzzy.group);
  // paws on the wheel
  for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.05, 10, 8), std(skin[1], 0.8), sx * 0.1, 0.44, 0.12, false);
  return { g, fuzzy, wheel, flag };
}

function numberFlag(n: number, color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 128; c.height = 96;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fffaf0'; x.fillRect(0, 0, 128, 96);
  x.fillStyle = color; x.fillRect(0, 0, 128, 22); x.fillRect(0, 74, 128, 22);
  x.fillStyle = '#18171c'; x.font = '700 48px Fredoka, Poppins, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(n), 64, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** A lumpy rock (sticks out of the water on the reef and the shore). */
function rock(seed: number, r: number): THREE.Mesh {
  const rr = T.rng(seed);
  const geo = new THREE.IcosahedronGeometry(r, 2);
  const p = geo.attributes.position;
  const bumps = [0, 1, 2].map(() => new THREE.Vector3(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize());
  const v = new THREE.Vector3();
  const col = new Float32Array(p.count * 3);
  const grey = new THREE.Color('#8f8a80'), moss = new THREE.Color('#6fa35a');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const k = 1 + bumps.reduce((a, b) => a + Math.max(0, v.dot(b)) * 0.25, 0);
    p.setXYZ(i, v.x * r * k * 1.15, v.y * r * k * 0.7, v.z * r * k);
    c.copy(grey).lerp(moss, Math.max(0, v.y - 0.35) * 0.9);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  m.position.y = -r * 0.35;
  return m;
}

/** A palm: a leaning trunk from a curve, a crown of drooping fronds and a couple of coconuts. */
function palm(seed: number, h: number, leaf: THREE.Material): THREE.Group {
  const rr = T.rng(seed);
  const g = new THREE.Group();
  const lean = new THREE.Vector3((rr() - 0.5) * 0.9, 0, (rr() - 0.5) * 0.9);
  const pts = [0, 0.25, 0.5, 0.75, 1].map((k) => new THREE.Vector3(lean.x * k * k * h, k * h, lean.z * k * k * h));
  const curve = new THREE.CatmullRomCurve3(pts);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.13, 8, false), new THREE.MeshStandardMaterial({ color: '#b58a5a', roughness: 0.95 }));
  trunk.castShadow = true;
  g.add(trunk);
  const top = pts[4];
  const frondGeo = new THREE.PlaneGeometry(0.5, 2.2, 1, 6);
  const fp = frondGeo.attributes.position;
  for (let i = 0; i < fp.count; i++) { const y = fp.getY(i); fp.setZ(i, -Math.pow((y + 1.1) / 2.2, 2) * 0.9); fp.setX(i, fp.getX(i) * (1 - Math.abs(y + 1.1) / 2.6)); }
  frondGeo.translate(0, 1.1, 0).rotateX(-Math.PI / 2);
  frondGeo.computeVertexNormals();
  const n = 7 + Math.floor(rr() * 3);
  for (let i = 0; i < n; i++) {
    const f = new THREE.Mesh(frondGeo, leaf);
    f.position.copy(top);
    f.rotation.set(-0.25 - rr() * 0.3, (i / n) * Math.PI * 2 + rr() * 0.3, 0, 'YXZ');
    g.add(f);
  }
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), std('#8a5a30', 0.9)); c.position.copy(top).add(new THREE.Vector3((rr() - 0.5) * 0.3, -0.15, (rr() - 0.5) * 0.3)); g.add(c); }
  return g;
}

/** The lagoon: a big plane with its own shader — deep blue to turquoise near the island and the reef, waves, glints and foam. */
function water(time: { value: number }): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uDeep: { value: new THREE.Color('#1f6fb0') }, uMid: { value: new THREE.Color('#2fa3c9') }, uShallow: { value: new THREE.Color('#79dfd7') }, uHorizon: { value: new THREE.Color('#cfe6ee') }, uIsland: { value: ISLAND_R }, uReef: { value: OUTER_R } },
    vertexShader: `uniform float uTime; varying vec3 vW; varying float vH;
      void main() { vec3 p = position; float far = 1.0 - smoothstep(40.0, 80.0, length(p.xz)); float w = (sin(p.x * 0.55 + uTime * 1.3) * 0.08 + sin(p.z * 0.7 - uTime * 1.1) * 0.07 + sin((p.x + p.z) * 0.32 + uTime * 0.7) * 0.06) * far; p.y += w; vH = w;
        vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uTime, uIsland, uReef; uniform vec3 uDeep, uMid, uShallow, uHorizon; varying vec3 vW; varying float vH;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        float d = length(vW.xz); float t = uTime;
        float shore = 1.0 - smoothstep(uIsland, uIsland + 7.0, d);          // shallow turquoise around the island
        float reef = smoothstep(uReef - 5.0, uReef - 1.0, d) * (1.0 - smoothstep(uReef + 1.5, uReef + 6.0, d)); // and along the reef only
        float camD = length(vW.xz - cameraPosition.xz);
        float near = 1.0 - smoothstep(18.0, 60.0, camD);                      // fine detail only close to the camera (no shimmering far away)
        float n = noise(vW.xz * 0.5 + vec2(t * 0.12, t * 0.07)) * 0.6 + noise(vW.xz * 1.4 - vec2(t * 0.2, -t * 0.1)) * 0.4;
        vec3 c = mix(uDeep, uMid, smoothstep(0.0, 0.5, shore + reef));
        c = mix(c, uShallow, smoothstep(0.45, 1.0, shore + reef * 0.8));
        c += (vec3(0.09, 0.13, 0.13) * smoothstep(0.6, 0.9, n) + vec3(0.05) * vH * 4.0) * (0.35 + 0.65 * near);
        float band = sin(shore * 22.0 - t * 1.6 + n * 3.0) * 0.5 + 0.5;
        float foam = smoothstep(0.88, 1.0, shore) + smoothstep(0.8, 1.0, band) * smoothstep(0.6, 0.95, shore) * 0.5 + smoothstep(0.93, 1.0, reef) * (0.4 + 0.4 * sin(t * 2.0 + vW.x));
        c = mix(c, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.85 * (0.5 + 0.5 * near));
        c += vec3(1.0) * smoothstep(0.94, 0.99, noise(vW.xz * 2.2 + t * 0.5)) * 0.4 * near;
        c = mix(c, uHorizon, smoothstep(60.0, 150.0, d));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(360, 360, 90, 90).rotateX(-Math.PI / 2), mat);
  m.position.y = -0.1;
  return m;
}

/** Palm Island: a hill of sand and grass in the middle of the lagoon, with palms, bushes, rocks and a hut. */
function island(leaf: THREE.Material, mobile: boolean): THREE.Group {
  const g = new THREE.Group();
  const R = ISLAND_R + 1.6;
  const geo = new THREE.CircleGeometry(R, 72, 0, Math.PI * 2);
  // a lumpy hill: rings of vertices lifted by distance to the centre + noise, coloured sand → grass
  const dense = new THREE.PlaneGeometry(R * 2, R * 2, 64, 64).rotateX(-Math.PI / 2);
  const p = dense.attributes.position;
  const col = new Float32Array(p.count * 3);
  const rr = T.rng(7);
  const sand = new THREE.Color('#f1d38a'), grass = new THREE.Color('#79c86b'), dark = new THREE.Color('#5aa85c');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z) / R;
    const n = Math.sin(x * 0.9) * Math.cos(z * 0.7) * 0.35 + Math.sin(x * 2.1 + z * 1.7) * 0.15;
    const h = d > 1 ? -1.2 : Math.max(-1.2, (1 - d) * (1 - d) * 3.2 + n * (1 - d) - 0.05);
    p.setY(i, h);
    const k = THREE.MathUtils.clamp((h - 0.15) / 0.5, 0, 1);
    c.copy(sand).lerp(grass, k).lerp(dark, Math.max(0, n) * 0.5 * k);
    col.set([c.r, c.g, c.b], i * 3);
  }
  dense.setAttribute('color', new THREE.BufferAttribute(col, 3));
  dense.computeVertexNormals();
  const ground = new THREE.Mesh(dense, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  ground.receiveShadow = !mobile;
  g.add(ground);
  void geo;
  // palms in a loose ring, taller towards the middle
  const n = mobile ? 10 : 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rr() * 0.5, r = 4 + rr() * 5;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const pm = palm(i * 13 + 1, 2.2 + rr() * 1.6 + (1 - r / 9) * 1.2, leaf);
    pm.position.set(x, heightAt(x, z, R) - 0.05, z);
    g.add(pm);
  }
  // bushes and rocks
  for (let i = 0; i < 14; i++) {
    const a = rr() * Math.PI * 2, r = 2 + rr() * 8, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rr() * 0.35, 1), std(i % 3 ? '#5fb75d' : '#ff8fb4', 0.9));
    b.position.set(x, heightAt(x, z, R) + 0.15, z); b.scale.y = 0.7; g.add(b);
  }
  for (let i = 0; i < 8; i++) { const a = rr() * Math.PI * 2, r = R - 0.4 - rr() * 1.5; const k = rock(i * 5 + 2, 0.45 + rr() * 0.5); k.position.set(Math.cos(a) * r, k.position.y + 0.15, Math.sin(a) * r); g.add(k); }
  // a little beach hut with a straw roof + a flag (the race HQ)
  const hut = new THREE.Group();
  add(hut, new THREE.BoxGeometry(1.6, 1.1, 1.3), std('#e8c08a', 0.85), 0, 0.55, 0);
  add(hut, new THREE.ConeGeometry(1.45, 0.9, 4).rotateY(Math.PI / 4), std('#d9b25d', 1), 0, 1.5, 0);
  add(hut, new THREE.BoxGeometry(0.5, 0.7, 0.06), std('#8a5a30', 0.8), 0.2, 0.35, 0.67, false);
  add(hut, new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), std('#6b6f78', 0.5, 0.4), 0.9, 1.1, 0.5, false);
  add(hut, new THREE.PlaneGeometry(0.6, 0.4).translate(0.3, 0, 0), new THREE.MeshStandardMaterial({ color: PAL.raspberry, side: THREE.DoubleSide, roughness: 0.8 }), 0.9, 2.05, 0.5, false);
  hut.position.set(0, heightAt(0, 0, R) - 0.1, 0);
  hut.rotation.y = 0.6;
  g.add(hut);
  return g;
}
function heightAt(x: number, z: number, R: number): number {
  const d = Math.hypot(x, z) / R;
  const n = Math.sin(x * 0.9) * Math.cos(z * 0.7) * 0.35 + Math.sin(x * 2.1 + z * 1.7) * 0.15;
  return d > 1 ? -1.2 : Math.max(-1.2, (1 - d) * (1 - d) * 3.2 + n * (1 - d) - 0.05);
}

/** Checkpoint gates: a pair of striped buoys with pennants; gate 0 is the start/finish arch with a chequered banner. */
function gateModel(start: boolean): THREE.Group {
  const g = new THREE.Group();
  const buoy = (sx: number) => {
    const b = new THREE.Group();
    add(b, new THREE.SphereGeometry(0.55, 20, 14), paint(start ? PAL.raspberry : '#ff8c42'), 0, 0, 0, false).scale.y = 0.8;
    add(b, new THREE.TorusGeometry(0.5, 0.08, 8, 24).rotateX(Math.PI / 2), WHITE, 0, 0.05, 0, false);
    add(b, new THREE.CylinderGeometry(0.04, 0.04, start ? 3.4 : 1.6, 8), std('#6b6f78', 0.5, 0.4), 0, start ? 1.7 : 0.9, 0, false);
    if (!start) add(b, new THREE.PlaneGeometry(0.55, 0.35).translate(0.28, 0, 0), new THREE.MeshStandardMaterial({ color: '#ffc94a', side: THREE.DoubleSide, roughness: 0.8 }), 0, 1.55, 0, false);
    b.position.x = sx * GATE_W;
    return b;
  };
  g.add(buoy(-1), buoy(1));
  if (start) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const x = c.getContext('2d')!;
    for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#18171c' : '#ffffff'; x.fillRect(i * 16, j * 16, 16, 16); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(GATE_W * 2, 0.7, 24, 1), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
    banner.position.y = 3.1;
    banner.name = 'banner';
    g.add(banner);
  }
  return g;
}

// ---------- the run ----------
export function runRace(stage: HTMLElement, setup: RaceSetup, hooks: RaceHooks): void {
  const mobile = setup.mobile;
  const racers = [{ name: setup.you.name, you: true }, ...setup.rivals.map((r) => ({ name: r.name, you: false, skill: r.skill }))];
  const sim = new RaceSim(racers);

  // ---- DOM ----
  const root = el('div', 'race');
  const canvas = document.createElement('canvas');
  canvas.className = 'race-canvas';
  const hud = el('div', 'race-hud');
  const lapEl = el('div', 'race-lap'); const lapN = el('b', '', '1'); lapEl.append(el('small', '', 'LAP'), lapN, el('span', '', `/${LAPS}`));
  const posEl = el('div', 'race-pos'); const posN = el('b', '', '1st'); posEl.append(el('small', '', 'POSITION'), posN);
  const timeEl = el('div', 'race-time', '0:00.0');
  const arrow = el('div', 'race-arrow'); const arrowIn = el('span', 'race-arrow-in', '➤'); const arrowD = el('small', ''); arrow.append(arrowIn, arrowD);
  const wrong = el('div', 'race-wrong', 'Wrong way! Turn around');
  const pauseBtn = el('button', 'race-pause'); pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.textContent = '❚❚';
  const count = el('div', 'race-count');
  const banner = el('div', 'race-banner');
  const map = document.createElement('canvas'); map.className = 'race-map'; map.width = map.height = 160;
  const hint = el('div', 'race-hint', mobile ? 'Hold the left or right side to steer — the engine runs by itself' : 'W / ↑ accelerate · A / D or ← → steer · S / ↓ brake · Esc pause');
  hud.append(lapEl, posEl, timeEl, arrow, wrong, pauseBtn, map, count, banner, hint);
  const touch = el('div', 'race-touch');
  const left = el('div', 'race-touch-l'); left.append(el('span', '', '◀'));
  const right = el('div', 'race-touch-r'); right.append(el('span', '', '▶'));
  const brake = el('button', 'race-brake', 'BRAKE'); brake.type = 'button';
  touch.append(left, right, brake);
  if (!mobile) touch.classList.add('mouse');
  const pauseOverlay = el('div', 'race-paused'); pauseOverlay.hidden = true;
  const resume = el('button', 'btn btn-primary btn-lg', 'Resume'); resume.type = 'button';
  const quit = el('button', 'btn btn-ghost', 'Back to town'); quit.type = 'button';
  const pbox = el('div', 'race-paused-box'); pbox.append(el('h2', '', 'Paused'), el('p', '', 'The Fuzzies are waiting.'), resume, quit);
  pauseOverlay.append(pbox);
  root.append(canvas, touch, hud, pauseOverlay); // the HUD's buttons sit above the steering zones
  stage.append(root);

  // ---- renderer & scene ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(mobile ? 62 : 55, 1, 0.3, 500);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.position.set(-30, 40, 20);
  sun.castShadow = !mobile;
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 120 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target, new THREE.HemisphereLight(0xdff0ff, 0x3c7f9a, 0.75));
  const sky = buildSky(); sky.position.set(0, 0, 0); scene.add(sky);
  scene.fog = new THREE.Fog('#cfe6ee', 90, 220);
  const time = { value: 0 };
  const sea = water(time); scene.add(sea);
  const leafMat = new THREE.MeshStandardMaterial({ color: '#4fb35b', roughness: 0.85, side: THREE.DoubleSide });
  scene.add(island(leafMat, mobile));
  // reef rocks around the lagoon edge
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.1; const r = OUTER_R + 1 + (i % 4) * 0.9; const k = rock(i * 3 + 11, 0.7 + (i % 3) * 0.5); k.position.set(Math.cos(a) * r, k.position.y, Math.sin(a) * r); scene.add(k); }
  // gates and course arrows
  const gates: THREE.Group[] = sim.course.gates.map((g, i) => { const m = gateModel(i === 0); m.position.set(g.at.x, 0, g.at.z); m.rotation.y = Math.atan2(g.dir.x, g.dir.z); scene.add(m); return m; });
  const arrowGeo = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.5, -0.5), new THREE.Vector2(0.5, -0.5), new THREE.Vector2(0, 0.6)])).rotateX(-Math.PI / 2);
  const arrowMat = new THREE.MeshBasicMaterial({ color: PAL.raspberry, transparent: true, opacity: 0.55, depthWrite: false });
  const arrows: THREE.Mesh[] = [];
  for (let i = 0; i < sim.course.samples.length; i += 20) {
    const p = sim.course.samples[i], t = sim.course.tangents[i];
    const a = new THREE.Mesh(arrowGeo, arrowMat); a.position.set(p.x, 0.06, p.z); a.rotation.y = Math.atan2(t.x, t.z); a.scale.setScalar(1.6); scene.add(a); arrows.push(a);
  }
  // boats
  const mats = { fur: T.furStrands() } as unknown as M.Mats;
  const hullColors = ['#ff5a8a', '#36b0ff', '#ffc23d', '#58d68d', '#b48cff', '#ff8c42'];
  const boats = sim.boats.map((b, i) => { const m = boatModel(mats, b.you ? setup.you.skin : setup.rivals[i - 1].skin, hullColors[i % hullColors.length], i + 1, mobile); scene.add(m.g); return m; });
  // wake + splash sprites
  const puffTex = T.glow('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
  const puffMat = new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0.5 });
  const puffs: { s: THREE.Sprite; v: THREE.Vector3; life: number; max: number; grow: number }[] = [];
  const puff = (at: THREE.Vector3, v: THREE.Vector3, size: number, max: number, grow: number) => {
    if (puffs.length > (mobile ? 90 : 180)) return;
    const s = new THREE.Sprite(puffMat); s.position.copy(at); s.scale.setScalar(size); scene.add(s);
    puffs.push({ s, v, life: 0, max, grow });
  };

  // ---- input ----
  const keys = new Set<string>();
  const input = { throttle: 0, brake: 0, steer: 0, assist: mobile };
  let touchL = 0, touchR = 0, braking = false;
  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) { e.preventDefault(); if (down) keys.add(k); else keys.delete(k); }
    if (down && k === 'escape') togglePause();
    if (down && k === 'p') togglePause();
  };
  const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false);
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  const press = (side: 'l' | 'r', on: boolean) => { if (side === 'l') touchL = on ? 1 : 0; else touchR = on ? 1 : 0; };
  for (const [zone, side] of [[left, 'l'], [right, 'r']] as const) {
    zone.addEventListener('pointerdown', (e) => { e.preventDefault(); zone.setPointerCapture(e.pointerId); press(side, true); zone.classList.add('on'); });
    const off = () => { press(side, false); zone.classList.remove('on'); };
    zone.addEventListener('pointerup', off); zone.addEventListener('pointercancel', off); zone.addEventListener('lostpointercapture', off);
  }
  brake.addEventListener('pointerdown', (e) => { e.preventDefault(); braking = true; brake.classList.add('on'); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) brake.addEventListener(ev, () => { braking = false; brake.classList.remove('on'); });
  root.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---- pause ----
  let paused = false, done = false, finishedAt = -1;
  const togglePause = () => { if (done || sim.state === 'countdown') return; paused = !paused; pauseOverlay.hidden = !paused; if (paused) eng.set(0, 0); };
  pauseBtn.addEventListener('click', togglePause);
  resume.addEventListener('click', togglePause);
  quit.addEventListener('click', () => { destroy(); hooks.onQuit(); });
  const onVis = () => { if (document.hidden && !paused && !done && sim.state === 'racing') togglePause(); };
  document.addEventListener('visibilitychange', onVis);

  // ---- camera ----
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let camYaw = 0;
  const player = sim.player;
  const resize = () => {
    const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(root);
  // opening: a slow sweep from the island over the grid into the chase position
  camYaw = player.heading;
  camPos.set(player.pos.x - Math.sin(player.heading) * 14 + 6, 7, player.pos.z - Math.cos(player.heading) * 14 - 4);
  camLook.set(player.pos.x, 0.4, player.pos.z);

  // ---- sound ----
  const eng = setup.sound ? makeEngine() : { set() { /* off */ }, stop() { /* off */ } };
  const play = (f: () => void) => { if (setup.sound) try { f(); } catch { /* no audio */ } };
  let lastCount = 4;

  // ---- loop ----
  let raf = 0, last = performance.now(), acc = 0, frames = 0, slow = 0, lastMap = 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor((s % 1) * 10)}`;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (paused) return;
    time.value += dt;
    // input
    const accelKey = keys.has('w') || keys.has('arrowup'), brakeKey = keys.has('s') || keys.has('arrowdown');
    const l = keys.has('a') || keys.has('arrowleft') ? 1 : 0, r = keys.has('d') || keys.has('arrowright') ? 1 : 0;
    const touching = touchL || touchR;
    input.throttle = mobile || touching ? 1 : accelKey ? 1 : 0;
    if (mobile && !touching && !braking) input.throttle = 1;
    input.brake = brakeKey || braking ? 1 : 0;
    const steerKeys = r - l, steerTouch = touchR - touchL;
    input.steer = THREE.MathUtils.clamp(steerKeys + steerTouch, -1, 1);
    input.assist = mobile || !!touching;
    // fixed-step physics
    acc += dt;
    while (acc >= 1 / 120) {
      sim.step(1 / 120, input);
      acc -= 1 / 120;
      for (const e of sim.events) {
        const b = sim.boats[e.boat];
        if (e.kind === 'go') { count.textContent = 'GO!'; count.className = 'race-count go'; play(snd.go); setTimeout(() => { count.textContent = ''; count.className = 'race-count'; }, 900); hint.classList.add('fade'); }
        else if (e.kind === 'gate' && b?.you) { play(snd.gate); flash(gates[(b.next + sim.gates - 1) % sim.gates]); }
        else if (e.kind === 'lap' && b?.you) { play(snd.lap); flashBanner(b.lap === LAPS - 1 ? 'Final lap!' : `Lap ${b.lap + 1}`); }
        else if (e.kind === 'bump') { if (b?.you) play(snd.bump); if (b) splash(b, 10); }
        else if (e.kind === 'finish' && b?.you) { play(snd.finish); flashBanner(b.place === 1 ? '🏁 You win!' : `🏁 Finished ${b.place === 2 ? '2nd' : b.place === 3 ? '3rd' : b.place + 'th'}`); }
      }
    }
    // countdown numbers
    if (sim.state === 'countdown') {
      const c = Math.ceil(sim.countdown - 0.6);
      if (c !== lastCount && c > 0 && c <= 3) { lastCount = c; count.textContent = String(c); count.className = 'race-count'; void count.offsetWidth; count.classList.add('pop'); play(snd.count); }
    }
    // boats
    sim.boats.forEach((b, i) => {
      const m = boats[i];
      const bob = Math.sin(time.value * 2.3 + i * 1.7) * 0.035 + Math.sin(time.value * 3.1 + i) * 0.02;
      m.g.position.set(b.pos.x, 0.02 + bob, b.pos.z);
      m.g.rotation.y = b.heading;
      // lean into turns, nose up under power, settle when braking; the rider leans too
      const speedK = Math.min(1, b.speed / 12);
      m.g.rotation.z = THREE.MathUtils.lerp(m.g.rotation.z, -b.steer * 0.22 * speedK + Math.sin(time.value * 2 + i) * 0.015, Math.min(1, dt * 6));
      m.g.rotation.x = THREE.MathUtils.lerp(m.g.rotation.x, -b.throttle * 0.07 * (1 - speedK * 0.5) + (b.bump > 0 ? -0.08 : 0) + Math.sin(time.value * 2.6 + i) * 0.012, Math.min(1, dt * 5));
      m.wheel.rotation.z = THREE.MathUtils.lerp(m.wheel.rotation.z, -b.steer * 1.2, Math.min(1, dt * 8));
      m.fuzzy.body.rotation.z = THREE.MathUtils.lerp(m.fuzzy.body.rotation.z, b.steer * 0.2, Math.min(1, dt * 6));
      m.fuzzy.body.rotation.x = -0.1 - speedK * 0.12;
      const happy = b.finished && b.place === 1;
      for (const e of m.fuzzy.eyes) { e.open.visible = !happy; e.lid.visible = happy; }
      if (b.finished) { m.fuzzy.group.position.y = 0.5 + Math.abs(Math.sin(time.value * 6)) * 0.12; }
      // the number flag ripples
      const fp = m.flag.geometry.attributes.position;
      for (let k = 0; k < fp.count; k++) { const x = fp.getX(k); fp.setZ(k, Math.sin(x * 14 - time.value * (6 + b.speed * 0.6)) * 0.03 * x); }
      fp.needsUpdate = true;
      // bow spray at speed
      if (b.speed > 8 && Math.random() < dt * 10) {
        const fwd = new THREE.Vector3(Math.sin(b.heading), 0, Math.cos(b.heading));
        const sx = Math.random() < 0.5 ? -1 : 1;
        puff(new THREE.Vector3(b.pos.x, 0.08, b.pos.z).addScaledVector(fwd, 1.2), new THREE.Vector3(fwd.z * sx * 1.4, 1.2, -fwd.x * sx * 1.4).addScaledVector(fwd, 0.5), 0.22, 0.5, 0.6);
      }
      // wake
      if (b.speed > 2.5 && Math.random() < dt * (18 + b.speed * 2)) {
        const back = new THREE.Vector3(-Math.sin(b.heading), 0, -Math.cos(b.heading));
        const side = new THREE.Vector3(Math.cos(b.heading), 0, -Math.sin(b.heading)).multiplyScalar((Math.random() - 0.5) * 0.9);
        puff(new THREE.Vector3(b.pos.x, 0.03, b.pos.z).addScaledVector(back, 1.1).add(side), back.multiplyScalar(0.5 + Math.random() * 0.3).addScaledVector(side, 0.3), 0.3, 1.1 + Math.random() * 0.5, 0.8);
      }
    });
    // gates: buoys bob, pennants flutter, the start banner waves
    gates.forEach((g, i) => { g.position.y = Math.sin(time.value * 1.8 + i) * 0.06; const b = g.getObjectByName('banner') as THREE.Mesh | undefined; if (b) { const bp = b.geometry.attributes.position; for (let k = 0; k < bp.count; k++) bp.setZ(k, Math.sin(bp.getX(k) * 1.6 + time.value * 3) * 0.08); bp.needsUpdate = true; } });
    const nextGate = sim.course.gates[player.next];
    gates.forEach((g, i) => g.children.forEach((c) => c.traverse((o) => { if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshPhysicalMaterial) o.material.emissive.setScalar(i === player.next ? 0.25 + Math.sin(time.value * 6) * 0.1 : 0); })));
    arrows.forEach((a, i) => { arrowMat.opacity = 0.45 + Math.sin(time.value * 3 - i * 0.6) * 0.15; });
    // wake sprites
    for (let i = puffs.length - 1; i >= 0; i--) {
      const q = puffs[i];
      q.life += dt;
      q.s.position.addScaledVector(q.v, dt);
      q.s.scale.addScalar(q.grow * dt);
      const k = q.life / q.max;
      (q.s.material as THREE.SpriteMaterial).opacity = 0.5 * (1 - k);
      if (k >= 1) { scene.remove(q.s); puffs.splice(i, 1); }
    }
    puffMat.opacity = 0.5;
    // camera: chase from behind, swinging with the heading, pulling back with speed; looking a little ahead
    const spd = Math.min(1, player.speed / 13);
    const pose = sim.state === 'countdown' ? 1 - Math.min(1, sim.countdown / 3.6) : 1;
    camYaw = lerpAngle(camYaw, player.heading, Math.min(1, dt * (sim.state === 'countdown' ? 1.2 : 3.2)));
    const back = 6.5 + spd * 2.2, up = 3.1 + spd * 0.6;
    const want = new THREE.Vector3(player.pos.x - Math.sin(camYaw) * back, up, player.pos.z - Math.cos(camYaw) * back);
    // never inside the island: lift over it
    const dIsland = Math.hypot(want.x, want.z);
    if (dIsland < ISLAND_R + 2.5) want.y = Math.max(want.y, heightAt(want.x, want.z, ISLAND_R + 1.6) + 2.4);
    camPos.lerp(want, Math.min(1, dt * (sim.state === 'countdown' ? 1.1 : 4.5)));
    const lookWant = new THREE.Vector3(player.pos.x + Math.sin(player.heading) * (2.5 + spd * 2), 0.5, player.pos.z + Math.cos(player.heading) * (2.5 + spd * 2));
    camLook.lerp(lookWant, Math.min(1, dt * 5));
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    camera.rotation.z += -player.steer * 0.03 * spd * pose;
    sun.target.position.set(player.pos.x, 0, player.pos.z);
    sun.position.set(player.pos.x - 30, 40, player.pos.z + 20);
    // HUD
    if (sim.state !== 'countdown') timeEl.textContent = fmt(sim.time);
    lapN.textContent = String(Math.min(LAPS, player.lap + 1));
    const pw = player.place === 1 ? '1st' : player.place === 2 ? '2nd' : player.place === 3 ? '3rd' : `${player.place}th`;
    if (posN.textContent !== pw) { posN.textContent = pw; posEl.classList.remove('bump'); void posEl.offsetWidth; posEl.classList.add('bump'); }
    const ng = sim.nextGate();
    arrowIn.style.transform = `rotate(${(-ng.angle * 180) / Math.PI - 90}deg)`;
    arrowD.textContent = `${Math.round(ng.dist)} m`;
    wrong.classList.toggle('on', player.wrongWay > 0.8);
    if (player.wrongWay > 0.8 && Math.floor(time.value * 2) !== Math.floor((time.value - dt) * 2)) play(snd.wrong);
    void nextGate;
    if (now - lastMap > 120) { lastMap = now; drawMap(); }
    eng.set(player.speed, sim.state === 'racing' ? player.throttle : 0.6);
    // finish: a moment to celebrate, then the results
    if (sim.state === 'finished' && !done) {
      if (finishedAt < 0) { finishedAt = time.value; eng.set(player.speed, 0); splash(player, 24); }
      if (time.value - finishedAt > 1.8) {
        done = true;
        const order = sim.order().map((b) => ({ name: b.name, place: b.place, you: b.you, index: b.you ? -1 : b.id - 1 }));
        const res: RaceResult = { place: player.place, timeMs: Math.round(player.finishTime * 1000), order };
        destroy();
        hooks.onFinish(res);
        return;
      }
    }
    renderer.render(scene, camera);
    // adaptive quality: a slow device drops pixel density and shadows
    frames++;
    if (dt > 0.045) slow++;
    if (frames === 90) { if (slow > 40 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); resize(); } if (slow > 60) { renderer.shadowMap.enabled = false; sun.castShadow = false; } frames = 0; slow = 0; }
  };
  const flash = (g: THREE.Group) => { g.scale.setScalar(1.12); setTimeout(() => g.scale.setScalar(1), 180); };
  const flashBanner = (t: string) => { banner.textContent = t; banner.classList.remove('on'); void banner.offsetWidth; banner.classList.add('on'); setTimeout(() => banner.classList.remove('on'), 1600); };
  const splash = (b: Boat, n: number) => { play(snd.splash); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 0.8 + Math.random() * 1.6; puff(new THREE.Vector3(b.pos.x, 0.1, b.pos.z), new THREE.Vector3(Math.cos(a) * s, 1.4 + Math.random() * 1.5, Math.sin(a) * s), 0.35, 0.8 + Math.random() * 0.5, 0.9); } };
  const drawMap = () => {
    const x = map.getContext('2d'); if (!x) return;
    const S = map.width, c = S / 2, k = (S / 2 - 8) / (OUTER_R + 2);
    x.clearRect(0, 0, S, S);
    x.fillStyle = 'rgba(20, 60, 90, 0.55)'; x.beginPath(); x.arc(c, c, S / 2 - 2, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#79c86b'; x.beginPath(); x.arc(c, c, ISLAND_R * k, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 2; x.beginPath();
    sim.course.samples.forEach((p, i) => { const px = c + p.x * k, py = c + p.z * k; if (i) x.lineTo(px, py); else x.moveTo(px, py); });
    x.closePath(); x.stroke();
    sim.course.gates.forEach((g, i) => { x.fillStyle = i === player.next ? '#ffc94a' : i === 0 ? '#ffffff' : '#ff8c42'; x.beginPath(); x.arc(c + g.at.x * k, c + g.at.z * k, i === player.next ? 4 : 3, 0, Math.PI * 2); x.fill(); });
    sim.boats.forEach((b, i) => { x.fillStyle = b.you ? '#ff5a8a' : hullColors[i % hullColors.length]; x.beginPath(); x.arc(c + b.pos.x * k, c + b.pos.z * k, b.you ? 5 : 3.5, 0, Math.PI * 2); x.fill(); if (b.you) { x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.stroke(); } });
  };

  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(raf);
    removeEventListener('keydown', kd); removeEventListener('keyup', ku);
    document.removeEventListener('visibilitychange', onVis);
    ro.disconnect();
    eng.stop();
    scene.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); } });
    env.dispose(); pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    root.remove();
  };
  requestAnimationFrame(() => { last = performance.now(); raf = requestAnimationFrame(tick); });
  if (import.meta.env.DEV) (window as unknown as { __race: unknown }).__race = { sim, input, pause: togglePause, finishNow: () => { for (const b of sim.boats) if (!b.finished) { b.lap = LAPS; b.finished = true; b.finishTime = sim.time + b.id; b.place = b.id + 1; } (sim as unknown as { state: string }).state = 'finished'; }, destroy };
}
