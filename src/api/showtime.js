import { callApi, buildDelete, buildGet, buildPost, buildPut } from './config/client'
import { showtimePath } from './config/paths'

const SHOWTIMES_SEARCH_URL = showtimePath('search')
const SHOWTIMES_CREATE_URL = showtimePath('')
const showtimeDetailUrl = (id) => showtimePath(id)

/**
 * Xây dựng body cho POST /showtimes/search
 * @param {{
 *   page?: number,
 *   size?: number,
 *   keyword?: string,
 *   status?: string,
 *   filmId?: string,
 *   cinemaId?: string,
 *   hallId?: string,
 *   sortBy?: Array<{ field: string, direction: 'ASC' | 'DESC' }>,
 *   extraFilters?: Array<{ field: string, operator: string, value: unknown }>,
 * }} params
 */
export function buildShowtimesSearchBody({
  page = 1,
  size = 12,
  keyword,
  status,
  filmId,
  cinemaId,
  hallId,
  sortBy,
  extraFilters,
} = {}) {
  const filterBy = []
  if (status && status !== 'all') {
    filterBy.push({ field: 'STATUS', operator: 'EQ', value: status })
  }
  if (filmId) {
    filterBy.push({ field: 'FILM_ID', operator: 'EQ', value: filmId })
  }
  if (cinemaId) {
    filterBy.push({ field: 'CINEMA_ID', operator: 'EQ', value: cinemaId })
  }
  if (hallId) {
    filterBy.push({ field: 'HALL_ID', operator: 'EQ', value: hallId })
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

/** POST /showtimes/search */
export async function searchShowtimes(body, { signal } = {}) {
  const { url, options } = buildPost(SHOWTIMES_SEARCH_URL, body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được danh sách suất chiếu',
    raw: resp,
  }
}

export async function getShowtimeById(id, { signal } = {}) {
  const { url, options } = buildGet(showtimeDetailUrl(id))
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được thông tin suất chiếu',
    raw: resp,
  }
}

export async function createShowtime(payload) {
  const { url, options } = buildPost(SHOWTIMES_CREATE_URL, payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể tạo suất chiếu',
    raw: resp,
  }
}

export async function updateShowtime(id, payload) {
  const { url, options } = buildPut(showtimeDetailUrl(id), payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể cập nhật suất chiếu',
    raw: resp,
  }
}

export async function deleteShowtime(id) {
  const { url, options } = buildDelete(showtimeDetailUrl(id))
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể xóa suất chiếu',
    raw: resp,
  }
}
