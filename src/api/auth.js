import { callApi, callApiWithResponse, buildPost } from './config/client'
import { authPath } from './config/paths'
import { BASE_URL } from './config/transport'
import {
  AUTH_COOKIE_STORAGE_KEY,
  getStoredAuthCookie,
  persistCookieHeaderFromResponse,
} from '../utils/authCookieStorage'
import { Gender, registerGenderToApi } from '../constants/genderMeta'
import { getCurrentUser, USER_STORAGE_KEY } from './user'

/** Làm mới token — triển khai trong `transport` để tránh vòng import với `client`. */
export { refreshAccessToken } from './config/transport'

// ——— Đăng nhập / đăng xuất ———

const LoginURL = authPath('login')
const LOGOUT_URL = authPath('logout')
const GOOGLE_AUTHORIZE_URL = `${BASE_URL}${authPath('google/authorize')}`

/** Redirect sang BE xử lý Google OAuth (GET /auth/google/authorize). */
export function redirectToGoogleLogin() {
  window.location.href = GOOGLE_AUTHORIZE_URL
}

export async function login(email, password) {
  const { url, options } = buildPost(LoginURL, { email, password })
  const resp = await callApi({ url, options })

  if (resp?.success) {
    try {
      await getCurrentUser()
    } catch {
      // Giữ thành công đăng nhập nếu /me tạm lỗi
    }
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!',
    raw: resp,
  }
}

export async function logout() {
  const { url, options } = buildPost(LOGOUT_URL, {})
  const resp = await callApi({
    url,
    options: {
      ...options,
      headers: {
        Accept: 'application/json',
      },
    },
  })

  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Đăng xuất thất bại',
    raw: resp,
  }
}

export function clearStoredAuth() {
  localStorage.removeItem(USER_STORAGE_KEY)
  localStorage.removeItem(AUTH_COOKIE_STORAGE_KEY)
}

// ——— Đăng ký ———

const REGISTER_URL = authPath('register')
const STAFF_URL = authPath('staff')
const MANAGER_URL = authPath('manager')

export function toRegisterPayload(form) {
  return {
    name: form.fullName.trim(),
    email: form.email.trim(),
    password: form.password,
    dob: form.dateOfBirth,
    gender: registerGenderToApi[form.gender] || Gender.OTHER,
    phone: form.phone.trim(),
  }
}

async function postAuthRegister(url, payload) {
  const { url: u, options } = buildPost(url, payload)
  const { payload: resp, response } = await callApiWithResponse({
    url: u,
    options,
  })
  if (resp?.success) {
    persistCookieHeaderFromResponse(response)
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Đăng ký thất bại',
    raw: resp,
  }
}

export function register(payload) {
  return postAuthRegister(REGISTER_URL, payload)
}

export function registerStaff(payload) {
  return postAuthRegister(STAFF_URL, payload)
}

export function registerManager(payload) {
  return postAuthRegister(MANAGER_URL, payload)
}

// ——— Quên mật khẩu ———

const FORGOT_URL = authPath('forgot-password')

export async function forgotPassword({ email }) {
  const { url, options } = buildPost(FORGOT_URL, { email })
  const { payload: resp, response } = await callApiWithResponse({
    url,
    options,
  })

  if (resp?.success) {
    persistCookieHeaderFromResponse(response)
    return resp.data
  }

  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Yêu cầu thất bại',
    raw: resp,
  }
}

// ——— OTP ———

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
  const body =
    password !== undefined ? { otp, password } : { otp }
  return postAuth(VERIFY_URL, body, extraHeaders)
}

export function resendOtp() {
  const cookie = getStoredAuthCookie()
  const extraHeaders = cookie ? { Cookie: cookie } : {}
  return postAuth(RESEND_URL, {}, extraHeaders)
}
