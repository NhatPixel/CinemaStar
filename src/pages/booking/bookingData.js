import { formatSeatLabel, seatsToLayoutDefinition } from '../../components/hall/hallLayoutUtils'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { AGE_RATING_META } from '../../constants/ageRatingMeta'
import { SEAT_TYPE } from '../../constants/hallStatusOptions'

export const BOOKING_DRAFT_STORAGE_KEY = 'cinemaStar.bookingDraft'
export const BOOKING_RESULT_STORAGE_KEY = 'cinemaStar.lastBookingResult'
export const BOOKING_MOVIE_STORAGE_KEY = 'cinemaStar.selectedBookingMovie'
export const MAX_BOOKING_SEATS = 5

export const BOOKING_STEPS = [
  { label: 'Suất chiếu', path: '/booking/showtimes', icon: 'event_available' },
  { label: 'Ghế & đồ ăn', path: '/booking/seats', icon: 'chair' },
  { label: 'Thanh toán', path: '/booking/payment', icon: 'payments' },
  { label: 'Kết quả', path: '/booking/result', icon: 'task_alt' },
]

export const MOVIE_FALLBACK = {
  title: 'Phim đang chiếu',
  poster: '/assets/movie-sample.jpg',
  ageRating: '—',
  duration: 'Đang cập nhật',
  genres: 'Đang cập nhật',
  format: '2D Phụ đề',
}

export function getFilmRecordTitle(film) {
  return String(film?.title || film?.name || MOVIE_FALLBACK.title).trim()
}

export function getFilmRecordPoster(film) {
  return String(film?.poster || MOVIE_FALLBACK.poster).trim()
}

export function formatFilmAgeRatingShort(film) {
  const key = String(film?.ageRating || '').trim().toUpperCase()
  if (!key) return '—'
  return AGE_RATING_META[key]?.short || key.replace(/^RATING_/i, '')
}

export function formatFilmDurationLabel(film) {
  const raw = film?.duration
  if (raw == null || raw === '') return MOVIE_FALLBACK.duration
  const minutes = Number(raw)
  if (Number.isNaN(minutes)) return String(raw)
  return `${minutes} phút`
}

export function formatFilmFormatLabel(film) {
  return String(film?.format || film?.filmFormat || MOVIE_FALLBACK.format).trim()
}

export function formatFilmGenresLabel(film) {
  const raw = film?.genres ?? film?.genre
  if (raw == null || raw === '') return MOVIE_FALLBACK.genres
  if (Array.isArray(raw)) {
    const parts = raw.map((item) => String(item).trim()).filter(Boolean)
    return parts.length ? parts.join(', ') : MOVIE_FALLBACK.genres
  }
  return String(raw).trim() || MOVIE_FALLBACK.genres
}

/** Phương thức thanh toán mặc định (hiển thị). */
export const MOMO_PAYMENT_METHOD = {
  id: 'MOMO',
  code: 'MOMO',
  label: 'MoMo',
  description: 'Thanh toán qua ví MoMo',
  icon: 'account_balance_wallet',
}

export function formatPaymentMethodLabel(code) {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized || normalized.startsWith('MOMO')) return MOMO_PAYMENT_METHOD.label
  return String(code).trim() || MOMO_PAYMENT_METHOD.label
}

export function getPaymentPayUrl(session) {
  return String(session?.payUrl || '').trim()
}

/** Giữ payUrl từ phiên tạo khi checkout-context không trả lại field này. */
export function mergePaymentSession(next, prev) {
  if (!next) return prev || null
  if (!prev) return next
  return {
    ...next,
    payUrl: getPaymentPayUrl(next) || getPaymentPayUrl(prev),
  }
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

/** Thời gian giữ ghế mặc định (5 phút). */
export const BOOKING_HOLD_DURATION_MS = 5 * 60 * 1000

function parseDateTimeMs(value) {
  if (value == null || value === '') return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

/** Hạn giữ ghế từ BE hoặc timeCreated + 5 phút. */
export function getReservationDeadlineMs(booking) {
  if (!booking) return null
  const until = parseDateTimeMs(booking.reservedUntil)
  if (until != null) return until
  const created = parseDateTimeMs(booking.timeCreated)
  if (created != null) return created + BOOKING_HOLD_DURATION_MS
  return null
}

/**
 * Hạn đếm ngược sau khi gọi API (ưu tiên secondsToExpire từ checkout-context).
 */
export function resolveReservationDeadlineMs({ booking, paymentSession, secondsToExpire } = {}) {
  if (secondsToExpire != null && secondsToExpire !== '') {
    const sec = Math.max(0, Number(secondsToExpire))
    if (Number.isFinite(sec)) return Date.now() + sec * 1000
  }
  const sessionUntil = parseDateTimeMs(paymentSession?.expiresAt)
  if (sessionUntil != null) return sessionUntil
  return getReservationDeadlineMs(booking)
}

export function formatCountdownFromMs(ms) {
  const totalSec = Math.max(0, Math.ceil(Number(ms || 0) / 1000))
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Tổng gốc trước khuyến mãi (BE: finalAmount). */
export function getBookingGrossAmount(booking) {
  return Number(booking?.finalAmount || 0)
}

/** Số tiền giảm từ khuyến mãi. */
export function getBookingPromotionDiscount(booking) {
  return Number(booking?.promotionDiscountAmount || 0)
}

/** Số tiền khách phải trả (BE: payableAmount, fallback finalAmount). */
export function getBookingPayableAmount(booking) {
  if (!booking) return 0
  const payable = booking.payableAmount
  if (payable != null && payable !== '') return Number(payable)
  return getBookingGrossAmount(booking)
}

export function getBookingPromotionLabel(booking) {
  const code = booking?.promotionCode?.trim()
  const name = booking?.promotionName?.trim()
  if (code && name) return `${code} — ${name}`
  return code || name || ''
}

function formatPromotionLabelFromParts(code, name) {
  const c = String(code || '').trim()
  const n = String(name || '').trim()
  if (c && n) return `${c} — ${n}`
  return c || n || ''
}

/**
 * Tiền hiển thị lúc checkout: KM áp dụng trên payment session, không phải trên booking lúc create.
 */
export function resolveCheckoutPricing(booking, paymentSession, checkoutContext) {
  const gross = getBookingGrossAmount(booking)
  const sessionAmount = paymentSession?.amount

  if (sessionAmount != null && sessionAmount !== '') {
    const payableAmount = Number(sessionAmount)
    const promotionDiscount = Number(paymentSession?.promotionDiscountAmount || 0)
    return {
      grossAmount: promotionDiscount > 0 ? payableAmount + promotionDiscount : gross,
      payableAmount,
      promotionDiscount,
      promotionLabel: formatPromotionLabelFromParts(
        paymentSession?.promotionCode,
        paymentSession?.promotionName,
      ),
    }
  }

  const preview = checkoutContext?.appliedPromotion || checkoutContext?.promotionPreview
  if (preview) {
    const promotionDiscount = Number(preview.discountAmount || 0)
    const payableAmount = Number(
      preview.finalAmount ?? Math.max(0, Number(preview.originalAmount ?? gross) - promotionDiscount),
    )
    return {
      grossAmount: Number(preview.originalAmount ?? gross),
      payableAmount,
      promotionDiscount,
      promotionLabel: formatPromotionLabelFromParts(preview.promotionCode, null),
    }
  }

  return {
    grossAmount: gross,
    payableAmount: getBookingPayableAmount(booking),
    promotionDiscount: getBookingPromotionDiscount(booking),
    promotionLabel: getBookingPromotionLabel(booking),
  }
}

/** Gắn số tiền/KM từ payment session lên booking (lưu cache kết quả đặt vé). */
export function enrichBookingWithPaymentSession(booking, paymentSession, { promotionCode } = {}) {
  if (!booking) return booking
  const patch = {}
  if (paymentSession?.amount != null && paymentSession.amount !== '') {
    patch.payableAmount = paymentSession.amount
  }
  if (paymentSession?.promotionDiscountAmount != null) {
    patch.promotionDiscountAmount = paymentSession.promotionDiscountAmount
  }
  if (paymentSession?.promotionCode) {
    patch.promotionCode = paymentSession.promotionCode
  } else if (promotionCode) {
    patch.promotionCode = promotionCode
  }
  if (paymentSession?.promotionName) {
    patch.promotionName = paymentSession.promotionName
  }
  return { ...booking, ...patch }
}

export function isBookingUnpaid(booking) {
  return String(booking?.paymentStatus || '').trim().toUpperCase() !== 'PAID'
}

export function getBookingCinemaName(booking) {
  const name = String(booking?.cinemaName || booking?.cinema?.name || '').trim()
  return name || '—'
}

export function canCancelBooking(booking) {
  if (!booking) return false
  if (booking.bookingStatus === 'CONFIRMED' && booking.paymentStatus === 'PAID') return false
  return booking.bookingStatus === 'PENDING' || booking.bookingStatus === 'RESERVED'
}

export function readAuthUser() {
  try {
    const raw = localStorage.getItem('currentUser')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function readAuthRole() {
  return String(readAuthUser()?.role || '')
    .trim()
    .toUpperCase()
}

export const STAFF_SELL_QUERY = 'staffSell'

export function isOperatorRole(role = readAuthRole()) {
  const normalized = String(role || '')
    .trim()
    .toUpperCase()
  return normalized === 'ADMIN' || normalized === 'MANAGER' || normalized === 'STAFF'
}

export function isStaffSellMode(searchParams) {
  const value = searchParams?.get(STAFF_SELL_QUERY)
  return value === '1' || value === 'true'
}

export function appendStaffSellQuery(path, searchParams) {
  if (!isStaffSellMode(searchParams)) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}${STAFF_SELL_QUERY}=1`
}

export function readJsonStorage(key) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeJsonStorage(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value))
}

export function removeJsonStorage(key) {
  sessionStorage.removeItem(key)
}

export function getShowtimeFilm(showtime) {
  return showtime?.film || showtime?.filmResponse || null
}

export function getShowtimeFilmId(showtime, fallbackFilmId = '') {
  const film = getShowtimeFilm(showtime)
  return String(showtime?.filmId || film?.id || fallbackFilmId || '').trim()
}

export function getShowtimeHall(showtime) {
  return showtime?.hall || showtime?.hallResponse || null
}

export function getShowtimeCinema(showtime) {
  const hall = getShowtimeHall(showtime)
  const cinema = showtime?.cinema || showtime?.cinemaResponse || hall?.cinemaResponse || hall?.cinema || null
  const cinemaId =
    showtime?.cinemaId || cinema?.id || hall?.cinemaId || hall?.cinemaResponse?.id || ''
  const cinemaName =
    cinema?.name || hall?.cinemaName || showtime?.cinemaName || showtime?.cinema?.name || ''
  if (cinemaId && cinemaName && !cinema?.name) {
    return { ...cinema, id: cinemaId, name: cinemaName }
  }
  return cinema
}

export function getShowtimeCinemaName(showtime) {
  const cinema = getShowtimeCinema(showtime)
  if (cinema?.name) return String(cinema.name).trim()
  const hall = getShowtimeHall(showtime)
  return String(hall?.cinemaName || showtime?.cinemaName || '').trim()
}

export function getShowtimeCinemaId(showtime) {
  return (
    showtime?.cinemaId ||
    getShowtimeCinema(showtime)?.id ||
    getShowtimeHall(showtime)?.cinemaId ||
    getShowtimeHall(showtime)?.cinemaResponse?.id ||
    ''
  )
}

/** Map id → tên rạp từ GET /films/{id} khi BE trả cinemas / showingCinemas. */
export function buildCinemaNameLookupFromFilm(film) {
  const lookup = {}
  const sources = [film?.cinemas, film?.showingCinemas, film?.cinemaList]
  for (const list of sources) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      const id = item?.id || item?.cinemaId
      const name = item?.name || item?.cinemaName
      if (id && name) lookup[id] = String(name).trim()
    }
  }
  return lookup
}

export function getShowtimeHallId(showtime) {
  return showtime?.hallId || getShowtimeHall(showtime)?.id || ''
}

export function getFilmTitle(showtime) {
  const film = getShowtimeFilm(showtime)
  return film?.title || film?.name || MOVIE_FALLBACK.title
}

export function getFilmPoster(showtime) {
  return getShowtimeFilm(showtime)?.poster || MOVIE_FALLBACK.poster
}

export function formatDateTime(value, options) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('vi-VN', options).format(date)
}

export function formatShowtimeDate(value) {
  return formatDateTime(value, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatShowtimeTime(value) {
  return formatDateTime(value, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const VI_WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export function toApiLocalDateString(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 7 ngày từ hôm nay (local), kèm thứ. */
export function buildBookingDateOptions(dayCount = 7) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const options = []
  for (let i = 0; i < dayCount; i += 1) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    options.push({
      value: toApiLocalDateString(date),
      weekday: VI_WEEKDAY_SHORT[date.getDay()],
      dayLabel: `${date.getDate()}/${date.getMonth() + 1}`,
      isToday: i === 0,
    })
  }
  return options
}

export function extractCinemasFromShowtimes(showtimes, nameById = {}) {
  const map = new Map()
  for (const showtime of showtimes || []) {
    const id = getShowtimeCinemaId(showtime)
    if (!id || map.has(id)) continue
    const cinema = getShowtimeCinema(showtime)
    const name = getShowtimeCinemaName(showtime) || nameById[id] || cinema?.name || 'Rạp chiếu'
    map.set(id, {
      id,
      name,
      address: cinema?.address || '',
    })
  }
  return Array.from(map.values())
}

export function buildLayoutFromHall(hall) {
  const seats = Array.isArray(hall?.seats) ? hall.seats : []
  return seatsToLayoutDefinition(seats, 8, 10)
}

function isSeatMapSeatCell(cell) {
  return cell?.kind === 'SEAT' || (cell?.seatType && cell?.seatCode)
}

export function getSeatsFromSeatMap(seatMap) {
  if (!Array.isArray(seatMap?.cells)) return []
  return seatMap.cells.filter(isSeatMapSeatCell).map((cell) => ({
    row: cell.row,
    col: cell.col,
    seatType: cell.seatType,
    seatCode: cell.seatCode,
    state: cell.state,
    price: cell.price,
  }))
}

export function buildLayoutFromSeatMap(seatMap) {
  const seats = getSeatsFromSeatMap(seatMap)
  const layout = seatsToLayoutDefinition(
    seats,
    seatMap?.totalRows || 8,
    seatMap?.totalCols || 10,
  )
  if (seatMap?.screenPosition) {
    layout.screenPosition = seatMap.screenPosition
  }
  return layout
}

export function getReservedSeatLabelsFromSeatMap(seatMap) {
  return getSeatsFromSeatMap(seatMap)
    .filter((seat) => seat.state && seat.state !== 'AVAILABLE')
    .map((seat) => formatSeatLabel(seat.row, seat.col))
}

export function findSeatInSeatMap(seatMap, label) {
  return findSeatByLabel(getSeatsFromSeatMap(seatMap), label)
}

/** Giá 1 ô khi đặt vé — COUPLE: couplePrice là giá cả cặp, mỗi ô = một nửa. */
export function getBookingSeatUnitPrice(amount, seatType) {
  const value = Number(amount || 0)
  if (String(seatType || '').toUpperCase() === SEAT_TYPE.COUPLE && value > 0) {
    return Math.round(value / 2)
  }
  return value
}

export function resolveSeatPriceFromSeatMap(seatMap, label, pricingPolicy) {
  const seat = findSeatInSeatMap(seatMap, label)
  if (seat?.price != null && seat.price !== '') {
    return getBookingSeatUnitPrice(seat.price, seat.seatType)
  }
  return resolveSeatPrice(pricingPolicy, seat?.seatType)
}

export function seatLabelFromSeat(seat) {
  return seat?.seatCode || formatSeatLabel(seat?.row || 1, seat?.col || 1)
}

export function findSeatByLabel(seats, label) {
  const normalized = String(label || '').trim().toUpperCase()
  return (seats || []).find((seat) => {
    const seatCode = String(seat?.seatCode || '').trim().toUpperCase()
    const generated = formatSeatLabel(seat?.row || 1, seat?.col || 1).toUpperCase()
    return seatCode === normalized || generated === normalized
  })
}

export function resolveSeatPrice(pricingPolicy, seatType) {
  const normalizedType = String(seatType || '').toUpperCase()
  if (normalizedType === SEAT_TYPE.VIP) {
    return Number(pricingPolicy?.vipPrice || pricingPolicy?.standardPrice || 110000)
  }
  if (normalizedType === SEAT_TYPE.COUPLE) {
    const pairPrice = Number(
      pricingPolicy?.couplePrice || pricingPolicy?.vipPrice || pricingPolicy?.standardPrice || 110000,
    )
    return getBookingSeatUnitPrice(pairPrice, SEAT_TYPE.COUPLE)
  }
  return Number(pricingPolicy?.standardPrice || 110000)
}

export function normalizeProductToCombo(product) {
  const type = product.type || ''
  return {
    id: product.id,
    name: product.name || 'Combo',
    description: product.description || 'Sản phẩm tại rạp',
    price: Number(product.price || 0),
    imageUrl: String(product.imageUrl || '').trim(),
    type,
    icon: type === 'DRINK' ? 'local_cafe' : type === 'FOOD' ? 'fastfood' : 'local_movies',
    quantity: 0,
    raw: product,
  }
}
