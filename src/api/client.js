import { refreshAccessToken } from './Auth/refreshTokenApi'
import { parseResponse, request } from './transport'

const ACCESS_TOKEN_STORAGE_KEY = 'accessToken'

export { refreshAccessToken }
export {
  buildAuthHeaders,
  buildGet,
  buildPost,
  buildPut,
  buildDelete,
  thirdPartyFetchDefaults,
} from './transport'

async function retryAfter401(response, url, options) {
  if (options.skipAuthRefresh) {
    return response
  }
  if (response.status !== 401) {
    return response
  }
  let hadToken = false
  try {
    hadToken = Boolean(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY))
  } catch {
    return response
  }
  if (!hadToken) {
    return response
  }

  const refreshed = await refreshAccessToken()
  if (!refreshed) {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    return response
  }
  return request(url, options)
}

export async function callApi({ url, options = {} }) {
  let response = await request(url, options)
  response = await retryAfter401(response, url, options)
  return parseResponse(response)
}

export async function callApiWithResponse({ url, options = {} }) {
  let response = await request(url, options)
  response = await retryAfter401(response, url, options)
  const payload = await parseResponse(response)
  return { payload, response }
}
