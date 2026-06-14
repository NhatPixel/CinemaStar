import { callApi, buildGet, buildPost } from './config/client'
import { paymentPath } from './config/paths'

const PAYMENT_SESSIONS_URL = paymentPath('sessions')
const paymentSessionByBookingUrl = (bookingId) => paymentPath(`sessions/${bookingId}`)
const PROMOTION_PREVIEW_URL = paymentPath('promotions/preview')

/** POST /payments/sessions */
export async function createPaymentSession({ bookingId, promotionCode } = {}) {
  const payload = { bookingId }
  const code = String(promotionCode || '').trim()
  if (code) payload.promotionCode = code

  const { url, options } = buildPost(PAYMENT_SESSIONS_URL, payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tạo được phiên thanh toán',
    raw: resp,
  }
}

/** POST /payments/sessions/{bookingId}/complete — staff/manager/admin đánh dấu đã thanh toán tại quầy */
export async function completePaymentSession(bookingId) {
  const id = String(bookingId || '').trim()
  if (!id) {
    throw { status: 400, message: 'Thiếu mã đơn đặt vé' }
  }
  const { url, options } = buildPost(paymentPath(`sessions/${id}/complete`), {})
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không xác nhận được thanh toán',
    raw: resp,
  }
}

/** GET /payments/sessions/{bookingId} */
export async function getPaymentSession(bookingId, { signal } = {}) {
  const id = String(bookingId || '').trim()
  if (!id) {
    throw { status: 400, message: 'Thiếu mã đơn đặt vé' }
  }
  const { url, options } = buildGet(paymentSessionByBookingUrl(id))
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được phiên thanh toán',
    raw: resp,
  }
}

/** POST /payments/promotions/preview */
export async function previewPromotion({ bookingId, orderAmount, promotionCode } = {}) {
  const payload = {}
  if (bookingId) payload.bookingId = bookingId
  if (orderAmount != null && orderAmount !== '') payload.orderAmount = orderAmount
  const code = String(promotionCode || '').trim()
  if (code) payload.promotionCode = code

  const { url, options } = buildPost(PROMOTION_PREVIEW_URL, payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không áp dụng được mã khuyến mãi',
    raw: resp,
  }
}
