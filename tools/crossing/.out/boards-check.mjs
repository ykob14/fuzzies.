//#region src/crossing/characters.ts
const u = {
	start: { kind: "start" },
	pass: (level) => ({
		kind: "pass",
		level
	}),
	shop: (price, slot = "permanent") => ({
		kind: "shop",
		slot,
		price
	}),
	season: (event) => ({
		kind: "season",
		event
	}),
	ach: (id) => ({
		kind: "achievement",
		id
	}),
	world: (world) => ({
		kind: "world",
		world
	}),
	endless: (score) => ({
		kind: "endless",
		score
	}),
	weekly: (top) => ({
		kind: "weekly",
		top
	}),
	challenge: (id) => ({
		kind: "challenge",
		id
	}),
	secret: { kind: "secret" }
};
const CHARACTERS = [
	{
		id: "classic",
		name: "Classic Fuzzy",
		rarity: "common",
		tagline: "The original. Never goes out of style.",
		personality: "Cheerful, curious, always ready to hop",
		color: ["#ff86bb", "#b8235f"],
		fx: "plain",
		parts: [],
		jump: "bounce",
		celebrate: "cheer",
		mood: "happy",
		voice: 1,
		unlock: u.start,
		legacy: "classic",
		friend: "f01"
	},
	{
		id: "mint",
		name: "Minty",
		rarity: "common",
		tagline: "Cool as a cucumber, fresh as a leaf.",
		personality: "Calm and breezy",
		color: ["#7dffcf", "#22b5a0"],
		fx: "plain",
		parts: ["mintLeaf"],
		jump: "hop",
		celebrate: "dance",
		mood: "calm",
		voice: 1.1,
		unlock: u.shop(250),
		legacy: "mint",
		friend: "f06"
	},
	{
		id: "sunny",
		name: "Sunny",
		rarity: "common",
		tagline: "Brings the sunshine wherever it lands.",
		personality: "Sunny side up, always",
		color: ["#ffe066", "#ff8c42"],
		fx: "plain",
		parts: ["sunRays"],
		jump: "bounce",
		celebrate: "cheer",
		mood: "happy",
		voice: 1.15,
		unlock: u.shop(250),
		legacy: "sunny",
		friend: "f04"
	},
	{
		id: "ocean",
		name: "Ocean",
		rarity: "common",
		tagline: "Splashes are practically a hobby.",
		personality: "Laid-back wave rider",
		color: ["#7ad7ff", "#3a5bff"],
		fx: "plain",
		parts: ["waveCrest"],
		jump: "glide",
		celebrate: "dance",
		mood: "cool",
		voice: .95,
		unlock: u.shop(250),
		legacy: "ocean",
		friend: "f06"
	},
	{
		id: "berry",
		name: "Berry",
		rarity: "common",
		tagline: "Sweet, juicy and a little bit cheeky.",
		personality: "Cheeky and sweet",
		color: ["#ff6b8b", "#b0004f"],
		fx: "plain",
		parts: ["berryStem"],
		jump: "bounce",
		celebrate: "giggle",
		mood: "silly",
		voice: 1.25,
		unlock: u.shop(250),
		legacy: "berry",
		friend: "f02"
	},
	{
		id: "bee",
		name: "Bee Fuzzy",
		rarity: "common",
		tagline: "Buzzes over the road without a worry.",
		personality: "Busy, buzzy, friendly",
		color: ["#ffd23f", "#e09900"],
		fx: "stripes",
		parts: ["beeAntennae", "beeWings"],
		jump: "float",
		celebrate: "dance",
		mood: "happy",
		voice: 1.5,
		unlock: u.pass(3),
		friend: "f20"
	},
	{
		id: "sprout",
		name: "Sprout",
		rarity: "common",
		tagline: "Growing on you since level one.",
		personality: "Gentle and hopeful",
		color: ["#9be564", "#3f9b2f"],
		fx: "plain",
		parts: ["sproutLeaves"],
		jump: "spring",
		celebrate: "cheer",
		mood: "calm",
		voice: 1.3,
		unlock: u.pass(5),
		friend: "f14"
	},
	{
		id: "chef",
		name: "Chef Fuzzy",
		rarity: "common",
		tagline: "Cooks up the perfect crossing.",
		personality: "Fussy, passionate, tasty",
		color: ["#ff7a6b", "#c43d2e"],
		fx: "plain",
		parts: ["chefHat", "moustache"],
		jump: "hop",
		celebrate: "bow",
		mood: "proud",
		voice: .9,
		unlock: u.pass(8),
		friend: "f37"
	},
	{
		id: "cowboy",
		name: "Cowboy Fuzzy",
		rarity: "common",
		tagline: "Yeehaw! This road ain't big enough.",
		personality: "Easygoing, bold, a bit dusty",
		color: ["#ffa24d", "#b4540a"],
		fx: "plain",
		parts: ["cowboyHat", "bandana"],
		jump: "stomp",
		celebrate: "salute",
		mood: "cool",
		voice: .8,
		unlock: u.shop(300, "rotating"),
		friend: "f32"
	},
	{
		id: "dj",
		name: "DJ Fuzzy",
		rarity: "common",
		tagline: "Every hop is a beat.",
		personality: "Chill, rhythmic, loud on purpose",
		color: ["#ff5c6a", "#a3122a"],
		fx: "plain",
		parts: ["headphones"],
		jump: "bounce",
		celebrate: "dance",
		mood: "cool",
		voice: 1,
		unlock: u.shop(400, "rotating"),
		friend: "f18"
	},
	{
		id: "scholar",
		name: "Scholar",
		rarity: "common",
		tagline: "Has calculated the exact gap between buses.",
		personality: "Bookish and brave",
		color: ["#b794f6", "#6b46c1"],
		fx: "plain",
		parts: ["scholarGlasses", "mortarboard"],
		jump: "hop",
		celebrate: "bow",
		mood: "proud",
		voice: 1.05,
		unlock: u.shop(300),
		friend: "f35"
	},
	{
		id: "bunny",
		name: "Bunny Fuzzy",
		rarity: "common",
		tagline: "Born to hop. Literally.",
		personality: "Bouncy and sweet",
		color: ["#ffc2dd", "#d9689a"],
		fx: "plain",
		parts: ["bunnyEars", "bunnyTail"],
		jump: "bunny",
		celebrate: "giggle",
		mood: "happy",
		voice: 1.4,
		unlock: u.season("easter"),
		friend: "f17"
	},
	{
		id: "pumpkin",
		name: "Pumpkin Fuzzy",
		rarity: "common",
		tagline: "Spooky on the outside, sweet inside.",
		personality: "Mischievous but kind",
		color: ["#ff9a3d", "#c4560a"],
		fx: "plain",
		parts: ["pumpkinStem", "pumpkinGrin"],
		jump: "bounce",
		celebrate: "giggle",
		mood: "silly",
		voice: 1.1,
		unlock: u.season("halloween"),
		friend: "f19"
	},
	{
		id: "snowy",
		name: "Snowy",
		rarity: "common",
		tagline: "Wears a scarf and a carrot nose. Respect.",
		personality: "Cosy and cheerful",
		color: ["#f4fbff", "#a9cbe0"],
		fx: "frost",
		parts: [
			"scarf",
			"carrotNose",
			"earmuffs"
		],
		jump: "hop",
		celebrate: "dance",
		mood: "happy",
		voice: 1.2,
		unlock: u.season("winter"),
		friend: "f27"
	},
	{
		id: "harvest",
		name: "Harvest Fuzzy",
		rarity: "common",
		tagline: "Brings a basket of thanks to the crossing.",
		personality: "Warm and grateful",
		color: ["#e8a33d", "#8a4b0f"],
		fx: "plain",
		parts: ["wheatCrown", "leafScarf"],
		jump: "hop",
		celebrate: "bow",
		mood: "calm",
		voice: .95,
		unlock: u.season("thanksgiving")
	},
	{
		id: "galaxy",
		name: "Galaxy Fuzzy",
		rarity: "rare",
		tagline: "Fur full of tiny stars.",
		personality: "Dreamy and a little mysterious",
		color: ["#c77dff", "#240046"],
		fx: "galaxy",
		parts: ["starHalo"],
		jump: "float",
		celebrate: "magic",
		mood: "calm",
		voice: 1.1,
		unlock: u.shop(700),
		legacy: "galaxy",
		friend: "f08"
	},
	{
		id: "pirate",
		name: "Pirate Fuzzy",
		rarity: "rare",
		tagline: "Arrr! No river can stop this crew.",
		personality: "Swashbuckling and loud",
		color: ["#e8574a", "#7a1a14"],
		fx: "plain",
		parts: ["pirateHat", "eyePatch"],
		jump: "stomp",
		celebrate: "roar",
		mood: "fierce",
		voice: .75,
		unlock: u.shop(800),
		friend: "f02"
	},
	{
		id: "ninja",
		name: "Ninja Fuzzy",
		rarity: "rare",
		tagline: "Dodges traffic without a sound.",
		personality: "Silent, swift, secretly silly",
		color: ["#4b5563", "#111827"],
		fx: "plain",
		parts: ["ninjaHeadband", "ninjaMask"],
		jump: "glide",
		celebrate: "flex",
		mood: "fierce",
		voice: 1.2,
		unlock: u.pass(30)
	},
	{
		id: "viking",
		name: "Viking Fuzzy",
		rarity: "rare",
		tagline: "Rows across rivers for fun.",
		personality: "Booming, brave, big-hearted",
		color: ["#d68a4a", "#7a3e12"],
		fx: "plain",
		parts: ["vikingHelmet", "beard"],
		jump: "stomp",
		celebrate: "roar",
		mood: "proud",
		voice: .7,
		unlock: u.shop(900, "rotating")
	},
	{
		id: "detective",
		name: "Detective Fuzzy",
		rarity: "rare",
		tagline: "Elementary, my dear Fuzzy.",
		personality: "Observant and dramatic",
		color: ["#a38b6d", "#5c4630"],
		fx: "plain",
		parts: ["detectiveHat", "magnifier"],
		jump: "hop",
		celebrate: "bow",
		mood: "proud",
		voice: .95,
		unlock: u.shop(800)
	},
	{
		id: "kitty",
		name: "Kitty Fuzzy",
		rarity: "rare",
		tagline: "Always lands on its feet. Paws.",
		personality: "Playful and independent",
		color: ["#ffb78a", "#c06a2b"],
		fx: "stripes",
		parts: [
			"catEars",
			"whiskers",
			"catTail"
		],
		jump: "spring",
		celebrate: "giggle",
		mood: "silly",
		voice: 1.35,
		unlock: u.pass(11)
	},
	{
		id: "reindeer",
		name: "Reindeer Fuzzy",
		rarity: "rare",
		tagline: "Its red nose lights the way home.",
		personality: "Sparkly and swift",
		color: ["#b87a4a", "#6b3d16"],
		fx: "plain",
		parts: [
			"antlers",
			"redNose",
			"jingleBells"
		],
		jump: "spring",
		celebrate: "cheer",
		mood: "happy",
		voice: 1.15,
		unlock: u.season("christmas"),
		friend: "f26"
	},
	{
		id: "lights",
		name: "Festival of Lights Fuzzy",
		rarity: "rare",
		tagline: "Carries a little warm glow.",
		personality: "Warm, joyful, glowing",
		color: ["#8ec5ff", "#2f5fb8"],
		fx: "frost",
		parts: ["lightsCrown"],
		jump: "float",
		celebrate: "dance",
		mood: "calm",
		voice: 1.1,
		unlock: u.season("hanukkah")
	},
	{
		id: "surfer",
		name: "Surfer Fuzzy",
		rarity: "rare",
		tagline: "Catches every wave and every gap.",
		personality: "Totally relaxed",
		color: ["#ffd166", "#06a3c7"],
		fx: "plain",
		parts: ["sunnies", "flowerLei"],
		jump: "glide",
		celebrate: "dance",
		mood: "cool",
		voice: 1,
		unlock: u.season("summer"),
		friend: "f13"
	},
	{
		id: "wizard",
		name: "Wizard Fuzzy",
		rarity: "rare",
		tagline: "A tiny bit of magic in every hop.",
		personality: "Wise, wobbly, wonderful",
		color: ["#7c5cff", "#2c1a8a"],
		fx: "plain",
		parts: ["wizardHat", "longBeard"],
		jump: "float",
		celebrate: "magic",
		mood: "proud",
		voice: .85,
		unlock: u.pass(22),
		friend: "f24"
	},
	{
		id: "knight",
		name: "Knight Fuzzy",
		rarity: "rare",
		tagline: "Defender of the nests.",
		personality: "Honourable and polite",
		color: ["#b8c2cc", "#5b6672"],
		fx: "robot",
		parts: ["knightHelmet", "plume"],
		jump: "stomp",
		celebrate: "salute",
		mood: "proud",
		voice: .8,
		unlock: u.ach("nests-100")
	},
	{
		id: "pilot",
		name: "Pilot Fuzzy",
		rarity: "rare",
		tagline: "Cleared for take-off, then hop.",
		personality: "Confident and calm",
		color: ["#7fe0ff", "#1f7fa8"],
		fx: "plain",
		parts: ["aviatorCap", "goggles"],
		jump: "glide",
		celebrate: "salute",
		mood: "cool",
		voice: 1,
		unlock: u.pass(15),
		friend: "f22"
	},
	{
		id: "astronaut",
		name: "Astronaut Fuzzy",
		rarity: "epic",
		tagline: "One small hop for Fuzzy…",
		personality: "Brave explorer of busy roads",
		color: ["#e8eef5", "#9aa8b8"],
		fx: "plain",
		parts: ["spaceHelmet", "jetPack"],
		jump: "float",
		celebrate: "flex",
		mood: "proud",
		voice: .95,
		unlock: u.pass(35)
	},
	{
		id: "robot",
		name: "Robot Fuzzy",
		rarity: "epic",
		tagline: "BEEP BOOP. Hop sequence engaged.",
		personality: "Logical… mostly",
		color: ["#9fb4c7", "#4b5d70"],
		fx: "robot",
		parts: [
			"robotAntenna",
			"robotEars",
			"chestLight"
		],
		jump: "zoom",
		celebrate: "dance",
		mood: "cool",
		voice: .85,
		unlock: u.shop(2200, "rotating")
	},
	{
		id: "royal",
		name: "Royal Fuzzy",
		rarity: "epic",
		tagline: "All hail the Fuzzy of the crossing.",
		personality: "Graceful, gracious, glamorous",
		color: ["#d4a6ff", "#7b2cbf"],
		fx: "plain",
		parts: ["crown", "royalCape"],
		jump: "glide",
		celebrate: "bow",
		mood: "proud",
		voice: 1,
		unlock: u.shop(2500, "rotating"),
		friend: "f28"
	},
	{
		id: "unicorn",
		name: "Unicorn Fuzzy",
		rarity: "epic",
		tagline: "Sparkles. Rainbows. Speed.",
		personality: "Magical and full of joy",
		color: ["#ffd1f0", "#e06bc2"],
		fx: "rainbow",
		parts: ["unicornHorn", "unicornMane"],
		jump: "float",
		celebrate: "magic",
		mood: "happy",
		voice: 1.3,
		unlock: u.pass(42),
		friend: "f29"
	},
	{
		id: "skeleton",
		name: "Skeleton Fuzzy",
		rarity: "epic",
		tagline: "Has been squashed more than once. Totally fine.",
		personality: "Dry humour, bone-deep loyalty",
		color: ["#f1efe6", "#aaa79a"],
		fx: "bone",
		parts: ["ribsMark", "skullMask"],
		jump: "spring",
		celebrate: "giggle",
		mood: "silly",
		voice: .9,
		unlock: u.ach("lives-100"),
		friend: "f31"
	},
	{
		id: "rockstar",
		name: "Rockstar Fuzzy",
		rarity: "epic",
		tagline: "Plays every crossing like the final encore.",
		personality: "Loud, glittery, unstoppable",
		color: ["#ff4d8f", "#8c1148"],
		fx: "neon",
		parts: ["mohawk", "starShades"],
		jump: "stomp",
		celebrate: "roar",
		mood: "cool",
		voice: 1.05,
		unlock: u.ach("games-100")
	},
	{
		id: "samurai",
		name: "Samurai Fuzzy",
		rarity: "epic",
		tagline: "Walks the long road with perfect balance.",
		personality: "Disciplined and quietly kind",
		color: ["#c0392b", "#4a0f0a"],
		fx: "plain",
		parts: ["samuraiHelmet", "samuraiMask"],
		jump: "glide",
		celebrate: "salute",
		mood: "fierce",
		voice: .85,
		unlock: u.endless(100)
	},
	{
		id: "neon",
		name: "Neon Fuzzy",
		rarity: "epic",
		tagline: "Glows brighter than the traffic lights.",
		personality: "Electric and fast",
		color: ["#46ffe7", "#0b5cff"],
		fx: "neon",
		parts: ["neonHalo", "neonVisor"],
		jump: "zoom",
		celebrate: "dance",
		mood: "cool",
		voice: 1.2,
		unlock: u.world(9)
	},
	{
		id: "lion",
		name: "Lion Dance Fuzzy",
		rarity: "epic",
		tagline: "Brings good luck to every crossing.",
		personality: "Festive, bold and bright",
		color: ["#ff3b30", "#ffcc00"],
		fx: "plain",
		parts: ["lionMane", "lionBrows"],
		jump: "spring",
		celebrate: "dance",
		mood: "proud",
		voice: .95,
		unlock: u.season("lunar")
	},
	{
		id: "mermaid",
		name: "Coral Fuzzy",
		rarity: "epic",
		tagline: "Is more at home in the water than on the road.",
		personality: "Dreamy island spirit",
		color: ["#6ef3d6", "#0e8f9e"],
		fx: "rainbow",
		parts: ["shellCrown", "seaPearls"],
		jump: "glide",
		celebrate: "dance",
		mood: "calm",
		voice: 1.2,
		unlock: u.world(8)
	},
	{
		id: "golden",
		name: "Golden Fuzzy",
		rarity: "legendary",
		tagline: "Pure gold. Earned, never bought.",
		personality: "Shiny, serene, a little smug",
		color: ["#fff3b0", "#e0a100"],
		fx: "gold",
		parts: ["goldHalo"],
		jump: "float",
		celebrate: "flex",
		mood: "proud",
		voice: 1,
		unlock: u.ach("coins-10000"),
		legacy: "gold"
	},
	{
		id: "ghost",
		name: "Ghost Fuzzy",
		rarity: "legendary",
		tagline: "Passes through the haunted road like a whisper.",
		personality: "Playful, floaty, boo-tiful",
		color: ["#e8f6ff", "#9ec8e8"],
		fx: "ghost",
		parts: ["ghostWisp"],
		jump: "float",
		celebrate: "giggle",
		mood: "silly",
		voice: 1.3,
		unlock: u.world(7)
	},
	{
		id: "dragon",
		name: "Dragon Fuzzy",
		rarity: "legendary",
		tagline: "Breathes tiny sparks. Roars loudly.",
		personality: "Fierce but cuddly",
		color: ["#6fe36a", "#1d7a2a"],
		fx: "fire",
		parts: [
			"dragonHorns",
			"dragonWings",
			"dragonTail"
		],
		jump: "stomp",
		celebrate: "roar",
		mood: "fierce",
		voice: .7,
		unlock: u.endless(500)
	},
	{
		id: "rainbow",
		name: "Rainbow Fuzzy",
		rarity: "legendary",
		tagline: "Every colour at once.",
		personality: "Joyful chaos",
		color: ["#ff8fb4", "#4d7cff"],
		fx: "rainbow",
		parts: ["rainbowArc", "starShades"],
		jump: "bounce",
		celebrate: "dance",
		mood: "happy",
		voice: 1.25,
		unlock: u.weekly(10),
		friend: "f30"
	},
	{
		id: "phoenix",
		name: "Phoenix Fuzzy",
		rarity: "legendary",
		tagline: "Rises, hops, rises again.",
		personality: "Radiant and unstoppable",
		color: ["#ffb347", "#e63900"],
		fx: "fire",
		parts: ["phoenixCrest", "phoenixWings"],
		jump: "glide",
		celebrate: "roar",
		mood: "fierce",
		voice: 1,
		unlock: u.pass(50)
	},
	{
		id: "frost",
		name: "Frost Fuzzy",
		rarity: "legendary",
		tagline: "Ice-cool under any pressure.",
		personality: "Serene and sparkling",
		color: ["#d9f4ff", "#5fb4e8"],
		fx: "frost",
		parts: ["iceCrown", "iceCape"],
		jump: "glide",
		celebrate: "magic",
		mood: "calm",
		voice: 1.15,
		unlock: u.world(6)
	},
	{
		id: "thunder",
		name: "Thunder Fuzzy",
		rarity: "legendary",
		tagline: "A storm in a ball of fluff.",
		personality: "Crackling and cheerful",
		color: ["#ffe94d", "#4b3fd6"],
		fx: "storm",
		parts: ["boltCrest", "cloudCape"],
		jump: "zoom",
		celebrate: "flex",
		mood: "fierce",
		voice: .9,
		unlock: u.ach("gold-250")
	},
	{
		id: "titan",
		name: "Titan Fuzzy",
		rarity: "legendary",
		tagline: "Guardian of the Legendary Fuzzy World.",
		personality: "Ancient, mighty, gentle",
		color: ["#ffcf6b", "#7a4be8"],
		fx: "gold",
		parts: ["titanCrown", "titanShoulders"],
		jump: "stomp",
		celebrate: "roar",
		mood: "proud",
		voice: .65,
		unlock: u.world(10)
	},
	{
		id: "nebula",
		name: "Nebula Fuzzy",
		rarity: "mythic",
		tagline: "Born from a weekly #1.",
		personality: "Cosmic and calm",
		color: ["#7c3aed", "#0b1026"],
		fx: "cosmic",
		parts: ["nebulaRing", "orbitStars"],
		jump: "float",
		celebrate: "magic",
		mood: "calm",
		voice: .9,
		unlock: u.weekly(1)
	},
	{
		id: "aurora",
		name: "Aurora Fuzzy",
		rarity: "mythic",
		tagline: "Dances where the sky meets the road.",
		personality: "Graceful, glowing, far-travelled",
		color: ["#7dffb5", "#5b6cff"],
		fx: "aurora",
		parts: ["auroraVeil", "orbitStars"],
		jump: "float",
		celebrate: "dance",
		mood: "calm",
		voice: 1.1,
		unlock: u.endless(800)
	},
	{
		id: "eclipse",
		name: "Eclipse Fuzzy",
		rarity: "mythic",
		tagline: "Awarded to those who found them all.",
		personality: "Shadowy and sun-crowned",
		color: ["#1a1030", "#ffb347"],
		fx: "eclipse",
		parts: ["eclipseCorona"],
		jump: "glide",
		celebrate: "flex",
		mood: "proud",
		voice: .8,
		unlock: u.ach("collection-45")
	},
	{
		id: "prism",
		name: "Prism Fuzzy",
		rarity: "mythic",
		tagline: "For the flawless. Cleared a whole world without a single mistake.",
		personality: "Perfect, glittering, humble",
		color: ["#d8f1ff", "#9ad7ff"],
		fx: "prism",
		parts: ["prismCrystals"],
		jump: "twirl",
		celebrate: "magic",
		mood: "proud",
		voice: 1.2,
		unlock: u.challenge("flawless-world")
	},
	{
		id: "omega",
		name: "Omega Fuzzy",
		rarity: "mythic",
		tagline: "???",
		personality: "Nobody knows. Nobody has the courage to ask.",
		color: ["#ff2e63", "#1a1a2e"],
		fx: "eclipse",
		parts: ["omegaSigil", "orbitStars"],
		jump: "twirl",
		celebrate: "roar",
		mood: "fierce",
		voice: .6,
		unlock: u.secret
	}
];
const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
//#endregion
//#region src/crossing/cosmetics.ts
const c = (slot, id, name, rarity, icon, blurb, unlock) => ({
	id,
	slot,
	name,
	rarity,
	icon,
	blurb,
	unlock
});
const shop = (price, slot = "permanent") => ({
	kind: "shop",
	slot,
	price
});
const pass$1 = (level) => ({
	kind: "pass",
	level
});
const season = (event, price) => ({
	kind: "season",
	event,
	price
});
const COSMETICS = [
	c("trail", "trail-none", "No trail", "common", "·", "Clean and simple.", { kind: "free" }),
	c("trail", "trail-sparkle", "Sparkle trail", "common", "✨", "Little stars follow every hop.", pass$1(2)),
	c("trail", "trail-hearts", "Heart trail", "common", "💖", "Spreads the love.", shop(200)),
	c("trail", "trail-leaves", "Leaf trail", "common", "🍃", "A breeze of green.", shop(200)),
	c("trail", "trail-bubbles", "Bubble trail", "rare", "🫧", "Pop pop pop!", pass$1(14)),
	c("trail", "trail-petals", "Petal trail", "rare", "🌸", "Soft pink petals.", season("easter", 350)),
	c("trail", "trail-snow", "Snowflake trail", "rare", "❄️", "Winter wherever you hop.", season("winter", 350)),
	c("trail", "trail-rainbow", "Rainbow trail", "epic", "🌈", "A ribbon of colour.", shop(900, "weekly")),
	c("trail", "trail-fire", "Ember trail", "epic", "🔥", "Warm embers dance behind you.", pass$1(38)),
	c("trail", "trail-neon", "Neon trail", "legendary", "💠", "Glowing light lines.", {
		kind: "weekly",
		top: 25
	}),
	c("jump", "jump-puff", "Cloud puff", "common", "☁️", "A soft puff on landing.", { kind: "free" }),
	c("jump", "jump-pop", "Sparkle pop", "common", "🎇", "Sparkles on every landing.", pass$1(4)),
	c("jump", "jump-ripple", "Ripple", "rare", "💧", "Rings spread from your feet.", shop(300)),
	c("jump", "jump-star", "Star landing", "rare", "⭐", "Land like a star.", pass$1(18)),
	c("jump", "jump-petal", "Petal burst", "rare", "🌼", "A burst of petals.", season("summer", 400)),
	c("jump", "jump-shock", "Shockwave", "epic", "💥", "A ring of energy.", shop(1100, "weekly")),
	c("jump", "jump-glow", "Glow landing", "epic", "🌟", "Lights up the road.", pass$1(32)),
	c("jump", "jump-bolt", "Lightning strike", "legendary", "⚡", "Thunder on every landing.", {
		kind: "achievement",
		id: "gold-250"
	}),
	c("celebration", "cele-spin", "Happy spin", "common", "🌀", "A joyful twirl.", { kind: "free" }),
	c("celebration", "cele-dance", "Little dance", "common", "💃", "Shake those fluffy hips.", pass$1(6)),
	c("celebration", "cele-heart", "Heart pop", "rare", "💕", "Hearts burst out!", shop(450)),
	c("celebration", "cele-flip", "Backflip", "rare", "🤸", "A perfect backflip.", pass$1(20)),
	c("celebration", "cele-confetti", "Confetti cannon", "rare", "🎉", "Party time!", season("winter", 500)),
	c("celebration", "cele-fireworks", "Fireworks", "epic", "🎆", "Fireworks overhead.", shop(1400, "weekly")),
	c("celebration", "cele-moon", "Moonwalk", "epic", "🌙", "Smooth as can be.", pass$1(44)),
	c("celebration", "cele-champion", "Champion pose", "legendary", "🏆", "For the very best.", {
		kind: "weekly",
		top: 10
	}),
	c("extra", "extra-none", "No extra", "common", "·", "Just the Fuzzy.", { kind: "free" }),
	c("extra", "extra-bowtie", "Bow tie", "common", "🎀", "Dapper.", shop(150)),
	c("extra", "extra-shades", "Cool shades", "common", "😎", "Too cool for traffic.", shop(200)),
	c("extra", "extra-scarf", "Cosy scarf", "common", "🧣", "A warm striped scarf.", pass$1(9)),
	c("extra", "extra-flower", "Flower", "rare", "🌺", "A pretty flower behind the ear.", season("easter", 300)),
	c("extra", "extra-backpack", "Tiny backpack", "rare", "🎒", "For adventures.", pass$1(26)),
	c("extra", "extra-cape", "Hero cape", "epic", "🦸", "Flaps in the wind.", shop(1e3, "weekly")),
	c("extra", "extra-wings", "Angel wings", "epic", "🪽", "Little feathered wings.", pass$1(47))
];
const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((x) => [x.id, x]));
//#endregion
//#region src/crossing/rewards-weekly.ts
const BOARD_IDS = [
	"score",
	"fastest",
	"streak"
];
const BOARDS = {
	score: {
		id: "score",
		title: "Highest score",
		short: "Score",
		blurb: "The best score of a single run.",
		better: "high"
	},
	fastest: {
		id: "fastest",
		title: "Fastest crossing",
		short: "Fastest",
		blurb: "Fill all 5 nests of level 1 without losing a life — the quickest time wins.",
		better: "low"
	},
	streak: {
		id: "streak",
		title: "Survival streak",
		short: "Streak",
		blurb: "Most nests filled in a row without losing a life.",
		better: "high"
	}
};
const DAY_MS = 864e5;
const WEEK_MS = 7 * DAY_MS;
/** Monday 00:00 UTC of the week that contains `ms` */
function weekStart(ms) {
	const d = new Date(ms);
	const sinceMonday = (d.getUTCDay() + 6) % 7;
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - sinceMonday);
}
/** "2026-W42": the ISO week-year is the year of the week's Thursday (so Dec 29 2025 is already 2026-W01) */
function weekKey(ms) {
	const thu = weekStart(ms) + 3 * DAY_MS;
	const y = new Date(thu).getUTCFullYear();
	const n = Math.floor((thu - Date.UTC(y, 0, 1)) / WEEK_MS) + 1;
	return `${y}-W${String(n).padStart(2, "0")}`;
}
/** [start, end) of a week key in ms, or null when the key isn't a real ISO week */
function weekRange(key) {
	const m = /^(\d{4})-W(\d{2})$/.exec(key);
	if (!m) return null;
	const y = Number(m[1]), w = Number(m[2]);
	if (w < 1 || w > 53) return null;
	const start = weekStart(Date.UTC(y, 0, 4)) + (w - 1) * WEEK_MS;
	return weekKey(start) === key ? {
		start,
		end: start + WEEK_MS
	} : null;
}
const prevWeek = (key) => {
	const r = weekRange(key);
	return r ? weekKey(r.start - WEEK_MS) : null;
};
/** How many whole weeks `key` is before `now`'s week (0 = this week, 1 = last week …), or null for a bad / future key */
function weeksAgo(key, now) {
	const r = weekRange(key);
	if (!r || r.start > weekStart(now)) return null;
	return Math.round((weekStart(now) - r.start) / WEEK_MS);
}
/** "Oct 12 – 18" for a week key */
function weekLabel(key) {
	const r = weekRange(key);
	if (!r) return key;
	const a = new Date(r.start), b = /* @__PURE__ */ new Date(r.end - DAY_MS);
	const mon = (d) => d.toLocaleString("en", {
		month: "short",
		timeZone: "UTC"
	});
	return a.getUTCMonth() === b.getUTCMonth() ? `${mon(a)} ${a.getUTCDate()} – ${b.getUTCDate()}` : `${mon(a)} ${a.getUTCDate()} – ${mon(b)} ${b.getUTCDate()}`;
}
/** A finished week pays by final rank. Each tier includes what the tiers below it give (ranks inside the top 10 are also in the top 25 …). */
const TIERS = [
	1,
	3,
	10,
	25,
	100
];
const tierOf = (rank) => Number.isInteger(rank) && rank >= 1 ? TIERS.find((t) => rank <= t) ?? null : null;
const TIER_DEFS = {
	1: {
		characters: ["nebula", "rainbow"],
		cosmetics: ["trail-neon", "cele-champion"],
		coins: 1e3,
		name: "Champion",
		blurb: "Weekly #1"
	},
	3: {
		characters: ["rainbow"],
		cosmetics: ["trail-neon", "cele-champion"],
		coins: 600,
		name: "Podium",
		blurb: "Top 3"
	},
	10: {
		characters: ["rainbow"],
		cosmetics: ["trail-neon", "cele-champion"],
		coins: 400,
		name: "Top 10",
		blurb: "Top 10"
	},
	25: {
		characters: [],
		cosmetics: ["trail-neon"],
		coins: 300,
		name: "Top 25",
		blurb: "Top 25"
	},
	100: {
		characters: [],
		cosmetics: [],
		coins: 200,
		name: "Participant",
		blurb: "Top 100"
	}
};
const trophyId = (week, board, tier) => `week-${week}-${board}-${tier}`;
function parseTrophy(id) {
	const m = /^week-(\d{4}-W\d{2})-(score|fastest|streak)-(\d+)$/.exec(id);
	if (!m || !weekRange(m[1])) return null;
	const tier = Number(m[3]);
	return TIERS.includes(tier) ? {
		week: m[1],
		board: m[2],
		tier
	} : null;
}
function trophyName(id) {
	const t = parseTrophy(id);
	return t ? `${TIER_DEFS[t.tier].name} · ${BOARDS[t.board].title} · ${weekLabel(t.week)}` : id;
}
/** what a final rank earns on one board of one finished week (null = outside the top 100) */
function rewardFor(week, board, rank) {
	const tier = tierOf(rank);
	if (!tier) return null;
	const d = TIER_DEFS[tier];
	return {
		tier,
		trophy: trophyId(week, board, tier),
		characters: [...d.characters],
		cosmetics: [...d.cosmetics],
		coins: d.coins
	};
}
function formatValue(board, v) {
	if (board === "fastest") return `${(v / 1e3).toFixed(2)} s`;
	if (board === "streak") return `${v} nest${v === 1 ? "" : "s"}`;
	return v.toLocaleString("en");
}
function formatLeft(ms) {
	const m = Math.max(0, Math.floor(ms / 6e4));
	const d = Math.floor(m / 1440), hh = Math.floor(m % 1440 / 60), mm = m % 60;
	return d > 0 ? `${d}d ${hh}h` : hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
}
//#endregion
//#region api/_lib/crossing-rules.ts
/**
* Fuzzy Crossing weekly boards — what the server believes about a finished run. DOM-free and database-free so it can be unit-tested
* (tools/crossing/boards-check.ts).
*
* The rules of the game run in the player's browser, so the server can only check that a result is PLAUSIBLE, never that it is real.
* Every bound below is derived from the game's own rules (src/game/crossing.ts) — keep the two in step:
*   hop = 0.14 s · board 11×13, 12 rows from the start row to the nest row · +10 per new furthest row per attempt (an attempt = one life
*   or one nest) · nest = 50 + round(timer×2), timer ≤ 32 s · pickup +25 · golden +100 · level up +200 · 5 nests per level · 3 lives ·
*   a Fuzzy token is spawned at most every 1.6 s.
*/
const RULES = {
	hopMs: 140,
	rowsPerAttempt: 12,
	rowPoints: 10,
	nestBase: 50,
	nestTimeMax: 64,
	levelBonus: 200,
	pickup: 25,
	gold: 100,
	nestsPerLevel: 5,
	lives: 3,
	deathMs: 1e3,
	tokenEveryMs: 1600
};
const LIMITS = {
	/** a run is open this long at most (the server refuses a finish after it) */
	runExpireMs: 27e5,
	/** how much longer than the server's own stopwatch a client may claim (network, rounding, clock jitter) */
	toleranceMs: 3e3,
	/** the hardest check on "fastest": 5 nests = 60 hops = 8.4 s of pure hopping; with traffic and logs nobody gets near it */
	minFastestMs: 14e3,
	/** between minFastestMs and this a time is accepted but flagged for a look */
	flagFastestMs: 2e4,
	maxNests: 400,
	maxScore: 5e5,
	maxHops: 2e4,
	maxTimeMs: 2703e3,
	maxJson: 700,
	/** a score above this per second of play is flagged (a perfect run is ~40–70) */
	flagScorePerSec: 80
};
const isInt = (v, min, max) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
/** Shape check: exactly the numbers we expect, integers in sane ranges, a known Fuzzy. Anything else → a reason code. */
function parseResult(raw) {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "shape";
	let size = 0;
	try {
		size = JSON.stringify(raw).length;
	} catch {
		return "shape";
	}
	if (size > LIMITS.maxJson) return "shape";
	const r = raw;
	const f = (k, max, min = 0) => isInt(r[k], min, max) ? r[k] : null;
	const score = f("score", LIMITS.maxScore), level = f("level", LIMITS.maxNests / 5 + 1, 1), nests = f("nests", LIMITS.maxNests), pickups = f("pickups", 5e3);
	const goldPickups = f("goldPickups", 5e3), hops = f("hops", LIMITS.maxHops), deaths = f("deaths", RULES.lives), timeMs = f("timeMs", LIMITS.maxTimeMs), bestStreak = f("bestStreak", LIMITS.maxNests);
	if ([
		score,
		level,
		nests,
		pickups,
		goldPickups,
		hops,
		deaths,
		timeMs,
		bestStreak
	].some((x) => x === null)) return "shape";
	const ff = r.firstFiveNestsMs;
	if (ff !== null && !isInt(ff, 0, LIMITS.maxTimeMs)) return "shape";
	const ch = r.characterId;
	if (typeof ch !== "string" || ch.length > 40 || !Object.hasOwn(CHARACTER_BY_ID, ch)) return "character";
	return {
		score,
		level,
		nests,
		pickups,
		goldPickups,
		hops,
		deaths,
		timeMs,
		firstFiveNestsMs: ff,
		bestStreak,
		characterId: ch
	};
}
/** The most a run with these statistics can possibly have scored under the game's rules (a hard upper bound). */
function scoreCeiling(r) {
	const attempts = r.nests + r.deaths + (r.deaths < RULES.lives ? 1 : 0);
	return Math.min(r.hops, RULES.rowsPerAttempt * attempts) * RULES.rowPoints + r.nests * (RULES.nestBase + RULES.nestTimeMax) + (r.level - 1) * RULES.levelBonus + (r.pickups - r.goldPickups) * RULES.pickup + r.goldPickups * RULES.gold;
}
/**
* Is this finished run believable? `elapsedMs` is the SERVER's stopwatch between run.start and run.finish.
* Hard failures reject the run; softer oddities only add a flag (kept with the score so the owner can look).
*/
function validateRun(r, elapsedMs) {
	const no = (reason) => ({
		ok: false,
		reason
	});
	if (elapsedMs < 0 || elapsedMs > LIMITS.runExpireMs) return no("expired");
	if (r.level !== 1 + Math.floor(r.nests / RULES.nestsPerLevel)) return no("level");
	if (r.goldPickups > r.pickups) return no("gold");
	if (r.timeMs > elapsedMs + LIMITS.toleranceMs) return no("time_server");
	if (r.hops * RULES.hopMs > r.timeMs + 2 * RULES.hopMs) return no("hop_rate");
	if (r.hops < r.nests * RULES.rowsPerAttempt) return no("hops_min");
	if (r.hops * RULES.hopMs + r.deaths * RULES.deathMs > r.timeMs + 2 * RULES.hopMs + 500) return no("time_floor");
	if (r.pickups > Math.floor(r.timeMs / RULES.tokenEveryMs) + 2) return no("pickup_rate");
	if (r.score > scoreCeiling(r)) return no("score");
	if (r.bestStreak > r.nests) return no("streak");
	if (r.bestStreak * (r.deaths + 1) < r.nests) return no("streak");
	if (r.deaths === 0 && r.bestStreak !== r.nests) return no("streak");
	if (r.firstFiveNestsMs !== null) {
		if (r.nests < RULES.nestsPerLevel || r.bestStreak < RULES.nestsPerLevel) return no("fastest_nests");
		if (r.firstFiveNestsMs > r.timeMs) return no("fastest_time");
		if (r.firstFiveNestsMs > elapsedMs + LIMITS.toleranceMs) return no("fastest_server");
		if (r.firstFiveNestsMs < LIMITS.minFastestMs) return no("fastest_min");
		if (r.hops < RULES.nestsPerLevel * RULES.rowsPerAttempt || (r.hops - 1) * RULES.hopMs > r.timeMs + 2 * RULES.hopMs) return no("fastest_hops");
	}
	const flags = [];
	if (r.firstFiveNestsMs !== null && r.firstFiveNestsMs < LIMITS.flagFastestMs) flags.push("fast_nests");
	if (r.timeMs > 0 && r.score / (r.timeMs / 1e3) > LIMITS.flagScorePerSec) flags.push("score_rate");
	if (r.pickups >= 10 && r.goldPickups / r.pickups > .5) flags.push("gold_ratio");
	if (r.timeMs + LIMITS.toleranceMs < elapsedMs - 12e5) flags.push("long_pause");
	return {
		ok: true,
		flags
	};
}
/** The value each board records for a run (null = this run doesn't count on that board). */
function boardValues(r) {
	return {
		score: r.score > 0 ? r.score : null,
		fastest: r.firstFiveNestsMs,
		streak: r.bestStreak >= 1 ? r.bestStreak : null
	};
}
//#endregion
//#region tools/crossing/boards-check.ts
let pass = 0;
let fail = 0;
const ok = (c, m) => {
	if (c) pass++;
	else {
		fail++;
		console.log("  ✗", m);
	}
};
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)})`);
const utc = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi);
eq(weekKey(utc(2026, 10, 16)), "2026-W42", "Fri 16 Oct 2026 is 2026-W42");
eq(weekKey(utc(2026, 10, 12, 0, 0)), "2026-W42", "Monday 00:00 starts W42");
eq(weekKey(utc(2026, 10, 11, 23, 59)), "2026-W41", "Sunday 23:59 is still W41");
eq(weekKey(utc(2026, 10, 18, 23, 59)), "2026-W42", "Sunday 23:59 ends W42");
eq(weekKey(utc(2026, 10, 19)), "2026-W43", "next Monday is W43");
eq(weekKey(utc(2025, 12, 29)), "2026-W01", "29 Dec 2025 (Mon) is already 2026-W01");
eq(weekKey(utc(2026, 1, 1)), "2026-W01", "1 Jan 2026 (Thu) is 2026-W01");
eq(weekKey(utc(2026, 1, 4, 23, 59)), "2026-W01", "4 Jan 2026 (Sun) still W01");
eq(weekKey(utc(2026, 1, 5)), "2026-W02", "5 Jan 2026 is W02");
eq(weekKey(utc(2026, 12, 31)), "2026-W53", "31 Dec 2026 (Thu) is 2026-W53 (2026 has 53 weeks)");
eq(weekKey(utc(2027, 1, 3, 23, 59)), "2026-W53", "3 Jan 2027 (Sun) ends 2026-W53");
eq(weekKey(utc(2027, 1, 4)), "2027-W01", "4 Jan 2027 (Mon) is 2027-W01");
eq(weekKey(utc(2024, 12, 30)), "2025-W01", "30 Dec 2024 is 2025-W01");
eq(weekKey(utc(2021, 1, 3)), "2020-W53", "3 Jan 2021 is 2020-W53");
eq(weekKey(utc(2020, 12, 31)), "2020-W53", "31 Dec 2020 is 2020-W53");
let allMondays = true;
let monotonic = true;
let lastKey = "";
let lastStart = 0;
for (let t = utc(2018, 1, 1); t < utc(2030, 1, 1); t += 216e5) {
	const s = weekStart(t);
	if (new Date(s).getUTCDay() !== 1 || s % 864e5 !== 0 || s > t || t - s >= 6048e5) allMondays = false;
	const k = weekKey(t);
	if (k !== lastKey) {
		if (lastKey && !(s - lastStart === 6048e5)) monotonic = false;
		lastKey = k;
		lastStart = s;
	}
	const r = weekRange(k);
	if (!r || t < r.start || t >= r.end || weekKey(r.start) !== k || weekKey(r.end - 1) !== k || weekKey(r.end) === k) allMondays = false;
}
ok(allMondays, "every sampled moment is inside its own week range [Monday 00:00, next Monday)");
ok(monotonic, "consecutive weeks are exactly 7 days apart");
eq(weekKey(utc(2026, 3, 29, 1, 30)), "2026-W13", "a European DST Sunday is still W13");
eq(weekKey(utc(2026, 11, 1, 6, 30)), "2026-W44", "a US DST Sunday is still W44");
ok(weekRange("2026-W53") !== null && weekRange("2025-W53") === null, "W53 exists in 2026 but not in 2025");
ok(weekRange("2026-W00") === null && weekRange("2026-W54") === null && weekRange("abc") === null && weekRange("2026-w42") === null && weekRange("") === null, "bad week keys are refused");
eq(weekRange("2026-W42").start, utc(2026, 10, 12), "W42 starts 12 Oct");
eq(weekRange("2026-W42").end, utc(2026, 10, 19), "W42 ends 19 Oct");
eq(prevWeek("2026-W42"), "2026-W41", "previous of W42");
eq(prevWeek("2026-W01"), "2025-W52", "previous of 2026-W01 is 2025-W52");
eq(prevWeek("2027-W01"), "2026-W53", "previous of 2027-W01 is 2026-W53");
eq(prevWeek("nope"), null, "previous of junk");
eq(weeksAgo("2026-W41", utc(2026, 10, 16)), 1, "W41 is 1 week ago");
eq(weeksAgo("2026-W42", utc(2026, 10, 16)), 0, "this week is 0 weeks ago");
eq(weeksAgo("2026-W43", utc(2026, 10, 16)), null, "a future week is refused");
eq(weekLabel("2026-W42"), "Oct 12 – 18", "label in one month");
eq(weekLabel("2026-W44"), "Oct 26 – Nov 1", "label over a month end");
eq(formatLeft(187259e3), "2d 4h", "countdown days");
eq(formatLeft(1122e4), "3h 7m", "countdown hours");
eq(formatLeft(-5), "0m", "countdown never negative");
eq(formatValue("fastest", 18420), "18.42 s", "fastest formatting");
eq(formatValue("streak", 1), "1 nest", "streak singular");
eq(formatValue("streak", 7), "7 nests", "streak plural");
eq(formatValue("score", 12345), "12,345", "score formatting");
eq(tierOf(1), 1, "rank 1 → tier 1");
eq(tierOf(2), 3, "rank 2 → tier 3");
eq(tierOf(3), 3, "rank 3 → tier 3");
eq(tierOf(4), 10, "rank 4 → tier 10");
eq(tierOf(10), 10, "rank 10 → tier 10");
eq(tierOf(11), 25, "rank 11 → tier 25");
eq(tierOf(25), 25, "rank 25 → tier 25");
eq(tierOf(26), 100, "rank 26 → tier 100");
eq(tierOf(100), 100, "rank 100 → tier 100");
eq(tierOf(101), null, "rank 101 → nothing");
eq(tierOf(0), null, "rank 0 → nothing");
eq(tierOf(1.5), null, "fractional rank → nothing");
eq(tierOf(-3), null, "negative rank → nothing");
const r1 = rewardFor("2026-W41", "score", 1);
const r3 = rewardFor("2026-W41", "fastest", 3);
const r10 = rewardFor("2026-W41", "streak", 10);
const r25 = rewardFor("2026-W41", "score", 25);
const r100 = rewardFor("2026-W41", "score", 100);
eq(r1.trophy, "week-2026-W41-score-1", "trophy id for #1");
ok(r1.characters.includes("nebula") && r1.characters.includes("rainbow") && r1.cosmetics.includes("trail-neon") && r1.cosmetics.includes("cele-champion"), "#1 gets Nebula, Rainbow, Neon trail, Champion pose");
ok(!r3.characters.includes("nebula") && r3.characters.includes("rainbow") && r3.cosmetics.includes("trail-neon") && r3.cosmetics.includes("cele-champion"), "top 3: trophy + trail + champion (+ the top-10 Rainbow)");
ok(r10.characters.includes("rainbow") && r10.cosmetics.includes("cele-champion") && !r10.characters.includes("nebula"), "top 10: Rainbow + Champion pose");
ok(r25.characters.length === 0 && r25.cosmetics.join() === "trail-neon", "top 25: Neon trail only");
ok(r100.characters.length === 0 && r100.cosmetics.length === 0 && r100.coins === 200, "top 100: participant trophy + 200 coins");
eq(rewardFor("2026-W41", "score", 101), null, "no reward outside the top 100");
for (const c of CHARACTERS) if (c.unlock.kind === "weekly") {
	const top = c.unlock.top;
	for (const rank of [
		1,
		2,
		3,
		5,
		10,
		11,
		25,
		26,
		100
	]) ok((rewardFor("2026-W41", "score", rank)?.characters.includes(c.id) ?? false) === rank <= top, `${c.id} (weekly top ${top}) is granted at rank ${rank} ⇔ rank ≤ ${top}`);
}
for (const x of Object.values(COSMETIC_BY_ID)) if (x.unlock.kind === "weekly") for (const rank of [
	1,
	3,
	10,
	11,
	25,
	26,
	100
]) ok((rewardFor("2026-W41", "score", rank)?.cosmetics.includes(x.id) ?? false) === rank <= x.unlock.top, `${x.id} (weekly top ${x.unlock.top}) at rank ${rank}`);
for (const t of TIERS) {
	const d = TIER_DEFS[t];
	ok(d.characters.every((id) => CHARACTER_BY_ID[id]) && d.cosmetics.every((id) => COSMETIC_BY_ID[id]), `tier ${t} names real Fuzzies and cosmetics`);
	ok(d.coins > 0, `tier ${t} pays coins`);
}
ok(TIERS.every((t, i) => i === 0 || TIER_DEFS[t].coins <= TIER_DEFS[TIERS[i - 1]].coins), "coins never go up with a worse tier");
ok(TIERS.every((t, i) => i === 0 || TIER_DEFS[t].cosmetics.every((c) => TIER_DEFS[TIERS[i - 1]].cosmetics.includes(c)) && TIER_DEFS[t].characters.every((c) => TIER_DEFS[TIERS[i - 1]].characters.includes(c))), "a better tier includes everything a worse tier gives");
for (const w of [
	"2026-W41",
	"2026-W53",
	"2027-W01"
]) for (const b of BOARD_IDS) for (const t of TIERS) {
	const id = trophyId(w, b, t);
	const p = parseTrophy(id);
	ok(!!p && p.week === w && p.board === b && p.tier === t, `trophy id round-trips ${id}`);
}
eq(parseTrophy("week-2026-W41-score-7"), null, "tier 7 is not a trophy");
eq(parseTrophy("week-2026-W99-score-1"), null, "bad week in a trophy id");
eq(parseTrophy("pass-3"), null, "other trophy ids are ignored");
ok(trophyName("week-2026-W42-fastest-3").includes("Fastest crossing") && trophyName("week-2026-W42-fastest-3").includes("Oct 12"), "trophy names are readable");
/** a believable run: 2 levels, 1 death, ~2 minutes */
const good = (over = {}) => ({
	score: 1500,
	level: 2,
	nests: 7,
	pickups: 12,
	goldPickups: 2,
	hops: 190,
	deaths: 3,
	timeMs: 15e4,
	firstFiveNestsMs: 38e3,
	bestStreak: 5,
	characterId: "classic",
	...over
});
const elapsed = 156e3;
const v = (r, e = elapsed) => validateRun(r, e);
const reason = (r, e = elapsed) => {
	const x = v(r, e);
	return x.ok ? "OK" : x.reason;
};
{
	const r = good();
	ok(r.score <= scoreCeiling(r), `the sample run's score ${r.score} is under its ceiling ${scoreCeiling(r)}`);
	eq(reason(r), "OK", "a believable run passes");
	eq(reason(good({
		deaths: 1,
		bestStreak: 6,
		nests: 7
	})), "OK", "one death, long streak, passes");
	eq(reason(good({
		nests: 0,
		level: 1,
		deaths: 3,
		bestStreak: 0,
		firstFiveNestsMs: null,
		score: 90,
		hops: 40,
		pickups: 1,
		goldPickups: 0
	})), "OK", "a run with no nests passes");
	eq(reason(good({
		deaths: 1,
		nests: 5,
		level: 2,
		bestStreak: 5,
		firstFiveNestsMs: 4e4,
		hops: 100,
		score: 1e3
	})), "OK", "a level-clear with a death after passes");
}
eq(typeof parseResult(null), "string", "null result refused");
eq(typeof parseResult([]), "string", "array result refused");
eq(typeof parseResult("x"), "string", "string result refused");
for (const k of [
	"score",
	"level",
	"nests",
	"pickups",
	"goldPickups",
	"hops",
	"deaths",
	"timeMs",
	"bestStreak"
]) {
	eq(typeof parseResult({
		...good(),
		[k]: 1.5
	}), "string", `${k} must be an integer`);
	eq(typeof parseResult({
		...good(),
		[k]: -1
	}), "string", `${k} must not be negative`);
	eq(typeof parseResult({
		...good(),
		[k]: "5"
	}), "string", `${k} must be a number, not text`);
	eq(typeof parseResult({
		...good(),
		[k]: NaN
	}), "string", `${k} NaN refused`);
	eq(typeof parseResult({
		...good(),
		[k]: 0xe8d4a51000
	}), "string", `${k} huge refused`);
	const copy = { ...good() };
	delete copy[k];
	eq(typeof parseResult(copy), "string", `${k} missing refused`);
}
eq(typeof parseResult({
	...good(),
	level: 0
}), "string", "level 0 refused");
eq(typeof parseResult({
	...good(),
	deaths: 4
}), "string", "more than 3 deaths refused");
eq(typeof parseResult({
	...good(),
	firstFiveNestsMs: -3
}), "string", "negative firstFive refused");
eq(typeof parseResult({
	...good(),
	firstFiveNestsMs: "x"
}), "string", "text firstFive refused");
eq(typeof parseResult({
	...good(),
	firstFiveNestsMs: void 0
}), "string", "undefined firstFive refused (must be null)");
ok(typeof parseResult({
	...good(),
	firstFiveNestsMs: null
}) === "object", "null firstFive accepted");
eq(parseResult({
	...good(),
	characterId: "no-such-fuzzy"
}), "character", "unknown character refused");
eq(parseResult({
	...good(),
	characterId: "__proto__"
}), "character", "__proto__ is not a character");
eq(parseResult({
	...good(),
	characterId: "constructor"
}), "character", "constructor is not a character");
eq(parseResult({
	...good(),
	characterId: 5
}), "character", "numeric character refused");
eq(parseResult({
	...good(),
	characterId: "x".repeat(5e3)
}), "shape", "oversized json refused");
for (const c of CHARACTERS) if (typeof parseResult({
	...good(),
	characterId: c.id
}) !== "object") ok(false, `character ${c.id} should be accepted`);
ok(true, "all 50 characters accepted");
eq(reason(good({ timeMs: elapsed + LIMITS.toleranceMs + 1 })), "time_server", "claiming more time than the server saw");
eq(reason(good({
	timeMs: elapsed + LIMITS.toleranceMs,
	hops: 190
})), "OK", "time within tolerance");
eq(reason(good(), -5), "expired", "finish before start is refused");
eq(reason(good(), LIMITS.runExpireMs + 1), "expired", "finishing after 45 minutes is refused");
eq(reason(good({ timeMs: 9e4 }), 9e4), "OK", "the run clock can be shorter than the server clock (pausing)");
eq(reason(good({ level: 3 })), "level", "level that does not match nests");
eq(reason(good({
	nests: 12,
	level: 2,
	hops: 200
})), "level", "12 nests is level 3");
eq(reason(good({
	nests: 4,
	level: 2,
	bestStreak: 4,
	firstFiveNestsMs: null
})), "level", "4 nests can not be level 2");
eq(reason(good({
	goldPickups: 13,
	pickups: 12
})), "gold", "more gold than pickups");
eq(reason(good({
	hops: 5e3,
	timeMs: 15e4
})), "hop_rate", "impossible hop rate (5000 hops in 150 s)");
eq(reason(good({
	hops: 200,
	timeMs: 2e4
}), 22e3), "hop_rate", "200 hops in 20 s");
eq(reason(good({ hops: 83 })), "hops_min", "fewer hops than 12 per nest (7 nests → 84)");
eq(reason(good({ hops: 84 })), "OK", "exactly 12 hops per nest passes");
eq(reason(good({
	hops: 100,
	nests: 5,
	level: 2,
	bestStreak: 5,
	deaths: 3,
	firstFiveNestsMs: null,
	score: 600,
	pickups: 0,
	goldPickups: 0,
	timeMs: 17e3
}), 2e5), "OK", "100 hops over 17 s is allowed");
eq(reason(good({
	hops: 400,
	nests: 5,
	level: 2,
	bestStreak: 5,
	deaths: 3,
	firstFiveNestsMs: null,
	score: 600,
	pickups: 0,
	goldPickups: 0,
	timeMs: 2e4
}), 2e5), "hop_rate", "400 hops in 20 s is not");
{
	const ceil = scoreCeiling(good());
	eq(reason(good({ score: ceil })), "OK", "a score exactly at the ceiling passes");
	eq(reason(good({ score: ceil + 1 })), "score", "one point over the ceiling is refused");
	eq(reason(good({ score: 4e5 })), "score", "a big score the stats can not support is refused by the ceiling");
	ok(typeof parseResult({
		...good(),
		score: 9999999
	}) === "string", "absurd score refused by parse limits");
	let worst = 0;
	for (let nests = 0; nests <= 60; nests += 5) {
		const level = 1 + Math.floor(nests / 5), hops = nests * 12 + 12;
		const perfect = nests * 230 + (level - 1) * 200 + Math.floor(hops * .14 / 1.6) * 100;
		const c = scoreCeiling({
			nests,
			deaths: 0,
			level,
			pickups: Math.floor(hops * .14 / 1.6),
			goldPickups: Math.floor(hops * .14 / 1.6),
			hops
		});
		worst = Math.max(worst, perfect - c);
	}
	ok(worst <= 0, `a perfect player with all-gold pickups is under the ceiling (max overshoot ${worst})`);
}
eq(RULES.rowsPerAttempt, 12, "rules constant: 12 rows");
eq(RULES.hopMs, 140, "rules constant: hop 140 ms");
eq(reason(good({
	bestStreak: 8,
	nests: 7
})), "streak", "streak longer than the nests");
eq(reason(good({
	deaths: 0,
	nests: 7,
	bestStreak: 5
})), "streak", "no deaths but streak ≠ nests");
eq(reason(good({
	deaths: 1,
	nests: 7,
	bestStreak: 3
})), "streak", "7 nests with one death needs a streak of 4+");
eq(reason(good({
	deaths: 1,
	nests: 7,
	bestStreak: 4,
	firstFiveNestsMs: null
})), "OK", "streak 4 of 7 nests with one death passes");
eq(reason(good({
	deaths: 2,
	nests: 7,
	bestStreak: 3,
	firstFiveNestsMs: null
})), "OK", "streak 3 with two deaths passes");
eq(reason(good({
	deaths: 0,
	nests: 5,
	level: 2,
	bestStreak: 5,
	firstFiveNestsMs: 4e4,
	hops: 70,
	score: 900
})), "OK", "a flawless level 1 passes");
eq(reason(good({ firstFiveNestsMs: 13999 })), "fastest_min", "faster than the physical minimum");
eq(reason(good({ firstFiveNestsMs: 8400 })), "fastest_min", "8.4 s (pure hopping) refused");
eq(reason(good({ firstFiveNestsMs: 0 })), "fastest_min", "0 ms refused");
eq(reason(good({ firstFiveNestsMs: 14e3 })), "OK", "14 s passes the minimum");
{
	const x = v(good({ firstFiveNestsMs: 18e3 }));
	ok(x.ok && x.flags.includes("fast_nests"), "18 s passes but is flagged");
	const y = v(good({ firstFiveNestsMs: 38e3 }));
	ok(y.ok && !y.flags.includes("fast_nests"), "38 s is not flagged");
}
eq(reason(good({ firstFiveNestsMs: 16e4 })), "fastest_time", "five-nest time longer than the whole run");
eq(reason(good({
	nests: 3,
	level: 1,
	bestStreak: 3,
	deaths: 3,
	firstFiveNestsMs: 3e4,
	hops: 40,
	score: 400
})), "fastest_nests", "a fastest time without five nests");
{
	const r = v(good({
		bestStreak: 4,
		firstFiveNestsMs: 3e4
	}));
	ok(!r.ok && r.reason === "fastest_nests", "five-nest time without a streak of five is refused");
}
{
	const x = v(good({
		score: 2200,
		nests: 8,
		level: 2,
		hops: 110,
		pickups: 0,
		goldPickups: 0,
		bestStreak: 5,
		deaths: 3,
		timeMs: 25e3,
		firstFiveNestsMs: null
	}), 26e3);
	ok(x.ok && x.flags.includes("score_rate"), "a score of 100 points a second is flagged");
}
{
	const x = v(good({
		pickups: 20,
		goldPickups: 15
	}));
	ok(x.ok && x.flags.includes("gold_ratio"), "mostly-gold pickups are flagged");
}
{
	const x = v(good({
		pickups: 200,
		goldPickups: 0,
		timeMs: 15e4
	}));
	eq(x.ok ? "OK" : x.reason, "pickup_rate", "more pickups than tokens that can spawn");
}
{
	const bv = boardValues(good());
	eq(bv.score, 1500, "score board value");
	eq(bv.fastest, 38e3, "fastest board value");
	eq(bv.streak, 5, "streak board value");
	const none = boardValues(good({
		score: 0,
		firstFiveNestsMs: null,
		bestStreak: 0
	}));
	ok(none.score === null && none.fastest === null && none.streak === null, "a zero run is on no board");
}
ok(LIMITS.minFastestMs > RULES.nestsPerLevel * RULES.rowsPerAttempt * RULES.hopMs, "the fastest-time floor is above the pure-hopping minimum (8.4 s)");
ok(LIMITS.runExpireMs === 27e5, "runs expire after 45 minutes");
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
//#endregion
export {};
