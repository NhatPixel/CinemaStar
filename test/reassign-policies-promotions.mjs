/**
 * Chuyển chính sách giá + mã khuyến mãi sang CinemaStar Lê Văn Việt.
 * node test/reassign-policies-promotions.mjs
 */

const API_BASE_URL = (
  process.env.API_BASE_URL || 'https://cinema-api.duckdns.org/api'
).replace(/\/+$/, '')
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'admin@gmail.com').trim()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345678aA@'
const MANAGER_EMAIL = String(process.env.MANAGER_EMAIL || 'manager@gmail.com').trim()
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || '12345678aA@'
const MANAGER_ID = process.env.MANAGER_ID || '019e335d-d3a6-7916-b151-b32f6fe41fa4'
const TARGET_CINEMA_NAME = process.env.TARGET_CINEMA_NAME || 'CinemaStar Lê Văn Việt'
const TARGET_CINEMA_ID =
  process.env.TARGET_CINEMA_ID || '019e53ee-c8c0-7525-882e-5115fe6a62c3'
const SOURCE_CINEMA_ID =
  process.env.SOURCE_CINEMA_ID || '019e9199-5a3f-7459-b901-a2b453f64287'

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

async function getCinema(adminCookie, id) {
  const { response, payload } = await apiRequest('GET', `/cinemas/${id}`, null, {
    cookie: adminCookie,
  })
  if (!response.ok || payload?.success === false) throw new Error(payload?.message)
  return payload?.data
}

async function assignManager(adminCookie, cinemaId, managerId) {
  const cinema = await getCinema(adminCookie, cinemaId)
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
  const { response, payload } = await apiRequest('PUT', `/cinemas/${cinemaId}`, body, {
    cookie: adminCookie,
  })
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `Không gán manager cho ${cinema.name}`)
  }
}

async function searchPricing(adminCookie, cinemaId) {
  const all = []
  for (let page = 1; page <= 20; page += 1) {
    const { response, payload } = await apiRequest(
      'POST',
      '/showtimes/pricing-policies/search',
      {
        page,
        size: 50,
        keyword: '',
        filterBy: cinemaId
          ? [{ field: 'CINEMA_ID', operator: 'EQ', value: cinemaId }]
          : [],
        sortBy: [],
      },
      { cookie: adminCookie },
    )
    if (!response.ok || payload?.success === false) break
    all.push(...(payload?.data?.data || []))
    if (!payload?.data?.hasNext) break
  }
  return all
}

async function searchPromotions(adminCookie) {
  const all = []
  for (let page = 1; page <= 20; page += 1) {
    const { response, payload } = await apiRequest(
      'POST',
      '/promotions/search',
      { page, size: 50, keyword: '', filterBy: [], sortBy: [] },
      { cookie: adminCookie },
    )
    if (!response.ok || payload?.success === false) break
    all.push(...(payload?.data?.data || []))
    if (!payload?.data?.hasNext) break
  }
  return all
}

async function getPromotion(adminCookie, id) {
  const { response, payload } = await apiRequest('GET', `/promotions/${id}`, null, {
    cookie: adminCookie,
  })
  if (!response.ok || payload?.success === false) throw new Error(payload?.message)
  return payload?.data
}

function fmtDateTime(v) {
  if (!v) return ''
  const s = String(v)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) return s.slice(0, 19)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return `${s}:00`
  return s
}

async function updatePromotionCinema(adminCookie, promo) {
  const detail = await getPromotion(adminCookie, promo.id)
  const body = {
    code: detail.code,
    name: detail.name,
    description: detail.description || '',
    discountType: detail.discountType,
    discountValue: detail.discountValue,
    minOrderAmount: detail.minOrderAmount,
    maxDiscountAmount: detail.maxDiscountAmount,
    startAt: fmtDateTime(detail.startAt),
    endAt: fmtDateTime(detail.endAt),
    status: detail.status,
    cinemaIds: [TARGET_CINEMA_ID],
    filmIds: detail.filmIds || [],
  }
  const { response, payload } = await apiRequest('PUT', `/promotions/${promo.id}`, body, {
    cookie: adminCookie,
  })
  return response.ok && payload?.success !== false
}

async function createPricing(managerCookie, policy) {
  const body = {
    cinemaId: TARGET_CINEMA_ID,
    name: policy.name,
    standardPrice: policy.standardPrice,
    vipPrice: policy.vipPrice,
    couplePrice: policy.couplePrice,
  }
  const { response, payload } = await apiRequest(
    'POST',
    '/showtimes/pricing-policies',
    body,
    { cookie: managerCookie },
  )
  return response.ok && payload?.success !== false
}

async function deletePricing(managerCookie, id) {
  const { response, payload } = await apiRequest(
    'DELETE',
    `/showtimes/pricing-policies/${id}`,
    null,
    { cookie: managerCookie },
  )
  return response.ok && payload?.success !== false
}

function isDuplicateName(name) {
  return /\(\s*2\s*\)\s*$/i.test(String(name || '').trim())
}

async function main() {
  console.log(`API: ${API_BASE_URL}`)
  console.log(`Rạp đích: ${TARGET_CINEMA_NAME} (${TARGET_CINEMA_ID})\n`)

  const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
  await assignManager(adminCookie, TARGET_CINEMA_ID, MANAGER_ID)
  const managerCookie = await login(MANAGER_EMAIL, MANAGER_PASSWORD)

  // --- Mã khuyến mãi ---
  console.log('=== Mã khuyến mãi ===')
  const promos = await searchPromotions(adminCookie)
  let promoOk = 0
  let promoSkip = 0
  let promoFail = 0

  for (const p of promos) {
    const ids = (p.cinemaIds || []).map(String)
    if (ids.length === 1 && ids[0] === TARGET_CINEMA_ID) {
      console.log(`[SKIP] ${p.code} — đã thuộc Lê Văn Việt`)
      promoSkip += 1
      continue
    }
    if (await updatePromotionCinema(adminCookie, p)) {
      console.log(`[OK] ${p.code} → Lê Văn Việt`)
      promoOk += 1
    } else {
      console.log(`[FAIL] ${p.code}`)
      promoFail += 1
    }
  }

  // --- Chính sách giá ---
  console.log('\n=== Chính sách giá ===')
  const sourcePolicies = await searchPricing(adminCookie, SOURCE_CINEMA_ID)
  const targetPolicies = await searchPricing(adminCookie, TARGET_CINEMA_ID)
  const targetNames = new Set(
    targetPolicies.map((p) => String(p.name || '').trim().toLowerCase()),
  )

  const toCopy = sourcePolicies.filter((p) => !isDuplicateName(p.name))
  let createOk = 0
  let createSkip = 0
  let createFail = 0

  for (const policy of toCopy) {
    const key = String(policy.name || '').trim().toLowerCase()
    if (targetNames.has(key)) {
      console.log(`[SKIP] Đã có: ${policy.name}`)
      createSkip += 1
      continue
    }
    if (await createPricing(managerCookie, policy)) {
      console.log(`[OK] Tạo: ${policy.name}`)
      targetNames.add(key)
      createOk += 1
    } else {
      console.log(`[FAIL] Tạo: ${policy.name}`)
      createFail += 1
    }
  }

  // Xóa policy ở rạp cũ (cần manager được gán rạp cũ)
  console.log('\nXóa chính sách giá ở rạp cũ (Quận 1)...')
  await assignManager(adminCookie, SOURCE_CINEMA_ID, MANAGER_ID)
  const managerSourceCookie = await login(MANAGER_EMAIL, MANAGER_PASSWORD)
  let delOk = 0
  let delFail = 0
  for (const policy of sourcePolicies) {
    if (await deletePricing(managerSourceCookie, policy.id)) {
      delOk += 1
    } else {
      console.log(`[DEL FAIL] ${policy.name} (có thể đang gắn suất chiếu)`)
      delFail += 1
    }
  }
  await assignManager(adminCookie, TARGET_CINEMA_ID, MANAGER_ID)

  console.log('\n--- Tóm tắt ---')
  console.log(`KM: ${promoOk} cập nhật, ${promoSkip} bỏ qua, ${promoFail} lỗi`)
  console.log(`Giá: ${createOk} tạo mới, ${createSkip} đã có, ${createFail} lỗi tạo`)
  console.log(`Giá (rạp cũ): ${delOk} xóa, ${delFail} không xóa được`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exitCode = 1
})
