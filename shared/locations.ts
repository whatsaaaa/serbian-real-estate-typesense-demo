/**
 * The one list of places the listings are in, and the forms people type them in.
 *
 * Each place has its canonical name, the one value the listings carry and the search filters on,
 * and its locative form ("na Dorćolu", "u Zemunu"), the case a query usually puts it in. The other
 * forms come from those two: without diacritics ("dorcolu") and in Cyrillic ("Дорћолу"). The
 * natural language search's system prompt lists all of them, so the LLM maps whatever form a query
 * uses to the canonical name.
 */

/** Which field of a listing a place is: a city, a district (an opština) or a neighbourhood. */
export type LocationField = 'city' | 'district' | 'neighbourhood'

export interface Location {
  /** The canonical name: the value of the listing's field. */
  name: string
  field: LocationField
  /** The locative case, as in "stan na Dorćolu" or "kuća u Zemunu". */
  locative: string
  /** The preposition the locative takes: "na Dorćolu" or "u Zemunu". The default is "na". */
  preposition?: 'na' | 'u'
  /** Other names people use for the place, such as "NBG" for Novi Beograd. */
  aliases?: string[]
  /** The district a neighbourhood is in, and the city a district is in. */
  parent?: string
}

const block = (n: number): Location => ({
  name: `Blok ${n}`,
  field: 'neighbourhood',
  locative: `Bloku ${n}`,
  preposition: 'u',
  parent: 'Novi Beograd',
})

export const locations: Location[] = [
  // Cities
  { name: 'Beograd', field: 'city', locative: 'Beogradu', preposition: 'u', aliases: ['BG'] },
  { name: 'Novi Sad', field: 'city', locative: 'Novom Sadu', preposition: 'u', aliases: ['NS'] },

  // The districts of Belgrade
  {
    name: 'Stari grad',
    field: 'district',
    locative: 'Starom gradu',
    preposition: 'u',
    parent: 'Beograd',
  },
  { name: 'Vračar', field: 'district', locative: 'Vračaru', parent: 'Beograd' },
  {
    name: 'Savski venac',
    field: 'district',
    locative: 'Savskom vencu',
    preposition: 'u',
    parent: 'Beograd',
  },
  {
    name: 'Novi Beograd',
    field: 'district',
    locative: 'Novom Beogradu',
    aliases: ['NBG', 'Novi Bg', 'blokovi'],
    parent: 'Beograd',
  },
  { name: 'Zemun', field: 'district', locative: 'Zemunu', preposition: 'u', parent: 'Beograd' },
  { name: 'Voždovac', field: 'district', locative: 'Voždovcu', parent: 'Beograd' },
  { name: 'Zvezdara', field: 'district', locative: 'Zvezdari', parent: 'Beograd' },
  { name: 'Čukarica', field: 'district', locative: 'Čukarici', parent: 'Beograd' },
  {
    name: 'Palilula',
    field: 'district',
    locative: 'Paliluli',
    preposition: 'u',
    parent: 'Beograd',
  },

  // Stari grad
  { name: 'Dorćol', field: 'neighbourhood', locative: 'Dorćolu', parent: 'Stari grad' },
  {
    name: 'Kosančićev venac',
    field: 'neighbourhood',
    locative: 'Kosančićevom vencu',
    parent: 'Stari grad',
  },
  // Vračar
  { name: 'Neimar', field: 'neighbourhood', locative: 'Neimaru', parent: 'Vračar' },
  { name: 'Crveni krst', field: 'neighbourhood', locative: 'Crvenom krstu', parent: 'Vračar' },
  { name: 'Čubura', field: 'neighbourhood', locative: 'Čuburi', parent: 'Vračar' },
  // Savski venac
  { name: 'Senjak', field: 'neighbourhood', locative: 'Senjaku', parent: 'Savski venac' },
  { name: 'Dedinje', field: 'neighbourhood', locative: 'Dedinju', parent: 'Savski venac' },
  // Novi Beograd
  block(21),
  block(23),
  block(29),
  block(45),
  block(61),
  block(70),
  {
    name: 'Bežanijska kosa',
    field: 'neighbourhood',
    locative: 'Bežanijskoj kosi',
    parent: 'Novi Beograd',
  },
  { name: 'Fontana', field: 'neighbourhood', locative: 'Fontani', parent: 'Novi Beograd' },
  // Zemun
  {
    name: 'Gornji grad',
    field: 'neighbourhood',
    locative: 'Gornjem gradu',
    preposition: 'u',
    parent: 'Zemun',
  },
  {
    name: 'Zemun polje',
    field: 'neighbourhood',
    locative: 'Zemun polju',
    preposition: 'u',
    parent: 'Zemun',
  },
  { name: 'Altina', field: 'neighbourhood', locative: 'Altini', parent: 'Zemun' },
  // Voždovac
  { name: 'Banjica', field: 'neighbourhood', locative: 'Banjici', parent: 'Voždovac' },
  { name: 'Šumice', field: 'neighbourhood', locative: 'Šumicama', parent: 'Voždovac' },
  { name: 'Autokomanda', field: 'neighbourhood', locative: 'Autokomandi', parent: 'Voždovac' },
  // Zvezdara
  {
    name: 'Mirijevo',
    field: 'neighbourhood',
    locative: 'Mirijevu',
    preposition: 'u',
    parent: 'Zvezdara',
  },
  { name: 'Konjarnik', field: 'neighbourhood', locative: 'Konjarniku', parent: 'Zvezdara' },
  { name: 'Đeram', field: 'neighbourhood', locative: 'Đeramu', parent: 'Zvezdara' },
  // Čukarica
  {
    name: 'Banovo brdo',
    field: 'neighbourhood',
    locative: 'Banovom brdu',
    aliases: ['Banovo'],
    parent: 'Čukarica',
  },
  { name: 'Žarkovo', field: 'neighbourhood', locative: 'Žarkovu', parent: 'Čukarica' },
  // Palilula
  { name: 'Karaburma', field: 'neighbourhood', locative: 'Karaburmi', parent: 'Palilula' },
  {
    name: 'Višnjička banja',
    field: 'neighbourhood',
    locative: 'Višnjičkoj banji',
    preposition: 'u',
    parent: 'Palilula',
  },
  // Novi Sad, where the city is the district too
  { name: 'Liman', field: 'neighbourhood', locative: 'Limanu', parent: 'Novi Sad' },
  { name: 'Grbavica', field: 'neighbourhood', locative: 'Grbavici', parent: 'Novi Sad' },
  { name: 'Detelinara', field: 'neighbourhood', locative: 'Detelinari', parent: 'Novi Sad' },
  { name: 'Novo naselje', field: 'neighbourhood', locative: 'Novom naselju', parent: 'Novi Sad' },
]

export const neighbourhoods = locations.filter((location) => location.field === 'neighbourhood')

/** The place a name is, by its canonical name. */
export function locationNamed(name: string): Location {
  const location = locations.find((candidate) => candidate.name === name)
  if (!location) throw new Error(`No location is named ${name}`)
  return location
}

/** The district a neighbourhood is in, and the city of both. */
export function placeOf(neighbourhood: Location): { district: string; city: string } {
  const district = locationNamed(neighbourhood.parent!)
  // In Novi Sad the city is the district too
  if (district.field === 'city') return { district: district.name, city: district.name }
  return { district: district.name, city: district.parent! }
}

/** Where a place is, as in "na Dorćolu" or "u Zemunu". */
export function inPlace(location: Location): string {
  return `${location.preposition ?? 'na'} ${location.locative}`
}

/** The filter that selects the listings in a place, in Typesense's filter_by syntax. */
export function filterFor(location: Location): string {
  return `${location.field}:=\`${location.name}\``
}

const foldings: [RegExp, string][] = [
  [/[čć]/g, 'c'],
  [/[ČĆ]/g, 'C'],
  [/š/g, 's'],
  [/Š/g, 'S'],
  [/ž/g, 'z'],
  [/Ž/g, 'Z'],
  [/đ/g, 'dj'],
  [/Đ/g, 'Dj'],
]

/** A name as it is typed without diacritics: "Dorćolu" is "Dorcolu", "Đeram" is "Djeram". */
export function withoutDiacritics(text: string): string {
  return foldings.reduce((folded, [letter, plain]) => folded.replace(letter, plain), text)
}

// Serbian Latin and Cyrillic match letter for letter, with lj, nj and dž as one letter each
const latin = ['lj', 'nj', 'dž', ...'abcčćdđefghijklmnoprsštuvzž']
const cyrillic = ['љ', 'њ', 'џ', ...'абцчћдђефгхијклмнопрсштувзж']
const toCyrillicLetter = new Map(latin.map((letter, i) => [letter, cyrillic[i]!]))

/** A name in Serbian Cyrillic: "Dorćolu" is "Дорћолу". */
export function toCyrillic(text: string): string {
  return text.replace(/lj|nj|dž|./giu, (match) => {
    const letter = toCyrillicLetter.get(match.toLowerCase())
    if (!letter) return match
    return match[0] === match[0]!.toLowerCase() ? letter : letter.toUpperCase()
  })
}

/** Every form of a place's name a query may use, the canonical name first. */
export function formsOf(location: Location): string[] {
  const names = [location.name, location.locative]
  const forms = [
    ...names,
    ...names.map(withoutDiacritics),
    ...names.map(toCyrillic),
    ...(location.aliases ?? []),
  ]
  return [...new Set(forms)]
}
