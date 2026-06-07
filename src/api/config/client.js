import { parseResponse, refreshAccessToken, request } from './transport'
import {
  createAuthSessionExpiredError,
  redirectToLoginOnAuthFailure,
} from '../../utils/authSession'

export { refreshAccessToken }
export {
  buildGet,
  buildPost,
  buildPut,
  buildPatch,
  buildDelete,
  thirdPartyFetchDefaults,
} from './transport'

async function retryAfterUnauthorized(response, url, options) {
  if (options.skipAuthRefresh) {
    return response
  }
  if (response.status !== 401) {
    return response
  }
  const refreshed = await refreshAccessToken()
  if (!refreshed) {
    redirectToLoginOnAuthFailure()
    throw createAuthSessionExpiredError()
  }
  return request(url, options)
}

export async function callApi({ url, options = {} }) {
  let response = await request(url, options)
  response = await retryAfterUnauthorized(response, url, options)
  return parseResponse(response)
}

export async function callApiWithResponse({ url, options = {} }) {
  let response = await request(url, options)
  response = await retryAfterUnauthorized(response, url, options)
  const payload = await parseResponse(response)
  return { payload, response }
}
