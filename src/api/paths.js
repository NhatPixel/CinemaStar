function pathUnderPrefix(prefix, segment) {
  const p = String(prefix).replace(/\/+$/, '')
  const s = String(segment).replace(/^\/+/, '')
  return `${p}/${s}`
}

export const AUTH_PREFIX = '/auth'
export const FILMS_PREFIX = '/films'

export function authPath(segment) {
  return pathUnderPrefix(AUTH_PREFIX, segment)
}

export function filmPath(segment) {
  return pathUnderPrefix(FILMS_PREFIX, segment)
}
