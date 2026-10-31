<!-- Find Services: search services and open one. Uses useApi (F2) + DataTable (F3). -->
<template>
  <main>
    <h1 class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700">Find Services</h1>

    <form class="px-4 pt-10 md:px-10 md:pt-20" @submit.prevent="search">
      <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 md:grid-cols-4">
        <h2 class="text-2xl font-bold">Search Service By</h2>
        <div class="flex flex-col">
          <label for="service-search-by" class="sr-only">Search service by</label>
          <select id="service-search-by" v-model="searchBy" :class="inputClass">
            <option value="name">Service Name</option>
            <option value="description">Service Description</option>
          </select>
        </div>
        <div class="flex flex-col">
          <label for="service-term" class="sr-only">Search term</label>
          <input
            id="service-term"
            v-model.trim="term"
            type="text"
            :class="inputClass"
            :placeholder="searchBy === 'name' ? 'Enter service name' : 'Enter service description'"
          />
        </div>
      </div>
      <div class="mt-5 flex justify-end gap-4 md:justify-center">
        <button class="rounded border border-red-700 bg-white text-red-700" type="button" @click="clearSearch">
          Clear Search
        </button>
        <button class="rounded bg-red-700 text-white" type="submit">Search Service</button>
      </div>
    </form>

    <hr class="my-10" />

    <section class="grid grid-cols-1 gap-x-6 gap-y-6 px-4 pb-16 md:grid-cols-4 md:px-10">
      <div>
        <h2 class="text-2xl font-bold">List of Services</h2>
        <p class="italic">Click a row (or Tab to it and press Enter) to view service details</p>
      </div>
      <div class="md:col-span-3">
        <AsyncState
          :loading="loading"
          :error="error"
          loading-text="Loading services…"
          error-title="Couldn't load services"
          @retry="execute()"
        >
          <DataTable
            :columns="columns"
            :rows="data || []"
            clickable
            caption="Services"
            :empty-text="activeQuery ? 'No services match your search.' : 'No services yet.'"
            @row-click="openService"
          />
        </AsyncState>
      </div>
    </section>
  </main>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - data() { services, searchBy, name, description, hoverId } -> ref() per field; services -> useApi().data
// - mounted() -> execute() during setup; methods -> plain functions
// - per-call try/catch + toast -> removed (useApi + interceptor); hand-built table -> DataTable
// ---------------------------------------------------------------------------
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AsyncState from '../components/AsyncState.vue'
import DataTable from '../components/DataTable.vue'
import { useApi } from '../composables/useApi'
import { getServices, searchServices } from '../api/api'

const router = useRouter()
const inputClass =
  'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50'

const searchBy = ref('name')
const term = ref('')
const activeQuery = ref(null)

const { data, loading, error, execute } = useApi(() =>
  activeQuery.value ? searchServices(activeQuery.value) : getServices()
)

const columns = [
  { label: 'Service Name', field: 'name' },
  { label: 'Status', field: 'status' },
  { label: 'Service Description', field: 'description' }
]

function search() {
  if (!term.value) return clearSearch()
  activeQuery.value = { searchBy: searchBy.value, [searchBy.value]: term.value }
  execute()
}

function clearSearch() {
  term.value = ''
  activeQuery.value = null
  execute()
}

function openService(service) {
  router.push({ name: 'servicedetails', params: { id: service._id } })
}

execute()
</script>
