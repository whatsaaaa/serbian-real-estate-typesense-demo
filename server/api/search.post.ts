import { Errors } from 'typesense'
import type { SearchResult } from '../../shared/search.ts'
import {
  NotUnderstoodError,
  UnrunnableParamsError,
  searchListings,
} from '../../typesense/search.ts'

/**
 * Searches the listings for a query in Serbian, with Typesense's natural language search. The
 * page posts the query here, so the Typesense key stays on the server.
 */
export default defineEventHandler(async (event): Promise<SearchResult> => {
  const body = await readBody<{ query?: unknown }>(event)
  const query = typeof body?.query === 'string' ? body.query : ''
  if (query.length > 500) {
    throw createError({
      statusCode: 400,
      statusMessage: 'The query is longer than 500 characters.',
    })
  }

  try {
    return await searchListings(useTypesense(), query)
  } catch (error) {
    if (error instanceof NotUnderstoodError) {
      throw createError({
        statusCode: 502,
        statusMessage: 'The search could not turn the query into filters.',
        data: { reason: error.message },
      })
    }
    if (error instanceof UnrunnableParamsError) {
      throw createError({
        statusCode: 502,
        statusMessage: 'The search understood the query as filters Typesense cannot run.',
        data: { reason: error.message, understood: error.understood },
      })
    }
    if (error instanceof Errors.ObjectNotFound) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Typesense has no listings yet. Run pnpm seed.',
      })
    }
    if (error instanceof Errors.RequestUnauthorized) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Typesense does not accept the API key in .env.',
      })
    }
    console.error(error)
    throw createError({
      statusCode: 503,
      statusMessage: 'Typesense does not answer. Is it running?',
    })
  }
})
