import { buildCookieHeaders } from '../utils/authCookieStorage'

export const BASE_URL = 'http://localhost/api'

const ACCESS_TOKEN_STORAGE_KEY = 'accessToken'

export function buildAuthHeaders() {
  const headers = {}
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

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

/**
 * @param {string} url
 * @param {RequestInit & { skipAuthHeaders?: boolean; skipAuthRefresh?: boolean }} options
 */

export async function request(url, options = {}) {
  const { skipAuthHeaders = false, skipAuthRefresh, ...fetchOpts } = options
  const finalUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`

  const mergedOptions = {
    method: 'GET',
    credentials: 'include',
    ...fetchOpts,
    headers: {
      'Content-Type': 'application/json',
      ...buildCookieHeaders(),
      ...(skipAuthHeaders ? {} : buildAuthHeaders()),
      ...(fetchOpts.headers || {}),
    },
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
