import { useEffect, useMemo, useRef, useState } from 'react'
import ReservationCountdown from './ReservationCountdown'
import { Link, useSearchParams } from 'react-router-dom'
import { getBookingById, getCheckoutContext } from '../../api/booking'
import { completePaymentSession, getPaymentSession } from '../../api/payment'
import { Button, Icon, Text, useToast } from '../../components'
import BookingLayout from './BookingLayout'
import {
  BOOKING_RESULT_STORAGE_KEY,
  MOVIE_FALLBACK,
  formatCurrency,
  formatShowtimeDate,
  formatShowtimeTime,
  formatPaymentMethodLabel,
  getPaymentPayUrl,
  getPaymentQrCodeUrl,
  isOperatorRole,
  resolveCheckoutPricing,
  mergePaymentSession,
  readJsonStorage,
  resolveReservationDeadlineMs,
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
  const toast = useToast()
  const bookingId = searchParams.get('bookingId')
  const cachedResultRef = useRef(readJsonStorage(BOOKING_RESULT_STORAGE_KEY))
  const cachedResult = cachedResultRef.current
  const staffSellMode = Boolean(cachedResult?.staffSellMode)
  const [booking, setBooking] = useState(() => cachedResultRef.current?.booking || null)
  const [paymentSession, setPaymentSession] = useState(
    () => cachedResultRef.current?.paymentSession || null,
  )
  const [loading, setLoading] = useState(Boolean(bookingId))
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')
  const [checkoutContext, setCheckoutContext] = useState(() => cachedResultRef.current?.context || null)
  const [reservationDeadlineMs, setReservationDeadlineMs] = useState(null)

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
    setReservationDeadlineMs(null)
    setCheckoutContext(null)

    ;(async () => {
      const cached = cachedResultRef.current
      const cachedMatches = cached?.booking?.id && String(cached.booking.id) === String(bookingId)

      if (cachedMatches) {
        setBooking(cached.booking)
        setPaymentSession(cached.paymentSession || null)
        setCheckoutContext(cached.context || null)
      }

      const applyOperatorCheckout = (data, session) => {
        const mergedSession = mergePaymentSession(session, cached?.paymentSession) || session
        setBooking(data)
        setPaymentSession(mergedSession)
        setCheckoutContext(null)
        setReservationDeadlineMs(
          resolveReservationDeadlineMs({ booking: data, paymentSession: mergedSession }),
        )
      }

      const applyCheckout = (context, sessionFallback) => {
        const nextBooking = context?.booking || cached?.booking
        const nextSession = mergePaymentSession(
          context?.paymentSession || sessionFallback,
          cached?.paymentSession,
        )
        setBooking(nextBooking || null)
        setPaymentSession(nextSession || null)
        setCheckoutContext(context || null)
        setReservationDeadlineMs(
          resolveReservationDeadlineMs({
            booking: nextBooking,
            paymentSession: nextSession,
            secondsToExpire: context?.secondsToExpire,
          }),
        )
      }

      const loadOperatorCheckout = async () => {
        const [data, session] = await Promise.all([
          getBookingById(bookingId, { signal: ac.signal }),
          getPaymentSession(bookingId, { signal: ac.signal }).catch(() => null),
        ])
        if (cancelled) return
        applyOperatorCheckout(data, session)
      }

      try {
        if (staffSellMode) {
          await loadOperatorCheckout()
          return
        }

        const context = await getCheckoutContext(bookingId, { signal: ac.signal })
        if (cancelled) return
        applyCheckout(context, null)
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        try {
          await loadOperatorCheckout()
        } catch (fallbackError) {
          if (cancelled || fallbackError?.name === 'AbortError') return
          if (cachedMatches) {
            setReservationDeadlineMs(
              resolveReservationDeadlineMs({
                booking: cached.booking,
                paymentSession: cached.paymentSession,
              }),
            )
          } else {
            setError(fallbackError?.message || e?.message || 'Không tải được đơn đặt vé')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [bookingId, staffSellMode])

  const seats = booking?.seatItems?.map((item) => item.seatCode).filter(Boolean) || []
  const filmTitle = booking?.filmTitle || MOVIE_FALLBACK.title
  const pricing = useMemo(
    () => resolveCheckoutPricing(booking, paymentSession, checkoutContext),
    [booking, paymentSession, checkoutContext],
  )
  const { payableAmount, promotionDiscount } = pricing
  const bookingCode = booking?.id ? String(booking.id).slice(0, 8).toUpperCase() : 'BOOKING'
  const showtimeDate = formatShowtimeDate(booking?.showtimeStartDateTime)
  const showtimeTime = formatShowtimeTime(booking?.showtimeStartDateTime)
  const payUrl = getPaymentPayUrl(paymentSession)
  const qrCodeUrl = getPaymentQrCodeUrl(paymentSession)
  const isUnpaid = booking?.paymentStatus !== 'PAID'
  const canPayOnline = isUnpaid && Boolean(payUrl)
  const canShowQr = isUnpaid && Boolean(qrCodeUrl)
  const reservedUntilLabel = formatReservedUntil(booking?.reservedUntil)

  const showReservationTimer =
    isUnpaid && (staffSellMode || canPayOnline || canShowQr || checkoutContext?.canPay)

  const [holdExpired, setHoldExpired] = useState(false)

  useEffect(() => {
    if (!reservationDeadlineMs) {
      setHoldExpired(false)
      return undefined
    }
    const tick = () => setHoldExpired(Date.now() >= reservationDeadlineMs)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [reservationDeadlineMs])

  const canShowPayButton = canPayOnline && !holdExpired
  const canCompleteAtCounter =
    staffSellMode && isOperatorRole() && isUnpaid && !holdExpired && Boolean(bookingId)

  const handleCompleteAtCounter = async () => {
    if (!bookingId || !canCompleteAtCounter) return
    setCompleting(true)
    try {
      await completePaymentSession(bookingId)
      const data = await getBookingById(bookingId)
      setBooking(data)
      toast.success('Đã xác nhận thanh toán tại quầy')
    } catch (e) {
      toast.error(e?.message || 'Không xác nhận được thanh toán')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <BookingLayout
      eyebrow={staffSellMode ? 'Bán vé tại quầy' : 'Hoàn tất'}
      title={staffSellMode ? 'Đơn bán tại quầy' : 'Kết Quả Đặt Vé'}
      subtitle={
        staffSellMode
          ? 'Đơn đã tạo. Khách quét MoMo hoặc staff xác nhận thanh toán tại quầy trong thời gian giữ ghế.'
          : 'Đặt vé thành công. Hoàn tất thanh toán trong thời gian giữ ghế để xác nhận vé.'
      }
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
              {booking ? 'Đã đặt vé!' : 'Kết quả đặt vé'}
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
                      Giảm giá {formatCurrency(promotionDiscount)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">Đã gồm combo (nếu có)</p>
                  )}
                </div>
              </div>

            </div>

            <aside className="flex flex-col justify-center rounded-3xl border border-white/10 bg-white/5 p-5">
              {isUnpaid && (canShowPayButton || canShowQr || showReservationTimer || canCompleteAtCounter) ? (
                <>
                  {canShowQr ? (
                    <div className="text-center">
                      <p className="text-sm text-slate-300">Quét MoMo để thanh toán</p>
                      <img
                        src={qrCodeUrl}
                        alt="MoMo QR"
                        className="mx-auto mt-4 max-h-52 rounded-xl bg-white p-2"
                      />
                    </div>
                  ) : null}
                  {canShowPayButton ? (
                    <>
                      <p className={`text-sm text-slate-300 ${canShowQr ? 'mt-5' : ''}`}>
                        Hoặc mở liên kết MoMo trong thời gian giữ ghế.
                      </p>
                      <a
                        href={payUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 block"
                      >
                        <Button fullWidth className="rounded-full">
                          <Icon name="payments" />
                          <span className="min-w-0 flex-1">
                            Thanh toán MoMo · {formatCurrency(payableAmount)}
                          </span>
                          <Icon name="open_in_new" className="shrink-0 text-lg" aria-hidden />
                        </Button>
                      </a>
                    </>
                  ) : null}
                  {canCompleteAtCounter ? (
                    <Button
                      fullWidth
                      variant="secondary"
                      className="mt-4 rounded-full"
                      disabled={completing}
                      onClick={handleCompleteAtCounter}
                    >
                      <Icon name="point_of_sale" />
                      {completing ? 'Đang xác nhận...' : 'Xác nhận thanh toán tại quầy'}
                    </Button>
                  ) : null}
                  {showReservationTimer && reservationDeadlineMs ? (
                    <ReservationCountdown deadlineMs={reservationDeadlineMs} />
                  ) : showReservationTimer && loading ? (
                    <p className="mt-4 text-center text-xs text-slate-400">Đang tải thời gian giữ ghế...</p>
                  ) : null}
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
          {staffSellMode ? (
            <Link to="/booking/showtimes?staffSell=1">
              <Button variant="secondary" className="w-full rounded-full px-8 sm:w-auto">
                <Icon name="point_of_sale" />
                Bán vé khác
              </Button>
            </Link>
          ) : (
            <Link to="/movies">
              <Button variant="secondary" className="w-full rounded-full px-8 sm:w-auto">
                <Icon name="movie" />
                Xem phim khác
              </Button>
            </Link>
          )}
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
