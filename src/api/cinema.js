import { callApi, buildDelete, buildGet, buildPatch, buildPost, buildPut } from './config/client'
import { cinemaPath } from './config/paths'
import { readCurrentUserRole } from '../constants/userRoleLabels'

const CINEMAS_SEARCH_URL = cinemaPath('search')
const CINEMAS_ME_SEARCH_URL = cinemaPath('me/search')
const CINEMAS_CREATE_URL = cinemaPath('')
const cinemaDetailUrl = (id) => cinemaPath(id)

const MAX_CINEMA_SEARCH_PAGES = 50
const DEFAULT_CINEMA_PAGE_SIZE = 12

/**
 * Xây dựng body cho POST /cinemas/search
 * @param {{
 *   page?: number,
 *   size?: number,
 *   keyword?: string,
 *   status?: string,
 *   sortBy?: Array<{ field: string, direction: 'ASC' | 'DESC' }>,
 *   extraFilters?: Array<{ field: string, operator: string, value: any }>,
 * }} params
 */
export function buildCinemasSearchBody({
  page = 1,
  size = DEFAULT_CINEMA_PAGE_SIZE,
  keyword,
  status,
  sortBy,
  extraFilters,
} = {}) {
  const filterBy = []
  if (status && status !== 'all') {
    filterBy.push({ field: 'STATUS', operator: 'EQ', value: status })
  }
  if (Array.isArray(extraFilters)) {
    for (const f of extraFilters) {
      if (f && f.field) filterBy.push(f)
    }
  }
  return {
    page,
    size,
    keyword: keyword?.trim() ?? '',
    filterBy,
    sortBy: Array.isArray(sortBy) ? sortBy : [],
  }
}

export function getCinemaManagerLabel(cinema) {
  if (!cinema) return '—'
  return cinema.managerName?.trim() || '—'
}

/** POST /cinemas/me/search — rạp manager/staff được phân quyền (PageResponse). */
export async function searchMyManagedCinemas(body, { signal } = {}) {
  const { url, options } = buildPost(CINEMAS_ME_SEARCH_URL, body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được danh sách rạp được quản lý',
    raw: resp,
  }
}

/** Manager/staff: lấy toàn bộ rạp qua POST /cinemas/me/search (phân trang). */
export async function searchAllMyManagedCinemas({
  signal,
  keyword,
  status,
  size = DEFAULT_CINEMA_PAGE_SIZE,
  extraFilters,
} = {}) {
  const all = []
  for (let page = 1; page <= MAX_CINEMA_SEARCH_PAGES; page += 1) {
    const data = await searchMyManagedCinemas(
      buildCinemasSearchBody({
        page,
        size,
        keyword,
        status,
        extraFilters,
      }),
      { signal },
    )
    all.push(...(data?.data || []))
    if (!data?.hasNext) break
  }
  return all
}

/** Admin: lấy toàn bộ rạp qua POST /cinemas/search (phân trang). */
export async function searchAllCinemas({
  signal,
  keyword,
  status,
  size = DEFAULT_CINEMA_PAGE_SIZE,
  extraFilters,
} = {}) {
  const all = []
  for (let page = 1; page <= MAX_CINEMA_SEARCH_PAGES; page += 1) {
    const data = await searchCinemas(
      buildCinemasSearchBody({
        page,
        size,
        keyword,
        status,
        extraFilters,
      }),
      { signal },
    )
    all.push(...(data?.data || []))
    if (!data?.hasNext) break
  }
  return all
}

/**
 * Rạp theo quyền quản lý (filter/modal/form):
 * - ADMIN → POST /cinemas/search
 * - MANAGER/STAFF → POST /cinemas/me/search
 */
export async function getManagementCinemas({
  signal,
  keyword,
  status,
  size,
  extraFilters,
} = {}) {
  const role = readCurrentUserRole()
  if (role === 'ADMIN') {
    return searchAllCinemas({ signal, keyword, status, size, extraFilters })
  }
  return searchAllMyManagedCinemas({ signal, keyword, status, size, extraFilters })
}

/** POST /cinemas/search — mỗi item có `managerId`, `managerName` (BE enrich từ user service) */
export async function searchCinemas(body, { signal } = {}) {
  const { url, options } = buildPost(CINEMAS_SEARCH_URL, body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được danh sách rạp',
    raw: resp,
  }
}

export async function createCinema(payload) {
  const { url, options } = buildPost(CINEMAS_CREATE_URL, payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể tạo rạp',
    raw: resp,
  }
}

/** PUT /cinemas/:id — body không có `code` và `status` */
export async function updateCinema(id, payload) {
  const { url, options } = buildPut(cinemaDetailUrl(id), payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể cập nhật rạp',
    raw: resp,
  }
}

/** PATCH /cinemas/:id — chỉ cập nhật trạng thái */
export async function updateCinemaStatus(id, status) {
  const { url, options } = buildPatch(cinemaDetailUrl(id), { status })
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể cập nhật trạng thái rạp',
    raw: resp,
  }
}

export async function getCinemaById(id, { signal } = {}) {
  const { url, options } = buildGet(cinemaDetailUrl(id))
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được thông tin rạp',
    raw: resp,
  }
}

/** DELETE /cinemas/:id */
export async function deleteCinema(id) {
  const { url, options } = buildDelete(cinemaDetailUrl(id))
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể xóa rạp',
    raw: resp,
  }
}

/** POST /cinemas/{id}/staffs */
export async function assignCinemaStaff(cinemaId, staffId) {
  const { url, options } = buildPost(cinemaDetailUrl(`${cinemaId}/staffs`), { staffId })
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể gán nhân viên vào rạp',
    raw: resp,
  }
}

/** PUT /cinemas/{id}/staffs */
export async function updateCinemaStaffAssignment(cinemaId, staffId) {
  const { url, options } = buildPut(cinemaDetailUrl(`${cinemaId}/staffs`), { staffId })
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể cập nhật nhân viên rạp',
    raw: resp,
  }
}

/** DELETE /cinemas/{id}/staffs/{staffId} */
export async function unassignCinemaStaff(cinemaId, staffId) {
  const { url, options } = buildDelete(cinemaDetailUrl(`${cinemaId}/staffs/${staffId}`))
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể gỡ nhân viên khỏi rạp',
    raw: resp,
  }
}

/** Tìm rạp vừa tạo theo mã (BE create không trả id). */
export async function resolveCinemaIdByCode(code, { signal } = {}) {
  const normalized = String(code || '').trim()
  if (!normalized) return null
  const data = await searchCinemas(
    buildCinemasSearchBody({
      page: 1,
      size: 1,
      extraFilters: [{ field: 'CODE', operator: 'EQ', value: normalized }],
    }),
    { signal },
  )
  return data?.data?.[0]?.id || null
}

/** Đồng bộ danh sách nhân viên gán vào rạp sau create/update. */
export async function syncCinemaStaffAssignments(cinemaId, previousIds = [], nextIds = []) {
  const id = String(cinemaId || '').trim()
  if (!id) return

  const prev = new Set((previousIds || []).map(String))
  const next = new Set((nextIds || []).map(String))
  const toAdd = [...next].filter((staffId) => !prev.has(staffId))
  const toRemove = [...prev].filter((staffId) => !next.has(staffId))

  for (const staffId of toRemove) {
    await unassignCinemaStaff(id, staffId)
  }

  for (const staffId of toAdd) {
    try {
      await assignCinemaStaff(id, staffId)
    } catch {
      await updateCinemaStaffAssignment(id, staffId)
    }
  }
}
