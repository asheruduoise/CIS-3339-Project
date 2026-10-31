// Sample data for the in-browser mock API (Sprint 2 only).
// Two organizations so tenant isolation can be demonstrated:
//   ORG_A = the org this frontend is "configured" for (the logged-in user's org)
//   ORG_B = another org whose records must never be visible (mock returns 404)
// Each list has 15+ rows for org A so sorting and pagination can be tested.

export const ORG_A = '64a000000000000000000001'
export const ORG_B = '64b000000000000000000002'

export const orgs = [
  { _id: ORG_A, name: 'Community Health Partners' },
  { _id: ORG_B, name: 'Other Organization' }
]

// Demo accounts that match the course spec (user/user viewer, admin/admin editor).
export const users = [
  { _id: 'u-viewer', username: 'user', password: 'user', name: 'Demo Viewer', role: 'viewer', orgId: ORG_A },
  { _id: 'u-editor', username: 'admin', password: 'admin', name: 'Demo Editor', role: 'editor', orgId: ORG_A }
]

// Small helper so ids look like Mongo ObjectIds (24 hex chars).
const oid = (prefix, n) => `${prefix}${String(n).padStart(24 - prefix.length, '0')}`

const firstNames = ['Maria', 'James', 'Aisha', 'Luis', 'Grace', 'Daniel', 'Fatima', 'Kevin', 'Chloe', 'Omar',
  'Priya', 'Marcus', 'Elena', 'Tunde', 'Sofia', 'Andre', 'Hannah', 'Victor']
const lastNames = ['Garcia', 'Johnson', 'Bello', 'Hernandez', 'Kim', 'Nguyen', 'Ali', 'Brown', 'Davis', 'Hassan',
  'Patel', 'Williams', 'Lopez', 'Adeyemi', 'Rossi', 'Thomas', 'Clark', 'Moreno']
const cities = ['Houston', 'Pasadena', 'Sugar Land', 'Katy', 'Pearland', 'Bellaire']
const zips = ['77004', '77002', '77479', '77494', '77581', '77401']

export const clients = firstNames.map((first, i) => ({
  _id: oid('c0', i + 1),
  firstName: first,
  middleName: '',
  lastName: lastNames[i],
  email: `${first.toLowerCase()}.${lastNames[i].toLowerCase()}@example.com`,
  phoneNumber: { primary: `713555${String(1000 + i * 37).slice(0, 4)}`, alternate: '' },
  address: {
    line1: `${100 + i * 11} Main St`,
    line2: '',
    city: cities[i % cities.length],
    county: 'Harris',
    zip: zips[i % zips.length]
  },
  orgs: [ORG_A]
}))

// Org B clients - should never appear for an org A user.
clients.push(
  {
    _id: oid('cb', 1), firstName: 'Hidden', middleName: '', lastName: 'OtherOrg', email: 'hidden@example.com',
    phoneNumber: { primary: '2815550000', alternate: '' },
    address: { line1: '1 Elsewhere Rd', line2: '', city: 'Austin', county: 'Travis', zip: '73301' },
    orgs: [ORG_B]
  }
)

const serviceNames = [
  ['Blood Pressure Screening', 'Free blood pressure checks with a nurse.'],
  ['Flu Shots', 'Seasonal flu vaccine for adults and children.'],
  ['Food Pantry', 'Groceries and fresh produce for families.'],
  ['Diabetes Education', 'Classes on managing diet and blood sugar.'],
  ['Dental Screening', 'Basic dental checks and referrals.'],
  ['Vision Screening', 'Eye exams and glasses vouchers.'],
  ['Mental Health Support', 'Counselor drop-in hours.'],
  ['Health Insurance Help', 'Help enrolling in Medicaid, CHIP or marketplace plans.'],
  ['Prenatal Care Info', 'Resources for expecting parents.'],
  ['Nutrition Workshop', 'Healthy cooking on a budget.'],
  ['Smoking Cessation', 'Support groups and quit kits.'],
  ['Child Immunizations', 'Required school vaccines.'],
  ['Senior Wellness', 'Balance, mobility and medication reviews.'],
  ['COVID-19 Testing', 'Rapid tests on site.'],
  ['Hearing Screening', 'Basic hearing tests.'],
  ['Legal Aid Referral', 'Referrals to free legal clinics.']
]

export const services = serviceNames.map(([name, description], i) => ({
  _id: oid('s0', i + 1),
  name,
  description,
  // a couple of inactive services so the "Active only" filter on the event form is visible
  status: i === 10 || i === 15 ? 'Inactive' : 'Active',
  org: ORG_A
}))
services.push({ _id: oid('sb', 1), name: 'Other Org Service', description: 'Not yours', status: 'Active', org: ORG_B })

// Dates relative to today so the dashboard (last 2 months) always has data.
function daysFromNow(days) {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

const eventNames = ['Community Health Fair', 'Back to School Vaccines', 'Senior Health Day', 'Healthy Cooking Class',
  'Free Dental Day', 'Family Wellness Expo', 'Diabetes Support Group', 'Flu Shot Clinic', 'Mental Health Forum',
  'Farmers Market Health Booth', 'Insurance Enrollment Day', 'Vision Check Saturday', 'Prenatal Workshop',
  'Youth Sports Physicals', 'Neighborhood Clean Air Talk', 'Holiday Food Drive']
const eventOffsets = [-55, -48, -40, -33, -27, -20, -14, -9, -4, -1, 3, 8, 15, 22, 30, 45]

export const events = eventNames.map((name, i) => ({
  _id: oid('e0', i + 1),
  org: ORG_A,
  name,
  description: `${name} hosted by Community Health Partners.`,
  date: daysFromNow(eventOffsets[i]),
  services: [services[i % 14]._id, services[(i + 3) % 14]._id],
  address: { line1: `${200 + i * 7} Community Ave`, line2: '', city: cities[i % cities.length], county: 'Harris', zip: zips[i % zips.length] },
  // past events get a few attendees; the last few future events have none (so they can be deleted)
  attendees: i < 12 ? clients.slice(i % 6, (i % 6) + (i % 4) + 1).map((c) => c._id) : []
}))
events.push({
  _id: oid('eb', 1), org: ORG_B, name: 'Other Org Event', description: '', date: daysFromNow(5),
  services: [], address: { line1: '9 Hidden Way', line2: '', city: 'Austin', county: 'Travis', zip: '73301' },
  attendees: [oid('cb', 1)]
})
