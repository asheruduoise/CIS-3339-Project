<!-- Shows loading / error+Retry for a useApi() call, and the content when ready.
     Each view passes its own messages so loading, empty and error look different. -->
<template>
  <div>
    <div v-if="loading" role="status" aria-live="polite" class="flex items-center gap-3 rounded border border-gray-200 bg-gray-50 p-6 text-gray-600">
      <span class="material-icons animate-spin" aria-hidden="true">autorenew</span>
      <span>{{ loadingText }}</span>
    </div>

    <div v-else-if="error" role="alert" class="rounded border border-red-300 bg-red-50 p-6">
      <p class="flex items-center gap-2 font-bold text-red-800">
        <span class="material-icons" aria-hidden="true">error_outline</span>
        {{ errorTitle }}
      </p>
      <p class="mt-1 text-red-900">{{ error }}</p>
      <button
        type="button"
        class="mt-4 rounded bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-400"
        @click="emit('retry')"
      >
        Retry
      </button>
    </div>

    <div v-else-if="empty" class="rounded border border-dashed border-gray-300 p-6 text-center text-gray-600">
      <span class="material-icons align-middle" aria-hidden="true">inbox</span>
      {{ emptyText }}
    </div>

    <slot v-else />
  </div>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
  empty: { type: Boolean, default: false },
  loadingText: { type: String, default: 'Loading…' },
  errorTitle: { type: String, default: 'Something went wrong' },
  emptyText: { type: String, default: 'Nothing to show yet.' }
})
const emit = defineEmits(['retry'])
</script>
