import { Client, Errors } from 'typesense'
import type { SearchParams } from 'typesense'
import type { Listing } from '../shared/listing.ts'
import type { SearchResult, Understood } from '../shared/search.ts'
import { collectionName, queryBy } from './collection.ts'
import { nlModelId } from './nl-model.ts'

export function createClient({ url, apiKey }: { url: string; apiKey: string }): Client {
  const { protocol, hostname, port } = new URL(url)
  const https = protocol === 'https:'
  return new Client({
    nodes: [
      {
        host: hostname,
        port: Number(port) || (https ? 443 : 80),
        protocol: https ? 'https' : 'http',
      },
    ],
    apiKey,
    // The LLM takes a few seconds to answer
    connectionTimeoutSeconds: 30,
    // A retry would ask the LLM again
    numRetries: 0,
  })
}

/** The natural language search could not turn the query into parameters. */
export class NotUnderstoodError extends Error {
  override name = 'NotUnderstoodError'
}

/** Typesense cannot run the parameters the natural language search generated. */
export class UnrunnableParamsError extends Error {
  override name = 'UnrunnableParamsError'
  readonly understood: Understood

  constructor(understood: Understood, message: string) {
    super(message)
    this.understood = understood
  }
}

/**
 * Asks Typesense's natural language search what a query means: Typesense sends it to the LLM
 * with the system prompt and the schema, and answers with the parameters the LLM generated.
 */
export async function understand(
  client: Client,
  query: string,
): Promise<{ understood: Understood; parseTimeMs: number }> {
  const response = await client.collections<Listing>(collectionName).documents().search({
    q: query,
    query_by: queryBy,
    nl_query: true,
    nl_model_id: nlModelId,
    // Only the parameters are wanted from this request: search() runs them
    per_page: 0,
  })
  // On a failure Typesense still searches, for the query as text, and says why in `error`
  const { error } = response as { error?: string }
  const parsed = response.parsed_nl_query
  if (error || !parsed) throw new NotUnderstoodError(error ?? 'Typesense returned no parameters')

  const generated = parsed.generated_params
  return {
    understood: {
      q: String(generated.q || '*'),
      filter_by: String(generated.filter_by ?? ''),
      sort_by: String(generated.sort_by ?? ''),
    },
    parseTimeMs: parsed.parse_time_ms,
  }
}

const perPage = 250

/** Every listing that matches the parameters, through as many pages as it takes. */
export async function fetchAll(
  client: Client,
  params: Pick<SearchParams<Listing>, 'q' | 'filter_by' | 'sort_by'>,
): Promise<{ found: number; listings: Listing[] }> {
  const documents = client.collections<Listing>(collectionName).documents()
  const listings: Listing[] = []
  for (let page = 1; ; page++) {
    const response = await documents.search({
      ...params,
      query_by: queryBy,
      per_page: perPage,
      page,
      exclude_fields: 'parsed_nl_query',
    })
    listings.push(...(response.hits ?? []).map((hit) => hit.document))
    if (listings.length >= response.found || !response.hits?.length) {
      return { found: response.found, listings }
    }
  }
}

/**
 * Searches the listings for a query in Serbian. An empty query lists every listing.
 *
 * It takes two requests: the first gets the parameters the natural language search generates
 * and the second runs them. Typesense 30.x runs a natural language search with the query as it
 * was typed instead of the generated `q`, so "*" with a filter finds nothing
 * (https://github.com/typesense/typesense/issues/2910, fixed for v31).
 */
export async function searchListings(client: Client, query: string): Promise<SearchResult> {
  const trimmed = query.trim()
  if (!trimmed)
    return { understood: null, parseTimeMs: null, ...(await fetchAll(client, { q: '*' })) }

  const { understood, parseTimeMs } = await understand(client, trimmed)
  try {
    const results = await fetchAll(client, {
      q: understood.q,
      filter_by: understood.filter_by,
      sort_by: understood.sort_by,
    })
    return { understood, parseTimeMs, ...results }
  } catch (error) {
    // The LLM wrote a filter or a sort that is not valid, such as one on a field there is not
    if (error instanceof Errors.RequestMalformed) {
      throw new UnrunnableParamsError(understood, error.message)
    }
    throw error
  }
}
