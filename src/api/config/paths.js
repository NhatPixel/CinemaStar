function pathUnderPrefix(prefix, segment) {
  const p = String(prefix).replace(/\/+$/, '')
  const s = String(segment ?? '').replace(/^\/+/, '')
  if (!s) return p
  return `${p}/${s}`
}

export const AUTH_PREFIX = '/auth'
export const FILMS_PREFIX = '/films'
export const USERS_PREFIX = '/users'
export const CINEMAS_PREFIX = '/cinemas'
export const HALLS_PREFIX = '/halls'
export const SHOWTIMES_PREFIX = '/showtimes'
export const PAYMENTS_PREFIX = '/payments'
export const BOOKINGS_PREFIX = '/bookings'

export function authPath(segment) {
  return pathUnderPrefix(AUTH_PREFIX, segment)
}

export function filmPath(segment) {
  return pathUnderPrefix(FILMS_PREFIX, segment)
}

export function userPath(segment) {
  return pathUnderPrefix(USERS_PREFIX, segment)
}

export function cinemaPath(segment) {
  return pathUnderPrefix(CINEMAS_PREFIX, segment)
}

export function hallPath(segment) {
  return pathUnderPrefix(HALLS_PREFIX, segment)
}

export function showtimePath(segment) {
  return pathUnderPrefix(SHOWTIMES_PREFIX, segment)
}

export function paymentPath(segment) {
  return pathUnderPrefix(PAYMENTS_PREFIX, segment)
}

export function bookingPath(segment) {
  return pathUnderPrefix(BOOKINGS_PREFIX, segment)
}
