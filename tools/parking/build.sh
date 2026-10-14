#!/bin/bash
# Build all levels on 4 cores, then merge: bash tools/parking/build.sh [endless-count]
cd "$(dirname "$0")/../.."
bash tools/parking/lib.sh
for p in 0 1 2 3; do node --experimental-strip-types tools/parking/generate.ts $p 4 ${1:-300} > tools/parking/out/log-$p.txt 2>&1 & done
wait
node --experimental-strip-types tools/parking/merge.ts
