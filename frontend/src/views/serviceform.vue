<!-- Create Service (editor only - guarded by the router). -->
<template>
  <main>
    <h1 class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700">Create Service</h1>
    <div class="px-4 py-10 md:px-10 md:py-20">
      <form novalidate @submit.prevent="handleSubmitForm">
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
            <legend class="text-gray-700">Service Status <span class="text-red-600" aria-hidden="true">*</span></legend>
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

        <div class="mt-10">
          <button class="rounded bg-red-700 text-white disabled:opacity-50" type="submit" :disabled="saving">
            {{ saving ? 'Saving…' : 'Add Service' }}
          </button>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - data() { service } -> reactive({...})
// - setup() { v$ } + validations() -> useVuelidate(rules, { service })
// - methods.handleSubmitForm -> async function; this.$router -> useRouter()
// ---------------------------------------------------------------------------
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import useVuelidate from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { useToast } from 'vue-toastification'
import { createService } from '../api/api'

const router = useRouter()
const toast = useToast()

const inputClass =
  'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50'

const service = reactive({ name: '', description: '', status: 'Active' })
const v$ = useVuelidate({ service: { name: { required } } }, { service })

const saving = ref(false)
async function handleSubmitForm() {
  if (!(await v$.value.$validate())) return
  saving.value = true
  try {
    const message = await createService(service)
    toast.success(message || 'Service created')
    router.push('/findservice')
  } catch (err) {
    toast.error(err.message)
  } finally {
    saving.value = false
  }
}
</script>
