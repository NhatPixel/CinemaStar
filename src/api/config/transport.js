import { buildCookieHeaders } from '../../utils/authCookieStorage'
import { authPath } from './paths'

/**
 * Dev: `/api` qua Vite proxy (cookie HttpOnly trên localhost → chatbot nhận được).
 * Prod: URL thật (không đổi).
 */
export const BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CINEMA_API_BASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.DEV
    ? '/api'
    : 'https://cinema-api.duckdns.org/api')

export async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  let payload
  try {
    payload = isJson ? await response.json() : await response.text()
  } catch (e) {
    payload = null
  }

  if (!response.ok) {
    const error = {
      status: response.status,
      message: (payload && (payload.message || payload.desc)) || 'Yêu cầu thất bại, vui lòng thử lại sau',
      code: payload && payload.code,
      raw: payload,
    }
    throw error
  }

  return payload
}

export const thirdPartyFetchDefaults = {
  skipAuthHeaders: true,
  skipCookieHeaders: true,
  skipAuthRefresh: true,
  credentials: 'omit',
}

/**
 * @param {string} url
 * @param {RequestInit & {
 *   skipAuthHeaders?: boolean
 *   skipCookieHeaders?: boolean
 *   skipAuthRefresh?: boolean
 * }} options
 */

export async function request(url, options = {}) {
  const {
    skipAuthHeaders = false,
    skipCookieHeaders = false,
    skipAuthRefresh,
    credentials = 'include',
    ...fetchOpts
  } = options
  const finalUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`

  const method = String(fetchOpts.method || 'GET').toUpperCase()
  const hasBody =
    fetchOpts.body != null &&
    fetchOpts.body !== '' &&
    method !== 'GET' &&
    method !== 'HEAD'

  const headers = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(skipCookieHeaders ? {} : buildCookieHeaders()),
    ...(fetchOpts.headers || {}),
  }

  const mergedOptions = {
    method: 'GET',
    credentials,
    ...fetchOpts,
    headers,
  }

  return fetch(finalUrl, mergedOptions)
}

export async function callApiRaw({ url, options = {} }) {
  const response = await request(url, options)
  return parseResponse(response)
}

export function buildGet(url, params) {
  if (!params || Object.keys(params).length === 0) {
    return { url, options: { method: 'GET' } }
  }

  const qs = new URLSearchParams(params).toString()
  const fullUrl = `${url}?${qs}`

  return {
    url: fullUrl,
    options: { method: 'GET' },
  }
}

export function buildPost(url, body) {
  return {
    url,
    options: {
      method: 'POST',
      body: JSON.stringify(body || {}),
    },
  }
}

export function buildPut(url, body) {
  return {
    url,
    options: {
      method: 'PUT',
      body: JSON.stringify(body || {}),
    },
  }
}

export function buildPatch(url, body) {
  return {
    url,
    options: {
      method: 'PATCH',
      body: JSON.stringify(body || {}),
    },
  }
}

export function buildDelete(url, body) {
  const options = { method: 'DELETE' }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }
  return {
    url,
    options,
  }
}

const REFRESH_URL = authPath('refresh_token')

let refreshInFlight = null

/** Called from `client` on 401 — does not import `client` to avoid circular dependency. */
export async function refreshAccessToken() {
  if (refreshInFlight) {
    return refreshInFlight
  }
  refreshInFlight = (async () => {
    try {
      const { url, options } = buildPost(REFRESH_URL, {})
      const resp = await callApiRaw({
        url,
        options: {
          ...options,
          skipAuthHeaders: true,
          skipAuthRefresh: true,
        },
      })
      if (resp?.success) {
        return true
      }
      return false
    } catch {
      return false
    }
  })().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}
