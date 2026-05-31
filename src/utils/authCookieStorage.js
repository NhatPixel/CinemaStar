export const AUTH_COOKIE_STORAGE_KEY = 'Cookie'

function parseCookiePairs(raw) {
  const map = {}
  if (!raw) return map
  for (const part of String(raw).split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const name = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    if (name && value) map[name] = value
  }
  return map
}

function formatAuthCookie(pairs) {
  if (!pairs?.accessToken) return null
  const parts = [`accessToken=${pairs.accessToken}`]
  if (pairs.refreshToken) parts.push(`refreshToken=${pairs.refreshToken}`)
  return parts.join('; ')
}

export function getStoredAuthCookie() {
  return localStorage.getItem(AUTH_COOKIE_STORAGE_KEY)
}

/**
 * Cookie để gọi chatbot (cross-origin): localStorage trước, sau đó document.cookie.
 * Format: accessToken=...; refreshToken=...
 */
export function getAuthCookieForForward() {
  const stored = getStoredAuthCookie()
  if (stored?.trim()) {
    return stored.trim()
  }

  if (typeof document !== 'undefined' && document.cookie) {
    const fromBrowser = formatAuthCookie(parseCookiePairs(document.cookie))
    if (fromBrowser) {
      localStorage.setItem(AUTH_COOKIE_STORAGE_KEY, fromBrowser)
      return fromBrowser
    }
  }

  return null
}

export function buildCookieHeaders() {
  const cookie = getAuthCookieForForward()
  return cookie ? { Cookie: cookie } : {}
}

export function persistCookieHeaderFromResponse(response) {
  if (!response?.headers) return
  const raw =
    response.headers.get('cookie') ||
    response.headers.get('set-cookie') ||
    response.headers.get('x-set-cookie')
  if (!raw) return
  localStorage.setItem(AUTH_COOKIE_STORAGE_KEY, raw)
}
