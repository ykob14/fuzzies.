# Fuzzies

*Dream it fuzzy. Make it sharp.*

Fuzzies is a design studio for posters, social posts, stories, slides, cards, invitations and logos. It works on phones, tablets and computers. You can take a break in the built-in arcade game, **Fuzzy Crossing**, where you collect Fuzzies tokens to unlock premium templates, graphics, stickers, fonts, text effects, app themes and game skins.

It's built with TypeScript and Vite and uses no UI framework; the game's 3D graphics use Three.js. It runs fully in the browser and installs as an app (PWA). It can also be wrapped as a native iOS or Android app with Capacitor.

## Run it

```bash
cd fuzzies
npm install
npm run dev        # http://localhost:5173 (also printed with your LAN address for testing on a phone)
npm run build      # production build → fuzzies/dist
npm run preview    # serve the production build
```

To deploy on Vercel, set the project's **Root Directory** to `fuzzies`. `vercel.json` handles the rest.

## What's inside

| Area | Highlights | Code |
| --- | --- | --- |
| **Accounts & profile** | Sign up and log in (passwords are salted and hashed with PBKDF2), guest mode you can upgrade later, avatar (emoji, colour or your own photo), display name, bio, stats, change password, delete account. | `src/core/account.ts`, `src/ui/screens/auth.ts`, `profile.ts` |
| **Editor** | Text, shapes and lines, recolourable graphics, emoji stickers, photo upload (button, drag & drop, paste), freehand pen, highlighter and eraser. Move, resize and rotate with snapping guides, multi-select and marquee, align and distribute, layers (hide, lock, reorder), flip, opacity, shadows, undo/redo, copy/paste, keyboard shortcuts, pinch-zoom and pan, multiple pages, resize canvas, and autosave. | `src/editor/editor.ts` |
| **Text** | 28 Google Fonts in packs, weight, italic, underline, uppercase, alignment, solid or gradient colour, line height, letter spacing, outline, highlight, one-tap text styles, and inline editing on the canvas. | `props.ts`, `content/textstyles.ts` |
| **Photos** | Filter presets, brightness, contrast, saturation, warmth, hue, black & white and blur. Crop (zoom and pan), shape masks (circle, arch, blob, heart, star…), rounded corners, border, and set as background. | `props.ts`, `render.ts` |
| **Magic** | "Shuffle colour palette" recolours the whole page with a matching palette. | `panels.ts` |
| **Templates** | 28 templates across Social, Story, Poster, Flyer, YouTube, Presentation (multi-page), Business card, Invitation, Logo and Wallpaper. 12 sizes plus custom sizes. | `content/templates.ts`, `editor/doc.ts` |
| **Share & save** | PNG (transparent option, 0.5×–3×), JPG, multi-page PDF, and an editable `.fuzzies` project file. Copy to clipboard. On phones, the native share sheet saves to Photos or sends to any app. Projects can be imported back. | `editor/export.ts`, `share.ts` |
| **Themes** | Light, Dark and Match device, plus colourful themes: Sunset, Ocean, Forest, Candy, Neon Night, Lavender, Galaxy and Golden Hour. Custom accent colour. | `core/themes.ts`, `screens/settings.ts` |
| **Fuzzy Crossing** | A Frogger-style game. Hop across 5 lanes of traffic and 5 river lanes (logs and sinking lily pads), fill the 5 nests, and grab pink (+1) and golden (+5) Fuzzies. Levels speed up. Controls: keyboard, swipe, tap or on-screen D-pad. Synthesised sound and unlockable player skins. | `src/game/crossing.ts`, `screens/play.ts` |
| **Realistic 3D graphics** | The game is drawn in Three.js by default. It has a physical sky that lights the scene and reflects in the water, soft sun shadows, rippling water, asphalt with worn lane markings, swaying instanced grass, trees and hedges, and glossy clear-coat cars, trucks and buses. The Fuzzies have shell-rendered fur that bounces when they hop. Effects include splashes, ripples and sparkles. The time of day changes each level (day → golden hour → dusk, when headlights and street lamps switch on). On phones the camera follows the player. The 3D code is a separate download, loaded only when the game opens. Players can switch to Classic 2D, which is also used automatically when WebGL is unavailable. | `game/view3d.ts`, `models3d.ts`, `textures3d.ts`, `view2d.ts` |
| **Game intro** | Each game starts with a short cinematic. The camera opens on a close-up of your Fuzzy, which blinks, winks with a happy "^" eye and a sparkle, then bounces while the camera pulls back to show its fur. The camera then swoops out to the board and "Go!" pops up. Any tap, key or the Skip button skips it, and it's turned off when Reduce motion is on. It works in both 3D and Classic 2D. | `view3d.ts` (`playIntro`), `view2d.ts`, `screens/play.ts` |
| **Missions & badges** | Three new missions every day (one game, one creative, one either), each paying Fuzzies, plus +10 for finishing all three. There are 23 lifetime achievements with one-time rewards, shown on Home, Rewards and the profile. | `core/missions.ts`, `ui/missions.ts` |
| **Share links** | "Copy link" or "Send link" packs the design into the link itself, as compressed data after the `#`, with photos shrunk. There's no server and nothing is uploaded. Anyone can open it, download it, or remix their own editable copy. Someone without an account is taken through sign-up (or guest mode) and then straight into the remix. | `core/sharelink.ts`, `screens/shared.ts` |
| **Grouping** | Group several items (Ctrl/Cmd+G or the Group button) so they select, move and resize together. Click again to pick a single member, and Alt-click goes straight to it. Ctrl/Cmd+Shift+G ungroups. Copies of a group stay grouped. | `editor/editor.ts` |
| **Top scores** | Your 10 best Fuzzy Crossing runs, with medals, the level reached and the Fuzzy you played. Shown on the start and game-over cards. | `screens/play.ts` |
| **Living mascot** | The logo Fuzzy is rendered from the same furry 3D model as the game, as three snapshots (eyes open, wink, blink). On the page it bounces with squash and stretch over a soft shadow that shrinks mid-air. It winks or blinks every few seconds with a sparkle burst, and twinkling stars and fuzzy puffs float around it. Hovering makes it wink, and tapping it gives a big hop and a chime. **Tickle it:** wiggle the mouse back and forth over it (the cursor turns into a feather), or tap three times quickly on a phone. It squirms, squeezes its eyes into a big grin, giggles ("hee-hee-hee", synthesised) and "hehe!" bubbles float up. Sounds respect the sound setting. Devices without WebGL get an improved flat Fuzzy that winks too, and Reduce motion stops the animation. | `ui/mascot.ts`, `game/mascot3d.ts` |
| **QR codes** | Elements → QR code: paste a link and a real, scannable QR code is added to the design (byte mode, error-correction level M, versions 1–10, up to ~210 characters, best of 8 masks). Edit the link, the square colour and the background in the inspector. It only resizes from the corners, so it stays square. | `editor/qr.ts` |
| **Rewards** | Earn Fuzzies from the game (tokens, nests, levels), a daily visit streak (5 → 15), 1 per 5 active minutes of designing, and +2 per share (5 a day). Spend them on templates, graphics packs, sticker packs, font packs, Magic Text FX, themes and skins. | `core/rewards.ts`, `screens/rewards.ts` |

## Where data lives

Everything is stored on the device. Accounts and settings are in `localStorage`. Designs and uploaded photos are in IndexedDB, so they work offline, and a service worker caches the app shell. Accounts don't sync between devices yet. To add cloud accounts and share links, put a backend (Supabase, Firebase, etc.) behind `src/core/account.ts` and `src/core/db.ts`. Both are small, self-contained modules.

## Project layout

```
src/
  main.ts              boot: fonts, router, activity rewards, service worker
  styles.css           design system, themes, responsive layouts (phone ↔ desktop)
  core/                accounts, IndexedDB storage, rewards, themes, utils
  editor/              document model, canvas renderer, editor, panels, inspector, colour picker, export, share
  content/             templates, art packs, sticker packs, fonts, text styles
  game/                Fuzzy Crossing rules, 3D and 2D views, procedural models & textures, sound
  ui/                  app shell & router, dialogs, screens
```
