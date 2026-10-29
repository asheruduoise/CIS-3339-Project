import { createApp, markRaw } from 'vue'
import { createPinia } from 'pinia'
import Toast, { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import './index.css'
import App from './App.vue'
import router from './router'
import { useLoggedInUserStore } from './store/loggedInUser'

const app = createApp(App)

const pinia = createPinia()
// lets store actions navigate with this.$router
pinia.use(({ store }) => {
  store.$router = markRaw(router)
})
app.use(pinia)
app.use(Toast, { position: 'bottom-right' })

// F4: restore the session BEFORE the router runs its first guard, so a
// refresh on a protected page doesn't bounce a logged-in user to /login.
const user = useLoggedInUserStore(pinia)
user.restoreSession()

// When any API call returns 401, api.js clears the token and fires this event.
// Here we clear the Pinia state and send the user to /login.
window.addEventListener('auth:unauthorized', () => {
  const wasLoggedIn = user.isLoggedIn
  user.clearSession()
  const current = router.currentRoute.value
  if (current.name !== 'login') {
    if (wasLoggedIn) useToast().warning('Your session has expired. Please log in again.')
    router.push({ name: 'login', query: { redirect: current.fullPath } })
  }
})

app.use(router)
app.mount('#app')
