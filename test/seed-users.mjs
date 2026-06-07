/**
 * Seed 10 khách + 10 manager + 10 staff.
 *
 * node test/seed-users.mjs
 *
 * Sửa AUTH_COOKIE bên dưới hoặc: $env:AUTH_COOKIE='accessToken=...; refreshToken=...'
 * Khách cần OTP: $env:SEED_OTPS='111111,222222,...' (10 mã) hoặc SKIP_CUSTOMERS=1
 */

const AUTH_COOKIE = String(
  process.env.AUTH_COOKIE ||
    'accessToken=eyJhbGciOiJIUzI1NiJ9.eyJ0b2tlbklkIjoiNDk1YzRmMWEtODliOS00Zjc4LThlODItYWNlNTc1ODFjMDk2IiwidG9rZW5UeXBlIjoiYWNjZXNzIiwidXNlcklkIjoiMDE5ZDhjNzEtZTZhMS03ZTA3LTkyMzMtMzY2YmZiNjAxZTRkIiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9BRE1JTiJdLCJzdWIiOiJhZG1pbkBnbWFpbC5jb20iLCJpYXQiOjE3ODA1NTU2MjQsImV4cCI6MTc4Mjk1NTYyNH0.6HYm3rjPg2GaHO5sfBByu3SNmK1-m618ODOmSlXtZEc; refreshToken=eyJhbGciOiJIUzI1NiJ9.eyJ0b2tlbklkIjoiNDk1YzRmMWEtODliOS00Zjc4LThlODItYWNlNTc1ODFjMDk2IiwidG9rZW5UeXBlIjoicmVmcmVzaCIsInVzZXJJZCI6IjAxOWQ4YzcxLWU2YTEtN2UwNy05MjMzLTM2NmJmYjYwMWU0ZCIsImF1dGhvcml0aWVzIjpbIlJPTEVfQURNSU4iXSwic3ViIjoiYWRtaW5AZ21haWwuY29tIiwiaWF0IjoxNzgwNTU1NjI0LCJleHAiOjE3ODMxNDc2MjR9.QNjo4UbmNkcSJpiVAGE7uyF-YZwyJVgVsv9d9Neq3f0',
).trim()

const API_BASE_URL = (
  process.env.API_BASE_URL || 'https://cinema-api.duckdns.org/api'
).replace(/\/+$/, '')
const SEED_COUNT = Math.max(1, Number(process.env.SEED_COUNT) || 10)
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Test@12345'
const SEED_TAG = String(process.env.SEED_TAG || Date.now()).replace(/\W/g, '')
const SKIP_CUSTOMERS = ['1', 'true', 'yes'].includes(
  String(process.env.SKIP_CUSTOMERS || '').toLowerCase(),
)
const SEED_OTPS = String(process.env.SEED_OTPS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const GENDERS = ['MALE', 'FEMALE']
const DEFAULT_DOB = '1995-06-15'
const GIVEN_NAMES = [
  'An',
  'Binh',
  'Cuong',
  'Dung',
  'Giang',
  'Hoa',
  'Khanh',
  'Linh',
  'Minh',
  'Nam',
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function buildPayload(index, roleLabel) {
  const i = pad(index)
  const given = GIVEN_NAMES[index - 1] || 'Nam'
  return {
    name: `${given} Van ${roleLabel}`,
    email: `${roleLabel.toLowerCase()}.seed${i}.${SEED_TAG}@seed.cinemastar.test`,
    password: SEED_PASSWORD,
    dob: DEFAULT_DOB,
    gender: GENDERS[(index - 1) % GENDERS.length],
    phone: `09${String(10000000 + index).slice(-8)}`,
  }
}

function parseSetCookies(response) {
  const raw = response.headers.getSetCookie?.() || []
  if (raw.length) return raw
  const single = response.headers.get('set-cookie')
  return single ? [single] : []
}

function cookieHeaderFromSetCookies(setCookies) {
  return setCookies
    .map((line) => line.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

async function apiPost(path, body, { cookie } = {}) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
  if (cookie) headers.Cookie = cookie

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  let payload = null
  const text = await response.text()
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { raw: text }
  }
  return { response, payload, setCookies: parseSetCookies(response) }
}

function logResult(kind, index, email, ok, message) {
  console.log(`[${ok ? 'OK' : 'FAIL'}] ${kind} #${pad(index)} ${email} — ${message}`)
}

async function createManagerOrStaff(kind, path, index) {
  if (!AUTH_COOKIE) {
    logResult(kind, index, '-', false, 'Thiếu AUTH_COOKIE')
    return false
  }
  const body = buildPayload(index, kind)
  const { response, payload } = await apiPost(path, body, { cookie: AUTH_COOKIE })
  const ok = response.ok && payload?.success !== false
  logResult(kind, index, body.email, ok, payload?.message || response.statusText)
  if (!ok && payload) console.error('  ', JSON.stringify(payload))
  return ok
}

async function createCustomer(index) {
  const body = buildPayload(index, 'Customer')
  const { response, payload, setCookies } = await apiPost('/auth/register', body)
  if (!(response.ok && payload?.success !== false)) {
    logResult('Customer', index, body.email, false, payload?.message || response.statusText)
    if (payload) console.error('  ', JSON.stringify(payload))
    return false
  }

  const verifyCookie = cookieHeaderFromSetCookies(setCookies)
  if (!verifyCookie.includes('verifyToken=')) {
    logResult('Customer', index, body.email, false, 'Thiếu verifyToken sau register')
    return false
  }

  const otp = SEED_OTPS[index - 1]
  if (!otp) {
    logResult('Customer', index, body.email, false, 'Cần SEED_OTPS hoặc log BE "otp generate"')
    return false
  }

  const verify = await apiPost('/auth/verify-otp', { otp }, { cookie: verifyCookie })
  const verifyOk = verify.response.ok && verify.payload?.success !== false
  logResult('Customer', index, body.email, verifyOk, verify.payload?.message || verify.response.statusText)
  if (!verifyOk && verify.payload) console.error('  ', JSON.stringify(verify.payload))
  return verifyOk
}

async function main() {
  console.log(`API: ${API_BASE_URL}`)
  console.log(`Tag: ${SEED_TAG} · ${SEED_COUNT}/loại · Cookie: ${AUTH_COOKIE ? 'có' : 'không'}`)
  console.log(`OTP: ${SEED_OTPS.length}/${SEED_COUNT}\n`)

  let ok = 0
  let fail = 0
  const tally = async (fn) => {
    if (await fn()) ok += 1
    else fail += 1
  }

  for (let i = 1; i <= SEED_COUNT; i += 1) await tally(() => createManagerOrStaff('Manager', '/auth/manager', i))
  for (let i = 1; i <= SEED_COUNT; i += 1) await tally(() => createManagerOrStaff('Staff', '/auth/staff', i))

  if (SKIP_CUSTOMERS) {
    console.log('\nSKIP_CUSTOMERS=1 — bỏ khách hàng')
  } else {
    for (let i = 1; i <= SEED_COUNT; i += 1) await tally(() => createCustomer(i))
  }

  console.log(`\nXong: ${ok} OK, ${fail} FAIL`)
  if (fail > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
