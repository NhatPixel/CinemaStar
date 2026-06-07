import { AUTH_COOKIE_STORAGE_KEY } from './authCookieStorage'
import { notifyChatUserChanged } from './chatMessageStorage'

const USER_STORAGE_KEY = 'currentUser'

const AUTH_PUBLIC_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/verify-otp',
  '/auth/callback',
])

let authSessionRedirecting = false

export function isAuthSessionRedirecting() {
  return authSessionRedirecting
}

export function resetAuthSessionRedirecting() {
  authSessionRedirecting = false
}

export function isAuthSessionExpiredError(err) {
  return err?.authSessionExpired === true
}

function clearLocalAuthState() {
  localStorage.removeItem(USER_STORAGE_KEY)
  localStorage.removeItem(AUTH_COOKIE_STORAGE_KEY)
  notifyChatUserChanged()
}

/** Refresh token hết hạn / thất bại — về login, không toast. */
export function redirectToLoginOnAuthFailure() {
  if (typeof window === 'undefined') return
  if (authSessionRedirecting) return

  const path = window.location.pathname || ''
  if (AUTH_PUBLIC_PATHS.has(path)) return

  authSessionRedirecting = true
  clearLocalAuthState()

  const from = `${path}${window.location.search || ''}`
  const next =
    from && from !== '/login'
      ? `/login?from=${encodeURIComponent(from)}`
      : '/login'

  window.location.replace(next)
}

export function createAuthSessionExpiredError() {
  return {
    status: 401,
    authSessionExpired: true,
    message: '',
  }
}
