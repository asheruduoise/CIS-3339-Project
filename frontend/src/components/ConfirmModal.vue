<!-- Reusable confirm dialog (C3). Keyboard friendly: focus starts on Cancel,
     Escape cancels, Tab stays inside the dialog. -->
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="emit('cancel')"
    >
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        @keydown.esc.prevent="emit('cancel')"
        @keydown.tab="trapFocus"
      >
        <h2 :id="titleId" class="text-xl font-bold text-gray-900">{{ title }}</h2>
        <p class="mt-3 text-gray-700">{{ message }}</p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            ref="cancelRef"
            type="button"
            class="rounded border border-gray-400 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-400"
            :disabled="busy"
            @click="emit('confirm')"
          >
            {{ busy ? 'Working…' : confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Are you sure?' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Confirm' },
  busy: { type: Boolean, default: false }
})
const emit = defineEmits(['confirm', 'cancel'])

const titleId = `confirm-title-${Math.random().toString(36).slice(2, 8)}`
const dialogRef = ref(null)
const cancelRef = ref(null)
let lastFocused = null

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      lastFocused = document.activeElement
      await nextTick()
      cancelRef.value?.focus()
    } else if (lastFocused?.focus) {
      lastFocused.focus()
    }
  }
)

// keep Tab / Shift+Tab inside the dialog
function trapFocus(e) {
  const focusable = dialogRef.value?.querySelectorAll('button:not([disabled])')
  if (!focusable?.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
</script>
