// In-browser mock API (Sprint 2 only).
//
// Plugs into Axios as a custom adapter, so the rest of the app makes the same
// calls it will make against the real backend. It follows the API contracts the
// team agreed for Sprint 3 (S1, B1, B2):
//   - no / bad / expired token          -> 401 { error }
//   - viewer calling a mutating route   -> 403 { error }
//   - record from another organization  -> 404 { error }   (tenant isolation)
//   - register twice                    -> 200 { message: 'Already registered' }
//   - deregister someone not registered -> 200 { message: 'Not registered' }
//   - validation problem                -> 400 { error }
//
// Turn it on/off with VITE_USE_MOCKS in frontend/.env.
// Demo helper: run localStorage.setItem('mockOffline', '1') in the browser
// console to simulate the backend being down (remove the key to undo).
import { AxiosError } from 'axios'
import * as seed from './mockData'

const LATENCY_MS = 300
const MOCK_SIGNATURE = 'mock-signature'

// Deep copy so edits during a session don't change the seed module.
const db = {
  orgs: structuredClone(seed.orgs),
  users: structuredClone(seed.users),
  clients: structuredClone(seed.clients),
  events: structuredClone(seed.events),
  services: structuredClone(seed.services)
}

let idCounter = 1000
const newId = () => `f0${String(idCounter++).padStart(22, '0')}`

// ---------- fake JWT (same shape as a real one: header.payload.signature) ----------
const b64url = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function makeToken(user) {
  const now = Math.floor(Date.now() / 1000)
  const payload = { sub: user._id, name: user.name, role: user.role, orgId: user.orgId, iat: now, exp: now + 8 * 60 * 60 }
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(payload)}.${MOCK_SIGNATURE}`
}

function readToken(config) {
  const headers = config.headers || {}
  const header = (typeof headers.get === 'function' && headers.get('Authorization')) ||
    headers.Authorization || headers.authorization
  if (!header || !header.startsWith('Bearer ')) return null
  const [, payloadPart, signature] = header.slice(7).split('.')
  if (signature !== MOCK_SIGNATURE || !payloadPart) return null
  try {
    const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

// ---------- response helpers ----------
class HttpError extends Error {
  constructor(status, body) {
    super(body?.error || body?.message || String(status))
    this.status = status
    this.body = body
  }
}
const fail = (status, error) => { throw new HttpError(status, { error }) }

// requireAuth / requireRole('editor') / withOrg - mirrors the planned backend middleware
function requireAuth(ctx) {
  if (!ctx.user) fail(401, 'Authentication required')
}
function requireEditor(ctx) {
  requireAuth(ctx)
  if (ctx.user.role !== 'editor') fail(403, 'You do not have permission to do that')
}
const inOrg = (ctx, record) => {
  if (!record) return false
  if (Array.isArray(record.orgs)) return record.orgs.includes(ctx.orgId)
  return record.org === ctx.orgId
}
function findInOrg(ctx, list, id, label) {
  const record = list.find((r) => r._id === id)
  if (!inOrg(ctx, record)) fail(404, `${label} not found`)
  return record
}
const orgRows = (ctx, list) => list.filter((r) => inOrg(ctx, r))
const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date)
const contains = (value, term) => String(value || '').toLowerCase().includes(String(term || '').toLowerCase())

function validateClient(body) {
  if (!body?.firstName) fail(400, 'First name is required')
  if (!body?.lastName) fail(400, 'Last name is required')
  if (!/^\d{10}$/.test(body?.phoneNumber?.primary || '')) fail(400, 'Phone number must be exactly 10 digits')
  if (!body?.address?.city) fail(400, 'City is required')
}

// Only copy fields the client is allowed to set (never _id / org from the body).
function pickClient(body) {
  return {
    firstName: body.firstName, middleName: body.middleName || '', lastName: body.lastName, email: body.email || '',
    phoneNumber: { primary: body.phoneNumber?.primary || '', alternate: body.phoneNumber?.alternate || '' },
    address: {
      line1: body.address?.line1 || '', line2: body.address?.line2 || '', city: body.address?.city || '',
      county: body.address?.county || '', zip: body.address?.zip || ''
    }
  }
}
function pickEvent(body) {
  return {
    name: body.name, description: body.description || '', date: new Date(body.date).toISOString(),
    services: Array.isArray(body.services) ? body.services : [],
    address: {
      line1: body.address?.line1 || '', line2: body.address?.line2 || '', city: body.address?.city || '',
      county: body.address?.county || '', zip: body.address?.zip || ''
    }
  }
}

// ---------- routes ----------
// Each route: [method, pattern, handler(ctx, params)]
const routes = [
  ['post', '/users/login', (ctx) => {
    const { username, password } = ctx.body || {}
    const user = db.users.find((u) => u.username === username && u.password === password)
    // same message for bad username and bad password (S1)
    if (!user) fail(400, 'Invalid username or password')
    return { token: makeToken(user) }
  }],

  ['get', '/org', (ctx) => db.orgs.find((o) => o._id === ctx.orgId).name],

  // ----- clients -----
  ['get', '/clients', (ctx) => { requireAuth(ctx); return orgRows(ctx, db.clients) }],
  ['get', '/clients/byzip', (ctx) => {
    const counts = {}
    orgRows(ctx, db.clients).forEach((c) => {
      if (c.address?.zip) counts[c.address.zip] = (counts[c.address.zip] || 0) + 1
    })
    return Object.entries(counts).map(([zip, count]) => ({ _id: zip, count }))
  }],
  ['get', '/clients/search', (ctx) => {
    requireAuth(ctx)
    const q = ctx.query
    const rows = orgRows(ctx, db.clients)
    if (q.searchBy === 'name') {
      return rows.filter((c) => contains(c.firstName, q.firstName) && contains(c.lastName, q.lastName))
    }
    if (q.searchBy === 'number') return rows.filter((c) => contains(c.phoneNumber.primary, q.phoneNumber))
    fail(400, 'Invalid search type')
  }],
  ['get', '/clients/id/:id', (ctx, p) => { requireAuth(ctx); return findInOrg(ctx, db.clients, p.id, 'Client') }],
  ['post', '/clients', (ctx) => {
    requireEditor(ctx)
    validateClient(ctx.body)
    db.clients.push({ _id: newId(), ...pickClient(ctx.body), orgs: [ctx.orgId] })
    return 'New client created successfully'
  }],
  ['put', '/clients/update/:id', (ctx, p) => {
    requireEditor(ctx)
    const client = findInOrg(ctx, db.clients, p.id, 'Client')
    validateClient(ctx.body)
    Object.assign(client, pickClient(ctx.body))
    return 'Client updated successfully'
  }],
  ['delete', '/clients/:id', (ctx, p) => {
    requireEditor(ctx)
    const client = findInOrg(ctx, db.clients, p.id, 'Client')
    if (db.events.some((e) => e.attendees.includes(client._id))) {
      fail(400, "Client is signed up for events and can't be deleted")
    }
    db.clients = db.clients.filter((c) => c._id !== client._id)
    return 'Client deleted successfully'
  }],

  // ----- events -----
  ['get', '/events', (ctx) => { requireAuth(ctx); return orgRows(ctx, db.events).sort(byDateDesc) }],
  ['get', '/events/attendance', (ctx) => {
    const twoMonthsAgo = new Date()
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
    return orgRows(ctx, db.events)
      .filter((e) => new Date(e.date) >= twoMonthsAgo && new Date(e.date) <= new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }],
  ['get', '/events/search', (ctx) => {
    requireAuth(ctx)
    const q = ctx.query
    const rows = orgRows(ctx, db.events)
    if (q.searchBy === 'name') return rows.filter((e) => contains(e.name, q.name))
    if (q.searchBy === 'date') return rows.filter((e) => e.date.slice(0, 10) === q.eventDate)
    fail(400, 'Invalid search type')
  }],
  ['get', '/events/id/:id', (ctx, p) => { requireAuth(ctx); return findInOrg(ctx, db.events, p.id, 'Event') }],
  ['get', '/events/client/:id/not-registered', (ctx, p) => {
    requireAuth(ctx)
    findInOrg(ctx, db.clients, p.id, 'Client')
    return orgRows(ctx, db.events).filter((e) => !e.attendees.includes(p.id))
  }],
  ['get', '/events/client/:id', (ctx, p) => {
    requireAuth(ctx)
    findInOrg(ctx, db.clients, p.id, 'Client')
    return orgRows(ctx, db.events).filter((e) => e.attendees.includes(p.id))
  }],
  ['get', '/events/attendees/:id', (ctx, p) => {
    requireAuth(ctx)
    const event = findInOrg(ctx, db.events, p.id, 'Event')
    return orgRows(ctx, db.clients).filter((c) => event.attendees.includes(c._id))
  }],
  ['get', '/events/service/:id', (ctx, p) => {
    requireAuth(ctx)
    findInOrg(ctx, db.services, p.id, 'Service')
    return orgRows(ctx, db.events).filter((e) => e.services.includes(p.id))
  }],
  ['post', '/events', (ctx) => {
    requireEditor(ctx)
    if (!ctx.body?.name) fail(400, 'Event name is required')
    if (!ctx.body?.date || isNaN(new Date(ctx.body.date))) fail(400, 'A valid event date is required')
    db.events.push({ _id: newId(), org: ctx.orgId, attendees: [], ...pickEvent(ctx.body) })
    return 'New event created successfully'
  }],
  ['put', '/events/update/:id', (ctx, p) => {
    requireEditor(ctx)
    const event = findInOrg(ctx, db.events, p.id, 'Event')
    if (!ctx.body?.name) fail(400, 'Event name is required')
    if (!ctx.body?.date || isNaN(new Date(ctx.body.date))) fail(400, 'A valid event date is required')
    Object.assign(event, pickEvent(ctx.body))
    return 'Event updated successfully'
  }],
  // B1: registration rules
  ['put', '/events/register', (ctx) => {
    requireEditor(ctx)
    const event = findInOrg(ctx, db.events, ctx.query.event, 'Event')
    const client = findInOrg(ctx, db.clients, ctx.query.client, 'Client')
    if (event.attendees.includes(client._id)) return { message: 'Already registered' }
    event.attendees.push(client._id)
    return { message: 'Client added to event', eventId: event._id, clientId: client._id }
  }],
  ['put', '/events/deregister', (ctx) => {
    requireEditor(ctx)
    const event = findInOrg(ctx, db.events, ctx.query.event, 'Event')
    const client = findInOrg(ctx, db.clients, ctx.query.client, 'Client')
    if (!event.attendees.includes(client._id)) return { message: 'Not registered' }
    event.attendees = event.attendees.filter((id) => id !== client._id)
    return { message: 'Client removed from event', eventId: event._id, clientId: client._id }
  }],
  ['delete', '/events/:id', (ctx, p) => {
    requireEditor(ctx)
    const event = findInOrg(ctx, db.events, p.id, 'Event')
    if (event.attendees.length) fail(400, "Event has attendees and can't be deleted")
    db.events = db.events.filter((e) => e._id !== event._id)
    return 'Event deleted successfully'
  }],

  // ----- services -----
  ['get', '/services', (ctx) => { requireAuth(ctx); return orgRows(ctx, db.services) }],
  ['get', '/services/search', (ctx) => {
    requireAuth(ctx)
    const q = ctx.query
    const rows = orgRows(ctx, db.services)
    if (q.searchBy === 'name') return rows.filter((s) => contains(s.name, q.name))
    if (q.searchBy === 'description') return rows.filter((s) => contains(s.description, q.description))
    fail(400, 'Invalid search type')
  }],
  ['get', '/services/id/:id', (ctx, p) => { requireAuth(ctx); return findInOrg(ctx, db.services, p.id, 'Service') }],
  ['post', '/services', (ctx) => {
    requireEditor(ctx)
    if (!ctx.body?.name) fail(400, 'Service name is required')
    db.services.push({
      _id: newId(), org: ctx.orgId, name: ctx.body.name,
      description: ctx.body.description || '', status: ctx.body.status === 'Inactive' ? 'Inactive' : 'Active'
    })
    return 'New service created successfully'
  }],
  ['put', '/services/update/:id', (ctx, p) => {
    requireEditor(ctx)
    const service = findInOrg(ctx, db.services, p.id, 'Service')
    if (!ctx.body?.name) fail(400, 'Service name is required')
    Object.assign(service, {
      name: ctx.body.name, description: ctx.body.description || '',
      status: ctx.body.status === 'Inactive' ? 'Inactive' : 'Active'
    })
    return 'Service updated successfully'
  }],
  ['delete', '/services/:id', (ctx, p) => {
    requireEditor(ctx)
    const service = findInOrg(ctx, db.services, p.id, 'Service')
    if (db.events.some((e) => inOrg(ctx, e) && e.services.includes(service._id))) {
      fail(400, "Service is used by events and can't be deleted")
    }
    db.services = db.services.filter((s) => s._id !== service._id)
    return 'Service deleted successfully'
  }]
]

// Turn '/clients/id/:id' into a regex once.
const compiled = routes.map(([method, pattern, handler]) => {
  const keys = []
  const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)' }) + '/?$')
  return { method, regex, keys, handler }
})

function match(method, path) {
  for (const r of compiled) {
    if (r.method !== method) continue
    const m = path.match(r.regex)
    if (m) {
      const params = {}
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]) })
      return { handler: r.handler, params }
    }
  }
  return null
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function isOffline() {
  try {
    return localStorage.getItem('mockOffline') === '1'
  } catch {
    return false
  }
}

// Axios adapter: (config) => Promise<response>
export async function mockAdapter(config) {
  await delay(LATENCY_MS)

  const request = { mock: true }
  if (isOffline()) {
    throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request)
  }

  const url = new URL(config.url || '/', 'http://mock.local')
  const path = '/' + url.pathname.replace(/^\/+/, '').replace(/\/+$/, '')
  const query = { ...Object.fromEntries(url.searchParams), ...(config.params || {}) }
  let body = config.data
  if (typeof body === 'string' && body) {
    try { body = JSON.parse(body) } catch { /* leave as string */ }
  }

  const user = readToken(config)
  const ctx = { user, orgId: user?.orgId || seed.ORG_A, query, body }
  const method = (config.method || 'get').toLowerCase()

  const respond = (status, data) => ({ data, status, statusText: String(status), headers: {}, config, request })

  try {
    const found = match(method, path)
    if (!found) fail(404, `No mock route for ${method.toUpperCase()} ${path}`)
    // structuredClone so components can't mutate the mock "database" by reference
    const data = found.handler(ctx, found.params)
    return respond(200, data === undefined ? null : structuredClone(data))
  } catch (err) {
    if (err instanceof HttpError) {
      const response = respond(err.status, err.body)
      throw new AxiosError(err.message, AxiosError.ERR_BAD_REQUEST, config, request, response)
    }
    const response = respond(500, { error: 'Something went wrong on the server' })
    throw new AxiosError('Server error', AxiosError.ERR_BAD_RESPONSE, config, request, response)
  }
}

// Called from api.js when VITE_USE_MOCKS=true
export function installMockAdapter(axiosInstance) {
  axiosInstance.defaults.adapter = mockAdapter
  console.info('[mock] Using in-browser mock API (VITE_USE_MOCKS=true)')
}
