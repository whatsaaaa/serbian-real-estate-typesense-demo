import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import {
  NotUnderstoodError,
  UnrunnableParamsError,
  createClient,
  searchListings,
} from '../typesense/search.ts'

interface Answer {
  status: number
  body: object
}

const dorcol = { id: '1', title: 'Trosoban stan, 79 m², Dorćol' }

/**
 * A stand-in for Typesense 30.2 that answers a natural language search with `nlAnswer`, and any
 * other search with the one listing it has. It keeps the parameters of every search it gets.
 */
async function stubTypesense(t: TestContext, nlAnswer: Answer) {
  const searches: URLSearchParams[] = []
  const server = createServer((request, response) => {
    const params = new URL(request.url!, 'http://localhost').searchParams
    searches.push(params)
    const { status, body } =
      params.get('nl_query') === 'true'
        ? nlAnswer
        : { status: 200, body: { found: 1, hits: [{ document: dorcol }] } }
    response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body))
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
    status: 200,
    body: {
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
  const run = searches.at(-1)!
  assert.equal(run.get('q'), '*')
  assert.equal(run.get('filter_by'), 'property_type:=`stan` && rooms:=3 && neighbourhood:=`Dorćol`')
  assert.equal(run.get('nl_query'), null)
})

test('searchListings fails when the natural language search could not process the query', async (t) => {
  // Typesense 30.2 still searches, answers 200 and puts the reason in parsed_nl_query.error
  const { client, searches } = await stubTypesense(t, {
    status: 200,
    body: {
      found: 288,
      hits: [],
      parsed_nl_query: {
        generated_params: {},
        error: 'Error getting natural language search model: Model not found',
        augmented_params: { q: 'trosoban stan na dorcolu' },
      },
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
  // Typesense 30.2 answers 400 for the natural language search when the generated filter is invalid
  const { client } = await stubTypesense(t, {
    status: 400,
    body: {
      message: 'Could not find a filter field named `balcony` in the schema.',
      parsed_nl_query: { generated_params: { filter_by: 'balcony:=true' }, augmented_params: {} },
    },
  })

  await assert.rejects(searchListings(client, 'stan sa balkonom'), (error) => {
    assert.ok(error instanceof UnrunnableParamsError)
    assert.match(error.message, /Could not find a filter field named `balcony` in the schema\./)
    assert.equal(error.understood, undefined)
    return true
  })
})
