import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFooter, AppHeader, Button, Input, Text, useToast } from '../../components'
import { buildBookingsSearchBody, searchMyActiveBookings } from '../../api/booking'
import {
  BOOKING_STATUS_BADGE_CLASS,
  BOOKING_STATUS_LABEL_VI,
  PAYMENT_STATUS_BADGE_CLASS,
  PAYMENT_STATUS_LABEL_VI,
} from '../../constants/bookingStatusOptions'
import { PAGE_MAIN, PAGE_SHELL } from '../../constants/pageLayout'
import { formatCurrency, getBookingPayableAmount } from './bookingData'

const PAGE_SIZE = 12

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatShowtimeRange(booking) {
  const start = booking?.showtimeStartDateTime
  const end = booking?.showtimeEndDateTime
  if (!start && !end) return '—'
  if (start && end) return `${formatDateTime(start)} → ${formatDateTime(end)}`
  return formatDateTime(start || end)
}

function shortId(id) {
  if (!id) return '—'
  return String(id).slice(0, 8).toUpperCase()
}

function seatsText(booking) {
  const seats = booking?.seatItems?.map((seat) => seat.seatCode).filter(Boolean) || []
  return seats.length ? seats.join(', ') : '—'
}

function readRole() {
  try {
    const raw = localStorage.getItem('currentUser')
    const user = raw ? JSON.parse(raw) : null
    return String(user?.role || '').trim().toUpperCase()
  } catch {
    return ''
  }
}

function BookingHistory() {
  const toast = useToast()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Lịch sử đặt vé - CinemaStar'
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    setLoading(true)

    const role = readRole()
    if (role !== 'CUSTOMER') {
      if (!cancelled) {
        setRows([])
        setLoading(false)
      }
      return () => {
        cancelled = true
        ac.abort()
      }
    }

    const body = buildBookingsSearchBody({
      page,
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
    })

    ;(async () => {
      try {
        const data = await searchMyActiveBookings(body, { signal: ac.signal })
        if (cancelled) return
        setRows(data?.data || [])
        setTotalPages(data?.totalPages ?? 0)
        setTotalElements(data?.totalElements ?? 0)
        setHasNext(Boolean(data?.hasNext))
        setHasPrevious(Boolean(data?.hasPrevious))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được lịch sử đặt vé')
        setRows([])
        setTotalPages(0)
        setTotalElements(0)
        setHasNext(false)
        setHasPrevious(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [page, debouncedKeyword, toast])

  const isCustomer = readRole() === 'CUSTOMER'

  return (
    <div className={PAGE_SHELL}>
      <AppHeader />
      <main className={`${PAGE_MAIN} space-y-8`}>
        <header className="flex flex-col gap-4 rounded-3xl border border-primary/20 bg-[#120a1a] p-6 shadow-xl shadow-primary/10 md:p-8">
          <div>
            <Text variant="h1" className="text-4xl font-black text-white">
              Lịch sử đặt vé
            </Text>
            <p className="mt-2 text-slate-400">
              Các đơn đang giữ ghế hoặc chờ thanh toán.
            </p>
          </div>
          <Input
            name="bookingSearch"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm mã đơn, tên phim..."
            icon="search"
          />
        </header>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#120a1a]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-white/10 bg-white/5 text-sm text-slate-300">
                <tr>
                  <th className="px-5 py-4">Mã</th>
                  <th className="px-5 py-4">Phim</th>
                  <th className="px-5 py-4">Suất chiếu</th>
                  <th className="px-5 py-4">Ghế</th>
                  <th className="px-5 py-4">Tổng tiền</th>
                  <th className="px-5 py-4">Đặt vé</th>
                  <th className="px-5 py-4">Thanh toán</th>
                  <th className="px-5 py-4">Giữ đến</th>
                  <th className="px-5 py-4">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-400" colSpan={9}>
                      Đang tải lịch sử đặt vé...
                    </td>
                  </tr>
                ) : null}
                {!loading && !isCustomer ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-400" colSpan={9}>
                      Chỉ tài khoản khách hàng mới xem được lịch sử đặt vé cá nhân.
                    </td>
                  </tr>
                ) : null}
                {!loading && isCustomer && rows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-400" colSpan={9}>
                      Không có đơn.
                    </td>
                  </tr>
                ) : null}
                {!loading && isCustomer
                  ? rows.map((booking) => (
                      <tr
                        key={booking.id}
                        className="cursor-pointer text-sm text-slate-300 hover:bg-white/5"
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                      >
                        <td className="px-5 py-4 font-mono font-bold text-white">
                          {shortId(booking.id)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-white">
                          {booking.filmTitle || '—'}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400">
                          {formatShowtimeRange(booking)}
                        </td>
                        <td className="px-5 py-4">{seatsText(booking)}</td>
                        <td className="px-5 py-4 font-bold text-primary">
                          {formatCurrency(getBookingPayableAmount(booking))}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                              BOOKING_STATUS_BADGE_CLASS[booking.bookingStatus] || ''
                            }`}
                          >
                            {BOOKING_STATUS_LABEL_VI[booking.bookingStatus] || booking.bookingStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                              PAYMENT_STATUS_BADGE_CLASS[booking.paymentStatus] || ''
                            }`}
                          >
                            {PAYMENT_STATUS_LABEL_VI[booking.paymentStatus] || booking.paymentStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-amber-400/90">
                          {formatDateTime(booking.reservedUntil)}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400">
                          {formatDateTime(booking.timeCreated)}
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          {!loading && rows.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Text variant="small" className="text-sm text-slate-400">
                {totalElements > 0
                  ? `Hiển thị ${rows.length} / ${totalElements} đơn đặt vé`
                  : `Đang hiển thị ${rows.length} đơn đặt vé`}
              </Text>
              {totalPages > 1 && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-300 hover:bg-white/5"
                    disabled={!hasPrevious || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {'<'}
                  </Button>
                  <Text variant="small" className="text-sm text-slate-400">
                    Trang {page}
                    {totalPages > 0 ? ` / ${totalPages}` : ''}
                  </Text>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-300 hover:bg-white/5"
                    disabled={!hasNext || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {'>'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      <AppFooter />
    </div>
  )
}

export default BookingHistory
