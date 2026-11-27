import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { json } from 'node:stream/consumers'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { Errors } from 'typesense'
import {
  NotUnderstoodError,
  UnrunnableParamsError,
  createClient,
  searchListings,
} from '../typesense/search.ts'

const dorcol = { id: '1', title: 'Trosoban stan, 79 m², Dorćol' }

/**
 * A stand-in for Typesense 30.2 that answers a multi search with `nlResult` as the result of its
 * one search, and a search with the one listing it has. It keeps the parameters of every search
 * it gets.
 */
async function stubTypesense(t: TestContext, nlResult: object) {
  const searches: Record<string, unknown>[] = []
  const server = createServer(async (request, response) => {
    const url = new URL(request.url!, 'http://localhost')
    let body: object
    if (url.pathname === '/multi_search') {
      const { searches: sent } = (await json(request)) as { searches: Record<string, unknown>[] }
      searches.push(...sent)
      body = { results: [nlResult] }
    } else {
      searches.push(Object.fromEntries(url.searchParams))
      body = { found: 1, hits: [{ document: dorcol }] }
    }
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => {
    server.closeAllConnections()
    server.close()
  })
  const { port } = server.address() as AddressInfo
  return { client: createClient({ url: `http://127.0.0.1:${port}`, apiKey: 'test' }), searches }
}

test('searchListings runs the parameters the natural language search generated', async (t) => {
  const { client, searches } = await stubTypesense(t, {
    found: 0,
    hits: [],
    parsed_nl_query: {
      parse_time_ms: 1200,
      generated_params: {
        q: '*',
        filter_by: 'property_type:=`stan` && rooms:=3 && neighbourhood:=`Dorćol`',
      },
      augmented_params: {},
    },
  })

  const result = await searchListings(client, 'trosoban stan na dorcolu')

  assert.deepEqual(result.understood, {
    q: '*',
    filter_by: 'property_type:=`stan` && rooms:=3 && neighbourhood:=`Dorćol`',
    sort_by: '',
  })
  assert.equal(result.parseTimeMs, 1200)
  assert.deepEqual(
    result.listings.map((listing) => listing.id),
    ['1'],
  )
  assert.equal(searches[0]!.nl_query, true)
  const run = searches.at(-1)!
  assert.equal(run.q, '*')
  assert.equal(run.filter_by, 'property_type:=`stan` && rooms:=3 && neighbourhood:=`Dorćol`')
  assert.equal(run.nl_query, undefined)
})

test('searchListings fails when the natural language search could not process the query', async (t) => {
  // Typesense 30.2 still searches, and puts the reason in parsed_nl_query.error
  const { client, searches } = await stubTypesense(t, {
    found: 288,
    hits: [],
    parsed_nl_query: {
      generated_params: {},
      error: 'Error getting natural language search model: Model not found',
      augmented_params: { q: 'trosoban stan na dorcolu' },
    },
  })

  await assert.rejects(searchListings(client, 'trosoban stan na dorcolu'), (error) => {
    assert.ok(error instanceof NotUnderstoodError)
    assert.equal(error.message, 'Error getting natural language search model: Model not found')
    return true
  })
  assert.equal(searches.length, 1)
})

test('searchListings fails when Typesense cannot run the generated filter', async (t) => {
  // Typesense 30.2 answers a multi search it cannot run with the error, its code and the
  // parameters the LLM generated
  const { client } = await stubTypesense(t, {
    error: 'Could not find a filter field named `balcony` in the schema.',
    code: 400,
    parsed_nl_query: {
      parse_time_ms: 900,
      generated_params: { filter_by: 'balcony:=true' },
      augmented_params: {},
    },
  })

  await assert.rejects(searchListings(client, 'stan sa balkonom'), (error) => {
    assert.ok(error instanceof UnrunnableParamsError)
    assert.equal(error.message, 'Could not find a filter field named `balcony` in the schema.')
    assert.equal(error.understood.filter_by, 'balcony:=true')
    return true
  })
})

test('searchListings fails as Typesense does for a missing collection', async (t) => {
  // Typesense 30.2 answers a multi search on a collection there is not with a 404 for that search
  const { client } = await stubTypesense(t, {
    error: 'Not found.',
    code: 404,
    parsed_nl_query: {
      generated_params: {},
      error: 'Collection not found',
      augmented_params: { q: 'trosoban stan na dorcolu' },
    },
  })

  await assert.rejects(searchListings(client, 'trosoban stan na dorcolu'), Errors.ObjectNotFound)
})
