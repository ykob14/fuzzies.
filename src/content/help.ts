/**
 * The Fuzzies help guide: what each part of the site does, in plain words.
 * It is the ONLY thing the Fuzzy assistant knows about the site (the server puts it in the AI's instructions),
 * and it is the built-in "Quick help" when the AI isn't switched on. No DOM, no imports — the api/ functions read it too.
 * Keep it accurate: when a feature changes, change its topic here.
 */
export interface HelpTopic {
  id: string;
  title: string;
  /** Screens where this topic is most relevant (router names; '*' = everywhere). */
  screens: string[];
  keywords: string[];
  body: string;
  /** Example questions people ask about this (shown as suggestion chips). */
  asks?: string[];
}

export const APP_FACTS = `Fuzzies ("Dream it fuzzy. Make it sharp.") is a design app for phones and computers with a built-in game, Fuzzy Crossing,
and a town-builder, Fuzzies Land. Fuzzies (the tokens) are earned by designing, playing and showing up every day, or bought; they unlock
premium templates, graphics, stickers, fonts, text effects, app themes and game looks. The mascot (a fluffy Fuzzy) lives in the logo.
Screens: Home (#/home), Templates (#/templates), My designs (#/projects), the editor (#/edit/<id>), Play = Fuzzy Crossing (#/play),
Fuzzies Land (#/land), Rewards (#/rewards), Profile (#/profile), Settings (#/settings). On phones the tab bar at the bottom has
Home, Designs, + (create), Play, Fland and Me. On computers the menu is on the left (it folds into icons with the arrow button).
Quick find: Ctrl/Cmd+K or the search box at the top jumps to any screen, template or design.`;

export const HELP: HelpTopic[] = [
  {
    id: 'start', title: 'Getting started', screens: ['home', 'welcome', 'login', 'signup'],
    keywords: ['start', 'begin', 'new', 'first', 'what is', 'how does', 'overview', 'tour'],
    body: `Create a design from the + button (pick a size such as Instagram post, Story, Poster, Presentation, YouTube, Logo, Invitation or
Custom) or start from a template. Everything you make saves automatically. Earn Fuzzies by designing, exporting, playing Fuzzy Crossing,
building in Fuzzies Land, finishing daily missions and coming back daily. You can use Fuzzies as a guest on one device, or create an account
(email + password, or a crypto wallet) so your designs and progress sync to every device.`,
    asks: ['What can I do here?', 'How do I make my first design?', 'How do I earn Fuzzies?'],
  },
  {
    id: 'accounts', title: 'Accounts & logging in', screens: ['welcome', 'login', 'signup', 'profile'],
    keywords: ['account', 'sign up', 'signup', 'register', 'log in', 'login', 'sign in', 'guest', 'password', 'email', 'username', 'sync', 'device'],
    body: `Sign up with an email and password, or continue with a crypto wallet (see Wallets). A guest account lives only on this device; a real account
syncs designs, uploads, Fuzzies, progress and your town across devices (it needs the site's cloud mode, which is on for the live site).
Forgot your password? On the log-in screen tap "Forgot your password?" and an email with a one-hour reset link is sent (if the account has an
email and email sending is switched on for the site). Change your password, link wallets, delete the account or sign out in Profile → Account & login.
Usernames and the log-in email can't be changed in the app yet. Signing out on a device removes the local copy; the cloud copy stays.`,
    asks: ['How do I reset my password?', 'Do my designs sync to my phone?', 'Can I change my username?'],
  },
  {
    id: 'home', title: 'Home screen', screens: ['home'],
    keywords: ['home', 'banner', 'recent', 'popular', 'missions', 'search'],
    body: `Home shows a search box (type anything to find templates, designs or screens), quick size shortcuts, your recent designs, popular templates,
Play & earn (Fuzzy Crossing and Fuzzies Land) and today's missions.`,
  },
  {
    id: 'templates', title: 'Templates', screens: ['templates'],
    keywords: ['template', 'templates', 'gallery', 'search', 'category', 'holiday', 'collection', 'hebrew', 'arabic', 'filter', 'blank'],
    body: `Hundreds of original templates in categories (business, education, sports, creators, celebrations, Islamic, Jewish, Christian, cultural
festivals, baby, milestones and more) and illustrated holiday collections (Halloween, Christmas, Hanukkah, Passover, Ramadan & Eid, Easter,
Diwali, Lunar New Year, Nowruz, weddings…). Search understands typos, other spellings and other languages (Hebrew, Arabic, Hindi, Chinese…).
Filter by shape (post, story, poster…), style, colour, occasion, free/premium and type (greetings, invitations, parties, social, flyers, posters).
Recently used, Trending and Popular rows appear once there is usage. Tap a template to preview it and see similar ones, then Use it:
a copy opens in the editor (templates themselves never change). Premium templates unlock with Fuzzies in Rewards.`,
    asks: ['How do I find a Hanukkah card?', 'Can I use a template for free?', 'Where are the Instagram templates?'],
  },
  {
    id: 'designs', title: 'My designs', screens: ['projects'],
    keywords: ['my designs', 'projects', 'folder', 'duplicate', 'delete', 'rename', 'open', 'saved'],
    body: `My designs lists everything you made, newest first, with folders to sort them. Tap a design to open it in the editor; the ⋯ menu
duplicates, renames, moves to a folder, shares or deletes it. Designs save automatically while you edit.`,
    asks: ['Where are my saved designs?', 'How do I put designs in folders?'],
  },
  {
    id: 'editor', title: 'The editor', screens: ['edit'],
    keywords: ['editor', 'canvas', 'text', 'font', 'shape', 'photo', 'upload', 'sticker', 'draw', 'background', 'layer', 'page', 'undo', 'group',
      'resize', 'rotate', 'align', 'snap', 'grid', 'zoom', 'colour', 'color', 'gradient', 'effect', 'curved', 'qr', 'toolbar', 'inspector', 'autosave', 'save'],
    body: `Left panels: Templates, Elements (shapes, graphics, illustrated collections, QR codes), Text, Uploads (your pictures), Photos (free stock photos),
Stickers, Draw, Background and Layers. Drag anything from a panel onto the page, or tap it to add it. The toolbar above the canvas shows the
useful controls for what you selected (font, size, colour, bold, align, fill, border, position, transparency); "All options" opens the full
inspector (text effects such as shadow, outline, glow, curved text; filters and masks for photos; Replace artwork for graphics). Multi-select
with Shift or by dragging a box; group with Ctrl/Cmd+G. Undo Ctrl/Cmd+Z, redo Ctrl/Cmd+Shift+Z. Pages: add, duplicate and reorder at the bottom.
View menu: smart guides, grid, snap to grid. Preview shows the pages full screen. Your design saves itself (the chip says Saving / Saved);
Ctrl/Cmd+S saves right away. Brand colours and fonts (Settings → Brand kit) appear first in every colour and font picker.`,
    asks: ['How do I curve text?', 'How do I add my own photo?', 'How do I make a QR code?', 'How do I group things?'],
  },
  {
    id: 'export', title: 'Download & share', screens: ['edit', 'projects'],
    keywords: ['download', 'export', 'png', 'jpg', 'pdf', 'share', 'link', 'print', 'save to phone', 'instagram', 'file', 'fuzzies file', 'credit'],
    body: `In the editor, Download offers PNG, JPG, PDF (all pages) and a .fuzzies project file (reopen or send to a friend). Share makes a link
anyone can open without an account to view, download or remix the design; on phones the share sheet sends it straight to apps.
Each export earns a few Fuzzies (once per day per design). Download → Photo credits lists the stock photos you used.`,
    asks: ['How do I download as PDF?', 'How do I share a design with a friend?'],
  },
  {
    id: 'rewards', title: 'Fuzzies & rewards', screens: ['rewards', 'home'],
    keywords: ['fuzzies', 'tokens', 'coins', 'balance', 'earn', 'reward', 'unlock', 'premium', 'daily bonus', 'streak', 'time bonus', 'missions', 'achievements', 'badge', 'shop', 'buy', 'pack'],
    body: `Your Fuzzies balance is the pink chip at the top (tap it for Rewards). Ways to earn: a daily bonus for showing up (bigger with a streak),
2–10 Fuzzies for every 30 minutes you actively use the app, 1–5 for every 30 minutes playing Fuzzy Crossing or Fuzzies Land, points in Fuzzy
Crossing, exports, daily missions (3 a day plus a bonus for all three), achievements, and every level in Fuzzies Land. Rewards lists the premium
templates, graphic packs, sticker packs, fonts, text effects, app themes and game looks you can unlock, with a Use button once unlocked.
"Get more Fuzzies" sells packs: 100 for $0.99, 550 for $4.99, 1,200 for $9.99 and 3,000 for $19.99 (see Buying Fuzzies).`,
    asks: ['How do I earn Fuzzies faster?', 'What can I unlock?', 'Where is my daily bonus?'],
  },
  {
    id: 'missions', title: 'Daily missions & achievements', screens: ['home', 'rewards', 'profile'],
    keywords: ['mission', 'missions', 'daily', 'achievement', 'badge', 'streak', 'progress'],
    body: `Three fresh missions every day (design, export, play, build…) each pay Fuzzies, and finishing all three pays a bonus. Achievements are
one-time badges for milestones (first design, scores, exports, Fuzzies Land levels, collections…) shown in Profile.`,
  },
  {
    id: 'game', title: 'Fuzzy Crossing (the game)', screens: ['play'],
    keywords: ['game', 'play', 'fuzzy crossing', 'frogger', 'hop', 'score', 'cars', 'river', 'skin', 'look', '3d', 'classic', '2d', 'controls', 'intro'],
    body: `Hop your Fuzzy across roads and rivers: arrow keys, WASD, swipes or the on-screen arrows. Reach the nests to score; levels get faster and
the time of day changes. Points earn Fuzzies and your top 10 scores are kept. The game is realistic 3D; Classic 2D is in the game menu
(also used automatically when a device has no WebGL). Unlockable looks (skins) change your Fuzzy. The Crossing Gate in Fuzzies Land jumps
straight into the game and back.`,
    asks: ['How do I play?', 'How do I switch to the 2D game?', 'How do I change my Fuzzy’s look?'],
  },
  {
    id: 'land', title: 'Fuzzies Land basics', screens: ['land'],
    keywords: ['fuzzies land', 'fland', 'town', 'city', 'build', 'house', 'field', 'crop', 'bakery', 'popcorn', 'weaver', 'order', 'barn', 'level', 'xp', 'expand', 'coins', 'town coins', 'construction', 'speed up', 'residents', 'pip'],
    body: `Fuzzies Land is your island town. The bottom toolbar has Build (houses, farm, workshops, decor, roads, a Fuzzies tab), Collect
(gather everything ready), Orders (deliver goods for coins and XP), Barn (your goods) and Festival (seasonal events). Town coins are
earned in the town and buy most buildings; Fuzzies (the app tokens) buy speed-ups, special decor and coin chests. Buildings take real time
to build and crops/workshops keep going while the app is closed. Houses add residents, who walk the streets, visit homes and farm; tap one to
hear it giggle. Each level pays Fuzzies and unlocks more; land expansions add room. Everything saves after every action and syncs with your
account. Pip (the guide) runs the first-time tutorial; replay it from Settings → Help. Music and seasonal effects switch off in Settings.`,
    asks: ['How do I earn town coins?', 'Why is my building still under construction?', 'How do I get more residents?', 'How do I replay the tutorial?'],
  },
  {
    id: 'landcontrols', title: 'Fuzzies Land controls', screens: ['land'],
    keywords: ['move', 'rotate', 'turn', 'pan', 'zoom', 'camera', 'drag', 'keyboard', 'wasd', 'pinch', 'place', 'placement', 'red', 'green', 'quick menu', 'hold'],
    body: `Drag to look around, wheel/pinch to zoom (double-tap zooms too); WASD or arrow keys pan, + and − zoom. Tap a building for its quick menu
(Move / Turn) or its panel; on touch screens press and hold a building to pick it up. While placing: the marker is green when it fits and red
with the reason when it doesn't (overlap, water too close to a road, outside your land). R turns the piece, Enter confirms, Escape cancels.
Drag across empty grass with Road or Path selected to lay a stretch at once.`,
    asks: ['How do I move a building?', 'Why can’t I place this here?', 'How do I rotate a house?'],
  },
  {
    id: 'landedit', title: 'Town Edit Mode & storage', screens: ['land'],
    keywords: ['edit mode', 'town edit', 'select', 'multi', 'storage', 'store', 'box', 'restore', 'undo', 'redo', 'cancel', 'save layout', 'rearrange', 'remove', 'sell'],
    body: `The Edit button (side of the screen) opens Town Edit Mode: tap pieces to select them (Shift-click, double-tap a road or field to select the
connected stretch, or drag / hold-and-drag an empty spot to select an area), then Move the group, Turn it, put it in Storage or Remove it.
Storage keeps buildings, decorations, fences and roads safely out of the way (crops and queued goods are kept) — Store selected, Store all,
or Store by category — and the Storage drawer restores one, several or everything. Undo/Redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z) covers every step,
Cancel puts the town back exactly as it was, Done saves the new layout. If the app closes mid-edit you can resume or discard the session.`,
    asks: ['How do I move several buildings at once?', 'Where did my stored buildings go?', 'Can I undo a change in my town?'],
  },
  {
    id: 'events', title: 'Seasonal events & collectibles', screens: ['land'],
    keywords: ['event', 'festival', 'holiday', 'season', 'seasonal', 'collectible', 'collection', 'rare', 'token', 'tokens', 'challenge', 'christmas', 'hanukkah', 'halloween', 'ramadan', 'eid', 'diwali', 'passover', 'easter', 'lunar new year', 'snow', 'leaves', 'lanterns'],
    body: `During holidays the Festival button lights up: the island changes mood (falling leaves, snow, lanterns…) and the event shop sells that
year's collectible decorations (common to legendary), each stamped with its year and never sold again. Pay with event tokens earned by
delivering orders, harvesting and finishing event challenges (some pieces cost Fuzzies). Everything you own is kept forever in My collection
and can be placed, stored and moved like any decoration. The calendar follows real dates (moveable feasts included) and several events can
overlap. Seasonal effects can be switched off in Settings.`,
    asks: ['What is the festival button?', 'How do I earn event tokens?', 'Will these decorations come back next year?'],
  },
  {
    id: 'adventures', title: 'Fuzzies Adventures (daily missions & mini-games)', screens: ['land'],
    keywords: ['adventure', 'adventures', 'mission', 'daily mission', 'boat', 'race', 'boat race', 'forest', 'chop', 'tree', 'wood', 'hairball', 'vacuum', 'hairballs', 'festival', 'talk', 'character', 'personality', 'pom', 'host', 'reward', 'complete', 'completed', 'contest', 'rival', 'lumberjack', 'five hours', 'new missions', 'set', 'laps', 'checkpoint', 'steer', 'joystick', 'combo', 'tier', 'golden', 'fruit', 'maze', 'balloon', 'treasure', 'fishing', 'obstacle', 'harvest', 'garden', 'delivery', 'mining', 'firefighter', 'fire', 'snowball', 'beach', 'skating', 'skate', 'mini-game', 'mini-games', 'games', 'kart', 'dolphin', 'cooking', 'coming soon'],
    body: `Every Fuzzy walking around your town is a character with a name and a personality (Adventurer, Farmer, Builder, Explorer, Fisher,
Decorator, Nature keeper, Baker). Tap one: the camera glides in, it says hello and a card shows who it is, its adventure (objective, time
limit, rewards) and Start Adventure / Maybe later. MISSIONS COME IN SETS OF THREE: three different Fuzzies each have a mission (the
pill under the level badge says how many are done, the compass side button opens the Adventures panel with all three, who has them,
the rewards and a Find button that flies the camera to that Fuzzy). Finish them in any order, there is no deadline, and a finished one
shows a green Completed mark over its Fuzzy. ONCE ALL THREE ARE DONE, A NEW SET ARRIVES TEN MINUTES LATER (the panel counts down; an
unfinished mission is never lost; sets don't pile up). For accounts the server's clock decides, so changing the phone's time
doesn't bring missions sooner. Each mission pays town coins and XP once; some come with a twist (Wild Water race, Deep Woods forest,
Golden Day vacuum). Boat Race: three laps
around Palm Island through the numbered gates in order; steer with A/D or the arrows (W accelerates, S brakes) or hold the left/right
side of the screen on a phone; if you miss a gate the screen says MISSED CHECKPOINT and the arrow points back — go through it again;
stay inside the buoys; later laps add barrels, boost pads, currents, logs and waves; 1st = 100 coins, 2nd 60, 3rd 30. Forest Challenge
(70 seconds, a lumberjack contest against three town Fuzzies): tap any tree and your Fuzzy walks there by itself (or walk with
WASD/arrows, the mouse, or the on-screen joystick on a phone), then tap CHOP (or Space, or the tree itself) when the marker is in the
green; EVERY tree can be cut — bigger ones take more hits and score more, trees with a glowing ring pay ×1.5, sparkly ones hide a
bonus, walk over the wood that flies out for +5 each, perfect hits in a row multiply; the other Fuzzies cut trees too and a tree someone
is already on is theirs; the live standings are in the corner; most points when the sun sets wins — 1st 100 coins, 2nd 65, 3rd 35,
4th 15. Hairball
Vacuum Challenge (70 seconds): walk around the garden with the vacuum — hairballs in front of the nozzle are pulled in (10 points, big
ones 25, golden 100), quick pick-ups chain into a multiplier, the canister empties itself with a bonus. The vacuum pays by tier:
top tier 100 coins, then 65, 35, 15. THE LIBRARY HAS 17 PLAYABLE MINI-GAMES (each set of three is drawn from it, never the same game
twice in a set): Boat Race, Forest Challenge, Hairball Vacuum, Fruit Catcher (catch the falling fruit in your basket, dodge the pine
cones), Fuzzy Maze (find the three keys in the hedge maze, tap where to walk, then the gate opens), Balloon Pop (tap the balloons
before they float over the roofs; shiny 50, dark spiky ones break the chain), Island Treasure Hunt (walk the beach, the meter goes
WARM then HOT near treasure, then DIG), Fishing Frenzy (tap the water to cast, HOOK on the bite, hold REEL but let go when the line
goes red), Obstacle Run (three lanes: swipe or A/D to change lane, swipe up / ↑ to jump logs and puddles, swipe down / ↓ to duck under vines, go round rocks, rolling boulders and carts, bounce on mushrooms for high stars, grab a shield, star magnet or speed boost; the 🔊 button mutes it), Fuzzie Brawl Arena (3 vs 3: pick a power — Energy Burst, Bubble Shield, Zoom Dash or Bloom Heal — then WASD + mouse or two thumb sticks; knockouts and holding the Sunflower ring score, first to 10 wins; hide in bushes), Farm Harvest Rush
(pick the ripe plants before they wilt), Garden Cleanup (hold PULL on the weeds, never trample the flower beds), Package Delivery
(a cart: load at the depot, bring parcels to the glowing doors, steer round the lamp posts and the flower bed — crashing into them knocks a parcel off), Mining Adventure (dig the gem piles, step
away when the ceiling rumbles), Firefighter Fuzzy (hold SPRAY at the flames, refill the tank at the pond, save the cottages), Snowball
Challenge (tap a target to throw, moving and far targets pay more), Beach Cleanup (pick up the litter before the tide takes it, drop
a full bag in the bin, hop over the crabs) and Ice Skating (lean left/right to steer on the sliding ice, glide through the lit gates
in order, SPIN once between gates for style, miss the snowmen). Every one has gold / silver / bronze score tiers (shown on its card),
runs on phones (on-screen joystick or tap) and computers (WASD/arrows, Space for the action, mouse/click), can be paused and restarted
mid-run, and keeps your best score. Kart Race, Dolphin Adventure and Fuzzy Cooking are listed as coming soon. Rewards are town coins
only — never Fuzzies tokens or crypto.`,
    asks: ['How do I start an adventure?', 'How do I steer the boat?', 'Why didn’t I get coins for the race?', 'Which Fuzzy has today’s mission?', 'How does the hairball vacuum work?', 'Can I cut any tree in the forest?', 'When do I get new missions?', 'Why can’t I play the challenge again?', 'Which mini-games are there?', 'How do I play the ice skating?'],
  },
  {
    id: 'wallets', title: 'Crypto wallets & wallet log-in', screens: ['profile', 'login', 'signup', 'welcome'],
    keywords: ['wallet', 'crypto', 'metamask', 'coinbase', 'trust', 'phantom', 'robinhood', 'crypto.com', 'okx', 'rabby', 'rainbow', 'walletconnect', 'qr', 'smart wallet', 'link', 'unlink', 'sign in with ethereum', 'seed', 'recovery phrase', 'activation', 'gift box', 'safe'],
    body: `Profile → Account & login shows your log-in ways: email + password and up to 5 linked crypto wallets. Linking asks you to confirm with your
password (or an already linked wallet) and to sign a message in the wallet — never a transaction. After that you can log in by signing with
the wallet, and you can even sign up with only a wallet. Works with MetaMask, Coinbase Wallet, Trust Wallet, Crypto.com Onchain, Robinhood
Wallet, OKX, Phantom, Rabby, Rainbow, smart wallets, and any wallet app through a WalletConnect QR code (computers show the code, phones open
the app). Safety: Fuzzies never asks for a recovery phrase or private key, you can't remove your last way to log in, one wallet belongs to one
account, and the owner is emailed about every new link. Activating a wallet for payments costs $0.50 once per wallet and opens a gift box
with 100 Fuzzies. Ethereum-style wallets only for log-in (Solana and Bitcoin wallets are for paying).`,
    asks: ['How do I connect MetaMask?', 'Is linking a wallet safe?', 'Can I log in with my wallet on another device?', 'What is the $0.50 activation?'],
  },
  {
    id: 'pay', title: 'Buying Fuzzies', screens: ['rewards', 'land', 'profile'],
    keywords: ['buy', 'purchase', 'pay', 'payment', 'price', 'pack', 'eth', 'usdc', 'usdt', 'sol', 'solana', 'base', 'bitcoin', 'btc', 'bnb', 'card', 'apple pay', 'bank', 'refund', 'pending', 'confirm', 'transaction', 'fee', 'gas'],
    body: `Rewards → Get more Fuzzies (or the Fuzzies counter in Fuzzies Land) sells packs: 100 for $0.99, 550 for $4.99, 1,200 for $9.99, 3,000
for $19.99. Pay with ETH or USDC on Base or Ethereum, SOL or USDC on Solana, USDT or USDC on BNB Chain, ETH on Robinhood Chain, or Bitcoin.
The window shows the exact amount, the address, a QR code and a countdown; "Pay with my wallet" first checks the wallet holds enough including
the network fee (it stays locked, with a calm note, until it does) and only then asks the wallet to send. Fuzzies arrive after the network
confirms (seconds to a few minutes; Bitcoin longer), and a sent payment is picked up again if the app closes. "Card, Apple Pay or bank" uses
your wallet app's own Buy/Add cash first, then pays as crypto; Fuzzies never sees card details. Refunds are manual — contact the site owner.`,
    asks: ['How do I buy Fuzzies?', 'Can I pay with a card?', 'My payment is still pending — what now?'],
  },
  {
    id: 'themes', title: 'Themes, app icon & brand kit', screens: ['settings'],
    keywords: ['theme', 'dark mode', 'light mode', 'accent', 'colour', 'color', 'app icon', 'icon', 'home screen', 'install', 'brand kit', 'brand colours', 'logo', 'fonts'],
    body: `Settings → Appearance: light, dark or match device, extra themes (unlock with Fuzzies) and an accent colour. App icon: choose the Fuzzy colour
and background for the icon when you add Fuzzies to your home screen or desktop (re-add it to see a change). Brand kit: your colours, heading
and body fonts and a logo, shown first in the editor's pickers and under Uploads. Quick toggle: the avatar menu at the top switches dark mode.`,
    asks: ['How do I turn on dark mode?', 'How do I change the app icon?', 'How do I save my brand colours?'],
  },
  {
    id: 'settings', title: 'Settings', screens: ['settings'],
    keywords: ['settings', 'sound', 'music', 'reduce motion', 'snap', 'seasonal effects', 'help', 'tutorial', 'assistant', 'fuzzy helper', 'licences'],
    body: `Settings has Appearance, App icon, Brand kit, Editing (snap to guides), Sound & motion (game sounds, music in Fuzzies Land, seasonal effects,
reduce motion), Fuzzy helper (show or hide this assistant and its voice; it never shows inside Fuzzy Crossing or Fuzzies Land), Help (replay the Fuzzies Land tutorial) and licences.`,
  },
  {
    id: 'profile', title: 'Profile', screens: ['profile'],
    keywords: ['profile', 'avatar', 'name', 'bio', 'stats', 'sync status', 'delete account', 'sign out'],
    body: `Profile shows your avatar, name, bio, stats (designs, exports, games, best score), badges, the Sync card (cloud accounts: what's uploaded and
what's waiting) and Account & login (password, wallets, delete account). Tap the avatar to change it.`,
  },
  {
    id: 'trouble', title: 'Troubleshooting', screens: ['*'],
    keywords: ['problem', 'bug', 'error', 'broken', 'not working', 'slow', 'blank', 'black screen', 'refresh', 'update', 'new version', 'sound not', 'no sound', 'webgl', 'crash', 'lost', 'missing', 'ref:'],
    body: `A "new version is ready" banner means the tab is running an older copy — tap Refresh. Sound starts only after your first tap (a browser rule);
check Settings → Game sounds. 3D (the game, Fuzzies Land, the mascot) needs WebGL; the game falls back to Classic 2D by itself. Designs missing on
another device: check Profile → Sync and that you're logged in to the same account (guest accounts don't sync). Can't log in: use "Forgot your
password?" or a linked wallet. An error that shows "ref: …" is safe to send to the site owner — it identifies the problem without any private
data. Fuzzies Land acting oddly: leave and come back (it saves after every action), and check for the update banner.`,
    asks: ['The app shows an old screen', 'I have no sound', 'My designs are missing on my phone'],
  },
  {
    id: 'privacy', title: 'Privacy & safety', screens: ['*'],
    keywords: ['privacy', 'private', 'data', 'safe', 'security', 'what do you know', 'see my', 'password', 'secret', 'scam'],
    body: `Passwords are stored hashed; the site never asks for a wallet recovery phrase or private key, never sends a transaction for log-in, and never
sees card details. The Fuzzy helper only knows what this guide says plus, when you're logged in, the public bits of your own account (username,
Fuzzies balance, town level, counts) as of your last sync — never passwords, emails, payment or wallet details — and your chat isn't stored on
the server. Shared design links contain the design itself; anyone with the link can see it.`,
    asks: ['What can you see about my account?', 'Is this safe?'],
  },
];

/** Topics for a screen (always including the everywhere ones), most specific first. */
export function helpFor(screen: string): HelpTopic[] {
  const s = screen.split('/')[0];
  const mine = HELP.filter((t) => t.screens.includes(s));
  const rest = HELP.filter((t) => !t.screens.includes(s) && !t.screens.includes('*'));
  const all = HELP.filter((t) => t.screens.includes('*'));
  return [...mine, ...rest, ...all];
}

const STOP = new Set(['how', 'do', 'does', 'i', 'a', 'an', 'the', 'my', 'me', 'can', 'to', 'is', 'it', 'in', 'on', 'of', 'what', 'where', 'why', 'this', 'that', 'you', 'for', 'with', 'and', 'or', 'are', 'be', 'get', 'want', 'please', 'am', 'was', 'not']);

/**
 * Simple search over the guide for the built-in Quick help (no AI): word matches in title, example questions, keywords and body;
 * topics for the screen the person is on get a small head start.
 */
export function searchHelp(query: string, limit = 4, screen = ''): HelpTopic[] {
  const words = query.toLowerCase().split(/[^\p{L}\p{N}.$']+/u).filter((w) => w.length > 1 && !STOP.has(w));
  if (!words.length) return [];
  const scored = HELP.map((t) => {
    let score = t.screens.includes(screen) ? 2 : 0;
    const title = t.title.toLowerCase(), body = t.body.toLowerCase(), asks = (t.asks ?? []).join(' ').toLowerCase();
    for (const w of words) {
      if (title.includes(w)) score += 5;
      if (asks.includes(w)) score += 3;
      if (t.keywords.some((k) => k === w)) score += 4; else if (t.keywords.some((k) => k.includes(w) || w.includes(k))) score += 2;
      if (body.includes(w)) score += 1;
    }
    return { t, score };
  }).filter((x) => x.score > 2).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.t);
}
