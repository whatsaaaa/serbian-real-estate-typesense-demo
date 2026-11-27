import type { Client } from 'typesense'
import { createClient } from '../../typesense/search.ts'

let client: Client | undefined

/** The Typesense client, made once from the runtime config. */
export function useTypesense(): Client {
  const { url, apiKey } = useRuntimeConfig().typesense
  client ??= createClient({ url, apiKey })
  return client
}
