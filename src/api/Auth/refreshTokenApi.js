import { authPath } from '../paths'
import { buildPost, callApiRaw } from '../transport'

const ACCESS_TOKEN_STORAGE_KEY = 'accessToken'
const REFRESH_URL = authPath('refresh_token')

let refreshInFlight = null

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
      if (resp?.success && resp?.data?.accessToken) {
        localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, resp.data.accessToken)
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
