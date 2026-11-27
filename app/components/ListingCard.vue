<script setup lang="ts">
import type { Listing } from '#shared/listing'

const props = defineProps<{ listing: Listing }>()

const price = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const floor = computed(() => {
  const { floor, total_floors: total } = props.listing
  if (floor === undefined) return total === 0 ? 'Single storey' : `${total + 1} storeys`
  // The ground floor needs no total, and stays short enough for a phone
  return floor === 0 ? 'Ground' : `${floor} of ${total}`
})

/** The listing's details, as terms and values. */
const details = computed(() => [
  { term: 'Rooms', value: String(props.listing.rooms) },
  { term: 'Area', value: `${props.listing.area_m2}\u00a0m²` },
  { term: props.listing.floor === undefined ? 'Floors' : 'Floor', value: floor.value },
  { term: 'Heating', value: props.listing.heating },
])

/** What the listing has, each a tag; what it lacks is not shown. */
const features = computed(() =>
  [
    props.listing.has_terrace && 'Terrace',
    props.listing.has_lift && 'Lift',
    props.listing.has_parking && 'Parking',
    props.listing.is_registered && 'Registered (uknjižen)',
  ].filter((feature) => feature !== false),
)
</script>

<template>
  <UCard as="article" :aria-labelledby="`listing-${listing.id}`">
    <template #header>
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 :id="`listing-${listing.id}`" lang="sr">{{ listing.title }}</h3>
        <p class="font-mono text-label font-semibold">{{ price.format(listing.price_eur) }}</p>
      </div>
      <p class="mt-1 text-body-sm text-text-secondary" lang="sr">
        {{ listing.neighbourhood }}, {{ listing.district }}, {{ listing.city }}
      </p>
    </template>

    <dl class="listing-details">
      <div v-for="detail in details" :key="detail.term">
        <dt class="font-mono text-caption text-text-secondary">{{ detail.term }}</dt>
        <dd class="text-body-sm">{{ detail.value }}</dd>
      </div>
    </dl>

    <p class="mt-4 text-body-sm" lang="sr">{{ listing.description }}</p>

    <ul v-if="features.length" class="mt-4 flex flex-wrap gap-2" aria-label="Features">
      <li v-for="feature in features" :key="feature">
        <UBadge color="neutral" variant="outline" :label="feature" />
      </li>
    </ul>
  </UCard>
</template>

<style scoped>
.listing-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
  gap: var(--ws-space-12) var(--ws-space-16);
}

@media (width < 40rem) {
  .listing-details {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
