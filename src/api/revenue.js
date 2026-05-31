import { callApi, buildPost } from './config/client'
import { request } from './config/transport'
import { bookingPath, paymentPath } from './config/paths'
import { readCurrentUserRole } from '../constants/userRoleLabels'

const PAYMENT_REVENUE_SEARCH_ADMIN = paymentPath('revenues/cinemas/search')
const PAYMENT_REVENUE_SEARCH_ME = paymentPath('revenues/cinemas/me/search')
const PAYMENT_REVENUE_EXPORT = paymentPath('revenues/cinemas/export')

const BOOKING_REVENUE_SEARCH_ADMIN = bookingPath('revenues/cinemas/search')
const BOOKING_REVENUE_SEARCH_ME = bookingPath('revenues/cinemas/me/search')
const BOOKING_REVENUE_EXPORT = bookingPath('revenues/cinemas/export')

function revenueSearchPath(adminPath, mePath) {
  return readCurrentUserRole() === 'ADMIN' ? adminPath : mePath
}

/**
 * Body chung BookingRevenueReportRequest / CinemaRevenueReportRequest
 */
export function buildRevenueReportBody({
  page = 1,
  size = 12,
  keyword,
  dateFrom,
  dateTo,
  cinemaIds,
  filmIds,
  selectedIds,
} = {}) {
  const body = {
    cinemaIds: Array.isArray(cinemaIds) ? cinemaIds.filter(Boolean) : [],
    filmIds: Array.isArray(filmIds) ? filmIds.filter(Boolean) : [],
    pageRequest: {
      page,
      size,
      keyword: keyword?.trim() ?? '',
      sortBy: [],
      filterBy: [],
    },
  }
  const from = String(dateFrom || '').trim()
  const to = String(dateTo || '').trim()
  if (from || to) {
    body.dateRange = {
      ...(from ? { from: `${from}T00:00:00` } : {}),
      ...(to ? { to: `${to}T23:59:59` } : {}),
    }
  }
  if (Array.isArray(selectedIds) && selectedIds.length > 0) {
    body.selectedIds = selectedIds.filter(Boolean)
  }
  return body
}

async function postRevenueReport(url, body, { signal } = {}) {
  const { url: path, options } = buildPost(url, body)
  const resp = await callApi({
    url: path,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) return resp.data
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được báo cáo',
    raw: resp,
  }
}

/** POST /payments/revenues/cinemas/search | .../me/search */
export function searchPaymentCinemaRevenue(body, options = {}) {
  const url = revenueSearchPath(PAYMENT_REVENUE_SEARCH_ADMIN, PAYMENT_REVENUE_SEARCH_ME)
  return postRevenueReport(url, body, options)
}

/** POST /bookings/revenues/cinemas/search | .../me/search */
export function searchBookingCinemaRevenue(body, options = {}) {
  const url = revenueSearchPath(BOOKING_REVENUE_SEARCH_ADMIN, BOOKING_REVENUE_SEARCH_ME)
  return postRevenueReport(url, body, options)
}

async function postRevenueExport(url, body, { signal } = {}) {
  const { url: path, options } = buildPost(url, body)
  const response = await request(path, {
    ...options,
    signal,
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const err = await response.json()
      throw {
        status: response.status,
        message: err?.message || 'Xuất báo cáo thất bại',
        raw: err,
      }
    }
    throw {
      status: response.status,
      message: 'Xuất báo cáo thất bại',
    }
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^";\n]+)"?/i)
  const filename = match?.[1]?.trim() || 'revenue_report.xlsx'
  return { blob, filename }
}

/** POST /payments/revenues/cinemas/export */
export function exportPaymentCinemaRevenue(body, options = {}) {
  return postRevenueExport(PAYMENT_REVENUE_EXPORT, body, options)
}

/** POST /bookings/revenues/cinemas/export */
export function exportBookingCinemaRevenue(body, options = {}) {
  return postRevenueExport(BOOKING_REVENUE_EXPORT, body, options)
}

export function downloadBlob({ blob, filename }) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
