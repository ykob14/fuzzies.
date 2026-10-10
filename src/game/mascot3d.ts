/**
 * Renders the website mascot with the same furry 3D model as Fuzzy Crossing, in a little photo studio,
 * once per face (eyes open, wink, blink). The frames are plain PNG images, so the logo can be animated
 * cheaply with CSS everywhere without keeping a WebGL context alive.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as M from './models3d';
import { furStrands } from './textures3d';

export type Face = 'open' | 'wink' | 'blink';
export type Frames = Record<Face, string>;

export async function renderMascotFrames(colors: [string, string] = ['#ff6fbf', '#7b4dff'], size = 320): Promise<Frames> {
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
    const rim = new THREE.DirectionalLight(0xffc4f0, 2.2);
    rim.position.set(1.6, 1.2, -1.8);
    const fill = new THREE.HemisphereLight(0xd8e4ff, 0x3a2050, 0.45);
    scene.add(key, rim, fill);

    const mats = { fur: furStrands() } as unknown as M.Mats;
    const fz = M.makeFuzzy(mats, colors, 0.27, 0.1, 26);
    fz.mouth?.position.add(new THREE.Vector3(0, -0.01, 0.01));
    scene.add(fz.group);

    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
    camera.position.set(0, 0.12, 1.75);
    camera.lookAt(0, 0.0, 0);

    const out = document.createElement('canvas');
    out.width = out.height = size;
    const ox = out.getContext('2d')!;
    ox.imageSmoothingQuality = 'high';

    const shoot = (face: Face): string => {
      fz.eyes.forEach((e, i) => {
        // closed eyes are drawn as happy "^" arcs: one for the wink, both for a blink
        const happy = face === 'blink' || (face === 'wink' && i === 1);
        e.open.visible = !happy;
        e.lid.visible = happy;
      });
      if (fz.mouth) fz.mouth.scale.set(face === 'wink' ? 1.9 : 1.5, face === 'wink' ? 1.8 : 1.4, 1.2);
      fz.body.rotation.z = face === 'wink' ? -0.16 : 0;
      fz.face.rotation.y = face === 'wink' ? -0.05 : 0;
      renderer.render(scene, camera);
      ox.clearRect(0, 0, size, size);
      ox.drawImage(canvas, 0, 0, size, size);
      return out.toDataURL('image/png');
    };
    const frames: Frames = { open: shoot('open'), wink: shoot('wink'), blink: shoot('blink') };
    env.dispose();
    pmrem.dispose();
    scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    return frames;
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
