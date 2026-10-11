# Templates & My Designs — platform audit and plan

_Written 2026-10-11 by Claude Code. Scope: **Create → Templates, My Designs and the editor they open** (the rest of Fuzzies is
out of scope and must not change). Keep this file current: tick items off and move them between sections as work lands._

## How Canva does it (reference, from Canva's public developer docs)

Canva's documentation site (canva.dev) could not be opened from the Claude workspace (it has no general internet access), so
this summary is from Claude's existing knowledge of Canva's **public** Apps SDK and Connect API. Nothing here copies Canva
code, templates or content.

| Canva concept | What it means | Fuzzies equivalent |
|---|---|---|
| **Design / pages / elements** (Design Editing API) | A design is pages of typed elements: text (rich text), shapes (paths), images, videos, embeds, groups; each with position, size, rotation, transparency | `Design → Page → El` (`editor/types.ts`), versioned format v2 (`editor/model.ts`) |
| **Asset upload + references** | Media is uploaded once and referenced by id; elements point at the reference | `design.assets` (id → data URL) + `ImageEl.asset`; graphics referenced by art id |
| **Content types: image, SVG, text, shapes, groups** | SVG is a first-class vector asset type | `graphic` elements = recolourable SVG art from a registry |
| **Brand templates + Autofill (Connect API)** | Templates with named data fields that a dataset fills in | _Missing_ (see P3: placeholders) |
| **Content library + search** | Huge licensed library (photos, graphics, fonts) with keyword search and collections | Partial: art packs (~36), emoji stickers, photo search (Pexels/Openverse), 30+ Google fonts |
| **Data connectors / content extensions** | Third-party content inside the editor through official APIs | `api/assets.ts` (Pexels / Openverse, official APIs, credits) |
| **Template workflow** | Designers submit → review → publish; templates are categorised and tagged | Partial: draft → publish, revisions; no review/approval stage |
| **App UI Kit** | A consistent, accessible panel UI | Fuzzies has its own identity (raspberry on neutrals); panels share styles |

## Audit: what exists, what's partial, what's missing

### 1. Template database, search, categories, tags, recommendations
- ✅ Data-driven taxonomy (`content/library/taxonomy.json`: 7 categories, 83 topics), metadata separate from documents (`catalog.ts`).
- ✅ Client search with typo tolerance, synonyms, title weighting, usage boost; facet filters (format/style/colour/occasion/free).
- ✅ Server catalog (`fz_templates`): Postgres full-text search, paging, revisions; usage stats (`fz_template_uses`) → Trending/Popular.
- ✅ "Similar templates" (`related()`), recently used, recently added.
- 🟡 Recommendations are not personal (nothing uses *your* designs, sizes or topics).
- ❌ No seasonal surfacing (e.g. Halloween rising in October).
- ❌ Most built-in templates are typographic layouts (+ emoji motifs); there was no illustrated, hand-composed collection.

### 2. Asset library
- ✅ Recolourable SVG graphics (`content/art.ts`, 5 packs, ~36 simple shapes), emoji stickers, uploads, photo search with
  licences/credits, 30 Google fonts (OFL).
- ❌ No asset registry with tags, licence and author per asset; no search across graphics by meaning ("bat", "spooky").
- ❌ No illustration collections or scene backgrounds; everything ships in the main editor bundle (no lazy packs).
- ❌ Graphics carry no licence metadata (they are original, but nothing records it).

### 3. Editable template engine
- ✅ Layers (array order), groups, lock, hide, align/distribute, snapping + guides, pages, undo/redo, autosave.
- ✅ Typography: Google fonts, weight, italic, underline, case, spacing, line height, stroke, background, shadow, gradient fills, text presets.
- ✅ Effects: shadows, opacity, photo filters/adjustments, masks, crop/pan, gradients.
- ✅ Reusable layouts: 14 archetypes that lay out any wording in 8 formats (`layouts.ts`).
- ❌ Curved text, blend modes, per-element blur/glow presets for graphics.
- ❌ Template placeholders (named fields like *date*, *place* that can be filled in one step — Canva's autofill idea).
- ❌ "Apply palette to whole design" (recolour a template in one tap).

### 4. AI-assisted generation
- 🟡 Template managers can have Claude write wording that the layout engine lays out — only when `ANTHROPIC_API_KEY` +
  `ANTHROPIC_MODEL` are set in Vercel (not set today → switched off, and the app says so).
- ❌ Everyone-facing "describe your design" generation (needs the key, a per-user limit, and picking art from the asset registry).

### 5. Template management (create → review → approve → publish)
- ✅ Publish as template / update (revisions), Manage templates (publish, unpublish, edit, delete), managers via `ADMIN_EMAILS` or `fz_admins`.
- ❌ Review stage: `draft → in review → approved → published`, reviewer notes, who approved what.
- ❌ Automatic quality checks before publishing (text overflowing its box, low contrast, missing fonts, tiny text, empty pages).
- ❌ Version history with roll-back.

### 6. Performance
- ✅ Library is a lazy chunk; previews render lazily (IntersectionObserver), one per frame, cached for the visit.
- ✅ Editor caches layers while dragging; page picture while panning.
- ❌ Previews are re-drawn on every visit (no persistent cache); art packs are in the main bundle; grid not virtualised.

### 7. Editing experience
- ✅ Smart toolbar, docked inspector, drag-and-drop from panels, Preview, Download menu, photo credits, phone layouts.
- 🟡 Graphics panel has no search by meaning and no collections.

## Plan (priority order)

| # | Work | Why first | Status |
|---|---|---|---|
| **P1** | **Asset system**: registry with id, name, tags, kind, collection, licence, author; lazy-loaded collections; editor search by tags; designs load the collections they use automatically | Everything visual (templates, AI, search) builds on it | **This session** |
| **P1** | **Halloween collection**: original illustrations (pumpkins, jack-o'-lanterns, ghosts, haunted house, bats, moon, trees, graveyard, webs, spiders, cats, cauldron, hats, candy, candles, potions, lanterns, leaves) + scene backgrounds in 4 shapes | Owner's priority; shows the quality bar | **This session** |
| **P1** | **20 hand-composed Halloween templates**, fully layered and editable, replacing the typographic Halloween ones | Owner's priority | **This session** |
| P2 | Quality checks before publish (overflow, contrast, fonts, size) + review stage (`draft → review → approved → published`) with reviewer notes | Keeps a growing library professional | Next |
| P2 | Seasonal surfacing ("Halloween" row in October, by topic dates in the taxonomy) + personal recommendations (your sizes/topics) | Discovery | Next |
| P3 | Template placeholders (fill date/place/name once for the whole design) and one-tap palette swap | Faster editing | Later |
| P3 | Persistent preview cache (Cache Storage), virtualised grid, art packs fully lazy | Scale beyond ~1,000 templates | Later |
| P4 | AI "describe your design" for everyone: Claude picks topic, wording, layout and art ids from the registry; per-user daily limit; needs the owner's Anthropic key | Needs a key + cost decision by the owner | Waiting on owner |
| P4 | More collections (Christmas, Diwali, Lunar New Year, Easter, sports seasons) using the same asset system | Breadth | Later |

## Rules for new assets and templates

- **Only original or properly licensed content.** Fuzzies' illustrations are drawn in code for this project (licence:
  "Original Fuzzies artwork"). Photos come only through official APIs with their licence + credit kept on the element.
  Fonts only from Google Fonts (open licences). Never copy Canva (or anyone's) templates or artwork.
- Every asset records `license` and `author`; every template is fully layered (no flattened pictures of a whole design).
- Templates must pass: text fits its box, readable contrast, every font exists, nothing important outside the page.
