# Instructions for AI agents working on Fuzzies

1. **Read `PROGRESS.md` first.** It has what's built, the architecture, the owner's preferences and what's next.
2. **Owner preferences that matter most:** one consistent raspberry brand colour (`#d6336c`, dark `#ff6b9a`) on neutrals,
   no purple UI and no multi-colour gradients; cute, playful touches; plain-language replies with screenshots.
3. **Before every commit:** run `npm run build` (it type-checks and builds). Don't commit a red build.
4. **Save to GitHub often:** commit and push after each working feature. Work on a branch, then ask the owner before
   merging to `main` (unless they've already said to). Don't open pull requests unless asked.
5. **Keep it simple:** no UI framework, no new runtime dependencies without a good reason, no image assets
   (textures and models are procedural). Data is on-device first; the optional Supabase backend syncs it (see `BACKEND.md`).
   Never commit secrets — only the public Supabase URL/anon key are ever used by the app.
6. **Keep saved data compatible:** new account fields go into `fresh()` in `src/core/account.ts` so `migrate()` fills them in.
7. **At the end of your session, update `PROGRESS.md`:** the "Status" table, a row in the "Build log", "Known limitations"
   and "Next up", plus the "Last updated" line. Commit it with your work so the next agent can pick up where you left off.
