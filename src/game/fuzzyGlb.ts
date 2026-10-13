/**
 * The owner's own 3D Fuzzy (a furry monster ball with big eyes, made from their picture; `public/models/fuzzy.glb`,
 * repacked with a 1024 JPEG fur texture ≈ 1.5 MB). Loaded once, lazily; every Fuzzy that uses it shares the geometry and
 * gets its own colour by hue-shifting the fur texture (the model is pink). It fits the same `FuzzyModel` shape as the
 * procedural Fuzzies (`models3d.makeFuzzy`), so the town, the game and the adventures can use either: the baked face
 * can't blink or look around, so the parts that need expressions (the mascot, the helper) keep the procedural model.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { FuzzyModel } from './models3d';

interface Glb { geo: THREE.BufferGeometry; image: HTMLImageElement | ImageBitmap | HTMLCanvasElement; radius: number; centre: THREE.Vector3 }
let glb: Glb | null = null;
let loading: Promise<Glb | null> | null = null;
const url = () => `${import.meta.env.BASE_URL}models/fuzzy.glb`;

/** Load the model (once). Resolves with null if it can't be loaded — callers fall back to the procedural Fuzzy. */
export function loadFuzzyGlb(): Promise<Glb | null> {
  if (glb) return Promise.resolve(glb);
  if (loading) return loading;
  loading = new GLTFLoader().loadAsync(url()).then((g) => {
    let mesh: THREE.Mesh | null = null;
    g.scene.traverse((o) => { if (!mesh && o instanceof THREE.Mesh) mesh = o; });
    if (!mesh) throw new Error('no mesh');
    const m = mesh as THREE.Mesh;
    const geo = m.geometry.clone();
    geo.computeBoundingSphere();
    const box = new THREE.Box3().setFromBufferAttribute(geo.attributes.position as THREE.BufferAttribute);
    const centre = box.getCenter(new THREE.Vector3());
    // centre it so it scales and squashes about its middle like the procedural ball
    geo.translate(-centre.x, -centre.y, -centre.z);
    const size = box.getSize(new THREE.Vector3());
    const mat = m.material as THREE.MeshStandardMaterial;
    const tex = mat.map;
    const image = tex?.image as HTMLImageElement | ImageBitmap | undefined;
    if (!image) throw new Error('no texture');
    glb = { geo, image, radius: Math.max(size.x, size.y, size.z) / 2, centre };
    return glb;
  }).catch((e) => { console.warn('Fuzzy model unavailable, using the drawn one', e); loading = null; return null; });
  return loading;
}
export const glbReady = (): boolean => !!glb;

// ---------- colours: the model is pink; other Fuzzies get a hue-shifted copy of the fur texture ----------
const BASE_HUE = 339, BASE_SAT = 0.78, BASE_LIGHT = 0.58;
function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
const textures = new WeakMap<object, Map<string, THREE.Texture>>();
/** A fur texture in this Fuzzy's colour (cached per colour and size). */
export function furTexture(skin: [string, string], size = 768): THREE.Texture {
  return tintedFur(glb!.image as CanvasImageSource, skin, size);
}
/** Any pink-fur image (the owner's texture, or the rig's cleaned copy of it) hue-shifted to a Fuzzy's colour; cached per image. */
export function tintedFur(image: CanvasImageSource, skin: [string, string], size = 768): THREE.Texture {
  let per = textures.get(image as object);
  if (!per) { per = new Map(); textures.set(image as object, per); }
  const key = `${skin[0]}|${size}`;
  const hit = per.get(key);
  if (hit) return hit;
  const [h, s, l] = hsl(skin[0]);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;
  const sat = s < 0.08 ? 0 : Math.min(1.8, Math.max(0.3, s / BASE_SAT));
  const bright = Math.min(1.9, Math.max(0.6, l / BASE_LIGHT));
  const rot = s < 0.08 ? 0 : Math.round(h - BASE_HUE);
  try { x.filter = `hue-rotate(${rot}deg) saturate(${sat.toFixed(2)}) brightness(${bright.toFixed(2)})`; } catch { /* old browsers: pink it is */ }
  x.drawImage(image, 0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false; // glTF textures aren't flipped
  t.anisotropy = 2;
  per.set(key, t);
  return t;
}

/**
 * A Fuzzy built from the owner's model, in the shape the rest of the app expects. `r` = the radius it should have
 * (the procedural Fuzzies use 0.2 in town, 0.27 in the game). No eyes/pupils/mouth to animate — those arrays are empty.
 */
export function glbFuzzy(skin: [string, string], r: number, opts: { shadow?: boolean; size?: number } = {}): FuzzyModel {
  if (!glb) throw new Error('Fuzzy model not loaded');
  const group = new THREE.Group();
  const body = new THREE.Group();
  const face = new THREE.Group();
  group.add(body);
  body.add(face);
  const mat = new THREE.MeshStandardMaterial({ map: furTexture(skin, opts.size), roughness: 0.88, metalness: 0 });
  const mesh = new THREE.Mesh(glb.geo, mat);
  const k = r / glb.radius;
  mesh.scale.setScalar(k);
  mesh.castShadow = opts.shadow !== false;
  mesh.receiveShadow = true;
  body.add(mesh);
  face.position.z = r * 0.95;
  return { group, body, face, pupils: [], eyes: [], mouth: null, shells: [], radius: r };
}
