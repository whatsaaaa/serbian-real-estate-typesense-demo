/**
 * Sets Typesense up for the demo: creates the listings collection afresh, imports
 * data/listings.jsonl into it and registers Claude as the natural language search model.
 *
 *   pnpm seed
 *
 * Typesense keeps the Anthropic API key with the model, in its data directory, and calls Claude
 * with it. Nothing else stores it.
 */
import { readFileSync } from 'node:fs'
import { Errors } from 'typesense'
import type { Listing } from '../shared/listing.ts'
import { collectionName, collectionSchema } from '../typesense/collection.ts'
import { nlModelConfig, nlModelId } from '../typesense/nl-model.ts'
import { clientFromEnv, required } from './env.ts'

const client = clientFromEnv()
const anthropicApiKey = required('ANTHROPIC_API_KEY')

/** Runs a request that fails with a 404 when there is nothing to delete. */
async function ignoringNotFound(request: () => Promise<unknown>) {
  try {
    await request()
  } catch (error) {
    if (!(error instanceof Errors.ObjectNotFound)) throw error
  }
}

try {
  await client.health.retrieve()
} catch {
  console.error('Typesense does not answer. Start it with: docker compose up -d')
  process.exit(1)
}

await ignoringNotFound(() => client.collections(collectionName).delete())
await client.collections().create(collectionSchema)

const listings: Listing[] = readFileSync(new URL('../data/listings.jsonl', import.meta.url), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line))
const results = await client
  .collections<Listing>(collectionName)
  .documents()
  .import(listings, { action: 'create' })
const failed = results.filter((result) => !result.success)
if (failed.length > 0) {
  console.error(`${failed.length} listings were not imported:`, failed.slice(0, 3))
  process.exit(1)
}
console.log(`Imported ${results.length} listings into the ${collectionName} collection`)

// Typesense checks the model with a call to Claude as it registers it
await ignoringNotFound(() => client.nlSearchModels(nlModelId).delete())
const model = await client.nlSearchModels().create(nlModelConfig(anthropicApiKey))
console.log(`Registered the natural language search model ${model.id} (${model.model_name})`)
