import { formatSeatLabel, seatsToLayoutDefinition } from '../../components/hall/hallLayoutUtils'
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

export function getPaymentQrCodeUrl(session) {
  return String(session?.qrCodeUrl || session?.qrCode || '').trim()
}

/** Giữ qrCodeUrl từ phiên tạo khi checkout-context không trả lại field này. */
export function mergePaymentSession(next, prev) {
  if (!next) return prev || null
  if (!prev) return next
  return {
    ...next,
    qrCodeUrl: getPaymentQrCodeUrl(next) || getPaymentQrCodeUrl(prev),
    payUrl: next.payUrl || prev.payUrl,
  }
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
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
