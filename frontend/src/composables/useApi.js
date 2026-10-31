// F2: small async-state composable.
//
//   const { data, loading, error, execute } = useApi(() => api.getClients())
//
// - loading: true while the request is in flight
// - data:    the result after a success (null until then)
// - error:   short readable string on failure, null otherwise
// - execute: runs the call (on mount, after a search, or as a Retry)
//
// Only the newest call is allowed to update state, so a slow old response can
// never overwrite a newer one (prevents stale rows after a search).
import { ref, shallowRef } from 'vue'

export function useApi(apiCall) {
  const data = shallowRef(null)
  const loading = ref(false)
  const error = ref(null)
  let latestCall = 0

  async function execute(...args) {
    const callId = ++latestCall
    loading.value = true
    error.value = null
    try {
      const result = await apiCall(...args)
      if (callId === latestCall) data.value = result
      return result
    } catch (err) {
      // the API interceptor already turned this into a readable message
      if (callId === latestCall) error.value = err?.message || 'Something went wrong'
      return undefined
    } finally {
      if (callId === latestCall) loading.value = false
    }
  }

  return { data, loading, error, execute }
}
