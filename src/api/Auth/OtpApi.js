import { callApi, buildPost } from '../client'
import { authPath } from '../paths'
import { getStoredAuthCookie } from '../../utils/authCookieStorage'

const VERIFY_URL = authPath('verify-otp')
const RESEND_URL = authPath('resend-otp')

async function postAuth(url, body, extraHeaders = {}) {
  const { url: u, options } = buildPost(url, body)
  const data = await callApi({
    url: u,
    options: {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    },
  })
  if (data?.success) {
    return data.data
  }
  throw {
    status: data?.code || 400,
    message: data?.message || 'Yêu cầu thất bại',
    raw: data,
  }
}

export function verifyOtp({ otp, password }) {
  const cookie = getStoredAuthCookie()
  const extraHeaders = cookie ? { Cookie: cookie } : {}
  return postAuth(VERIFY_URL, { otp, password }, extraHeaders)
}

export function resendOtp() {
  const cookie = getStoredAuthCookie()
  const extraHeaders = cookie ? { Cookie: cookie } : {}
  return postAuth(RESEND_URL, {}, extraHeaders)
}
