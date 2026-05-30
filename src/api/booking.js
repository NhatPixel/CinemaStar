import { callApi, buildGet, buildPatch, buildPost } from './config/client'
import { bookingPath } from './config/paths'

const BOOKINGS_CREATE_URL = bookingPath('')
const BOOKINGS_ME_SEARCH_URL = bookingPath('me/search')
const BOOKINGS_ME_ACTIVE_URL = bookingPath('me/active')
const BOOKINGS_OPERATOR_SEARCH_URL = bookingPath('cinemas/me/search')
const bookingDetailUrl = (id) => bookingPath(id)
const bookingCheckoutContextUrl = (id) => bookingPath(`${id}/checkout-context`)
const bookingStatusUrl = (id) => bookingPath(`${id}/status`)
const bookingCancelUrl = (id) => bookingPath(`${id}/cancel`)

/**
 * Body cho POST /bookings/me/search và POST /bookings/cinemas/me/search
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

/** POST /bookings/me/search */
export async function searchMyBookings(body, { signal } = {}) {
  const { url, options } = buildPost(BOOKINGS_ME_SEARCH_URL, body)
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
