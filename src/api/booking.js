import { callApi, buildGet, buildPatch, buildPost } from './config/client'
import { bookingPath } from './config/paths'

const BOOKINGS_CREATE_URL = bookingPath('')
const BOOKINGS_ME_ACTIVE_SEARCH_URL = bookingPath('me/active/search')
const BOOKINGS_ME_HISTORY_SEARCH_URL = bookingPath('me/history/search')
const BOOKINGS_ME_ACTIVE_URL = bookingPath('me/active')
const BOOKINGS_OPERATOR_SEARCH_URL = bookingPath('cinemas/me/search')
const BOOKINGS_OPERATOR_PURCHASED_SEARCH_URL = bookingPath('cinemas/me/purchased/search')
const BOOKINGS_OPERATOR_UNPAID_SEARCH_URL = bookingPath('cinemas/me/unpaid/search')
const bookingDetailUrl = (id) => bookingPath(id)
const bookingCheckoutContextUrl = (id) => bookingPath(`${id}/checkout-context`)
const bookingStatusUrl = (id) => bookingPath(`${id}/status`)
const bookingCancelUrl = (id) => bookingPath(`${id}/cancel`)

/**
 * Body cho POST /bookings/me/active/search, /me/history/search, POST /bookings/cinemas/me/search, ...
 * Với me/active|history/search: BE tự lọc trạng thái — không gửi BOOKING_STATUS / PAYMENT_STATUS.
 */
export function buildBookingsSearchBody({
  page = 1,
  size = 12,
  keyword,
  bookingStatus,
  paymentStatus,
  cinemaId,
  showtimeId,
  sortBy,
  extraFilters,
} = {}) {
  const filterBy = []
  if (bookingStatus && bookingStatus !== 'all') {
    filterBy.push({ field: 'BOOKING_STATUS', operator: 'EQ', value: bookingStatus })
  }
  if (paymentStatus && paymentStatus !== 'all') {
    filterBy.push({ field: 'PAYMENT_STATUS', operator: 'EQ', value: paymentStatus })
  }
  if (cinemaId) {
    filterBy.push({ field: 'CINEMA_ID', operator: 'EQ', value: cinemaId })
  }
  if (showtimeId) {
    filterBy.push({ field: 'SHOWTIME_ID', operator: 'EQ', value: showtimeId })
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
    sortBy: Array.isArray(sortBy) ? sortBy : [{ field: 'TIME_CREATED', direction: 'DESC' }],
  }
}

/**
 * Body POST /bookings/cinemas/me/purchased/search | .../unpaid/search
 * (BE tự ép BOOKING_STATUS / PAYMENT_STATUS — không gửi filter trạng thái đó)
 */
export function buildOperatorBookingsSearchBody({
  page = 1,
  size = 12,
  keyword,
  cinemaId,
  showDate,
  filmTitle,
} = {}) {
  const filterBy = []
  if (cinemaId) {
    filterBy.push({ field: 'CINEMA_ID', operator: 'EQ', value: cinemaId })
  }
  const title = String(filmTitle || '').trim()
  if (title) {
    filterBy.push({ field: 'FILM_TITLE', operator: 'LIKE', value: title })
  }
  const date = String(showDate || '').trim()
  if (date) {
    filterBy.push({
      field: 'SHOWTIME_START_DATE_TIME',
      operator: 'GTE',
      value: `${date}T00:00:00`,
    })
    filterBy.push({
      field: 'SHOWTIME_START_DATE_TIME',
      operator: 'LTE',
      value: `${date}T23:59:59`,
    })
  }
  return {
    page,
    size,
    keyword: keyword?.trim() ?? '',
    filterBy,
    sortBy: [{ field: 'TIME_CREATED', direction: 'DESC' }],
  }
}

export async function createBooking(payload) {
  const { url, options } = buildPost(BOOKINGS_CREATE_URL, payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể đặt vé',
    raw: resp,
  }
}

export async function getBookingById(id, { signal } = {}) {
  const { url, options } = buildGet(bookingDetailUrl(id))
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được thông tin đơn đặt vé',
    raw: resp,
  }
}

/** GET /bookings/me/active?showtimeId=&cinemaId= */
export async function getMyActiveBooking({ showtimeId, cinemaId } = {}, { signal } = {}) {
  const params = new URLSearchParams()
  if (showtimeId) params.set('showtimeId', String(showtimeId))
  if (cinemaId) params.set('cinemaId', String(cinemaId))
  const query = params.toString()
  const path = query ? `${BOOKINGS_ME_ACTIVE_URL}?${query}` : BOOKINGS_ME_ACTIVE_URL
  const { url, options } = buildGet(path)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data ?? null
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được đơn đặt vé đang giữ',
    raw: resp,
  }
}

/** GET /bookings/{id}/checkout-context */
export async function getCheckoutContext(id, { signal } = {}) {
  const bookingId = String(id || '').trim()
  if (!bookingId) {
    throw { status: 400, message: 'Thiếu mã đơn đặt vé' }
  }
  const { url, options } = buildGet(bookingCheckoutContextUrl(bookingId))
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được thông tin thanh toán',
    raw: resp,
  }
}

/** POST /bookings/me/active/search — đơn PENDING/RESERVED, UNPAID, còn hạn giữ ghế */
export async function searchMyActiveBookings(body, { signal } = {}) {
  const { url, options } = buildPost(BOOKINGS_ME_ACTIVE_SEARCH_URL, body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được danh sách đơn đặt vé',
    raw: resp,
  }
}

/** POST /bookings/me/history/search — đơn đã thanh toán (CONFIRMED + PAID) */
export async function searchMyBookingHistory(body, { signal } = {}) {
  const { url, options } = buildPost(BOOKINGS_ME_HISTORY_SEARCH_URL, body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được lịch sử đặt vé',
    raw: resp,
  }
}

/** active | history */
export async function searchMyBookingsByListType(listType, body, options = {}) {
  if (listType === 'history') {
    return searchMyBookingHistory(body, options)
  }
  return searchMyActiveBookings(body, options)
}

/** POST /bookings/cinemas/me/search */
export async function searchOperatorBookings(body, { signal } = {}) {
  const { url, options } = buildPost(BOOKINGS_OPERATOR_SEARCH_URL, body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được danh sách đơn đặt vé',
    raw: resp,
  }
}

/** POST /bookings/cinemas/me/purchased/search */
export async function searchPurchasedOperatorBookings(body, { signal } = {}) {
  const { url, options } = buildPost(BOOKINGS_OPERATOR_PURCHASED_SEARCH_URL, body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được đơn đã thanh toán',
    raw: resp,
  }
}

/** POST /bookings/cinemas/me/unpaid/search */
export async function searchUnpaidOperatorBookings(body, { signal } = {}) {
  const { url, options } = buildPost(BOOKINGS_OPERATOR_UNPAID_SEARCH_URL, body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được đơn chưa thanh toán',
    raw: resp,
  }
}

/** purchased | unpaid */
export async function searchOperatorBookingsByListType(listType, body, options = {}) {
  if (listType === 'unpaid') {
    return searchUnpaidOperatorBookings(body, options)
  }
  return searchPurchasedOperatorBookings(body, options)
}

export async function updateBookingStatus(id, payload) {
  const { url, options } = buildPatch(bookingStatusUrl(id), payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể cập nhật trạng thái đơn đặt vé',
    raw: resp,
  }
}

export async function cancelBooking(id) {
  const { url, options } = buildPost(bookingCancelUrl(id), {})
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể hủy đơn đặt vé',
    raw: resp,
  }
}
