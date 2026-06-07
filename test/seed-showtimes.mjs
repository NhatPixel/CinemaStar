/**
 * Tạo suất chiếu cho CinemaStar Lê Văn Việt:
 * - Mọi phòng chiếu ACTIVE
 * - Mọi phim NOW_SHOWING
 * - Từ ngày mai (trong tháng 5/2026) đến 31/07/2026
 *
 * node test/seed-showtimes.mjs
 */

const API_BASE_URL = (
  process.env.API_BASE_URL || 'https://cinema-api.duckdns.org/api'
).replace(/\/+$/, '')
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'admin@gmail.com').trim()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345678aA@'
const MANAGER_ID = process.env.MANAGER_ID || '019e335d-d3a6-7916-b151-b32f6fe41fa4'
const MANAGER_EMAIL = String(process.env.MANAGER_EMAIL || 'manager@gmail.com').trim()
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || '12345678aA@'
const CINEMA_NAME = process.env.CINEMA_NAME || 'CinemaStar Lê Văn Việt'
const RANGE_END = process.env.RANGE_END || '2026-07-31'

function formatDateOnly(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function resolveRangeStart() {
  if (process.env.RANGE_START) return process.env.RANGE_START
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return formatDateOnly(tomorrow)
}
const SLOTS_PER_DAY = Math.max(1, Number(process.env.SLOTS_PER_DAY) || 4)
const SLOT_MINUTES = Math.max(120, Number(process.env.SLOT_MINUTES) || 165)
const REQUEST_DELAY_MS = Math.max(0, Number(process.env.REQUEST_DELAY_MS) || 40)

/** Giờ bắt đầu các suất trong ngày (trong khung mở cửa 08:00–22:00) */
const DAY_SLOT_TIMES = ['10:00:00', '12:45:00', '15:30:00', '18:15:00'].slice(0, SLOTS_PER_DAY)

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

function addMinutes(isoLocal, minutes) {
  const [datePart, timePart] = isoLocal.split('T')
  const [hh, mm, ss] = timePart.split(':').map(Number)
  const base = new Date(`${datePart}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss || 0).padStart(2, '0')}`)
  base.setMinutes(base.getMinutes() + minutes)
  const y = base.getFullYear()
  const mo = String(base.getMonth() + 1).padStart(2, '0')
  const da = String(base.getDate()).padStart(2, '0')
  const h = String(base.getHours()).padStart(2, '0')
  const mi = String(base.getMinutes()).padStart(2, '0')
  const se = String(base.getSeconds()).padStart(2, '0')
  return `${y}-${mo}-${da}T${h}:${mi}:${se}`
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

async function findCinema(adminCookie, name) {
  const { response, payload } = await apiRequest(
    'POST',
    '/cinemas/search',
    { page: 1, size: 20, keyword: name, filterBy: [], sortBy: [] },
    { cookie: adminCookie },
  )
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Không tìm rạp')
  }
  const list = payload?.data?.data || []
  const exact = list.find((c) => String(c.name || '').trim() === name.trim())
  return exact || list[0] || null
}

async function getCinema(adminCookie, id) {
  const { response, payload } = await apiRequest('GET', `/cinemas/${id}`, null, {
    cookie: adminCookie,
  })
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Không tải rạp')
  }
  return payload?.data
}

async function assignManager(adminCookie, cinema, managerId) {
  if (cinema.managerId === managerId) return
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
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Không gán manager cho rạp')
  }
  console.log(`Đã gán manager ${managerId} cho ${cinema.name}`)
}

async function fetchHalls(cookie, cinemaId) {
  const all = []
  for (let page = 1; page <= 20; page += 1) {
    const { response, payload } = await apiRequest(
      'POST',
      '/halls/search',
      {
        page,
        size: 50,
        keyword: '',
        filterBy: [
          { field: 'CINEMA_ID', operator: 'EQ', value: cinemaId },
          { field: 'STATUS', operator: 'EQ', value: 'ACTIVE' },
        ],
        sortBy: [],
      },
      { cookie },
    )
    if (!response.ok || payload?.success === false) break
    all.push(...(payload?.data?.data || []))
    if (!payload?.data?.hasNext) break
  }
  return all
}

async function fetchNowShowingFilms(cookie) {
  const all = []
  let cursor
  for (let i = 0; i < 50; i += 1) {
    const body = {
      size: 50,
      filterBy: [{ field: 'STATUS', operator: 'EQ', value: 'NOW_SHOWING' }],
      sortBy: [{ field: 'TIME_CREATED', direction: 'ASC' }],
    }
    if (cursor) body.cursor = cursor
    const { response, payload } = await apiRequest('POST', '/films/search', body, { cookie })
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || 'Không tải phim đang chiếu')
    }
    all.push(...(payload?.data?.data || []))
    if (!payload?.data?.hasNext) break
    cursor = payload?.data?.nextCursor
    if (!cursor) break
  }
  return all.filter((f) => f?.id)
}

async function fetchPricingPolicyId(cookie, cinemaId) {
  const { response, payload } = await apiRequest(
    'POST',
    '/showtimes/pricing-policies/search',
    {
      page: 1,
      size: 20,
      keyword: '',
      filterBy: [{ field: 'CINEMA_ID', operator: 'EQ', value: cinemaId }],
      sortBy: [],
    },
    { cookie },
  )
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Không tải chính sách giá')
  }
  const list = payload?.data?.data || []
  if (!list.length) throw new Error('Rạp chưa có chính sách giá — tạo trên UI trước.')
  return list[0].id
}

function countCreated(payload) {
  const list = payload?.successResponse
  if (!Array.isArray(list)) return 0
  return list.filter((x) => x?.data != null).length
}

async function createShowtimeBatch(managerCookie, { hallId, filmId, pricingPolicyId, start, end }) {
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
  return { ok, created, message: payload?.message || response.statusText, payload }
}

async function main() {
  console.log(`API: ${API_BASE_URL}`)
  console.log(`Rạp: ${CINEMA_NAME}`)
  const RANGE_START = resolveRangeStart()
  if (RANGE_START > RANGE_END) {
    throw new Error(`RANGE_START (${RANGE_START}) sau RANGE_END (${RANGE_END})`)
  }
  console.log(`Khung ngày: ${RANGE_START} → ${RANGE_END}`)
  console.log(`${SLOTS_PER_DAY} khung giờ/ngày/phòng, mỗi khung ${SLOT_MINUTES} phút\n`)

  const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
  const found = await findCinema(adminCookie, CINEMA_NAME)
  if (!found?.id) throw new Error(`Không tìm thấy rạp "${CINEMA_NAME}"`)

  const cinema = await getCinema(adminCookie, found.id)
  console.log(`Rạp: ${cinema.name} (${cinema.id})`)

  await assignManager(adminCookie, cinema, MANAGER_ID)

  const managerCookie = await login(MANAGER_EMAIL, MANAGER_PASSWORD)

  const halls = await fetchHalls(managerCookie, cinema.id)
  const films = await fetchNowShowingFilms(managerCookie)
  const pricingPolicyId = await fetchPricingPolicyId(managerCookie, cinema.id)

  if (!halls.length) throw new Error('Không có phòng chiếu ACTIVE')
  if (!films.length) throw new Error('Không có phim NOW_SHOWING')

  console.log(`Phòng: ${halls.length} — ${halls.map((h) => h.name).join(', ')}`)
  console.log(`Phim đang chiếu: ${films.length}`)
  console.log(`Chính sách giá: ${pricingPolicyId}\n`)

  const days = [...eachDayInclusive(RANGE_START, RANGE_END)]
  let okBatches = 0
  let failBatches = 0
  let totalShowtimes = 0
  let dayIndex = 0

  for (const day of days) {
    dayIndex += 1
    const dateLabel = toApiDateTime(day, '00:00:00').slice(0, 10)

    for (let h = 0; h < halls.length; h += 1) {
      const hall = halls[h]
      for (let s = 0; s < DAY_SLOT_TIMES.length; s += 1) {
        const film = films[(dayIndex + h + s) % films.length]
        const start = toApiDateTime(day, DAY_SLOT_TIMES[s])
        const end = addMinutes(start, SLOT_MINUTES)

        const result = await createShowtimeBatch(managerCookie, {
          hallId: hall.id,
          filmId: film.id,
          pricingPolicyId,
          start,
          end,
        })

        if (result.ok && result.created > 0) {
          okBatches += 1
          totalShowtimes += result.created
        } else {
          failBatches += 1
          const past =
            typeof result.message === 'string' &&
            result.message.includes('tương lai')
          if (past) continue
          if (failBatches <= 15) {
            const title = film.title || film.name || film.id
            console.log(
              `[FAIL] ${dateLabel} ${hall.name} ${DAY_SLOT_TIMES[s]} — ${title}: ${result.message}`,
            )
          }
        }

        if (REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS)
      }
    }

    if (dayIndex % 7 === 0 || dayIndex === days.length) {
      console.log(
        `… tiến độ ${dayIndex}/${days.length} ngày — ${totalShowtimes} suất, ${okBatches} lô OK, ${failBatches} lô lỗi`,
      )
    }
  }

  console.log(
    `\nXong: ${totalShowtimes} suất chiếu (${okBatches} lô OK, ${failBatches} lô lỗi/trùng)`,
  )
  console.log(
    `Phạm vi: ${days.length} ngày × ${halls.length} phòng × ${DAY_SLOT_TIMES.length} khung`,
  )
  if (failBatches > 0 && okBatches === 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e.message || e)
  process.exitCode = 1
})
