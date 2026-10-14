/**
 * The Parking Escape lot in the town (2×2 tiles, front towards +z): painted bays with three little cars and their Fuzzy drivers, a
 * striped barrier that lifts now and then, a ticket booth, a big "P" sign — and the parking attendant, one of the owner's Fuzzies,
 * waving by the entrance. Plus the Golden Parking Trophy (level 500's reward). Self-contained on purpose: models.ts imports this
 * file, so nothing here may use models.ts at the top level.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { buildVehicle, driverTexture } from './vehicles';

const m = (c: string, rough = 0.7, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });
const add = (g: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, shadow = true) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; g.add(o); return o; };
const rbox = (w: number, h: number, d: number, r = 0.03) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
let lotTex: THREE.Texture | null = null;
function lotTexture(): THREE.Texture {
  if (lotTex) return lotTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!;
  g.fillStyle = '#545a63'; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 1800; k++) { const v = 70 + Math.random() * 50; g.fillStyle = `rgba(${v},${v},${v + 4},0.5)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); }
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4;
  for (const x of [20, 88, 156]) { g.beginPath(); g.moveTo(x, 18); g.lineTo(x, 118); g.stroke(); }
  for (const x of [100, 168, 236]) { g.beginPath(); g.moveTo(x, 140); g.lineTo(x, 238); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('P', 50, 200);
  lotTex = new THREE.CanvasTexture(c); lotTex.colorSpace = THREE.SRGBColorSpace; lotTex.anisotropy = 4;
  return lotTex;
}
const signTexture = (() => { let t: THREE.Texture | null = null; return () => {
  if (t) return t; const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d')!;
  g.fillStyle = '#2f6fd8'; g.beginPath(); g.roundRect(0, 0, 256, 96, 18); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.roundRect(6, 6, 244, 84, 14); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PARKING', 128, 36); g.font = 'bold 24px sans-serif'; g.fillText('ESCAPE', 128, 66);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }; })();
const stripes = (() => { let t: THREE.Texture | null = null; return () => { if (t) return t; const c = document.createElement('canvas'); c.width = 16; c.height = 128; const g = c.getContext('2d')!; for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#fff' : '#e8483f'; g.fillRect(0, k * 16, 16, 16); } t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }; })();

function sprite(tex: number, size: number): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: driverTexture(tex), transparent: true, alphaTest: 0.12 }));
  s.center.set(0.5, 0.1); s.scale.set(size, size, 1);
  s.raycast = () => { /* the building is picked by its meshes */ };
  return s;
}
const noPick = (g: THREE.Object3D) => g.traverse((o) => { if ((o as THREE.Sprite).isSprite) o.raycast = () => { /* */ }; });

export function parkingLot(): THREE.Group {
  const g = new THREE.Group();
  // the paved pad with a kerb
  add(g, rbox(1.96, 0.1, 1.96, 0.04), m('#e7e2d6', 0.85), 0, 0.05, 0);
  add(g, new THREE.BoxGeometry(1.8, 0.02, 1.62).translate(0, 0, -0.08), new THREE.MeshStandardMaterial({ map: lotTexture(), roughness: 0.85 }), 0, 0.105, 0, false);
  // three little cars with their drivers
  const cars: [string, number, number, number, number][] = [['#2fb7b0', 4, -0.52, -0.5, -Math.PI / 2], ['#ffb3c7', 9, 0.2, -0.5, -Math.PI / 2], ['#d6336c', 0, 0.55, 0.32, Math.PI / 2]];
  for (const [col, d, x, z, ry] of cars) {
    const v = buildVehicle(col === '#d6336c' ? 'hero' : 'car', 2, col, [d]); v.group.scale.setScalar(0.34); v.group.position.set(x, 0.11, z); v.group.rotation.y = ry; g.add(v.group);
  }
  // ticket booth with a striped roof
  const booth = new THREE.Group(); booth.position.set(-0.62, 0.11, 0.55);
  add(booth, rbox(0.42, 0.46, 0.38, 0.05), m('#fff4e3', 0.6), 0, 0.23, 0);
  add(booth, new THREE.BoxGeometry(0.3, 0.16, 0.02), new THREE.MeshPhysicalMaterial({ color: '#bfe4ff', roughness: 0.08, clearcoat: 1 }), 0, 0.3, 0.2, false);
  const roof = add(booth, rbox(0.52, 0.06, 0.48, 0.02), new THREE.MeshStandardMaterial({ map: stripes(), roughness: 0.6 }), 0, 0.5, 0); roof.rotation.y = Math.PI / 2;
  g.add(booth);
  // the barrier by the entrance: lifts every few seconds as a car "leaves"
  const post = add(g, rbox(0.08, 0.3, 0.08, 0.02), m('#f1f3f5', 0.5), -0.3, 0.26, 0.86);
  const arm = new THREE.Group(); arm.position.set(-0.3, 0.38, 0.86); post.castShadow = true;
  add(arm, new THREE.BoxGeometry(0.62, 0.04, 0.04).translate(0.31, 0, 0), new THREE.MeshStandardMaterial({ map: stripes(), roughness: 0.5 })); g.add(arm);
  // the big sign
  add(g, new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), m('#9aa1ab', 0.4, 0.5), 0.86, 0.66, 0.86);
  const sign = add(g, rbox(0.62, 0.24, 0.04, 0.03), new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.5 }), 0.62, 1.12, 0.86); sign.castShadow = true;
  const pBall = add(g, new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshStandardMaterial({ color: '#2f6fd8', emissive: '#2f6fd8', emissiveIntensity: 0.3 }), 0.86, 1.32, 0.86);
  // the parking attendant, waving by the gate
  const att = sprite(6, 0.46); att.position.set(-0.2, 0.11, 0.62); g.add(att);
  noPick(g);
  let t = 0, lift = 0, next = 3;
  g.userData.tick = (T: number, dt: number) => {
    t += dt;
    // the attendant bobs and waves (a little sway), the barrier goes up and down
    att.position.y = 0.11 + Math.abs(Math.sin(T * 2.4)) * 0.03;
    (att.material as THREE.SpriteMaterial).rotation = Math.sin(T * 3) * 0.12;
    if (t > next) { lift = Math.min(1, lift + dt * 2); if (t > next + 2.2) { next = t + 4 + Math.random() * 4; } }
    else lift = Math.max(0, lift - dt * 1.5);
    arm.rotation.z = lift * 1.3;
    pBall.scale.setScalar(1 + Math.sin(T * 3) * 0.05);
  };
  return g;
}

/** The Golden Parking Trophy: a gold car on a pedestal, a star turning above it. */
export function parkingTrophy(): THREE.Group {
  const g = new THREE.Group();
  add(g, rbox(0.62, 0.14, 0.62, 0.04), m('#7a4f2d', 0.7), 0, 0.07, 0);
  add(g, rbox(0.5, 0.2, 0.5, 0.04), m('#f3ead8', 0.5), 0, 0.24, 0);
  const goldM = new THREE.MeshStandardMaterial({ color: '#ffc94a', metalness: 1, roughness: 0.22 });
  const car = buildVehicle('hero', 2, '#ffc94a', [0]);
  car.group.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh && !(o as unknown as THREE.Sprite).isSprite) me.material = goldM; });
  car.group.scale.setScalar(0.26); car.group.position.y = 0.34; car.group.rotation.y = 0.5; g.add(car.group);
  const shape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.05 : 0.12, a = (i / 10) * Math.PI * 2 - Math.PI / 2; if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const star = add(g, new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false }).center(), goldM, 0, 0.82, 0);
  noPick(g);
  g.userData.tick = (T: number) => { star.rotation.y = T * 1.6; star.position.y = 0.82 + Math.sin(T * 2) * 0.03; };
  return g;
}
