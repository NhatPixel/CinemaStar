const LEAFLET_VERSION = '1.9.4'
const LEAFLET_JS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
const LEAFLET_CSS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`
const LEAFLET_ICONS_BASE = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/images`

let pendingLoader = null

function ensureStylesheet(href) {
  if (typeof document === 'undefined') return
  if (document.querySelector(`link[data-leaflet="true"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.leaflet = 'true'
  document.head.appendChild(link)
}

function applyDefaultIcons(L) {
  if (L.Icon.Default.prototype && L.Icon.Default.prototype._getIconUrl) {
    delete L.Icon.Default.prototype._getIconUrl
  }
  L.Icon.Default.imagePath = ''
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: `${LEAFLET_ICONS_BASE}/marker-icon-2x.png`,
    iconUrl: `${LEAFLET_ICONS_BASE}/marker-icon.png`,
    shadowUrl: `${LEAFLET_ICONS_BASE}/marker-shadow.png`,
  })
}

/**
 * Load Leaflet JS (dùng OpenStreetMap tiles). Không cần API key.
 * @returns {Promise<typeof window.L>}
 */
export function loadLeaflet() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Không thể tải bản đồ ở môi trường này'))
  }
  ensureStylesheet(LEAFLET_CSS_URL)
  if (window.L) {
    applyDefaultIcons(window.L)
    return Promise.resolve(window.L)
  }
  if (pendingLoader) return pendingLoader

  pendingLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = LEAFLET_JS_URL
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.L) {
        applyDefaultIcons(window.L)
        resolve(window.L)
      } else {
        pendingLoader = null
        reject(new Error('Không tải được Leaflet'))
      }
    }
    script.onerror = () => {
      pendingLoader = null
      reject(new Error('Không tải được Leaflet'))
    }
    document.head.appendChild(script)
  })

  return pendingLoader
}

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors'

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'

/**
 * Tìm địa chỉ bằng Nominatim (OpenStreetMap), giống thanh search trên openstreetmap.org.
 * Free, không cần API key. Trang OSM dùng `format=jsonv2&accept-language=...`.
 * @param {string} query
 * @param {{ signal?: AbortSignal, limit?: number, countryCodes?: string }} [opts]
 * @returns {Promise<Array<{ lat: number, lng: number, displayName: string, name: string, type: string, raw: any }>>}
 */
export async function searchPlaces(query, { signal, limit = 8, countryCodes } = {}) {
  const q = String(query || '').trim()
  if (!q) return []

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(limit),
    'accept-language': 'vi,en',
  })
  if (countryCodes) params.set('countrycodes', countryCodes)

  const url = `${NOMINATIM_SEARCH_URL}?${params.toString()}`

  let resp
  try {
    resp = await fetch(url, { signal })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new Error('Không kết nối được máy chủ OpenStreetMap (lỗi mạng)')
  }

  if (!resp.ok) {
    if (resp.status === 429) {
      throw new Error('Tra cứu quá nhanh, vui lòng thử lại sau vài giây')
    }
    throw new Error(`Không tìm được địa chỉ (HTTP ${resp.status})`)
  }

  let items
  try {
    items = await resp.json()
  } catch (_e) {
    throw new Error('Phản hồi OpenStreetMap không hợp lệ')
  }
  if (!Array.isArray(items)) return []

  return items
    .map((it) => {
      const lat = Number(it?.lat)
      const lng = Number(it?.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return {
        lat,
        lng,
        displayName: String(it?.display_name || ''),
        name: String(it?.name || ''),
        type: String(it?.type || ''),
        raw: it,
      }
    })
    .filter(Boolean)
}

/**
 * Lấy vị trí hiện tại của trình duyệt (Geolocation API).
 * @returns {Promise<{ lat: number, lng: number, accuracy: number }>}
 */
export function getCurrentPosition({ timeout = 10000, highAccuracy = true } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ Geolocation'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
        const code = err?.code
        if (code === 1) {
          reject(new Error('Bạn cần cho phép truy cập vị trí trong trình duyệt'))
        } else if (code === 3) {
          reject(new Error('Lấy vị trí hiện tại quá lâu, thử lại nhé'))
        } else {
          reject(new Error(err?.message || 'Không lấy được vị trí hiện tại'))
        }
      },
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: 60000 },
    )
  })
}
