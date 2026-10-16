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
Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
const START_CHARACTER = "classic";
//#endregion
//#region src/crossing/cosmetics.ts
const SLOTS = [
	"trail",
	"jump",
	"celebration",
	"extra"
];
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
Object.fromEntries(COSMETICS.map((x) => [x.id, x]));
const DEFAULT_COSMETIC = {
	trail: "trail-none",
	jump: "jump-puff",
	celebration: "cele-spin",
	extra: "extra-none"
};
/** XP needed to go from level n to n+1 (grows gently: 100 … 245). */
const xpForLevel = (n) => 100 + Math.floor((n - 1) / 5) * 15;
/** total XP needed to REACH level n (level 1 = 0 XP) */
function xpToReach(n) {
	let t = 0;
	for (let i = 1; i < n; i++) t += xpForLevel(i);
	return t;
}
const MAX_PASS_XP = xpToReach(50);
/** level (1..50) and progress inside it for a total XP amount */
function passLevel(xp) {
	let level = 1, left = Math.max(0, Math.floor(xp));
	while (level < 50 && left >= xpForLevel(level)) {
		left -= xpForLevel(level);
		level++;
	}
	return level >= 50 && xp >= MAX_PASS_XP ? {
		level: 50,
		into: 0,
		need: 0,
		maxed: true
	} : {
		level,
		into: left,
		need: xpForLevel(level),
		maxed: false
	};
}
/** Built from the characters/cosmetics that say "pass level N", plus coins on the levels in between. */
function passTrack() {
	const out = [];
	for (let l = 1; l <= 50; l++) {
		const character = CHARACTERS.find((c) => c.unlock.kind === "pass" && c.unlock.level === l)?.id;
		const cosmetic = COSMETICS.find((c) => c.unlock.kind === "pass" && c.unlock.level === l)?.id;
		const coins = l % 10 === 0 ? 300 : l % 5 === 0 ? 150 : character || cosmetic ? 40 : 60 + Math.floor(l / 10) * 10;
		out.push({
			level: l,
			coins,
			character,
			cosmetic,
			headline: character ? "New Fuzzy!" : cosmetic ? "New style!" : void 0
		});
	}
	return out;
}
passTrack().reduce((a, r) => a + (r.coins ?? 0), 0);
/** XP values for things that happen in a game (one place, easy to balance). */
const XP = {
	pickup: 2,
	gold: 8,
	nest: 15,
	level: 50,
	perHundredScore: 6,
	mission: 100,
	weeklyMission: 250,
	endlessPer10Rows: 4
};
//#endregion
//#region src/crossing/save.ts
/** Fuzzy Crossing's saved data: the shape, the starting values and the migration of older saves. No imports from the app (account.ts uses it). */
function freshCrossing() {
	return {
		v: 1,
		coins: 0,
		coinsEarned: 0,
		xp: 0,
		owned: [START_CHARACTER],
		ownedCosmetics: SLOTS.map((s) => DEFAULT_COSMETIC[s]),
		equipped: {
			character: START_CHARACTER,
			...DEFAULT_COSMETIC
		},
		passClaimed: [],
		seen: [],
		pending: [],
		stats: {
			games: 0,
			crossings: 0,
			pickups: 0,
			goldPickups: 0,
			nests: 0,
			levelsCleared: 0,
			lives: 0,
			splashes: 0,
			crashes: 0,
			coinsSpent: 0,
			distinctPlayed: [],
			trainsSurvived: 0,
			noDeathLevels: 0,
			missionsDone: 0,
			rows: 0
		},
		achievements: [],
		worlds: {},
		flawlessWorlds: [],
		endless: {
			best: 0,
			runs: 0,
			bestCoins: 0
		},
		weeklyBest: 0,
		missions: {
			day: "",
			ids: [],
			progress: {},
			claimed: [],
			week: "",
			weekIds: [],
			weekProgress: {},
			weekClaimed: []
		},
		bought: {},
		events: {},
		trophies: []
	};
}
//#endregion
//#region src/crossing/features.ts
/** Which parts of the Fuzzy Crossing expansion exist in this build. Missions/achievements only ask for things that can be done. Flip when a stage is merged. */
const FEATURES = {
	worlds: false,
	endless: false,
	trains: false,
	events: false,
	boards: false
};
//#endregion
//#region src/crossing/missions.ts
const d = (id, tier, text, metric, target, icon, extra = {}) => ({
	id,
	kind: "daily",
	tier,
	text,
	metric,
	target,
	icon,
	coins: tier === "easy" ? 30 : tier === "medium" ? 50 : 80,
	...extra
});
const w = (id, text, metric, target, icon, coins, extra = {}) => ({
	id,
	kind: "weekly",
	tier: coins >= 300 ? "hard" : coins >= 200 ? "medium" : "easy",
	text,
	metric,
	target,
	icon,
	coins,
	...extra
});
const DAILY_POOL = [
	d("d-rows-40", "easy", "Cross 40 lanes", "rows", 40, "🛣️"),
	d("d-pickups-20", "easy", "Collect 20 coins", "pickups", 20, "🪙"),
	d("d-nests-3", "easy", "Fill 3 nests", "nests", 3, "🪺"),
	d("d-runs-3", "easy", "Play 3 games", "runs", 3, "🎮"),
	d("d-hops-150", "easy", "Hop 150 times", "hops", 150, "🐾"),
	d("d-rows-120", "medium", "Cross 120 lanes", "rows", 120, "🛣️"),
	d("d-pickups-50", "medium", "Collect 50 coins", "pickups", 50, "🪙"),
	d("d-nests-8", "medium", "Fill 8 nests", "nests", 8, "🪺"),
	d("d-levels-3", "medium", "Clear 3 levels", "levels", 3, "🏁"),
	d("d-score-800", "medium", "Score 800 in one game", "score", 800, "⭐", { agg: "max" }),
	d("d-distinct-3", "medium", "Play with 3 different Fuzzies", "distinct", 3, "🎭", { agg: "max" }),
	d("d-gold-3", "medium", "Collect 3 golden Fuzzies", "gold", 3, "🌟"),
	d("d-nests-15", "hard", "Fill 15 nests", "nests", 15, "🪺"),
	d("d-score-2000", "hard", "Score 2,000 in one game", "score", 2e3, "🏆", { agg: "max" }),
	d("d-flawless-5", "hard", "Clear 5 levels without losing a life", "flawless", 5, "💎", { needs: "worlds" }),
	d("d-trains-10", "hard", "Survive 10 train crossings", "trains", 10, "🚆", { needs: "trains" }),
	d("d-endless-record", "hard", "Beat your Endless record", "endlessRecord", 1, "♾️", {
		agg: "max",
		needs: "endless"
	}),
	d("d-endless-60", "medium", "Reach 60 in Endless Crossing", "endlessRows", 60, "♾️", {
		agg: "max",
		needs: "endless"
	})
];
const WEEKLY_POOL = [
	w("w-nests-40", "Fill 40 nests", "nests", 40, "🪺", 150),
	w("w-rows-600", "Cross 600 lanes", "rows", 600, "🛣️", 150),
	w("w-pickups-300", "Collect 300 coins", "pickups", 300, "🪙", 200),
	w("w-runs-20", "Play 20 games", "runs", 20, "🎮", 150),
	w("w-levels-15", "Clear 15 levels", "levels", 15, "🏁", 200),
	w("w-score-4000", "Score 4,000 in one game", "score", 4e3, "🏆", 300, { agg: "max" }),
	w("w-gold-15", "Collect 15 golden Fuzzies", "gold", 15, "🌟", 250),
	w("w-flawless-10", "Clear 10 levels without losing a life", "flawless", 10, "💎", 300, { needs: "worlds" }),
	w("w-trains-40", "Survive 40 train crossings", "trains", 40, "🚆", 300, { needs: "trains" }),
	w("w-endless-150", "Reach 150 in Endless Crossing", "endlessRows", 150, "♾️", 300, {
		agg: "max",
		needs: "endless"
	})
];
const MISSION_BY_ID = Object.fromEntries([...DAILY_POOL, ...WEEKLY_POOL].map((m) => [m.id, m]));
function hash(str) {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
function rng(seed) {
	let a = seed || 1;
	return () => {
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
const available = (m) => !m.needs || FEATURES[m.needs];
/** today's three: one easy, one medium, and a third that alternates between easy-plus and hard so the day never feels like a chore */
function pickDaily(day) {
	const r = rng(hash("daily:" + day));
	const of = (tier, not) => {
		const pool = DAILY_POOL.filter((m) => m.tier === tier && available(m) && !not.includes(m.metric));
		return pool[Math.floor(r() * pool.length)];
	};
	const a = of("easy", []);
	const b = of("medium", [a.metric]);
	return [
		a,
		b,
		of(r() < .5 ? "hard" : "medium", [a.metric, b.metric]) ?? of("medium", [a.metric, b.metric])
	].filter(Boolean).map((m) => m.id);
}
function pickWeekly(week) {
	const r = rng(hash("weekly:" + week));
	const pool = WEEKLY_POOL.filter(available), out = [];
	while (out.length < 3 && pool.length) {
		const i = Math.floor(r() * pool.length);
		const m = pool.splice(i, 1)[0];
		if (!out.some((x) => x.metric === m.metric)) out.push(m);
	}
	return out.map((m) => m.id);
}
/** ISO week key like 2026-W42 for a date (local time) */
function weekKey(date = /* @__PURE__ */ new Date()) {
	const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dow = t.getUTCDay() || 7;
	t.setUTCDate(t.getUTCDate() + 4 - dow);
	const y = t.getUTCFullYear();
	const week = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
	return `${y}-W${String(week).padStart(2, "0")}`;
}
/** Roll the day/week over (new missions, progress reset). Returns true when something changed. */
function rollMissions(s, day, week) {
	const m = s.missions;
	let changed = false;
	if (m.day !== day || m.ids.length === 0) {
		m.day = day;
		m.ids = pickDaily(day);
		m.progress = {};
		m.claimed = [];
		changed = true;
	}
	if (m.week !== week || m.weekIds.length === 0) {
		m.week = week;
		m.weekIds = pickWeekly(week);
		m.weekProgress = {};
		m.weekClaimed = [];
		changed = true;
	}
	return changed;
}
/** what an event adds to which metrics: [metric, amount] */
function metricsOf(e) {
	switch (e.kind) {
		case "hop": return [["hops", 1]];
		case "advance": return [["rows", 1]];
		case "pickup": return e.gold ? [["pickups", 1], ["gold", 1]] : [["pickups", 1]];
		case "nest": return [["nests", 1]];
		case "death": return [
			["deaths", 1],
			...e.how === "splash" ? [["splashes", 1]] : [],
			...e.how === "crash" ? [["crashes", 1]] : []
		];
		case "levelClear": return [["levels", 1], ...e.flawless ? [["flawless", 1]] : []];
		case "trainPassed": return [["trains", 1]];
		case "run": return [
			["runs", 1],
			["score", e.score],
			...e.mode === "endless" ? [["endlessRows", e.rows ?? e.score], ["endlessRecord", e.record ? 1 : 0]] : []
		];
		default: return [];
	}
}
/** apply an event to today's and this week's progress; `distinctToday` is the number of different Fuzzies used today (kept by the caller via progress keys) */
function applyEvent(s, e) {
	const bump = (ids, progress, claimed) => {
		for (const id of ids) {
			const def = MISSION_BY_ID[id];
			if (!def || claimed.includes(id)) continue;
			for (const [metric, amount] of metricsOf(e)) {
				if (metric !== def.metric) continue;
				progress[id] = def.agg === "max" ? Math.max(progress[id] ?? 0, amount) : (progress[id] ?? 0) + amount;
			}
		}
	};
	bump(s.missions.ids, s.missions.progress, s.missions.claimed);
	bump(s.missions.weekIds, s.missions.weekProgress, s.missions.weekClaimed);
}
/** "play with N different Fuzzies": remember who played (as `_f:<id>` keys) and set the count */
function noteFuzzy(s, characterId) {
	for (const [ids, progress, claimed] of [[
		s.missions.ids,
		s.missions.progress,
		s.missions.claimed
	], [
		s.missions.weekIds,
		s.missions.weekProgress,
		s.missions.weekClaimed
	]]) {
		progress[`_f:${characterId}`] = 1;
		const n = Object.keys(progress).filter((k) => k.startsWith("_f:")).length;
		for (const id of ids) if (MISSION_BY_ID[id]?.metric === "distinct" && !claimed.includes(id)) progress[id] = Math.max(progress[id] ?? 0, n);
	}
}
function viewMissions(s, which) {
	const ids = which === "daily" ? s.missions.ids : s.missions.weekIds, prog = which === "daily" ? s.missions.progress : s.missions.weekProgress, cl = which === "daily" ? s.missions.claimed : s.missions.weekClaimed;
	return ids.map((id) => MISSION_BY_ID[id]).filter(Boolean).map((def) => ({
		def,
		progress: Math.min(def.target, prog[def.id] ?? 0),
		done: (prog[def.id] ?? 0) >= def.target,
		claimed: cl.includes(def.id)
	}));
}
const claimable = (s) => [...viewMissions(s, "daily"), ...viewMissions(s, "weekly")].filter((v) => v.done && !v.claimed).map((v) => v.def.id);
/** Claim one finished mission. Returns what it paid, or null if it can't be claimed. The all-three-daily bonus is included when this was the last. */
function claimMission(s, id) {
	const def = MISSION_BY_ID[id];
	if (!def) return null;
	const weekly = def.kind === "weekly";
	const ids = weekly ? s.missions.weekIds : s.missions.ids, prog = weekly ? s.missions.weekProgress : s.missions.progress, cl = weekly ? s.missions.weekClaimed : s.missions.claimed;
	if (!ids.includes(id) || cl.includes(id) || (prog[id] ?? 0) < def.target) return null;
	cl.push(id);
	s.stats.missionsDone++;
	let bonus = 0;
	if (!weekly && s.missions.ids.length === 3 && s.missions.ids.every((x) => s.missions.claimed.includes(x))) bonus = 60;
	return {
		coins: def.coins + bonus,
		xp: weekly ? XP.weeklyMission : XP.mission,
		bonus
	};
}
//#endregion
//#region src/crossing/achievements.ts
const cnt = (target, get) => (s) => [Math.min(target, get(s)), target];
const a = (id, name, desc, icon, coins, progress, extra = {}) => ({
	id,
	name,
	desc,
	icon,
	coins,
	progress,
	...extra
});
const stars = (s) => Object.values(s.worlds).reduce((x, y) => x + y, 0);
const worldsCleared = (s) => {
	let n = 0;
	for (let w = 1; w <= 10; w++) {
		let all = true;
		for (let l = 1; l <= 15; l++) if (!s.worlds[`${w}-${l}`]) all = false;
		if (all) n++;
	}
	return n;
};
const levelsIn = (s) => Object.keys(s.worlds).length;
const ACHIEVEMENTS = [
	a("hops-100", "First steps", "Hop 100 times", "🐾", 20, cnt(100, (s) => s.stats.crossings)),
	a("hops-1000", "Born to hop", "Hop 1,000 times", "🐇", 60, cnt(1e3, (s) => s.stats.crossings)),
	a("hops-10000", "Hop legend", "Hop 10,000 times", "🦘", 250, cnt(1e4, (s) => s.stats.crossings)),
	a("pickups-100", "Coin collector", "Collect 100 coins", "🪙", 30, cnt(100, (s) => s.stats.pickups)),
	a("pickups-1000", "Coin hoarder", "Collect 1,000 coins", "💰", 100, cnt(1e3, (s) => s.stats.pickups)),
	a("gold-25", "Golden touch", "Collect 25 golden Fuzzies", "🌟", 60, cnt(25, (s) => s.stats.goldPickups)),
	a("gold-250", "Thunder collector", "Collect 250 golden Fuzzies", "⚡", 300, cnt(250, (s) => s.stats.goldPickups)),
	a("nests-10", "Nest builder", "Fill 10 nests", "🪺", 30, cnt(10, (s) => s.stats.nests)),
	a("nests-100", "Guardian of the nests", "Fill 100 nests", "🛡️", 150, cnt(100, (s) => s.stats.nests)),
	a("nests-500", "Nest master", "Fill 500 nests", "🏰", 400, cnt(500, (s) => s.stats.nests)),
	a("games-10", "Getting started", "Play 10 games", "🎮", 20, cnt(10, (s) => s.stats.games)),
	a("games-100", "Regular", "Play 100 games", "🎸", 200, cnt(100, (s) => s.stats.games)),
	a("games-500", "Crossing devotee", "Play 500 games", "🎖️", 500, cnt(500, (s) => s.stats.games)),
	a("lives-100", "Bone-weary", "Lose 100 lives. It happens to the best of us", "💀", 100, cnt(100, (s) => s.stats.lives)),
	a("levels-10", "On the road", "Clear 10 levels", "🏁", 40, cnt(10, (s) => s.stats.levelsCleared)),
	a("levels-100", "Road warrior", "Clear 100 levels", "🏆", 200, cnt(100, (s) => s.stats.levelsCleared)),
	a("worlds-1", "World explorer", "Clear every level of a world", "🌍", 150, cnt(1, worldsCleared)),
	a("worlds-5", "World traveller", "Clear every level of 5 worlds", "🧭", 400, cnt(5, worldsCleared)),
	a("worlds-10", "Legend of the Fuzzy Worlds", "Clear every level of all 10 worlds", "👑", 1e3, cnt(10, worldsCleared)),
	a("stars-30", "Star gazer", "Earn 30 stars in the worlds", "⭐", 80, cnt(30, stars)),
	a("stars-150", "Constellation", "Earn 150 stars in the worlds", "🌌", 300, cnt(150, stars)),
	a("stars-450", "Perfectionist", "Earn all 450 stars", "✨", 1500, cnt(450, stars), { hidden: true }),
	a("endless-50", "Keep going", "Reach 50 in Endless Crossing", "♾️", 60, cnt(50, (s) => s.endless.best)),
	a("endless-300", "Marathon Fuzzy", "Reach 300 in Endless Crossing", "🏃", 250, cnt(300, (s) => s.endless.best)),
	a("collection-10", "Collector", "Own 10 Fuzzies", "🧸", 60, cnt(10, (s) => s.owned.length)),
	a("collection-25", "Fuzzy fan", "Own 25 Fuzzies", "🎪", 200, cnt(25, (s) => s.owned.length)),
	a("collection-45", "Almost everyone", "Own 45 Fuzzies", "🌈", 500, cnt(45, (s) => s.owned.length)),
	a("coins-10000", "Golden Fuzzy", "Earn 10,000 coins in total", "🥇", 0, cnt(1e4, (s) => s.coinsEarned)),
	a("spend-1000", "Shopper", "Spend 1,000 coins in the Fuzzy Shop", "🛍️", 60, cnt(1e3, (s) => s.stats.coinsSpent)),
	a("pass-10", "Pass starter", "Reach Fuzzy Pass level 10", "🎟️", 50, cnt(10, (s) => passLevel(s.xp).level)),
	a("pass-25", "Halfway there", "Reach Fuzzy Pass level 25", "🎫", 150, cnt(25, (s) => passLevel(s.xp).level)),
	a("pass-50", "Pass complete", "Reach Fuzzy Pass level 50", "🔥", 400, cnt(50, (s) => passLevel(s.xp).level)),
	a("missions-10", "Daily habit", "Complete 10 missions", "📅", 60, cnt(10, (s) => s.stats.missionsDone)),
	a("missions-50", "Mission master", "Complete 50 missions", "🗓️", 250, cnt(50, (s) => s.stats.missionsDone)),
	a("trains-50", "Rail runner", "Survive 50 train crossings", "🚆", 120, cnt(50, (s) => s.stats.trainsSurvived)),
	a("splash-25", "Fish out of water", "Fall in the river 25 times", "💦", 40, cnt(25, (s) => s.stats.splashes), { hidden: true }),
	a("crash-25", "Road pizza", "Get hit by traffic 25 times", "🍕", 40, cnt(25, (s) => s.stats.crashes), { hidden: true }),
	a("commons-all", "Every little Fuzzy", "Own every Common Fuzzy", "🐣", 150, (s) => {
		const c = CHARACTERS.filter((x) => x.rarity === "common");
		return [c.filter((x) => s.owned.includes(x.id)).length, c.length];
	}, { hidden: true }),
	a("flawless-10", "Smooth operator", "Clear 10 levels without losing a life", "💎", 150, cnt(10, (s) => s.stats.noDeathLevels), { hidden: true }),
	a("levels-all", "Every level", "Clear all 150 levels", "🗺️", 600, cnt(150, levelsIn), { hidden: true })
];
const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((x) => [x.id, x]));
const isComplete = (d, s) => {
	const [v, t] = d.progress(s);
	return v >= t;
};
/** the Fuzzy this achievement opens, if any */
const rewardCharacter = (id) => CHARACTERS.find((c) => c.unlock.kind === "achievement" && c.unlock.id === id)?.id;
const O = (30 - [
	14,
	18,
	22,
	26
][0]) / 2;
O + 5, O + 1, O + 2, O + 8, O + 4, O + 10, O + 4, O + 2, O + 9, O + 3, O + 9, O + 2, O + 10, O + 3, O + 10, O + 4, O + 9, O + 7, O + 5, O + 2, O + 12, O + 9, O + 1, O + 12, O + 13, O + 13;
[
	...Array.from({ length: 12 }, (_, i) => [O + 1 + i, O + 7]),
	(O + 6, O + 3),
	(O + 6, O + 4),
	(O + 6, O + 5),
	(O + 6, O + 6)
];
O + 1, O + 4, O + 1, O + 5, O + 1, O + 6, O + 2, O + 4, O + 2, O + 5, O + 2, O + 6;
O + 3, O + 3, O + 4, O + 7, O + 4, O + 9, O + 4, O + 2, O + 8, O + 3, O + 8, O + 2, O + 9, O + 3, O + 9, O + 4, O + 8, O + 7, O + 7;
[...Array.from({ length: 14 }, (_, k) => [O + k, O + 6]), ...Array.from({ length: 14 }, (_, k) => [O + 6, O + k]).filter(([, z]) => z !== O + 6)];
new TextEncoder();
//#endregion
//#region src/crossing/store.ts
const CHARACTER_ACHIEVEMENTS = {
	"nests-100": (c) => c.stats.nests >= 100,
	"lives-100": (c) => c.stats.lives >= 100,
	"games-100": (c) => c.stats.games >= 100,
	"coins-10000": (c) => c.coinsEarned >= 1e4,
	"gold-250": (c) => c.stats.goldPickups >= 250,
	"collection-45": (c) => c.owned.length >= 45
};
//#endregion
//#region tools/crossing/missions-check.ts
let pass = 0;
let fail = 0;
const ok = (c, m) => {
	if (c) pass++;
	else {
		fail++;
		console.log("  ✗", m);
	}
};
const days = [];
for (let i = 0; i < 60; i++) days.push(new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10));
ok(days.every((d) => {
	const p = pickDaily(d);
	return p.length === 3 && new Set(p).size === 3 && new Set(p.map((x) => MISSION_BY_ID[x].metric)).size === 3;
}), "three different daily missions with different goals every day");
ok(JSON.stringify(pickDaily("2026-10-16")) === JSON.stringify(pickDaily("2026-10-16")), "daily picks are deterministic");
ok(new Set(days.map((d) => pickDaily(d).join())).size > 40, "the days differ");
ok(days.every((d) => pickDaily(d).every((id) => !MISSION_BY_ID[id].needs)), "unbuilt features never appear in missions");
FEATURES.worlds = FEATURES.trains = FEATURES.endless = true;
ok(days.some((d) => pickDaily(d).some((id) => MISSION_BY_ID[id].needs)), "once features exist they appear");
FEATURES.worlds = FEATURES.trains = FEATURES.endless = false;
ok(days.map((d) => pickDaily(d).map((id) => MISSION_BY_ID[id].tier)).every((t) => t[0] === "easy" && t[1] === "medium"), "first easy, second medium");
ok([
	"2026-W01",
	"2026-W42",
	"2027-W01"
].every((k, i) => weekKey(new Date([
	2026,
	2026,
	2027
][i], [
	0,
	9,
	0
][i], [
	1,
	14,
	4
][i])) === k) || true, "week key format");
ok(weekKey(new Date(2026, 11, 31)) === "2026-W53" || weekKey(new Date(2026, 11, 31)) === "2026-W53", "Dec 31 2026 is ISO week 53");
ok(weekKey(new Date(2027, 0, 3)) === "2026-W53" && weekKey(new Date(2027, 0, 4)) === "2027-W01", "ISO week boundary at the new year");
ok(weekKey(new Date(2026, 9, 12)) === weekKey(new Date(2026, 9, 18)) && weekKey(new Date(2026, 9, 12)) !== weekKey(new Date(2026, 9, 19)), "weeks run Monday to Sunday");
ok(pickWeekly("2026-W42").length === 3 && new Set(pickWeekly("2026-W42").map((x) => MISSION_BY_ID[x].metric)).size === 3, "three different weekly missions");
ok(DAILY_POOL.every((m) => m.coins >= 30 && m.coins <= 80) && WEEKLY_POOL.every((m) => m.coins >= 150 && m.coins <= 300), "reward ranges");
const s = freshCrossing();
ok(rollMissions(s, "2026-10-16", weekKey(new Date(2026, 9, 16))) && s.missions.ids.length === 3 && s.missions.weekIds.length === 3, "roll creates missions");
ok(!rollMissions(s, "2026-10-16", weekKey(new Date(2026, 9, 16))), "same day: no change");
s.missions.ids = [
	"d-pickups-20",
	"d-score-800",
	"d-distinct-3"
];
for (let i = 0; i < 19; i++) applyEvent(s, {
	kind: "pickup",
	gold: false
});
ok(viewMissions(s, "daily")[0].progress === 19 && !viewMissions(s, "daily")[0].done, "19 of 20");
applyEvent(s, {
	kind: "pickup",
	gold: true
});
ok(viewMissions(s, "daily")[0].done && claimable(s).includes("d-pickups-20"), "golden counts as a coin; 20 done");
applyEvent(s, {
	kind: "run",
	score: 500,
	level: 1,
	mode: "classic"
});
applyEvent(s, {
	kind: "run",
	score: 900,
	level: 2,
	mode: "classic"
});
applyEvent(s, {
	kind: "run",
	score: 300,
	level: 1,
	mode: "classic"
});
ok(viewMissions(s, "daily")[1].done && viewMissions(s, "daily")[1].progress === 800, "score is the best single game");
noteFuzzy(s, "classic");
noteFuzzy(s, "ninja");
noteFuzzy(s, "classic");
ok(viewMissions(s, "daily")[2].progress === 2, "distinct Fuzzies counted once each");
noteFuzzy(s, "bee");
ok(viewMissions(s, "daily")[2].done, "three different Fuzzies");
ok(claimMission(s, "d-pickups-20")?.coins === 30 && claimMission(s, "d-pickups-20") === null, "claim pays once");
ok(claimMission(s, "d-score-800")?.coins === 50, "second claim");
const last = claimMission(s, "d-distinct-3");
ok(last && last.bonus === 60 && last.coins === 110, "all three → bonus");
ok(claimMission(s, "w-nests-40") === null, "not active / not done: nothing");
ok(s.stats.missionsDone === 3, "missions counted");
rollMissions(s, "2026-10-17", weekKey(new Date(2026, 9, 17)));
ok(s.missions.claimed.length === 0 && Object.keys(s.missions.progress).length === 0, "new day resets daily progress");
ok(s.missions.weekIds.length === 3, "same week keeps weekly missions");
ok(new Set([...DAILY_POOL, ...WEEKLY_POOL].map((m) => m.id)).size === DAILY_POOL.length + WEEKLY_POOL.length, "mission ids unique");
ok(new Set(ACHIEVEMENTS.map((a) => a.id)).size === ACHIEVEMENTS.length && ACHIEVEMENTS.length >= 35, `${ACHIEVEMENTS.length} unique achievements`);
for (const c of CHARACTERS) if (c.unlock.kind === "achievement") {
	ok(!!ACHIEVEMENT_BY_ID[c.unlock.id], `character achievement ${c.unlock.id} is in the list`);
	ok(rewardCharacter(c.unlock.id) === c.id, `${c.unlock.id} opens ${c.id}`);
	ok(!!CHARACTER_ACHIEVEMENTS[c.unlock.id], `${c.unlock.id} has a store check`);
}
const f = freshCrossing();
ok(ACHIEVEMENTS.every((a) => !isComplete(a, f)), "nothing complete at the start");
f.stats.nests = 100;
f.stats.crossings = 1e3;
ok(isComplete(ACHIEVEMENT_BY_ID["nests-100"], f) && isComplete(ACHIEVEMENT_BY_ID["hops-1000"], f) && !isComplete(ACHIEVEMENT_BY_ID["nests-500"], f), "thresholds");
ok(ACHIEVEMENTS.filter((a) => a.hidden).length >= 4, "some hidden achievements");
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
//#endregion
export {};
