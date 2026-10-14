/**
 * Lighter versions of the owner's 3D Fuzzy (public/models/fuzzy.glb) for places that show many at once (Parking Escape's
 * drivers): meshoptimizer's attribute-aware simplifier keeps the UVs (the face is painted in the texture) and the normals,
 * the texture is copied unchanged. node tools/fuzzy/lods.mjs <out-dir> <ratio> [<ratio> …]   e.g. 0.5 0.25 0.12
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { MeshoptSimplifier as S } from 'meshoptimizer';

const [, , outDir, ...ratios] = process.argv;
const src = readFileSync(new URL('../../public/models/fuzzy.glb', import.meta.url));
const jl = src.readUInt32LE(12); const j = JSON.parse(src.subarray(20, 20 + jl).toString()); const B = 20 + jl + 8;
const acc = (i) => { const a = j.accessors[i], bv = j.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
  const T = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType]; const off = B + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  return new T(src.buffer.slice(src.byteOffset + off, src.byteOffset + off + a.count * n * T.BYTES_PER_ELEMENT)); };
const prim = j.meshes[0].primitives[0];
const idx = Uint32Array.from(acc(prim.indices)), pos = acc(prim.attributes.POSITION), uv = acc(prim.attributes.TEXCOORD_0), nor = acc(prim.attributes.NORMAL);
const imgBv = j.bufferViews[j.images[0].bufferView]; const jpg = src.subarray(B + (imgBv.byteOffset ?? 0), B + (imgBv.byteOffset ?? 0) + imgBv.byteLength);
await S.ready;
const nv = pos.length / 3;
const attrs = new Float32Array(nv * 5); for (let v = 0; v < nv; v++) { attrs.set([uv[v * 2], uv[v * 2 + 1], nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]], v * 5); }
for (const r of ratios.map(Number)) {
  const [out, err] = S.simplifyWithAttributes(idx, pos, 3, attrs, 5, [1.5, 1.5, 0.4, 0.4, 0.4], null, Math.floor((idx.length * r) / 3) * 3, 0.05, ['Permissive']);
  // compact: keep only the vertices still used
  const map = new Int32Array(nv).fill(-1); let n = 0; for (const v of out) if (map[v] < 0) map[v] = n++;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), I = new Uint32Array(out.length);
  for (let v = 0; v < nv; v++) if (map[v] >= 0) { const k = map[v]; P.set(pos.subarray(v * 3, v * 3 + 3), k * 3); N.set(nor.subarray(v * 3, v * 3 + 3), k * 3); U.set(uv.subarray(v * 2, v * 2 + 2), k * 2); }
  out.forEach((v, k) => { I[k] = map[v]; });
  const name = `${outDir}/fuzzy-${String(Math.round(r * 100)).padStart(3, '0')}.glb`;
  writeFileSync(name, glb(P, N, U, I, jpg));
  console.log(`${name}: ${I.length / 3} triangles (${Math.round((I.length / idx.length) * 100)}%), ${n} vertices, error ${(err * 100).toFixed(2)}%`);
}
function glb(P, N, U, I, img) {
  const pad = (b) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);
  const parts = [Buffer.from(P.buffer), Buffer.from(N.buffer), Buffer.from(U.buffer), Buffer.from(I.buffer), Buffer.from(img)].map(pad);
  let off = 0; const views = parts.map((b) => { const v = { buffer: 0, byteOffset: off, byteLength: b.length }; off += b.length; return v; });
  views[4].byteLength = img.length;
  const mn = [0, 1, 2].map((c) => Math.min(...P.filter((_, k) => k % 3 === c))), mx = [0, 1, 2].map((c) => Math.max(...P.filter((_, k) => k % 3 === c)));
  const json = { asset: { version: '2.0', generator: 'fuzzies tools/fuzzy/lods.mjs' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'fuzzy' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
    materials: [{ name: 'fuzzyFur', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, roughnessFactor: 0.85, metallicFactor: 0 } }],
    textures: [{ source: 0 }], images: [{ mimeType: 'image/jpeg', bufferView: 4 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: P.length / 3, type: 'VEC3', min: mn, max: mx }, { bufferView: 1, componentType: 5126, count: N.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: U.length / 2, type: 'VEC2' }, { bufferView: 3, componentType: 5125, count: I.length, type: 'SCALAR' }],
    bufferViews: views, buffers: [{ byteLength: off }] };
  const jb = Buffer.from(JSON.stringify(json)); const jp = Buffer.concat([jb, Buffer.alloc((4 - (jb.length % 4)) % 4, 0x20)]);
  const bin = Buffer.concat(parts);
  const h = Buffer.alloc(12); h.writeUInt32LE(0x46546c67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + jp.length + 8 + bin.length, 8);
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(jp.length, 0); c1.writeUInt32LE(0x4e4f534a, 4);
  const c2 = Buffer.alloc(8); c2.writeUInt32LE(bin.length, 0); c2.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([h, c1, jp, c2, bin]);
}
