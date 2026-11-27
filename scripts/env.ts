import { createClient } from '../typesense/search.ts'

/** A variable the script needs from the environment, which .env gives it. */
export function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`${name} is not set. Copy .env.example to .env and fill it in.`)
    process.exit(1)
  }
  return value
}

/** The Typesense client, from TYPESENSE_URL and TYPESENSE_API_KEY. */
export function clientFromEnv() {
  return createClient({
    url: process.env.TYPESENSE_URL || 'http://localhost:8108',
    apiKey: required('TYPESENSE_API_KEY'),
  })
}
