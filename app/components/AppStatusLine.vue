<script setup lang="ts">
import { isTyping } from '@whatsaaaa/design-system/shortcuts'

const colorMode = useColorMode()

/** Chooses the other theme from the one on show, with Nuxt UI's color mode, which remembers it. */
function switchTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

/** INSERT while the focus is in a field, NORMAL otherwise, as the design system's status line has. */
const mode = ref<'NORMAL' | 'INSERT'>('NORMAL')

function updateMode() {
  mode.value = isTyping(document.activeElement) ? 'INSERT' : 'NORMAL'
}

onMounted(() => {
  updateMode()
  document.addEventListener('focusin', updateMode)
  document.addEventListener('focusout', updateMode)
})
onBeforeUnmount(() => {
  document.removeEventListener('focusin', updateMode)
  document.removeEventListener('focusout', updateMode)
})
</script>

<template>
  <footer class="ws-status-line" aria-label="Status">
    <span class="ws-status-line__mode">{{ mode }}</span>
    <span class="ws-status-line__path">
      <span class="ws-status-line__file"><span>~/serbian-real-estate/listings</span></span>
    </span>
    <!-- Both names are in the button and the styles show the theme's one, so it keeps the focus -->
    <button
      type="button"
      class="ws-status-line__theme"
      :disabled="colorMode.forced"
      @click="switchTheme"
    >
      <span class="ws-visually-hidden">Switch theme, now</span>
      <span class="ws-theme-dark">rose-pine</span>
      <span class="ws-theme-light">rose-pine-dawn</span>
    </button>
  </footer>
</template>
