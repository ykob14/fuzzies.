# Fuzzies

*Dream it fuzzy. Make it sharp.*

Fuzzies is a design studio for posters, social posts, stories, slides, cards, invitations and logos. It works on phones, tablets and computers. You can take a break in the built-in arcade game, **Fuzzy Crossing**, where you collect Fuzzies tokens to unlock premium templates, graphics, stickers, fonts, text effects, app themes and game skins.

It's built with TypeScript and Vite and uses no UI framework. It runs fully in the browser and installs as an app (PWA). It can also be wrapped as a native iOS or Android app with Capacitor.

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
  game/                Fuzzy Crossing + sound
  ui/                  app shell & router, dialogs, screens
```
