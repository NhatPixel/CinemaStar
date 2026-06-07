/**
 * Tạo mã khuyến mãi (tên hiển thị đàng hoàng, không dùng "seed").
 *
 * node test/seed-promotions.mjs
 *
 * Tuỳ chọn: API_BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, SEED_COUNT,
 * CINEMA_ID (một rạp) hoặc CINEMA_IDS (uuid cách nhau dấu phẩy)
 */

const API_BASE_URL = (
  process.env.API_BASE_URL || 'https://cinema-api.duckdns.org/api'
).replace(/\/+$/, '')
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'admin@gmail.com').trim()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345678aA@'
const SEED_COUNT = Math.max(1, Number(process.env.SEED_COUNT) || 10)
const CINEMA_ID = String(process.env.CINEMA_ID || '019e9199-5a3f-7459-b901-a2b453f64287').trim()
const CINEMA_IDS = String(process.env.CINEMA_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const PROMOTION_START = process.env.PROMOTION_START || '2026-06-01T00:00:00'
const PROMOTION_END = process.env.PROMOTION_END || '2026-12-31T23:59:59'

/** Mã + tên chương trình khuyến mãi */
const PROMOTION_TEMPLATES = [
  {
    code: 'CUOITUAN15',
    name: 'Ưu đãi cuối tuần',
    description:
      'Giảm 15% tổng hóa đơn khi đặt vé online vào thứ Bảy, Chủ nhật. Áp dụng tại các rạp CinemaStar được chọn.',
    discountType: 'PERCENT',
    discountValue: 15,
    minOrderAmount: 120000,
    maxDiscountAmount: 60000,
  },
  {
    code: 'THANTIET10',
    name: 'Khách hàng thân thiết',
    description: 'Tri ân khách quen: giảm 10% mỗi đơn, không giới hạn số lần trong thời gian chương trình.',
    discountType: 'PERCENT',
    discountValue: 10,
    minOrderAmount: 80000,
    maxDiscountAmount: 40000,
  },
  {
    code: 'SINHNHAT20',
    name: 'Sinh nhật rực rỡ',
    description: 'Giảm 20% trong tháng sinh nhật khi nhập mã tại bước thanh toán (đơn từ 150.000đ).',
    discountType: 'PERCENT',
    discountValue: 20,
    minOrderAmount: 150000,
    maxDiscountAmount: 80000,
  },
  {
    code: 'SUATSOM30',
    name: 'Suất chiếu sớm',
    description: 'Ưu đãi suất trước 12h: giảm cố định 30.000đ cho mỗi đơn đủ điều kiện.',
    discountType: 'FIXED',
    discountValue: 30000,
    minOrderAmount: 100000,
  },
  {
    code: 'SINHVIEN15',
    name: 'Ưu đãi sinh viên',
    description: 'HSSV giảm 15% khi xuất trình thẻ sinh viên tại quầy hoặc ghi chú trên đơn online.',
    discountType: 'PERCENT',
    discountValue: 15,
    minOrderAmount: 70000,
    maxDiscountAmount: 45000,
  },
  {
    code: 'GIADINH50',
    name: 'Gia đình sum vầy',
    description: 'Đặt từ 3 vé trở lên: giảm 50.000đ cho hóa đơn từ 200.000đ.',
    discountType: 'FIXED',
    discountValue: 50000,
    minOrderAmount: 200000,
  },
  {
    code: 'MOITHANHVIEN',
    name: 'Chào thành viên mới',
    description: 'Lần đặt vé đầu tiên trên tài khoản mới: giảm 20%, tối đa 70.000đ.',
    discountType: 'PERCENT',
    discountValue: 20,
    minOrderAmount: 100000,
    maxDiscountAmount: 70000,
  },
  {
    code: 'THUBA10',
    name: 'Thứ Ba vàng',
    description: 'Mỗi thứ Ba giảm 10% — ngày lý tưởng để xem phim giữa tuần.',
    discountType: 'PERCENT',
    discountValue: 10,
    minOrderAmount: 90000,
    maxDiscountAmount: 35000,
  },
  {
    code: 'GIOCHIEU35',
    name: 'Giờ vàng chiều',
    description: 'Suất chiếu từ 14h–17h: giảm 35.000đ khi thanh toán online.',
    discountType: 'FIXED',
    discountValue: 35000,
    minOrderAmount: 110000,
  },
  {
    code: 'MUAHE25',
    name: 'Tri ân mùa hè',
    description: 'Chương trình mùa hè: giảm 25% tối đa 100.000đ cho đơn từ 250.000đ.',
    discountType: 'PERCENT',
    discountValue: 25,
    minOrderAmount: 250000,
    maxDiscountAmount: 100000,
  },
]

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

async function resolveCinemaIds(adminCookie) {
  if (CINEMA_IDS.length) return CINEMA_IDS
  if (CINEMA_ID) return [CINEMA_ID]

  const { response, payload } = await apiRequest(
    'POST',
    '/cinemas/search',
    { page: 1, size: 30, keyword: 'CinemaStar', filterBy: [], sortBy: [] },
    { cookie: adminCookie },
  )
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Không tải danh sách rạp')
  }
  const ids = (payload?.data?.data || []).map((c) => c.id).filter(Boolean)
  if (!ids.length) throw new Error('Không tìm thấy rạp CinemaStar')
  return ids.slice(0, 5)
}

function buildPromotionBody(template, cinemaIds) {
  const body = {
    code: template.code,
    name: template.name,
    description: template.description,
    discountType: template.discountType,
    discountValue: template.discountValue,
    startAt: PROMOTION_START,
    endAt: PROMOTION_END,
    cinemaIds,
    filmIds: [],
  }
  if (template.minOrderAmount != null) body.minOrderAmount = template.minOrderAmount
  if (template.discountType === 'PERCENT' && template.maxDiscountAmount != null) {
    body.maxDiscountAmount = template.maxDiscountAmount
  }
  return body
}

function formatDiscount(t) {
  if (t.discountType === 'PERCENT') {
    const cap = t.maxDiscountAmount
      ? `, tối đa ${Number(t.maxDiscountAmount).toLocaleString('vi-VN')}đ`
      : ''
    return `${t.discountValue}%${cap}`
  }
  return `${Number(t.discountValue).toLocaleString('vi-VN')}đ`
}

async function createPromotion(adminCookie, template, cinemaIds, index) {
  const body = buildPromotionBody(template, cinemaIds)
  const { response, payload } = await apiRequest('POST', '/promotions', body, {
    cookie: adminCookie,
  })
  const ok = response.ok && payload?.success !== false
  console.log(
    `[${ok ? 'OK' : 'FAIL'}] #${pad(index)} ${body.code} — ${body.name} (${formatDiscount(template)})`,
  )
  if (!ok && payload) console.error('  ', JSON.stringify(payload))
  return ok
}

async function main() {
  console.log(`API: ${API_BASE_URL}`)
  console.log(`Admin: ${ADMIN_EMAIL}`)
  console.log(`Tạo ${SEED_COUNT} mã khuyến mãi\n`)

  const adminCookie = await loginAdmin()
  const cinemaIds = await resolveCinemaIds(adminCookie)
  console.log(`Rạp áp dụng (${cinemaIds.length}): ${cinemaIds.join(', ')}\n`)

  const templates = PROMOTION_TEMPLATES.slice(0, SEED_COUNT)
  let ok = 0
  let fail = 0

  for (let i = 0; i < templates.length; i += 1) {
    if (await createPromotion(adminCookie, templates[i], cinemaIds, i + 1)) ok += 1
    else fail += 1
  }

  console.log(`\nXong: ${ok} OK, ${fail} FAIL`)
  if (fail > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e.message || e)
  process.exitCode = 1
})
