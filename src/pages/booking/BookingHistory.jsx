import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFooter, AppHeader, CustomSelect, Input, Text, useToast } from '../../components'
import { getMyBookings, getOperatorBookings } from '../../api/booking'
import {
  BOOKING_STATUS_BADGE_CLASS,
  BOOKING_STATUS_LABEL_VI,
  BOOKING_STATUS_OPTIONS,
  PAYMENT_STATUS_BADGE_CLASS,
  PAYMENT_STATUS_LABEL_VI,
} from '../../constants/bookingStatusOptions'
import { PAGE_MAIN, PAGE_SHELL } from '../../constants/pageLayout'
import { formatCurrency } from './bookingData'

const FILTER_STATUS_OPTIONS = [{ value: 'all', label: 'Tất cả trạng thái' }, ...BOOKING_STATUS_OPTIONS]

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
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Lịch sử booking - CinemaStar'
  }, [])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    setLoading(true)

    ;(async () => {
      try {
        const role = readRole()
        const data =
          role === 'ADMIN' || role === 'MANAGER' || role === 'STAFF'
            ? await getOperatorBookings({ signal: ac.signal })
            : await getMyBookings({ signal: ac.signal })
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được lịch sử booking')
        setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [toast])

  const filteredRows = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return rows.filter((booking) => {
      const matchesStatus = status === 'all' || booking.bookingStatus === status
      const text = `${booking.id || ''} ${seatsText(booking)} ${booking.customerInfo?.fullName || ''}`.toLowerCase()
      return matchesStatus && (!q || text.includes(q))
    })
  }, [keyword, rows, status])

  return (
    <div className={PAGE_SHELL}>
      <AppHeader />
      <main className={`${PAGE_MAIN} space-y-8`}>
        <header className="flex flex-col gap-4 rounded-3xl border border-primary/20 bg-[#120a1a] p-6 shadow-xl shadow-primary/10 md:p-8">
          <div>
            <Text variant="h1" className="text-4xl font-black text-white">
              Lịch sử booking
            </Text>
            <p className="mt-2 text-slate-400">Xem lại các lần đặt vé và trạng thái thanh toán của bạn.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_240px]">
            <Input
              name="bookingSearch"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm mã booking, ghế..."
              icon="search"
            />
            <CustomSelect
              name="bookingStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={FILTER_STATUS_OPTIONS}
            />
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#120a1a]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-white/10 bg-white/5 text-sm text-slate-300">
                <tr>
                  <th className="px-5 py-4">Mã</th>
                  <th className="px-5 py-4">Ghế</th>
                  <th className="px-5 py-4">Tổng tiền</th>
                  <th className="px-5 py-4">Booking</th>
                  <th className="px-5 py-4">Thanh toán</th>
                  <th className="px-5 py-4">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                      Đang tải lịch sử booking...
                    </td>
                  </tr>
                ) : null}
                {!loading && filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                      Chưa có booking phù hợp.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? filteredRows.map((booking) => (
                      <tr
                        key={booking.id}
                        className="cursor-pointer text-sm text-slate-300 hover:bg-white/5"
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                      >
                        <td className="px-5 py-4 font-mono font-bold text-white">{shortId(booking.id)}</td>
                        <td className="px-5 py-4">{seatsText(booking)}</td>
                        <td className="px-5 py-4 font-bold text-primary">
                          {formatCurrency(Number(booking.finalAmount || 0))}
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
                        <td className="px-5 py-4">{formatDateTime(booking.timeCreated)}</td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  )
}

export default BookingHistory
