export const AUTH_COOKIE_STORAGE_KEY = 'Cookie'

export function getStoredAuthCookie() {
  return localStorage.getItem(AUTH_COOKIE_STORAGE_KEY)
}

export function buildCookieHeaders() {
  const cookie = getStoredAuthCookie()
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
