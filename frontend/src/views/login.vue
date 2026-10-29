<!-- Login page. After a successful login the user goes back to the page they
     originally tried to open (?redirect=...), or the dashboard. -->
<template>
  <main class="px-4">
    <h1 class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700">Welcome</h1>

    <form class="mx-auto mt-10 max-w-sm space-y-6" novalidate @submit.prevent="handleLogin">
      <div>
        <label for="username" class="text-gray-700">
          Username <span class="text-red-600" aria-hidden="true">*</span>
        </label>
        <input
          id="username"
          v-model.trim="username"
          type="text"
          autocomplete="username"
          required
          class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>

      <div>
        <label for="password" class="text-gray-700">
          Password <span class="text-red-600" aria-hidden="true">*</span>
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>

      <p v-if="errorMessage" role="alert" class="rounded bg-red-50 p-3 text-red-800">{{ errorMessage }}</p>

      <div class="flex justify-center">
        <button class="rounded bg-red-700 px-6 text-white disabled:opacity-50" type="submit" :disabled="submitting">
          {{ submitting ? 'Logging in…' : 'Login' }}
        </button>
      </div>
    </form>
  </main>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - data() { username, password } -> ref('') each
// - setup() { store } kept as a top-level const
// - new: useRoute()/useRouter() to honor ?redirect= after login (replaces this.$router)
// ---------------------------------------------------------------------------
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLoggedInUserStore } from '../store/loggedInUser'

const store = useLoggedInUserStore()
const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

// only allow redirects inside this app (blocks //evil.com style open redirects)
function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

async function handleLogin() {
  errorMessage.value = ''
  if (!username.value || !password.value) {
    errorMessage.value = 'Enter your username and password.'
    return
  }
  submitting.value = true
  try {
    await store.login(username.value, password.value)
    router.push(safeRedirect(route.query.redirect))
  } catch (err) {
    errorMessage.value = err?.message || 'Login failed'
    password.value = ''
  } finally {
    submitting.value = false
  }
}
</script>
