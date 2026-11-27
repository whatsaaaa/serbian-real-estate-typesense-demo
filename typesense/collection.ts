import type { CollectionCreateSchema } from 'typesense'

export const collectionName = 'listings'

/** The fields a plain text query matches, when the search has words left over to match. */
export const queryBy = 'title,description'

/**
 * The listings collection. Natural language search reads this schema, and the values of its
 * faceted string fields, to tell the LLM what it can filter on: the field names say what each one
 * is, and the system prompt in system-prompt.ts says how Serbian queries map to them.
 *
 * No locale is set: the default one folds diacritics, so a text query "dorcol" still matches
 * "Dorćol" in a description. The filters match the exact canonical values.
 */
export const collectionSchema = {
  name: collectionName,
  fields: [
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'property_type', type: 'string', facet: true },
    { name: 'rooms', type: 'float', facet: true },
    { name: 'city', type: 'string', facet: true },
    { name: 'district', type: 'string', facet: true },
    { name: 'neighbourhood', type: 'string', facet: true },
    { name: 'price_eur', type: 'int32' },
    { name: 'area_m2', type: 'int32' },
    { name: 'floor', type: 'int32', optional: true },
    { name: 'total_floors', type: 'int32' },
    { name: 'heating', type: 'string', facet: true },
    { name: 'has_terrace', type: 'bool' },
    { name: 'has_lift', type: 'bool' },
    { name: 'has_parking', type: 'bool' },
    { name: 'is_registered', type: 'bool' },
    { name: 'contact_name', type: 'string', index: false, optional: true },
  ],
} satisfies CollectionCreateSchema
