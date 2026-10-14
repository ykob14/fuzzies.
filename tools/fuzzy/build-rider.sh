#!/bin/bash
# Builds the Parking Escape drivers from the owner's public/models/fuzzy.glb, WebP texture + meshopt geometry:
#  - public/models/fuzzy-rider.glb   half the triangles (looks the same as the full model up close — compared side by side), ≈ 0.4 MB
#  (a quarter of the triangles was tried for phones and turned down: it bends the eyes — the owner's character comes first)
# usage: bash tools/fuzzy/build-rider.sh   (meshoptimizer comes with @types/three; @gltf-transform/cli via npx)
set -e
cd "$(dirname "$0")/../.."
T=$(mktemp -d)
node tools/fuzzy/lods.mjs "$T" 0.5
GT="${GLTF_TRANSFORM:-npx -y @gltf-transform/cli@4.1.1}"
$GT webp "$T/fuzzy-050.glb" "$T/a.glb" --quality 85
$GT meshopt "$T/a.glb" public/models/fuzzy-rider.glb --level medium
rm -rf "$T"
ls -la public/models/fuzzy-rider.glb
