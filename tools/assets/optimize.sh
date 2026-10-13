#!/bin/bash
# Optimizes a built kit for phones: dedupe + prune, textures ≤ 1024 px as WebP, meshopt-compressed + quantized geometry.
# usage: tools/assets/optimize.sh <kit> [max-texture-px]   (reads .out/<kit>.glb, writes public/models/kits/<kit>.glb)
set -e
cd "$(dirname "$0")"
KIT=$1; MAX=${2:-1024}
GT="${GLTF_TRANSFORM:-npx -y @gltf-transform/cli@4.1.1}"
mkdir -p ../../public/models/kits
T=.out/$KIT
$GT dedup .out/$KIT.glb $T.1.glb
$GT prune $T.1.glb $T.2.glb
$GT resize $T.2.glb $T.3.glb --width $MAX --height $MAX
$GT webp $T.3.glb $T.4.glb --quality 80
$GT meshopt $T.4.glb ../../public/models/kits/$KIT.glb --level medium
# the phone copy: textures at half size
$GT resize $T.4.glb $T.5.glb --width $((MAX / 2)) --height $((MAX / 2))
$GT meshopt $T.5.glb ../../public/models/kits/$KIT.m.glb --level medium
rm -f $T.[1-5].glb
ls -la ../../public/models/kits/$KIT.glb ../../public/models/kits/$KIT.m.glb
