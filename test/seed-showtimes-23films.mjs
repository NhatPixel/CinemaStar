/**
 * Xuất chiếu: 23 phim NOW_SHOWING × Phòng 01–23 (1 phim / 1 phòng).
 * Từ ngày mai → 31/07/2026, mỗi ngày nhiều suất trong khung giờ mở cửa.
 *
 * node test/seed-showtimes-23films.mjs
 */

const API_BASE_URL = (
  process.env.API_BASE_URL || 'https://cinema-api.duckdns.org/api'
).replace(/\/+$/, '')
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'admin@gmail.com').trim()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345678aA@'
const MANAGER_EMAIL = String(process.env.MANAGER_EMAIL || 'manager@gmail.com').trim()
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || '12345678aA@'
const MANAGER_ID = process.env.MANAGER_ID || '019e335d-d3a6-7916-b151-b32f6fe41fa4'
/** CinemaStar Lê Văn Việt — không dùng CINEMA_ID rạp khác từ env */
const TARGET_CINEMA_ID = '019e53ee-c8c0-7525-882e-5115fe6a62c3'
const CINEMA_ID = process.env.CINEMA_ID || TARGET_CINEMA_ID
if (CINEMA_ID !== TARGET_CINEMA_ID) {
  console.warn(`Cảnh báo: CINEMA_ID=${CINEMA_ID} khác Lê Văn Việt (${TARGET_CINEMA_ID})`)
}
const RANGE_END = process.env.RANGE_END || '2026-07-31'
const FILM_COUNT = Math.min(23, Math.max(1, Number(process.env.FILM_COUNT) || 23))
const HALL_FROM = Number(process.env.HALL_FROM) || 1
const HALL_TO = Number(process.env.HALL_TO) || 23
const DAY_START = process.env.DAY_START || '10:00:00'
const DAY_END = process.env.DAY_END || '21:30:00'
const REQUEST_DELAY_MS = Math.max(0, Number(process.env.REQUEST_DELAY_MS) || 35)

function formatDateOnly(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function resolveRangeStart() {
  if (process.env.RANGE_START) return process.env.RANGE_START
  const t = new Date()
  t.setDate(t.getDate() + 1)
  return formatDateOnly(t)
}

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function toApiDateTime(date, time) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const t = time.length === 5 ? `${time}:00` : time
  return `${y}-${m}-${d}T${t}`
}

function* eachDayInclusive(startIso, endIso) {
  const start = new Date(`${startIso}T12:00:00`)
  const end = new Date(`${endIso}T12:00:00`)
  const cur = new Date(start)
  while (cur <= end) {
    yield new Date(cur)
    cur.setDate(cur.getDate() + 1)
  }
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

async function assignManager(adminCookie) {
  const { payload } = await apiRequest('GET', `/cinemas/${CINEMA_ID}`, null, {
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
  const put = await apiRequest('PUT', `/cinemas/${CINEMA_ID}`, body, { cookie: adminCookie })
  if (!put.response.ok || put.payload?.success === false) {
    throw new Error(put.payload?.message || 'Không gán manager')
  }
}

function buildDefaultLayout() {
  const rows = 6
  const cols = 10
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

async function createHallIfMissing(managerCookie, roomNum) {
  const name = `Phòng ${pad(roomNum)}`
  const body = {
    name,
    status: 'ACTIVE',
    cinemaId: CINEMA_ID,
    layoutDefinition: buildDefaultLayout(),
    imagePaths: [],
  }
  const { response, payload } = await apiRequest('POST', '/halls', body, {
    cookie: managerCookie,
  })
  const ok = response.ok && payload?.success !== false
  console.log(`[HALL ${ok ? 'OK' : 'FAIL'}] ${name} — ${payload?.message || response.statusText}`)
  if (!ok) throw new Error(payload?.message || `Không tạo ${name}`)
}

async function fetchHallsByRoom(managerCookie) {
  const map = new Map()
  for (let page = 1; page <= 10; page += 1) {
    const { response, payload } = await apiRequest(
      'POST',
      '/halls/search',
      {
        page,
        size: 100,
        keyword: '',
        filterBy: [{ field: 'CINEMA_ID', operator: 'EQ', value: CINEMA_ID }],
        sortBy: [],
      },
      { cookie: managerCookie },
    )
    if (!response.ok || payload?.success === false) break
    for (const h of payload?.data?.data || []) {
      const m = String(h.name || '').match(/^Phòng\s+(\d+)$/i)
      if (m) map.set(Number(m[1]), { id: h.id, name: h.name })
    }
    if (!payload?.data?.hasNext) break
  }
  return map
}

async function fetchNowShowingFilms(cookie) {
  const all = []
  let cursor
  for (let i = 0; i < 20; i += 1) {
    const body = {
      size: FILM_COUNT,
      filterBy: [{ field: 'STATUS', operator: 'EQ', value: 'NOW_SHOWING' }],
      sortBy: [{ field: 'TIME_CREATED', direction: 'ASC' }],
    }
    if (cursor) body.cursor = cursor
    const { response, payload } = await apiRequest('POST', '/films/search', body, { cookie })
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || 'Không tải phim')
    }
    all.push(...(payload?.data?.data || []))
    if (!payload?.data?.hasNext) break
    cursor = payload?.data?.nextCursor
    if (!cursor) break
  }
  return all.slice(0, FILM_COUNT)
}

async function fetchPricingPolicyId(managerCookie) {
  const { response, payload } = await apiRequest(
    'POST',
    '/showtimes/pricing-policies/search',
    {
      page: 1,
      size: 20,
      keyword: '',
      filterBy: [{ field: 'CINEMA_ID', operator: 'EQ', value: CINEMA_ID }],
      sortBy: [],
    },
    { cookie: managerCookie },
  )
  const list = payload?.data?.data || []
  if (!list.length) throw new Error('Chưa có chính sách giá tại rạp')
  const preferred =
    list.find((p) => /tiêu chuẩn|co ban|cơ bản/i.test(p.name || '')) || list[0]
  return preferred.id
}

function countCreated(data) {
  const list = data?.successResponse
  if (!Array.isArray(list)) return 0
  return list.filter((x) => x?.data != null).length
}

async function createDayShowtimes(managerCookie, { hallId, filmId, pricingPolicyId, day, filmTitle, hallName }) {
  const start = toApiDateTime(day, DAY_START)
  const end = toApiDateTime(day, DAY_END)
  const body = {
    hallId,
    filmId,
    pricingPolicyId,
    startDateTime: start,
    endDateTime: end,
    status: 'SCHEDULED',
  }
  const { response, payload } = await apiRequest('POST', '/showtimes', body, {
    cookie: managerCookie,
  })
  const ok = response.ok && payload?.success !== false
  const created = ok ? countCreated(payload?.data ?? payload) : 0
  return { ok, created, message: payload?.message || '' }
}

async function main() {
  const RANGE_START = resolveRangeStart()
  if (RANGE_START > RANGE_END) throw new Error('RANGE_START sau RANGE_END')

  console.log(`API: ${API_BASE_URL}`)
  console.log(`Rạp: ${CINEMA_ID}`)
  console.log(`Ngày: ${RANGE_START} → ${RANGE_END}`)
  console.log(`Khung giờ/ngày: ${DAY_START} – ${DAY_END}\n`)

  const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
  await assignManager(adminCookie)
  const managerCookie = await login(MANAGER_EMAIL, MANAGER_PASSWORD)

  let hallMap = await fetchHallsByRoom(managerCookie)
  for (let r = HALL_FROM; r <= HALL_TO; r += 1) {
    if (!hallMap.has(r)) await createHallIfMissing(managerCookie, r)
  }
  hallMap = await fetchHallsByRoom(managerCookie)
  if (hallMap.size < HALL_TO - HALL_FROM + 1) {
    throw new Error(`Thiếu phòng (có ${hallMap.size}, cần ${HALL_TO - HALL_FROM + 1})`)
  }

  const films = await fetchNowShowingFilms(adminCookie)
  const pricingPolicyId = await fetchPricingPolicyId(managerCookie)
  const days = [...eachDayInclusive(RANGE_START, RANGE_END)]

  const pairs = []
  for (let i = 0; i < FILM_COUNT; i += 1) {
    const room = HALL_FROM + i
    if (room > HALL_TO) break
    const hall = hallMap.get(room)
    const film = films[i]
    if (!hall?.id || !film?.id) continue
    pairs.push({
      hall,
      film,
      label: `${film.title || film.name} → ${hall.name}`,
    })
  }

  if (pairs.length < FILM_COUNT) {
    console.warn(`Chỉ ghép được ${pairs.length}/${FILM_COUNT} cặp phim–phòng`)
  }

  console.log(`Phim: ${films.length}, Phòng: ${hallMap.size}, Cặp: ${pairs.length}`)
  pairs.forEach((p, idx) => console.log(`  ${idx + 1}. ${p.label}`))
  console.log('')

  let totalShowtimes = 0
  let okDays = 0
  let failDays = 0

  for (const { hall, film, label } of pairs) {
    console.log(`--- ${label} ---`)
    let pairCreated = 0
    for (const day of days) {
      const res = await createDayShowtimes(managerCookie, {
        hallId: hall.id,
        filmId: film.id,
        pricingPolicyId,
        day,
        filmTitle: film.title,
        hallName: hall.name,
      })
      if (res.ok && res.created > 0) {
        okDays += 1
        pairCreated += res.created
        totalShowtimes += res.created
      } else {
        failDays += 1
        const past = String(res.message).includes('tương lai')
        if (!past && failDays <= 5) {
          console.log(`  [FAIL] ${formatDateOnly(day)}: ${res.message}`)
        }
      }
      if (REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS)
    }
    console.log(`  → ${pairCreated} suất\n`)
  }

  console.log(
    `Xong: ${totalShowtimes} suất, ${okDays} ngày OK, ${failDays} ngày lỗi/trùng`,
  )
}

main().catch((e) => {
  console.error(e.message || e)
  process.exitCode = 1
})
