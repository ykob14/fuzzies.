/**
 * Fur finishes for the 50 Fuzzies. Every Fuzzy is the owner's own model (`public/models/fuzzy-rider.glb`, the lighter copy of
 * `fuzzy.glb` made by tools/fuzzy/build-rider.sh — same face, half the triangles) with ONE shared fur texture; the finish is done in the
 * shader, like the Parking Escape drivers (`land/parking/rider3d.ts`):
 *  - only the FUR is changed (found by its saturation, the mouth cavity excluded) — eye whites, pupils, mouth and tongue keep the owner's
 *    painted colours, and patterns (stars, stripes, panels…) are kept off the eyes and the mouth, so the face is never smeared;
 *  - the texture's own light and shade (every strand) is kept and multiplied into the new colour;
 *  - each `FurFx` adds its material: gold is metal, frost and prism glint, ghost is see-through, galaxy/cosmic carry twinkling stars,
 *    neon/eclipse/fire/aurora/storm glow and move (one shared time uniform, `furTime`).
 * Eyelids (blink + wink) are a thin copy of the model's surface over each eye, cut by the shader (same approach as the drivers).
 * One program for every finish (uniforms pick the finish), so browsing 50 Fuzzies never compiles 50 shaders.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { CharacterDef, FurFx } from './characters';

export interface FurSrc { geo: THREE.BufferGeometry; lid: THREE.BufferGeometry; map: THREE.Texture; height: number; width: number }
let src: FurSrc | null = null;
let loading: Promise<boolean> | null = null;
const url = (): string => `${import.meta.env.BASE_URL ?? '/'}models/fuzzy-rider.glb`;

/** the eyes and the mouth on the model (model units: bottom at y = 0, height ≈ 1; measured from the texture — see rider3d.ts) */
export const EYES = [{ x: -0.158, y: 0.516, hx: 0.112, hy: 0.14, side: -1 }, { x: 0.185, y: 0.535, hx: 0.112, hy: 0.143, side: 1 }];
export const MOUTH = { x: 0.013, y: 0.365, hx: 0.19, hy: 0.11 };

/** Load the model once. Resolves false if it can't be loaded (callers fall back to the drawn Fuzzy). */
export function loadFur(): Promise<boolean> {
  if (src) return Promise.resolve(true);
  if (loading) return loading;
  loading = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url()).then((g) => {
    let mesh: THREE.Mesh | null = null;
    g.scene.traverse((o) => { if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh; });
    if (!mesh) throw new Error('no mesh');
    const m = mesh as THREE.Mesh;
    // meshopt keeps positions/normals/uvs as small integers with the scale on the node: back to floats with the node transform applied
    const geo = new THREE.BufferGeometry();
    for (const [name, a] of Object.entries(m.geometry.attributes) as [string, THREE.BufferAttribute][]) {
      const f = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) f[i * a.itemSize + c] = a.getComponent(i, c);
      geo.setAttribute(name, new THREE.BufferAttribute(f, a.itemSize));
    }
    if (m.geometry.index) geo.setIndex(Array.from(m.geometry.index.array as ArrayLike<number>));
    m.updateWorldMatrix(true, false);
    geo.applyMatrix4(m.matrixWorld);
    if (geo.attributes.normal) geo.normalizeNormals(); else geo.computeVertexNormals();
    const box = new THREE.Box3().setFromBufferAttribute(geo.attributes.position as THREE.BufferAttribute);
    geo.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    geo.computeBoundingSphere();
    const map = (m.material as THREE.MeshStandardMaterial).map;
    if (!map) throw new Error('no texture');
    map.anisotropy = 4;
    src = { geo, lid: lidGeometry(geo), map, height: box.max.y - box.min.y, width: box.max.x - box.min.x };
    loading = null;
    return true;
  }).catch((e) => { console.warn('Fuzzy model unavailable, using the drawn one', e); loading = null; return false; });
  return loading;
}
export const furReady = (): boolean => !!src;
export const furSrc = (): FurSrc | null => src;

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
      E.push(e.x, e.y, e.hx, e.hy * e.side);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('aEye', new THREE.Float32BufferAttribute(E, 4));
  g.computeBoundingSphere();
  return g;
}

// ---------- finishes ----------
export const FX_ID: Record<FurFx, number> = { plain: 0, gold: 1, ghost: 2, galaxy: 3, rainbow: 4, neon: 5, frost: 6, fire: 7, prism: 8, cosmic: 9, aurora: 10, eclipse: 11, bone: 12, robot: 13, storm: 14, stripes: 15 };
/** time for every animated finish and accessory (the showroom / game loop sets it each frame) */
export const furTime = { value: 0 };
export const tickFur = (t: number): void => { furTime.value = t; };

const GLSL = /* glsl */`
uniform vec3 uC0; uniform vec3 uC1; uniform float uFx; uniform float uTime; uniform float uLocked; uniform vec3 uRim;
varying vec3 vModel;
float fzH(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float fzN(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(fzH(i), fzH(i + vec3(1, 0, 0)), f.x), mix(fzH(i + vec3(0, 1, 0)), fzH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(fzH(i + vec3(0, 0, 1)), fzH(i + vec3(1, 0, 1)), f.x), mix(fzH(i + vec3(0, 1, 1)), fzH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fzF(vec3 p) { return (0.5 * fzN(p) + 0.25 * fzN(p * 2.03 + 3.1) + 0.125 * fzN(p * 4.01 + 7.7)) / 0.875; }
vec3 fzHue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
/** twinkling points on the surface: k = density, s = size */
float fzStars(vec3 p, float k, float s, float t) {
  vec3 q = p * k, id = floor(q), f = fract(q) - 0.5;
  float h = fzH(id);
  vec3 o = (vec3(fzH(id + 1.3), fzH(id + 2.7), fzH(id + 5.1)) - 0.5) * 0.55;
  float d = length(f - o);
  return smoothstep(s, 0.0, d) * step(0.55, h) * (0.55 + 0.45 * sin(t * (2.0 + 3.0 * h) + h * 40.0));
}
float fzLuma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;
const toSrgb = (c: string) => `pow(max(${c}, vec3(0.0)), vec3(1.0 / 2.2))`;
const toLin = (c: string) => `pow(max(${c}, vec3(0.0)), vec3(2.2))`;

/** the finish itself (sRGB maths). In: fzS (texel), y, ang, fres, sh (strand shade), pat (1 = patterns allowed). Out: col, glow, rough, metal, alpha. */
const FINISH = /* glsl */`
  vec3 c0 = uC0, c1 = uC1;
  vec3 col = c0; vec3 glow = vec3(0.0); float rough = 0.86, metal = 0.0, alpha = 1.0;
  vec3 P = vModel; float t = uTime;
  float low = 1.0 - smoothstep(0.05, 0.85, y);
  if (uFx < 0.5) { // plain: the light colour, deepening towards the bottom
    col = mix(c0, c1, 0.42 * low);
  } else if (uFx < 1.5) { // gold: real metal, warm lows, little glints that come and go
    col = mix(c0, c1, 0.25 + 0.55 * low) * 1.05; metal = 0.85; rough = 0.34;
    glow = vec3(1.0, 0.92, 0.6) * fzStars(P, 26.0, 0.12, t) * pat * 1.6;
  } else if (uFx < 2.5) { // ghost: pale and see-through, a cool glow round the edge
    col = mix(c0, vec3(1.0), 0.2); alpha = mix(0.8, 0.35, fres); rough = 0.5;
    glow = c1 * (0.2 + fres * 1.2) + vec3(0.9, 0.97, 1.0) * fzStars(P, 16.0, 0.14, t) * pat * 0.6;
  } else if (uFx < 3.5) { // galaxy: deep space with drifting nebula clouds and stars
    float n = fzF(P * 3.2 + vec3(0.0, t * 0.04, 0.0));
    col = mix(c1 * 0.75, c0, smoothstep(0.35, 0.85, n) * 0.85);
    glow = vec3(1.0) * (fzStars(P, 22.0, 0.14, t) + fzStars(P + 7.0, 40.0, 0.1, t * 1.3) * 0.7) * pat * 1.4 + c0 * smoothstep(0.6, 0.95, n) * 0.18;
    rough = 0.6;
  } else if (uFx < 4.5) { // rainbow: soft pastel bands that slowly flow round the body
    float hue = fract(y * 0.85 + ang * 0.08 - t * 0.03);
    col = mix(mix(vec3(1.0), fzHue(hue), 0.62), c0, 0.12);
    glow = fzHue(hue) * 0.06;
  } else if (uFx < 5.5) { // neon: deep colour with a bright glowing edge and little lights twinkling in the fur
    col = mix(c1 * 0.7, c0 * 0.85, 0.35 + 0.3 * smoothstep(0.2, 0.9, y)); rough = 0.38;
    glow = c0 * (pow(fres, 1.4) * 1.2 + fzStars(P, 18.0, 0.16, t * 1.4) * pat * 1.3) + c1 * 0.06;
  } else if (uFx < 6.5) { // frost: icy and pale, sparkling crystals and a cold edge light
    float n = fzF(P * 9.0);
    col = mix(c0, vec3(1.0), 0.2 + 0.45 * smoothstep(0.45, 0.8, n)) ; col = mix(col, c1, 0.35 * low); rough = 0.42;
    glow = vec3(0.85, 0.95, 1.0) * fzStars(P, 34.0, 0.11, t * 1.5) * pat * 1.3 + c1 * fres * 0.25;
  } else if (uFx < 7.5) { // fire: the Fuzzy's own colours with embers glowing up from below
    col = mix(c0, c1, 0.5 * low);
    float f = fzF(vec3(P.x * 5.0, P.y * 3.0 - t * 0.9, P.z * 5.0));
    float flame = smoothstep(0.42, 0.9, f + low * 0.55 - 0.15) ;
    glow = mix(vec3(1.0, 0.28, 0.02), vec3(1.0, 0.82, 0.25), f) * flame * pat * 0.95 + vec3(1.0, 0.45, 0.1) * pow(fres, 2.0) * 0.35;
  } else if (uFx < 8.5) { // prism: pale crystal fur, rainbow colour that changes as it turns, glints
    float h2 = fract(fres * 1.4 + y * 0.6 + ang * 0.12 + t * 0.02);
    col = mix(c0, mix(vec3(1.0), fzHue(h2), 0.55), 0.6); metal = 0.25; rough = 0.3;
    glow = fzHue(h2) * fres * 0.45 + vec3(1.0) * fzStars(P, 30.0, 0.13, t * 2.0) * pat * 1.5;
  } else if (uFx < 9.5) { // cosmic: a swirling nebula that moves, with many stars
    float sw = fzF(vec3(P.x * 2.5 + sin(t * 0.2 + P.y * 3.0) * 0.4, P.y * 2.5 - t * 0.05, P.z * 2.5));
    vec3 neb = mix(c0, vec3(1.0, 0.4, 0.75), smoothstep(0.5, 0.9, sw));
    col = mix(c1 * 0.6, neb, smoothstep(0.3, 0.8, sw)); rough = 0.55;
    glow = neb * smoothstep(0.55, 0.95, sw) * 0.35 + vec3(1.0) * (fzStars(P, 24.0, 0.15, t) + fzStars(P + 3.0, 46.0, 0.1, t * 1.7)) * pat * 1.5;
  } else if (uFx < 10.5) { // aurora: curtains of green, blue and pink light flowing round the body
    float w = sin(ang * 3.0 + y * 7.0 - t * 0.8) * 0.5 + 0.5;
    float w2 = sin(ang * 5.0 - y * 4.0 + t * 0.6) * 0.5 + 0.5;
    vec3 aur = mix(c0, c1, w); aur = mix(aur, vec3(1.0, 0.5, 0.85), w2 * 0.35);
    col = mix(vec3(0.08, 0.1, 0.22), aur, 0.55 + 0.35 * w);
    glow = aur * (0.25 + 0.4 * smoothstep(0.6, 1.0, w * w2 + 0.3)) * mix(0.6, 1.0, pat);
  } else if (uFx < 11.5) { // eclipse: a dark body with a burning ring of light round its edge
    vec3 dark = fzLuma(c0) < fzLuma(c1) ? c0 : c1, light = fzLuma(c0) < fzLuma(c1) ? c1 : c0;
    col = dark * 0.9 + 0.03; rough = 0.55;
    float flick = 0.85 + 0.15 * sin(t * 3.0 + ang * 6.0);
    glow = light * (pow(fres, 1.6) * 1.6 * flick + fzStars(P, 20.0, 0.12, t) * pat * 0.8);
  } else if (uFx < 12.5) { // bone: matte ivory with soft darker shading
    col = mix(c0, c1, 0.3 * low + 0.25 * smoothstep(0.55, 0.8, fzF(P * 6.0))); rough = 0.95;
  } else if (uFx < 13.5) { // robot: brushed metal with a few clean panel seams and rivets
    float lat = abs(fract(y * 3.0 + 0.15) - 0.5);
    float seam = smoothstep(0.47, 0.5, lat) * pat;
    float riv = smoothstep(0.045, 0.02, length(vec2(fract(ang * 2.546) - 0.5, (fract(y * 3.0 + 0.15) - 0.5) * 3.0) - vec2(0.0, 1.38))) * pat;
    float brush = 0.94 + 0.06 * fzN(vec3(P.x * 60.0, P.y * 4.0, P.z * 60.0));
    col = mix(c0, c1, 0.35 * low) * brush * (1.0 - seam * 0.5); metal = 0.72; rough = 0.36;
    col = mix(col, vec3(0.9), riv * 0.6);
  } else if (uFx < 14.5) { // storm: rolling clouds and flashes of lightning
    float cl = fzF(P * 4.0 + vec3(t * 0.08, 0.0, 0.0));
    col = mix(c1 * 0.75, mix(c1, vec3(0.75, 0.78, 0.9), 0.5), smoothstep(0.4, 0.8, cl)); rough = 0.7;
    float flash = pow(max(0.0, sin(t * 1.7) * sin(t * 4.3 + 1.0)), 6.0);
    float bolt = smoothstep(0.035, 0.0, abs(fzN(P * 6.0 + floor(t * 1.7)) - 0.5));
    glow = c0 * (bolt * (0.35 + flash * 2.5) * pat + flash * 0.25);
  } else { // stripes: soft fur stripes in the darker colour
    float s = sin((y + 0.06 * fzN(P * 6.0)) * 3.14159 * 7.0);
    float band = smoothstep(-0.15, 0.25, s) * pat;
    col = mix(c0, c1 * 0.6, band);
  }
`;

interface FinishUniforms { uC0: { value: THREE.Color }; uC1: { value: THREE.Color }; uFx: { value: number }; uTime: typeof furTime; uLocked: { value: number }; uRim: { value: THREE.Color } }
const srgb = (hex: string): THREE.Color => { const c = new THREE.Color(); c.setStyle(hex, THREE.NoColorSpace); return c; };

/** material settings that the shader can't change (transparency, emissive base…) */
function patchFur(m: THREE.MeshStandardMaterial, u: FinishUniforms): void {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vModel;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvModel = position;');
    sh.fragmentShader = GLSL + sh.fragmentShader
      .replace('#include <map_fragment>', /* glsl */`
        vec4 fzTex = texture2D(map, vMapUv);
        vec3 fzS = ${toSrgb('fzTex.rgb')};
        float fzMax = max(fzS.r, max(fzS.g, fzS.b)), fzMin = min(fzS.r, min(fzS.g, fzS.b));
        float fzFur = smoothstep(0.1, 0.28, (fzMax - fzMin) / max(fzMax, 0.001)) * smoothstep(0.12, 0.3, fzMax);
        vec2 fzM = (vModel.xy - vec2(${MOUTH.x}, ${MOUTH.y})) / vec2(${MOUTH.hx}, ${MOUTH.hy});
        float fzDeep = 1.0 - smoothstep(0.37, 0.40, length(vModel - vec3(0.0, 0.5, 0.0)));
        fzFur *= 1.0 - fzDeep * (1.0 - smoothstep(0.95, 1.15, length(fzM))) * step(0.12, vModel.z);
        // the tongue's tip sits forward of the cavity: the core of the mouth is never fur
        fzFur *= 1.0 - (1.0 - smoothstep(0.52, 0.68, length(fzM * vec2(1.0, 0.74)))) * (1.0 - smoothstep(-0.05, 0.3, fzM.y)) * step(0.12, vModel.z);
        fzFur = clamp(fzFur, 0.0, 1.0);
        // the eyes and the mouth: patterns (stars, stripes, seams…) never go there
        float fzFront = step(0.1, vModel.z);
        float fzEye = 0.0;
        ${EYES.map((e) => `fzEye = max(fzEye, (1.0 - smoothstep(1.05, 1.3, length((vModel.xy - vec2(${e.x}, ${e.y})) / vec2(${e.hx}, ${e.hy})))) * fzFront);`).join('\n        ')}
        float fzMouthM = (1.0 - smoothstep(1.0, 1.3, length(fzM))) * fzFront;
        float pat = 1.0 - max(fzEye, fzMouthM);
        float y = clamp(vModel.y, 0.0, 1.0);
        float ang = atan(vModel.z, vModel.x);
        float fres = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.0);
        float sh = pow(fzLuma(fzS) / 0.5, 1.15);
        ${FINISH}
        vec3 fzOut = clamp(col * sh, 0.0, 1.0);
        float fzRough = rough, fzMetal = metal;
        vec3 fzGlow = glow * fzFur;
        // locked: a dark silhouette with the rarity colour round the edge (the face too — it's a mystery)
        fzOut = mix(fzOut, vec3(0.05, 0.05, 0.07), uLocked); fzFur = mix(fzFur, 1.0, uLocked);
        fzGlow = mix(fzGlow, uRim * pow(fres, 1.4) * 1.6, uLocked);
        diffuseColor *= vec4(${toLin('mix(fzS, fzOut, fzFur)')}, mix(1.0, alpha, fzFur * (1.0 - uLocked)) * fzTex.a);
      `)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, fzRough, fzFur);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, fzMetal, fzFur * (1.0 - uLocked));')
      .replace('#include <emissivemap_fragment>', /* glsl */`#include <emissivemap_fragment>
        totalEmissiveRadiance += ${toLin('fzGlow')};
        // a soft rim of light on the fur so the ball reads against any background
        float fzRim = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.5);
        totalEmissiveRadiance += diffuseColor.rgb * fzRim * 0.45 * fzFur * (1.0 - uLocked);`);
  };
  m.customProgramCacheKey = () => 'fz-char-fur';
}

export interface FurLook { c0: string; c1: string; fx: FurFx }
export const lookOf = (d: Pick<CharacterDef, 'color' | 'fx'>): FurLook => ({ c0: d.color[0], c1: d.color[1], fx: d.fx });

/** A fresh fur material (one per rig: the locked silhouette and the rim colour are per rig). `furReady()` must be true. */
export function furMaterial(look: FurLook): THREE.MeshStandardMaterial {
  if (!src) throw new Error('fur model not loaded');
  const u: FinishUniforms = { uC0: { value: srgb(look.c0) }, uC1: { value: srgb(look.c1) }, uFx: { value: FX_ID[look.fx] ?? 0 }, uTime: furTime, uLocked: { value: 0 }, uRim: { value: srgb('#ffffff') } };
  const m = new THREE.MeshStandardMaterial({ map: src.map, roughness: 0.86, metalness: 0, transparent: look.fx === 'ghost', depthWrite: true });
  m.userData.u = u;
  patchFur(m, u);
  return m;
}
/** turn a fur material into the locked silhouette (or back) */
export function setLocked(m: THREE.Material, locked: boolean, rim: string): void {
  const u = m.userData.u as FinishUniforms | undefined;
  if (!u) return;
  u.uLocked.value = locked ? 1 : 0;
  u.uRim.value = srgb(rim);
  const ghost = u.uFx.value === FX_ID.ghost;
  (m as THREE.MeshStandardMaterial).transparent = ghost && !locked;
  m.needsUpdate = false;
}

/** the colour the eyelids take for a finish (the fur round the eyes) */
export function lidColor(look: FurLook): string {
  const dark = ['galaxy', 'cosmic', 'eclipse', 'storm', 'neon'].includes(look.fx);
  if (look.fx === 'eclipse') { const a = new THREE.Color(look.c0), b = new THREE.Color(look.c1); return a.getHSL({ h: 0, s: 0, l: 0 }).l < b.getHSL({ h: 0, s: 0, l: 0 }).l ? look.c0 : look.c1; }
  if (look.fx === 'rainbow') return '#f6d9ef';
  if (dark) return '#' + new THREE.Color(look.c1).lerp(new THREE.Color(look.c0), 0.35).getHexString();
  return look.c0;
}
/** eyelid material: blinkL / blinkR 0 open … 1 shut (a wink is one side) */
export function lidMaterial(look: FurLook): THREE.MeshStandardMaterial {
  const col = srgb(lidColor(look));
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const u = { uCol: { value: col }, uL: { value: 0 }, uR: { value: 0 } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'attribute vec4 aEye;\nvarying vec4 vEye;\nvarying vec3 vModel;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvModel = position; vEye = aEye;');
    sh.fragmentShader = 'uniform vec3 uCol; uniform float uL; uniform float uR;\nvarying vec4 vEye;\nvarying vec3 vModel;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
        float fzSide = sign(vEye.w);
        float blink = fzSide < 0.0 ? uL : uR;
        if (blink < 0.01) discard;
        vec2 q = (vModel.xy - vEye.xy) / vec2(vEye.z, abs(vEye.w));
        vec2 cell = floor(vModel.xy * vec2(170.0, 46.0));
        float strand = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
        if (length(q) > 1.0 + 0.16 * strand) discard;
        float seam = -0.18 - 0.28 * (1.0 - q.x * q.x);
        float top = mix(1.2, seam, blink);
        float bot = mix(-1.2, seam - 0.01, blink);
        float dTop = q.y - top, dBot = bot - q.y;
        if (dTop < 0.0 && dBot < 0.0) discard;
        vec3 fur = pow(uCol * (0.82 + 0.22 * strand), vec3(2.2));
        float lash = (dTop >= 0.0 ? 1.0 - smoothstep(0.0, 0.14, dTop) : 0.0) * smoothstep(0.05, 0.3, blink);
        float lum = dot(fur, vec3(0.2126, 0.7152, 0.0722));
        vec3 line = lum < 0.04 ? vec3(0.5) : fur * 0.15;
        diffuseColor.rgb = mix(fur, line, lash * 0.92);
      `);
  };
  m.customProgramCacheKey = () => 'fz-char-lid';
  return m;
}
export function setBlink(m: THREE.Material, left: number, right: number): void {
  const u = m.userData.u as { uL: { value: number }; uR: { value: number } } | undefined;
  if (!u) return;
  u.uL.value = left; u.uR.value = right;
}

/** a silhouette material for accessories of a locked Fuzzy: dark, with the rarity colour round the edge */
export function silhouetteMaterial(rim: string): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.7, metalness: 0 });
  const u = { uRim: { value: srgb(rim) } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', /* glsl */`#include <emissivemap_fragment>
      float fzR = pow(1.0 - clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 1.4);
      totalEmissiveRadiance += pow(uRim, vec3(2.2)) * fzR * 1.6;`);
  };
  m.customProgramCacheKey = () => 'fz-silhouette';
  return m;
}
