/**
 * Shared HTTP configuration: base URL, fetch wrapper, path prefixes — not domain endpoints.
 */
export * from './paths'
export { BASE_URL, callApiRaw, parseResponse, request } from './transport'
export {
  buildDelete,
  buildGet,
  buildPost,
  buildPut,
  callApi,
  callApiWithResponse,
  refreshAccessToken,
  thirdPartyFetchDefaults,
} from './client'
