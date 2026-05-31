import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getBookingById } from '../../api/booking'
import { Button, Icon, Text } from '../../components'
import BookingLayout from './BookingLayout'
import {
  BOOKING_RESULT_STORAGE_KEY,
  MOVIE_FALLBACK,
  formatCurrency,
  formatShowtimeDate,
  formatShowtimeTime,
  formatPaymentMethodLabel,
  getPaymentPayUrl,
  resolveCheckoutPricing,
  mergePaymentSession,
  readJsonStorage,
} from './bookingData'

function formatReservedUntil(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function BookingResult() {
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('bookingId')
  const cachedResultRef = useRef(readJsonStorage(BOOKING_RESULT_STORAGE_KEY))
  const cachedResult = cachedResultRef.current
  const [booking, setBooking] = useState(() => cachedResultRef.current?.booking || null)
  const [paymentSession, setPaymentSession] = useState(
    () => cachedResultRef.current?.paymentSession || null,
  )
  const [loading, setLoading] = useState(Boolean(bookingId))
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Kết Quả Đặt Vé - CinemaStar'
  }, [])

  useEffect(() => {
    if (!bookingId) {
      setLoading(false)
      return undefined
    }

    let cancelled = false
    const ac = new AbortController()
    setLoading(true)
    setError('')

    ;(async () => {
      const cached = cachedResultRef.current
      const cachedMatches = cached?.booking?.id && String(cached.booking.id) === String(bookingId)

      if (cachedMatches) {
        setBooking(cached.booking)
        setPaymentSession(cached.paymentSession || null)
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const data = await getBookingById(bookingId, { signal: ac.signal })
        if (cancelled) return
        setBooking(data)
        setPaymentSession(
          mergePaymentSession(null, cached?.paymentSession) || cached?.paymentSession || null,
        )
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        if (cached?.booking) {
          setBooking(cached.booking)
          setPaymentSession(cached.paymentSession || null)
        } else {
          setError(e?.message || 'Không tải được đơn đặt vé')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [bookingId])

  const seats = booking?.seatItems?.map((item) => item.seatCode).filter(Boolean) || []
  const filmTitle = booking?.filmTitle || MOVIE_FALLBACK.title
  const pricing = useMemo(
    () => resolveCheckoutPricing(booking, paymentSession, cachedResult?.context),
    [booking, paymentSession, cachedResult?.context],
  )
  const { payableAmount, promotionDiscount, promotionLabel } = pricing
  const bookingCode = booking?.id ? String(booking.id).slice(0, 8).toUpperCase() : 'BOOKING'
  const showtimeDate = formatShowtimeDate(booking?.showtimeStartDateTime)
  const showtimeTime = formatShowtimeTime(booking?.showtimeStartDateTime)
  const payUrl = getPaymentPayUrl(paymentSession)
  const canPayOnline = booking?.paymentStatus !== 'PAID' && Boolean(payUrl)
  const reservedUntilLabel = formatReservedUntil(booking?.reservedUntil)

  return (
    <BookingLayout
      eyebrow="Hoàn tất"
      title="Kết Quả Đặt Vé"
      subtitle="Đặt vé thành công. Hoàn tất thanh toán trong thời gian giữ ghế để xác nhận vé."
    >
      <div className="mx-auto max-w-5xl">
        {loading ? (
          <div className="mb-6 rounded-3xl border border-white/10 bg-[#120a1a] p-6 text-center text-slate-300">
            Đang tải đơn đặt vé...
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-200">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-primary/20 bg-[#120a1a] shadow-2xl shadow-primary/10">
          <div className="bg-gradient-to-r from-primary to-fuchsia-700 p-8 text-center text-white">
            <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-white/20">
              <Icon name="check_circle" className="text-5xl" />
            </div>
            <Text variant="h1" className="text-3xl font-black text-white md:text-5xl">
              {booking ? 'Đặt vé thành công!' : 'Kết quả đặt vé'}
            </Text>
            <p className="mt-3 text-white/80">Mã đặt vé của bạn là</p>
            <p className="mt-2 font-mono text-2xl font-black tracking-[0.28em] md:text-4xl">
              {bookingCode}
            </p>
            {reservedUntilLabel && booking?.paymentStatus !== 'PAID' ? (
              <p className="mt-3 text-sm text-white/80">Giữ ghế đến {reservedUntilLabel}</p>
            ) : null}
          </div>

          <div className="grid gap-8 p-5 md:p-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="space-y-4">
                  <div>
                    <Text variant="h2" className="text-2xl font-black text-white">
                      {filmTitle}
                    </Text>
                    <p className="mt-2 text-sm text-slate-400">
                      {booking?.bookingStatus || 'RESERVED'} · {booking?.paymentStatus || 'UNPAID'}
                    </p>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    <p className="flex items-center gap-2">
                      <Icon name="calendar_month" className="text-primary" />
                      {showtimeDate || 'Chưa có ngày'}
                    </p>
                    <p className="flex items-center gap-2">
                      <Icon name="schedule" className="text-primary" />
                      {showtimeTime || '--:--'}
                    </p>
                    <p className="flex items-center gap-2 sm:col-span-2">
                      <Icon name="event_seat" className="text-primary" />
                      Ghế {seats.join(', ') || 'Chưa có'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Thanh toán</p>
                  <p className="mt-2 font-bold text-white">
                    {formatPaymentMethodLabel(
                      paymentSession?.paymentMethod || cachedResult?.paymentMethod,
                    )}
                  </p>
                  <p className="mt-1 text-sm text-emerald-400">
                    {booking?.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Tổng tiền</p>
                  <p className="mt-2 text-xl font-black text-white">{formatCurrency(payableAmount)}</p>
                  {promotionDiscount > 0 ? (
                    <p className="mt-1 text-sm text-emerald-400">
                      Đã giảm {formatCurrency(promotionDiscount)}
                      {promotionLabel ? ` · ${promotionLabel}` : ''}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">Đã gồm combo (nếu có)</p>
                  )}
                </div>
              </div>

            </div>

            <aside className="flex flex-col justify-center rounded-3xl border border-white/10 bg-white/5 p-5">
              {canPayOnline ? (
                <>
                  <p className="text-sm text-slate-300">
                    Hoàn tất thanh toán MoMo trong thời gian giữ ghế.
                  </p>
                  <a
                    href={payUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 block"
                  >
                    <Button fullWidth className="rounded-full">
                      <Icon name="payments" />
                      Thanh toán MoMo · {formatCurrency(payableAmount)}
                    </Button>
                  </a>
                </>
              ) : (
                <>
                  <p className="text-center text-xs font-bold uppercase tracking-wider text-primary">
                    Mã đặt vé
                  </p>
                  <p className="mt-2 text-center font-mono text-2xl font-black text-white">
                    {bookingCode}
                  </p>
                  <p className="mt-4 text-center text-sm text-slate-400">
                    {booking?.paymentStatus === 'PAID'
                      ? 'Đã thanh toán. Xuất trình mã khi vào rạp.'
                      : 'Vé sẽ được xác nhận sau khi thanh toán.'}
                  </p>
                </>
              )}
            </aside>
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/movies">
            <Button variant="secondary" className="w-full rounded-full px-8 sm:w-auto">
              <Icon name="movie" />
              Xem phim khác
            </Button>
          </Link>
          {booking?.id ? (
            <Link to={`/bookings/${booking.id}`}>
              <Button className="w-full rounded-full px-8 sm:w-auto">
                Xem chi tiết đơn
                <Icon name="confirmation_number" />
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </BookingLayout>
  )
}

export default BookingResult
