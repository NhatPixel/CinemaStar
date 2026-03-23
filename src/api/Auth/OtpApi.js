import { callApi, buildPost } from '../client'
import { authPath } from '../paths'

const VERIFY_URL = authPath('verify-otp')
const RESEND_URL = authPath('resend-otp')

async function postAuth(url, body) {
  const { url: u, options } = buildPost(url, body)

  const data = await callApi({
    url: u,
    options: {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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
  return postAuth(VERIFY_URL, { otp, password })
}

export function resendOtp() {
  return postAuth(RESEND_URL, {})
}