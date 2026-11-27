<script setup lang="ts">
import { splitFilter, type Understood } from '#shared/search'

const props = defineProps<{
  understood: Understood
  /** How long Claude took, in milliseconds, when it is known. */
  parseTimeMs?: number | null
}>()

const timing = computed(() =>
  props.parseTimeMs ? `, in ${(props.parseTimeMs / 1000).toFixed(1)} s` : '',
)

/** The parameters Typesense generated, one chip each: the filter's conditions apart. */
const parts = computed(() => [
  ...splitFilter(props.understood.filter_by).map((condition) => ({
    kind: 'filter',
    value: condition,
  })),
  ...(props.understood.q && props.understood.q !== '*'
    ? [{ kind: 'text', value: props.understood.q }]
    : []),
  ...(props.understood.sort_by ? [{ kind: 'sort', value: props.understood.sort_by }] : []),
])
</script>

<template>
  <section aria-labelledby="understood-title">
    <h2 id="understood-title" class="ws-prompt">What the search understood</h2>
    <p class="mt-2 text-body-sm text-text-secondary">
      The parameters Typesense's natural language search generated from the query{{ timing }}.
    </p>
    <ul v-if="parts.length" class="mt-4 flex flex-wrap gap-2">
      <li v-for="part in parts" :key="part.kind + part.value">
        <UBadge
          color="neutral"
          variant="outline"
          class="understood-chip"
          :label="part.kind === 'filter' ? part.value : `${part.kind}: ${part.value}`"
        />
      </li>
    </ul>
    <p v-else class="mt-4 text-body-sm">No filters: every listing matches.</p>
  </section>
</template>

<style scoped>
/* A condition is code, and a long one wraps rather than widen the page */
.understood-chip {
  font-variant-ligatures: none;
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
