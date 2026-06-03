import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, HallLayoutForm, Icon, Text, useToast } from '../../components'
import ProductThumbnail from '../../components/product/ProductThumbnail'
import { buildProductsSearchBody, searchProductsByCinema } from '../../api/product'
import { getShowtimeById, getShowtimeSeatMap } from '../../api/showtime'
import BookingLayout from './BookingLayout'
import {
  BOOKING_DRAFT_STORAGE_KEY,
  MAX_BOOKING_SEATS,
  MOVIE_FALLBACK,
  buildLayoutFromSeatMap,
  findSeatInSeatMap,
  formatCurrency,
  formatShowtimeDate,
  formatShowtimeTime,
  getFilmPoster,
  getFilmTitle,
  getReservedSeatLabelsFromSeatMap,
  getShowtimeCinema,
  getShowtimeCinemaId,
  getShowtimeHall,
  normalizeProductToCombo,
  resolveSeatPriceFromSeatMap,
  writeJsonStorage,
} from './bookingData'

function SeatFoodSelection() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const showtimeId = searchParams.get('showtimeId')
  const filmId = searchParams.get('filmId')
  const [showtime, setShowtime] = useState(null)
  const [seatMap, setSeatMap] = useState(null)
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
        const [detail, seatMapDetail] = await Promise.all([
          getShowtimeById(showtimeId, { signal: ac.signal }),
          getShowtimeSeatMap(showtimeId, { signal: ac.signal }),
        ])

        const cinemaId = getShowtimeCinemaId(detail)
        const productPage = cinemaId
          ? await searchProductsByCinema(
              cinemaId,
              buildProductsSearchBody({ size: 12, status: 'ACTIVE' }),
              { signal: ac.signal },
            ).catch(() => ({ data: [] }))
          : { data: [] }

        if (cancelled) return
        setShowtime(detail)
        setSeatMap(seatMapDetail)
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

  const hall = getShowtimeHall(showtime)
  const cinema = getShowtimeCinema(showtime)
  const pricingPolicy = showtime?.pricingPolicy || {}
  const layout = useMemo(() => buildLayoutFromSeatMap(seatMap), [seatMap])
  const reservedSeats = useMemo(() => getReservedSeatLabelsFromSeatMap(seatMap), [seatMap])
  const selectedSeatDetails = useMemo(
    () =>
      selectedSeats.map((label) => {
        const seat = findSeatInSeatMap(seatMap, label)
        const seatType = seat?.seatType || 'STANDARD'
        return {
          label,
          seat,
          seatType,
          price: resolveSeatPriceFromSeatMap(seatMap, label, pricingPolicy),
        }
      }),
    [pricingPolicy, seatMap, selectedSeats],
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
      toast.error(`Mỗi lần đặt vé tối đa ${MAX_BOOKING_SEATS} ghế`)
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
      promotionCode: '',
      totals: {
        ticketTotal,
        foodTotal,
        subtotal: total,
        promotionDiscount: 0,
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
            mode="booking"
            value={layout}
            selectedSeats={selectedSeats}
            reservedSeats={reservedSeats}
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

          <div className="grid items-stretch gap-4 md:grid-cols-3">
            {combos.map((combo) => (
              <article
                key={combo.id || combo.name}
                className="flex h-full min-h-[220px] flex-col rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <ProductThumbnail
                  imageUrl={combo.imageUrl}
                  alt={combo.name}
                  type={combo.type}
                  fallbackIcon={combo.icon}
                  className="mb-5 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30 object-cover"
                  iconClassName="text-5xl text-primary"
                />
                <h3 className="text-lg font-black text-white">{combo.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{combo.description}</p>
                <p className="mt-4 text-lg font-black text-primary">{formatCurrency(combo.price)}</p>

                <div className="mt-auto pt-5">
                  <div className="flex items-center justify-between rounded-full bg-black/20 p-1">
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
