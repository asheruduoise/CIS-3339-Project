<!-- App shell: navigation sidebar + organization header + page content. -->
<template>
  <a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2 focus:text-red-800"
  >
    Skip to main content
  </a>
  <div class="flex min-h-screen flex-col md:flex-row">
    <header id="_container" class="md:min-h-screen md:w-64 md:shrink-0">
      <section class="text-center">
        <img class="m-auto h-24 w-24" :src="logoUrl" alt="Data Platform logo" />
      </section>

      <nav class="mt-6 md:mt-10" aria-label="Main navigation">
        <ul class="flex flex-row flex-wrap gap-4 md:flex-col">
          <li>
            <router-link to="/" class="nav-link">
              <span class="material-icons" aria-hidden="true">dashboard</span>
              Dashboard
            </router-link>
          </li>

          <li v-if="!user.isLoggedIn">
            <router-link to="/login" class="nav-link">
              <span class="material-icons" aria-hidden="true">login</span>
              Login
            </router-link>
          </li>

          <template v-if="user.isEditor">
            <li>
              <router-link to="/clientform" class="nav-link">
                <span class="material-icons" aria-hidden="true">people</span>
                Client Intake Form
              </router-link>
            </li>
            <li>
              <router-link to="/eventform" class="nav-link">
                <span class="material-icons" aria-hidden="true">event</span>
                Create Event
              </router-link>
            </li>
            <li>
              <router-link to="/serviceform" class="nav-link">
                <span class="material-icons" aria-hidden="true">volunteer_activism</span>
                Create Service
              </router-link>
            </li>
          </template>

          <template v-if="user.isLoggedIn">
            <li>
              <router-link to="/findclient" class="nav-link">
                <span class="material-icons" aria-hidden="true">search</span>
                Find Client
              </router-link>
            </li>
            <li>
              <router-link to="/findevents" class="nav-link">
                <span class="material-icons" aria-hidden="true">search</span>
                Find Event
              </router-link>
            </li>
            <li>
              <router-link to="/findservice" class="nav-link">
                <span class="material-icons" aria-hidden="true">search</span>
                Find Service
              </router-link>
            </li>
            <li>
              <button type="button" class="nav-link w-full" @click="user.logout()">
                <span class="material-icons" aria-hidden="true">logout</span>
                Logout
              </button>
            </li>
          </template>
        </ul>
      </nav>

      <p v-if="user.isLoggedIn" class="mt-8 text-sm opacity-90">
        Signed in as <strong>{{ user.name || 'user' }}</strong>
        <span class="ml-1 rounded bg-white/20 px-2 py-0.5 text-xs uppercase">{{ user.role }}</span>
      </p>
    </header>

    <div class="min-w-0 grow">
      <section
        class="flex h-24 items-center justify-end"
        style="background: linear-gradient(250deg, #c8102e 70%, #efecec 50.6%)"
      >
        <p class="mr-6 text-2xl text-white md:mr-20 md:text-3xl">{{ orgName }}</p>
      </section>
      <div id="main-content" tabindex="-1">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - data() { orgName } -> const orgName = ref('Data Platform')
// - async created() -> onMounted(); the broken catch { throw (error) } (undefined var) now logs a warning
// - setup() { return { user } } -> const user = useLoggedInUserStore() (auto-exposed to template)
// - methods.logout() used dead Vuex this.$store.dispatch -> removed; Logout button calls the Pinia action
// - img src '@\assets\...' (Windows-only path) -> imported logoUrl module
// ---------------------------------------------------------------------------
import { onMounted, ref } from 'vue'
import { useLoggedInUserStore } from './store/loggedInUser'
import { getOrgName } from './api/api'
// import the logo as a module so the path works on every OS and in the build
import logoUrl from './assets/DanPersona.svg'

const user = useLoggedInUserStore()
const orgName = ref('Data Platform')

onMounted(async () => {
  try {
    orgName.value = await getOrgName()
  } catch (err) {
    // the header just keeps the default name; log the real reason for debugging
    console.warn('Could not load organization name:', err?.message)
  }
})
</script>

<style scoped>
#_container {
  background-color: #c8102e;
  color: white;
  padding: 18px;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  text-align: left;
}
.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.15);
}
.nav-link:focus-visible {
  outline: 3px solid white;
  outline-offset: 2px;
}
.router-link-exact-active {
  background-color: rgba(255, 255, 255, 0.25);
  font-weight: 700;
}
</style>
