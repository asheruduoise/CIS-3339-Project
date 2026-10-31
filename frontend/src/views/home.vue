<!-- Dashboard: recent event attendance and clients by zip code.
     Each section uses useApi() (F2) and only draws its chart after its data
     has loaded (U4 - fixes the render race). -->
<template>
  <main class="px-4 pb-16 md:px-10">
    <h1 class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700">Dashboard</h1>

    <section class="mx-auto mt-10 max-w-4xl" aria-labelledby="attendance-heading">
      <h2 id="attendance-heading" class="mb-6 text-center text-3xl font-bold text-red-700">
        Events Attendance
      </h2>
      <AsyncState
        :loading="attendance.loading.value"
        :error="attendance.error.value"
        :empty="!recentEvents.length"
        loading-text="Loading recent attendance…"
        error-title="Couldn't load attendance"
        empty-text="No events in the last two months."
        @retry="attendance.execute()"
      >
        <div class="overflow-x-auto">
          <table class="min-w-full rounded shadow-md">
            <thead class="bg-gray-50 text-xl">
              <tr>
                <th scope="col" class="p-4 text-left">Event Name</th>
                <th scope="col" class="p-4 text-left">Event Date</th>
                <th scope="col" class="p-4 text-left">Number of Attendees</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-300">
              <tr v-for="event in recentEvents" :key="event._id">
                <td class="p-2 text-left">
                  <router-link
                    class="text-red-800 underline hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                    :to="{ name: 'eventdetails', params: { id: event._id } }"
                  >
                    {{ event.name }}
                  </router-link>
                </td>
                <td class="p-2 text-left">{{ formatDate(event.date) }}</td>
                <td class="p-2 text-left">{{ event.attendees.length }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <AttendanceChart :label="attendanceLabels" :chart-data="attendanceCounts" />
      </AsyncState>
    </section>

    <section class="mx-auto mt-16 max-w-4xl" aria-labelledby="zip-heading">
      <h2 id="zip-heading" class="mb-6 text-center text-3xl font-bold text-red-700">Clients by Zip Code</h2>
      <AsyncState
        :loading="zipApi.loading.value"
        :error="zipApi.error.value"
        :empty="!zips.length"
        loading-text="Loading clients by zip code…"
        error-title="Couldn't load zip code data"
        empty-text="No clients with a zip code yet."
        @retry="zipApi.execute()"
      >
        <div class="overflow-x-auto">
          <table class="min-w-full rounded shadow-md">
            <thead class="bg-gray-50 text-xl">
              <tr>
                <th scope="col" class="p-4 text-left">Zip Code</th>
                <th scope="col" class="p-4 text-left">Client Count</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-300">
              <tr v-for="zip in zips" :key="zip._id">
                <td class="p-2 text-left">{{ zip._id }}</td>
                <td class="p-2 text-left">{{ zip.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-6 flex justify-center">
          <ZipChart :label="zipLabels" :chart-data="zipCounts" />
        </div>
      </AsyncState>
    </section>
  </main>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - data() { recentEvents, labels, chartData, loading, error, ... } -> two useApi() calls
// - labels / chartData were filled by hand in methods -> computed() from the API data
// - mounted() { getAttendanceData(); getZipData() } -> execute() called during setup
// - methods.formatDate (copy #1 of 4) -> shared utils/formatDate.js
// - components: {} option -> imports are used directly in <script setup>
// ---------------------------------------------------------------------------
import { computed } from 'vue'
import AttendanceChart from '../components/barChart.vue'
import ZipChart from '../components/donutZipChart.vue'
import AsyncState from '../components/AsyncState.vue'
import { getAttendance, getClientsByZipCode } from '../api/api'
import { useApi } from '../composables/useApi'
import { formatDate } from '../utils/formatDate'

const attendance = useApi(() => getAttendance())
const zipApi = useApi(() => getClientsByZipCode())

const recentEvents = computed(() => attendance.data.value || [])
const attendanceLabels = computed(() => recentEvents.value.map((e) => `${e.name} (${formatDate(e.date)})`))
const attendanceCounts = computed(() => recentEvents.value.map((e) => e.attendees.length))

const zips = computed(() => zipApi.data.value || [])
const zipLabels = computed(() => zips.value.map((z) => z._id))
const zipCounts = computed(() => zips.value.map((z) => z.count))

// start loading right away (during setup) so the first paint shows "Loading…"
// instead of flashing the empty message
attendance.execute()
zipApi.execute()
</script>
