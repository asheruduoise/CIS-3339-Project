<!-- Find Events: search events and open one. Uses useApi (F2) + DataTable (F3). -->
<template>
  <main>
    <h1 class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700">List of Events</h1>

    <form class="px-4 pt-10 md:px-10 md:pt-20" @submit.prevent="search">
      <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 md:grid-cols-4">
        <h2 class="text-2xl font-bold">Search Event By</h2>
        <div class="flex flex-col">
          <label for="event-search-by" class="sr-only">Search event by</label>
          <select id="event-search-by" v-model="searchBy" :class="inputClass">
            <option value="name">Event Name</option>
            <option value="date">Event Date</option>
          </select>
        </div>
        <div v-if="searchBy === 'name'" class="flex flex-col">
          <label for="event-name" class="sr-only">Event name</label>
          <input id="event-name" v-model.trim="name" type="text" :class="inputClass" placeholder="Enter event name" />
        </div>
        <div v-else class="flex flex-col">
          <label for="event-date" class="sr-only">Event date</label>
          <input id="event-date" v-model="eventDate" type="date" :class="inputClass" />
        </div>
      </div>
      <div class="mt-5 flex justify-end gap-4 md:justify-center">
        <button class="rounded border border-red-700 bg-white text-red-700" type="button" @click="clearSearch">
          Clear Search
        </button>
        <button class="rounded bg-red-700 text-white" type="submit">Search Event</button>
      </div>
    </form>

    <hr class="my-10" />

    <section class="grid grid-cols-1 gap-x-6 gap-y-6 px-4 pb-16 md:grid-cols-4 md:px-10">
      <div>
        <h2 class="text-2xl font-bold">List of Events</h2>
        <p class="italic">Click a row (or Tab to it and press Enter) to view event details</p>
      </div>
      <div class="md:col-span-3">
        <AsyncState
          :loading="loading"
          :error="error"
          loading-text="Loading events…"
          error-title="Couldn't load events"
          @retry="execute()"
        >
          <DataTable
            :columns="columns"
            :rows="data || []"
            clickable
            caption="Events"
            :empty-text="activeQuery ? 'No events match your search.' : 'No events scheduled.'"
            @row-click="openEvent"
          />
        </AsyncState>
      </div>
    </section>
  </main>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - data() { events, searchBy, name, eventDate, hoverId } -> ref() per field; events -> useApi().data
// - mounted() -> execute() during setup; methods -> plain functions
// - methods.formatDate (copy of 4) -> shared utils/formatDate.js
// - per-call try/catch + toast -> removed (useApi + interceptor); hand-built table -> DataTable
// ---------------------------------------------------------------------------
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AsyncState from '../components/AsyncState.vue'
import DataTable from '../components/DataTable.vue'
import { useApi } from '../composables/useApi'
import { getEvents, searchEvents } from '../api/api'
import { formatDate } from '../utils/formatDate'

const router = useRouter()
const inputClass =
  'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50'

const searchBy = ref('name')
const name = ref('')
const eventDate = ref('')
const activeQuery = ref(null)

const { data, loading, error, execute } = useApi(() =>
  activeQuery.value ? searchEvents(activeQuery.value) : getEvents()
)

const columns = [
  { label: 'Event Name', field: 'name' },
  // show MM/DD/YYYY but sort by the real date
  { label: 'Event Date', field: 'date', render: (e) => formatDate(e.date), sortValue: (e) => new Date(e.date).getTime() },
  { label: 'Event Address', field: 'address.line1' }
]

function search() {
  if (searchBy.value === 'name') {
    if (!name.value) return clearSearch()
    activeQuery.value = { searchBy: 'name', name: name.value }
  } else {
    if (!eventDate.value) return clearSearch()
    // <input type="date"> already gives YYYY-MM-DD
    activeQuery.value = { searchBy: 'date', eventDate: eventDate.value }
  }
  execute()
}

function clearSearch() {
  name.value = ''
  eventDate.value = ''
  activeQuery.value = null
  execute()
}

function openEvent(event) {
  router.push({ name: 'eventdetails', params: { id: event._id } })
}

execute()
</script>
