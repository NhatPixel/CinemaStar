import { callApi, buildDelete, buildGet, buildPatch, buildPost, buildPut } from './config/client'
import { cinemaPath } from './config/paths'

const CINEMAS_SEARCH_URL = cinemaPath('search')
const CINEMAS_CREATE_URL = cinemaPath('')
/** GET /api/cinemas/me — rạp manager/staff được phân quyền */
const CINEMAS_ME_URL = cinemaPath('me')
const cinemaDetailUrl = (id) => cinemaPath(id)

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
  size = 12,
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

/** GET /cinemas/me — response cũng có `managerName` */
export async function getMyManagedCinemas({ signal } = {}) {
  const { url, options } = buildGet(CINEMAS_ME_URL)
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
