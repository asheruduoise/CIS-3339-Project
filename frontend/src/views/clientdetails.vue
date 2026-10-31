<!-- Client details: view/update/delete a client and manage event registrations.
     Viewers see a read-only page (S1 frontend side). Register/deregister show
     the B1 messages ("Already registered" / "Not registered"). -->
<template>
  <main>
    <h1 class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700">Client Details</h1>

    <div class="px-4 py-10 md:px-10">
      <AsyncState
        :loading="loading"
        :error="error"
        loading-text="Loading client…"
        error-title="Couldn't load this client"
        @retry="load"
      >
        <p v-if="!user.isEditor" class="mb-6 rounded bg-yellow-50 p-3 text-yellow-900">
          You have view-only access. Only editors can change clients or event registrations.
        </p>

        <form novalidate @submit.prevent="submitUpdate">
          <fieldset :disabled="!user.isEditor">
            <legend class="sr-only">Client information</legend>
            <div class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-4">
              <h2 class="text-2xl font-bold">Personal Details</h2>

              <div class="flex flex-col">
                <label class="block">
                  <span class="text-gray-700">First Name</span>
                  <span class="text-red-600" aria-hidden="true">*</span>
                  <input v-model.trim="client.firstName" type="text" :class="inputClass" required />
                </label>
                <span v-if="v$.client.firstName.$error" class="text-red-600">First Name is required</span>
              </div>

              <div class="flex flex-col">
                <label class="block">
                  <span class="text-gray-700">Middle Name</span>
                  <input v-model.trim="client.middleName" type="text" :class="inputClass" />
                </label>
              </div>

              <div class="flex flex-col">
                <label class="block">
                  <span class="text-gray-700">Last Name</span>
                  <span class="text-red-600" aria-hidden="true">*</span>
                  <input v-model.trim="client.lastName" type="text" :class="inputClass" required />
                </label>
                <span v-if="v$.client.lastName.$error" class="text-red-600">Last Name is required</span>
              </div>

              <div></div>

              <div class="flex flex-col">
                <label class="block">
                  <span class="text-gray-700">Email</span>
                  <input v-model.trim="client.email" type="email" :class="inputClass" />
                </label>
                <span v-if="v$.client.email.$error" class="text-red-600">Valid Email is required</span>
              </div>

              <div class="flex flex-col">
                <label class="block">
                  <span class="text-gray-700">Phone Number</span>
                  <span class="text-red-600" aria-hidden="true">*</span>
                  <input v-model.trim="client.phoneNumber.primary" type="tel" inputmode="numeric" :class="inputClass" required />
                </label>
                <span v-if="v$.client.phoneNumber.primary.$error" class="text-red-600">{{ phoneError }}</span>
              </div>

              <div class="flex flex-col">
                <label class="block">
                  <span class="text-gray-700">Alternative Phone Number</span>
                  <input v-model.trim="client.phoneNumber.alternate" type="tel" inputmode="numeric" :class="inputClass" />
                </label>
              </div>
            </div>

            <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-4">
              <h2 class="text-2xl font-bold">Address Details</h2>
              <div v-for="field in addressFields" :key="field.key" class="flex flex-col">
                <label class="block">
                  <span class="text-gray-700">{{ field.label }}</span>
                  <span v-if="field.required" class="text-red-600" aria-hidden="true">*</span>
                  <input v-model.trim="client.address[field.key]" type="text" :class="inputClass" :required="field.required" />
                </label>
                <span v-if="field.key === 'city' && v$.client.address.city.$error" class="text-red-600">City is required</span>
              </div>
            </div>
          </fieldset>

          <div class="mt-10 flex flex-wrap gap-4">
            <template v-if="user.isEditor">
              <button type="submit" class="rounded bg-green-700 text-white disabled:opacity-50" :disabled="saving">
                {{ saving ? 'Saving…' : 'Update Client' }}
              </button>
              <button type="button" class="rounded bg-red-700 text-white" @click="askDelete">Delete Client</button>
            </template>
            <button type="button" class="rounded border border-red-700 bg-white text-red-700" @click="router.back()">
              Go back
            </button>
          </div>
        </form>

        <hr class="my-10" />

        <section class="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-4">
          <div>
            <h2 class="text-2xl font-bold">Events for Client</h2>
            <p class="italic">Click a row (or press Enter) to view event details</p>
          </div>

          <div class="md:col-span-2">
            <DataTable
              :columns="eventColumns"
              :rows="clientEvents"
              clickable
              caption="Events this client is registered for"
              empty-text="This client isn't registered for any events."
              @row-click="(e) => router.push({ name: 'eventdetails', params: { id: e._id } })"
            >
              <template #cell-actions="{ row }">
                <button
                  v-if="user.isEditor"
                  type="button"
                  class="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
                  :aria-label="`Remove client from ${row.name}`"
                  @click.stop="removeFromEvent(row)"
                >
                  Remove
                </button>
              </template>
            </DataTable>
          </div>

          <div v-if="user.isEditor" class="flex flex-col">
            <label for="event-picker" class="mb-1 font-bold">Add client to events</label>
            <VueMultiselect
              id="event-picker"
              v-model="eventsSelected"
              :options="eventsNotRegistered"
              :custom-label="nameWithDate"
              :multiple="true"
              :close-on-select="true"
              placeholder="Select events"
              track-by="_id"
            />
            <button
              type="button"
              class="mt-5 rounded bg-red-700 text-white disabled:opacity-50"
              :disabled="!eventsSelected.length || registering"
              @click="addToEvents"
            >
              {{ registering ? 'Adding…' : 'Add Client to Selected Events' }}
            </button>
          </div>
        </section>
      </AsyncState>
    </div>

    <ConfirmModal
      :open="confirmOpen"
      title="Delete this client?"
      :message="`${client.firstName} ${client.lastName} will be permanently deleted.`"
      confirm-text="Delete Client"
      :busy="deleting"
      @confirm="submitDelete"
      @cancel="confirmOpen = false"
    />
  </main>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - data() { client, clientEvents, eventsFiltered, eventsSelected, hoverId } -> reactive(client) + ref() lists
// - setup() { v$, user } + validations() -> useVuelidate(rules, { client }) and the store at top level
// - async mounted() + this.$route.params.id -> useApi() + watch(clientId, load, { immediate: true })
// - methods.formatDate (copy of 4) -> shared utils/formatDate.js
// - addClientToEvent: unawaited Promise.all().then() -> await Promise.allSettled() with per-event messages
// - components: { VueMultiselect } option -> direct import; events <table> -> DataTable with a Remove slot
// ---------------------------------------------------------------------------
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import useVuelidate from '@vuelidate/core'
import { required, email, numeric, minLength, maxLength } from '@vuelidate/validators'
import VueMultiselect from 'vue-multiselect'
import 'vue-multiselect/dist/vue-multiselect.css'
import { useToast } from 'vue-toastification'
import AsyncState from '../components/AsyncState.vue'
import DataTable from '../components/DataTable.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useApi } from '../composables/useApi'
import { useLoggedInUserStore } from '../store/loggedInUser'
import {
  getClientById,
  getClientEvents,
  getNonClientEvents,
  registerAttendee,
  deregisterAttendee,
  updateClient,
  deleteClientbyId
} from '../api/api'
import { formatDate } from '../utils/formatDate'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const user = useLoggedInUserStore()

const inputClass =
  'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-100'

const addressFields = [
  { key: 'line1', label: 'Address Line 1' },
  { key: 'line2', label: 'Address Line 2' },
  { key: 'city', label: 'City', required: true },
  { key: 'county', label: 'County' },
  { key: 'zip', label: 'Zip Code' }
]

const client = reactive({
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phoneNumber: { primary: '', alternate: '' },
  address: { line1: '', line2: '', city: '', county: '', zip: '' }
})
const clientEvents = ref([])
const eventsNotRegistered = ref([])
const eventsSelected = ref([])

const rules = {
  client: {
    firstName: { required },
    lastName: { required },
    email: { required, email },
    phoneNumber: { primary: { required, numeric, minLength: minLength(10), maxLength: maxLength(10) } },
    address: { city: { required } }
  }
}
const v$ = useVuelidate(rules, { client })

const phoneError = computed(() => {
  const p = v$.value.client.phoneNumber.primary
  if (p.required.$invalid) return 'Phone Number is required'
  if (p.numeric.$invalid) return 'Phone Number must contain only digits'
  return 'Phone Number must be exactly 10 digits'
})

const clientId = computed(() => route.params.id)

// ---- load ----
const { loading, error, execute } = useApi((id) =>
  Promise.all([getClientById(id), getClientEvents(id), getNonClientEvents(id)])
)

async function load() {
  const result = await execute(clientId.value)
  if (!result) return
  const [clientData, registered, notRegistered] = result
  Object.assign(client, {
    firstName: clientData.firstName || '',
    middleName: clientData.middleName || '',
    lastName: clientData.lastName || '',
    email: clientData.email || '',
    phoneNumber: { primary: '', alternate: '', ...(clientData.phoneNumber || {}) },
    address: { line1: '', line2: '', city: '', county: '', zip: '', ...(clientData.address || {}) }
  })
  clientEvents.value = registered
  eventsNotRegistered.value = notRegistered
  v$.value.$reset()
}
watch(clientId, (id) => id && load(), { immediate: true })

// refresh only the two event lists (after register / deregister)
async function refreshEvents() {
  try {
    const [registered, notRegistered] = await Promise.all([
      getClientEvents(clientId.value),
      getNonClientEvents(clientId.value)
    ])
    clientEvents.value = registered
    eventsNotRegistered.value = notRegistered
  } catch (err) {
    toast.error(err.message)
  }
}

const eventColumns = [
  { label: 'Event Name', field: 'name' },
  { label: 'Date', field: 'date', render: (e) => formatDate(e.date), sortValue: (e) => new Date(e.date).getTime() },
  { label: '', field: 'actions', sortable: false, render: () => '' }
]
const nameWithDate = ({ name, date }) => `${name} (${formatDate(date)})`

// API may answer with a plain string or { message } (B1 contract)
const messageOf = (res, fallback) => (typeof res === 'string' ? res : res?.message) || fallback

// ---- register / deregister (B1) ----
const registering = ref(false)
async function addToEvents() {
  registering.value = true
  const results = await Promise.allSettled(
    eventsSelected.value.map((event) => registerAttendee(event._id, clientId.value))
  )
  registering.value = false

  results.forEach((r, i) => {
    const name = eventsSelected.value[i].name
    if (r.status === 'rejected') toast.error(`${name}: ${r.reason.message}`)
    else if (messageOf(r.value) === 'Already registered') toast.info(`${name}: Already registered`)
    else toast.success(`${name}: ${messageOf(r.value, 'Client added to event')}`)
  })
  eventsSelected.value = []
  await refreshEvents()
}

async function removeFromEvent(event) {
  try {
    const res = await deregisterAttendee(event._id, clientId.value)
    const message = messageOf(res, 'Client removed from event')
    if (message === 'Not registered') toast.info(`${event.name}: Not registered`)
    else toast.success(`${event.name}: ${message}`)
  } catch (err) {
    toast.error(err.message)
  }
  await refreshEvents()
}

// ---- update ----
const saving = ref(false)
async function submitUpdate() {
  if (!(await v$.value.$validate())) return
  saving.value = true
  try {
    const message = await updateClient(clientId.value, client)
    toast.success(messageOf(message, 'Client updated'))
    router.push('/findclient')
  } catch (err) {
    toast.error(err.message)
  } finally {
    saving.value = false
  }
}

// ---- delete (with confirmation) ----
const confirmOpen = ref(false)
const deleting = ref(false)
function askDelete() {
  if (clientEvents.value.length) {
    toast.info('Remove this client from all events before deleting.')
    return
  }
  confirmOpen.value = true
}
async function submitDelete() {
  deleting.value = true
  try {
    const message = await deleteClientbyId(clientId.value)
    confirmOpen.value = false
    toast.success(messageOf(message, 'Client deleted'))
    router.push('/findclient')
  } catch (err) {
    toast.error(err.message)
  } finally {
    deleting.value = false
  }
}
</script>
