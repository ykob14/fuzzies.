/**
 * Fuzzies Boat Race — the 3D scene, camera, controls and HUD. Everything that *decides* (laps, places, physics, hazards)
 * lives in land/race.ts; this file only draws it and feeds it input. Runs in its own full-screen layer over the town with
 * its own renderer (the town's view is paused meanwhile), then cleans up completely. Art follows ART.md (PAL colours, soft shapes).
 *
 * What's drawn: the lagoon with a swell that grows lap by lap (the same wave the rules use, so hulls ride what you see),
 * Palm Island with a sandy seabed showing through the shallows, the racing boundary (buoys + rope + flags), checkpoint gates
 * with the next one lit up (beacons + a floating chevron), slalom buoys / barrels / logs that rise from the water when their lap
 * starts, glowing boost pads, current streaks, speedboats with Fuzzies that lean, look where they steer, hop over crests and
 * cheer when they win, dolphins, fish, gulls and tropical birds, wakes, spray, splashes, a chase camera that keeps the next gate
 * in view, and a HUD (lap, place, time, speed, next-gate arrow, mini-map, "missed checkpoint", boundary warning, pause/restart).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as M from '../game/models3d';
import * as T from '../game/textures3d';
import { race as snd, engine as makeEngine } from '../game/sound';
import { RaceSim, LAPS, ISLAND_R, OUTER_R, EDGE_R, GATE_W, waveHeight, waveGrad, type Boat, type Hazard } from './race';
import { PAL, std, add } from './models';
import { buildSky } from './environment';
import { glbFuzzy, glbReady } from '../game/fuzzyGlb';

export interface RaceSetup {
  you: { name: string; skin: [string, string] };
  rivals: { name: string; skin: [string, string]; skill: number }[];
  mobile: boolean;
  sound: boolean;
  /** use the owner's 3D Fuzzy model for the riders (when it has loaded) */
  deluxe?: boolean;
  /** which boat is a resident (index into the town's Fuzzies) — rivals keep their town index, the player is -1 */
  portrait: (index: number) => string;
}
export interface RaceResult { place: number; timeMs: number; order: { name: string; place: number; you: boolean; index: number }[] }
export interface RaceHooks { onFinish: (r: RaceResult) => void; onQuit: () => void; onRestart?: () => void }

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; };
const lerpAngle = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp;

// ---------- models ----------
function paint(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 0.15, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
}
const ROPE = std('#e8d9bf', 0.95), WHITE = std('#fffaf0', 0.5), DARK = std('#3a3f4a', 0.5, 0.3), POLE = std('#6b6f78', 0.5, 0.4);
const GLASS = new THREE.MeshPhysicalMaterial({ color: '#cfeeff', transmission: 0.7, roughness: 0.05, thickness: 0.2, transparent: true, opacity: 0.75 });

/** A racing boat in the Fuzzies style: a rounded speedboat hull, cockpit, windscreen, engine, number flag — and its Fuzzy at the wheel. */
function boatModel(mats: M.Mats, skin: [string, string], hullColor: string, num: number, mobile: boolean, deluxe: boolean): { g: THREE.Group; fuzzy: M.FuzzyModel; wheel: THREE.Mesh; flag: THREE.Mesh; paws: THREE.Mesh[]; seatY: number } {
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
  // deck + cockpit well + a padded seat back
  add(g, new THREE.BoxGeometry(0.9, 0.08, 1.9), std('#f1d38a', 0.8), 0, 0.22, -0.1, false);
  add(g, new THREE.BoxGeometry(0.66, 0.08, 0.9), DARK, 0, 0.23, -0.3, false);
  add(g, new THREE.BoxGeometry(0.62, 0.22, 0.1), paint(hullColor), 0, 0.36, -0.68, false);
  // windscreen
  const ws = add(g, new THREE.BoxGeometry(0.7, 0.3, 0.04), GLASS, 0, 0.42, 0.35, false);
  ws.rotation.x = -0.35;
  // steering wheel
  const wheel = add(g, new THREE.TorusGeometry(0.1, 0.018, 8, 20), DARK, 0, 0.42, 0.14, false);
  wheel.rotation.x = -0.8;
  // engine at the stern + propeller housing
  add(g, new THREE.BoxGeometry(0.34, 0.3, 0.26), DARK, 0, 0.32, -1.1, false);
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10).rotateX(Math.PI / 2), std('#8a8f99', 0.4, 0.6), 0, 0.1, -1.3, false);
  // flag pole with the racer's number
  add(g, new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), POLE, -0.32, 0.6, -0.85, false);
  const flagTex = numberFlag(num, hullColor);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24, 6, 1).translate(0.17, 0, 0), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.set(-0.32, 0.86, -0.85);
  flag.rotation.y = -Math.PI / 2;
  g.add(flag);
  // the Fuzzy at the wheel (a little smaller than in town, sat in the well, facing forward)
  const real = deluxe && glbReady();
  const fuzzy = real ? glbFuzzy(skin, 0.3, { shadow: !mobile, size: mobile ? 512 : 768 }) : M.makeFuzzy(mats, skin, 0.24, 0.075, mobile ? 6 : 9);
  const seatY = real ? 0.56 : 0.5;
  fuzzy.group.position.set(0, seatY, -0.2);
  g.add(fuzzy.group);
  // paws on the wheel (they slide round it as the Fuzzy steers)
  const paws = [-1, 1].map((sx) => add(g, new THREE.SphereGeometry(0.05, 10, 8), std(skin[1], 0.8), sx * 0.1, 0.44, 0.12, false));
  return { g, fuzzy, wheel, flag, paws, seatY };
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

/**
 * The lagoon: a big plane with its own shader — deep blue to turquoise near the island and the reef, the swell (same formula as
 * `waveHeight` in the rules), ripples, glints, foam along the shore, the reef and round rocks; see-through in the shallows so the
 * seabed, fish and the boats' shadows show.
 */
function water(time: { value: number }, swell: { value: number }): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uTime: time, uSwell: swell, uDeep: { value: new THREE.Color('#1f6fb0') }, uMid: { value: new THREE.Color('#2fa3c9') }, uShallow: { value: new THREE.Color('#79dfd7') }, uHorizon: { value: new THREE.Color('#cfe6ee') }, uIsland: { value: ISLAND_R }, uReef: { value: OUTER_R } },
    vertexShader: `uniform float uTime, uSwell; varying vec3 vW; varying float vH; varying vec3 vN;
      float swellH(vec2 p, float t) { return uSwell * (0.22 * sin(p.x * 0.21 + t * 0.95) + 0.14 * sin(p.y * 0.17 - t * 0.7 + p.x * 0.05) + 0.08 * sin((p.x - p.y) * 0.3 + t * 1.3)); }
      void main() { vec3 p = position; float far = 1.0 - smoothstep(40.0, 80.0, length(p.xz));
        float ripple = (sin(p.x * 0.55 + uTime * 1.3) * 0.05 + sin(p.z * 0.7 - uTime * 1.1) * 0.04 + sin((p.x + p.z) * 0.32 + uTime * 0.7) * 0.04) * far;
        float w = swellH(p.xz, uTime) * far + ripple; p.y += w; vH = w;
        float e = 0.6; float hx = swellH(p.xz + vec2(e, 0.0), uTime) - swellH(p.xz - vec2(e, 0.0), uTime); float hz = swellH(p.xz + vec2(0.0, e), uTime) - swellH(p.xz - vec2(0.0, e), uTime);
        vN = normalize(vec3(-hx, 2.0 * e, -hz));
        vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uTime, uIsland, uReef; uniform vec3 uDeep, uMid, uShallow, uHorizon; varying vec3 vW; varying float vH; varying vec3 vN;
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
        // the swell shades the water: faces towards the sun catch light, the backs sit darker
        vec3 sunDir = normalize(vec3(-0.5, 0.7, 0.35));
        float lit = dot(normalize(vN), sunDir);
        c *= 0.86 + 0.28 * lit;
        c += (vec3(0.09, 0.13, 0.13) * smoothstep(0.6, 0.9, n) + vec3(0.05) * vH * 3.0) * (0.35 + 0.65 * near);
        // a soft sky reflection on the crests
        vec3 eye = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(0.0, dot(eye, normalize(vN))), 3.0);
        c = mix(c, uHorizon, fres * 0.35);
        float band = sin(shore * 22.0 - t * 1.6 + n * 3.0) * 0.5 + 0.5;
        float foam = smoothstep(0.88, 1.0, shore) + smoothstep(0.8, 1.0, band) * smoothstep(0.6, 0.95, shore) * 0.5 + smoothstep(0.93, 1.0, reef) * (0.4 + 0.4 * sin(t * 2.0 + vW.x));
        foam += smoothstep(0.42, 0.5, vH) * 0.7; // whitecaps on the big waves
        c = mix(c, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.85 * (0.5 + 0.5 * near));
        c += vec3(1.0) * smoothstep(0.94, 0.99, noise(vW.xz * 2.2 + t * 0.5)) * 0.4 * near;
        c = mix(c, uHorizon, smoothstep(60.0, 150.0, d));
        float alpha = 1.0 - smoothstep(0.35, 1.0, shore) * 0.34 * (1.0 - foam * 0.6); // see the seabed in the shallows
        gl_FragColor = vec4(c, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(360, 360, 110, 110).rotateX(-Math.PI / 2), mat);
  m.position.y = -0.1;
  m.renderOrder = -1; // first of the see-through things, so wakes and spray draw on top of it
  return m;
}

/** The sandy seabed under the shallows (seen through the water), sloping away into the deep. */
function seabed(mobile: boolean): THREE.Mesh {
  const R = 26;
  const geo = new THREE.CircleGeometry(R, 64).rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  const sand = new THREE.Color('#e8cf8e'), deep = new THREE.Color('#1a5f98'), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z) / R;
    const ripple = Math.sin(x * 1.3 + z * 0.4) * 0.04;
    p.setY(i, -1.3 - d * d * 4 + ripple);
    c.copy(sand).lerp(deep, clamp((d - 0.35) / 0.5, 0, 1));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  m.receiveShadow = !mobile;
  return m;
}

/** Palm Island: a hill of sand and grass in the middle of the lagoon, with palms, bushes, rocks and a hut. */
function island(leaf: THREE.Material, mobile: boolean): THREE.Group {
  const g = new THREE.Group();
  const R = ISLAND_R + 1.6;
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
    const k = clamp((h - 0.15) / 0.5, 0, 1);
    c.copy(sand).lerp(grass, k).lerp(dark, Math.max(0, n) * 0.5 * k);
    col.set([c.r, c.g, c.b], i * 3);
  }
  dense.setAttribute('color', new THREE.BufferAttribute(col, 3));
  dense.computeVertexNormals();
  const ground = new THREE.Mesh(dense, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  ground.receiveShadow = !mobile;
  g.add(ground);
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
  add(hut, new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), POLE, 0.9, 1.1, 0.5, false);
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

/** A striped marker buoy with an optional pennant. */
function buoyModel(color: string, poleH: number, pennant: string | null, r = 0.55): THREE.Group {
  const b = new THREE.Group();
  add(b, new THREE.SphereGeometry(r, 20, 14), paint(color), 0, 0, 0, false).scale.y = 0.8;
  add(b, new THREE.TorusGeometry(r * 0.9, r * 0.15, 8, 24).rotateX(Math.PI / 2), WHITE, 0, 0.05, 0, false);
  if (poleH > 0) add(b, new THREE.CylinderGeometry(0.04, 0.04, poleH, 8), POLE, 0, poleH / 2, 0, false);
  if (pennant) add(b, new THREE.PlaneGeometry(0.55, 0.35).translate(0.28, 0, 0), new THREE.MeshStandardMaterial({ color: pennant, side: THREE.DoubleSide, roughness: 0.8 }), 0, poleH - 0.1, 0, false);
  return b;
}

/** Checkpoint gates: a pair of striped buoys with pennants and beacons; gate 0 is the start/finish arch with a chequered banner. */
function gateModel(start: boolean, num: number): THREE.Group {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) { const b = buoyModel(start ? PAL.raspberry : '#ff8c42', start ? 3.4 : 1.6, start ? null : '#ffc94a'); b.position.x = sx * GATE_W; g.add(b); }
  // beacons: tall soft light columns that only show on the next gate
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ffc94a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) { const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.5, 7, 12, 1, true), beamMat); beam.position.set(sx * GATE_W, 3.5, 0); beam.name = 'beam'; g.add(beam); }
  // the gate number on a little sign (so "missed checkpoint 4" means something)
  if (!start) {
    const c = document.createElement('canvas'); c.width = 96; c.height = 96;
    const x = c.getContext('2d')!;
    x.fillStyle = '#fffaf0'; x.beginPath(); x.arc(48, 48, 46, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ff8c42'; x.beginPath(); x.arc(48, 48, 38, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = '700 48px Fredoka, Poppins, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(num), 48, 50);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    sign.position.set(GATE_W, 2.05, 0); sign.name = 'sign'; g.add(sign);
  }
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

/** Hazards: a slalom buoy, a steel barrel, a floating log. */
function hazardModel(h: Hazard): THREE.Group {
  const g = new THREE.Group();
  if (h.kind === 'buoy') { g.add(buoyModel('#ffc94a', 1.2, PAL.raspberry, 0.5)); }
  else if (h.kind === 'barrel') {
    add(g, new THREE.CylinderGeometry(0.62, 0.62, 1.1, 18), paint('#4a7bd0'), 0, 0.1, 0, false);
    for (const y of [-0.25, 0.45]) add(g, new THREE.TorusGeometry(0.64, 0.045, 8, 24).rotateX(Math.PI / 2), std('#d8dde6', 0.4, 0.5), 0, y, 0, false);
    g.rotation.z = 0.25; g.rotation.y = h.yaw;
  } else {
    const log = add(g, new THREE.CylinderGeometry(0.42, 0.5, 3.6, 12).rotateZ(Math.PI / 2), std('#8a5a30', 0.95), 0, -0.05, 0, false);
    log.rotation.y = h.yaw;
    for (const sx of [-1, 1]) { const cap = add(g, new THREE.CircleGeometry(sx < 0 ? 0.5 : 0.42, 12), std('#d9b58a', 0.9), 0, -0.05, 0, false); cap.position.set(Math.cos(h.yaw) * 1.8 * sx, -0.05, -Math.sin(h.yaw) * 1.8 * sx); cap.rotation.y = h.yaw + (sx > 0 ? -Math.PI / 2 : Math.PI / 2); }
    const stub = add(g, new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6), std('#7a4b25', 0.95), 0.3, 0.35, 0.1, false); stub.rotation.z = -0.5;
  }
  return g;
}

/** A boost pad: a glowing ring on the water with chevrons pointing the way. */
function boostModel(): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.35, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffc94a', transparent: true, opacity: 0.8, depthWrite: false }));
  ring.position.y = 0.05; ring.name = 'ring'; g.add(ring);
  const chev = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.45, -0.3), new THREE.Vector2(0, 0.1), new THREE.Vector2(0.45, -0.3), new THREE.Vector2(0.45, 0.05), new THREE.Vector2(0, 0.45), new THREE.Vector2(-0.45, 0.05)])).rotateX(-Math.PI / 2);
  const cm = new THREE.MeshBasicMaterial({ color: '#fff4c2', transparent: true, opacity: 0.9, depthWrite: false });
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(chev, cm); c.position.set(0, 0.06, -0.45 + i * 0.45); c.name = 'chev'; g.add(c); }
  return g;
}

/** A dolphin: body, beak, dorsal fin, flippers, flukes — grey-blue on top, pale underneath. */
function dolphinModel(): { g: THREE.Group; tail: THREE.Mesh } {
  const g = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ color: '#6f8fae', roughness: 0.35, metalness: 0.05 }), belly = std('#dfe9f2', 0.5);
  const body = add(g, new THREE.CapsuleGeometry(0.32, 1.3, 6, 14).rotateX(Math.PI / 2), top, 0, 0, 0);
  body.scale.set(1, 0.85, 1);
  add(g, new THREE.CapsuleGeometry(0.26, 1.1, 6, 12).rotateX(Math.PI / 2), belly, 0, -0.13, 0.05, false).scale.set(1, 0.7, 1);
  add(g, new THREE.ConeGeometry(0.17, 0.5, 10).rotateX(Math.PI / 2), top, 0, -0.03, 1.1, false);
  add(g, new THREE.ConeGeometry(0.16, 0.42, 4).rotateZ(0).translate(0, 0.2, 0), top, 0, 0.26, 0.05, false).rotation.x = -0.5;
  for (const sx of [-1, 1]) { const fl = add(g, new THREE.ConeGeometry(0.11, 0.42, 4).rotateZ(sx * Math.PI / 2), top, sx * 0.28, -0.12, 0.35, false); fl.rotation.y = sx * 0.4; }
  const tail = add(g, new THREE.BoxGeometry(0.75, 0.05, 0.28), top, 0, 0, -0.95, false);
  // eyes
  for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.04, 8, 6), std('#1c2430', 0.4), sx * 0.2, 0.08, 0.62, false);
  return { g, tail };
}

/** A gull or a tropical bird: a body with two flapping wings. */
function birdModel(body: string, wing: string, tip: string): { g: THREE.Group; wings: THREE.Mesh[] } {
  const g = new THREE.Group();
  add(g, new THREE.CapsuleGeometry(0.09, 0.3, 4, 8).rotateX(Math.PI / 2), std(body, 0.7), 0, 0, 0, false);
  add(g, new THREE.ConeGeometry(0.04, 0.14, 6).rotateX(Math.PI / 2), std('#ffb347', 0.6), 0, 0, 0.26, false);
  const wingGeo = new THREE.PlaneGeometry(0.62, 0.22, 4, 1).translate(0.31, 0, 0);
  const wp = wingGeo.attributes.position, wc = new Float32Array(wp.count * 3), c1 = new THREE.Color(wing), c2 = new THREE.Color(tip), cc = new THREE.Color();
  for (let i = 0; i < wp.count; i++) { cc.copy(c1).lerp(c2, Math.max(0, wp.getX(i) - 0.35) * 3); wc.set([cc.r, cc.g, cc.b], i * 3); }
  wingGeo.setAttribute('color', new THREE.BufferAttribute(wc, 3));
  const wm = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 });
  const wings = [-1, 1].map((sx) => { const w = new THREE.Mesh(wingGeo, wm); w.scale.x = sx; w.rotation.x = -Math.PI / 2; g.add(w); return w; });
  return { g, wings };
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
  const arrow = el('div', 'race-arrow'); const arrowIn = el('span', 'race-arrow-in', '➤'); const arrowD = el('small', ''); const arrowL = el('i', '', 'next gate'); arrow.append(arrowIn, arrowD, arrowL);
  const wrong = el('div', 'race-wrong', 'Wrong way! Turn around');
  const missedEl = el('div', 'race-missed'); missedEl.append(el('b', '', 'MISSED CHECKPOINT'), el('span', '', 'Turn around and go through it!'));
  const edgeEl = el('div', 'race-edge', 'Stay inside the buoys!');
  const speedEl = el('div', 'race-speed'); const speedN = el('b', '', '0'); speedEl.append(speedN, el('small', '', 'km/h'));
  const boostEl = el('div', 'race-boostlbl', 'BOOST!');
  const pauseBtn = el('button', 'race-pause'); pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.textContent = '❚❚';
  const count = el('div', 'race-count');
  const banner = el('div', 'race-banner');
  const map = document.createElement('canvas'); map.className = 'race-map'; map.width = map.height = 160;
  const hint = el('div', 'race-hint', mobile ? 'Hold the left or right side to steer — the engine runs by itself' : 'W / ↑ accelerate · A / D or ← → steer · S / ↓ brake · Esc pause');
  hud.append(lapEl, posEl, timeEl, arrow, wrong, missedEl, edgeEl, speedEl, boostEl, pauseBtn, map, count, banner, hint);
  const touch = el('div', 'race-touch');
  const left = el('div', 'race-touch-l'); left.append(el('span', '', '◀'));
  const right = el('div', 'race-touch-r'); right.append(el('span', '', '▶'));
  const brake = el('button', 'race-brake', 'BRAKE'); brake.type = 'button';
  touch.append(left, right, brake);
  if (!mobile) touch.classList.add('mouse');
  const pauseOverlay = el('div', 'race-paused'); pauseOverlay.hidden = true;
  const resume = el('button', 'btn btn-primary btn-lg', 'Resume'); resume.type = 'button';
  const restart = el('button', 'btn btn-soft', 'Restart race'); restart.type = 'button';
  const quit = el('button', 'btn btn-ghost', 'Back to town'); quit.type = 'button';
  const pbox = el('div', 'race-paused-box'); pbox.append(el('h2', '', 'Paused'), el('p', '', 'The Fuzzies are waiting.'), resume, restart, quit);
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
  const baseFov = camera.fov;
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.position.set(-30, 40, 20);
  sun.castShadow = !mobile;
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 120 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target, new THREE.HemisphereLight(0xdff0ff, 0x3c7f9a, 0.75));
  const sky = buildSky(); sky.position.set(0, 0, 0); scene.add(sky);
  scene.fog = new THREE.Fog('#cfe6ee', 90, 220);
  const time = { value: 0 }, swell = { value: sim.swell };
  scene.add(seabed(mobile));
  const sea = water(time, swell); scene.add(sea);
  const leafMat = new THREE.MeshStandardMaterial({ color: '#4fb35b', roughness: 0.85, side: THREE.DoubleSide });
  scene.add(island(leafMat, mobile));
  // reef rocks around the lagoon edge
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.1; const r = OUTER_R + 1 + (i % 4) * 0.9; const k = rock(i * 3 + 11, 0.7 + (i % 3) * 0.5); k.position.set(Math.cos(a) * r, k.position.y, Math.sin(a) * r); scene.add(k); }
  // the racing boundary: a ring of buoys joined by a rope, a flag on every fourth one
  const edgeBuoys: THREE.Group[] = [];
  const NB = mobile ? 36 : 48;
  for (let i = 0; i < NB; i++) {
    const a = (i / NB) * Math.PI * 2;
    const b = buoyModel(i % 2 ? '#fffaf0' : '#ff8c42', i % 4 === 0 ? 1.6 : 0, i % 4 === 0 ? PAL.raspberry : null, 0.42);
    b.position.set(Math.cos(a) * EDGE_R, 0, Math.sin(a) * EDGE_R); b.rotation.y = -a;
    scene.add(b); edgeBuoys.push(b);
  }
  const rope = new THREE.Mesh(new THREE.TorusGeometry(EDGE_R, 0.045, 6, 180).rotateX(Math.PI / 2), ROPE);
  rope.position.y = 0.12; scene.add(rope);
  // gates and course arrows
  const gates: THREE.Group[] = sim.course.gates.map((g, i) => { const m = gateModel(i === 0, i); m.position.set(g.at.x, 0, g.at.z); m.rotation.y = Math.atan2(g.dir.x, g.dir.z); scene.add(m); return m; });
  const arrowGeo = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.5, -0.5), new THREE.Vector2(0.5, -0.5), new THREE.Vector2(0, 0.6)])).rotateX(-Math.PI / 2);
  const arrowMat = new THREE.MeshBasicMaterial({ color: PAL.raspberry, transparent: true, opacity: 0.55, depthWrite: false });
  const arrows: THREE.Mesh[] = [];
  for (let i = 0; i < sim.course.samples.length; i += 20) {
    const p = sim.course.samples[i], t = sim.course.tangents[i];
    const a = new THREE.Mesh(arrowGeo, arrowMat); a.position.set(p.x, 0.06, p.z); a.rotation.y = Math.atan2(t.x, t.z); a.scale.setScalar(1.3); scene.add(a); arrows.push(a);
  }
  // the floating chevron over the next gate (gold; raspberry when you have to go back for it)
  const chevMat = new THREE.MeshBasicMaterial({ color: '#ffc94a' });
  const chevron = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 4).rotateX(Math.PI), chevMat);
  chevron.position.y = 5; scene.add(chevron);
  // an arrow over the player's boat when a gate was missed (points at the gate)
  const backArrow = new THREE.Group();
  add(backArrow, new THREE.ConeGeometry(0.35, 0.8, 10).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: PAL.raspberry }), 0, 0, 0.7, false);
  add(backArrow, new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: PAL.raspberry }), 0, 0, 0.05, false);
  backArrow.visible = false; scene.add(backArrow);
  // hazards, boost pads and currents: made now, shown when their lap starts (they rise out of the water)
  const hazards = sim.features.hazards.map((h) => { const m = hazardModel(h); m.position.set(h.pos.x, -2.5, h.pos.z); m.visible = false; scene.add(m); return { h, m, up: 0 }; });
  const boosts = sim.features.boosts.map((b) => { const m = boostModel(); m.position.set(b.pos.x, 0, b.pos.z); m.rotation.y = Math.atan2(b.dir.x, b.dir.z); m.visible = false; m.scale.setScalar(0.01); scene.add(m); return { b, m, up: 0 }; });
  const streakGeo = new THREE.PlaneGeometry(0.12, 1.6).rotateX(-Math.PI / 2);
  const streakMat = new THREE.MeshBasicMaterial({ color: '#e6f7ff', transparent: true, opacity: 0, depthWrite: false });
  const currents = sim.features.currents.map((c) => {
    const g = new THREE.Group();
    const rr = T.rng(Math.round(c.pos.x * 7 + c.pos.z * 3));
    const parts: { m: THREE.Mesh; off: THREE.Vector3; ph: number }[] = [];
    for (let i = 0; i < (mobile ? 14 : 24); i++) { const m = new THREE.Mesh(streakGeo, streakMat); const off = new THREE.Vector3((rr() - 0.5) * c.r * 1.6, 0.05, (rr() - 0.5) * c.r * 1.6); m.rotation.y = Math.atan2(c.dir.x, c.dir.z); g.add(m); parts.push({ m, off, ph: rr() }); }
    g.position.set(c.pos.x, 0, c.pos.z); g.visible = false; scene.add(g);
    return { c, g, parts };
  });
  // boats
  const mats = { fur: T.furStrands() } as unknown as M.Mats;
  const hullColors = ['#ff5a8a', '#36b0ff', '#ffc23d', '#58d68d', '#b48cff', '#ff8c42'];
  const boats = sim.boats.map((b, i) => { const m = boatModel(mats, b.you ? setup.you.skin : setup.rivals[i - 1].skin, hullColors[i % hullColors.length], i + 1, mobile, !!setup.deluxe); scene.add(m.g); return { ...m, hopV: 0, hopY: 0, lastSlope: 0, squash: 0 }; });
  // wildlife
  const dolphins = Array.from({ length: mobile ? 1 : 2 }, (_, i) => { const d = dolphinModel(); scene.add(d.g); return { ...d, i, a: i * 2.1, r: 32 + i * 1.5, nextJump: 4 + i * 5, jumpT: -1, wasUp: false }; });
  const fishGeo = new THREE.CapsuleGeometry(0.06, 0.16, 3, 6).rotateX(Math.PI / 2).scale(0.7, 1, 1);
  const fishMat = new THREE.MeshStandardMaterial({ color: '#ffb347', roughness: 0.5, metalness: 0.2 });
  const NF = mobile ? 36 : 72;
  const fish = new THREE.InstancedMesh(fishGeo, fishMat, NF);
  const fishData = Array.from({ length: NF }, (_, i) => { const school = i % 4; return { school, a: (i / NF) * Math.PI * 8 + school, r: 12.6 + school * 0.9 + (i % 5) * 0.25, ph: i * 0.7, y: -0.45 - (i % 3) * 0.12 }; });
  const fishColors = ['#ffb347', '#5ad0ff', '#ff6f91', '#ffe66d'];
  for (let i = 0; i < NF; i++) fish.setColorAt(i, new THREE.Color(fishColors[fishData[i].school]));
  scene.add(fish);
  const jumpers = Array.from({ length: 3 }, (_, i) => { const m = new THREE.Mesh(fishGeo, new THREE.MeshStandardMaterial({ color: fishColors[i], roughness: 0.4, metalness: 0.3 })); m.scale.setScalar(1.4); m.visible = false; scene.add(m); return { m, t: -1, next: 3 + i * 4, x: 0, z: 0, vx: 0, vz: 0 }; });
  const birds = [
    ...Array.from({ length: mobile ? 3 : 6 }, (_, i) => ({ ...birdModel('#fffaf0', '#f4f1ea', '#9aa3ad'), r: 9 + i * 2.2, h: 11 + (i % 3) * 2, sp: 0.22 + (i % 2) * 0.06, a: i * 1.3, flap: i * 0.9, dir: i % 2 ? 1 : -1 })),
    ...Array.from({ length: 2 }, (_, i) => ({ ...birdModel('#ff5a5a', '#ffc23d', '#36b0ff'), r: 5.5 + i * 1.5, h: 5.5 + i, sp: 0.35, a: i * 3, flap: i, dir: 1 })),
  ];
  for (const b of birds) scene.add(b.g);
  // wake + splash + confetti sprites
  const puffTex = T.glow('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
  const puffMat = new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0.5 });
  const confMats = ['#ff5a8a', '#ffc94a', '#36b0ff', '#58d68d'].map((c) => new THREE.SpriteMaterial({ map: puffTex, color: c, transparent: true, depthWrite: false, opacity: 0.9 }));
  const puffs: { s: THREE.Sprite; v: THREE.Vector3; life: number; max: number; grow: number; g: number }[] = [];
  const puff = (at: THREE.Vector3, v: THREE.Vector3, size: number, max: number, grow: number, mat = puffMat, g = 0) => {
    if (puffs.length > (mobile ? 110 : 220)) return;
    const s = new THREE.Sprite(mat); s.position.copy(at); s.scale.setScalar(size); scene.add(s);
    puffs.push({ s, v, life: 0, max, grow, g });
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
  let paused = false, done = false, finishedAt = -1, finishedWall = 0;
  const togglePause = () => { if (done || sim.state === 'countdown') return; paused = !paused; pauseOverlay.hidden = !paused; if (paused) eng.set(0, 0); };
  pauseBtn.addEventListener('click', togglePause);
  resume.addEventListener('click', togglePause);
  quit.addEventListener('click', () => { destroy(); hooks.onQuit(); });
  restart.addEventListener('click', () => { destroy(); if (hooks.onRestart) hooks.onRestart(); else hooks.onQuit(); });
  const onVis = () => { if (document.hidden && !paused && !done && sim.state === 'racing') togglePause(); };
  document.addEventListener('visibilitychange', onVis);

  // ---- camera ----
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let camYaw = 0, fov = baseFov;
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
  let lastCount = 4, lastStage = sim.stage;

  // ---- loop ----
  let raf = 0, last = performance.now(), acc = 0, frames = 0, slow = 0, lastMap = 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor((s % 1) * 10)}`;
  const tmp = new THREE.Vector3();
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (paused) return;
    time.value += dt;
    // input (steer: −1 left … +1 right — the rules turn the boat the way you press)
    const accelKey = keys.has('w') || keys.has('arrowup'), brakeKey = keys.has('s') || keys.has('arrowdown');
    const l = keys.has('a') || keys.has('arrowleft') ? 1 : 0, r = keys.has('d') || keys.has('arrowright') ? 1 : 0;
    const touching = touchL || touchR;
    input.throttle = mobile || touching ? 1 : accelKey ? 1 : 0;
    if (mobile && !touching && !braking) input.throttle = 1;
    input.brake = brakeKey || braking ? 1 : 0;
    const steerKeys = r - l, steerTouch = touchR - touchL;
    input.steer = clamp(steerKeys + steerTouch, -1, 1);
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
        else if (e.kind === 'bump') { if (b?.you) play(snd.bump); if (b) { splash(b, 10); boats[b.id].squash = 1; } }
        else if (e.kind === 'missed') { if (b?.you) play(snd.missed); }
        else if (e.kind === 'recovered') { if (b?.you) { play(snd.recovered); flashBanner('Back on track!'); } }
        else if (e.kind === 'boost') { if (b?.you) { play(snd.boost); boostEl.classList.remove('on'); void boostEl.offsetWidth; boostEl.classList.add('on'); } if (b) { boats[b.id].squash = -0.6; for (let k = 0; k < 6; k++) puff(new THREE.Vector3(b.pos.x, 0.15, b.pos.z), new THREE.Vector3(-Math.sin(b.heading) * 3 + (Math.random() - 0.5), 0.6, -Math.cos(b.heading) * 3 + (Math.random() - 0.5)), 0.4, 0.5, 1.2); } }
        else if (e.kind === 'edge') { play(snd.edge); }
        else if (e.kind === 'finish' && b?.you) { play(snd.finish); flashBanner(b.place === 1 ? '🏁 You win!' : `🏁 Finished ${b.place === 2 ? '2nd' : b.place === 3 ? '3rd' : b.place + 'th'}`); if (b.place === 1) setTimeout(() => play(snd.cheer), 500); }
      }
    }
    // the stage changed (leader on a new lap): the sea picks up, new furniture rises
    if (sim.stage !== lastStage) { lastStage = sim.stage; if (sim.stage === 1) flashBanner('Barrels & boost pads ahead!'); else flashBanner('Big waves & logs — hold on!'); play(snd.wave); }
    swell.value = lerp(swell.value, sim.swell, Math.min(1, dt * 0.5));
    // countdown numbers
    if (sim.state === 'countdown') {
      const c = Math.ceil(sim.countdown - 0.6);
      if (c !== lastCount && c > 0 && c <= 3) { lastCount = c; count.textContent = String(c); count.className = 'race-count'; void count.offsetWidth; count.classList.add('pop'); play(snd.count); }
    }
    // boats ride the swell: height + slope from the same wave the rules use; a crest at speed lifts the hull a moment
    sim.boats.forEach((b, i) => {
      const m = boats[i];
      const fx = Math.sin(b.heading), fz = Math.cos(b.heading);
      const wh = waveHeight(b.pos.x, b.pos.z, sim.time, swell.value) + Math.sin(time.value * 2.3 + i * 1.7) * 0.03;
      const gr = waveGrad(b.pos.x, b.pos.z, sim.time, swell.value);
      const slopeAlong = gr.x * fx + gr.z * fz, slopeSide = gr.x * fz - gr.z * fx; // + = water rises to the left
      // hop: coming over a crest fast (slope goes from up to down) throws the boat a little into the air
      if (m.hopY <= 0 && m.lastSlope > 0.03 && slopeAlong <= 0 && b.speed > 9.5 && swell.value > 0.5) { m.hopV = 0.9 + (b.speed - 9) * 0.12; m.hopY = 0.001; if (b.you) play(snd.wave); }
      m.lastSlope = slopeAlong;
      if (m.hopY > 0) { m.hopV -= 9 * dt; m.hopY += m.hopV * dt; if (m.hopY <= 0) { m.hopY = 0; m.hopV = 0; splash(b, 8, false); m.squash = 0.8; } }
      m.squash = lerp(m.squash, 0, Math.min(1, dt * 7));
      m.g.position.set(b.pos.x, 0.02 + wh + m.hopY, b.pos.z);
      m.g.rotation.y = b.heading;
      // lean into turns, nose up under power, pitch/roll with the wave, settle when braking; the rider leans too
      const speedK = Math.min(1, b.speed / 12);
      const airborne = m.hopY > 0 ? -0.18 : 0;
      m.g.rotation.z = lerp(m.g.rotation.z, b.steer * 0.22 * speedK + slopeSide * 0.9 + Math.sin(time.value * 2 + i) * 0.015, Math.min(1, dt * 6));
      m.g.rotation.x = lerp(m.g.rotation.x, -b.throttle * 0.07 * (1 - speedK * 0.5) - slopeAlong * 0.9 + airborne + (b.bump > 0 ? -0.08 : 0) + Math.sin(time.value * 2.6 + i) * 0.012, Math.min(1, dt * 5));
      m.wheel.rotation.z = lerp(m.wheel.rotation.z, b.steer * 1.2, Math.min(1, dt * 8));
      m.paws.forEach((p, k) => { const a = (k ? 1 : -1) * 1.25 - m.wheel.rotation.z; p.position.set(Math.sin(a) * 0.1, 0.44 + Math.cos(a) * 0.035, 0.12 + Math.cos(a) * 0.02); });
      // the Fuzzy: leans out of turns, looks where it's going, squashes on bumps and stretches on hops, cheers when it wins
      const f = m.fuzzy;
      f.body.rotation.z = lerp(f.body.rotation.z, -b.steer * 0.22, Math.min(1, dt * 6));
      f.body.rotation.x = -0.1 - speedK * 0.12 + (m.hopY > 0 ? -0.15 : 0);
      f.body.scale.set(1 + m.squash * 0.18, 1 - m.squash * 0.22, 1 + m.squash * 0.18);
      f.face.rotation.y = lerp(f.face.rotation.y, -b.steer * 0.35, Math.min(1, dt * 5));
      for (const p of f.pupils) p.position.x = lerp(p.position.x, b.steer * 0.02 * f.radius / 0.24, Math.min(1, dt * 6));
      const happy = b.finished && b.place === 1, worried = b.missed > 0 || b.wrongWay > 0.8;
      for (const e of f.eyes) { e.open.visible = !happy; e.lid.visible = happy; }
      if (f.mouth) f.mouth.scale.y = worried ? 0.4 : 1;
      if (b.finished) {
        const hop = Math.abs(Math.sin(time.value * (happy ? 7 : 4))) * (happy ? 0.18 : 0.06);
        f.group.position.y = m.seatY + hop;
        if (happy) f.group.rotation.y = Math.sin(time.value * 3) * 0.6;
      } else { f.group.position.y = m.seatY; f.group.rotation.y = 0; }
      // the number flag ripples
      const fp = m.flag.geometry.attributes.position;
      for (let k = 0; k < fp.count; k++) { const x = fp.getX(k); fp.setZ(k, Math.sin(x * 14 - time.value * (6 + b.speed * 0.6)) * 0.03 * x); }
      fp.needsUpdate = true;
      // bow spray at speed (more in the waves), wake, boost flames
      if (b.speed > 8 && Math.random() < dt * (10 + swell.value * 8)) {
        const fwd = new THREE.Vector3(fx, 0, fz);
        const sx = Math.random() < 0.5 ? -1 : 1;
        puff(new THREE.Vector3(b.pos.x, 0.08 + wh, b.pos.z).addScaledVector(fwd, 1.2), new THREE.Vector3(fwd.z * sx * 1.4, 1.2 + swell.value * 0.6, -fwd.x * sx * 1.4).addScaledVector(fwd, 0.5), 0.22, 0.5, 0.6);
      }
      if (b.speed > 2.5 && Math.random() < dt * (18 + b.speed * 2)) {
        const back = new THREE.Vector3(-fx, 0, -fz);
        const side = new THREE.Vector3(fz, 0, -fx).multiplyScalar((Math.random() - 0.5) * 0.9);
        puff(new THREE.Vector3(b.pos.x, 0.03 + wh, b.pos.z).addScaledVector(back, 1.1).add(side), back.multiplyScalar(0.5 + Math.random() * 0.3).addScaledVector(side, 0.3), 0.3, 1.1 + Math.random() * 0.5, 0.8);
      }
      if (b.boost > 0 && Math.random() < dt * 30) puff(new THREE.Vector3(b.pos.x - fx * 1.3, 0.2 + wh, b.pos.z - fz * 1.3), new THREE.Vector3(-fx * 4, 0.4, -fz * 4), 0.35, 0.35, 0.5, confMats[1]);
    });
    // gates: buoys bob, pennants flutter, the start banner waves; the next gate glows, its beacons shine
    gates.forEach((g, i) => {
      const gg = sim.course.gates[i];
      g.position.y = waveHeight(gg.at.x, gg.at.z, sim.time, swell.value) * 0.6 + Math.sin(time.value * 1.8 + i) * 0.05;
      const b = g.getObjectByName('banner') as THREE.Mesh | undefined;
      if (b) { const bp = b.geometry.attributes.position; for (let k = 0; k < bp.count; k++) bp.setZ(k, Math.sin(bp.getX(k) * 1.6 + time.value * 3) * 0.08); bp.needsUpdate = true; }
      const isNext = i === player.next;
      g.children.forEach((c) => { if (c.name === 'beam') { const mt = (c as THREE.Mesh).material as THREE.MeshBasicMaterial; mt.opacity = isNext ? 0.22 + Math.sin(time.value * 5) * 0.08 : 0; mt.color.set(isNext && player.missed > 0 ? PAL.raspberry : '#ffc94a'); } else if (c.name === 'sign') c.lookAt(camera.position); else c.traverse((o) => { if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshPhysicalMaterial) o.material.emissive.setScalar(isNext ? 0.25 + Math.sin(time.value * 6) * 0.1 : 0); }); });
    });
    const nextGate = sim.course.gates[player.next];
    chevron.position.set(nextGate.at.x, 4.6 + Math.sin(time.value * 3) * 0.3, nextGate.at.z);
    chevron.rotation.y += dt * 1.5;
    chevMat.color.set(player.missed > 0 ? PAL.raspberry : '#ffc94a');
    backArrow.visible = player.missed > 0 && !player.finished;
    if (backArrow.visible) { backArrow.position.set(player.pos.x, 1.9 + Math.sin(time.value * 6) * 0.1, player.pos.z); backArrow.rotation.y = Math.atan2(nextGate.at.x - player.pos.x, nextGate.at.z - player.pos.z); }
    arrows.forEach((a, i) => { const p = sim.course.samples[(i * 20) % sim.course.samples.length]; a.position.y = 0.06 + waveHeight(p.x, p.z, sim.time, swell.value); arrowMat.opacity = 0.34 + Math.sin(time.value * 3 - i * 0.6) * 0.12; });
    edgeBuoys.forEach((b, i) => { b.position.y = waveHeight(b.position.x, b.position.z, sim.time, swell.value) * 0.7 + Math.sin(time.value * 1.6 + i * 0.7) * 0.05; });
    // hazards rise when their lap starts; barrels and logs rock on the water
    for (const hz of hazards) {
      const on = sim.active(hz.h);
      if (on && hz.up < 1) { hz.up = Math.min(1, hz.up + dt * 0.9); hz.m.visible = true; if (hz.up === 1) splash({ pos: hz.h.pos } as Boat, 8, false); }
      if (!hz.m.visible) continue;
      const k = 1 - Math.pow(1 - hz.up, 3);
      const wh = waveHeight(hz.h.pos.x, hz.h.pos.z, sim.time, swell.value);
      hz.m.position.y = -2.5 * (1 - k) + wh * 0.8 + Math.sin(time.value * 1.5 + hz.h.yaw) * 0.04;
      if (hz.h.kind !== 'buoy') { const gr = waveGrad(hz.h.pos.x, hz.h.pos.z, sim.time, swell.value); hz.m.rotation.x = -gr.z * 0.8 + Math.sin(time.value * 1.3 + hz.h.yaw) * 0.04; }
    }
    for (const bp of boosts) {
      const on = sim.active(bp.b);
      if (on && bp.up < 1) { bp.up = Math.min(1, bp.up + dt * 1.2); bp.m.visible = true; }
      if (!bp.m.visible) continue;
      bp.m.scale.setScalar(0.01 + bp.up * 0.99);
      bp.m.position.y = waveHeight(bp.b.pos.x, bp.b.pos.z, sim.time, swell.value);
      const ready = (bp.b.cool[player.id] ?? 0) <= 0;
      bp.m.children.forEach((c, k) => { const mt = (c as THREE.Mesh).material as THREE.MeshBasicMaterial; if (c.name === 'ring') { mt.opacity = ready ? 0.65 + Math.sin(time.value * 4) * 0.2 : 0.25; (c as THREE.Mesh).rotation.y = time.value; } else mt.opacity = ready ? 0.5 + Math.sin(time.value * 6 - k * 1.2) * 0.45 : 0.2; });
    }
    for (const cu of currents) {
      const on = sim.active(cu.c);
      cu.g.visible = on;
      if (!on) continue;
      streakMat.opacity = 0.55;
      for (const p of cu.parts) {
        const k = (time.value * 0.5 + p.ph) % 1;
        p.m.position.set(p.off.x + cu.c.dir.x * (k - 0.5) * cu.c.r * 1.2, waveHeight(cu.c.pos.x + p.off.x, cu.c.pos.z + p.off.z, sim.time, swell.value) + 0.05, p.off.z + cu.c.dir.z * (k - 0.5) * cu.c.r * 1.2);
        p.m.scale.set(1, 1, 0.6 + Math.sin(k * Math.PI) * 0.8);
      }
    }
    // dolphins: swim under the surface around the course, now and then leap in an arc with a splash either end
    for (const d of dolphins) {
      d.a += dt * (5.5 / d.r);
      const r = d.r + Math.sin(time.value * 0.17 + d.i * 2) * 3; // drifts in towards the course and back out
      const x = Math.cos(d.a) * r, z = Math.sin(d.a) * r;
      let y = -0.9, pitch = 0;
      d.nextJump -= dt;
      if (d.jumpT < 0 && d.nextJump <= 0) { d.jumpT = 0; d.nextJump = 7 + Math.random() * 9; }
      if (d.jumpT >= 0) {
        d.jumpT += dt;
        const k = d.jumpT / 1.7;
        if (k >= 1) { d.jumpT = -1; splash({ pos: { x, z } } as Boat, 10, false); }
        else { y = -0.9 + Math.sin(k * Math.PI) * 2.6; pitch = -(k - 0.5) * 2.2; if (k < 0.08 && !d.wasUp) { splash({ pos: { x, z } } as Boat, 8, false); } }
      }
      d.wasUp = y > -0.4;
      d.g.position.set(x, y, z);
      d.g.rotation.set(pitch, Math.atan2(-Math.sin(d.a), Math.cos(d.a)) + Math.PI / 2, 0, 'YXZ');
      d.tail.rotation.x = Math.sin(time.value * 6 + d.i) * 0.5;
    }
    // fish: schools weave through the shallows; one jumps now and then
    const fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), fe = new THREE.Euler(), fs = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < NF; i++) {
      const f = fishData[i];
      f.a += dt * (1.6 / f.r) * (f.school % 2 ? 1 : -1);
      const wob = Math.sin(time.value * 2 + f.ph) * 0.4;
      const rr = f.r + wob;
      const x = Math.cos(f.a) * rr, z = Math.sin(f.a) * rr;
      fe.set(0, Math.atan2(-Math.sin(f.a), Math.cos(f.a)) * (f.school % 2 ? 1 : 1) + (f.school % 2 ? Math.PI / 2 : -Math.PI / 2), Math.sin(time.value * 8 + f.ph) * 0.2);
      fm.compose(tmp.set(x, f.y + Math.sin(time.value * 1.3 + f.ph) * 0.06, z), fq.setFromEuler(fe), fs);
      fish.setMatrixAt(i, fm);
    }
    fish.instanceMatrix.needsUpdate = true;
    for (const j of jumpers) {
      j.next -= dt;
      if (j.t < 0 && j.next <= 0) { const a = Math.random() * Math.PI * 2; j.x = Math.cos(a) * 15; j.z = Math.sin(a) * 15; j.vx = -Math.sin(a) * 2.5; j.vz = Math.cos(a) * 2.5; j.t = 0; j.next = 5 + Math.random() * 8; j.m.visible = true; splash({ pos: { x: j.x, z: j.z } } as Boat, 4, false); }
      if (j.t >= 0) {
        j.t += dt;
        const k = j.t / 1.1;
        if (k >= 1) { j.t = -1; j.m.visible = false; splash({ pos: { x: j.x, z: j.z } } as Boat, 5, false); continue; }
        j.x += j.vx * dt; j.z += j.vz * dt;
        j.m.position.set(j.x, -0.3 + Math.sin(k * Math.PI) * 1.4, j.z);
        j.m.rotation.set(-(k - 0.5) * 2.4, Math.atan2(j.vx, j.vz), 0, 'YXZ');
      }
    }
    // birds: circles above the island (gulls high and wide, the two parrots low between the palms), wings beating
    for (const b of birds) {
      b.a += dt * b.sp * b.dir;
      b.flap += dt * (b.r > 8 ? 5 : 8);
      const x = Math.cos(b.a) * b.r, z = Math.sin(b.a) * b.r;
      b.g.position.set(x, b.h + Math.sin(time.value * 0.8 + b.r) * 0.4, z);
      b.g.rotation.set(0, Math.atan2(-Math.sin(b.a) * b.dir, Math.cos(b.a) * b.dir) + Math.PI / 2, -b.dir * 0.25, 'YXZ');
      const w = Math.sin(b.flap) * 0.7;
      b.wings[0].rotation.y = w; b.wings[1].rotation.y = -w;
    }
    // sprites: wake, spray, splashes, confetti
    for (let i = puffs.length - 1; i >= 0; i--) {
      const q = puffs[i];
      q.life += dt;
      q.v.y -= q.g * dt;
      q.s.position.addScaledVector(q.v, dt);
      q.s.scale.addScalar(q.grow * dt);
      const k = q.life / q.max;
      (q.s.material as THREE.SpriteMaterial).opacity = (q.s.material === puffMat ? 0.5 : 0.9) * (1 - k);
      if (k >= 1) { scene.remove(q.s); puffs.splice(i, 1); }
    }
    puffMat.opacity = 0.5; for (const m of confMats) m.opacity = 0.9;
    // camera: chase from behind, swinging with the heading, pulling back with speed; looks a little ahead and leans the view
    // towards the next gate when it's roughly in front; after the finish it circles the boat for the celebration
    const spd = Math.min(1, player.speed / 13);
    const pose = sim.state === 'countdown' ? 1 - Math.min(1, sim.countdown / 3.6) : 1;
    const ng = sim.nextGate();
    if (sim.state === 'finished') {
      const t = finishedAt < 0 ? 0 : time.value - finishedAt;
      const ang = player.heading + Math.PI + t * 0.7;
      camPos.lerp(tmp.set(player.pos.x - Math.sin(ang) * 6.5, 2.6, player.pos.z - Math.cos(ang) * 6.5), Math.min(1, dt * 2.5));
      camLook.lerp(tmp.set(player.pos.x, 0.9, player.pos.z), Math.min(1, dt * 4));
    } else {
      camYaw = lerpAngle(camYaw, player.heading, Math.min(1, dt * (sim.state === 'countdown' ? 1.2 : 3.2)));
      const back = 6.5 + spd * 2.2 + (player.boost > 0 ? 0.8 : 0), up = 3.1 + spd * 0.6 + swell.value * 0.35;
      const want = new THREE.Vector3(player.pos.x - Math.sin(camYaw) * back, up, player.pos.z - Math.cos(camYaw) * back);
      // never among the palms: when the chase spot would be over the island, slide it out over the beach/water and lift a little
      const dIsland = Math.hypot(want.x, want.z);
      if (dIsland < ISLAND_R + 2.5) {
        const k = (ISLAND_R + 2.5) / Math.max(0.01, dIsland);
        want.x *= k; want.z *= k;
        want.y = Math.max(want.y, heightAt(want.x, want.z, ISLAND_R + 1.6) + 2.6, 4.2);
      }
      camPos.lerp(want, Math.min(1, dt * (sim.state === 'countdown' ? 1.1 : 4.5)));
      // (and the camera itself, in case a slow frame lerped it across the beach)
      const dCam = Math.hypot(camPos.x, camPos.z);
      if (dCam < ISLAND_R + 2.2) { const k = (ISLAND_R + 2.2) / Math.max(0.01, dCam); camPos.x *= k; camPos.z *= k; camPos.y = Math.max(camPos.y, 4); }
      // look-ahead: mostly straight on, a third of the way towards the next gate when it's within ~70° (never behind you)
      const gateK = Math.abs(ng.angle) < 1.2 && ng.dist < 40 ? 0.33 * (1 - Math.abs(ng.angle) / 1.2) : 0;
      const lookYaw = lerpAngle(player.heading, Math.atan2(ng.gate.at.x - player.pos.x, ng.gate.at.z - player.pos.z), gateK);
      const lookWant = new THREE.Vector3(player.pos.x + Math.sin(lookYaw) * (2.5 + spd * 2), 0.5, player.pos.z + Math.cos(lookYaw) * (2.5 + spd * 2));
      camLook.lerp(lookWant, Math.min(1, dt * 5));
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    camera.rotation.z += player.steer * 0.03 * spd * pose;
    fov = lerp(fov, baseFov + (player.boost > 0 ? 9 : 0) + spd * 3, Math.min(1, dt * 4));
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
    sun.target.position.set(player.pos.x, 0, player.pos.z);
    sun.position.set(player.pos.x - 30, 40, player.pos.z + 20);
    // HUD
    if (sim.state !== 'countdown') timeEl.textContent = fmt(sim.time);
    lapN.textContent = String(Math.min(LAPS, player.lap + 1));
    const pw = player.place === 1 ? '1st' : player.place === 2 ? '2nd' : player.place === 3 ? '3rd' : `${player.place}th`;
    if (posN.textContent !== pw) { posN.textContent = pw; posEl.classList.remove('bump'); void posEl.offsetWidth; posEl.classList.add('bump'); }
    arrowIn.style.transform = `rotate(${(-ng.angle * 180) / Math.PI - 90}deg)`;
    arrowD.textContent = `${Math.round(ng.dist)} m`;
    // the missed-checkpoint state is read from the rules every frame (not only from events), so it can never get stuck on or off
    const missedNow = player.missed > 0 && !player.finished;
    if (missedEl.classList.contains('on') !== missedNow) { missedEl.classList.toggle('on', missedNow); arrow.classList.toggle('back', missedNow); arrowL.textContent = missedNow ? 'go back' : 'next gate'; }
    speedN.textContent = String(Math.round(player.speed * 4.4));
    speedEl.classList.toggle('boost', player.boost > 0);
    wrong.classList.toggle('on', player.wrongWay > 0.8 && player.missed === 0);
    if (player.wrongWay > 0.8 && player.missed === 0 && Math.floor(time.value * 2) !== Math.floor((time.value - dt) * 2)) play(snd.wrong);
    edgeEl.classList.toggle('on', player.edge > 0.08 && !player.finished);
    if (now - lastMap > 120) { lastMap = now; drawMap(); }
    eng.set(player.speed, sim.state === 'racing' ? player.throttle : 0.6);
    // finish: a moment to celebrate (confetti for a win), then the results
    if (sim.state === 'finished' && !done) {
      if (finishedAt < 0) { finishedAt = time.value; finishedWall = now; eng.set(player.speed, 0); splash(player, 24); edgeEl.classList.remove('on'); }
      if (player.place === 1 && Math.random() < dt * 40) puff(new THREE.Vector3(player.pos.x + (Math.random() - 0.5) * 3, 3.5 + Math.random() * 1.5, player.pos.z + (Math.random() - 0.5) * 3), new THREE.Vector3((Math.random() - 0.5) * 2, -0.4 - Math.random(), (Math.random() - 0.5) * 2), 0.25, 1.6, 0.1, confMats[Math.floor(Math.random() * confMats.length)], 1.2);
      if (now - finishedWall > 2800) { // wall-clock, so a slow device doesn't stretch the celebration
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
  const splash = (b: Pick<Boat, 'pos'>, n: number, sound = true) => { if (sound) play(snd.splash); const wh = waveHeight(b.pos.x, b.pos.z, sim.time, swell.value); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 0.8 + Math.random() * 1.6; puff(new THREE.Vector3(b.pos.x, 0.1 + wh, b.pos.z), new THREE.Vector3(Math.cos(a) * s, 1.4 + Math.random() * 1.5, Math.sin(a) * s), 0.35, 0.8 + Math.random() * 0.5, 0.9); } };
  const drawMap = () => {
    const x = map.getContext('2d'); if (!x) return;
    const S = map.width, c = S / 2, k = (S / 2 - 8) / (OUTER_R + 2);
    x.clearRect(0, 0, S, S);
    x.fillStyle = 'rgba(20, 60, 90, 0.55)'; x.beginPath(); x.arc(c, c, S / 2 - 2, 0, Math.PI * 2); x.fill();
    // the boundary buoys
    x.strokeStyle = 'rgba(255, 140, 66, 0.9)'; x.setLineDash([3, 3]); x.lineWidth = 1.5; x.beginPath(); x.arc(c, c, EDGE_R * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#79c86b'; x.beginPath(); x.arc(c, c, ISLAND_R * k, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 2; x.beginPath();
    sim.course.samples.forEach((p, i) => { const px = c + p.x * k, py = c + p.z * k; if (i) x.lineTo(px, py); else x.moveTo(px, py); });
    x.closePath(); x.stroke();
    // furniture that is in the water now
    for (const h of sim.features.hazards) if (sim.active(h)) { x.fillStyle = h.kind === 'buoy' ? '#ffc94a' : h.kind === 'barrel' ? '#4a7bd0' : '#8a5a30'; x.beginPath(); x.arc(c + h.pos.x * k, c + h.pos.z * k, 2, 0, Math.PI * 2); x.fill(); }
    for (const b of sim.features.boosts) if (sim.active(b)) { x.strokeStyle = '#ffc94a'; x.lineWidth = 1.5; x.beginPath(); x.arc(c + b.pos.x * k, c + b.pos.z * k, 3, 0, Math.PI * 2); x.stroke(); }
    sim.course.gates.forEach((g, i) => {
      const gx = c + g.at.x * k, gy = c + g.at.z * k, nx = i === player.next;
      x.fillStyle = nx ? (player.missed > 0 ? '#ff5a8a' : '#ffc94a') : i === 0 ? '#ffffff' : '#ff8c42';
      x.beginPath(); x.arc(gx, gy, nx ? 4.5 : 3, 0, Math.PI * 2); x.fill();
      if (nx) {
        // a pulsing ring and the direction you have to travel through it
        x.strokeStyle = x.fillStyle; x.lineWidth = 1.5; x.beginPath(); x.arc(gx, gy, 7 + Math.sin(time.value * 5) * 1.5, 0, Math.PI * 2); x.stroke();
        x.beginPath(); x.moveTo(gx - g.dir.x * 5, gy - g.dir.z * 5); x.lineTo(gx + g.dir.x * 9, gy + g.dir.z * 9); x.stroke();
        x.beginPath(); x.moveTo(gx + g.dir.x * 9, gy + g.dir.z * 9); x.lineTo(gx + g.dir.x * 5 + g.n.x * 3, gy + g.dir.z * 5 + g.n.z * 3); x.lineTo(gx + g.dir.x * 5 - g.n.x * 3, gy + g.dir.z * 5 - g.n.z * 3); x.closePath(); x.fill();
      }
    });
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
