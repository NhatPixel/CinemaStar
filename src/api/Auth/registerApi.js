import { callApiWithResponse, buildPost } from '../client'
import { authPath } from '../paths'
import { persistCookieHeaderFromResponse } from '../../utils/authCookieStorage'

const REGISTER_URL = authPath('register')
const STAFF_URL = authPath('staff')
const MANAGER_URL = authPath('manager')

const GENDER_MAP = {
  male: 'MALE',
  female: 'FEMALE',
  other: 'OTHER',
}

export function toRegisterPayload(form) {
  return {
    name: form.fullName.trim(),
    email: form.email.trim(),
    password: form.password,
    dob: form.dateOfBirth,
    gender: GENDER_MAP[form.gender] || 'OTHER',
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
