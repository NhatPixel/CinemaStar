import { callApi, buildDelete, buildGet, buildPost, buildPut } from './config/client'
import { getManagementCinemas } from './cinema'
import { hallPath } from './config/paths'

export { getManagementCinemas }

const HALLS_SEARCH_URL = hallPath('search')
const HALLS_CREATE_URL = hallPath('')
const hallDetailUrl = (id) => hallPath(id)

/** Map danh sách rạp → options cho CustomSelect */
export function mapCinemasToSelectOptions(
  cinemas,
  { includeAll = false, allLabel = 'Tất cả rạp' } = {},
) {
  const items = (Array.isArray(cinemas) ? cinemas : []).map((c) => ({
    value: c.id,
    label: c.name || c.code || String(c.id),
  }))
  if (includeAll) {
    return [{ value: '', label: allLabel }, ...items]
  }
  return items
}

/** Tên rạp từ HallResponse (cinemaResponse hoặc cinemaId) */
export function getHallCinemaLabel(hall) {
  if (!hall) return '—'
  return hall.cinemaResponse?.name || hall.cinemaId || '—'
}

/** Body tạo/cập nhật phòng — BE bắt buộc cinemaId */
export function buildHallWritePayload({
  name,
  status,
  layoutDefinition,
  cinemaId,
  imagePaths = [],
}) {
  return {
    name,
    status,
    layoutDefinition,
    cinemaId,
    imagePaths: Array.isArray(imagePaths) ? imagePaths : [],
  }
}

/** Rạp manager/staff quản lý → options (filter + modal) */
export async function loadManagedCinemaOptions({ signal, includeAll = true } = {}) {
  const list = await getManagementCinemas({ signal })
  return mapCinemasToSelectOptions(list, { includeAll })
}

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

const MAX_HALL_SEARCH_PAGES = 50

/** Lấy toàn bộ ID phòng ACTIVE của một rạp (phân trang). */
export async function getAllActiveHallIdsByCinema(cinemaId, { signal, status = 'ACTIVE' } = {}) {
  const id = String(cinemaId || '').trim()
  if (!id) return []

  const hallIds = []
  for (let page = 1; page <= MAX_HALL_SEARCH_PAGES; page += 1) {
    const data = await searchHalls(
      buildHallsSearchBody({ page, size: 50, cinemaId: id, status }),
      { signal },
    )
    for (const hall of data?.data || []) {
      if (hall?.id) hallIds.push(hall.id)
    }
    if (!data?.hasNext) break
  }
  return hallIds
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
