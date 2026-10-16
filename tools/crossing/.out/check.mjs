//#region src/crossing/characters.ts
const RARITIES = [
	"common",
	"rare",
	"epic",
	"legendary",
	"mythic"
];
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
const START_CHARACTER = "classic";
/** Plain-language "how do I get this" (the Locker's How to Unlock panel; the screens add the direct link). */
function unlockText(c) {
	const k = c.unlock;
	switch (k.kind) {
		case "start": return "You start with this Fuzzy.";
		case "pass": return `Reach Fuzzy Pass level ${k.level}.`;
		case "shop": return k.slot === "permanent" ? `Buy in the Fuzzy Shop for ${k.price} coins.` : `Appears in the Fuzzy Shop's rotating selection for ${k.price} coins — check back daily and weekly.`;
		case "season": return `Complete the ${EVENT_NAME[k.event]} event challenge. It comes back every year, and what you earn is yours forever.`;
		case "achievement": return `Achievement: ${ACHIEVEMENT_HINT[k.id] ?? "complete the achievement"}.`;
		case "world": return `Clear all 15 levels of ${WORLD_NAME[k.world - 1]} (world ${k.world}).`;
		case "endless": return `Reach ${k.score} in Endless Crossing.`;
		case "weekly": return k.top === 1 ? "Finish #1 on a weekly leaderboard." : `Finish in the top ${k.top} of any weekly leaderboard.`;
		case "challenge": return CHALLENGE_HINT[k.id] ?? "Complete the special challenge.";
		case "secret": return "A secret. Keep playing and exploring…";
	}
}
const EVENT_NAME = {
	halloween: "Halloween",
	christmas: "Christmas",
	hanukkah: "Hanukkah",
	lunar: "Lunar New Year",
	easter: "Easter",
	summer: "Summer Festival",
	thanksgiving: "Thanksgiving",
	winter: "Winter Festival"
};
const WORLD_NAME = [
	"Sunny Meadows",
	"Busy Fuzzy City",
	"Forest Adventure",
	"Railway Rush",
	"Stormy Valley",
	"Snowy Mountain",
	"Haunted Crossing",
	"Tropical Island",
	"Neon City",
	"Legendary Fuzzy World"
];
/** achievements that award a character (the full achievement list lives in achievements.ts) */
const ACHIEVEMENT_HINT = {
	"nests-100": "fill 100 nests",
	"lives-100": "lose 100 lives (it happens to the best of us)",
	"games-100": "play 100 games",
	"coins-10000": "earn 10,000 coins in total",
	"gold-250": "collect 250 golden Fuzzies",
	"collection-45": "collect 45 of the 50 Fuzzies"
};
const CHALLENGE_HINT = { "flawless-world": "Clear all 15 levels of any world without losing a single life." };
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
const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((x) => [x.id, x]));
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
const PASS_TRACK = passTrack();
/** Total coins the whole free track pays (used by the economy checks). */
const PASS_COINS = PASS_TRACK.reduce((a, r) => a + (r.coins ?? 0), 0);
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
/** Fill in anything missing in a saved copy; the old Fuzzy Crossing skins a player already unlocked become characters they own. */
function migrateCrossing(raw, unlocked = [], oldSkin = "classic") {
	const f = freshCrossing();
	const s = {
		...f,
		...raw ?? {},
		stats: {
			...f.stats,
			...raw?.stats ?? {}
		},
		equipped: {
			...f.equipped,
			...raw?.equipped ?? {}
		},
		endless: {
			...f.endless,
			...raw?.endless ?? {}
		},
		missions: {
			...f.missions,
			...raw?.missions ?? {}
		}
	};
	const uniq = (xs) => [...new Set(xs)];
	s.owned = uniq([START_CHARACTER, ...s.owned.filter((id) => CHARACTER_BY_ID[id])]);
	if (!raw) {
		for (const c of CHARACTERS) if (c.legacy && c.legacy !== "classic" && unlocked.includes(`skin-${c.legacy}`)) s.owned.push(c.id);
	}
	s.owned = uniq(s.owned);
	s.ownedCosmetics = uniq([...SLOTS.map((x) => DEFAULT_COSMETIC[x]), ...s.ownedCosmetics.filter((id) => COSMETIC_BY_ID[id])]);
	if (!raw) {
		const c = CHARACTERS.find((x) => x.legacy === oldSkin);
		if (c && s.owned.includes(c.id)) s.equipped.character = c.id;
	}
	if (!s.owned.includes(s.equipped.character)) s.equipped.character = START_CHARACTER;
	for (const slot of SLOTS) if (!s.ownedCosmetics.includes(s.equipped[slot])) s.equipped[slot] = DEFAULT_COSMETIC[slot];
	s.coins = Math.max(0, Math.floor(s.coins));
	s.xp = Math.max(0, Math.floor(s.xp));
	s.passClaimed = uniq(s.passClaimed.map(String)).map(Number).filter((n) => n >= 1 && n <= 50);
	return s;
}
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
//#region tools/crossing/check.ts
let pass = 0;
let fail = 0;
const ok = (c, m) => {
	if (c) pass++;
	else {
		fail++;
		console.log("  ✗", m);
	}
};
const count = (xs, f) => xs.filter(f).length;
ok(CHARACTERS.length === 50, `50 characters (${CHARACTERS.length})`);
const want = {
	common: 15,
	rare: 12,
	epic: 10,
	legendary: 8,
	mythic: 5
};
for (const r of RARITIES) ok(count(CHARACTERS, (c) => c.rarity === r) === want[r], `${r}: ${count(CHARACTERS, (c) => c.rarity === r)} / ${want[r]}`);
ok(new Set(CHARACTERS.map((c) => c.id)).size === 50, "unique ids");
ok(new Set(CHARACTERS.map((c) => c.name)).size === 50, "unique names");
const kinds = {};
for (const c of CHARACTERS) kinds[c.unlock.kind + (c.unlock.kind === "shop" ? ":" + c.unlock.slot : "")] = (kinds[c.unlock.kind + (c.unlock.kind === "shop" ? ":" + c.unlock.slot : "")] ?? 0) + 1;
console.log("  unlock ways:", JSON.stringify(kinds));
const buyable = count(CHARACTERS, (c) => c.unlock.kind === "shop");
ok(buyable <= 14, `only ${buyable} of 50 can be bought`);
ok(count(CHARACTERS, (c) => c.rarity === "legendary" || c.rarity === "mythic") === 13 && CHARACTERS.filter((c) => c.rarity === "legendary" || c.rarity === "mythic").every((c) => c.unlock.kind !== "shop"), "no legendary or mythic Fuzzy is for sale");
ok(CHARACTERS.filter((c) => c.rarity === "mythic").every((c) => [
	"weekly",
	"endless",
	"achievement",
	"challenge",
	"secret"
].includes(c.unlock.kind)), "mythics are earned by skill");
ok(CHARACTERS.every((c) => unlockText(c).length > 8), "every Fuzzy has unlock text");
ok(CHARACTERS.every((c) => c.name && c.tagline && c.personality && c.parts !== void 0), "complete definitions");
for (const c of CHARACTERS) if (c.unlock.kind === "achievement") {
	ok(!!CHARACTER_ACHIEVEMENTS[c.unlock.id], `achievement ${c.unlock.id} defined`);
	ok(!!ACHIEVEMENT_HINT[c.unlock.id], `achievement ${c.unlock.id} has a hint`);
}
for (const c of CHARACTERS) if (c.unlock.kind === "challenge") ok(!!CHALLENGE_HINT[c.unlock.id], `challenge ${c.unlock.id} has a hint`);
const wc = CHARACTERS.filter((c) => c.unlock.kind === "world").map((c) => c.unlock.world);
ok(new Set(wc).size === wc.length && wc.every((w) => w >= 6 && w <= 10), "world unlocks are unique, from the late worlds");
ok(PASS_TRACK.length === 50, "pass has 50 levels");
const passChars = CHARACTERS.filter((c) => c.unlock.kind === "pass");
ok(passChars.length === 10, `10 pass characters (${passChars.length})`);
ok(passChars.every((c) => PASS_TRACK[c.unlock.level - 1].character === c.id), "pass track places each pass character on its level");
ok(passChars.every((c, i, a) => i === 0 || true) && new Set(passChars.map((c) => c.unlock.level)).size === passChars.length, "one character per pass level");
ok(passChars.some((c) => c.unlock.level >= 45), "a grand prize at the end of the pass");
ok(PASS_TRACK.every((r) => (r.coins ?? 0) > 0), "every level pays something");
ok(xpToReach(1) === 0 && xpToReach(2) === 100, "xp curve starts at 100");
ok(passLevel(0).level === 1 && passLevel(99).level === 1 && passLevel(100).level === 2 && passLevel(MAX_PASS_XP).maxed && passLevel(MAX_PASS_XP + 500).level === 50, "passLevel maths");
console.log(`  pass: ${MAX_PASS_XP} XP in total, ${PASS_COINS} coins`);
ok(COSMETICS.length >= 34 && new Set(COSMETICS.map((x) => x.id)).size === COSMETICS.length, `${COSMETICS.length} unique cosmetics`);
for (const s of SLOTS) ok(COSMETICS.some((x) => x.slot === s && x.unlock.kind === "free"), `a free default for ${s}`);
const passCos = COSMETICS.filter((x) => x.unlock.kind === "pass");
ok(passCos.every((x) => PASS_TRACK[x.unlock.level - 1].cosmetic === x.id), "pass cosmetics are on the track");
ok(new Set(passCos.map((x) => x.unlock.level)).size === passCos.length, "one cosmetic per pass level");
const price = (c) => c.unlock.kind === "shop" ? c.unlock.price : 0;
ok(CHARACTERS.filter((c) => c.rarity === "common" && price(c)).every((c) => price(c) <= 400), "common prices ≤ 400");
ok(CHARACTERS.filter((c) => c.rarity === "rare" && price(c)).every((c) => price(c) >= 600 && price(c) <= 1e3), "rare prices 600–1000");
ok(CHARACTERS.filter((c) => c.rarity === "epic" && price(c)).every((c) => price(c) >= 2e3 && price(c) <= 3e3), "epic prices 2000–3000");
const f = freshCrossing();
ok(f.owned.length === 1 && f.equipped.character === "classic" && f.coins === 0, "fresh save");
const m = migrateCrossing(void 0, [
	"skin-mint",
	"skin-gold",
	"skin-galaxy"
], "gold");
ok(m.owned.includes("mint") && m.owned.includes("golden") && m.owned.includes("galaxy") && m.equipped.character === "golden", "legacy skins become owned characters and the equipped one is kept");
const m2 = migrateCrossing({
	owned: ["ninja", "nope"],
	equipped: { character: "nope" },
	coins: -5
});
ok(m2.owned.includes("ninja") && !m2.owned.includes("nope") && m2.equipped.character === "classic" && m2.coins === 0, "migration cleans bad data");
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
//#endregion
export {};
