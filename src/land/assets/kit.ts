/**
 * The Fuzzies Land model library: art kits built offline (tools/assets — Blender + gltf-transform) and shipped as meshopt-
 * compressed GLBs with WebP textures in public/models/kits/<kit>.glb (computers) and <kit>.m.glb (phones, half-size textures).
 * Every model in a kit is a named root node with its pivot on the ground, so a scene asks for models by name:
 *
 *   const kit = await loadKit('orchard', mobile)        // fetched once per session, shared by every scene that uses it
 *   const tree = kit.clone('tree_apple_1')               // a copy that shares geometry + materials (cheap)
 *   kit.scatter('grass_short', spots, { shadow: false }) // one InstancedMesh per material for many copies (one draw call each)
 *   kit.names                                            // what the kit holds
 *
 * Kits never mutate their originals; `clone` copies only the node tree. Materials are tuned once on load (alpha-tested leaves
 * double-sided, shadows on). Third-party models: public/licenses/3d-assets.md.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface Kit {
  readonly name: string;
  readonly names: string[];
  readonly animations: THREE.AnimationClip[];
  has(name: string): boolean;
  /** a copy of a named model (shares geometry and materials; skinned models get their own skeleton) */
  clone(name: string, opts?: { shadow?: boolean; receive?: boolean }): THREE.Object3D;
  /** many copies of one model as instanced meshes: spots in the parent's space, rotation about y, uniform scale */
  scatter(name: string, spots: { x: number; y?: number; z: number; rot?: number; s?: number }[], opts?: { shadow?: boolean; receive?: boolean }): THREE.Group;
  /** the bounding box of a named model (its own space) */
  size(name: string): THREE.Box3;
}

const kits = new Map<string, Promise<Kit>>();
let loader: GLTFLoader | null = null;
const getLoader = () => (loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder));

/** The URL of a kit for this device. */
export const kitUrl = (name: string, mobile: boolean) => `${import.meta.env.BASE_URL}models/kits/${name}${mobile ? '.m' : ''}.glb`;

/** Load a kit (once per session and device class). Rejects if the file can't be loaded — callers keep their fallback art. */
export function loadKit(name: string, mobile: boolean): Promise<Kit> {
  const key = `${name}|${mobile}`;
  const hit = kits.get(key);
  if (hit) return hit;
  const p = getLoader().loadAsync(kitUrl(name, mobile)).then((g) => makeKit(name, g.scene, g.animations));
  p.catch(() => kits.delete(key));
  kits.set(key, p);
  return p;
}

/** Start fetching a kit early (e.g. while an intro card is showing). */
export function preloadKit(name: string, mobile: boolean): void { void loadKit(name, mobile).catch(() => { /* the scene will retry */ }); }

function tune(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats as THREE.MeshStandardMaterial[]) {
      if (mat.userData.tuned) continue;
      mat.userData.tuned = true;
      // foliage cards: alpha-tested, both sides lit, no sorting cost
      if (mat.map && (mat.alphaTest > 0 || mat.transparent) && /leaf|leaves|grass|flower|fern|clover|plant|vine|pine/i.test(mat.name)) {
        mat.transparent = false; mat.alphaTest = Math.max(0.4, mat.alphaTest); mat.side = THREE.DoubleSide; mat.depthWrite = true;
      }
      if (mat.map) mat.map.anisotropy = 4;
      mat.envMapIntensity = 0.6;
    }
  });
}

function makeKit(name: string, scene: THREE.Group, animations: THREE.AnimationClip[]): Kit {
  tune(scene);
  const byName = new Map<string, THREE.Object3D>();
  for (const c of scene.children) byName.set(c.name, c);
  const boxes = new Map<string, THREE.Box3>();
  const get = (n: string) => {
    const o = byName.get(n);
    if (!o) throw new Error(`kit "${name}" has no model "${n}"`);
    return o;
  };
  const kit: Kit & { _src: (n: string) => THREE.Object3D | undefined } = {
    _src: (n) => byName.get(n),
    name,
    names: [...byName.keys()],
    animations,
    has: (n) => byName.has(n),
    clone(n, opts = {}) {
      const src = get(n);
      let skinned = false;
      src.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true; });
      const c = skinned ? skeletonClone(src) : src.clone(true);
      c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.scale.set(1, 1, 1);
      c.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = opts.shadow ?? true; o.receiveShadow = opts.receive ?? true; } });
      return c;
    },
    scatter(n, spots, opts = {}) {
      const src = get(n);
      const g = new THREE.Group(); g.name = `${n}×${spots.length}`;
      src.updateMatrixWorld(true);
      const rootInv = new THREE.Matrix4().copy(src.matrixWorld).invert();
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      src.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const local = new THREE.Matrix4().multiplyMatrices(rootInv, mesh.matrixWorld); // the mesh inside its model
        const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, spots.length);
        spots.forEach((sp, i) => {
          q.setFromAxisAngle(up, sp.rot ?? 0); const k = sp.s ?? 1; s.set(k, k, k); p.set(sp.x, sp.y ?? 0, sp.z);
          m.compose(p, q, s).multiply(local); im.setMatrixAt(i, m);
        });
        im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
        im.castShadow = opts.shadow ?? false; im.receiveShadow = opts.receive ?? true;
        g.add(im);
      });
      return g;
    },
    size(n) {
      let b = boxes.get(n);
      if (!b) { const o = get(n); b = new THREE.Box3().setFromObject(o); b.min.sub(o.position); b.max.sub(o.position); boxes.set(n, b); }
      return b.clone();
    },
  };
  return kit;
}

/** Free a kit's GPU memory (geometry, materials, textures) when no scene uses it any more; the next loadKit fetches it again
 * (from the browser cache). Scenes call it on leaving so phones don't keep every game's art resident. */
export function releaseKit(name: string, mobile: boolean): void {
  const key = `${name}|${mobile}`;
  const p = kits.get(key);
  if (!p) return;
  kits.delete(key);
  void p.then((k) => {
    const seen = new Set<unknown>();
    for (const n of k.names) {
      (k as unknown as { _src?: (n: string) => THREE.Object3D })._src?.(n)?.traverse((o) => {
        const m = o as THREE.Mesh; if (!m.isMesh) return;
        if (!seen.has(m.geometry)) { seen.add(m.geometry); m.geometry.dispose(); }
        for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) {
          if (seen.has(mat)) continue; seen.add(mat);
          for (const t of [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap, mat.emissiveMap]) if (t && !seen.has(t)) { seen.add(t); t.dispose(); }
          mat.dispose();
        }
      });
    }
  }).catch(() => { /* never loaded */ });
}
