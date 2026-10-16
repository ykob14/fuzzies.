import * as THREE from 'three';
import { loadFur, furSrc, furMaterial } from '../fur';
export { THREE };
export async function measure() {
  await loadFur();
  const s = furSrc()!;
  const g = s.geo; g.computeBoundingBox();
  // depth at the eye positions: ray from front
  const ray = new THREE.Raycaster();
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const out: Record<string, number> = {};
  for (const [k, x, y] of [['eyeL', -0.158, 0.516], ['eyeR', 0.185, 0.535], ['mouth', 0.013, 0.365], ['top', 0, 0.98], ['c', 0, 0.5], ['side', 0.45, 0.5], ['low', 0, 0.12]] as [string, number, number][]) {
    ray.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1));
    const h = ray.intersectObject(mesh)[0]; out[k] = h ? +h.point.z.toFixed(3) : NaN;
  }
  // top surface height at centre
  ray.set(new THREE.Vector3(0, 5, 0), new THREE.Vector3(0, -1, 0)); out.topY = +(ray.intersectObject(mesh)[0]?.point.y ?? NaN).toFixed(3);
  ray.set(new THREE.Vector3(0, 5, -0.2), new THREE.Vector3(0, -1, 0)); out.topYback = +(ray.intersectObject(mesh)[0]?.point.y ?? NaN).toFixed(3);
  ray.set(new THREE.Vector3(5, 0.5, 0), new THREE.Vector3(-1, 0, 0)); out.sideX = +(ray.intersectObject(mesh)[0]?.point.x ?? NaN).toFixed(3);
  ray.set(new THREE.Vector3(0, 0.5, -5), new THREE.Vector3(0, 0, 1)); out.backZ = +(ray.intersectObject(mesh)[0]?.point.z ?? NaN).toFixed(3);
  return { box: g.boundingBox, height: s.height, width: s.width, out, tris: (g.index?.count ?? 0) / 3, tex: [(s.map.image as any).width, (s.map.image as any).height] };
}

/** render each look on a grid; returns a PNG data URL */
export async function sheet(looks: { c0: string; c1: string; fx: any }[], cell = 220, cols = 4, yaw = 0, pitch = 0.15) {
  await loadFur();
  const s = furSrc()!;
  const rows = Math.ceil(looks.length / cols);
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  r.setSize(cell * cols, cell * rows, false);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping;
  r.setScissorTest(true);
  const scene = new THREE.Scene();
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
  const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6;
  scene.add(new THREE.HemisphereLight('#fff', '#888', 1.2));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.2); sun.position.set(-2, 3, 4); scene.add(sun);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const k = 1 / 0.45;
  for (let i = 0; i < looks.length; i++) {
    const m = new THREE.Mesh(s.geo, furMaterial(looks[i]));
    m.scale.setScalar(k); m.position.y = -0.45 * k; m.rotation.y = yaw;
    scene.add(m);
    const d = 4.4; cam.position.set(0, Math.sin(pitch) * d, Math.cos(pitch) * d); cam.lookAt(0, 0, 0);
    const x = (i % cols) * cell, y = (rows - 1 - Math.floor(i / cols)) * cell;
    r.setViewport(x, y, cell, cell); r.setScissor(x, y, cell, cell);
    r.setClearColor('#e9e6e1'); r.clear();
    r.render(scene, cam);
    scene.remove(m);
  }
  const url = canvas.toDataURL('image/png');
  r.dispose();
  return url;
}
export async function close(look: any, size = 600) { return sheet([look], size, 1, 0, 0.1); }

export async function chars(o: { ids?: string[]; cell?: number; cols?: number; yaw?: number; pitch?: number; acc?: boolean; extra?: string | null; locked?: boolean; t?: number; label?: boolean }) {
  await loadFur();
  const { CHARACTERS, CHARACTER_BY_ID } = await import('../characters');
  const { buildCharacter } = await import('../character3d');
  const ids = o.ids ?? CHARACTERS.map((c) => c.id);
  const cell = o.cell ?? 200, cols = o.cols ?? 10;
  const rows = Math.ceil(ids.length / cols);
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  r.setSize(cell * cols, cell * rows, false);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping;
  r.setScissorTest(true);
  const scene = new THREE.Scene();
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
  const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6;
  scene.add(new THREE.HemisphereLight('#fff', '#888', 1.1));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.2); sun.position.set(-2, 3, 4); scene.add(sun);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const yaw = o.yaw ?? 0.35, pitch = o.pitch ?? 0.18;
  for (let i = 0; i < ids.length; i++) {
    const def = CHARACTER_BY_ID[ids[i]];
    const rig = buildCharacter(def, { r: 1, accessories: o.acc !== false, extra: o.extra ?? null, locked: !!o.locked });
    scene.add(rig.group);
    const T = o.t ?? 1.3; for (let k = 0; k <= 4; k++) rig.tick(T * k / 4, T / 4);
    const d = 6.6; cam.position.set(Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d + 0.25, Math.cos(yaw) * Math.cos(pitch) * d); cam.lookAt(0, 0.2, 0);
    const x = (i % cols) * cell, y = (rows - 1 - Math.floor(i / cols)) * cell;
    r.setViewport(x, y, cell, cell); r.setScissor(x, y, cell, cell);
    r.setClearColor(o.locked ? '#1d1b24' : '#ebe8e3'); r.clear();
    r.render(scene, cam);
    rig.dispose();
  }
  const url = canvas.toDataURL('image/png');
  r.dispose();
  return url;
}
