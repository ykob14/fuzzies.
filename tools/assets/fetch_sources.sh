#!/bin/bash
# Downloads the CC0 source packs the asset builds use into tools/assets/.sources (git-ignored). Every pack ships its creator's
# own licence file (CC0 1.0); see public/licenses/3d-assets.md for the list.
set -e
cd "$(dirname "$0")"; mkdir -p .sources; cd .sources
MIRROR=https://github.com/Noisemaker111/jgengine/releases/download/packs   # a GitHub mirror of the creators' free zips
get_zip() { [ -d "$1" ] || { curl -sSL -o "$1.zip" "$MIRROR/$2.zip"; mkdir "$1"; (cd "$1" && unzip -q "../$1.zip"); rm "$1.zip"; }; }
get_zip quaternius-nature quaternius-quaternius-stylized-nature     # Quaternius — Stylized Nature MegaKit (standard, CC0)
get_zip quaternius-village quaternius-quaternius-medieval-village   # Quaternius — Medieval Village MegaKit (standard, CC0)
[ -d kaykit-restaurant ] || git clone -q --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Restaurant-Bits-1.0 kaykit-restaurant   # Kay Lousberg (CC0)
grep -l "CC0" */License*.txt */LICENSE* 2>/dev/null
