import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFooter, AppHeader, Button, CustomSelect, Input, Text, useToast } from '../../components'
import { buildBookingsSearchBody, searchMyBookingsByListType } from '../../api/booking'
import {
  PAYMENT_STATUS_BADGE_CLASS,
  PAYMENT_STATUS_LABEL_VI,
} from '../../constants/bookingStatusOptions'
import {
  CUSTOMER_BOOKING_LIST_META,
  CUSTOMER_BOOKING_LIST_OPTIONS,
} from '../../constants/customerBookingListOptions'
import { PAGE_MAIN, PAGE_SHELL } from '../../constants/pageLayout'
import { isCustomerRole } from '../../constants/userRoleLabels'
import {
  formatCurrency,
  getBookingCinemaName,
  getBookingPayableAmount,
  isBookingUnpaid,
} from './bookingData'

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

function BookingHistory() {
  const toast = useToast()
  const navigate = useNavigate()
  const [listType, setListType] = useState('active')
  const [rows, setRows] = useState([])
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(true)

  const isActiveList = listType === 'active'
  const listMeta = CUSTOMER_BOOKING_LIST_META[listType] || CUSTOMER_BOOKING_LIST_META.active
  const tableColSpan = 8

  useEffect(() => {
    document.title = 'Vé của tôi - CinemaStar'
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword, listType])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    setLoading(true)

    if (!isCustomerRole()) {
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
        const data = await searchMyBookingsByListType(listType, body, { signal: ac.signal })
        if (cancelled) return
        setRows(data?.data || [])
        setTotalPages(data?.totalPages ?? 0)
        setTotalElements(data?.totalElements ?? 0)
        setHasNext(Boolean(data?.hasNext))
        setHasPrevious(Boolean(data?.hasPrevious))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách đặt vé')
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
  }, [page, debouncedKeyword, listType, toast])

  const isCustomer = isCustomerRole()

  const openBooking = (booking) => {
    if (!booking?.id) return
    if (isBookingUnpaid(booking)) {
      navigate(`/booking/result?bookingId=${booking.id}`)
      return
    }
    navigate(`/bookings/${booking.id}`)
  }

  const loadingLabel = useMemo(
    () => (isActiveList ? 'Đang tải đơn đang xử lý...' : 'Đang tải vé đã thanh toán...'),
    [isActiveList],
  )

  return (
    <div className={PAGE_SHELL}>
      <AppHeader />
      <main className={`${PAGE_MAIN} space-y-8`}>
        <header className="flex flex-col gap-4 rounded-3xl border border-primary/20 bg-[#120a1a] p-6 shadow-xl shadow-primary/10 md:p-8">
          <div>
            <Text variant="h1" className="text-4xl font-black text-white">
              Vé của tôi
            </Text>
            <p className="mt-2 text-slate-400">{listMeta.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CustomSelect
              name="bookingListType"
              value={listType}
              onChange={(e) => setListType(e.target.value)}
              options={CUSTOMER_BOOKING_LIST_OPTIONS}
            />
            <Input
              name="bookingSearch"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm mã đơn, tên phim..."
              icon="search"
            />
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#120a1a]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-white/10 bg-white/5 text-sm text-slate-300">
                <tr>
                  <th className="px-5 py-4">Mã</th>
                  <th className="px-5 py-4">Rạp</th>
                  <th className="px-5 py-4">Phim</th>
                  <th className="px-5 py-4">Suất chiếu</th>
                  <th className="px-5 py-4">Ghế</th>
                  <th className="px-5 py-4">Tổng tiền</th>
                  <th className="px-5 py-4">Thanh toán</th>
                  <th className="px-5 py-4">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-400" colSpan={tableColSpan}>
                      {loadingLabel}
                    </td>
                  </tr>
                ) : null}
                {!loading && !isCustomer ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-400" colSpan={tableColSpan}>
                      Chỉ tài khoản khách hàng mới xem được vé cá nhân.
                    </td>
                  </tr>
                ) : null}
                {!loading && isCustomer && rows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-400" colSpan={tableColSpan}>
                      {listMeta.empty}
                    </td>
                  </tr>
                ) : null}
                {!loading && isCustomer
                  ? rows.map((booking) => (
                      <tr
                        key={booking.id}
                        className="cursor-pointer text-sm text-slate-300 hover:bg-white/5"
                        onClick={() => openBooking(booking)}
                      >
                        <td className="px-5 py-4 font-mono font-bold text-white">
                          {shortId(booking.id)}
                        </td>
                        <td className="px-5 py-4 font-medium text-white">
                          {getBookingCinemaName(booking)}
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
                              PAYMENT_STATUS_BADGE_CLASS[booking.paymentStatus] || ''
                            }`}
                          >
                            {PAYMENT_STATUS_LABEL_VI[booking.paymentStatus] || booking.paymentStatus}
                          </span>
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
                  ? `Hiển thị ${rows.length} / ${totalElements} đơn — ${listMeta.title}`
                  : `Đang hiển thị ${rows.length} đơn — ${listMeta.title}`}
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
