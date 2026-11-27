<script setup lang="ts">
const examples = [
  'trosoban stan na dorcolu',
  'гарсоњера на Звездари',
  'dvoiposoban stan na Vračaru do 200k',
  'kuća u Zemunu sa garažom',
  'stan u bloku 45 sa terasom i liftom',
]

const query = ref('')
const { result, failure, pending, searched, search } = useListingSearch()

function submit() {
  search(query.value)
}

function tryExample(example: string) {
  query.value = example
  search(example)
}

const heading = computed(() => {
  const found = result.value?.found ?? 0
  if (found === 0) return 'No listings'
  return found === 1 ? '1 listing' : `${found} listings`
})

/** What the live region says, for a screen reader, when a search ends. */
const announcement = computed(() => {
  if (pending.value) return 'Searching'
  if (failure.value) return failure.value.message
  if (result.value) return `${heading.value} found`
  return ''
})
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <div class="window ws-term">
      <header class="ws-tab-bar">
        <span class="ws-tab-bar__brand">serbian-real-estate</span>
        <div class="ws-tab-bar__end">
          <a
            class="ws-arrow"
            href="https://typesense.org/docs/30.2/api/natural-language-search.html"
          >
            typesense docs
          </a>
        </div>
      </header>

      <main class="window-main">
        <div class="px-4 pt-6 pb-12 lg:px-12 lg:pt-10 lg:pb-16">
          <header class="max-w-content">
            <h1 class="font-mono text-h1-compact lg:text-h1">Serbian real estate search</h1>
            <p class="mt-2 text-lead text-text-secondary">
              Ask for a home in Serbian, the way you would say it. Typesense's natural language
              search has Claude turn the query into filters, then finds every listing that matches.
            </p>
          </header>

          <form class="mt-8 max-w-content" role="search" @submit.prevent="submit">
            <UFormField label="What are you looking for?" name="query">
              <!-- The hint stays under the field on a phone, where the button takes a line -->
              <div class="query-row">
                <UInput
                  v-model="query"
                  lang="sr"
                  autocomplete="off"
                  maxlength="500"
                  aria-describedby="query-help"
                  class="query-row-input"
                  :ui="{ root: 'w-full' }"
                />
                <UButton type="submit" label="Search" :loading="pending" class="query-row-button" />
                <p
                  id="query-help"
                  class="query-row-help font-sans text-body-sm text-(--ws-field-help-text-rest)"
                >
                  In Serbian, in Latin with or without diacritics, or in Cyrillic. Leave it empty to
                  list every home.
                </p>
              </div>
            </UFormField>
          </form>

          <section class="mt-6 max-w-content" aria-labelledby="examples-title">
            <h2 id="examples-title" class="font-mono text-overline text-text-secondary uppercase">
              Try one
            </h2>
            <ul class="mt-3 flex flex-wrap gap-2">
              <li v-for="example in examples" :key="example">
                <UButton
                  color="neutral"
                  variant="outline"
                  size="sm"
                  lang="sr"
                  :label="example"
                  :disabled="pending"
                  @click="tryExample(example)"
                />
              </li>
            </ul>
          </section>

          <p class="ws-visually-hidden" aria-live="polite">{{ announcement }}</p>

          <div v-if="failure" class="mt-12 flex max-w-content flex-col gap-8">
            <aside class="ws-callout ws-callout--danger">
              <p class="ws-callout__title">The search failed</p>
              <p>{{ failure.message }}</p>
              <p v-if="failure.reason" class="text-body-sm">
                Typesense said: <code>{{ failure.reason }}</code>
              </p>
            </aside>
            <UnderstoodQuery v-if="failure.understood" :understood="failure.understood" />
          </div>

          <div v-else-if="result" class="mt-12 flex flex-col gap-12">
            <UnderstoodQuery
              v-if="result.understood"
              class="max-w-content"
              :understood="result.understood"
              :parse-time-ms="result.parseTimeMs"
            />

            <section aria-labelledby="results-title">
              <h2 id="results-title" class="ws-prompt">{{ heading }}</h2>
              <p v-if="result.found === 0" class="mt-2 max-w-content text-body-sm">
                No listing matches
                <span lang="sr">“{{ searched }}”</span>. Try another neighbourhood, or fewer
                conditions.
              </p>
              <p v-else-if="!searched" class="mt-2 text-body-sm text-text-secondary">
                Every home in the demo, as no query was given.
              </p>
              <ul v-if="result.listings.length" class="results mt-6">
                <li v-for="listing in result.listings" :key="listing.id">
                  <ListingCard :listing="listing" />
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <AppStatusLine />
    </div>
  </UApp>
</template>
