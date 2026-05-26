import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CustomSelect, Icon, Input, Text, useToast } from '../../components'
import { getOperatorBookings, updateBookingStatus } from '../../api/booking'
import {
  BOOKING_STATUS_BADGE_CLASS,
  BOOKING_STATUS_LABEL_VI,
  BOOKING_STATUS_OPTIONS,
  PAYMENT_STATUS_BADGE_CLASS,
  PAYMENT_STATUS_LABEL_VI,
  PAYMENT_STATUS_OPTIONS,
} from '../../constants/bookingStatusOptions'
import { formatCurrency } from './bookingData'

const FILTER_BOOKING_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả booking' },
  ...BOOKING_STATUS_OPTIONS,
]

const FILTER_PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả thanh toán' },
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
  const [rows, setRows] = useState([])
  const [keyword, setKeyword] = useState('')
  const [bookingStatus, setBookingStatus] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    document.title = 'Quản lý booking - CinemaStar'
  }, [])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    setLoading(true)

    ;(async () => {
      try {
        const data = await getOperatorBookings({ signal: ac.signal })
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách booking')
        setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [refreshTick, toast])

  const filteredRows = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return rows.filter((booking) => {
      const matchesBooking = bookingStatus === 'all' || booking.bookingStatus === bookingStatus
      const matchesPayment = paymentStatus === 'all' || booking.paymentStatus === paymentStatus
      const text = `${booking.id || ''} ${booking.customerInfo?.fullName || ''} ${
        booking.customerInfo?.phone || ''
      } ${seatsText(booking)}`.toLowerCase()
      return matchesBooking && matchesPayment && (!q || text.includes(q))
    })
  }, [bookingStatus, keyword, paymentStatus, rows])

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
        toast.success('Cập nhật booking thành công')
        setRefreshTick((n) => n + 1)
      } catch (e) {
        setRows(previousRows)
        toast.error(e?.message || 'Cập nhật booking thất bại')
      } finally {
        setUpdatingId('')
      }
    },
    [rows, toast],
  )

  return (
    <main className="min-w-0 flex-1 p-6 md:p-8">
      <header className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
            Quản lý booking
          </Text>
          <Text variant="small" className="mt-1 text-slate-500 dark:text-slate-400">
            Theo dõi booking theo rạp được phân quyền và cập nhật trạng thái xử lý.
          </Text>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="rounded-xl px-5 py-3 font-bold"
          onClick={() => setRefreshTick((n) => n + 1)}
          disabled={loading}
        >
          <Icon name="refresh" />
          Tải lại
        </Button>
      </header>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-primary/20 dark:bg-primary/5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Input
              name="bookingSearch"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm mã booking, tên khách, SĐT, ghế..."
              icon="search"
            />
          </div>
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
                <th className="px-5 py-4 text-sm font-semibold min-w-[180px]">Booking</th>
                <th className="px-5 py-4 text-sm font-semibold min-w-[180px]">Thanh toán</th>
                <th className="px-5 py-4 text-sm font-semibold">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-primary/10">
              {loading ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                    Đang tải danh sách booking...
                  </td>
                </tr>
              ) : null}
              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                    Không có booking phù hợp.
                  </td>
                </tr>
              ) : null}
              {!loading
                ? filteredRows.map((booking) => (
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
                        {formatCurrency(Number(booking.finalAmount || 0))}
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                              BOOKING_STATUS_BADGE_CLASS[booking.bookingStatus] || ''
                            }`}
                          >
                            {BOOKING_STATUS_LABEL_VI[booking.bookingStatus] || booking.bookingStatus}
                          </span>
                          <CustomSelect
                            name={`bookingStatus-${booking.id}`}
                            value={booking.bookingStatus || ''}
                            onChange={(e) =>
                              handleStatusChange(booking, { bookingStatus: e.target.value })
                            }
                            options={BOOKING_STATUS_OPTIONS.filter((opt) => opt.value !== 'EXPIRED')}
                            disabled={updatingId === booking.id}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                              PAYMENT_STATUS_BADGE_CLASS[booking.paymentStatus] || ''
                            }`}
                          >
                            {PAYMENT_STATUS_LABEL_VI[booking.paymentStatus] || booking.paymentStatus}
                          </span>
                          <CustomSelect
                            name={`paymentStatus-${booking.id}`}
                            value={booking.paymentStatus || ''}
                            onChange={(e) =>
                              handleStatusChange(booking, { paymentStatus: e.target.value })
                            }
                            options={PAYMENT_STATUS_OPTIONS}
                            disabled={updatingId === booking.id}
                          />
                        </div>
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
      </div>
    </main>
  )
}

export default BookingManagement
