import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppFooter, AppHeader, Button, Icon, Text, useToast } from '../../components'
import { getBookingById, cancelBooking } from '../../api/booking'
import {
  BOOKING_STATUS_BADGE_CLASS,
  BOOKING_STATUS_LABEL_VI,
  PAYMENT_STATUS_BADGE_CLASS,
  PAYMENT_STATUS_LABEL_VI,
} from '../../constants/bookingStatusOptions'
import { PAGE_MAIN, PAGE_SHELL } from '../../constants/pageLayout'
import {
  BOOKING_RESULT_STORAGE_KEY,
  canCancelBooking,
  formatCurrency,
  getBookingGrossAmount,
  getPaymentPayUrl,
  resolveCheckoutPricing,
  readAuthRole,
  readJsonStorage,
} from './bookingData'

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

function DetailCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center gap-2 text-primary">
        <Icon name={icon} />
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="break-words font-bold text-white">{value || '—'}</p>
    </div>
  )
}

function BookingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    document.title = 'Chi tiết đơn đặt vé - CinemaStar'
  }, [])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    setLoading(true)

    ;(async () => {
      try {
        const data = await getBookingById(id, { signal: ac.signal })
        if (!cancelled) {
          setBooking(data)
        }
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được chi tiết đơn đặt vé')
        navigate('/bookings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [id, navigate, toast])

  const handleCancel = async () => {
    if (!booking?.id || cancelling) return
    if (!window.confirm('Bạn có chắc muốn hủy đơn đặt vé này?')) return
    try {
      setCancelling(true)
      await cancelBooking(booking.id)
      toast.success('Đã hủy đơn đặt vé')
      navigate('/bookings')
    } catch (e) {
      toast.error(e?.message || 'Không thể hủy đơn đặt vé')
    } finally {
      setCancelling(false)
    }
  }

  const cachedResult = readJsonStorage(BOOKING_RESULT_STORAGE_KEY)
  const paymentSession =
    cachedResult?.booking?.id === booking?.id ? cachedResult?.paymentSession : null
  const pricing = resolveCheckoutPricing(booking, paymentSession, cachedResult?.context)
  const payUrl = getPaymentPayUrl(paymentSession)
  const canPay = booking?.paymentStatus !== 'PAID' && Boolean(payUrl)
  const showCancel =
    readAuthRole() === 'CUSTOMER' && canCancelBooking(booking) && booking?.paymentStatus !== 'PAID'

  return (
    <div className={PAGE_SHELL}>
      <AppHeader />
      <main className={`${PAGE_MAIN} space-y-8`}>
        <header className="rounded-3xl border border-primary/20 bg-[#120a1a] p-6 shadow-xl shadow-primary/10 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Text variant="h1" className="text-4xl font-black text-white">
                Chi tiết đơn đặt vé
              </Text>
              <p className="mt-2 font-mono text-xl font-black tracking-[0.24em] text-primary">
                {shortId(booking?.id || id)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {canPay ? (
                <a href={payUrl} target="_blank" rel="noreferrer">
                  <Button className="rounded-full px-5">
                    <Icon name="payments" />
                    Thanh toán
                  </Button>
                </a>
              ) : null}
              {showCancel ? (
                <Button
                  variant="secondary"
                  className="rounded-full px-5"
                  disabled={cancelling}
                  onClick={handleCancel}
                >
                  {cancelling ? 'Đang hủy...' : 'Hủy đơn'}
                </Button>
              ) : null}
              <Link to="/bookings">
                <Button variant="secondary" className="rounded-full px-5">
                  <Icon name="arrow_back" />
                  Lịch sử
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <section className="rounded-3xl border border-white/10 bg-[#120a1a] p-8 text-center text-slate-400">
            Đang tải chi tiết đơn đặt vé...
          </section>
        ) : null}

        {!loading && booking ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <DetailCard icon="confirmation_number" label="Showtime ID" value={booking.showtimeId} />
              <DetailCard icon="festival" label="Cinema ID" value={booking.cinemaId} />
              <DetailCard icon="event" label="Ngày tạo" value={formatDateTime(booking.timeCreated)} />
              <DetailCard icon="timer" label="Giữ đến" value={formatDateTime(booking.reservedUntil)} />
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-[#120a1a] p-6">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <Text variant="h2" className="text-2xl font-black text-white">
                      Ghế đã đặt
                    </Text>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                        BOOKING_STATUS_BADGE_CLASS[booking.bookingStatus] || ''
                      }`}
                    >
                      {BOOKING_STATUS_LABEL_VI[booking.bookingStatus] || booking.bookingStatus}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-white/10 text-slate-400">
                        <tr>
                          <th className="py-3 pr-4">Mã ghế</th>
                          <th className="py-3 pr-4">Loại</th>
                          <th className="py-3 text-right">Giá</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {(booking.seatItems || []).map((seat) => (
                          <tr key={seat.id || seat.seatCode}>
                            <td className="py-4 pr-4 font-bold text-white">{seat.seatCode}</td>
                            <td className="py-4 pr-4 text-slate-300">{seat.seatType}</td>
                            <td className="py-4 text-right font-bold text-primary">
                              {formatCurrency(Number(seat.seatPriceSnapshot || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#120a1a] p-6">
                  <Text variant="h2" className="mb-5 text-2xl font-black text-white">
                    Combo / sản phẩm
                  </Text>
                  {(booking.productItems || []).length === 0 ? (
                    <p className="text-sm text-slate-400">Không có sản phẩm đi kèm.</p>
                  ) : (
                    <div className="space-y-3">
                      {booking.productItems.map((item) => (
                        <div
                          key={item.id || item.productId}
                          className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-4"
                        >
                          <div>
                            <p className="font-bold text-white">{item.productNameSnapshot || item.productId}</p>
                            <p className="text-sm text-slate-400">Số lượng: {item.quantity}</p>
                          </div>
                          <p className="font-bold text-primary">
                            {formatCurrency(Number(item.lineTotal || 0))}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <aside className="space-y-6">
                <div className="rounded-3xl border border-primary/20 bg-[#120a1a] p-6 shadow-xl shadow-primary/10">
                <Text variant="h2" className="mb-5 text-2xl font-black text-white">
                  Tổng quan
                </Text>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-slate-400">Khách hàng</p>
                    <p className="mt-1 font-bold text-white">{booking.customerInfo?.fullName || '—'}</p>
                    <p className="text-slate-400">{booking.customerInfo?.email || '—'}</p>
                    <p className="text-slate-400">{booking.customerInfo?.phone || '—'}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-slate-300">Trạng thái thanh toán</span>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                        PAYMENT_STATUS_BADGE_CLASS[booking.paymentStatus] || ''
                      }`}
                    >
                      {PAYMENT_STATUS_LABEL_VI[booking.paymentStatus] || booking.paymentStatus}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Tiền vé</span>
                    <span>{formatCurrency(Number(booking.ticketSubtotal || 0))}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Đồ ăn</span>
                    <span>{formatCurrency(Number(booking.productSubtotal || 0))}</span>
                  </div>
                  {pricing.promotionDiscount > 0 ? (
                    <>
                      <div className="flex justify-between text-slate-300">
                        <span>Tạm tính</span>
                        <span>{formatCurrency(pricing.grossAmount || getBookingGrossAmount(booking))}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>
                          Giảm giá
                          {pricing.promotionLabel ? ` (${pricing.promotionLabel})` : ''}
                        </span>
                        <span>-{formatCurrency(pricing.promotionDiscount)}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex justify-between border-t border-white/10 pt-4 text-lg font-black text-white">
                    <span>Tổng</span>
                    <span className="text-primary">{formatCurrency(pricing.payableAmount)}</span>
                  </div>
                </div>
                </div>
              </aside>
            </section>
          </>
        ) : null}
      </main>
      <AppFooter />
    </div>
  )
}

export default BookingDetail
