/**
 * Tạo phòng chiếu cho một rạp (mặc định CinemaStar Lê Văn Việt).
 * POST /halls yêu cầu cookie MANAGER được gán rạp đó (admin không đủ quyền).
 *
 * node test/seed-halls.mjs
 *
 * Tuỳ chọn:
 *   API_BASE_URL, AUTH_COOKIE (admin), MANAGER_ID, MANAGER_EMAIL, MANAGER_PASSWORD,
 *   MANAGER_AUTH_COOKIE, ASSIGN_MANAGER=1|0, CINEMA_NAME, HALL_COUNT
 */

const AUTH_COOKIE = String(
  process.env.AUTH_COOKIE ||
    'accessToken=eyJhbGciOiJIUzI1NiJ9.eyJ0b2tlbklkIjoiNDk1YzRmMWEtODliOS00Zjc4LThlODItYWNlNTc1ODFjMDk2IiwidG9rZW5UeXBlIjoiYWNjZXNzIiwidXNlcklkIjoiMDE5ZDhjNzEtZTZhMS03ZTA3LTkyMzMtMzY2YmZiNjAxZTRkIiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9BRE1JTiJdLCJzdWIiOiJhZG1pbkBnbWFpbC5jb20iLCJpYXQiOjE3ODA1NTU2MjQsImV4cCI6MTc4Mjk1NTYyNH0.6HYm3rjPg2GaHO5sfBByu3SNmK1-m618ODOmSlXtZEc; refreshToken=eyJhbGciOiJIUzI1NiJ9.eyJ0b2tlbklkIjoiNDk1YzRmMWEtODliOS00Zjc4LThlODItYWNlNTc1ODFjMDk2IiwidG9rZW5UeXBlIjoicmVmcmVzaCIsInVzZXJJZCI6IjAxOWQ4YzcxLWU2YTEtN2UwNy05MjMzLTM2NmJmYjYwMWU0ZCIsImF1dGhvcml0aWVzIjpbIlJPTEVfQURNSU4iXSwic3ViIjoiYWRtaW5AZ21haWwuY29tIiwiaWF0IjoxNzgwNTU1NjI0LCJleHAiOjE3ODMxNDc2MjR9.QNjo4UbmNkcSJpiVAGE7uyF-YZwyJVgVsv9d9Neq3f0',
).trim()

const MANAGER_ID =
  process.env.MANAGER_ID || '019e335d-d3a6-7916-b151-b32f6fe41fa4'
const MANAGER_EMAIL = String(process.env.MANAGER_EMAIL || '').trim()
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || 'Test@12345'
const ASSIGN_MANAGER = !['0', 'false', 'no'].includes(
  String(process.env.ASSIGN_MANAGER ?? '1').toLowerCase(),
)

const API_BASE_URL = (
  process.env.API_BASE_URL || 'https://cinema-api.duckdns.org/api'
).replace(/\/+$/, '')

const CINEMA_NAME = process.env.CINEMA_NAME || 'CinemaStar Lê Văn Việt'
const HALL_COUNT = Math.max(1, Number(process.env.HALL_COUNT) || 10)

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
      if (col === aisleCol) {
        cells.push({ row, col, type: 'AISLE' })
      } else {
        cells.push({ row, col, type: 'SEAT', seatType: 'STANDARD' })
      }
    }
  }
  return {
    totalRows: rows,
    totalCols: cols,
    screenPosition: 'TOP',
    cells,
  }
}

function buildHallPayload(cinemaId, index) {
  return {
    name: `Phòng ${pad(index)}`,
    status: 'ACTIVE',
    cinemaId,
    layoutDefinition: buildDefaultLayout(6, 10),
    imagePaths: [],
  }
}

function buildUpdateCinemaBody(cinema, managerId) {
  return {
    name: cinema.name,
    address: cinema.address,
    latitude: cinema.latitude,
    longitude: cinema.longitude,
    phone: cinema.phone,
    openTime: cinema.openTime,
    closeTime: cinema.closeTime,
    managerId,
  }
}

async function apiRequest(method, path, body, { cookie } = {}) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
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

async function findCinemaByName(name) {
  const keyword = name.trim()
  const { response, payload } = await apiRequest(
    'POST',
    '/cinemas/search',
    { page: 1, size: 20, keyword, filterBy: [], sortBy: [] },
    { cookie: AUTH_COOKIE },
  )

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `Tìm rạp thất bại (${response.status})`)
  }

  const list = payload?.data?.data || []
  const exact = list.find((c) => String(c.name || '').trim() === keyword)
  if (exact?.id) return exact

  const partial = list.find((c) =>
    String(c.name || '')
      .toLowerCase()
      .includes(keyword.toLowerCase()),
  )
  if (partial?.id) return partial
  if (list[0]?.id) return list[0]

  throw new Error(`Không tìm thấy rạp "${name}".`)
}

async function getCinemaById(id) {
  const { response, payload } = await apiRequest('GET', `/cinemas/${id}`, null, {
    cookie: AUTH_COOKIE,
  })
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `Không tải rạp (${response.status})`)
  }
  return payload?.data
}

async function updateCinemaManager(cinema, managerId) {
  const { response, payload } = await apiRequest(
    'PUT',
    `/cinemas/${cinema.id}`,
    buildUpdateCinemaBody(cinema, managerId),
    { cookie: AUTH_COOKIE },
  )
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `Không gán manager ${managerId}`)
  }
}

async function assignManagerToCinema(cinema) {
  if (cinema.managerId) return cinema.managerId
  if (!ASSIGN_MANAGER) {
    throw new Error('Rạp chưa có manager — bật ASSIGN_MANAGER=1 hoặc gán trên UI.')
  }
  await updateCinemaManager(cinema, MANAGER_ID)
  console.log(`Đã gán manager ${MANAGER_ID} cho rạp.`)
  return MANAGER_ID
}

async function getUserEmail(userId) {
  const { response, payload } = await apiRequest('GET', `/users/${userId}`, null, {
    cookie: AUTH_COOKIE,
  })
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `Không tải user ${userId}`)
  }
  const email = payload?.data?.email
  if (!email) throw new Error(`User ${userId} không có email`)
  return email
}

async function loginManager(email, password) {
  const { response, payload, setCookies } = await apiRequest('POST', '/auth/login', {
    email,
    password,
  })
  if (!response.ok || payload?.success === false) return null
  const cookie = cookieHeaderFromSetCookies(setCookies)
  if (!cookie.includes('accessToken=')) return null
  return cookie
}

async function registerSeedManager() {
  const tag = String(Date.now()).replace(/\W/g, '')
  const body = {
    name: 'Hall Seed Manager',
    email: `hall.seed.${tag}@seed.cinemastar.test`,
    password: MANAGER_PASSWORD,
    dob: '1995-06-15',
    gender: 'MALE',
    phone: `09${String(10000000 + (Number(tag.slice(-6)) % 100000000)).slice(-8)}`,
  }
  const { response, payload } = await apiRequest('POST', '/auth/manager', body, {
    cookie: AUTH_COOKIE,
  })
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Không tạo manager tạm')
  }
  console.log(`Tạo manager tạm: ${body.email}`)
  return body
}

async function findManagerIdByEmail(email) {
  const { response, payload } = await apiRequest(
    'POST',
    '/users/managers/search',
    { page: 1, size: 5, keyword: email },
    { cookie: AUTH_COOKIE },
  )
  if (!response.ok || payload?.success === false) return null
  const list = payload?.data?.data || []
  const hit = list.find((u) => String(u.email || '').toLowerCase() === email.toLowerCase())
  return hit?.id || list[0]?.id || null
}

async function resolveManagerCookie(cinema, managerId) {
  if (process.env.MANAGER_AUTH_COOKIE) {
    return String(process.env.MANAGER_AUTH_COOKIE).trim()
  }

  const email = MANAGER_EMAIL || (await getUserEmail(managerId))
  console.log(`Đăng nhập manager: ${email}`)
  let cookie = await loginManager(email, MANAGER_PASSWORD)
  if (cookie) return cookie

  console.log('Đăng nhập thất bại — tạo manager seed và gán lại rạp...')
  const seeded = await registerSeedManager()
  cookie = await loginManager(seeded.email, seeded.password)
  if (!cookie) throw new Error('Không đăng nhập manager seed')

  const newManagerId = await findManagerIdByEmail(seeded.email)
  if (!newManagerId) throw new Error('Không tìm ID manager seed')
  await updateCinemaManager(cinema, newManagerId)
  console.log(`Rạp gán cho manager seed (${newManagerId}).`)
  return cookie
}

async function createHall(managerCookie, cinemaId, index) {
  const body = buildHallPayload(cinemaId, index)
  const { response, payload } = await apiRequest('POST', '/halls', body, {
    cookie: managerCookie,
  })
  const ok = response.ok && payload?.success !== false
  console.log(
    `[${ok ? 'OK' : 'FAIL'}] ${body.name} — ${payload?.message || response.statusText}`,
  )
  if (!ok && payload) console.error('  ', JSON.stringify(payload))
  return ok
}

async function main() {
  if (!AUTH_COOKIE) {
    console.error('Thiếu AUTH_COOKIE (cookie admin).')
    process.exitCode = 1
    return
  }

  console.log(`API: ${API_BASE_URL}`)
  console.log(`Rạp: ${CINEMA_NAME}`)
  console.log(`Tạo ${HALL_COUNT} phòng\n`)

  const found = await findCinemaByName(CINEMA_NAME)
  const cinema = await getCinemaById(found.id)
  console.log(`Tìm thấy rạp: ${cinema.name} (${cinema.id})`)

  const managerId = await assignManagerToCinema(cinema)
  const managerCookie = await resolveManagerCookie(cinema, managerId)
  console.log('')

  let ok = 0
  let fail = 0
  for (let i = 1; i <= HALL_COUNT; i += 1) {
    if (await createHall(managerCookie, cinema.id, i)) ok += 1
    else fail += 1
  }

  console.log(`\nXong: ${ok} OK, ${fail} FAIL`)
  if (fail > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e.message || e)
  process.exitCode = 1
})
