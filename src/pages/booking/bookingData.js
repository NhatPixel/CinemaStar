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

export const PAYMENT_METHODS = [
  { id: 'vietqr', label: 'VietQR', description: 'Quét mã QR qua ứng dụng ngân hàng', icon: 'qr_code_2' },
  { id: 'card', label: 'Thẻ nội địa', description: 'ATM/Napas và Internet Banking', icon: 'credit_card' },
  { id: 'wallet', label: 'Ví điện tử', description: 'Thanh toán nhanh qua ví liên kết', icon: 'account_balance_wallet' },
]

export function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
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
  return showtime?.cinema || showtime?.cinemaResponse || hall?.cinemaResponse || hall?.cinema || null
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

export function buildLayoutFromHall(hall) {
  const seats = Array.isArray(hall?.seats) ? hall.seats : []
  return seatsToLayoutDefinition(seats, 8, 10)
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
    return Number(pricingPolicy?.couplePrice || pricingPolicy?.vipPrice || pricingPolicy?.standardPrice || 110000)
  }
  return Number(pricingPolicy?.standardPrice || 110000)
}

export function normalizeProductToCombo(product) {
  return {
    id: product.id,
    name: product.name || 'Combo',
    description: product.description || 'Sản phẩm tại rạp',
    price: Number(product.price || 0),
    icon: product.type === 'DRINK' ? 'local_cafe' : product.type === 'FOOD' ? 'fastfood' : 'local_movies',
    quantity: 0,
    raw: product,
  }
}
