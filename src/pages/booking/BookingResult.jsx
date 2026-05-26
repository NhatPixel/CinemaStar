import { useEffect, useState } from 'react'
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
  getFilmPoster,
  getFilmTitle,
  readJsonStorage,
} from './bookingData'

function BookingResult() {
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('bookingId')
  const cachedResult = readJsonStorage(BOOKING_RESULT_STORAGE_KEY)
  const [booking, setBooking] = useState(cachedResult?.booking || null)
  const [context] = useState(cachedResult?.context || null)
  const [loading, setLoading] = useState(Boolean(bookingId && !cachedResult?.booking))
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Kết Quả Đặt Vé - CinemaStar'
  }, [])

  useEffect(() => {
    if (!bookingId) return
    if (booking?.id === bookingId) return

    let cancelled = false
    const ac = new AbortController()
    setLoading(true)
    setError('')

    ;(async () => {
      try {
        const data = await getBookingById(bookingId, { signal: ac.signal })
        if (!cancelled) setBooking(data)
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        setError(e?.message || 'Không tải được booking')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [bookingId, booking?.id])

  const showtime = context?.showtime
  const hall = context?.hall
  const cinema = context?.cinema
  const filmTitle = showtime ? getFilmTitle(showtime) : MOVIE_FALLBACK.title
  const poster = showtime ? getFilmPoster(showtime) : MOVIE_FALLBACK.poster
  const seats = booking?.seatItems?.map((item) => item.seatCode) || context?.selectedSeats || []
  const finalAmount = Number(booking?.finalAmount || context?.totals?.total || 0)
  const bookingCode = booking?.id ? booking.id.slice(0, 8).toUpperCase() : 'BOOKING'
  const showtimeDate = formatShowtimeDate(showtime?.startDateTime)
  const showtimeTime = formatShowtimeTime(showtime?.startDateTime)

  return (
    <BookingLayout
      eyebrow="Hoàn tất"
      title="Kết Quả Đặt Vé"
      subtitle="Đặt vé thành công. Vui lòng lưu mã vé hoặc xuất trình QR tại quầy soát vé trước giờ chiếu."
    >
      <div className="mx-auto max-w-5xl">
        {loading ? (
          <div className="mb-6 rounded-3xl border border-white/10 bg-[#120a1a] p-6 text-center text-slate-300">
            Đang tải booking...
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
              {booking ? 'Tạo booking thành công!' : 'Kết quả booking'}
            </Text>
            <p className="mt-3 text-white/80">Mã đặt vé của bạn là</p>
            <p className="mt-2 font-mono text-2xl font-black tracking-[0.28em] md:text-4xl">
              {bookingCode}
            </p>
          </div>

          <div className="grid gap-8 p-5 md:p-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row">
                <img
                  alt={filmTitle}
                  className="h-56 w-full rounded-2xl object-cover sm:w-36"
                  src={poster}
                />
                <div className="space-y-4">
                  <div>
                    <span className="inline-flex rounded-lg bg-red-600 px-3 py-1 text-xs font-black text-white">
                      {showtime?.film?.ageRating || MOVIE_FALLBACK.ageRating}
                    </span>
                    <Text variant="h2" className="mt-3 text-2xl font-black text-white">
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
                    <p className="flex items-center gap-2">
                      <Icon name="meeting_room" className="text-primary" />
                      {hall?.name || 'Phòng chiếu'}
                    </p>
                    <p className="flex items-center gap-2">
                      <Icon name="event_seat" className="text-primary" />
                      Ghế {seats.join(', ') || 'Chưa có'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Rạp</p>
                  <p className="mt-2 font-bold text-white">{cinema?.name || 'Rạp chiếu'}</p>
                  <p className="mt-1 text-sm text-slate-400">{cinema?.address || 'Chưa có địa chỉ'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Thanh toán</p>
                  <p className="mt-2 font-bold text-white">{cachedResult?.paymentMethod || 'VietQR'}</p>
                  <p className="mt-1 text-sm text-emerald-400">
                    {booking?.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Tổng tiền</p>
                  <p className="mt-2 text-xl font-black text-white">{formatCurrency(finalAmount)}</p>
                  <p className="mt-1 text-sm text-slate-400">Đã gồm combo</p>
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-white/10 bg-white p-5 text-slate-950">
              <div className="grid aspect-square place-items-center rounded-2xl bg-[linear-gradient(90deg,#111827_10%,transparent_10%),linear-gradient(#111827_10%,transparent_10%)] bg-[length:18px_18px]">
                <div className="rounded-xl bg-white px-4 py-2 text-sm font-black text-primary shadow">
                  {bookingCode}
                </div>
              </div>
              <p className="mt-5 text-center text-sm font-semibold text-slate-700">
                Quét mã này tại quầy để nhận vé hoặc vào phòng chiếu.
              </p>
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
          <Link to="/booking/showtimes">
            <Button className="w-full rounded-full px-8 sm:w-auto">
              Đặt vé mới
              <Icon name="confirmation_number" />
            </Button>
          </Link>
        </div>
      </div>
    </BookingLayout>
  )
}

export default BookingResult
