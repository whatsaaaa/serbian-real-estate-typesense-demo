import type { Listing } from './listing.ts'

/** What the natural language search made of a query: the parameters the LLM generated. */
export interface Understood {
  /** The words left to match as text, or "*" for none. */
  q: string
  filter_by: string
  sort_by: string
}

export interface SearchResult {
  /** What the search understood, or null when there was no query to understand. */
  understood: Understood | null
  /** How long the LLM took to turn the query into parameters, in milliseconds. */
  parseTimeMs: number | null
  found: number
  listings: Listing[]
}

/**
 * The conditions of a filter_by, as Typesense joins them with &&. An && inside parentheses,
 * brackets or backticks belongs to the condition around it.
 */
export function splitFilter(filterBy: string): string[] {
  const conditions: string[] = []
  let depth = 0
  let quoted = false
  let start = 0
  for (let i = 0; i < filterBy.length; i++) {
    const char = filterBy[i]
    if (char === '`') quoted = !quoted
    else if (!quoted && (char === '(' || char === '[')) depth++
    else if (!quoted && (char === ')' || char === ']')) depth--
    else if (!quoted && depth === 0 && filterBy.startsWith('&&', i)) {
      conditions.push(filterBy.slice(start, i))
      start = i + 2
      i++
    }
  }
  conditions.push(filterBy.slice(start))
  return conditions.map((condition) => condition.trim()).filter(Boolean)
}
