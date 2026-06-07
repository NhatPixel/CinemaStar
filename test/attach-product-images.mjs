/**
 * Gán imageUrl thật cho sản phẩm đã có (manager).
 * node test/attach-product-images.mjs
 */

const API_BASE_URL = (
  process.env.API_BASE_URL || 'https://cinema-api.duckdns.org/api'
).replace(/\/+$/, '')
const MANAGER_EMAIL = String(process.env.MANAGER_EMAIL || 'manager@gmail.com').trim()
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || '12345678aA@'

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

function resolveImageUrl(product) {
  const direct = String(product.imageUrl || '').trim()
  if (direct) return direct
  const n = String(product.name || '').toLowerCase()
  if (/combo/i.test(n)) return PRODUCT_TYPE_IMAGE_URL.COMBO
  if (/bắp|bap|popcorn/i.test(n)) return PRODUCT_TYPE_IMAGE_URL.POPCORN
  if (/coca|pepsi|nước|nuoc|trà|tra |cà phê|ca phe|red bull|suối|suoi/i.test(n)) {
    return PRODUCT_TYPE_IMAGE_URL.DRINK
  }
  if (/hot dog|khoai|sandwich|kẹo|keo|bánh|banh|snack|xúc xích|xuc xich/i.test(n)) {
    return PRODUCT_TYPE_IMAGE_URL.SNACK
  }
  const t = String(product.type || '').toUpperCase()
  return PRODUCT_TYPE_IMAGE_URL[t] || PRODUCT_TYPE_IMAGE_URL.COMBO
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

async function fetchAllProducts(cookie) {
  const all = []
  for (let page = 1; page <= 50; page += 1) {
    const { response, payload } = await apiRequest(
      'POST',
      '/bookings/products/me/search',
      { page, size: 50, keyword: '', filterBy: [], sortBy: [] },
      { cookie },
    )
    if (!response.ok || payload?.success === false) break
    all.push(...(payload?.data?.data || []))
    if (!payload?.data?.hasNext) break
  }
  return all
}

async function updateProduct(cookie, product, imageUrl) {
  const body = {
    cinemaId: product.cinemaId,
    name: product.name,
    type: product.type,
    price: product.price,
    description: product.description || '',
    imageUrl,
    status: product.status || 'ACTIVE',
  }
  const { response, payload } = await apiRequest(
    'PUT',
    `/bookings/products/${product.id}`,
    body,
    { cookie },
  )
  return response.ok && payload?.success !== false
}

async function main() {
  const cookie = await loginManager()
  const products = await fetchAllProducts(cookie)
  console.log(`Sản phẩm: ${products.length}\n`)

  let ok = 0
  let skip = 0
  let fail = 0

  for (const p of products) {
    const nextUrl = resolveImageUrl(p)
    const current = String(p.imageUrl || '').trim()
    if (current === nextUrl) {
      console.log(`[SKIP] ${p.name}`)
      skip += 1
      continue
    }
    if (await updateProduct(cookie, p, nextUrl)) {
      console.log(`[OK] ${p.name}`)
      ok += 1
    } else {
      console.log(`[FAIL] ${p.name}`)
      fail += 1
    }
  }

  console.log(`\nXong: ${ok} cập nhật, ${skip} đã có ảnh, ${fail} lỗi`)
  if (fail > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e.message || e)
  process.exitCode = 1
})
