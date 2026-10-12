/**
 * Renders the website mascot with the same furry 3D model as Fuzzy Crossing, in a little photo studio,
 * once per face (eyes open, wink, blink). The frames are plain PNG images, so the logo can be animated
 * cheaply with CSS everywhere without keeping a WebGL context alive.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as M from './models3d';
import { furStrands } from './textures3d';

export type Face = 'open' | 'wink' | 'blink' | 'giggle';
export type Frames = Record<Face, string>;

/** One expression: which eyes are shut, how wide the smile is, where the pupils look, head tilt/turn, how wide the eyes open. */
interface Expression { eyes: 'open' | 'wink' | 'shut'; grin: [number, number]; tilt?: number; turn?: number; look?: [number, number]; wide?: number }
const EXPRESSIONS: Record<Face, Expression> = {
  open: { eyes: 'open', grin: [1.5, 1.4] },
  wink: { eyes: 'wink', grin: [1.9, 1.8], tilt: -0.16, turn: -0.05 },
  blink: { eyes: 'shut', grin: [1.5, 1.4] },
  giggle: { eyes: 'shut', grin: [2.3, 2.4], tilt: 0.1 },
};

/**
 * Photograph one furry Fuzzy in a little studio, once per expression, as transparent PNGs. `rim` is the back light's colour
 * (pink for the brand mascot, sky-blue for the assistant).
 */
interface StudioOpts { rim?: number; r?: number; fur?: number; shells?: number; faceLift?: number; eyeScale?: number; strands?: [number, number] }
async function studio<K extends string>(colors: [string, string], size: number, faces: Record<K, Expression>, opts: StudioOpts = {}): Promise<Record<K, string>> {
  const { rim = 0xffc4f0, r = 0.27, fur = 0.12, shells = 32, faceLift = 0.012, eyeScale = 1, strands = [10, 5] } = opts;
  const SS = 2; // supersample, then scale down for silky fur edges
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  try {
    renderer.setPixelRatio(1);
    renderer.setSize(size * SS, size * SS, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.3;
    const key = new THREE.DirectionalLight(0xfff4ea, 2.1);
    key.position.set(-1.2, 2, 2.2);
    const back = new THREE.DirectionalLight(rim, opts.strands ? 3.2 : 2.2);
    back.position.set(1.6, 1.2, -1.8);
    const fill = new THREE.HemisphereLight(0xd8e4ff, 0x3a2050, 0.45);
    scene.add(key, back, fill);

    const mats = { fur: furStrands(strands, opts.strands ? 0.55 : 0.7) } as unknown as M.Mats;
    const fz = M.makeFuzzy(mats, colors, r, fur, shells); // fluffier than in the game: it's a close-up
    fz.mouth?.position.add(new THREE.Vector3(0, -0.01, 0.022));
    fz.face.position.z += faceLift; // the face sits on top of the (longer) fur
    scene.add(fz.group);
    const pupilHome = fz.pupils.map((p) => p.position.clone());

    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
    const fit = (r + fur) / 0.39; // keep the Fuzzy the same size in the picture whatever its fur length
    camera.position.set(0, 0.12 * fit, 2.0 * fit);
    camera.lookAt(0, 0.0, 0);

    const out = document.createElement('canvas');
    out.width = out.height = size;
    const ox = out.getContext('2d')!;
    ox.imageSmoothingQuality = 'high';

    const shoot = (x: Expression): string => {
      fz.eyes.forEach((e, i) => {
        // closed eyes are drawn as happy "^" arcs: one for the wink, both for a blink
        const happy = x.eyes === 'shut' || (x.eyes === 'wink' && i === 1);
        e.open.visible = !happy;
        e.lid.visible = happy;
        e.open.scale.setScalar((x.wide ?? 1) * eyeScale);
        e.lid.scale.setScalar(eyeScale);
      });
      fz.pupils.forEach((p, i) => p.position.set(pupilHome[i].x + (x.look?.[0] ?? 0), pupilHome[i].y + (x.look?.[1] ?? 0), pupilHome[i].z));
      if (fz.mouth) fz.mouth.scale.set(x.grin[0], x.grin[1], 1.2);
      fz.body.rotation.z = x.tilt ?? 0;
      fz.face.rotation.y = x.turn ?? 0;
      renderer.render(scene, camera);
      ox.clearRect(0, 0, size, size);
      ox.drawImage(canvas, 0, 0, size, size);
      return out.toDataURL('image/png');
    };
    const frames = {} as Record<K, string>;
    for (const k of Object.keys(faces) as K[]) frames[k] = shoot(faces[k]);
    env.dispose();
    pmrem.dispose();
    scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    return frames;
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
}

export function renderMascotFrames(colors: [string, string] = ['#ff86bb', '#b8235f'], size = 320): Promise<Frames> {
  return studio(colors, size, EXPRESSIONS);
}

/** The Fuzzy assistant's expressions: the brand mascot's four plus talking, thinking and listening faces. */
export type AssistFace = Face | 'talkA' | 'talkB' | 'think' | 'listen';
export type AssistFrames = Record<AssistFace, string>;
export const ASSIST_COLORS: [string, string] = ['#b4e4ff', '#4a8fdc'];
export function renderAssistantFrames(size = 320): Promise<AssistFrames> {
  const faces: Record<AssistFace, Expression> = {
    ...EXPRESSIONS,
    talkA: { eyes: 'open', grin: [2.1, 2.9], tilt: 0.03 },
    talkB: { eyes: 'open', grin: [1.3, 1.1], tilt: -0.03 },
    think: { eyes: 'open', grin: [1.1, 0.9], tilt: 0.12, turn: 0.1, look: [0.012, 0.016] },
    listen: { eyes: 'open', grin: [1.4, 1.2], tilt: -0.1, wide: 1.12, look: [0, 0.004] },
  };
  // extra-long fur in many layers = the big puffball look of the reference picture
  return studio(ASSIST_COLORS, size, faces, { rim: 0xdff0ff, r: 0.22, fur: 0.32, shells: 64, faceLift: 0.1, eyeScale: 1.35, strands: [6, 3] });
}

// ---------- 3D pictures for the shop and the gift box (rendered once, on demand) ----------
export interface Art { piles: string[]; giftBody: string; giftLid: string }

const PINKS: [string, string][] = [['#ff86bb', '#b8235f'], ['#ffa6cc', '#cc477f'], ['#ff6fa8', '#9c1a50'], ['#ffb8d6', '#d65a8e'], ['#ff7db3', '#ad2059']];

/**
 * Studio renders that match the game: piles of 1–4 extra-fluffy Fuzzies for the Fuzzies packs, and a glossy wrapped
 * gift box (body and lid as separate pictures, so the lid can fly off). Transparent PNGs, supersampled for soft fur.
 */
export async function renderArt(size = 320): Promise<Art> {
  const SS = 2;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  try {
    renderer.setPixelRatio(1);
    renderer.setSize(size * SS, size * SS, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.35;
    const key = new THREE.DirectionalLight(0xfff4ea, 2.2);
    key.position.set(-1.2, 2, 2.2);
    const rim = new THREE.DirectionalLight(0xffc4f0, 2.3);
    rim.position.set(1.6, 1.2, -1.8);
    scene.add(key, rim, new THREE.HemisphereLight(0xd8e4ff, 0x3a2050, 0.5));
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 30);
    const out = document.createElement('canvas');
    out.width = out.height = size;
    const ox = out.getContext('2d')!;
    ox.imageSmoothingQuality = 'high';
    const shoot = () => { renderer.render(scene, camera); ox.clearRect(0, 0, size, size); ox.drawImage(canvas, 0, 0, size, size); return out.toDataURL('image/png'); };
    const look = (x: number, y: number, z: number, ty = 0) => { camera.position.set(x, y, z); camera.lookAt(0, ty, 0); };

    // --- piles of extra-fluffy Fuzzies (longer fur, more layers than the game uses) ---
    const mats = { fur: furStrands() } as unknown as M.Mats;
    const fuzzy = (i: number, r: number, face: 'open' | 'wink' | 'happy' = 'open') => {
      const f = M.makeFuzzy(mats, PINKS[i % PINKS.length], r, r * 0.4, 34);
      f.face.position.z += r * 0.05;
      f.mouth?.position.add(new THREE.Vector3(0, -0.006, r * 0.06));
      f.eyes.forEach((e, k) => { const shut = face === 'happy' || (face === 'wink' && k === 1); e.open.visible = !shut; e.lid.visible = shut; });
      if (f.mouth) f.mouth.scale.set(face === 'open' ? 1.6 : 2, face === 'open' ? 1.5 : 1.9, 1.2);
      return f;
    };
    const layouts: [number, number, number, number, number, 'open' | 'wink' | 'happy'][][] = [
      [[0, 0, 0, 0.27, 0, 'open']],
      [[-0.2, -0.02, 0, 0.25, 0.18, 'open'], [0.21, -0.04, 0.05, 0.23, -0.2, 'wink']],
      [[-0.24, -0.08, 0.02, 0.23, 0.2, 'open'], [0.24, -0.09, 0.03, 0.22, -0.2, 'happy'], [0.0, 0.25, -0.05, 0.22, 0.05, 'wink']],
      [[-0.32, -0.12, 0.06, 0.2, 0.25, 'happy'], [0.0, -0.13, 0.12, 0.21, 0, 'open'], [0.32, -0.12, 0.05, 0.2, -0.25, 'wink'], [-0.15, 0.2, -0.05, 0.2, 0.12, 'open'], [0.17, 0.21, -0.06, 0.19, -0.12, 'happy']],
    ];
    const piles: string[] = [];
    layouts.forEach((l) => {
      const group = new THREE.Group();
      l.forEach(([x, y, z, r, ry, face], i) => { const f = fuzzy(i + piles.length, r, face); f.group.position.set(x, y, z); f.group.rotation.y = ry; f.body.rotation.z = -ry * 0.25; group.add(f.group); });
      scene.add(group);
      const far = l.length === 1 ? 2.0 : l.length === 2 ? 2.55 : l.length === 3 ? 2.75 : 3.0;
      look(0, 0.18, far, l.length > 2 ? 0.03 : 0);
      piles.push(shoot());
      scene.remove(group);
      group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    });

    // --- a glossy wrapped present ---
    const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js');
    const paper = new THREE.MeshPhysicalMaterial({ color: 0xd6336c, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: new THREE.Color(0xff9fc4) });
    const ribbon = new THREE.MeshPhysicalMaterial({ color: 0xf6c24a, roughness: 0.3, metalness: 0.35, clearcoat: 0.8, sheen: 0.6, sheenColor: new THREE.Color(0xfff1b8) });
    const body = new THREE.Group();
    body.add(new THREE.Mesh(new RoundedBoxGeometry(1, 0.78, 1, 6, 0.05), paper));
    const band = (w: number, h: number, d: number, y: number) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.012), ribbon); m.position.y = y; return m; };
    body.add(band(0.17, 0.79, 1.012, 0), band(1.012, 0.79, 0.17, 0));
    const lid = new THREE.Group();
    const lidBox = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.22, 1.1, 6, 0.05), paper);
    lid.add(lidBox, band(0.18, 0.225, 1.112, 0), band(1.112, 0.225, 0.18, 0));
    // the bow: two puffy loops, two tails and a knot
    const loopGeo = new THREE.TorusGeometry(0.15, 0.045, 18, 48);
    for (const s of [-1, 1]) {
      const loop = new THREE.Mesh(loopGeo, ribbon);
      loop.scale.set(1.15, 0.85, 1.5);
      loop.position.set(s * 0.15, 0.24, 0);
      loop.rotation.set(0, 0, s * 0.45);
      lid.add(loop);
      const tail = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.02, 0.32, 2, 0.008), ribbon);
      tail.position.set(s * 0.1, 0.13, 0.17);
      tail.rotation.set(0.35, s * 0.5, 0);
      lid.add(tail);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), ribbon);
    knot.scale.set(1, 0.85, 1);
    knot.position.y = 0.2;
    lid.add(knot);
    const present = new THREE.Group();
    body.position.y = -0.2;
    lid.position.y = 0.3;
    present.add(body, lid);
    present.rotation.y = -0.6;
    scene.add(present);
    look(0, 1.35, 3.75, 0.02);
    lid.visible = false; const giftBody = shoot();
    lid.visible = true; body.visible = false; const giftLid = shoot();
    present.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    env.dispose();
    pmrem.dispose();
    return { piles, giftBody, giftLid };
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
