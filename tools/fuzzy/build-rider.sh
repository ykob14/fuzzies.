#!/bin/bash
# Builds the Parking Escape drivers from the owner's public/models/fuzzy.glb, WebP texture + meshopt geometry:
#  - public/models/fuzzy-rider.glb   half the triangles (looks the same as the full model up close — compared side by side), ≈ 0.4 MB
#  - public/models/fuzzy-rider.m.glb a quarter (phones: each Fuzzy is ~40 px tall there, where it looks the same; up close the eyes
#    start to bend), ≈ 0.3 MB — keeps a busy lot at +28 % triangles instead of +55 %
# usage: bash tools/fuzzy/build-rider.sh   (meshoptimizer comes with @types/three; @gltf-transform/cli via npx)
set -e
cd "$(dirname "$0")/../.."
T=$(mktemp -d)
node tools/fuzzy/lods.mjs "$T" 0.5 0.25
GT="${GLTF_TRANSFORM:-npx -y @gltf-transform/cli@4.1.1}"
$GT webp "$T/fuzzy-050.glb" "$T/a.glb" --quality 85
$GT meshopt "$T/a.glb" public/models/fuzzy-rider.glb --level medium
$GT webp "$T/fuzzy-025.glb" "$T/b.glb" --quality 85
$GT meshopt "$T/b.glb" public/models/fuzzy-rider.m.glb --level medium
rm -rf "$T"
ls -la public/models/fuzzy-rider.glb public/models/fuzzy-rider.m.glb
