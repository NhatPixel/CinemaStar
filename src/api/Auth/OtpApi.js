import { callApi, buildPost } from '../client'
import { authPath } from '../paths'
import { getStoredAuthCookie } from '../../utils/authCookieStorage'

const VERIFY_URL = authPath('verify-otp')
const RESEND_URL = authPath('resend-otp')

async function postAuth(url, body, extraHeaders = {}) {
  const { url: u, options } = buildPost(url, body)
  const resp = await callApi({
    url: u,
    options: {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Yêu cầu thất bại',
    raw: resp,
  }
}

export function verifyOtp({ otp, password } = {}) {
  const cookie = getStoredAuthCookie()
  const extraHeaders = cookie ? { Cookie: cookie } : {}
  const body = { otp }
  if (password !== undefined) {
    body.password = password
  }
  return postAuth(VERIFY_URL, body, extraHeaders)
}

export function resendOtp() {
  const cookie = getStoredAuthCookie()
  const extraHeaders = cookie ? { Cookie: cookie } : {}
  return postAuth(RESEND_URL, {}, extraHeaders)
}
