/**
 * Tạo phòng chiếu theo khoảng số (vd. Phòng 11–23).
 * node test/seed-halls-range.mjs
 */

const API_BASE_URL = (
  process.env.API_BASE_URL || 'https://cinema-api.duckdns.org/api'
).replace(/\/+$/, '')
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'admin@gmail.com').trim()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345678aA@'
const MANAGER_EMAIL = String(process.env.MANAGER_EMAIL || 'manager@gmail.com').trim()
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || '12345678aA@'
const MANAGER_ID = process.env.MANAGER_ID || '019e335d-d3a6-7916-b151-b32f6fe41fa4'
const CINEMA_NAME = process.env.CINEMA_NAME || 'CinemaStar Lê Văn Việt'
const CINEMA_ID = process.env.CINEMA_ID || '019e53ee-c8c0-7525-882e-5115fe6a62c3'
const HALL_FROM = Math.max(1, Number(process.env.HALL_FROM) || 11)
const HALL_TO = Math.max(HALL_FROM, Number(process.env.HALL_TO) || 23)

function pad(n) {
  return String(n).padStart(2, '0')
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

function buildDefaultLayout(rows = 6, cols = 10) {
  const aisleCol = Math.ceil(cols / 2)
  const cells = []
  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      if (col === aisleCol) cells.push({ row, col, type: 'AISLE' })
      else cells.push({ row, col, type: 'SEAT', seatType: 'STANDARD' })
    }
  }
  return { totalRows: rows, totalCols: cols, screenPosition: 'TOP', cells }
}

function hallName(index) {
  return `Phòng ${pad(index)}`
}

async function apiRequest(method, path, body, { cookie } = {}) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
  if (cookie) headers.Cookie = cookie
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
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

async function login(email, password) {
  const { response, payload, setCookies = [] } = await apiRequest('POST', '/auth/login', {
    email,
    password,
  })
  const cookie = cookieHeaderFromSetCookies(setCookies)
  if (!response.ok || payload?.success === false || !cookie.includes('accessToken')) {
    throw new Error(payload?.message || `Không đăng nhập ${email}`)
  }
  return cookie
}

async function assignManager(adminCookie, cinemaId) {
  const { response, payload } = await apiRequest('GET', `/cinemas/${cinemaId}`, null, {
    cookie: adminCookie,
  })
  const cinema = payload?.data
  if (!cinema?.id) throw new Error('Không tải rạp')
  if (cinema.managerId === MANAGER_ID) return
  const body = {
    name: cinema.name,
    address: cinema.address,
    latitude: cinema.latitude,
    longitude: cinema.longitude,
    phone: cinema.phone,
    openTime: cinema.openTime,
    closeTime: cinema.closeTime,
    managerId: MANAGER_ID,
  }
  const put = await apiRequest('PUT', `/cinemas/${cinemaId}`, body, { cookie: adminCookie })
  if (!put.response.ok || put.payload?.success === false) {
    throw new Error(put.payload?.message || 'Không gán manager')
  }
  console.log(`Đã gán manager cho ${cinema.name}`)
}

async function existingHallNames(adminCookie, cinemaId) {
  const names = new Set()
  for (let page = 1; page <= 20; page += 1) {
    const { response, payload } = await apiRequest(
      'POST',
      '/halls/search',
      {
        page,
        size: 50,
        keyword: '',
        filterBy: [{ field: 'CINEMA_ID', operator: 'EQ', value: cinemaId }],
        sortBy: [],
      },
      { cookie: adminCookie },
    )
    if (!response.ok || payload?.success === false) break
    for (const h of payload?.data?.data || []) {
      names.add(String(h.name || '').trim().toLowerCase())
    }
    if (!payload?.data?.hasNext) break
  }
  return names
}

async function createHall(managerCookie, cinemaId, index) {
  const body = {
    name: hallName(index),
    status: 'ACTIVE',
    cinemaId,
    layoutDefinition: buildDefaultLayout(6, 10),
    imagePaths: [],
  }
  const { response, payload } = await apiRequest('POST', '/halls', body, {
    cookie: managerCookie,
  })
  const ok = response.ok && payload?.success !== false
  console.log(`[${ok ? 'OK' : 'FAIL'}] ${body.name} — ${payload?.message || response.statusText}`)
  if (!ok && payload) console.error('  ', JSON.stringify(payload))
  return ok
}

async function main() {
  console.log(`API: ${API_BASE_URL}`)
  console.log(`Rạp: ${CINEMA_NAME}`)
  console.log(`Tạo phòng ${HALL_FROM} → ${HALL_TO}\n`)

  const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
  await assignManager(adminCookie, CINEMA_ID)
  const managerCookie = await login(MANAGER_EMAIL, MANAGER_PASSWORD)

  const existing = await existingHallNames(adminCookie, CINEMA_ID)
  console.log(`Phòng hiện có: ${existing.size}\n`)

  let ok = 0
  let skip = 0
  let fail = 0

  for (let i = HALL_FROM; i <= HALL_TO; i += 1) {
    const key = hallName(i).toLowerCase()
    if (existing.has(key)) {
      console.log(`[SKIP] ${hallName(i)}`)
      skip += 1
      continue
    }
    if (await createHall(managerCookie, CINEMA_ID, i)) {
      ok += 1
      existing.add(key)
    } else fail += 1
  }

  console.log(`\nXong: ${ok} OK, ${skip} bỏ qua, ${fail} FAIL`)
  if (fail > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e.message || e)
  process.exitCode = 1
})
