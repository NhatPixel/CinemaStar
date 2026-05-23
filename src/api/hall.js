import { callApi, buildDelete, buildGet, buildPost, buildPut } from './config/client'
import { hallPath } from './config/paths'

const HALLS_SEARCH_URL = hallPath('search')
const HALLS_CREATE_URL = hallPath('')
const hallDetailUrl = (id) => hallPath(id)

/**
 * Xây dựng body cho POST /halls/search
 * @param {{
 *   page?: number,
 *   size?: number,
 *   keyword?: string,
 *   status?: string,
 *   cinemaId?: string,
 *   sortBy?: Array<{ field: string, direction: 'ASC' | 'DESC' }>,
 *   extraFilters?: Array<{ field: string, operator: string, value: unknown }>,
 * }} params
 */
export function buildHallsSearchBody({
  page = 1,
  size = 12,
  keyword,
  status,
  cinemaId,
  sortBy,
  extraFilters,
} = {}) {
  const filterBy = []
  if (status && status !== 'all') {
    filterBy.push({ field: 'STATUS', operator: 'EQ', value: status })
  }
  if (cinemaId) {
    filterBy.push({ field: 'CINEMA_ID', operator: 'EQ', value: cinemaId })
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

/** POST /halls/search */
export async function searchHalls(body, { signal } = {}) {
  const { url, options } = buildPost(HALLS_SEARCH_URL, body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được danh sách phòng chiếu',
    raw: resp,
  }
}

export async function getHallById(id, { signal } = {}) {
  const { url, options } = buildGet(hallDetailUrl(id))
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được thông tin phòng chiếu',
    raw: resp,
  }
}

export async function createHall(payload) {
  const { url, options } = buildPost(HALLS_CREATE_URL, payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể tạo phòng chiếu',
    raw: resp,
  }
}

export async function updateHall(id, payload) {
  const { url, options } = buildPut(hallDetailUrl(id), payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể cập nhật phòng chiếu',
    raw: resp,
  }
}

export async function deleteHall(id) {
  const { url, options } = buildDelete(hallDetailUrl(id))
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể xóa phòng chiếu',
    raw: resp,
  }
}
