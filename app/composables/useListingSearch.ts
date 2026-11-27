import type { SearchResult, Understood } from '#shared/search'

/** Why a search failed, as the server route says it. */
export interface SearchFailure {
  message: string
  reason?: string
  /** What the search understood, when it got that far. */
  understood?: Understood
}

interface ErrorBody {
  statusMessage?: string
  data?: { reason?: string; understood?: Understood }
}

/** Runs a search through the server route and keeps its result, its failure and its state. */
export function useListingSearch() {
  const result = shallowRef<SearchResult>()
  const failure = shallowRef<SearchFailure>()
  const pending = ref(false)
  /** The query of the result or the failure on show. */
  const searched = ref('')

  async function search(query: string) {
    pending.value = true
    try {
      result.value = await $fetch('/api/search', { method: 'POST', body: { query } })
      failure.value = undefined
    } catch (error) {
      const body = (error as { data?: ErrorBody }).data
      result.value = undefined
      failure.value = {
        message: body?.statusMessage ?? 'The search failed. Is the dev server running?',
        reason: body?.data?.reason,
        understood: body?.data?.understood,
      }
    } finally {
      searched.value = query.trim()
      pending.value = false
    }
  }

  return { result, failure, pending, searched, search }
}
