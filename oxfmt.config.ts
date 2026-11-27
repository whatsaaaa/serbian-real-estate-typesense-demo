import { defineConfig } from 'oxfmt'
import whatsaaaa from '@whatsaaaa/format-config/oxfmt'

export default defineConfig({
  ...whatsaaaa,
  // The listings are generated: scripts/generate-listings.ts writes them
  ignorePatterns: ['pnpm-lock.yaml', 'data/listings.jsonl'],
})
