/**
 * Runs the test queries in eval/queries.json against the live natural language search and
 * reports, for each, whether the search understood it: whether the parameters it generated find
 * the same listings, in the same order when an order is asked for, as the expected filter.
 * Matching the listings rather than the text of the filter lets the LLM write a filter its own
 * way, as rooms:3 for rooms:=3.
 *
 *   pnpm eval
 *
 * Every query is a call to Claude. It prints a Markdown table and exits with 1 if a query did not
 * match.
 */
import { readFileSync } from 'node:fs'
import type { Understood } from '../shared/search.ts'
import {
  NotUnderstoodError,
  UnrunnableParamsError,
  fetchAll,
  searchListings,
} from '../typesense/search.ts'
import { clientFromEnv } from './env.ts'

interface TestQuery {
  query: string
  filter_by: string
  sort_by?: string
}

const queries: TestQuery[] = JSON.parse(
  readFileSync(new URL('../eval/queries.json', import.meta.url), 'utf8'),
)
const client = clientFromEnv()

// The filters hold backticks, so a code span opens with two, and a space keeps them apart
const code = (text: string) => (text ? `\`\` ${text.replaceAll('|', '\\|')} \`\`` : '')

/** The parameters the search generated, on one line. */
const describe = (understood: Understood | null) =>
  understood
    ? [understood.q === '*' ? '' : `q: ${understood.q}`, understood.filter_by]
        .concat(understood.sort_by ? [`sort_by: ${understood.sort_by}`] : [])
        .filter(Boolean)
        .join(' ; ')
    : ''

// The expected listings first, so a test that the data cannot meet fails before any LLM call
const expectations = []
for (const test of queries) {
  const expected = await fetchAll(client, {
    q: '*',
    filter_by: test.filter_by,
    sort_by: test.sort_by ?? '',
  })
  if (expected.found === 0) throw new Error(`The expected filter finds nothing: ${test.query}`)
  expectations.push({ test, expected })
}

const rows: string[] = []
let matched = 0
for (const { test, expected } of expectations) {
  let result: string
  let generated = ''
  try {
    const actual = await searchListings(client, test.query)
    generated = describe(actual.understood)
    const ids = (listings: { id: string }[]) => listings.map((listing) => listing.id)
    const sameListings =
      ids(actual.listings).toSorted().join() === ids(expected.listings).toSorted().join()
    const sameOrder = !test.sort_by || ids(actual.listings).join() === ids(expected.listings).join()
    if (sameListings && sameOrder) {
      matched++
      result = `match (${expected.found})`
    } else if (sameListings) {
      result = 'other order'
    } else {
      result = `${actual.found} found, ${expected.found} expected`
    }
  } catch (error) {
    if (error instanceof NotUnderstoodError) {
      result = `not understood: ${error.message}`
    } else if (error instanceof UnrunnableParamsError) {
      generated = describe(error.understood)
      result = `cannot run: ${error.message}`
    } else {
      throw error
    }
  }
  const line = `| ${test.query} | ${code(test.filter_by + (test.sort_by ? ` ; sort_by: ${test.sort_by}` : ''))} | ${code(generated)} | ${result.replaceAll('|', '\\|')} |`
  rows.push(line)
  console.error(line)
}

console.log(`${matched} of ${queries.length} queries matched.\n`)
console.log('| Query | Expected | Generated | Result |')
console.log('| --- | --- | --- | --- |')
console.log(rows.join('\n'))
process.exitCode = matched === queries.length ? 0 : 1
