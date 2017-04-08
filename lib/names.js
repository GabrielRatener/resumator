
const {floor, random} = Math;

const cache = new Set();

const adjectives = [
	"wasteful",
	"distasteful",
	"barotropic",
	"volcanic",
	"isotropic",
	"windy",
	"long",
	"juicy",
	"slender",
	"spicy",
	"sweet",
	"slimy",
	"snowy",
	"humid",
	"african",
	"american",
	"opaque",
	"transparent",
	"happy",
	"ethical",
	"unethical",
	"chewy",
	"sleek",
	"bright",
	"dull",
	"alternate",
	"grueling",
	"fierce",
	"tropical",
	"subtropical",
	"polar",
	"incorrect",
	"awesome",
	"intense",
	"curvy",
	"coy",
	"brave",
	"delightful",
	"insightful",
	"intellectual",
	"anonymous",
	"crazy",
	"drastic",
	"legal",
	"liquid",
	"icy",
	"grumpy",
	"brute",
	"peachy",
	"scarce",
	"frozen",
	"happy"
];

const nouns = [
	"chinaman",
	"korean",
	"clay",
	"air shaft",
	"ducky",
	"cigarette",
	"noodle",
	"centrifuge",
	"home",
	"store",
	"war",
	"cold",
	"system",
	"book",
	"trick",
	"airplane",
	"jet",
	"isentrope",
	"volcano",
	"shirt",
	"whisper",
	"gradient",
	"slope",
	"whale",
	"cloud",
	"potato",
	"cyclone",
	"layer",
	"surface",
	"blimp",
	"helicopter",
	"zebra",
	"nautilus",
	"smoothie",
	"tornado",
	"phone",
	"equation",
	"drug",
	"race",
	"crest",
	"planet",
	"orbit",
	"star",
	"emission",
	"typo",
	"glow",
	"storm",
	"soap",
	"strawberry",
	"guava",
	"fig",
	"ficus",
	"stone",
	"door",
	"crab",
	"clam",
	"lamp",
	"spider",
	"viper",
	"chicken"
];


function randomIndex(arr) {
	return floor(random() * arr.length);
}

function randomElement(arr) {
	return arr[randomIndex(arr)];
}

export function randomName() {
	const adj 	= randomElement(adjectives);
	const noun 	= randomElement(nouns);

	return `${adj} ${noun}`;
}

export function newName() {
	const ai = randomIndex(adjectives);
	const ni = randomIndex(nouns);

	cache.add(`${ai} ${ni}`);

	return `${adjectives[ai]} ${nouns[ni]}`;
}


