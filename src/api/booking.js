import { callApi, buildGet, buildPatch, buildPost } from './config/client'
import { bookingPath } from './config/paths'

const BOOKINGS_CREATE_URL = bookingPath('')
const BOOKINGS_ME_URL = bookingPath('me')
const BOOKINGS_OPERATOR_URL = bookingPath('cinemas/me')
const bookingDetailUrl = (id) => bookingPath(id)
const bookingStatusUrl = (id) => bookingPath(`${id}/status`)
const bookingCancelUrl = (id) => bookingPath(`${id}/cancel`)

export async function createBooking(payload) {
  const { url, options } = buildPost(BOOKINGS_CREATE_URL, payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể tạo booking',
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
    message: resp?.message || 'Không tải được thông tin booking',
    raw: resp,
  }
}

export async function getMyBookings({ signal } = {}) {
  const { url, options } = buildGet(BOOKINGS_ME_URL)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được lịch sử booking',
    raw: resp,
  }
}

export async function getOperatorBookings({ signal } = {}) {
  const { url, options } = buildGet(BOOKINGS_OPERATOR_URL)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được danh sách booking',
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
    message: resp?.message || 'Không thể cập nhật trạng thái booking',
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
    message: resp?.message || 'Không thể hủy booking',
    raw: resp,
  }
}
