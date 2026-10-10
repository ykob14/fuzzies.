# Fuzzies Land — art direction

Every new building, character, icon or screen in Fuzzies Land should follow this page.

## The feel

**A cozy, fluffy island town on a sunny late morning.** Soft, plush and tactile, like felt toys and cotton
candy, but grounded with believable light and materials. Think "premium mobile city-builder" (clean,
readable, saturated), with our own twist: everything is **round and squishy**, and the Fuzzies live there.

Keywords: *rounded · chunky · warm light · soft shadows · pastel-but-saturated · tidy · alive*.

## Shapes

- **No sharp corners.** Every box is bevelled (radius 0.03–0.08 of a tile). Roofs have a thick, cushioned rim.
- **Chunky proportions.** Roofs ≈ 40–45 % of a building's height; doors and windows slightly oversized; thick frames.
- **Stand on a base.** Buildings sit on a stone plinth; fields on raised soil beds with wooden edging.
- **Readable from above.** Silhouettes and roof colours identify a building at a glance; details go on the
  front (+z) face, which looks towards the camera's side of the street.

## Colour palette

| Use | Colours |
|---|---|
| Grass | lawn `#8acb5c` with soft sunny `#bae476` patches · forest shade `#3f8f3a` |
| Soil / furrows | `#9a6640` · `#6e4429` |
| Road | asphalt `#9e978e`, kerbs/sidewalk cream `#efe4d0`, dashes `#fff4d8` |
| Sand / cliffs | sand `#f3dca2`, cliff `#c9a77e` → rock `#8e7a66` |
| Water | shallow `#7fe6dd` · mid `#2fbad0` · deep `#1b7fae` · foam `#ffffff` |
| Walls | cream `#fff4e3` · blush `#ffe3ea` · mint `#e2f5ea` · butter `#fff0c6` |
| Roofs (signature) | raspberry `#e45a78` · coral `#f2785c` · teal `#33ab9b` · sky `#5aa2e6` · butter `#f5c84c` |
| Wood | `#c98b55` light · `#9c6638` dark |
| Stone | `#e6ddd0` light · `#b9ad9c` dark |
| Accents | gold `#ffc94a` · sparkle pink `#ff9fc8` |

Raspberry `#d6336c` is the Fuzzies brand colour and the UI's main colour. No purple chrome and no rainbow
UI gradients (the owner dislikes them); colourful things live *in* the world (crops, flowers, the Rainbow Arch).

## Materials and light

- Matte surfaces (roughness 0.7–0.95). Only glass, water, gold and the golden statue are shiny.
- Textures are subtle and painted in code (`land/textures.ts`): shingles, plaster, planks, bricks, soil.
  No noisy speckle; variation comes from soft colour shifts.
- **Light:** warm sun from the upper left (≈ azimuth 215°, elevation 50°), cool sky fill, soft PCF shadows,
  and a soft contact shadow under every building. Neutral tone mapping keeps colours saturated.
- **Post:** a gentle grade (a little vibrance, soft vignette). No heavy bloom, no blur.

## Characters (the Fuzzies)

Round fur balls with tiny feet, big glossy eyes and blush, in soft pastels (pink is the hero colour).
They're never still: they breathe, shift their weight, blink, look around, look at you, hop and chat.
They cast a small soft shadow.

## Camera

3/4 "isometric" perspective: narrow field of view (≈ 30°), pitch ≈ 50°, yaw 45°. Smooth panning with inertia,
zoom towards the finger/cursor, pinch on phones, soft limits at the island's edge.

## Interface (in Fuzzies Land)

- **Panels:** warm cream (`#fffaf2`) with big rounded corners (24–28 px) and a soft shadow; titles in Fredoka.
- **Buttons:** chunky, with a darker "lip" underneath that presses in on tap. Primary = raspberry, secondary = cream.
- **Icons:** our own set (`ui/landIcons.ts`): coin, XP star, population, hammer, crate, barn, sparkles, music,
  gate, zoom. Filled shapes with a slightly darker outline and a white highlight, like stickers. No emoji in
  the HUD or dock (emoji are fine inside speech bubbles and item art).
- **Numbers** in Fredoka with tabular figures; they count up when they change.
- **Motion:** springy (cubic-bezier(.2,.9,.3,1.3)), 150–350 ms; nothing slower than half a second except arrivals.
- Fuzzies Land is **full-screen** (no app sidebar/tab bar); a back button returns to the app.
