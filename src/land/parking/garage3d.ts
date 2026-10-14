/**
 * The Garage's 360° view: the star car you're choosing — its shape, paint and driver — on a little turntable. It turns slowly by itself
 * (not with Calm motion); drag sideways to spin it all the way round, up / down to look from lower or higher, double-tap (or the 0 key)
 * to put it back. Its own small renderer, made when the Garage opens and thrown away when it closes (the lot underneath is paused).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildVehicle, STAR_STYLES, type VehicleModel } from './vehicles';

export interface Turntable {
  el: HTMLElement;
  /** show this star car (rebuilds only what changed) */
  show(style: number, paint: string, driver: number): void;
  dispose(): void;
}

export function turntable(opts: { calm: boolean }): Turntable {
  const el = document.createElement('div'); el.className = 'pk-turn';
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', 'Your star car — drag to turn it'); canvas.setAttribute('role', 'img');
  const hint = document.createElement('span'); hint.className = 'pk-turn-hint'; hint.textContent = 'Drag to turn';
  el.append(canvas, hint);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  scene.environment = env; scene.environmentIntensity = 0.5;
  scene.add(new THREE.HemisphereLight('#e4f1ff', '#c8b9a6', 0.8));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.4); sun.position.set(-2.5, 6, 3.5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 1, far: 15 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  // a soft cream podium the car stands on
  const podium = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.42, 0.1, 64), new THREE.MeshStandardMaterial({ color: '#f3e9dc', roughness: 0.85 }));
  podium.position.y = -0.05; podium.receiveShadow = true; scene.add(podium);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.385, 0.02, 8, 80), new THREE.MeshStandardMaterial({ color: '#d6336c', roughness: 0.5 }));
  rim.rotation.x = Math.PI / 2; scene.add(rim);
  const turn = new THREE.Group(); scene.add(turn);
  const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 50);

  let model: VehicleModel | null = null, key = '';
  let yaw = -0.6, pitch = 0.42, spin = opts.calm ? 0 : 0.35, dragging = false, idle = 0;
  const place = () => {
    const d = 3.7;
    camera.position.set(0, 0.35 + Math.sin(pitch) * d, Math.cos(pitch) * d); camera.lookAt(0, 0.3, 0);
  };
  const disposeModel = () => {
    if (!model) return;
    turn.remove(model.group);
    // free the car's GPU buffers (the Fuzzy's model stays: the lot uses it too)
    const keep = new Set<THREE.BufferGeometry>();
    for (const d of model.drivers) if (d.rider) { keep.add(d.rider.body.geometry); keep.add(d.rider.lids.geometry); }
    model.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry && !keep.has(m.geometry)) m.geometry.dispose(); }); // shared wheel parts just upload again
    model = null;
  };
  function show(style: number, paint: string, driver: number): void {
    const k = `${style}|${paint}|${driver}`; if (k === key) return; key = k;
    disposeModel();
    model = buildVehicle(STAR_STYLES[style] ?? 'car', 2, paint, [driver], { star: true });
    model.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
    turn.add(model.group);
  }

  // drag: sideways spins (any amount — all the way round), up / down tilts the view; a flick keeps it turning
  let last = { x: 0, y: 0, t: 0 }, lastTap = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; idle = 0; last = { x: e.clientX, y: e.clientY, t: e.timeStamp }; spin = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* gone */ }
    if (e.timeStamp - lastTap < 320) { yaw = -0.6; pitch = 0.42; place(); } lastTap = e.timeStamp;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y, dt = Math.max(1, e.timeStamp - last.t) / 1000;
    yaw += dx * 0.012; pitch = Math.max(0.08, Math.min(1.25, pitch + dy * 0.008));
    spin = (dx * 0.012) / dt * 0.5; last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    hint.classList.add('gone'); place();
  });
  const up = () => { dragging = false; if (opts.calm) spin = 0; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

  // the driver: blinks now and then, looks up at you from the seat (same as in the lot)
  const blink = { in: 1.2, left: 0 };
  const tmp = new THREE.Vector3();
  const animDriver = (dt: number) => {
    const d = model?.drivers[0]; if (!d?.rider) return;
    if (blink.left > 0) blink.left = Math.max(0, blink.left - dt); else if ((blink.in -= dt) <= 0) { blink.left = 0.16; blink.in = 2 + Math.random() * 3.5; }
    d.rider.face(blink.left > 0 ? Math.sin((1 - blink.left / 0.16) * Math.PI) : 0);
    const o = d.obj; o.parent!.updateWorldMatrix(true, false);
    const v = o.parent!.worldToLocal(tmp.copy(camera.position));
    const rel = Math.atan2(Math.sin(Math.atan2(v.x - d.base.x, v.z - d.base.z) - Math.PI / 2), Math.cos(Math.atan2(v.x - d.base.x, v.z - d.base.z) - Math.PI / 2));
    o.rotation.set(-0.45, Math.PI / 2 + Math.max(-2.3, Math.min(2.3, rel * 0.9)), 0, 'YXZ');
  };

  let raf = 0, prev = performance.now(), alive = true;
  const size = () => {
    const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(size); ro.observe(el);
  const loop = (now: number) => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    if (!dragging) {
      idle += dt;
      // after a flick it slows down; when left alone it settles into a slow showroom turn
      const cruise = opts.calm ? 0 : 0.35;
      spin += (cruise - spin) * Math.min(1, dt * (idle > 1.2 ? 1.2 : 2.5));
      yaw += spin * dt;
    }
    turn.rotation.y = yaw;
    animDriver(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  place(); raf = requestAnimationFrame((t) => { prev = t; size(); loop(t); });

  return {
    el, show,
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); disposeModel();
      podium.geometry.dispose(); (podium.material as THREE.Material).dispose(); rim.geometry.dispose(); (rim.material as THREE.Material).dispose();
      env.dispose(); renderer.dispose(); renderer.forceContextLoss(); el.remove();
    },
  };
}
