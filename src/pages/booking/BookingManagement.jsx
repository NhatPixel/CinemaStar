import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CustomSelect, Input, Text, useToast } from '../../components'
import {
  buildBookingsSearchBody,
  searchOperatorBookings,
  updateBookingStatus,
} from '../../api/booking'
import {
  BOOKING_STATUS_BADGE_CLASS,
  BOOKING_STATUS_LABEL_VI,
  BOOKING_STATUS_OPTIONS,
  PAYMENT_STATUS_BADGE_CLASS,
  PAYMENT_STATUS_LABEL_VI,
  PAYMENT_STATUS_OPTIONS,
} from '../../constants/bookingStatusOptions'
import { isManagementOperationsReadOnly } from '../../constants/managementAccess'
import { formatCurrency, getBookingPayableAmount } from './bookingData'

const PAGE_SIZE = 12

const FILTER_BOOKING_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  ...BOOKING_STATUS_OPTIONS,
]

const FILTER_PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'Trạng thái thanh toán' },
  ...PAYMENT_STATUS_OPTIONS,
]

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

function shortId(id) {
  if (!id) return '—'
  return String(id).slice(0, 8).toUpperCase()
}

function seatsText(booking) {
  const seats = booking?.seatItems?.map((seat) => seat.seatCode).filter(Boolean) || []
  return seats.length ? seats.join(', ') : '—'
}

function BookingManagement() {
  const toast = useToast()
  const navigate = useNavigate()
  const readOnly = isManagementOperationsReadOnly()
  const [rows, setRows] = useState([])
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [bookingStatus, setBookingStatus] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    document.title = 'Quản lý đơn đặt vé - CinemaStar'
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword, bookingStatus, paymentStatus])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    setLoading(true)

    const body = buildBookingsSearchBody({
      page,
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
      bookingStatus,
      paymentStatus,
    })

    ;(async () => {
      try {
        const data = await searchOperatorBookings(body, { signal: ac.signal })
        if (cancelled) return
        setRows(data?.data || [])
        setTotalPages(data?.totalPages ?? 0)
        setTotalElements(data?.totalElements ?? 0)
        setHasNext(Boolean(data?.hasNext))
        setHasPrevious(Boolean(data?.hasPrevious))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách đơn đặt vé')
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
  }, [page, debouncedKeyword, bookingStatus, paymentStatus, refreshTick, toast])

  const handleStatusChange = useCallback(
    async (booking, patch) => {
      if (!booking?.id) return
      const payload = {
        bookingStatus: patch.bookingStatus || booking.bookingStatus,
        paymentStatus: patch.paymentStatus ?? booking.paymentStatus,
      }

      const previousRows = rows
      setRows((prev) =>
        prev.map((item) => (item.id === booking.id ? { ...item, ...payload } : item)),
      )
      setUpdatingId(booking.id)

      try {
        await updateBookingStatus(booking.id, payload)
        toast.success('Cập nhật đơn đặt vé thành công')
        setRefreshTick((n) => n + 1)
      } catch (e) {
        setRows(previousRows)
        toast.error(e?.message || 'Cập nhật đơn đặt vé thất bại')
      } finally {
        setUpdatingId('')
      }
    },
    [rows, toast],
  )

  return (
    <main className="min-w-0 flex-1 p-6 md:p-8">
      <header className="mb-8">
        <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
          Quản lý đơn đặt vé
        </Text>
        <Text variant="small" className="mt-1 text-slate-500 dark:text-slate-400">
          {readOnly
            ? 'Theo dõi đơn đặt vé theo rạp được phân quyền (chỉ xem).'
            : 'Theo dõi đơn đặt vé theo rạp được phân quyền và cập nhật trạng thái xử lý.'}
        </Text>
      </header>

      <section className="bg-white dark:bg-primary/5 p-6 rounded-2xl border border-slate-200 dark:border-primary/20 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            name="bookingSearch"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm mã đơn đặt vé, tên khách, SĐT, phim..."
            icon="search"
          />
          <CustomSelect
            name="bookingStatusFilter"
            value={bookingStatus}
            onChange={(e) => setBookingStatus(e.target.value)}
            options={FILTER_BOOKING_STATUS_OPTIONS}
          />
          <CustomSelect
            name="paymentStatusFilter"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            options={FILTER_PAYMENT_STATUS_OPTIONS}
          />
        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-primary/20 dark:bg-primary/5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-primary/20 dark:bg-background-dark/30">
                <th className="px-5 py-4 text-sm font-semibold">Mã</th>
                <th className="px-5 py-4 text-sm font-semibold">Khách hàng</th>
                <th className="px-5 py-4 text-sm font-semibold">Ghế</th>
                <th className="px-5 py-4 text-sm font-semibold">Tổng tiền</th>
                <th className="px-5 py-4 text-sm font-semibold min-w-[180px]">Đặt vé</th>
                <th className="px-5 py-4 text-sm font-semibold min-w-[180px]">Thanh toán</th>
                <th className="px-5 py-4 text-sm font-semibold">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-primary/10">
              {loading ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                    Đang tải danh sách đơn đặt vé...
                  </td>
                </tr>
              ) : null}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                    Không có đơn đặt vé phù hợp.
                  </td>
                </tr>
              ) : null}
              {!loading
                ? rows.map((booking) => (
                    <tr
                      key={booking.id}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-primary/5"
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                    >
                      <td className="px-5 py-4 font-mono text-sm font-bold">{shortId(booking.id)}</td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <p className="font-semibold">{booking.customerInfo?.fullName || '—'}</p>
                        <p className="text-xs text-slate-500">{booking.customerInfo?.phone || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-sm">{seatsText(booking)}</td>
                      <td className="px-5 py-4 font-bold text-primary">
                        {formatCurrency(getBookingPayableAmount(booking))}
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                            BOOKING_STATUS_BADGE_CLASS[booking.bookingStatus] || ''
                          }`}
                        >
                          {BOOKING_STATUS_LABEL_VI[booking.bookingStatus] || booking.bookingStatus}
                        </span>
                        {!readOnly ? (
                          <CustomSelect
                            name={`bookingStatus-${booking.id}`}
                            value={booking.bookingStatus || ''}
                            onChange={(e) =>
                              handleStatusChange(booking, { bookingStatus: e.target.value })
                            }
                            options={BOOKING_STATUS_OPTIONS.filter((opt) => opt.value !== 'EXPIRED')}
                            disabled={updatingId === booking.id}
                            className="mt-2"
                          />
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                            PAYMENT_STATUS_BADGE_CLASS[booking.paymentStatus] || ''
                          }`}
                        >
                          {PAYMENT_STATUS_LABEL_VI[booking.paymentStatus] || booking.paymentStatus}
                        </span>
                        {!readOnly ? (
                          <CustomSelect
                            name={`paymentStatus-${booking.id}`}
                            value={booking.paymentStatus || ''}
                            onChange={(e) =>
                              handleStatusChange(booking, { paymentStatus: e.target.value })
                            }
                            options={PAYMENT_STATUS_OPTIONS}
                            disabled={updatingId === booking.id}
                            className="mt-2"
                          />
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDateTime(booking.timeCreated)}
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-primary/20">
          {!loading && rows.length > 0 && (
            <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
              {totalElements > 0
                ? `Hiển thị ${rows.length} / ${totalElements} đơn đặt vé`
                : `Đang hiển thị ${rows.length} đơn đặt vé`}
            </Text>
          )}
          {!loading && totalPages > 1 && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:border-primary/20 dark:text-slate-300 dark:hover:bg-primary/10"
                disabled={!hasPrevious || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {'<'}
              </Button>
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                Trang {page}
                {totalPages > 0 ? ` / ${totalPages}` : ''}
              </Text>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:border-primary/20 dark:text-slate-300 dark:hover:bg-primary/10"
                disabled={!hasNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {'>'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default BookingManagement
