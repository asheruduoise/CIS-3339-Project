// Pinia store for the logged-in user (F4 + S1 frontend side).
//
// - restoreSession(): on startup, reads the saved JWT. A missing, corrupted,
//   expired, or unknown-role token is cleared and the user is logged out.
// - Roles fail CLOSED: only 'editor' gets editor access. A missing or unknown
//   role is never treated as an editor.
// - logout() clears both the stored token and this store's state.
import { defineStore } from 'pinia'
import { useToast } from 'vue-toastification'
import jwt_decode from 'jwt-decode'
import { loginUser, logoutUser } from '../api/api'

const TOKEN_KEY = 'authToken'
const KNOWN_ROLES = ['editor', 'viewer']

const toast = useToast()

// Returns the token payload if the token is usable, otherwise null.
export function decodeValidToken(token) {
  if (!token || typeof token !== 'string') return null
  try {
    const payload = jwt_decode(token)
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null
    if (!KNOWN_ROLES.includes(payload.role)) return null
    return payload
  } catch {
    return null // corrupted / not a JWT
  }
}

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

const emptyState = () => ({
  name: '',
  role: '',
  orgId: '',
  expiresAt: 0,
  isLoggedIn: false
})

export const useLoggedInUserStore = defineStore('loggedInUser', {
  state: emptyState,

  getters: {
    isEditor: (state) => state.isLoggedIn && state.role === 'editor',
    isViewer: (state) => state.isLoggedIn && state.role === 'viewer'
  },

  actions: {
    applyToken(payload) {
      this.$patch({
        name: payload.name || '',
        role: payload.role,
        orgId: payload.orgId || '',
        expiresAt: payload.exp * 1000,
        isLoggedIn: true
      })
    },

    // Called once in main.js before the router starts.
    restoreSession() {
      const token = readStoredToken()
      const payload = decodeValidToken(token)
      if (payload) {
        this.applyToken(payload)
        return true
      }
      if (token) logoutUser() // bad or expired token: remove it
      this.$patch(emptyState())
      return false
    },

    // Called by the router guard before every navigation.
    ensureValidSession() {
      if (this.isLoggedIn && this.expiresAt <= Date.now()) {
        logoutUser()
        this.$patch(emptyState())
        toast.info('Your session has expired. Please log in again.')
      }
      return this.isLoggedIn
    },

    // Returns true on success so the login page can redirect.
    async login(username, password) {
      const token = await loginUser(username, password) // throws with a readable message
      const payload = decodeValidToken(token)
      if (!payload) {
        logoutUser()
        this.$patch(emptyState())
        throw new Error('Your account does not have a valid role. Contact an administrator.')
      }
      this.applyToken(payload)
      toast.success('Login successful!')
      return true
    },

    // Clears state only (used when the API reports 401).
    clearSession() {
      logoutUser()
      this.$patch(emptyState())
    },

    logout() {
      this.clearSession()
      this.$router.push('/')
      toast.info('You have been logged out.')
    }
  }
})
