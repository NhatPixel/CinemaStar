/**
 * Gán tất cả rạp cho manager (tên "Manager" hoặc manager@gmail.com).
 * node test/assign-all-cinemas-manager.mjs
 */

const API_BASE_URL = (
  process.env.API_BASE_URL || 'https://cinema-api.duckdns.org/api'
).replace(/\/+$/, '')
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'admin@gmail.com').trim()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345678aA@'
const MANAGER_NAME = String(process.env.MANAGER_NAME || 'Manager').trim()
const MANAGER_EMAIL = String(process.env.MANAGER_EMAIL || 'manager@gmail.com').trim()
const MANAGER_ID = String(process.env.MANAGER_ID || '').trim()

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

async function loginAdmin() {
  const { response, payload, setCookies = [] } = await apiRequest('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })
  const cookie = cookieHeaderFromSetCookies(setCookies)
  if (!response.ok || payload?.success === false || !cookie.includes('accessToken')) {
    throw new Error(payload?.message || 'Không đăng nhập admin')
  }
  return cookie
}

async function resolveManagerId(adminCookie) {
  if (MANAGER_ID) return MANAGER_ID

  for (const keyword of [MANAGER_EMAIL, MANAGER_NAME]) {
    const { response, payload } = await apiRequest(
      'POST',
      '/users/managers/search',
      { page: 1, size: 20, keyword },
      { cookie: adminCookie },
    )
    if (!response.ok || payload?.success === false) continue
    const list = payload?.data?.data || []
    const byEmail = list.find(
      (u) => String(u.email || '').toLowerCase() === MANAGER_EMAIL.toLowerCase(),
    )
    if (byEmail?.id) return byEmail.id
    const byName = list.find((u) =>
      String(u.name || '')
        .trim()
        .toLowerCase()
        .includes(MANAGER_NAME.toLowerCase()),
    )
    if (byName?.id) return byName.id
    if (list[0]?.id) return list[0].id
  }

  throw new Error(`Không tìm manager "${MANAGER_NAME}" / ${MANAGER_EMAIL}`)
}

async function fetchAllCinemas(adminCookie) {
  const all = []
  for (let page = 1; page <= 100; page += 1) {
    const { response, payload } = await apiRequest(
      'POST',
      '/cinemas/search',
      { page, size: 50, keyword: '', filterBy: [], sortBy: [] },
      { cookie: adminCookie },
    )
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || 'Không tải danh sách rạp')
    }
    all.push(...(payload?.data?.data || []))
    if (!payload?.data?.hasNext) break
  }
  return all
}

async function updateCinemaManager(adminCookie, cinema, managerId) {
  const body = {
    name: cinema.name,
    address: cinema.address,
    latitude: cinema.latitude,
    longitude: cinema.longitude,
    phone: cinema.phone,
    openTime: cinema.openTime,
    closeTime: cinema.closeTime,
    managerId,
  }
  const { response, payload } = await apiRequest('PUT', `/cinemas/${cinema.id}`, body, {
    cookie: adminCookie,
  })
  return {
    ok: response.ok && payload?.success !== false,
    message: payload?.message || response.statusText,
  }
}

async function main() {
  console.log(`API: ${API_BASE_URL}\n`)

  const adminCookie = await loginAdmin()
  const managerId = await resolveManagerId(adminCookie)

  const { payload } = await apiRequest('GET', `/users/${managerId}`, null, {
    cookie: adminCookie,
  })
  const manager = payload?.data
  console.log(
    `Manager: ${manager?.name || MANAGER_NAME} (${manager?.email || MANAGER_EMAIL}) — ${managerId}\n`,
  )

  const cinemas = await fetchAllCinemas(adminCookie)
  console.log(`Tổng rạp: ${cinemas.length}\n`)

  let ok = 0
  let skip = 0
  let fail = 0

  for (const cinema of cinemas) {
    if (String(cinema.managerId || '') === String(managerId)) {
      console.log(`[SKIP] ${cinema.name} — đã gán`)
      skip += 1
      continue
    }
    const result = await updateCinemaManager(adminCookie, cinema, managerId)
    if (result.ok) {
      console.log(`[OK] ${cinema.name}`)
      ok += 1
    } else {
      console.log(`[FAIL] ${cinema.name} — ${result.message}`)
      fail += 1
    }
  }

  console.log(`\nXong: ${ok} gán, ${skip} đã đúng, ${fail} lỗi`)
  if (fail > 0 && ok === 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e.message || e)
  process.exitCode = 1
})
