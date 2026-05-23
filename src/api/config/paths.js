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
