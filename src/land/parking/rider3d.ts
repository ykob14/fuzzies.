/**
 * The Fuzzies who drive in Parking Escape, in 3D: the owner's own model (`public/models/fuzzy.glb`, a lighter copy made by
 * `tools/fuzzy/build-rider.sh`: half the triangles, WebP, meshopt — 0.4 MB) with
 *  - its colour set in the shader: only the fur (and the irises, like the owner's sheet) changes hue; the eye whites, pupils, mouth
 *    and tongue keep their own colours, so a green Fuzzy still has a pink tongue. One texture for every colour (no per-colour copies
 *    on the phone's graphics memory). The rainbow Fuzzy's hue turns round its body.
 *  - eyelids: a thin copy of the model's own surface over each eye, in the fur colour, cut by the shader — `blink` closes them from
 *    the top with a soft lash line, `happy` pushes the lower lids up into ^ ^ eyes, `worry` tilts the top lids down at the outside.
 *  - a soft rim of light on the fur's edge so the ball reads against dark car seats.
 * The model faces +z and stands on y = 0 (centred in x / z).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { DRIVER_COLORS } from './vehicles';

interface Src { geo: THREE.BufferGeometry; lid: THREE.BufferGeometry; map: THREE.Texture; height: number }
let src: Src | null = null;
const loaded = new Map<string, Src>(); // per file (the dev comparison loads several)
let loading: Promise<boolean> | null = null;
export const riderUrl = (file = 'fuzzy-rider.glb'): string => `${import.meta.env.BASE_URL ?? '/'}models/${file}`;

/** the eyes and the mouth on the model (model units: height ≈ 1, measured from the texture) */
const EYES = [{ x: -0.158, y: 0.516, hx: 0.112, hy: 0.14, side: -1 }, { x: 0.185, y: 0.535, hx: 0.112, hy: 0.143, side: 1 }];
const MOUTH = { x: 0.013, y: 0.365, hx: 0.19, hy: 0.11 };

/** Load the rider model once. Resolves false if it can't be loaded (the game keeps the flat pictures). */
export function loadRiders(file = 'fuzzy-rider.glb'): Promise<boolean> {
  const hit = loaded.get(file);
  if (hit) { src = hit; return Promise.resolve(true); }
  if (loading) return loading;
  loading = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(riderUrl(file)).then((g) => {
    let mesh: THREE.Mesh | null = null;
    g.scene.traverse((o) => { if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh; });
    if (!mesh) throw new Error('no mesh');
    const m = mesh as THREE.Mesh;
    // meshopt stores positions / normals / uvs as small integers with the scale on the node: back to floats, node transform applied
    const geo = new THREE.BufferGeometry();
    for (const [name, a] of Object.entries(m.geometry.attributes) as [string, THREE.BufferAttribute][]) {
      const f = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) f[i * a.itemSize + c] = a.getComponent(i, c);
      geo.setAttribute(name, new THREE.BufferAttribute(f, a.itemSize));
    }
    if (m.geometry.index) geo.setIndex(Array.from(m.geometry.index.array as ArrayLike<number>));
    m.updateWorldMatrix(true, false);
    geo.applyMatrix4(m.matrixWorld);
    geo.attributes.normal ? geo.normalizeNormals() : geo.computeVertexNormals();
    const box = new THREE.Box3().setFromBufferAttribute(geo.attributes.position as THREE.BufferAttribute);
    geo.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    geo.computeBoundingSphere();
    const map = (m.material as THREE.MeshStandardMaterial).map;
    if (!map) throw new Error('no texture');
    map.anisotropy = 4;
    src = { geo, lid: lidGeometry(geo), map, height: box.max.y - box.min.y };
    loaded.set(file, src); bodyMats.clear(); loading = null;
    return true;
  }).catch((e) => { console.warn('rider model unavailable', e); loading = null; return false; });
  return loading;
}
export const ridersReady = (): boolean => !!src;

/** the triangles over each eye, lifted off the surface a hair, tagged with their eye's centre / size / side */
function lidGeometry(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geo.attributes.position, nor = geo.attributes.normal, idx = geo.index;
  const n = idx ? idx.count : pos.count;
  const P: number[] = [], N: number[] = [], E: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < n; t += 3) {
    const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3;
    if (cz < 0.2) continue;
    const e = EYES.find((e) => ((cx - e.x) / (e.hx * 1.35)) ** 2 + ((cy - e.y) / (e.hy * 1.35)) ** 2 < 1);
    if (!e) continue;
    for (const i of [i0, i1, i2]) {
      const nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
      P.push(pos.getX(i) + nx * 0.011, pos.getY(i) + ny * 0.011, pos.getZ(i) + nz * 0.011 + 0.004);
      N.push(nx, ny, nz);
      E.push(e.x, e.y, e.hx, e.hy * e.side); // the side rides on hy's sign
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('aEye', new THREE.Float32BufferAttribute(E, 4));
  g.computeBoundingSphere();
  return g;
}

// ---------- colour: the fur is recoloured to the Fuzzy's own colour from the owner's sheet, keeping the texture's light and shade ----------
interface Tint { col: THREE.Color; rainbow: number; key: number; keep: number }
/** sRGB luma of the model's average pink fur: brighter texels than this get brighter, darker ones darker */
const FUR_LUMA = 0.5;
function tintOf(n: number): Tint {
  const k = ((n % DRIVER_COLORS.length) + DRIVER_COLORS.length) % DRIVER_COLORS.length;
  const c = new THREE.Color(); c.setStyle(DRIVER_COLORS[k], THREE.NoColorSpace); // keep the sRGB numbers: the shader works in sRGB
  // the pink Fuzzy IS the model's own colour: it keeps its texture exactly as painted (no recolouring at all)
  return { col: c, rainbow: k === 14 ? 1 : 0, key: k, keep: k === 0 ? 1 : 0 };
}
const GLSL_TINT = /* glsl */`
uniform vec3 uCol; uniform float uRainbow; uniform float uKeep;
varying vec3 vModel;
vec3 fzHue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
/** the fur's own light and shade, in this Fuzzy's colour (all sRGB) */
vec3 fzTint(vec3 c, vec3 p) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722)) / ${FUR_LUMA.toFixed(2)};
  // rainbow: the order on the owner's sheet — orange on top, yellow-green on the left, blue below, purple and magenta on the right
  vec3 col = mix(uCol, mix(vec3(0.95), fzHue((atan(p.y - 0.5, p.x) * 57.2958 - 60.0) / 360.0), 0.85), uRainbow);
  // shade multiplies; very light colours (white, the pale greys) lift a little less so they keep their fur detail
  return clamp(col * pow(l, 1.15), 0.0, 1.0);
}
`;
const toSrgb = (c: string) => 'pow(max(' + c + ', vec3(0.0)), vec3(1.0 / 2.2))';
const toLin = (c: string) => 'pow(' + c + ', vec3(2.2))';

const bodyMats = new Map<number, THREE.MeshStandardMaterial>();
function bodyMaterial(n: number): THREE.MeshStandardMaterial {
  const t = tintOf(n), key = t.key;
  let m = bodyMats.get(key);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({ map: src!.map, roughness: 0.85, metalness: 0 }); // the GLB's own fur material values
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uCol: { value: t.col }, uRainbow: { value: t.rainbow }, uKeep: { value: t.keep } });
    sh.vertexShader = 'varying vec3 vModel;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvModel = position;');
    sh.fragmentShader = GLSL_TINT + sh.fragmentShader
      .replace('#include <map_fragment>', /* glsl */`
        vec4 fzTex = texture2D(map, vMapUv);
        vec3 fzS = ${toSrgb('fzTex.rgb')};
        float fzMax = max(fzS.r, max(fzS.g, fzS.b)), fzMin = min(fzS.r, min(fzS.g, fzS.b));
        float fzFur = smoothstep(0.1, 0.28, (fzMax - fzMin) / max(fzMax, 0.001)) * smoothstep(0.12, 0.3, fzMax);
        vec2 fzM = (vModel.xy - vec2(${MOUTH.x}, ${MOUTH.y})) / vec2(${MOUTH.hx}, ${MOUTH.hy});
        // the mouth keeps its own colours (dark inside, pink tongue): only what sits deeper than the fur — the cavity — inside the mouth's
        // outline; the fur round the lips is recoloured like the rest (a flat outline left a pink ring round every mouth)
        float fzDeep = 1.0 - smoothstep(0.37, 0.40, length(vModel - vec3(0.0, 0.5, 0.0)));
        fzFur *= 1.0 - fzDeep * (1.0 - smoothstep(0.95, 1.15, length(fzM))) * step(0.12, vModel.z);
        fzFur = clamp(fzFur, 0.0, 1.0) * (1.0 - uKeep);
        vec3 fzT = fzTint(fzS, vModel);
        diffuseColor *= vec4(${toLin('mix(fzS, fzT, fzFur)')}, fzTex.a);
      `)
      .replace('#include <emissivemap_fragment>', /* glsl */`#include <emissivemap_fragment>
        float fzRim = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.5);
        totalEmissiveRadiance += diffuseColor.rgb * fzRim * 0.55 * fzFur;`);
  };
  m.customProgramCacheKey = () => 'fz-rider-body';
  bodyMats.set(key, m);
  return m;
}
/** the fur colour of the lids: the model's average pink through the same filter (in the shader) */
const LID_PINK = '#ec6a9a';
function lidMaterial(n: number): THREE.MeshStandardMaterial {
  const t = tintOf(n);
  const m = new THREE.MeshStandardMaterial({ color: LID_PINK, roughness: 0.92, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const u = { uCol: { value: t.col }, uRainbow: { value: t.rainbow }, uKeep: { value: t.keep }, uBlink: { value: 0 }, uHappy: { value: 0 }, uWorry: { value: 0 } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'attribute vec4 aEye;\nvarying vec4 vEye;\nvarying vec3 vModel;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvModel = position; vEye = aEye;');
    sh.fragmentShader = GLSL_TINT + 'uniform float uBlink; uniform float uHappy; uniform float uWorry;\nvarying vec4 vEye;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
        float fzSide = sign(vEye.w);
        vec2 q = (vModel.xy - vEye.xy) / vec2(vEye.z, abs(vEye.w));
        // fur: little strands (a hash in thin vertical cells) — they make the lid's edge ragged and its face furry
        vec2 cell = floor(vModel.xy * vec2(170.0, 46.0));
        float strand = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
        if (length(q) > 1.0 + 0.16 * strand) discard;
        float out_ = q.x * fzSide; // +1 at the outer corner
        // closed eyes meet on a soft downward curve a little below the middle; the top lid carries the lashes
        float seam = -0.18 - 0.28 * (1.0 - q.x * q.x);
        float top = mix(1.2, seam, uBlink) - uWorry * (0.62 + 0.42 * out_);
        float bot = mix(-1.2, seam - 0.01, uBlink);
        bot = max(bot, -1.2 + uHappy * (1.55 - 0.75 * q.x * q.x));
        float dTop = q.y - top, dBot = bot - q.y;
        if (dTop < 0.0 && dBot < 0.0) discard;
        vec3 fur = ${toLin(`fzTint(${toSrgb('diffuseColor.rgb')} * (0.86 + 0.2 * strand), vModel)`)};
        float lash = (dTop >= 0.0 ? 1.0 - smoothstep(0.0, 0.14, dTop) : 0.0) * smoothstep(0.05, 0.3, uBlink + uWorry * 0.5);
        float crease = dBot >= 0.0 && dTop < 0.0 ? (1.0 - smoothstep(0.0, 0.18, dBot)) * 0.5 * smoothstep(0.05, 0.4, uHappy) : 0.0;
        float lum = dot(fur, vec3(0.2126, 0.7152, 0.0722));
        vec3 line = lum < 0.04 ? vec3(0.5) : fur * 0.15;
        diffuseColor.rgb = mix(fur, line, max(lash * 0.92, crease));
      `);
  };
  m.customProgramCacheKey = () => 'fz-rider-lid';
  return m;
}

let ballGeo: THREE.BufferGeometry | null = null;
const shadowBall = () => (ballGeo ??= new THREE.IcosahedronGeometry(1, 1));
let shadowMat: THREE.Material | null = null;
/** draws nothing on screen (no colour, no depth) but still casts a shadow */
const SHADOW_ONLY = () => (shadowMat ??= new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));

export interface Rider {
  /** stand it on the seat: origin at the bottom centre, facing +z */
  group: THREE.Group;
  body: THREE.Mesh;
  lids: THREE.Mesh;
  /** eyelids: 0 open … 1 shut; happy 0 … 1 (^ ^); worry 0 … 1 */
  face(blink: number, happy?: number, worry?: number): void;
}
/** A Fuzzy `height` tall in driver `n`'s colour. `ridersReady()` must be true. */
export function makeRider(n: number, height: number, opts: { shadow?: boolean } = {}): Rider {
  if (!src) throw new Error('rider model not loaded');
  const group = new THREE.Group();
  const k = height / src.height;
  const body = new THREE.Mesh(src.geo, bodyMaterial(n));
  const lm = lidMaterial(n);
  const lids = new THREE.Mesh(src.lid, lm);
  for (const m of [body, lids]) { m.scale.setScalar(k); group.add(m); }
  // the shadow comes from a little invisible ball (80 triangles) instead of the 14,600-triangle model — same soft round shadow, a
  // fraction of the work in the shadow pass
  body.castShadow = false; body.receiveShadow = true;
  if (opts.shadow !== false) { const sh = new THREE.Mesh(shadowBall(), SHADOW_ONLY()); sh.scale.set(height * 0.46, height * 0.46, height * 0.42); sh.position.y = height * 0.5; sh.castShadow = true; group.add(sh); }
  lids.receiveShadow = true; lids.visible = false;
  const u = lm.userData.u as Record<string, { value: number }>;
  return { group, body, lids, face(blink, happy = 0, worry = 0) { u.uBlink.value = blink; u.uHappy.value = happy; u.uWorry.value = worry; lids.visible = blink > 0.01 || happy > 0.01 || worry > 0.01; } };
}
