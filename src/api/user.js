import { callApi, buildDelete, buildGet, buildPost, buildPut } from './config/client'
import { userPath } from './config/paths'

export const USER_STORAGE_KEY = 'currentUser'

const USERS_ME_URL = '/users/me'
const MANAGERS_SEARCH_URL = userPath('managers/search')
const STAFFS_SEARCH_URL = userPath('staffs/search')
const CUSTOMERS_SEARCH_URL = userPath('customers/search')

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

async function searchUsersByRole(url, { page = 1, size = 10, keyword = '' } = {}, { signal } = {}) {
  const { url: requestUrl, options } = buildPost(url, {
    page,
    size,
    keyword: keyword ?? '',
  })
  const resp = await callApi({
    url: requestUrl,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được danh sách người dùng',
    raw: resp,
  }
}

/** POST /users/managers/search */
export function searchManagers(params, opts) {
  return searchUsersByRole(MANAGERS_SEARCH_URL, params, opts)
}

/** POST /users/staffs/search */
export function searchStaffs(params, opts) {
  return searchUsersByRole(STAFFS_SEARCH_URL, params, opts)
}

/** POST /users/customers/search */
export function searchCustomers(params, opts) {
  return searchUsersByRole(CUSTOMERS_SEARCH_URL, params, opts)
}

/** GET /users/{id} */
export async function getUserById(userId, { signal } = {}) {
  const id = String(userId || '').trim()
  if (!id) {
    throw { status: 400, message: 'Thiếu mã người dùng' }
  }
  const { url, options } = buildGet(userPath(id))
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được thông tin người dùng',
    raw: resp,
  }
}

export function buildUsersSearchBody({ page = 1, size = 12, keyword = '' } = {}) {
  return {
    page,
    size,
    keyword: keyword?.trim() || '',
  }
}

/**
 * Tìm kiếm theo vai trò đối tượng quản lý (MANAGER | STAFF | CUSTOMER).
 * Manager không gọi search MANAGER.
 */
const SEARCH_BY_MANAGED_ROLE = {
  MANAGER: searchManagers,
  STAFF: searchStaffs,
  CUSTOMER: searchCustomers,
}

export function searchManagedUsers(managedRole, params, opts) {
  const key = String(managedRole || '').trim().toUpperCase()
  const searchFn = SEARCH_BY_MANAGED_ROLE[key]
  if (!searchFn) {
    return Promise.reject({
      status: 400,
      message: 'Vai trò quản lý không hợp lệ',
    })
  }
  return searchFn(params, opts)
}

const MANAGED_ROLE_SEGMENTS = {
  MANAGER: 'managers',
  STAFF: 'staffs',
  CUSTOMER: 'customers',
}

function resolveManagedRoleSegment(managedRole) {
  const key = String(managedRole || '').trim().toUpperCase()
  const segment = MANAGED_ROLE_SEGMENTS[key]
  if (!segment) {
    throw { status: 400, message: 'Vai trò quản lý không hợp lệ' }
  }
  return segment
}

async function mutateManagedUserById(method, managedRole, userId, payload) {
  const segment = resolveManagedRoleSegment(managedRole)
  const id = String(userId || '').trim()
  if (!id) {
    throw { status: 400, message: 'Thiếu mã người dùng' }
  }

  const path = userPath(`${segment}/${id}`)
  const { url, options } =
    method === 'DELETE' ? buildDelete(path) : buildPut(path, payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp?.data ?? resp
  }
  throw {
    status: resp?.code || 400,
    message:
      resp?.message ||
      (method === 'DELETE' ? 'Không thể xóa người dùng' : 'Không thể cập nhật người dùng'),
    raw: resp,
  }
}

/** PUT /users/managers|staffs|customers/{id} */
export function updateManagedUserProfile(managedRole, userId, payload) {
  return mutateManagedUserById('PUT', managedRole, userId, payload)
}

/** DELETE /users/managers|staffs|customers/{id} */
export function deleteManagedUser(managedRole, userId) {
  return mutateManagedUserById('DELETE', managedRole, userId)
}