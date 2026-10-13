# Fuzzies Land asset pipeline

Models are built offline and shipped as optimised GLBs in `public/models/kits/` (`<kit>.glb` for computers, `<kit>.m.glb`
for phones with half-size textures). The game loads them with `src/land/assets/kit.ts` (`loadKit`, `clone`, `scatter`,
`releaseKit`). The hero Fuzzy is not a file: `src/game/fuzzyHero.ts` draws it (layered fur, eyes, mouth) to match the owner's picture.

1. `tools/assets/fetch_sources.sh` — downloads the CC0 source packs into `tools/assets/.sources/` (git-ignored).
2. Build with Blender's Python (`pip install bpy==5.1.2` in a Python 3.13 venv; run with `-I`):
   - `python -I tools/assets/build_orchard.py` → `.out/orchard.glb` (trees with fruit, ground cover, farmhouse, props, fruit, basket)
3. `tools/assets/optimize.sh <kit>` — dedupe/prune, textures ≤ 1024 px WebP (phone copy 512 px), meshopt compression.
   Uses `npx @gltf-transform/cli@4.1.1` (or `GLTF_TRANSFORM=<path to gltf-transform>`).
4. `python -I tools/assets/preview.py -- out.png file.glb` renders a quick Cycles preview to look at.

Rules: only CC0 sources with the creator's licence file (list them in `public/licenses/3d-assets.md`); keep every model a
named root node with its pivot on the ground; materials are simplified to base-colour textures for phones (`lib.simplify_materials`).
`lib.py` = shared Blender helpers, `props.py` = our own hand-built props.
