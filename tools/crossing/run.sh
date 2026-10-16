#!/bin/bash
# usage: bash tools/crossing/run.sh check.ts   — bundles a DOM-free checker with esbuild and runs it in Node
cd "$(dirname "$0")/../.."
mkdir -p tools/crossing/.out
f="$1"; shift
node_modules/.bin/rolldown "tools/crossing/$f" --platform node --format esm --file "tools/crossing/.out/${f%.ts}.mjs" && node "tools/crossing/.out/${f%.ts}.mjs" "$@"
