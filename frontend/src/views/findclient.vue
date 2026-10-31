<!-- Find Client: search clients and open one. Uses useApi (F2) + DataTable (F3). -->
<template>
  <main>
    <h1 class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700">Find Client</h1>

    <form class="px-4 pt-10 md:px-10 md:pt-20" @submit.prevent="search">
      <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 md:grid-cols-4">
        <h2 class="text-2xl font-bold">Search Client By</h2>
        <div class="flex flex-col">
          <label for="client-search-by" class="sr-only">Search client by</label>
          <select id="client-search-by" v-model="searchBy" :class="inputClass">
            <option value="name">Client Name</option>
            <option value="number">Client Number</option>
          </select>
        </div>
        <template v-if="searchBy === 'name'">
          <div class="flex flex-col">
            <label for="client-first" class="sr-only">First name</label>
            <input id="client-first" v-model.trim="firstName" type="text" :class="inputClass" placeholder="Enter first name" />
          </div>
          <div class="flex flex-col">
            <label for="client-last" class="sr-only">Last name</label>
            <input id="client-last" v-model.trim="lastName" type="text" :class="inputClass" placeholder="Enter last name" />
          </div>
        </template>
        <div v-else class="flex flex-col">
          <label for="client-phone" class="sr-only">Phone number</label>
          <input id="client-phone" v-model.trim="phoneNumber" type="text" inputmode="numeric" :class="inputClass" placeholder="Enter client phone number" />
        </div>
      </div>
      <div class="mt-5 flex justify-end gap-4 md:justify-center">
        <button class="rounded border border-red-700 bg-white text-red-700" type="button" @click="clearSearch">
          Clear Search
        </button>
        <button class="rounded bg-red-700 text-white" type="submit">Search Client</button>
      </div>
    </form>

    <hr class="my-10" />

    <section class="grid grid-cols-1 gap-x-6 gap-y-6 px-4 pb-16 md:grid-cols-4 md:px-10">
      <div>
        <h2 class="text-2xl font-bold">List of Clients</h2>
        <p class="italic">Click a row (or Tab to it and press Enter) to view client details</p>
      </div>
      <div class="md:col-span-3">
        <AsyncState
          :loading="loading"
          :error="error"
          loading-text="Searching clients…"
          error-title="Couldn't load clients"
          @retry="execute()"
        >
          <DataTable
            :columns="columns"
            :rows="data || []"
            clickable
            caption="Clients"
            :empty-text="activeQuery ? 'No clients match your search.' : 'No clients yet.'"
            @row-click="openClient"
          />
        </AsyncState>
      </div>
    </section>
  </main>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - data() { clients, searchBy, firstName, ... } -> ref() per field; clients -> useApi().data
// - mounted() { loadData() } -> execute() during setup
// - methods.loadData / handleSubmitForm -> clearSearch() / search() functions
// - try/catch + toast.error(error) per call -> removed; useApi + the api.js interceptor handle errors
// - hand-built <table> + hoverId -> shared DataTable; $router.push in template -> useRouter()
// ---------------------------------------------------------------------------
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AsyncState from '../components/AsyncState.vue'
import DataTable from '../components/DataTable.vue'
import { useApi } from '../composables/useApi'
import { getClients, searchClients } from '../api/api'

const router = useRouter()
const inputClass =
  'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50'

const searchBy = ref('name')
const firstName = ref('')
const lastName = ref('')
const phoneNumber = ref('')
// the query currently shown in the table (Retry re-runs exactly this)
const activeQuery = ref(null)

const { data, loading, error, execute } = useApi(() =>
  activeQuery.value ? searchClients(activeQuery.value) : getClients()
)

const columns = [
  { label: 'Name', field: 'name', render: (c) => `${c.firstName} ${c.lastName}`, sortValue: (c) => `${c.lastName} ${c.firstName}` },
  { label: 'Phone number', field: 'phoneNumber.primary' },
  { label: 'City', field: 'address.city' }
]

function search() {
  if (searchBy.value === 'name') {
    if (!firstName.value && !lastName.value) return clearSearch()
    activeQuery.value = { searchBy: 'name', firstName: firstName.value, lastName: lastName.value }
  } else {
    if (!phoneNumber.value) return clearSearch()
    activeQuery.value = { searchBy: 'number', phoneNumber: phoneNumber.value }
  }
  execute()
}

function clearSearch() {
  firstName.value = ''
  lastName.value = ''
  phoneNumber.value = ''
  activeQuery.value = null
  execute()
}

function openClient(client) {
  router.push({ name: 'clientdetails', params: { id: client._id } })
}

execute() // load all clients on first visit
</script>
