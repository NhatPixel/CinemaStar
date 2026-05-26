import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, HallLayoutForm, Icon, Text, useToast } from '../../components'
import { getHallById } from '../../api/hall'
import { buildProductsSearchBody, searchProductsByCinema } from '../../api/product'
import { getShowtimeById } from '../../api/showtime'
import BookingLayout from './BookingLayout'
import {
  BOOKING_DRAFT_STORAGE_KEY,
  MAX_BOOKING_SEATS,
  MOVIE_FALLBACK,
  buildLayoutFromHall,
  findSeatByLabel,
  formatCurrency,
  formatShowtimeDate,
  formatShowtimeTime,
  getFilmPoster,
  getFilmTitle,
  getShowtimeCinema,
  getShowtimeCinemaId,
  getShowtimeHall,
  getShowtimeHallId,
  normalizeProductToCombo,
  resolveSeatPrice,
  writeJsonStorage,
} from './bookingData'

function SeatFoodSelection() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const showtimeId = searchParams.get('showtimeId')
  const filmId = searchParams.get('filmId')
  const [showtime, setShowtime] = useState(null)
  const [hall, setHall] = useState(null)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [combos, setCombos] = useState([])
  const [loading, setLoading] = useState(Boolean(showtimeId))
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Chọn Ghế và Đồ Ăn - CinemaStar'
  }, [])

  useEffect(() => {
    if (!showtimeId) {
      setError('Vui lòng chọn suất chiếu trước khi chọn ghế.')
      setLoading(false)
      return
    }

    let cancelled = false
    const ac = new AbortController()
    setLoading(true)
    setError('')
    setSelectedSeats([])

    ;(async () => {
      try {
        const detail = await getShowtimeById(showtimeId, { signal: ac.signal })
        if (cancelled) return

        const hallId = getShowtimeHallId(detail)
        const cinemaId = getShowtimeCinemaId(detail)
        const [hallDetail, productPage] = await Promise.all([
          hallId ? getHallById(hallId, { signal: ac.signal }) : Promise.resolve(getShowtimeHall(detail)),
          cinemaId
            ? searchProductsByCinema(cinemaId, buildProductsSearchBody({ size: 30 }), {
                signal: ac.signal,
              }).catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
        ])

        if (cancelled) return
        setShowtime(detail)
        setHall(hallDetail || getShowtimeHall(detail))
        setCombos((productPage?.data || []).map(normalizeProductToCombo))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        setError(e?.message || 'Không tải được thông tin đặt vé')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [showtimeId])

  const cinema = getShowtimeCinema(showtime) || hall?.cinemaResponse || hall?.cinema
  const pricingPolicy = showtime?.pricingPolicy || {}
  const layout = useMemo(() => buildLayoutFromHall(hall), [hall])
  const seats = hall?.seats || getShowtimeHall(showtime)?.seats || []
  const selectedSeatDetails = useMemo(
    () =>
      selectedSeats.map((label) => {
        const seat = findSeatByLabel(seats, label)
        const seatType = seat?.seatType || 'STANDARD'
        return {
          label,
          seat,
          seatType,
          price: resolveSeatPrice(pricingPolicy, seatType),
        }
      }),
    [pricingPolicy, seats, selectedSeats],
  )

  const foodTotal = useMemo(
    () => combos.reduce((sum, combo) => sum + combo.price * combo.quantity, 0),
    [combos],
  )
  const ticketTotal = selectedSeatDetails.reduce((sum, item) => sum + item.price, 0)
  const total = ticketTotal + foodTotal

  const updateComboQuantity = (name, delta) => {
    setCombos((prev) =>
      prev.map((combo) => {
        if (combo.name !== name) return combo
        return { ...combo, quantity: Math.max(0, combo.quantity + delta) }
      })
    )
  }

  const handleSelectedSeatsChange = (labels) => {
    if (labels.length > MAX_BOOKING_SEATS) {
      toast.error(`Mỗi booking tối đa ${MAX_BOOKING_SEATS} ghế`)
      return
    }
    setSelectedSeats(labels)
  }

  const handleContinueToPayment = () => {
    if (!showtime || selectedSeats.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ghế')
      return
    }

    const missingSeat = selectedSeatDetails.some((item) => !item.seat)
    if (missingSeat) {
      toast.error('Không xác định được thông tin ghế, vui lòng tải lại trang')
      return
    }

    const draft = {
      showtime,
      hall,
      cinema,
      selectedSeats,
      seatItems: selectedSeatDetails.map((item) => ({
        seatCode: item.seat.seatCode || item.label,
        seatType: item.seatType,
        seatPriceSnapshot: item.price,
      })),
      productItems: combos
        .filter((combo) => combo.id && combo.quantity > 0)
        .map((combo) => ({
          productId: combo.id,
          quantity: combo.quantity,
        })),
      combos: combos.filter((combo) => combo.quantity > 0),
      totals: {
        ticketTotal,
        foodTotal,
        total,
      },
    }
    writeJsonStorage(BOOKING_DRAFT_STORAGE_KEY, draft)
    navigate(`/booking/payment?showtimeId=${showtime.id}${filmId ? `&filmId=${filmId}` : ''}`)
  }

  const filmTitle = showtime ? getFilmTitle(showtime) : MOVIE_FALLBACK.title
  const poster = showtime ? getFilmPoster(showtime) : MOVIE_FALLBACK.poster
  const showtimeDate = formatShowtimeDate(showtime?.startDateTime)
  const showtimeTime = formatShowtimeTime(showtime?.startDateTime)

  const aside = (
    <div className="rounded-3xl border border-primary/20 bg-[#120a1a] p-5 shadow-xl shadow-primary/10">
      <Text variant="h3" className="mb-5 text-xl font-black text-white">
        Tóm tắt đặt vé
      </Text>
      <div className="flex gap-4">
        <img
          alt={filmTitle}
          className="h-28 w-20 rounded-xl object-cover"
          src={poster}
        />
        <div className="min-w-0">
          <p className="font-black text-white">{filmTitle}</p>
          <p className="mt-2 text-sm text-slate-400">{showtimeDate || 'Chưa chọn suất'}</p>
          <p className="text-sm text-slate-400">
            {showtimeTime || '--:--'} · {hall?.name || 'Phòng chiếu'}
          </p>
        </div>
      </div>
      <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>Ghế</span>
          <span className="font-bold text-white">{selectedSeats.join(', ') || 'Chưa chọn'}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Vé</span>
          <span>{formatCurrency(ticketTotal)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Đồ ăn</span>
          <span>{formatCurrency(foodTotal)}</span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-4 text-lg font-black text-white">
          <span>Tổng</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>
      <Button
        fullWidth
        disabled={selectedSeats.length === 0 || loading}
        className="mt-6 rounded-full"
        onClick={handleContinueToPayment}
      >
        Thanh toán
        <Icon name="arrow_forward" />
      </Button>
    </div>
  )

  return (
    <BookingLayout
      eyebrow="Bước 02"
      title="Chọn Ghế và Đồ Ăn"
      subtitle="Chọn vị trí ngồi yêu thích, thêm combo bắp nước và kiểm tra tổng tiền trước khi thanh toán."
      aside={aside}
    >
      <div className="space-y-8">
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#120a1a] p-6 text-center text-slate-300">
            Đang tải thông tin suất chiếu...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-200">
            {error}{' '}
            <Link
              to={filmId ? `/booking/showtimes?filmId=${filmId}` : '/booking/showtimes'}
              className="font-bold text-primary hover:underline"
            >
              Chọn suất khác
            </Link>
          </div>
        ) : null}

        <section className="rounded-3xl border border-primary/20 bg-[#120a1a] p-5 md:p-8">
          <HallLayoutForm
            mode="picker"
            value={layout}
            selectedSeats={selectedSeats}
            reservedSeats={[]}
            onSelectedSeatsChange={handleSelectedSeatsChange}
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#120a1a] p-5 md:p-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <Text variant="h2" className="text-2xl font-black text-white">
                Combo bắp nước
              </Text>
              <p className="mt-2 text-sm text-slate-400">Ưu đãi riêng cho khách đặt vé online.</p>
            </div>
            <Icon name="restaurant" className="text-4xl text-primary" />
          </div>

          {combos.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-400">
              Rạp này chưa có combo đang bán.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            {combos.map((combo) => (
              <article key={combo.name} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon name={combo.icon} className="text-3xl" />
                </div>
                <h3 className="text-lg font-black text-white">{combo.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{combo.description}</p>
                <p className="mt-4 text-lg font-black text-primary">{formatCurrency(combo.price)}</p>

                <div className="mt-5 flex items-center justify-between rounded-full bg-black/20 p-1">
                  <button
                    type="button"
                    onClick={() => updateComboQuantity(combo.name, -1)}
                    className="flex size-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/10"
                  >
                    <Icon name="remove" className="text-lg" />
                  </button>
                  <span className="font-black text-white">{combo.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateComboQuantity(combo.name, 1)}
                    className="flex size-9 items-center justify-center rounded-full bg-primary text-white"
                  >
                    <Icon name="add" className="text-lg" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="flex justify-between">
          <Link to={filmId ? `/booking/showtimes?filmId=${filmId}` : '/booking/showtimes'}>
            <Button variant="secondary" className="rounded-full px-8">
              <Icon name="arrow_back" />
              Quay lại
            </Button>
          </Link>
        </div>
      </div>
    </BookingLayout>
  )
}

export default SeatFoodSelection
