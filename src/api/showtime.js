import { callApi, buildDelete, buildGet, buildPatch, buildPost, buildPut } from './config/client'
import { showtimePath } from './config/paths'

const SHOWTIMES_SEARCH_URL = showtimePath('search')
const SHOWTIMES_CREATE_URL = showtimePath('')
const showtimeDetailUrl = (id) => showtimePath(id)

export { getPricingPolicies } from './pricingPolicy'

/**
 * Xây dựng body cho POST /showtimes/search
 * BE ShowTimeField: ID, START_DATE_TIME, END_DATE_TIME, HALL_ID, FILM_ID, PRICING_POLICY_ID, STATUS, ...
 * Không có CINEMA_ID — lọc rạp qua hallIds + operator IN trên HALL_ID.
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
