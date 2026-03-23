const BASE_URL = 'http://localhost/api'

async function parseResponse(response) {
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
      message:
        (payload && (payload.message || payload.desc)) ||
        'Yêu cầu thất bại, vui lòng thử lại sau',
      code: payload && payload.code,
      raw: payload,
    }
    throw error
  }

  return payload
}

async function request(url, options = {}) {
  const finalUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`

  const defaultHeaders = {
    'Content-Type': 'application/json',
  }

  const mergedOptions = {
    method: 'GET',
    credentials: url.includes('localhost')
      ? 'include'     // 👈 chỉ gửi cookie cho backend của bạn
      : 'omit',       // 👈 API ngoài thì KHÔNG gửi
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
    ...options,
  }

  return fetch(finalUrl, mergedOptions)
}

export async function callApi({ url, options = {} }) {
  const response = await request(url, options)
  return parseResponse(response)
}

export async function callApiWithResponse({ url, options = {} }) {
  const response = await request(url, options)
  const payload = await parseResponse(response)
  return { payload, response }
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
      credentials: 'include', // 👈 BẮT BUỘC
    },
  }
}

