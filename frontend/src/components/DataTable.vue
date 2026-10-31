<!-- F3: one reusable table for every list in the app.
     Props:
       columns: [{ label, field, render?(row), sortValue?(row), sortable? }]
                field can be a dot path like 'address.city'
       rows:    array of records (already loaded - sorting/paging is client-side)
     Behavior:
       - click (or Enter/Space on) a header: ascending -> descending -> unsorted
       - 10 rows per page with "Showing X–Y of Z"
       - "No results" row when empty
       - goes back to page 1 whenever rows change (no stale rows after a search)
       - rows are keyboard accessible (Tab + Enter) when clickable
     Slot: #cell-<field>="{ row, value }" for custom cell content (e.g. buttons). -->
<template>
  <div class="w-full">
    <div class="overflow-x-auto rounded shadow-md">
      <table class="min-w-full">
        <caption v-if="caption" class="sr-only">{{ caption }}</caption>
        <thead class="bg-gray-50 text-lg">
          <tr>
            <th
              v-for="col in columns"
              :key="col.field"
              scope="col"
              class="p-4 text-left"
              :aria-sort="ariaSort(col)"
            >
              <button
                v-if="col.sortable !== false"
                type="button"
                class="inline-flex items-center gap-1 rounded p-0 font-bold hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                @click="toggleSort(col.field)"
              >
                {{ col.label }}
                <span class="text-sm text-gray-500" aria-hidden="true">{{ sortIcon(col.field) }}</span>
              </button>
              <span v-else>{{ col.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-300">
          <tr v-if="!pagedRows.length">
            <td :colspan="columns.length" class="p-6 text-center italic text-gray-600">{{ emptyText }}</td>
          </tr>
          <tr
            v-for="row in pagedRows"
            :key="row[rowKey]"
            :tabindex="clickable ? 0 : undefined"
            :class="clickable ? 'data-row cursor-pointer' : ''"
            @click="clickable && emit('row-click', row)"
            @keydown.enter.self="clickable && emit('row-click', row)"
          >
            <td v-for="col in columns" :key="col.field" class="p-2 text-left">
              <slot :name="`cell-${col.field}`" :row="row" :value="getValue(row, col.field)">
                {{ display(row, col) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="sortedRows.length" class="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700">
      <p aria-live="polite">Showing {{ firstShown }}–{{ lastShown }} of {{ sortedRows.length }}</p>
      <div v-if="pageCount > 1" class="flex items-center gap-2">
        <button
          type="button"
          class="rounded border border-gray-300 bg-white disabled:opacity-40"
          :disabled="page === 1"
          @click="page--"
        >
          Previous
        </button>
        <span>Page {{ page }} of {{ pageCount }}</span>
        <button
          type="button"
          class="rounded border border-gray-300 bg-white disabled:opacity-40"
          :disabled="page === pageCount"
          @click="page++"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: String, default: '_id' },
  pageSize: { type: Number, default: 10 },
  emptyText: { type: String, default: 'No results' },
  clickable: { type: Boolean, default: false },
  caption: { type: String, default: '' }
})
const emit = defineEmits(['row-click'])

// ---- values ----
function getValue(row, field) {
  return field.split('.').reduce((obj, key) => (obj == null ? obj : obj[key]), row)
}
function display(row, col) {
  const value = col.render ? col.render(row) : getValue(row, col.field)
  return value ?? ''
}
function sortKey(row, col) {
  if (col.sortValue) return col.sortValue(row)
  return col.render ? col.render(row) : getValue(row, col.field)
}

// ---- sorting: asc -> desc -> none ----
const sortField = ref(null)
const sortDir = ref(null) // 'asc' | 'desc' | null

function toggleSort(field) {
  if (sortField.value !== field) {
    sortField.value = field
    sortDir.value = 'asc'
  } else if (sortDir.value === 'asc') {
    sortDir.value = 'desc'
  } else {
    sortField.value = null
    sortDir.value = null
  }
  page.value = 1
}
const sortIcon = (field) =>
  sortField.value !== field ? '↕' : sortDir.value === 'asc' ? '▲' : '▼'
const ariaSort = (col) => {
  if (col.sortable === false) return undefined
  if (sortField.value !== col.field) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

function compare(a, b) {
  if (a == null || a === '') return b == null || b === '' ? 0 : 1 // blanks last
  if (b == null || b === '') return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

const sortedRows = computed(() => {
  const rows = Array.isArray(props.rows) ? props.rows : []
  if (!sortField.value) return rows
  const col = props.columns.find((c) => c.field === sortField.value)
  if (!col) return rows
  const dir = sortDir.value === 'desc' ? -1 : 1
  // copy first - never mutate the parent's array
  return [...rows].sort((r1, r2) => dir * compare(sortKey(r1, col), sortKey(r2, col)))
})

// ---- pagination ----
const page = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / props.pageSize)))
const pagedRows = computed(() => {
  const start = (page.value - 1) * props.pageSize
  return sortedRows.value.slice(start, start + props.pageSize)
})
const firstShown = computed(() => (sortedRows.value.length ? (page.value - 1) * props.pageSize + 1 : 0))
const lastShown = computed(() => Math.min(page.value * props.pageSize, sortedRows.value.length))

// new data (search, clear, reload) -> back to page 1
watch(
  () => props.rows,
  () => {
    page.value = 1
  }
)
// safety: if rows shrink, never sit on an empty page
watch(pageCount, (count) => {
  if (page.value > count) page.value = count
})
</script>

<style scoped>
.data-row:hover {
  background-color: rgba(255, 0, 0, 0.08);
}
.data-row:focus-visible {
  outline: 3px solid #b91c1c;
  outline-offset: -3px;
}
</style>
