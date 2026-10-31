<!-- Service details: view/update/delete a service and see the events that use it.
     Viewers see a read-only page. -->
<template>
  <main>
    <h1 class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700">Service Details</h1>

    <div class="px-4 py-10 md:px-10">
      <AsyncState
        :loading="loading"
        :error="error"
        loading-text="Loading service…"
        error-title="Couldn't load this service"
        @retry="load"
      >
        <p v-if="!user.isEditor" class="mb-6 rounded bg-yellow-50 p-3 text-yellow-900">
          You have view-only access. Only editors can change or delete services.
        </p>

        <form novalidate @submit.prevent="submitUpdate">
          <fieldset :disabled="!user.isEditor">
            <legend class="sr-only">Service information</legend>
            <div class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-4">
              <h2 class="text-2xl font-bold">Service Details</h2>

              <div class="flex flex-col">
                <label class="block">
                  <span class="text-gray-700">Service Name</span>
                  <span class="text-red-600" aria-hidden="true">*</span>
                  <input v-model.trim="service.name" type="text" :class="inputClass" required />
                </label>
                <span v-if="v$.service.name.$error" class="text-red-600">Service Name is required</span>
              </div>

              <div class="flex flex-col">
                <label class="block">
                  <span class="text-gray-700">Description</span>
                  <textarea v-model="service.description" :class="inputClass"></textarea>
                </label>
              </div>

              <fieldset class="flex flex-col">
                <legend class="text-gray-700">Service Status</legend>
                <div class="mt-1">
                  <label class="inline-flex items-center">
                    <input v-model="service.status" type="radio" class="form-radio" value="Active" />
                    <span class="ml-2">Active</span>
                  </label>
                  <label class="ml-6 inline-flex items-center">
                    <input v-model="service.status" type="radio" class="form-radio" value="Inactive" />
                    <span class="ml-2">Inactive</span>
                  </label>
                </div>
              </fieldset>
            </div>
          </fieldset>

          <div class="mt-10 flex flex-wrap gap-4">
            <template v-if="user.isEditor">
              <button type="submit" class="rounded bg-green-700 text-white disabled:opacity-50" :disabled="saving">
                {{ saving ? 'Saving…' : 'Update Service' }}
              </button>
              <button type="button" class="rounded bg-red-700 text-white" @click="askDelete">Delete Service</button>
            </template>
            <button type="button" class="rounded border border-red-700 bg-white text-red-700" @click="router.back()">
              Go back
            </button>
          </div>
        </form>

        <hr class="my-10" />

        <section class="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-4">
          <div>
            <h2 class="text-2xl font-bold">Events Using This Service</h2>
            <p class="italic">Click a row (or press Enter) to view event details</p>
          </div>
          <div class="md:col-span-3">
            <DataTable
              :columns="eventColumns"
              :rows="events"
              clickable
              caption="Events that offer this service"
              empty-text="No events offer this service yet."
              @row-click="(e) => router.push({ name: 'eventdetails', params: { id: e._id } })"
            />
          </div>
        </section>
      </AsyncState>
    </div>

    <ConfirmModal
      :open="confirmOpen"
      title="Delete this service?"
      :message="`“${service.name}” will be permanently deleted.`"
      confirm-text="Delete Service"
      :busy="deleting"
      @confirm="submitDelete"
      @cancel="confirmOpen = false"
    />
  </main>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - data() { service, events, hoverId } -> reactive(service) + ref(events)
// - setup() { v$, user } + validations() -> useVuelidate(rules, { service }) and the store at top level
// - async mounted() + this.$route.params.id -> useApi() + watch(serviceId, load, { immediate: true })
// - methods.formatDate (copy of 4) -> shared utils/formatDate.js; methods -> functions
// - events <table> -> DataTable; delete now asks via ConfirmModal
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
import { getServiceById, getEventsByServiceId, updateService, deleteService } from '../api/api'
import { formatDate } from '../utils/formatDate'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const user = useLoggedInUserStore()

const inputClass =
  'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-100'

const service = reactive({ name: '', description: '', status: 'Active' })
const events = ref([])
const v$ = useVuelidate({ service: { name: { required } } }, { service })

const serviceId = computed(() => route.params.id)

const { loading, error, execute } = useApi((id) => Promise.all([getServiceById(id), getEventsByServiceId(id)]))

async function load() {
  const result = await execute(serviceId.value)
  if (!result) return
  const [serviceData, eventData] = result
  Object.assign(service, {
    name: serviceData.name || '',
    description: serviceData.description || '',
    status: serviceData.status || 'Active'
  })
  events.value = eventData
  v$.value.$reset()
}
watch(serviceId, (id) => id && load(), { immediate: true })

const eventColumns = [
  { label: 'Event Name', field: 'name' },
  { label: 'Event Date', field: 'date', render: (e) => formatDate(e.date), sortValue: (e) => new Date(e.date).getTime() },
  { label: 'Event Address', field: 'address.line1' }
]

// ---- update ----
const saving = ref(false)
async function submitUpdate() {
  if (!(await v$.value.$validate())) return
  saving.value = true
  try {
    const message = await updateService(serviceId.value, service)
    toast.success(message || 'Service updated')
    router.push('/findservice')
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
  if (events.value.length) {
    toast.info("This service can't be deleted while events use it.")
    return
  }
  confirmOpen.value = true
}
async function submitDelete() {
  deleting.value = true
  try {
    const message = await deleteService(serviceId.value)
    confirmOpen.value = false
    toast.success(message || 'Service deleted')
    router.push('/findservice')
  } catch (err) {
    toast.error(err.message)
  } finally {
    deleting.value = false
  }
}
</script>
