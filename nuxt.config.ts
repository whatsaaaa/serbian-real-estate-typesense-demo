import { theme } from '@whatsaaaa/ui-vue'
import { colorModeInitScript } from '@whatsaaaa/ui-vue/color-mode'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  compatibilityDate: '2025-07-15',
  // @nuxt/devtools is not installed, and enabled without it Nuxt asks in the page to install it
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  ui: { theme, fonts: false }, // the design system brings its fonts
  icon: {
    // The icons are bundled with the app, so the page asks no server for them
    provider: 'none',
    clientBundle: { scan: true },
  },
  runtimeConfig: {
    // Server only: the search goes through server/api/search.post.ts, so the key stays there.
    // Set from TYPESENSE_URL and TYPESENSE_API_KEY in .env.
    typesense: {
      url: process.env.TYPESENSE_URL || 'http://localhost:8108',
      apiKey: process.env.TYPESENSE_API_KEY || '',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Serbian real estate search',
      meta: [
        {
          name: 'description',
          content:
            'Typesense natural language search on Serbian real estate listings, with Claude as its LLM',
        },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      // The theme-color tags come from the server only: server/plugins/theme-color.ts
      script: [{ innerHTML: colorModeInitScript }],
    },
  },
  typescript: {
    // Type-checks the root configs too, the scripts and the Typesense configuration they use, and
    // the tests
    nodeTsConfig: {
      include: ['../*.config.ts', '../scripts/**/*.ts', '../typesense/**/*.ts', '../test/**/*.ts'],
    },
  },
})
