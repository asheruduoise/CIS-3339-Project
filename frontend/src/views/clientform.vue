<!-- Client intake form (editor only - guarded by the router). -->
<template>
  <main>
    <h1 class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700">Client Intake Form</h1>
    <div class="px-4 py-10 md:px-10 md:py-20">
      <form novalidate @submit.prevent="submitForm">
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
              <span class="text-red-600" aria-hidden="true">*</span>
              <input v-model.trim="client.email" type="email" :class="inputClass" required />
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

          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Address Line 1</span>
              <input v-model.trim="client.address.line1" type="text" :class="inputClass" />
            </label>
          </div>

          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Address Line 2</span>
              <input v-model.trim="client.address.line2" type="text" :class="inputClass" />
            </label>
          </div>

          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">City</span>
              <span class="text-red-600" aria-hidden="true">*</span>
              <input v-model.trim="client.address.city" type="text" :class="inputClass" required />
            </label>
            <span v-if="v$.client.address.city.$error" class="text-red-600">City is required</span>
          </div>

          <div></div>

          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">County</span>
              <input v-model.trim="client.address.county" type="text" :class="inputClass" />
            </label>
          </div>

          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Zip Code</span>
              <input v-model.trim="client.address.zip" type="text" inputmode="numeric" :class="inputClass" />
            </label>
          </div>

          <div></div>

          <div class="mt-10 flex">
            <button class="rounded bg-red-700 text-white disabled:opacity-50" type="submit" :disabled="saving">
              {{ saving ? 'Saving…' : 'Add Client' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - data() { client } -> reactive({...}) (nested object, so reactive instead of ref)
// - validations() option + useVuelidate() -> useVuelidate(rules, { client })
// - methods.submitForm -> plain async function; this.v$ / this.$router -> v$.value / useRouter()
// - phone error v-else-if chain moved into a computed (phoneError)
// ---------------------------------------------------------------------------
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import useVuelidate from '@vuelidate/core'
import { required, email, numeric, minLength, maxLength } from '@vuelidate/validators'
import { useToast } from 'vue-toastification'
import { createClient } from '../api/api'

const router = useRouter()
const toast = useToast()

const inputClass =
  'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50'

const client = reactive({
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phoneNumber: { primary: '', alternate: '' },
  address: { line1: '', line2: '', city: '', county: '', zip: '' }
})

const rules = {
  client: {
    firstName: { required },
    lastName: { required },
    email: { required, email },
    phoneNumber: {
      primary: { required, numeric, minLength: minLength(10), maxLength: maxLength(10) }
    },
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

const saving = ref(false)

async function submitForm() {
  const valid = await v$.value.$validate()
  if (!valid) return

  saving.value = true
  try {
    const message = await createClient(client)
    toast.success(message || 'Client created')
    router.push('/findclient')
  } catch (err) {
    // err.message is already readable (set by the API interceptor)
    toast.error(err.message)
  } finally {
    saving.value = false
  }
}
</script>
