// Routes + one global navigation guard (F4, S2, S3).
//   meta.requiresAuth   -> must be logged in, otherwise go to /login
//   meta.requiresEditor -> must be an editor, otherwise go to the dashboard
// Unknown URLs show the 404 page.
import { createRouter, createWebHistory } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useLoggedInUserStore } from '../store/loggedInUser'

const toast = useToast()

const routes = [
  { path: '/', name: 'home', component: () => import('../views/home.vue') },
  { path: '/login', name: 'login', component: () => import('../views/login.vue') },

  // editor-only pages
  {
    path: '/clientform',
    name: 'clientform',
    meta: { requiresAuth: true, requiresEditor: true },
    component: () => import('../views/clientform.vue')
  },
  {
    path: '/eventform',
    name: 'eventform',
    meta: { requiresAuth: true, requiresEditor: true },
    component: () => import('../views/eventform.vue')
  },
  {
    path: '/serviceform',
    name: 'serviceform',
    meta: { requiresAuth: true, requiresEditor: true },
    component: () => import('../views/serviceform.vue')
  },

  // any logged-in user (viewers see details read-only)
  {
    path: '/findclient',
    name: 'findclient',
    meta: { requiresAuth: true },
    component: () => import('../views/findclient.vue')
  },
  {
    path: '/clientdetails/:id',
    name: 'clientdetails',
    meta: { requiresAuth: true },
    component: () => import('../views/clientdetails.vue')
  },
  {
    path: '/findevents',
    name: 'findevents',
    meta: { requiresAuth: true },
    component: () => import('../views/findevents.vue')
  },
  {
    path: '/eventdetails/:id',
    name: 'eventdetails',
    meta: { requiresAuth: true },
    // file name is eventDetails.vue - case matters on Linux/macOS build servers
    component: () => import('../views/eventDetails.vue')
  },
  {
    path: '/findservice',
    name: 'findservice',
    meta: { requiresAuth: true },
    component: () => import('../views/findservice.vue')
  },
  {
    path: '/servicedetails/:id',
    name: 'servicedetails',
    meta: { requiresAuth: true },
    component: () => import('../views/servicedetails.vue')
  },

  // 404 catch-all - must stay last
  { path: '/:pathMatch(.*)*', name: 'notfound', component: () => import('../views/NotFound.vue') }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to) => {
  const user = useLoggedInUserStore()
  user.ensureValidSession() // logs out if the token expired while the app was open

  if (to.meta.requiresAuth && !user.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresEditor && !user.isEditor) {
    toast.warning('Only editors can open that page.')
    return { name: 'home' }
  }
  if (to.name === 'login' && user.isLoggedIn) {
    return { name: 'home' }
  }
  return true
})

export default router
