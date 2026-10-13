/**
 * Trophy models for Fuzzies Land (rules: trophies.ts). One shape for every mini-game — a wooden base with a coloured plaque,
 * a lathed cup with handles in the metal you earned (gold / silver / bronze / raspberry "finisher" ceramic) — topped by a
 * little emblem of its game (a balloon, a fish, a tree, a boat, a gem…) that turns slowly. Follows ART.md: soft rounded
 * shapes, the town palette, shared materials. Fits one tile; the front faces +z.
 */
import * as THREE from 'three';
import { add, rbox, std, mat, PAL } from './models';
import { isTrophy, advOf, trophyMetal, type Metal } from './trophies';

const metalMat = (m: Metal): THREE.Material => mat(`trophy-${m}`, () => {
  if (m === 'gold') return new THREE.MeshStandardMaterial({ color: 0xffc94a, metalness: 1, roughness: 0.2, emissive: 0x3a2400, emissiveIntensity: 0.25 });
  if (m === 'silver') return new THREE.MeshStandardMaterial({ color: 0xe3e8ee, metalness: 1, roughness: 0.18 });
  if (m === 'bronze') return new THREE.MeshStandardMaterial({ color: 0xcd8a52, metalness: 1, roughness: 0.3 });
  return new THREE.MeshPhysicalMaterial({ color: 0xe45a78, metalness: 0, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 });
});
const gloss = (c: string, rough = 0.4) => mat(`trg${c}${rough}`, () => new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, clearcoat: 0.6 }));
const glow = (c: string) => mat(`trglow${c}`, () => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, roughness: 0.5 }));

/** each game's plaque colour and emblem */
// plain colours here, not PAL: models.ts imports this file, so PAL isn't ready while this module loads
const LOOK: Record<string, { plaque: string; emblem: string }> = {
  boatrace: { plaque: '#5aa2e6', emblem: 'boat' }, forest: { plaque: '#4f9a5a', emblem: 'tree' }, vacuum: { plaque: '#33ab9b', emblem: 'hairball' },
  fruit: { plaque: '#f2785c', emblem: 'apple' }, maze: { plaque: '#5f8f4e', emblem: 'key' }, balloon: { plaque: '#e45a78', emblem: 'balloon' },
  treasure: { plaque: '#c98b55', emblem: 'chest' }, fishing: { plaque: '#3f86c6', emblem: 'fish' }, obstacle: { plaque: '#f2a03c', emblem: 'star' },
  harvest: { plaque: '#d9822b', emblem: 'carrot' }, garden: { plaque: '#c7517a', emblem: 'tulip' }, delivery: { plaque: '#9c6638', emblem: 'parcel' },
  mining: { plaque: '#5b6b8c', emblem: 'gem' }, fire: { plaque: '#d9472b', emblem: 'flame' }, snowball: { plaque: '#7fa9d6', emblem: 'snowman' },
  beach: { plaque: '#e8b86a', emblem: 'shell' }, skate: { plaque: '#6fb3d9', emblem: 'snowflake' }, brawl: { plaque: '#e0a500', emblem: 'sunflower' },
};

let cupGeo: THREE.LatheGeometry | null = null;
const cup = (): THREE.LatheGeometry => cupGeo ??= new THREE.LatheGeometry([
  [0.0, 0], [0.07, 0], [0.075, 0.02], [0.03, 0.05], [0.028, 0.13], [0.05, 0.16], [0.14, 0.2], [0.19, 0.28], [0.205, 0.38], [0.2, 0.42], [0.185, 0.42], [0.18, 0.39], [0.0, 0.36],
].map(([x, y]) => new THREE.Vector2(x, y)), 32);

function starShape(r1: number, r2: number, n = 5): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? r2 : r1; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
  return s;
}
const extrude = (shape: THREE.Shape, depth: number) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 }).center();

/** a small emblem of the game (~0.2 m), standing on y = 0 */
function emblem(kind: string): THREE.Group {
  const g = new THREE.Group();
  switch (kind) {
    case 'boat': {
      add(g, rbox(0.24, 0.06, 0.1, 0.03), gloss('#ffffff'), 0, 0.04, 0); add(g, rbox(0.25, 0.02, 0.11, 0.01), gloss(PAL.raspberry), 0, 0.075, 0, false);
      add(g, new THREE.CylinderGeometry(0.006, 0.006, 0.18, 6), std(PAL.woodDark), 0, 0.17, 0, false);
      const sail = new THREE.Shape(); sail.moveTo(0, 0); sail.lineTo(0.09, 0); sail.lineTo(0, 0.15); sail.lineTo(0, 0);
      const m = add(g, new THREE.ShapeGeometry(sail), mat('trsail', () => new THREE.MeshStandardMaterial({ color: '#fff7e8', side: THREE.DoubleSide })), 0.008, 0.1, 0, false); m.rotation.y = -Math.PI / 2; break;
    }
    case 'tree': add(g, new THREE.CylinderGeometry(0.02, 0.025, 0.07, 8), std(PAL.woodDark), 0, 0.035, 0); add(g, new THREE.ConeGeometry(0.09, 0.14, 10), std('#3f8f4a', 0.7), 0, 0.12, 0); add(g, new THREE.ConeGeometry(0.065, 0.11, 10), std('#4fa65a', 0.7), 0, 0.2, 0); break;
    case 'hairball': { const b = add(g, new THREE.IcosahedronGeometry(0.09, 1), mat('trfluff', () => new THREE.MeshStandardMaterial({ color: '#d8c8d2', roughness: 1, flatShading: true })), 0, 0.1, 0); b.scale.set(1, 0.9, 1); for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.014, 8, 6), std('#2b2230', 0.4), sx * 0.03, 0.12, 0.08, false); break; }
    case 'apple': { const a = add(g, new THREE.SphereGeometry(0.085, 20, 14), gloss('#d8322f', 0.3), 0, 0.09, 0); a.scale.set(1, 0.92, 1); add(g, new THREE.CylinderGeometry(0.006, 0.008, 0.05, 6), std(PAL.woodDark), 0, 0.19, 0, false); const l = add(g, new THREE.SphereGeometry(0.03, 10, 6), std('#4fa65a', 0.6), 0.03, 0.19, 0, false); l.scale.set(1.4, 0.35, 0.7); break; }
    case 'key': { const k = metalMat('gold'); add(g, new THREE.TorusGeometry(0.045, 0.014, 8, 20), k, 0, 0.17, 0); add(g, new THREE.CylinderGeometry(0.012, 0.012, 0.13, 8), k, 0, 0.065, 0); add(g, rbox(0.04, 0.014, 0.014, 0.004), k, 0.02, 0.02, 0, false); add(g, rbox(0.03, 0.014, 0.014, 0.004), k, 0.015, 0.045, 0, false); break; }
    case 'balloon': { const b = add(g, new THREE.SphereGeometry(0.075, 20, 14), gloss('#ff5c8a', 0.25), 0, 0.17, 0); b.scale.set(1, 1.18, 1); add(g, new THREE.ConeGeometry(0.014, 0.02, 6), gloss('#ff5c8a'), 0, 0.075, 0, false); add(g, new THREE.CylinderGeometry(0.003, 0.003, 0.07, 4), std('#f5f5f5'), 0, 0.035, 0, false); break; }
    case 'chest': add(g, rbox(0.2, 0.09, 0.13, 0.015), std('#8a5a30', 0.7), 0, 0.045, 0); { const lid = add(g, new THREE.CylinderGeometry(0.065, 0.065, 0.2, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2), std('#9c6638', 0.7), 0, 0.09, 0); lid.rotation.y = Math.PI / 2; } add(g, rbox(0.03, 0.17, 0.14, 0.005), metalMat('gold'), 0, 0.09, 0, false); add(g, new THREE.SphereGeometry(0.03, 10, 8), glow('#ffd34a'), 0, 0.13, 0.03, false); break;
    case 'fish': { const f = add(g, new THREE.SphereGeometry(0.07, 18, 12), gloss('#3f86c6', 0.3), 0, 0.1, 0); f.scale.set(1.5, 0.9, 0.55); const t = add(g, new THREE.ConeGeometry(0.05, 0.07, 4), gloss('#2f6aa6', 0.3), -0.13, 0.1, 0); t.rotation.z = Math.PI / 2; t.scale.set(1, 1, 0.35); add(g, new THREE.SphereGeometry(0.012, 8, 6), std('#1b1b22', 0.3), 0.06, 0.115, 0.03, false); break; }
    case 'star': add(g, extrude(starShape(0.1, 0.045), 0.03), glow('#ffcf3a'), 0, 0.11, 0); break;
    case 'carrot': { const c = add(g, new THREE.ConeGeometry(0.04, 0.17, 12), gloss('#f08a24', 0.5), 0, 0.085, 0); c.rotation.z = Math.PI; for (let i = 0; i < 3; i++) { const l = add(g, new THREE.ConeGeometry(0.012, 0.08, 6), std('#4fa65a', 0.6), (i - 1) * 0.015, 0.2, 0, false); l.rotation.z = (i - 1) * 0.4; } break; }
    case 'tulip': add(g, new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), std('#4fa65a', 0.6), 0, 0.06, 0); { const l = add(g, new THREE.SphereGeometry(0.03, 10, 6), std('#4fa65a', 0.6), 0.025, 0.05, 0, false); l.scale.set(1.3, 0.3, 0.6); } for (let i = 0; i < 3; i++) { const p = add(g, new THREE.SphereGeometry(0.035, 12, 8), gloss('#e2335a', 0.35), Math.cos(i * 2.1) * 0.018, 0.155, Math.sin(i * 2.1) * 0.018); p.scale.set(0.8, 1.35, 0.8); } break;
    case 'parcel': add(g, rbox(0.15, 0.12, 0.15, 0.015), std('#c98b55', 0.8), 0, 0.06, 0); add(g, rbox(0.155, 0.125, 0.03, 0.005), std('#fff4e3', 0.6), 0, 0.06, 0, false); add(g, rbox(0.03, 0.125, 0.155, 0.005), std('#fff4e3', 0.6), 0, 0.06, 0, false); break;
    case 'gem': { const m = mat('trgem', () => new THREE.MeshPhysicalMaterial({ color: '#5fd3e8', roughness: 0.05, metalness: 0, transmission: 0.4, thickness: 0.2, clearcoat: 1, emissive: '#0d4a58', emissiveIntensity: 0.35, flatShading: true })); const o = add(g, new THREE.OctahedronGeometry(0.08, 0), m, 0, 0.1, 0); o.scale.set(1, 1.3, 1); break; }
    case 'flame': { const f = add(g, new THREE.SphereGeometry(0.06, 14, 10), glow('#ff7a1a'), 0, 0.08, 0); f.scale.set(1, 1.7, 1); const c = add(g, new THREE.SphereGeometry(0.035, 12, 8), glow('#ffd34a'), 0, 0.07, 0.02, false); c.scale.set(1, 1.6, 1); break; }
    case 'snowman': { const w = std('#fbfdff', 0.6); add(g, new THREE.SphereGeometry(0.06, 16, 12), w, 0, 0.06, 0); add(g, new THREE.SphereGeometry(0.044, 16, 12), w, 0, 0.15, 0); const n = add(g, new THREE.ConeGeometry(0.01, 0.04, 6), std('#f08a24', 0.5), 0, 0.15, 0.055, false); n.rotation.x = Math.PI / 2; for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.007, 6, 4), std('#1b1b22', 0.4), sx * 0.017, 0.165, 0.04, false); break; }
    case 'shell': for (let i = 0; i < 7; i++) { const r = add(g, new THREE.CapsuleGeometry(0.014, 0.09, 4, 8), gloss('#f6a58c', 0.4), Math.sin((i - 3) * 0.32) * 0.05, 0.05 + Math.cos((i - 3) * 0.32) * 0.05, 0); r.rotation.z = -(i - 3) * 0.32; } break;
    case 'snowflake': { const m = gloss('#bfe6ff', 0.2); for (let i = 0; i < 3; i++) { const b = add(g, rbox(0.2, 0.018, 0.018, 0.006), m, 0, 0.11, 0); b.rotation.z = (i * Math.PI) / 3; } add(g, new THREE.SphereGeometry(0.02, 10, 8), m, 0, 0.11, 0, false); break; }
    case 'sunflower': { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const p = add(g, new THREE.SphereGeometry(0.028, 8, 6), gloss('#ffc93a', 0.5), Math.cos(a) * 0.06, 0.11 + Math.sin(a) * 0.06, 0, false); p.scale.set(1.5, 0.6, 0.4); p.rotation.z = a; } const c = add(g, new THREE.CylinderGeometry(0.04, 0.04, 0.025, 16).rotateX(Math.PI / 2), std('#6b3f1d', 0.9), 0, 0.11, 0.005); c.castShadow = true; break; }
    default: add(g, extrude(starShape(0.1, 0.045), 0.03), glow('#ffcf3a'), 0, 0.11, 0);
  }
  return g;
}

/** The model for a trophy item (null for anything else). */
export function trophyModel(itemId: string): THREE.Group | null {
  if (!isTrophy(itemId)) return null;
  const metal = trophyMetal(itemId), look = LOOK[advOf(itemId)] ?? { plaque: PAL.raspberry, emblem: 'star' };
  const m = metalMat(metal), trim = metal === 'finisher' ? metalMat('gold') : m;
  const g = new THREE.Group();
  // base: a dark wooden block with a cream top and the game's coloured plaque (a metal star on it)
  add(g, rbox(0.56, 0.2, 0.56, 0.05), std('#6b4a2e', 0.6), 0, 0.1, 0);
  add(g, rbox(0.46, 0.06, 0.46, 0.03), std('#efd9b4', 0.7), 0, 0.23, 0);
  add(g, rbox(0.34, 0.12, 0.02, 0.01), gloss(look.plaque, 0.35), 0, 0.1, 0.285, false);
  add(g, extrude(starShape(0.035, 0.016), 0.008), trim, 0, 0.1, 0.3, false);
  // the cup on its stem
  const c = add(g, cup(), m, 0, 0.26, 0);
  for (const sx of [-1, 1]) { const hnd = add(g, new THREE.TorusGeometry(0.075, 0.016, 8, 18, Math.PI * 1.1), m, sx * 0.19, 0.53, 0, false); hnd.rotation.z = sx > 0 ? -Math.PI / 2 - 0.15 : Math.PI / 2 + 0.15; }
  add(g, new THREE.TorusGeometry(0.2, 0.012, 8, 32).rotateX(Math.PI / 2), trim, 0, 0.68, 0, false);
  if (metal === 'finisher') add(g, new THREE.TorusGeometry(0.03, 0.012, 8, 16).rotateX(Math.PI / 2), trim, 0, 0.42, 0, false); // a gold collar on the pink cup
  void c;
  // the game's emblem on top, turning slowly and bobbing; gold trophies also twinkle
  const em = emblem(look.emblem); em.position.y = 0.7; em.scale.setScalar(1.25); g.add(em);
  const sparkle = metal === 'gold' ? add(g, new THREE.OctahedronGeometry(0.025, 0), glow('#fff3b0'), 0.16, 0.8, 0.12, false) : null;
  g.userData.tick = (T: number) => {
    em.rotation.y = Math.sin(T * 0.6) * 0.6; em.position.y = 0.7 + Math.sin(T * 1.6) * 0.015;
    if (sparkle) { const k = (Math.sin(T * 2.3) + 1) / 2; sparkle.scale.setScalar(0.4 + k * 0.9); sparkle.rotation.y = T * 2; sparkle.position.set(Math.cos(T * 0.7) * 0.18, 0.75 + k * 0.06, Math.sin(T * 0.7) * 0.18); }
  };
  return g;
}
