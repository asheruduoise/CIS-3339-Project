// All HTTP calls to the backend live here.
//
// F2: error handling is centralized. One response interceptor turns every
// failed request into an Error with a short, readable message, so components
// never need their own try/catch translation logic. They just show err.message.
//
// The auth token lives in localStorage. A request interceptor attaches it to
// every call, so refreshing the page automatically restores the Authorization
// header (F4).
import axios from 'axios'
import { installMockAdapter } from '../mock/mockAdapter'

export const TOKEN_KEY = 'authToken'
// Event fired on a 401 so the app can clear the Pinia session and go to /login
// (listened for in main.js). Using an event avoids a circular import with the store.
export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_ROOT_API,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
})

if (import.meta.env.VITE_USE_MOCKS === 'true') {
  installMockAdapter(apiClient)
}

// ---------- token helpers ----------
export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthHeader(token) {
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
}

export function removeAuthHeader() {
  delete apiClient.defaults.headers.common.Authorization
}

function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable - nothing to clear */
  }
  removeAuthHeader()
}

// ---------- error -> message ----------
export class ApiError extends Error {
  constructor(message, status = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// The one place that decides what message the user sees for a failed request.
export function toErrorMessage(error) {
  if (axios.isCancel(error)) return 'Request was cancelled'
  if (!error?.response) return 'Unable to reach the server'

  const { status, data } = error.response
  if (typeof data === 'string') {
    const text = data.trim()
    // ignore HTML error pages / stack traces, keep short plain-text messages
    if (text && !text.startsWith('<') && text.length <= 200) return text
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.errors) && data.errors[0]?.msg) return data.errors[0].msg
    if (typeof data.error === 'string' && data.error) return data.error
    if (typeof data.message === 'string' && data.message) return data.message
  }

  if (status === 401) return 'Your session has expired. Please log in again.'
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 404) return 'The record was not found.'
  if (status >= 500) return 'The server had a problem. Please try again.'
  return `Request failed (${status})`
}

// attach the saved token to every request
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status ?? null
    const isLoginCall = String(error?.config?.url || '').includes('/users/login')

    if (status === 401 && !isLoginCall) {
      clearStoredToken()
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(new ApiError(toErrorMessage(error), status))
  }
)

const data = (response) => response.data

// ---------- auth ----------
export async function loginUser(username, password) {
  const { token } = await apiClient.post('/users/login', { username, password }).then(data)
  localStorage.setItem(TOKEN_KEY, token)
  setAuthHeader(token)
  return token
}

export function logoutUser() {
  clearStoredToken()
}

// ---------- org ----------
export const getOrgName = () => apiClient.get('/org').then(data)

// ---------- events ----------
export const getEvents = () => apiClient.get('/events').then(data)
export const getEventById = (id) => apiClient.get(`/events/id/${id}`).then(data)

export const searchEvents = (query) => {
  const params = { searchBy: query.searchBy }
  if (query.searchBy === 'name') params.name = query.name || ''
  if (query.searchBy === 'date') params.eventDate = query.eventDate || ''
  return apiClient.get('/events/search', { params }).then(data)
}

export const getClientEvents = (id) => apiClient.get(`/events/client/${id}`).then(data)
export const getNonClientEvents = (id) => apiClient.get(`/events/client/${id}/not-registered`).then(data)
export const getEventAttendees = (id) => apiClient.get(`/events/attendees/${id}`).then(data)
export const getEventsByServiceId = (id) => apiClient.get(`/events/service/${id}`).then(data)
export const createEvent = (eventData) => apiClient.post('/events', eventData).then(data)
export const updateEvent = (id, eventData) => apiClient.put(`/events/update/${id}`, eventData).then(data)

export const registerAttendee = (eventId, clientId) =>
  apiClient.put('/events/register', {}, { params: { event: eventId, client: clientId } }).then(data)

export const deregisterAttendee = (eventId, clientId) =>
  apiClient.put('/events/deregister', {}, { params: { event: eventId, client: clientId } }).then(data)

export const deleteEvent = (id) => apiClient.delete(`/events/${id}`).then(data)
export const getAttendance = () => apiClient.get('/events/attendance').then(data)

// ---------- clients ----------
export const getClients = () => apiClient.get('/clients').then(data)
export const getClientById = (id) => apiClient.get(`/clients/id/${id}`).then(data)

export const searchClients = (query) => {
  const params = { searchBy: query.searchBy }
  if (query.searchBy === 'name') {
    params.firstName = query.firstName || ''
    params.lastName = query.lastName || ''
  } else if (query.searchBy === 'number') {
    params.phoneNumber = query.phoneNumber || ''
  }
  return apiClient.get('/clients/search', { params }).then(data)
}

export const createClient = (newClient) => apiClient.post('/clients', newClient).then(data)
export const updateClient = (id, updatedClient) => apiClient.put(`/clients/update/${id}`, updatedClient).then(data)
export const deleteClientbyId = (id) => apiClient.delete(`/clients/${id}`).then(data)
export const getClientsByZipCode = () => apiClient.get('/clients/byzip').then(data)

// ---------- services ----------
export const getServices = () => apiClient.get('/services').then(data)
export const getServiceById = (id) => apiClient.get(`/services/id/${id}`).then(data)

export const searchServices = (query) => {
  const params = { searchBy: query.searchBy }
  if (query.searchBy === 'name') params.name = query.name || ''
  if (query.searchBy === 'description') params.description = query.description || ''
  return apiClient.get('/services/search', { params }).then(data)
}

export const createService = (newService) => apiClient.post('/services', newService).then(data)
export const updateService = (id, updatedService) => apiClient.put(`/services/update/${id}`, updatedService).then(data)
export const deleteService = (id) => apiClient.delete(`/services/${id}`).then(data)
