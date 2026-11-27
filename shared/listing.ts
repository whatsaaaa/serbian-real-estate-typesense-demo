/**
 * A listing as it is stored in Typesense, one document of the `listings` collection.
 *
 * Rooms are counted the Serbian way: the living room is a room, so a "trosoban stan" (3.0) is
 * usually two bedrooms and a living room. A half room is a small room, so a "dvoiposoban stan"
 * is 2.5, and a "garsonjera", a studio, is 0.5.
 */
export interface Listing {
  id: string
  title: string
  description: string
  property_type: PropertyType
  rooms: number
  city: string
  district: string
  neighbourhood: string
  price_eur: number
  area_m2: number
  /** The floor an apartment is on: 0 is the ground floor ("prizemlje"). Houses have none. */
  floor?: number
  /** How many floors the building has above the ground floor. */
  total_floors: number
  heating: Heating
  has_terrace: boolean
  has_lift: boolean
  has_parking: boolean
  /** Whether the ownership is registered in the land registry: "uknjižen". */
  is_registered: boolean
  contact_name: string
}

export const propertyTypes = ['stan', 'kuća'] as const
export type PropertyType = (typeof propertyTypes)[number]

export const heatingTypes = ['centralno', 'etažno', 'gas', 'TA peć', 'podno'] as const
export type Heating = (typeof heatingTypes)[number]

/**
 * The Serbian word for each room count an apartment comes in, in the nominative case.
 * "Garsonjera" is a noun on its own; the others are adjectives that go with "stan".
 */
export const roomWords: Record<number, string> = {
  0.5: 'garsonjera',
  1: 'jednosoban',
  1.5: 'jednoiposoban',
  2: 'dvosoban',
  2.5: 'dvoiposoban',
  3: 'trosoban',
  3.5: 'troiposoban',
  4: 'četvorosoban',
  4.5: 'četvoroiposoban',
  5: 'petosoban',
}

export const roomCounts = Object.keys(roomWords)
  .map(Number)
  .toSorted((a, b) => a - b)
