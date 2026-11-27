/**
 * Writes data/listings.jsonl: a few hundred synthetic listings of homes for sale, in Belgrade and
 * Novi Sad, in Serbian. The numbers come from a seeded generator, so a run writes the same file.
 *
 *   pnpm generate:listings
 */
import { writeFileSync } from 'node:fs'
import type { Heating, Listing } from '../shared/listing.ts'
import { roomWords } from '../shared/listing.ts'
import type { Location } from '../shared/locations.ts'
import { inPlace, locationNamed, placeOf } from '../shared/locations.ts'

/** mulberry32: a small seeded generator, so the listings come out the same on every run. */
function generator(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = generator(20_261_127)
const between = (min: number, max: number) => Math.floor(min + random() * (max - min + 1))
const chance = (probability: number) => random() < probability
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!
function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

type Character = 'old-town' | 'centre' | 'villas' | 'blocks' | 'suburb' | 'novi-sad'

interface Profile {
  count: number
  /** The going price of a square metre, in euros. */
  pricePerM2: number
  character: Character
}

/** How many listings each neighbourhood has, and what it is like. */
const profiles: Record<string, Profile> = {
  Dorćol: { count: 26, pricePerM2: 3600, character: 'old-town' },
  'Kosančićev venac': { count: 6, pricePerM2: 3900, character: 'old-town' },
  Neimar: { count: 12, pricePerM2: 3500, character: 'centre' },
  'Crveni krst': { count: 12, pricePerM2: 3300, character: 'centre' },
  Čubura: { count: 10, pricePerM2: 3400, character: 'centre' },
  Senjak: { count: 9, pricePerM2: 4400, character: 'villas' },
  Dedinje: { count: 9, pricePerM2: 4800, character: 'villas' },
  'Blok 21': { count: 8, pricePerM2: 3300, character: 'blocks' },
  'Blok 23': { count: 8, pricePerM2: 3200, character: 'blocks' },
  'Blok 29': { count: 6, pricePerM2: 3100, character: 'blocks' },
  'Blok 45': { count: 11, pricePerM2: 2900, character: 'blocks' },
  'Blok 61': { count: 7, pricePerM2: 2800, character: 'blocks' },
  'Blok 70': { count: 8, pricePerM2: 2700, character: 'blocks' },
  'Bežanijska kosa': { count: 10, pricePerM2: 2600, character: 'blocks' },
  Fontana: { count: 8, pricePerM2: 3000, character: 'blocks' },
  'Gornji grad': { count: 8, pricePerM2: 2700, character: 'old-town' },
  'Zemun polje': { count: 8, pricePerM2: 1700, character: 'suburb' },
  Altina: { count: 6, pricePerM2: 1800, character: 'suburb' },
  Banjica: { count: 10, pricePerM2: 2600, character: 'centre' },
  Šumice: { count: 6, pricePerM2: 2400, character: 'blocks' },
  Autokomanda: { count: 7, pricePerM2: 2700, character: 'centre' },
  Mirijevo: { count: 10, pricePerM2: 2000, character: 'suburb' },
  Konjarnik: { count: 8, pricePerM2: 2100, character: 'blocks' },
  Đeram: { count: 7, pricePerM2: 2600, character: 'centre' },
  'Banovo brdo': { count: 12, pricePerM2: 2500, character: 'centre' },
  Žarkovo: { count: 8, pricePerM2: 1900, character: 'suburb' },
  Karaburma: { count: 10, pricePerM2: 2200, character: 'blocks' },
  'Višnjička banja': { count: 6, pricePerM2: 1800, character: 'suburb' },
  Liman: { count: 10, pricePerM2: 2500, character: 'novi-sad' },
  Grbavica: { count: 8, pricePerM2: 2400, character: 'novi-sad' },
  Detelinara: { count: 8, pricePerM2: 2000, character: 'novi-sad' },
  'Novo naselje': { count: 6, pricePerM2: 1900, character: 'novi-sad' },
}

/**
 * The room counts a neighbourhood's apartments come in, drawn in turn from this bag, so every
 * neighbourhood has some of each kind: more two- and three-room ones, as the market has.
 */
const roomBag = [0.5, 1, 1.5, 2, 2, 2.5, 3, 3, 3.5, 4, 4.5, 5]

/** The area of an apartment by its room count, in square metres. */
const areaByRooms: Record<number, [number, number]> = {
  0.5: [19, 32],
  1: [30, 42],
  1.5: [37, 48],
  2: [45, 60],
  2.5: [54, 68],
  3: [64, 84],
  3.5: [76, 94],
  4: [86, 112],
  4.5: [98, 128],
  5: [115, 165],
}

/** The chance a listing is a house, by the character of its neighbourhood. */
const houseChance: Record<Character, number> = {
  'old-town': 0,
  centre: 0.1,
  villas: 0.45,
  blocks: 0,
  suburb: 0.45,
  'novi-sad': 0.15,
}

const firstNames = [
  'Milica',
  'Jelena',
  'Ana',
  'Marija',
  'Ivana',
  'Jovana',
  'Dragana',
  'Snežana',
  'Marko',
  'Nikola',
  'Stefan',
  'Milan',
  'Nemanja',
  'Aleksandar',
  'Dušan',
  'Vladimir',
]
const lastNames = [
  'Jovanović',
  'Petrović',
  'Nikolić',
  'Marković',
  'Đorđević',
  'Stojanović',
  'Ilić',
  'Stanković',
  'Pavlović',
  'Milošević',
  'Popović',
  'Kovačević',
]

// Between a number and its unit, so a line never breaks between them
const nbsp = '\u00a0'

const capitalized = (text: string) => text[0]!.toUpperCase() + text.slice(1)

/** "trosoban" as it goes with "kuća": "trosobna". */
const feminine = (word: string) => word.replace(/soban$/, 'sobna')

function heatingFor(character: Character, house: boolean): Heating {
  if (house) return pick(['etažno', 'gas', 'TA peć', 'podno', 'etažno'] as const)
  if (character === 'blocks') return chance(0.9) ? 'centralno' : 'etažno'
  if (character === 'suburb') return pick(['etažno', 'gas', 'TA peć', 'centralno'] as const)
  return pick(['centralno', 'centralno', 'etažno', 'gas', 'TA peć', 'podno'] as const)
}

function totalFloorsFor(character: Character): number {
  switch (character) {
    case 'blocks':
      return between(6, 18)
    case 'old-town':
      return between(3, 7)
    case 'suburb':
      return between(2, 5)
    default:
      return between(3, 9)
  }
}

const extras: Record<Character, string[]> = {
  'old-town': [
    'Zgrada je stara, sa visokim plafonima i parketom.',
    'Do centra je deset minuta peške.',
    'Pogled na krovove starog dela grada.',
    'Mirna ulica, blizu kafića i parka.',
  ],
  centre: [
    'Blizu je škola, vrtić i pijaca.',
    'Odlična povezanost sa centrom gradskim prevozom.',
    'Stan je renoviran pre dve godine.',
    'Mirna ulica, puno zelenila.',
  ],
  villas: [
    'Ulica je mirna, sa vilama i mnogo zelenila.',
    'Prostrano dvorište sa voćnjakom.',
    'Pogled na grad i Košutnjak.',
    'Luksuzno opremljeno, renovirano.',
  ],
  blocks: [
    'Blizu je tržni centar, škola i vrtić.',
    'Zgrada ima video nadzor i portira.',
    'Stan je renoviran, nova kupatila i stolarija.',
    'Blizu je park i dečje igralište.',
  ],
  suburb: [
    'Mirno naselje, idealno za porodicu.',
    'Veliko dvorište, mesto za baštu.',
    'Blizu je autobuska stanica i prodavnica.',
    'Potrebno je manje renoviranje.',
  ],
  'novi-sad': [
    'Blizu je park i dečje igralište.',
    'Blizu je tržni centar i gradski prevoz.',
    'Stan je renoviran, useljiv odmah.',
    'Mirna ulica, blizu pijace i škole.',
  ],
}

const heatingSentences: Record<Heating, string> = {
  centralno: 'Grejanje je centralno.',
  etažno: 'Grejanje je etažno.',
  gas: 'Grejanje na gas.',
  'TA peć': 'Grejanje na TA peć.',
  podno: 'Podno grejanje.',
}

function listingIn(neighbourhood: Location, rooms: number, id: number): Listing {
  const profile = profiles[neighbourhood.name]!
  const { district, city } = placeOf(neighbourhood)
  const house = chance(houseChance[profile.character])
  const contactName = `${pick(firstNames)} ${pick(lastNames)}`
  const where = inPlace(neighbourhood)
  const registered = chance(0.85)

  if (house) {
    const houseRooms = Math.max(rooms, 3)
    const area = between(110, 280)
    const price = Math.round((area * profile.pricePerM2 * (0.75 + random() * 0.3)) / 1000) * 1000
    const totalFloors = between(0, 2)
    const heating = heatingFor(profile.character, true)
    const kind = `${feminine(roomWords[houseRooms]!)} kuća`
    const parking = chance(0.85)
    const terrace = chance(0.7)
    const description = [
      `Prodaje se ${kind} od ${area}${nbsp}m² ${where}, na placu od ${between(3, 12)} ari.`,
      totalFloors === 0 ? 'Kuća je prizemna.' : `Spratnost kuće je P+${totalFloors}.`,
      heatingSentences[heating],
      terrace ? 'Ima veliku terasu.' : '',
      parking ? 'Garaža za dva automobila.' : '',
      registered ? 'Uknjižena, papiri uredni.' : 'Nije uknjižena, u postupku legalizacije.',
      pick(extras[profile.character]),
      `Kontakt: ${contactName}.`,
    ]
    return {
      id: String(id),
      title: `${capitalized(kind)}, ${area}${nbsp}m², ${neighbourhood.name}`,
      description: description.filter(Boolean).join(' '),
      property_type: 'kuća',
      rooms: houseRooms,
      city,
      district,
      neighbourhood: neighbourhood.name,
      price_eur: price,
      area_m2: area,
      total_floors: totalFloors,
      heating,
      has_terrace: terrace,
      has_lift: false,
      has_parking: parking,
      is_registered: registered,
      contact_name: contactName,
    }
  }

  const [minArea, maxArea] = areaByRooms[rooms]!
  const area = between(minArea, maxArea)
  // A small apartment costs more by the square metre
  const premium = rooms <= 1 ? 1.1 : 1
  const price =
    Math.round((area * profile.pricePerM2 * premium * (0.85 + random() * 0.3)) / 500) * 500
  const totalFloors = totalFloorsFor(profile.character)
  const floor = between(0, totalFloors)
  const lift = totalFloors >= 5 ? chance(0.9) : chance(0.15)
  const parking = chance(
    profile.character === 'blocks' || profile.character === 'suburb' ? 0.5 : 0.25,
  )
  const terrace = chance(rooms <= 1 ? 0.4 : 0.65)
  const heating = heatingFor(profile.character, false)
  const kind = rooms === 0.5 ? 'garsonjera' : `${roomWords[rooms]} stan`
  const description = [
    `Prodaje se ${kind} od ${area}${nbsp}m² ${where}.`,
    `Sprat: ${floor === 0 ? 'prizemlje' : floor}/${totalFloors}.`,
    heatingSentences[heating],
    terrace ? pick(['Ima terasu.', 'Ima prostranu terasu.', 'Ima zastakljenu terasu.']) : '',
    lift ? 'Zgrada ima lift.' : 'Zgrada nema lift.',
    parking ? pick(['Uz stan ide parking mesto.', 'Uz stan ide garažno mesto.']) : '',
    registered ? 'Uknjižen, useljiv odmah.' : 'Nije uknjižen.',
    pick(extras[profile.character]),
    `Kontakt: ${contactName}.`,
  ]
  return {
    id: String(id),
    title: `${capitalized(kind)}, ${area}${nbsp}m², ${neighbourhood.name}`,
    description: description.filter(Boolean).join(' '),
    property_type: 'stan',
    rooms,
    city,
    district,
    neighbourhood: neighbourhood.name,
    price_eur: price,
    area_m2: area,
    floor,
    total_floors: totalFloors,
    heating,
    has_terrace: terrace,
    has_lift: lift,
    has_parking: parking,
    is_registered: registered,
    contact_name: contactName,
  }
}

const listings: Listing[] = []
for (const [name, profile] of Object.entries(profiles)) {
  const neighbourhood = locationNamed(name)
  let bag: number[] = []
  for (let i = 0; i < profile.count; i++) {
    if (bag.length === 0) bag = shuffled(roomBag)
    listings.push(listingIn(neighbourhood, bag.pop()!, listings.length + 1))
  }
}

const file = new URL('../data/listings.jsonl', import.meta.url)
writeFileSync(file, listings.map((listing) => JSON.stringify(listing)).join('\n') + '\n')
console.log(`Wrote ${listings.length} listings to data/listings.jsonl`)
