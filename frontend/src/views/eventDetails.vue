<!-- Event details: view/update/delete one event and see its attendees.
     Viewers see everything read-only (S1 frontend side). -->
<template>
  <main>
    <h1 class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700">Event Details</h1>

    <div class="px-4 py-10 md:px-10">
      <AsyncState
        :loading="loading"
        :error="error"
        loading-text="Loading event…"
        error-title="Couldn't load this event"
        @retry="load"
      >
        <p v-if="!user.isEditor" class="mb-6 rounded bg-yellow-50 p-3 text-yellow-900">
          You have view-only access. Only editors can change or delete events.
        </p>

        <form novalidate @submit.prevent="submitUpdate">
          <fieldset :disabled="!user.isEditor">
            <legend class="sr-only">Event information</legend>
            <div class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-4">
              <h2 class="text-2xl font-bold">Event Details</h2>

              <div class="flex flex-col">
                <label class="block">
                  <span class="text-gray-700">Event Name</span>
                  <span class="text-red-600" aria-hidden="true">*</span>
                  <input v-model.trim="event.name" type="text" :class="inputClass" required />
                </label>
                <span v-if="v$.event.name.$error" class="text-red-600">Event Name is required</span>
              </div>

              <div class="flex flex-col">
                <label class="block">
                  <span class="text-gray-700">Date</span>
                  <span class="text-red-600" aria-hidden="true">*</span>
                  <input v-model="event.date" type="date" :class="inputClass" required />
                </label>
                <span v-if="v$.event.date.$error" class="text-red-600">
                  {{ v$.event.date.required.$invalid ? 'Event Date is required' : 'Event Date must be a valid date' }}
                </span>
              </div>

              <div class="flex flex-col md:col-span-1">
                <label class="block">
                  <span class="text-gray-700">Description</span>
                  <textarea v-model="event.description" rows="2" :class="inputClass"></textarea>
                </label>
              </div>
            </div>

            <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-4">
              <h2 class="text-2xl font-bold">Services Offered at Event</h2>
              <div class="md:col-span-2">
                <ul v-if="services.length" class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <li v-for="service in services" :key="service._id" class="rounded-lg border border-gray-300 p-2 hover:bg-gray-100">
                    <label class="flex items-center gap-2">
                      <input
                        v-model="event.services"
                        type="checkbox"
                        :value="service._id"
                        :disabled="service.status === 'Inactive' && !event.services.includes(service._id)"
                        class="rounded border-gray-300 text-indigo-600 disabled:opacity-50"
                      />
                      <span class="font-medium">{{ service.name }}</span>
                      <span v-if="service.status === 'Inactive'" class="text-xs text-gray-500">(inactive)</span>
                    </label>
                  </li>
                </ul>
                <p v-else class="text-gray-600">No services available</p>
              </div>
            </div>

            <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-4">
              <h2 class="text-2xl font-bold">Address</h2>
              <div v-for="field in addressFields" :key="field.key" class="flex flex-col">
                <label class="block">
                  <span class="text-gray-700">{{ field.label }}</span>
                  <input v-model.trim="event.address[field.key]" type="text" :class="inputClass" />
                </label>
              </div>
            </div>
          </fieldset>

          <div class="mt-10 flex flex-wrap gap-4">
            <template v-if="user.isEditor">
              <button type="submit" class="rounded bg-green-700 text-white disabled:opacity-50" :disabled="saving">
                {{ saving ? 'Saving…' : 'Update Event' }}
              </button>
              <button type="button" class="rounded bg-red-700 text-white" @click="askDelete">Delete Event</button>
            </template>
            <button type="button" class="rounded border border-red-700 bg-white text-red-700" @click="router.back()">
              Go back
            </button>
          </div>
        </form>

        <hr class="my-10" />

        <section class="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-4">
          <div>
            <h2 class="text-2xl font-bold">List of Attendees</h2>
            <p class="italic">Click a row (or press Enter) to view client details</p>
          </div>
          <div class="md:col-span-3">
            <DataTable
              :columns="attendeeColumns"
              :rows="attendees"
              clickable
              caption="Event attendees"
              empty-text="No one is registered for this event yet."
              @row-click="(c) => router.push({ name: 'clientdetails', params: { id: c._id } })"
            />
          </div>
        </section>
      </AsyncState>
    </div>

    <ConfirmModal
      :open="confirmOpen"
      title="Delete this event?"
      :message="`“${event.name}” will be permanently deleted.`"
      confirm-text="Delete Event"
      :busy="deleting"
      @confirm="submitDelete"
      @cancel="confirmOpen = false"
    />
  </main>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - data() { clients, services, event, hoverId } -> reactive(event) + ref() lists
// - setup() { v$, user } + validations() -> useVuelidate(rules, { event }) and useLoggedInUserStore() at top level
// - async mounted() + this.$route.params.id -> useApi() + watch(eventId, load, { immediate: true }) via useRoute()
// - @click=this.$router.back() in template -> router.back() from useRouter()
// - methods.submitEventUpdate / submitDeleteEvent -> functions; delete now asks via ConfirmModal
// - attendees <table> -> DataTable; disabled buttons for viewers -> read-only fieldset
// ---------------------------------------------------------------------------
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import useVuelidate from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { useToast } from 'vue-toastification'
import AsyncState from '../components/AsyncState.vue'
import DataTable from '../components/DataTable.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useApi } from '../composables/useApi'
import { useLoggedInUserStore } from '../store/loggedInUser'
import { getEventById, getEventAttendees, getServices, updateEvent, deleteEvent } from '../api/api'
import { toInputDate } from '../utils/formatDate'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const user = useLoggedInUserStore()

const inputClass =
  'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-100'

const addressFields = [
  { key: 'line1', label: 'Address Line 1' },
  { key: 'line2', label: 'Address Line 2' },
  { key: 'city', label: 'City' },
  { key: 'county', label: 'County' },
  { key: 'zip', label: 'Zip Code' }
]

const event = reactive({
  name: '',
  description: '',
  date: '',
  services: [],
  address: { line1: '', line2: '', city: '', county: '', zip: '' }
})
const attendees = ref([])
const services = ref([])

const validDate = (value) => !value || !isNaN(new Date(value))
const v$ = useVuelidate({ event: { name: { required }, date: { required, validDate } } }, { event })

const eventId = computed(() => route.params.id)

const { loading, error, execute } = useApi((id) =>
  Promise.all([getEventById(id), getEventAttendees(id), getServices()])
)

async function load() {
  const result = await execute(eventId.value)
  if (!result) return
  const [eventData, attendeeData, serviceData] = result
  Object.assign(event, {
    name: eventData.name || '',
    description: eventData.description || '',
    date: toInputDate(eventData.date),
    services: [...(eventData.services || [])],
    address: { line1: '', line2: '', city: '', county: '', zip: '', ...(eventData.address || {}) }
  })
  attendees.value = attendeeData
  services.value = serviceData
  v$.value.$reset()
}
// reload if the id in the URL changes while this page is open
watch(eventId, (id) => id && load(), { immediate: true })

const attendeeColumns = [
  { label: 'Name', field: 'name', render: (c) => `${c.firstName} ${c.lastName}`, sortValue: (c) => `${c.lastName} ${c.firstName}` },
  { label: 'City', field: 'address.city' },
  { label: 'Phone Number', field: 'phoneNumber.primary' }
]

// ---- update ----
const saving = ref(false)
async function submitUpdate() {
  if (!(await v$.value.$validate())) return
  saving.value = true
  try {
    const message = await updateEvent(eventId.value, event)
    toast.success(message || 'Event updated')
    router.push('/findevents')
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
  if (attendees.value.length) {
    toast.info("This event can't be deleted while clients are registered for it.")
    return
  }
  confirmOpen.value = true
}
async function submitDelete() {
  deleting.value = true
  try {
    const message = await deleteEvent(eventId.value)
    confirmOpen.value = false
    toast.success(message || 'Event deleted')
    router.push('/findevents')
  } catch (err) {
    toast.error(err.message)
  } finally {
    deleting.value = false
  }
}
</script>
