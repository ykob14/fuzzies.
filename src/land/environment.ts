/**
 * The world around the town (see ART.md): a rounded island with cliffs and a sandy beach, stylised water
 * with shore foam, a soft gradient sky, grass tufts and wildflowers that sway, coastal rocks, and a forest
 * of storybook trees. Big repeated things are instanced so phones stay smooth.
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../game/textures3d';
import { MAP } from './rules';
import * as LT from './textures';
import { bushGeometry } from '../game/models3d';

export const CENTER = MAP / 2;
export const PALETTE = {
  grass: '#79bd55', grassLight: '#a6d97a', grassShade: '#5c9c45',
  sand: '#f3dca2', cliff: '#c9a77e', rock: '#8e7a66',
  shallow: '#7fe6dd', mid: '#2fbad0', deep: '#16709f',
  skyTop: '#64b9f2', horizon: '#d9f1ff',
  bark: '#8a5a3a', leafLight: '#9fdc6a', leaf: '#5cb547', leafDark: '#2f7d3a', pine: '#2e8a5a', pineLight: '#57b37a',
};
const col = (hex: string) => new THREE.Color(hex);

// ---------- the island's outline ----------
/** Distance from the island's centre to its edge at angle `a`: a rounded square with a gently wavy coast. */
export function islandRadius(a: number, grow = 0): number {
  const n = 3.2, R = 19.4;
  const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const base = R / Math.pow(Math.pow(c, n) + Math.pow(s, n), 1 / n);
  return base + grow + Math.sin(a * 3 + 0.7) * 0.55 + Math.sin(a * 5 + 2.1) * 0.35 + Math.sin(a * 11 + 1.3) * 0.16;
}
/** Is (x, z) on the island's grass, with some margin? */
export function onIsland(x: number, z: number, margin = 0): boolean {
  const dx = x - CENTER, dz = z - CENTER;
  return Math.hypot(dx, dz) < islandRadius(Math.atan2(dz, dx)) - margin;
}

function outline(grow: number, steps = 220): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = islandRadius(a, grow);
    // shape space (x, y) → world (x, -z) after the slab is turned to lie flat
    const x = CENTER + Math.cos(a) * r, z = CENTER + Math.sin(a) * r;
    if (i === 0) s.moveTo(x, -z); else s.lineTo(x, -z);
  }
  return s;
}

/** A flat slab of the outline, top face at y = top, `depth` deep, with a rounded rim. */
function slab(grow: number, top: number, depth: number, bevel: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(outline(grow), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 1.6, bevelSegments: 4, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, top - depth - bevel, 0);
  return g;
}

// ---------- terrain ----------
export function buildTerrain(): THREE.Group {
  const g = new THREE.Group();
  // the grassy island: lawn on top, sides shade from grass to earth to rock
  const isl = slab(0, 0, 0.75, 0.16);
  const pos = isl.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > -0.06) c.set(PALETTE.grass);
    else if (y > -0.22) c.lerpColors(col(PALETTE.grass), col(PALETTE.cliff), (-0.06 - y) / 0.16);
    else c.lerpColors(col(PALETTE.cliff), col(PALETTE.rock), Math.min(1, (-0.22 - y) / 0.5));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  isl.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const lawn = LT.lawn();
  lawn.repeat.set(0.22, 0.22);
  const top = new THREE.MeshStandardMaterial({ map: lawn, roughness: 0.95 });
  const side = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const islMesh = new THREE.Mesh(isl, [top, side]);
  islMesh.receiveShadow = true;
  g.add(islMesh);
  // the sandy beach around it, sloping into the water
  const beach = slab(2.6, -0.26, 0.5, 0.22);
  const sand = LT.sand();
  sand.repeat.set(0.3, 0.3);
  const beachMesh = new THREE.Mesh(beach, new THREE.MeshStandardMaterial({ map: sand, roughness: 1 }));
  beachMesh.receiveShadow = true;
  g.add(beachMesh);
  return g;
}

// ---------- water ----------
/** A soft "how close to the shore" map, baked once from the beach outline. Red = wide falloff, green = narrow. */
function shoreMap(size: number): THREE.CanvasTexture {
  const S = 512;
  const base = document.createElement('canvas');
  base.width = base.height = S;
  const bx = base.getContext('2d')!;
  const toPx = (v: number) => ((v - (CENTER - size / 2)) / size) * S;
  bx.fillStyle = '#000'; bx.fillRect(0, 0, S, S);
  bx.fillStyle = '#fff';
  bx.beginPath();
  for (let i = 0; i <= 240; i++) {
    const a = (i / 240) * Math.PI * 2, r = islandRadius(a, 2.9);
    const x = toPx(CENTER + Math.cos(a) * r), y = toPx(CENTER + Math.sin(a) * r);
    if (i === 0) bx.moveTo(x, y); else bx.lineTo(x, y);
  }
  bx.fill();
  const out = document.createElement('canvas');
  out.width = out.height = S;
  const ox = out.getContext('2d')!;
  const blur = (px: number) => {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d')!;
    x.filter = `blur(${px}px)`;
    x.drawImage(base, 0, 0);
    return c;
  };
  // red channel: wide glow (shallows); green: tight glow (foam line)
  ox.globalCompositeOperation = 'lighter';
  ox.drawImage(tint(blur(34), [1, 0, 0]), 0, 0);
  ox.drawImage(tint(blur(7), [0, 1, 0]), 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
function tint(src: HTMLCanvasElement, rgb: number[]): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d')!;
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = `rgb(${rgb.map((v) => v * 255).join(',')})`;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

export function buildWater(time: { value: number }): THREE.Mesh {
  const SIZE = 110;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: time, uShore: { value: shoreMap(SIZE) }, uOrigin: { value: new THREE.Vector2(CENTER, CENTER) }, uSize: { value: SIZE },
      uDeep: { value: col(PALETTE.deep) }, uMid: { value: col(PALETTE.mid) }, uShallow: { value: col(PALETTE.shallow) }, uHorizon: { value: col(PALETTE.horizon) },
    },
    vertexShader: `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uTime; uniform sampler2D uShore; uniform vec2 uOrigin; uniform float uSize;
      uniform vec3 uDeep, uMid, uShallow, uHorizon;
      varying vec3 vW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec2 suv = (vW.xz - uOrigin) / uSize + 0.5;
        vec4 sh = texture2D(uShore, suv);
        float wide = sh.r, tight = sh.g;
        float t = uTime;
        float n = noise(vW.xz * 0.45 + vec2(t * 0.12, t * 0.07)) * 0.6 + noise(vW.xz * 1.3 - vec2(t * 0.18, -t * 0.1)) * 0.4;
        vec3 c = mix(uDeep, uMid, smoothstep(0.0, 0.45, wide));
        c = mix(c, uShallow, smoothstep(0.45, 0.95, wide));
        // how far the camera is: small detail (highlights, glints) fades out when seen from far away, so the sea never turns to static
        float far = smoothstep(16.0, 34.0, distance(cameraPosition, vW));
        // soft wave highlights: broad, warped bands rather than speckle
        float nb = noise(vW.xz * 0.18 + vec2(n * 1.6, t * 0.05));
        c += vec3(0.07, 0.10, 0.10) * smoothstep(0.55, 0.85, mix(n, nb, 0.6)) * (1.0 - far * 0.6);
        // slow cloud shadows drifting over the water sell the scale
        c *= mix(0.86, 1.0, smoothstep(0.32, 0.62, noise(vW.xz * 0.035 + vec2(t * 0.012, t * 0.006))));
        // foam: a bright line on the beach plus soft bands washing in
        float band = sin(wide * 26.0 - t * 1.5 + n * 3.0) * 0.5 + 0.5;
        float foam = smoothstep(0.55, 0.85, tight) + smoothstep(0.82, 1.0, band) * smoothstep(0.5, 0.92, wide) * 0.55;
        c = mix(c, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.85);
        // little sun glints
        c += vec3(1.0) * smoothstep(0.93, 0.99, noise(vW.xz * 2.4 + t * 0.4)) * 0.3 * (1.0 - wide) * (1.0 - far);
        // fade into the haze far away
        float d = length(vW.xz - uOrigin);
        c = mix(c, uHorizon, smoothstep(55.0, 120.0, d));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), mat);
  m.position.set(CENTER, -0.42, CENTER);
  return m;
}

// ---------- sky ----------
export function buildSky(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTop: { value: col(PALETTE.skyTop) }, uHorizon: { value: col(PALETTE.horizon) } },
    vertexShader: 'varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop, uHorizon; varying vec3 vD;
      void main() { float k = smoothstep(-0.05, 0.55, vD.y); gl_FragColor = vec4(mix(uHorizon, uTop, k), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), mat);
  m.position.set(CENTER, 0, CENTER);
  return m;
}

// ---------- trees (shared by the forest and the Fluffy Tree decoration) ----------
function painted(g: THREE.BufferGeometry, fn: (y: number, x: number, z: number) => THREE.Color): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  const p = n.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = fn(p.getY(i), p.getX(i), p.getZ(i)); c.set([k.r, k.g, k.b], i * 3); }
  n.setAttribute('color', new THREE.BufferAttribute(c, 3));
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'color'].includes(k)) n.deleteAttribute(k);
  return n;
}
function lumpy(r: number, seed: number, detail = 2): THREE.BufferGeometry {
  // weld the points first so the bumps stay smooth (no facets)
  const ico = new THREE.IcosahedronGeometry(r, detail);
  ico.deleteAttribute('normal'); ico.deleteAttribute('uv');
  const g = mergeVertices(ico);
  const rr = rng(seed);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const bumps = [0, 1, 2].map(() => new THREE.Vector3(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize());
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const k = 1 + bumps.reduce((s, b) => s + Math.max(0, v.dot(b)) * 0.12, 0) - 0.06;
    v.multiplyScalar(r * k);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** A round storybook tree: a slightly bent trunk and a cloud of leafy puffs, lighter on top. Height ≈ 2.2 × scale. */
export function broadleafParts(seed: number): { trunk: THREE.BufferGeometry; crown: THREE.BufferGeometry } {
  const r = rng(seed);
  const h = 0.9 + r() * 0.25;
  const trunk = painted(new THREE.CylinderGeometry(0.07, 0.12, h, 8, 3).translate(0, h / 2, 0), () => col(PALETTE.bark));
  const puffs: THREE.BufferGeometry[] = [];
  const n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r();
    const rad = 0.36 + r() * 0.16;
    puffs.push(lumpy(rad, seed * 13 + i).translate(Math.cos(a) * 0.3, h + 0.25 + r() * 0.3, Math.sin(a) * 0.3));
  }
  puffs.push(lumpy(0.5, seed * 7).translate(0, h + 0.55, 0));
  const top = h + 1.1;
  const crown = painted(mergeGeometries(puffs.map((g) => g.toNonIndexed()))!, (y) => new THREE.Color().lerpColors(col(PALETTE.leafDark), col(PALETTE.leafLight), Math.min(1, Math.max(0, (y - h + 0.1) / (top - h)))));
  return { trunk, crown };
}

/** A soft rounded pine: three stacked cones with puffy rims. */
export function pineParts(seed: number): { trunk: THREE.BufferGeometry; crown: THREE.BufferGeometry } {
  const r = rng(seed);
  const trunk = painted(new THREE.CylinderGeometry(0.06, 0.09, 0.5, 8).translate(0, 0.25, 0), () => col(PALETTE.bark));
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const rad = 0.62 - i * 0.16, hh = 0.7 - i * 0.08;
    parts.push(new THREE.ConeGeometry(rad, hh, 10, 2).translate(0, 0.55 + i * 0.42 + hh / 2, 0).toNonIndexed());
    parts.push(new THREE.TorusGeometry(rad * 0.86, 0.07, 6, 14).rotateX(Math.PI / 2).translate(0, 0.58 + i * 0.42, 0).toNonIndexed());
  }
  void r;
  const crown = painted(mergeGeometries(parts)!, (y) => new THREE.Color().lerpColors(col(PALETTE.pine), col(PALETTE.pineLight), Math.min(1, Math.max(0, (y - 0.5) / 1.6))));
  return { trunk, crown };
}

let windPatched: THREE.MeshStandardMaterial | null = null;
/** Leaf material that sways in the wind (tops move more than bottoms). */
export function leafMaterial(time: { value: number }): THREE.MeshStandardMaterial {
  if (windPatched) return windPatched;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wp = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wp = instanceMatrix * wp;
      #endif
      float sway = sin(uTime * 1.3 + wp.x * 0.7 + wp.z * 0.9) * 0.035 * max(0.0, transformed.y - 0.6);
      transformed.x += sway; transformed.z += sway * 0.6;`);
  };
  windPatched = m;
  return m;
}
const barkMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });

/** A single tree mesh group (for the Fluffy Tree decoration). */
export function treeModel(seed: number, time: { value: number }, scale = 0.55): THREE.Group {
  const p = seed % 4 === 3 ? pineParts(seed) : broadleafParts(seed);
  const g = new THREE.Group();
  const t = new THREE.Mesh(p.trunk, barkMaterial); t.castShadow = true;
  const c = new THREE.Mesh(p.crown, leafMaterial(time)); c.castShadow = true; c.receiveShadow = true;
  g.add(t, c);
  g.scale.setScalar(scale);
  return g;
}

/** The forest around the town: instanced trees in the ring between the land you can build on and the coast. */
export function buildForest(size: number, time: { value: number }, felled: ReadonlySet<number> = new Set()): THREE.Group {
  const g = new THREE.Group();
  const o = (MAP - size) / 2;
  const r = rng(19);
  const spots: { x: number; z: number; s: number; rot: number; pine: boolean; k: number }[] = [];
  for (let k = 0; k < 900 && spots.length < 190; k++) {
    const x = CENTER + (r() - 0.5) * 44, z = CENTER + (r() - 0.5) * 44;
    if (!onIsland(x, z, 1.4)) continue;
    if (x > o - 1.4 && x < o + size + 1.4 && z > o - 1.4 && z < o + size + 1.4) continue; // a clear lawn around the town
    if (spots.some((p) => Math.hypot(p.x - x, p.z - z) < 1.0)) continue;
    spots.push({ x, z, s: 0.5 + r() * 0.35, rot: r() * 6.28, pine: r() < 0.3, k });
  }
  // cleared trees leave their spot empty (the spot number k is the tree's lasting id)
  for (let i = spots.length - 1; i >= 0; i--) if (felled.has(spots[i].k)) spots.splice(i, 1);
  const kinds = [broadleafParts(3), broadleafParts(8), pineParts(5)];
  const groups = kinds.map(() => [] as typeof spots);
  spots.forEach((p, i) => groups[p.pine ? 2 : i % 2].push(p));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  kinds.forEach((kind, ki) => {
    const list = groups[ki];
    if (!list.length) return;
    const trunks = new THREE.InstancedMesh(kind.trunk, barkMaterial, list.length);
    const crowns = new THREE.InstancedMesh(kind.crown, leafMaterial(time), list.length);
    list.forEach((p, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot);
      m4.compose(v.set(p.x, 0, p.z), q, sc.setScalar(p.s));
      trunks.setMatrixAt(i, m4); crowns.setMatrixAt(i, m4);
    });
    // what was tapped: instance i is tree list[i] (its id, spot and size)
    trunks.userData.trees = crowns.userData.trees = list.map((p) => ({ k: p.k, x: p.x, z: p.z, s: p.s }));
    trunks.castShadow = crowns.castShadow = true;
    crowns.receiveShadow = true;
    g.add(trunks, crowns);
  });
  return g;
}

// ---------- ground details ----------
/**
 * Grass tufts and tiny wildflowers on free ground (`free(x, z)` says whether a spot is open lawn), plus landscaping
 * where `garden(x, z)` is high (next to buildings and along sidewalks): shrubs, flower clusters and pebbles.
 */
export function buildGroundCover(free: (x: number, z: number) => boolean, time: { value: number }, mobile: boolean, garden?: (x: number, z: number) => number, leaves?: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const r = rng(77);
  // a tuft = a few curved blades, dark at the root and bright at the tip
  const blades: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI + r() * 0.4, h = 0.13 + r() * 0.09;
    const b = new THREE.BufferGeometry();
    b.setAttribute('position', new THREE.Float32BufferAttribute([-0.018, 0, 0, 0.018, 0, 0, -0.006, h * 0.6, 0.012, 0.006, h * 0.6, 0.012, 0, h, 0.03], 3));
    b.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
    b.computeVertexNormals();
    blades.push(b.rotateY(a).translate((r() - 0.5) * 0.06, 0, (r() - 0.5) * 0.06).toNonIndexed());
  }
  const tuft = painted(mergeGeometries(blades)!, (y) => new THREE.Color().lerpColors(col(PALETTE.grassShade), col(PALETTE.grassLight), Math.min(1, y / 0.18)));
  const tm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  tm.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 ip = instanceMatrix[3];
      transformed.x += sin(uTime * 2.0 + ip.x * 0.8 + ip.z * 1.1) * 0.03 * transformed.y * 6.0;`);
  };
  const want = mobile ? 2600 : 5200;
  const spots: THREE.Vector3[] = [];
  for (let k = 0; k < want * 4 && spots.length < want; k++) {
    const x = CENTER + (r() - 0.5) * 44, z = CENTER + (r() - 0.5) * 44;
    if (!onIsland(x, z, 0.35) || !free(x, z)) continue;
    spots.push(new THREE.Vector3(x, 0, z));
  }
  const tufts = new THREE.InstancedMesh(tuft, tm, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  spots.forEach((p, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28); s.setScalar(0.8 + r() * 0.7); tufts.setMatrixAt(i, m4.compose(p, q, s)); });
  tufts.receiveShadow = true;
  g.add(tufts);
  // wildflowers: little five-dot blossoms in white, butter and pink
  const blossom = mergeGeometries([0, 1, 2, 3, 4].map((i) => new THREE.SphereGeometry(0.022, 6, 4).translate(Math.cos(i * 1.256) * 0.03, 0.06, Math.sin(i * 1.256) * 0.03).toNonIndexed())
    .concat([new THREE.SphereGeometry(0.02, 6, 4).translate(0, 0.065, 0).toNonIndexed(), new THREE.CylinderGeometry(0.004, 0.004, 0.06, 3).translate(0, 0.03, 0).toNonIndexed()]))!;
  const fm = new THREE.MeshStandardMaterial({ roughness: 0.6 });
  const fl: THREE.Vector3[] = [];
  for (let k = 0; k < 4000 && fl.length < (mobile ? 260 : 480); k++) {
    const x = CENTER + (r() - 0.5) * 44, z = CENTER + (r() - 0.5) * 44;
    if (!onIsland(x, z, 0.6) || !free(x, z)) continue;
    fl.push(new THREE.Vector3(x, 0, z));
  }
  const flowers = new THREE.InstancedMesh(blossom, fm, fl.length);
  const tints = ['#ffffff', '#ffe066', '#ff9fc8', '#ffffff', '#ffd1e3'].map((h) => new THREE.Color(h));
  fl.forEach((p, i) => { flowers.setMatrixAt(i, m4.compose(p, q.identity(), s.setScalar(0.9 + r() * 0.6))); flowers.setColorAt(i, tints[i % tints.length]); });
  g.add(flowers);
  if (garden) {
    // landscaping that hugs buildings and sidewalks: round shrubs, bright flower clusters, pebbles
    const shrubs: THREE.Vector3[] = [], clusters: THREE.Vector3[] = [], pebbles: THREE.Vector3[] = [];
    const cap = mobile ? 0.6 : 1;
    for (let k = 0; k < 26000 && shrubs.length + clusters.length + pebbles.length < 900 * cap; k++) {
      const x = CENTER + (r() - 0.5) * 30, z = CENTER + (r() - 0.5) * 30;
      const w = garden(x, z);
      if (w <= 0 || r() > w * 0.5) continue;
      const roll = r();
      if (roll < 0.3) { if (shrubs.every((p) => Math.hypot(p.x - x, p.z - z) > 0.22)) shrubs.push(new THREE.Vector3(x, 0, z)); }
      else if (roll < 0.85) clusters.push(new THREE.Vector3(x, 0, z));
      else pebbles.push(new THREE.Vector3(x, 0, z));
    }
    if (shrubs.length && leaves) {
      const bush = new THREE.InstancedMesh(bushGeometry(41, 0.3), leaves, shrubs.length);
      shrubs.forEach((p, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28); bush.setMatrixAt(i, m4.compose(p, q, s.setScalar(0.7 + r() * 0.6))); });
      bush.castShadow = true; bush.receiveShadow = true;
      g.add(bush);
    }
    if (clusters.length) {
      const fc = new THREE.InstancedMesh(blossom, fm, clusters.length);
      const bright = ['#ff6b9a', '#ffd43b', '#ffffff', '#ff9fc8', '#ff922b', '#7ad7ff'].map((h) => new THREE.Color(h));
      clusters.forEach((p, i) => { fc.setMatrixAt(i, m4.compose(p, q.identity(), s.setScalar(1.3 + r() * 0.8))); fc.setColorAt(i, bright[Math.floor(r() * bright.length)]); });
      g.add(fc);
    }
    if (pebbles.length) {
      const pb = new THREE.InstancedMesh(lumpy(0.05, 77, 1), new THREE.MeshStandardMaterial({ color: '#d8cfc2', roughness: 0.95 }), pebbles.length);
      pebbles.forEach((p, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28); pb.setMatrixAt(i, m4.compose(p.clone().setY(0.01), q, s.set(0.7 + r(), 0.5, 0.7 + r()))); });
      pb.receiveShadow = true;
      g.add(pb);
    }
  }
  return g;
}

/** Smooth boulders along the coast. */
export function buildRocks(): THREE.Group {
  const g = new THREE.Group();
  const r = rng(91);
  const mat = new THREE.MeshStandardMaterial({ color: '#b9ad9c', roughness: 0.95, flatShading: false });
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2;
    const d = islandRadius(a) + 0.4 + r() * 1.6;
    const rock = new THREE.Mesh(lumpy(0.18 + r() * 0.3, 300 + i, 1), mat);
    rock.scale.y = 0.6 + r() * 0.3;
    rock.position.set(CENTER + Math.cos(a) * d, -0.28, CENTER + Math.sin(a) * d);
    rock.rotation.y = r() * 6;
    rock.castShadow = rock.receiveShadow = true;
    g.add(rock);
  }
  return g;
}

/** A few soft clouds drifting far out over the sea. */
export function buildClouds(): THREE.Group {
  const g = new THREE.Group();
  const r = rng(5);
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.35 });
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(lumpy(1.2 + r() * 1.2, 500 + i * 9 + k, 2), mat); p.position.set(k * 1.6 - 3.2, r() * 0.8, (r() - 0.5) * 1.5); p.scale.y = 0.7; c.add(p); }
    const a = (i / 9) * Math.PI * 2 + r();
    c.position.set(CENTER + Math.cos(a) * (48 + r() * 25), 9 + r() * 6, CENTER + Math.sin(a) * (48 + r() * 25));
    c.rotation.y = r() * 6;
    c.userData.speed = 0.15 + r() * 0.2;
    g.add(c);
  }
  return g;
}
