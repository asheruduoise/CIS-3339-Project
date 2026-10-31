<!-- Create Event (editor only - guarded by the router). -->
<template>
  <main>
    <h1 class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700">Create New Event</h1>
    <div class="px-4 py-10 md:px-10 md:py-20">
      <form novalidate @submit.prevent="handleSubmitForm">
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
              <input v-model="event.date" type="date" :min="today" :class="inputClass" required />
            </label>
            <span v-if="v$.event.date.$error" class="text-red-600">{{ dateError }}</span>
          </div>

          <div class="flex flex-col sm:col-span-2">
            <label class="block">
              <span class="text-gray-700">Description</span>
              <!-- bug fix: this textarea was never bound, so the description was never saved -->
              <textarea v-model="event.description" rows="2" :class="inputClass"></textarea>
            </label>
          </div>
        </div>

        <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-4">
          <h2 class="text-2xl font-bold">Services Offered at Event</h2>
          <div class="md:col-span-2">
            <p v-if="servicesApi.loading.value" class="text-gray-600">Loading services…</p>
            <p v-else-if="servicesApi.error.value" class="text-red-700">
              {{ servicesApi.error.value }}
              <button type="button" class="ml-2 rounded bg-red-700 px-2 py-1 text-white" @click="servicesApi.execute()">
                Retry
              </button>
            </p>
            <ul v-else-if="activeServices.length" class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <li v-for="service in activeServices" :key="service._id" class="rounded-lg border border-gray-300 p-2 hover:bg-gray-100">
                <label class="flex items-center gap-2">
                  <input v-model="event.services" type="checkbox" :value="service._id" class="rounded border-gray-300 text-indigo-600" />
                  <span class="font-medium">{{ service.name }}</span>
                </label>
              </li>
            </ul>
            <p v-else class="text-gray-600">No Active Services Available</p>
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

        <div class="mt-10">
          <button class="rounded bg-red-700 text-white disabled:opacity-50" type="submit" :disabled="saving">
            {{ saving ? 'Saving…' : 'Add New Event' }}
          </button>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - data() { event, activeServices, openDescriptions } -> reactive(event); services -> useApi(); unused openDescriptions removed
// - setup() { v$ } + validations() -> useVuelidate(rules, { event })
// - async mounted() getServices() -> servicesApi.execute() during setup; activeServices -> computed()
// - methods.handleSubmitForm -> async function; this.$router -> useRouter()
// - bug fix: Description <textarea> had no v-model, so it never saved
// ---------------------------------------------------------------------------
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import useVuelidate from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { useToast } from 'vue-toastification'
import { useApi } from '../composables/useApi'
import { getServices, createEvent } from '../api/api'

const router = useRouter()
const toast = useToast()

const inputClass =
  'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50'

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

// local date as YYYY-MM-DD
const today = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

const validDate = (value) => !value || !isNaN(new Date(value))
const notBeforeToday = (value) => !value || value >= today

const v$ = useVuelidate({ event: { name: { required }, date: { required, validDate, notBeforeToday } } }, { event })

const dateError = computed(() => {
  const d = v$.value.event.date
  if (d.required.$invalid) return 'Event Date is required'
  if (d.validDate.$invalid) return 'Event Date must be a valid date'
  return 'New Event Date cannot be in the past.'
})

// only active services can be added to a new event
const servicesApi = useApi(() => getServices())
const activeServices = computed(() => (servicesApi.data.value || []).filter((s) => s.status === 'Active'))
servicesApi.execute()

const saving = ref(false)
async function handleSubmitForm() {
  if (!(await v$.value.$validate())) {
    toast.error('Please fix the highlighted fields')
    return
  }
  saving.value = true
  try {
    const message = await createEvent(event)
    toast.success(message || 'Event created')
    router.push('/findevents')
  } catch (err) {
    toast.error(err.message)
  } finally {
    saving.value = false
  }
}
</script>
