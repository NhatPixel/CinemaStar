/**
 * Tạo sản phẩm bắp nước / combo (tên hiển thị thực tế, không seed/mock).
 *
 * node test/seed-products.mjs
 *
 * Tuỳ chọn: API_BASE_URL, MANAGER_EMAIL, MANAGER_PASSWORD,
 * CINEMA_ID, CINEMA_IDS (uuid, phẩy), ALL_MANAGER_CINEMAS=1
 */

const API_BASE_URL = (
  process.env.API_BASE_URL || 'https://cinema-api.duckdns.org/api'
).replace(/\/+$/, '')
const MANAGER_EMAIL = String(process.env.MANAGER_EMAIL || 'manager@gmail.com').trim()
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || '12345678aA@'
const CINEMA_ID = String(process.env.CINEMA_ID || '019e9199-5a3f-7459-b901-a2b453f64287').trim()
const CINEMA_IDS = String(process.env.CINEMA_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const ALL_MANAGER_CINEMAS = ['1', 'true', 'yes'].includes(
  String(process.env.ALL_MANAGER_CINEMAS || '').toLowerCase(),
)

const PRODUCT_TYPE_IMAGE_URL = {
  COMBO:
    'https://cellphones.com.vn/sforum/wp-content/uploads/2023/07/gia-bap-nuoc-cgv-1.jpg',
  POPCORN:
    'https://cellphones.com.vn/sforum/wp-content/uploads/2022/12/Cover-bap-CGV.jpg',
  DRINK:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Pepsi_can.jpg/640px-Pepsi_can.jpg',
  SNACK:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Frankfurter_Wuerstchen.jpg/640px-Frankfurter_Wuerstchen.jpg',
}

function imageUrlForItem(item) {
  const n = String(item.name || '').toLowerCase()
  if (/combo/i.test(n)) return PRODUCT_TYPE_IMAGE_URL.COMBO
  if (/bắp|bap|popcorn/i.test(n)) return PRODUCT_TYPE_IMAGE_URL.POPCORN
  if (/coca|pepsi|nước|nuoc|trà|tra |cà phê|ca phe|red bull|suối|suoi/i.test(n)) {
    return PRODUCT_TYPE_IMAGE_URL.DRINK
  }
  if (/hot dog|khoai|sandwich|kẹo|keo|bánh|banh|snack|xúc xích|xuc xich/i.test(n)) {
    return PRODUCT_TYPE_IMAGE_URL.SNACK
  }
  return PRODUCT_TYPE_IMAGE_URL[item.type] || PRODUCT_TYPE_IMAGE_URL.COMBO
}

const PRODUCT_CATALOG = [
  {
    name: 'Bắp rang bơ mặn (cỡ lớn)',
    type: 'POPCORN',
    price: 45000,
    description: 'Bắp rang giòn, bơ mặn vừa phải — phù hợp xem phim cùng bạn bè.',
  },
  {
    name: 'Bắp caramel ngọt',
    type: 'POPCORN',
    price: 48000,
    description: 'Lớp caramel thơm, vị ngọt dịu, không quá gắt.',
  },
  {
    name: 'Bắp phô mai',
    type: 'POPCORN',
    price: 52000,
    description: 'Bắp nóng rắc bột phô mai, thích hợp fan vị béo.',
  },
  {
    name: 'Bắp rang bơ (cỡ vừa)',
    type: 'POPCORN',
    price: 35000,
    description: 'Khẩu phần vừa cho một người hoặc chia đôi.',
  },
  {
    name: 'Bắp socola',
    type: 'POPCORN',
    price: 50000,
    description: 'Bắp phủ sốt socola đen, hương thơm nhẹ.',
  },
  {
    name: 'Bắp mix vị mặn ngọt',
    type: 'POPCORN',
    price: 55000,
    description: 'Kết hợp bơ mặn và caramel trong cùng một túi.',
  },
  {
    name: 'Coca-Cola lon 320ml',
    type: 'DRINK',
    price: 25000,
    description: 'Nước ngọt có gas, phục vụ lạnh.',
  },
  {
    name: 'Pepsi lon 320ml',
    type: 'DRINK',
    price: 25000,
    description: 'Nước ngọt có gas, phục vụ lạnh.',
  },
  {
    name: 'Trà đào cam sả',
    type: 'DRINK',
    price: 35000,
    description: 'Trà trái cây thanh mát, ít ngọt.',
  },
  {
    name: 'Nước suối Aquafina 500ml',
    type: 'DRINK',
    price: 15000,
    description: 'Nước khoáng đóng chai, uống mát lạnh.',
  },
  {
    name: 'Trà sữa trân châu đường đen',
    type: 'DRINK',
    price: 45000,
    description: 'Trà sữa Đài Loan, trân châu dai vừa.',
  },
  {
    name: 'Red Bull 250ml',
    type: 'DRINK',
    price: 30000,
    description: 'Nước tăng lực, phù hợp suất chiếu đêm.',
  },
  {
    name: 'Cà phê đen đá',
    type: 'DRINK',
    price: 28000,
    description: 'Cà phê pha phin, phục vụ đá viên.',
  },
  {
    name: 'Bạc xỉu đá',
    type: 'DRINK',
    price: 32000,
    description: 'Cà phê sữa đặc, vị ngọt nhẹ.',
  },
  {
    name: 'Hot dog xúc xích',
    type: 'SNACK',
    price: 38000,
    description: 'Bánh mì kẹp xúc xích, sốt mayonnaise và tương cà.',
  },
  {
    name: 'Khoai tây chiên',
    type: 'SNACK',
    price: 35000,
    description: 'Khoai chiên giòn, kèm tương cà hoặc sốt mayonnaise.',
  },
  {
    name: 'Bánh gạo Nori vị tôm',
    type: 'SNACK',
    price: 22000,
    description: 'Gói bánh gạo giòn, vị biển nhẹ.',
  },
  {
    name: 'Kẹo M&M socola',
    type: 'SNACK',
    price: 28000,
    description: 'Gói kẹo socola sữa, ăn kèm khi xem phim.',
  },
  {
    name: 'Xúc xích xiên nướng',
    type: 'SNACK',
    price: 32000,
    description: 'Xúc xích nóng, rắc tương ớt và mayonnaise.',
  },
  {
    name: 'Sandwich gà phô mai',
    type: 'SNACK',
    price: 42000,
    description: 'Bánh mì kẹp thịt gà, rau xà lách, phô mai.',
  },
  {
    name: 'Combo đôi: bắp vừa + 2 nước ngọt',
    type: 'COMBO',
    price: 89000,
    description: 'Một bắp cỡ vừa và hai lon Coca-Cola hoặc Pepsi (tuỳ kho).',
  },
  {
    name: 'Combo gia đình',
    type: 'COMBO',
    price: 165000,
    description: 'Bắp cỡ lớn, bốn nước ngọt và một khoai tây chiên.',
  },
  {
    name: 'Combo học sinh',
    type: 'COMBO',
    price: 48000,
    description: 'Bắp cỡ vừa và một chai nước suối — giá ưu đãi.',
  },
  {
    name: 'Combo couple caramel',
    type: 'COMBO',
    price: 125000,
    description: 'Bắp caramel và hai ly trà đào cam sả.',
  },
  {
    name: 'Combo VIP',
    type: 'COMBO',
    price: 145000,
    description: 'Bắp phô mai, sandwich gà và hai Coca-Cola lon.',
  },
  {
    name: 'Combo suất sớm',
    type: 'COMBO',
    price: 58000,
    description: 'Bắp cỡ vừa và một cà phê đen đá — dành suất trước 12h.',
  },
  {
    name: 'Combo cuối tuần',
    type: 'COMBO',
    price: 135000,
    description: 'Bắp cỡ lớn, hot dog và hai Pepsi lon.',
  },
  {
    name: 'Combo đêm khuya',
    type: 'COMBO',
    price: 95000,
    description: 'Bắp mix vị và một lon Red Bull.',
  },
]

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

async function loginManager() {
  const { response, payload, setCookies = [] } = await apiRequest('POST', '/auth/login', {
    email: MANAGER_EMAIL,
    password: MANAGER_PASSWORD,
  })
  const cookie = cookieHeaderFromSetCookies(setCookies)
  if (!response.ok || payload?.success === false || !cookie.includes('accessToken')) {
    throw new Error(payload?.message || 'Không đăng nhập manager')
  }
  return cookie
}

async function resolveCinemaIds(managerCookie) {
  if (CINEMA_IDS.length) return CINEMA_IDS
  if (!ALL_MANAGER_CINEMAS && CINEMA_ID) return [CINEMA_ID]

  const { response, payload } = await apiRequest(
    'POST',
    '/cinemas/me/search',
    { page: 1, size: 50, keyword: '', filterBy: [], sortBy: [] },
    { cookie: managerCookie },
  )
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Không tải rạp của manager')
  }
  const ids = (payload?.data?.data || []).map((c) => c.id).filter(Boolean)
  if (ids.length) return ids
  if (CINEMA_ID) return [CINEMA_ID]
  throw new Error('Manager chưa được gán rạp. Gán rạp trên UI hoặc set CINEMA_ID.')
}

async function existingNames(managerCookie, cinemaId) {
  const names = new Set()
  for (let page = 1; page <= 20; page += 1) {
    const { response, payload } = await apiRequest(
      'POST',
      `/bookings/products/cinemas/${cinemaId}/search`,
      { page, size: 50, keyword: '', filterBy: [], sortBy: [] },
      { cookie: managerCookie },
    )
    if (!response.ok || payload?.success === false) break
    for (const p of payload?.data?.data || []) {
      names.add(String(p.name || '').trim().toLowerCase())
    }
    if (!payload?.data?.hasNext) break
  }
  return names
}

async function createProduct(managerCookie, cinemaId, item) {
  const body = {
    cinemaId,
    name: item.name,
    type: item.type,
    price: item.price,
    description: item.description,
    imageUrl: imageUrlForItem(item),
    status: 'ACTIVE',
  }
  const { response, payload } = await apiRequest('POST', '/bookings/products', body, {
    cookie: managerCookie,
  })
  const ok = response.ok && payload?.success !== false
  console.log(
    `[${ok ? 'OK' : 'FAIL'}] ${item.name} (${item.type}, ${item.price.toLocaleString('vi-VN')}đ) — ${payload?.message || response.statusText}`,
  )
  if (!ok && payload) console.error('  ', JSON.stringify(payload))
  return ok
}

async function main() {
  console.log(`API: ${API_BASE_URL}`)
  console.log(`Manager: ${MANAGER_EMAIL}`)
  console.log(`Danh mục: ${PRODUCT_CATALOG.length} sản phẩm\n`)

  const managerCookie = await loginManager()
  const cinemaIds = await resolveCinemaIds(managerCookie)
  console.log(`Rạp (${cinemaIds.length}): ${cinemaIds.join(', ')}\n`)

  let ok = 0
  let fail = 0
  let skip = 0

  for (const cinemaId of cinemaIds) {
    const taken = await existingNames(managerCookie, cinemaId)
    console.log(`--- Rạp ${cinemaId} ---`)

    for (const item of PRODUCT_CATALOG) {
      const key = item.name.trim().toLowerCase()
      if (taken.has(key)) {
        console.log(`[SKIP] ${item.name} — đã có`)
        skip += 1
        continue
      }
      if (await createProduct(managerCookie, cinemaId, item)) {
        ok += 1
        taken.add(key)
      } else fail += 1
    }
    console.log('')
  }

  console.log(`Xong: ${ok} OK, ${fail} FAIL, ${skip} bỏ qua (trùng tên)`)
  if (fail > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e.message || e)
  process.exitCode = 1
})
