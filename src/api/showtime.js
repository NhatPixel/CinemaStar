import { callApi, buildDelete, buildGet, buildPatch, buildPost, buildPut } from './config/client'
import { getAllActiveHallIdsByCinema } from './hall'
import { showtimePath } from './config/paths'

const SHOWTIMES_SEARCH_URL = showtimePath('search')
const SHOWTIMES_CREATE_URL = showtimePath('')
const showtimeDetailUrl = (id) => showtimePath(id)

export { getPricingPolicies, searchPricingPolicies, buildPricingPoliciesSearchBody } from './pricingPolicy'

/**
 * Xây dựng body cho POST /showtimes/search
 * BE ShowTimeField: không có CINEMA_ID — lọc theo rạp dùng hallIds (HALL_ID IN).
 * Gọi searchShowtimesForManagement({ cinemaId }) thay vì tự resolve hallIds ở UI.
 */
export function buildShowtimesSearchBody({
  page = 1,
  size = 12,
  keyword,
  status,
  filmId,
  hallId,
  hallIds,
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
  if (hallId) {
    filterBy.push({ field: 'HALL_ID', operator: 'EQ', value: hallId })
  } else if (Array.isArray(hallIds) && hallIds.length > 0) {
    filterBy.push({ field: 'HALL_ID', operator: 'IN', value: hallIds })
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

function emptyShowtimePage(page = 1, size = 12) {
  return {
    data: [],
    currentPage: page,
    totalPages: 0,
    totalElements: 0,
    size,
    hasNext: false,
    hasPrevious: page > 1,
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

/**
 * Tìm suất chiếu cho màn quản lý — filter rạp qua cinemaId (resolve hallIds nội bộ).
 */
export async function searchShowtimesForManagement(
  { cinemaId, page = 1, size = 12, keyword, status, sortBy, extraFilters } = {},
  { signal } = {},
) {
  const base = { page, size, keyword, status, sortBy, extraFilters }
  const trimmedCinemaId = String(cinemaId || '').trim()
  if (!trimmedCinemaId) {
    return searchShowtimes(buildShowtimesSearchBody(base), { signal })
  }

  const hallIds = await getAllActiveHallIdsByCinema(trimmedCinemaId, { signal })
  if (!hallIds.length) {
    return emptyShowtimePage(page, size)
  }

  return searchShowtimes(buildShowtimesSearchBody({ ...base, hallIds }), { signal })
}

/** GET /showtimes/{id} */
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

/** GET /showtimes/{id}/seat-map — layout ghế + trạng thái + giá khi đặt vé */
export async function getShowtimeSeatMap(id, { signal } = {}) {
  const { url, options } = buildGet(`${showtimeDetailUrl(id)}/seat-map`)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được sơ đồ ghế',
    raw: resp,
  }
}

/** Body POST /showtimes/films/{filmId}/search — date bắt buộc (yyyy-MM-dd), cinemaId tùy chọn */
export function buildShowtimesByFilmSearchBody({ page = 1, size = 12, date, cinemaId } = {}) {
  const body = {
    page,
    size,
    date: String(date || '').trim(),
  }
  if (cinemaId) body.cinemaId = cinemaId
  return body
}

const MAX_SHOWTIME_BY_FILM_PAGES = 50

/** Gom mọi trang POST /showtimes/films/{filmId}/search (PageResponse). */
export async function searchAllShowtimesByFilmId(filmId, baseBody, { signal } = {}) {
  const all = []
  for (let page = 1; page <= MAX_SHOWTIME_BY_FILM_PAGES; page += 1) {
    const data = await searchShowtimesByFilmId(
      filmId,
      { ...baseBody, page, size: baseBody?.size ?? 12 },
      { signal },
    )
    all.push(...(data?.data || []))
    if (!data?.hasNext) break
  }
  return all
}

/** POST /showtimes/films/{filmId}/search — đặt vé: lọc theo ngày và rạp */
export async function searchShowtimesByFilmId(filmId, body, { signal } = {}) {
  const id = String(filmId || '').trim()
  if (!id) {
    throw { status: 400, message: 'Thiếu mã phim' }
  }
  if (!body?.date) {
    throw { status: 400, message: 'Thiếu ngày chiếu' }
  }
  const { url, options } = buildPost(showtimePath(`films/${id}/search`), body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được suất chiếu',
    raw: resp,
  }
}

function normalizeApiDateTime(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    return raw.length === 16 ? `${raw}:00` : raw
  }
  return raw
}

/** Body POST /showtimes — tạo batch trong khung startDateTime → endDateTime */
export function buildCreateShowtimePayload({
  hallId,
  filmId,
  pricingPolicyId,
  startDateTime,
  endDateTime,
  status = 'SCHEDULED',
}) {
  return {
    hallId,
    filmId,
    pricingPolicyId,
    startDateTime: normalizeApiDateTime(startDateTime),
    endDateTime: normalizeApiDateTime(endDateTime),
    status,
  }
}

/** Body PUT /showtimes/{id} */
export function buildUpdateShowtimePayload({
  pricingPolicyId,
  startDateTime,
  endDateTime,
  status,
}) {
  return {
    pricingPolicyId,
    startDateTime: normalizeApiDateTime(startDateTime),
    endDateTime: normalizeApiDateTime(endDateTime),
    status,
  }
}

/** POST /showtimes — trả ResultResponse { successResponse: [{ data }] } */
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

export function countCreatedShowtimes(result) {
  const list = result?.successResponse
  if (!Array.isArray(list)) return 0
  return list.filter((item) => item?.data != null).length
}

/** PUT /showtimes/{id} */
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

/** PATCH /showtimes/{id} — chỉ đổi trạng thái */
export async function patchShowtimeStatus(id, status) {
  const { url, options } = buildPatch(showtimeDetailUrl(id), { status })
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể cập nhật trạng thái suất chiếu',
    raw: resp,
  }
}

/** DELETE /showtimes/{id} */
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
