import { callApi, buildGet, buildPut } from './config/client'
import { userPath } from './config/paths'

export const USER_STORAGE_KEY = 'currentUser'

const USERS_ME_URL = '/users/me'

function persistCurrentUser(data) {
  if (data && typeof data === 'object') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data))
  }
}

export async function getCurrentUser({ signal } = {}) {
  const { url, options } = buildGet(USERS_ME_URL)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    const user = resp?.data ?? null
    if (user) {
      persistCurrentUser(user)
    }
    return user
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được thông tin người dùng',
    raw: resp,
  }
}

async function putUserProfile(segment, payload) {
  const { url, options } = buildPut(userPath(segment), payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    const data = resp?.data
    if (data) {
      persistCurrentUser(data)
    }
    return data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể cập nhật hồ sơ',
    raw: resp,
  }
}

/** PUT /users/customers */
export function updateCustomerProfile(payload) {
  return putUserProfile('customers', payload)
}

/** PUT /users/managers */
export function updateManagerProfile(payload) {
  return putUserProfile('managers', payload)
}

/** PUT /users/staffs */
export function updateStaffProfile(payload) {
  return putUserProfile('staffs', payload)
}