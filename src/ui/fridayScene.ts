/**
 * The Happy Friday stage: a small real-time 3D scene (one transparent canvas over the celebration backdrop) with a line-up of
 * the game's own Fuzzies — the owner's fur-ball model with each character's fur finish and accessories — who drop in one by
 * one, land with a squash, and celebrate with their own moves (spin, backflip, dance, cheer…) while confetti cannons fire.
 * The player's equipped Fuzzy stands in the middle. Lazy-loaded; if anything fails the celebration simply has no stage.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { character, type CharacterDef } from '../crossing/characters';
import { buildCharacter, type CharacterRig } from '../crossing/character3d';
import { loadFur, furReady } from '../crossing/fur';
import { FxLayer } from '../crossing/effects';

export interface FridayScene {
  el: HTMLCanvasElement;
  /** begin the choreography */
  start(): void;
  /** a big confetti burst (the gift was opened) and everybody celebrates */
  party(): void;
  resize(): void;
  dispose(): void;
}
export interface SceneOpts { hero: CharacterDef; phone: boolean; calm: boolean; sound: boolean }

const CAST = ['dj', 'chef', 'wizard', 'astronaut', 'unicorn', 'pilot', 'ninja', 'rockstar', 'pirate', 'bee', 'kitty', 'robot', 'royal', 'surfer', 'lion', 'cowboy'];
const easeIn = (k: number) => k * k;

interface Actor { rig: CharacterRig; wrap: THREE.Group; delay: number; landed: boolean; landAt: number; next: number; scale: number; base: number }

export async function createFridayScene(o: SceneOpts): Promise<FridayScene | null> {
  if (!furReady()) await Promise.race([loadFur().catch(() => false), new Promise((r) => setTimeout(r, 5000))]);
  const canvas = document.createElement('canvas');
  canvas.className = 'ff-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { return null; }
  let dpr = Math.min(devicePixelRatio || 1, o.phone ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  scene.environmentIntensity = 0.7;
  scene.add(new THREE.HemisphereLight('#fff4f0', '#c58aa3', 1.0));
  const key = new THREE.DirectionalLight('#fff3e2', 2.4); key.position.set(-3, 6, 6); scene.add(key);
  const rimL = new THREE.DirectionalLight('#ffb3cf', 1.8); rimL.position.set(4, 3, -5); scene.add(rimL);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 90);
  const fx = new FxLayer(1, o.phone ? 140 : 220); scene.add(fx.group);

  // the cast: your Fuzzy in the middle, the others round it (fewer, in two rows, on a phone)
  const pool = CAST.filter((id) => id !== o.hero.id).sort(() => Math.random() - 0.5);
  const slots: { x: number; z: number; s: number; y: number }[] = o.phone
    ? [{ x: 0, z: 0.6, s: 1.2, y: 0 }, { x: -2.75, z: 0, s: 0.95, y: 0 }, { x: 2.75, z: 0, s: 0.95, y: 0 }, { x: -1.75, z: -2.2, s: 0.8, y: 2.1 }, { x: 1.75, z: -2.2, s: 0.8, y: 2.1 }]
    : [{ x: 0, z: 0.8, s: 1.3, y: 0 }, { x: -2.9, z: 0, s: 1, y: 0 }, { x: 2.9, z: 0, s: 1, y: 0 }, { x: -5.4, z: -1, s: 0.9, y: 0 }, { x: 5.4, z: -1, s: 0.9, y: 0 }, { x: -7.7, z: -2, s: 0.8, y: 0 }, { x: 7.7, z: -2, s: 0.8, y: 0 }];
  const actors: Actor[] = [];
  const order = slots.map((_, i) => i).sort((a, b) => Math.abs(slots[a].x) - Math.abs(slots[b].x)); // the middle drops first
  slots.forEach((sl, i) => {
    const def = i === 0 ? o.hero : character(pool[i - 1]);
    const rig = buildCharacter(def, { r: 1, shadow: true, sound: o.sound && i === 0, accessories: true });
    const wrap = new THREE.Group();
    rig.group.position.y = 1; // feet on the wrap's origin
    wrap.add(rig.group);
    wrap.position.set(sl.x, 0, sl.z);
    wrap.scale.setScalar(sl.s);
    wrap.visible = false;
    scene.add(wrap);
    actors.push({ rig, wrap, delay: 0.3 + order.indexOf(i) * 0.16, landed: false, landAt: 0, next: 0, scale: sl.s, base: sl.y });
  });

  const halfW = Math.max(...slots.map((s) => Math.abs(s.x))) + 1.9;
  let W = 1, H = 1;
  function resize(): void {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    camera.aspect = W / H;
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const d = Math.max(0.9 * halfW / (tan * camera.aspect), o.phone ? 15 : 12);
    // the line-up sits in the middle band of the screen (the banner is above it, the gift card below)
    const lift = d * tan * (o.phone ? -0.05 : 0.12);
    camera.position.set(0, 4.2 + lift * 0.3, d);
    camera.lookAt(0, 0.6 + lift, 0);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  resize();

  let t0 = 0, raf = 0, last = 0, dead = false, slow = 0, partyAt = -1;
  const cannon = (n: number) => { const w = halfW * 0.95; fx.confetti(new THREE.Vector3(-w, -0.5, 1.5), n, 1.3); fx.confetti(new THREE.Vector3(w, -0.5, 1.5), n, 1.3); };

  function frame(now: number): void {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    // a slow phone: drop the pixel ratio once, quietly
    if (dt > 0.03 && ++slow > 24 && dpr > 1) { dpr = 1; renderer.setPixelRatio(1); renderer.setSize(W, H, false); slow = -9999; }
    last = now;
    for (const a of actors) {
      const u = (t - a.delay) / 0.4;
      if (u < 0) continue;
      a.wrap.visible = true;
      if (u < 1) { a.wrap.position.y = a.base + 6.5 * (1 - easeIn(u)); a.wrap.scale.set(a.scale * 0.94, a.scale * 1.1, a.scale * 0.94); }
      else {
        if (!a.landed) { a.landed = true; a.landAt = t; a.next = t + 0.7 + Math.random() * 0.5; if (a === actors[0]) cannon(o.phone ? 36 : 56); fx.land('jump-puff', a.wrap.position.clone().add(new THREE.Vector3(0, 0.05, 0))); }
        a.wrap.position.y = a.base;
        const v = t - a.landAt; // landing squash that rings out
        const sq = Math.exp(-v * 7) * Math.cos(v * 17) * 0.2;
        a.wrap.scale.set(a.scale * (1 + sq * 0.55), a.scale * (1 - sq), a.scale * (1 + sq * 0.55));
        if (t > a.next && !a.rig.busy()) { const dur = a.rig.play(Math.random() < 0.6 ? 'celebrate' : 'jump'); a.next = t + (dur || 1) + 0.5 + Math.random() * 1.1; }
      }
      a.rig.tick(t, dt);
    }
    if (partyAt > 0 && t > partyAt) { partyAt = -1; cannon(o.phone ? 60 : 90); }
    fx.update(dt);
    renderer.render(scene, camera);
  }

  return {
    el: canvas,
    start() {
      if (o.calm) { for (const a of actors) { a.wrap.visible = true; a.wrap.position.y = a.base; a.wrap.scale.setScalar(a.scale); a.rig.tick(1, 0.016); } renderer.render(scene, camera); return; }
      t0 = performance.now(); raf = requestAnimationFrame(frame);
    },
    party() {
      if (o.calm) return;
      const t = (performance.now() - t0) / 1000;
      partyAt = t + 0.05;
      for (const a of actors) { if (a.landed && !a.rig.busy()) { a.next = t + Math.random() * 0.35; } }
    },
    resize,
    dispose() {
      dead = true; cancelAnimationFrame(raf);
      for (const a of actors) a.rig.dispose();
      fx.dispose(); scene.environment?.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
