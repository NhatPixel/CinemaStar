export const AUTH_PREFIX = '/auth'

export function authPath(segment) {
  const s = String(segment).replace(/^\/+/, '')
  return `${AUTH_PREFIX}/${s}`
}
