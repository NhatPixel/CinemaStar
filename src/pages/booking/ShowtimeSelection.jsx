import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getFilmById } from '../../api/film'
import {
  buildShowtimesByFilmSearchBody,
  searchAllShowtimesByFilmId,
} from '../../api/showtime'
import { Button, Icon, SearchableSelect, Text, useToast } from '../../components'
import { mapCinemasToSelectOptions } from '../../api/hall'
import BookingFilmSummary from './BookingFilmSummary'
import BookingLayout from './BookingLayout'
import {
  BOOKING_MOVIE_STORAGE_KEY,
  MOVIE_FALLBACK,
  buildBookingDateOptions,
  buildCinemaNameLookupFromFilm,
  extractCinemasFromShowtimes,
  formatCurrency,
  formatShowtimeTime,
  getFilmTitle,
  getShowtimeHall,
  appendStaffSellQuery,
  isStaffSellMode,
  readJsonStorage,
  writeJsonStorage,
} from './bookingData'

const DATE_OPTIONS = buildBookingDateOptions(7)

function ShowtimeSelection() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const filmIdFromQuery = searchParams.get('filmId')
  const staffSellMode = isStaffSellMode(searchParams)
  const storedMovie = readJsonStorage(BOOKING_MOVIE_STORAGE_KEY)
  const selectedFilmId = filmIdFromQuery || storedMovie?.id || ''

  const [selectedMovie, setSelectedMovie] = useState(() =>
    selectedFilmId && storedMovie?.id === selectedFilmId ? storedMovie : null,
  )
  const [selectedDate, setSelectedDate] = useState(() => DATE_OPTIONS[0]?.value || '')
  const [selectedCinemaId, setSelectedCinemaId] = useState('')
  const [cinemas, setCinemas] = useState([])
  const [showtimes, setShowtimes] = useState([])
  const [selectedShowtimeId, setSelectedShowtimeId] = useState('')

  const [filmLoading, setFilmLoading] = useState(Boolean(selectedFilmId))
  const [cinemasLoading, setCinemasLoading] = useState(false)
  const [showtimesLoading, setShowtimesLoading] = useState(false)
  const [cinemaNameById, setCinemaNameById] = useState({})

  useEffect(() => {
    document.title = 'Chọn Suất Chiếu - CinemaStar'
  }, [])

  useEffect(() => {
    if (!selectedFilmId) {
      setSelectedMovie(null)
      setFilmLoading(false)
      return undefined
    }

    let cancelled = false
    const ac = new AbortController()
    setFilmLoading(true)

    ;(async () => {
      try {
        const film = await getFilmById(selectedFilmId, { signal: ac.signal })
        if (cancelled) return
        setSelectedMovie(film || null)
        if (film) {
          writeJsonStorage(BOOKING_MOVIE_STORAGE_KEY, film)
          setCinemaNameById(buildCinemaNameLookupFromFilm(film))
        } else {
          setCinemaNameById({})
        }
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        setSelectedMovie(null)
        toast.error(e?.message || 'Không tải được thông tin phim')
      } finally {
        if (!cancelled) setFilmLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [selectedFilmId])

  useEffect(() => {
    if (!selectedFilmId || !selectedDate) {
      setCinemas([])
      setSelectedCinemaId('')
      setShowtimes([])
      setSelectedShowtimeId('')
      return undefined
    }

    let cancelled = false
    const ac = new AbortController()
    setCinemasLoading(true)
    setSelectedCinemaId('')
    setShowtimes([])
    setSelectedShowtimeId('')

    ;(async () => {
      try {
        const showtimes = await searchAllShowtimesByFilmId(
          selectedFilmId,
          buildShowtimesByFilmSearchBody({ date: selectedDate, page: 1, size: 12 }),
          { signal: ac.signal },
        )
        if (cancelled) return
        setCinemas(extractCinemasFromShowtimes(showtimes, cinemaNameById))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        setCinemas([])
        toast.error(e?.message || 'Không tải được danh sách rạp')
      } finally {
        if (!cancelled) setCinemasLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [selectedFilmId, selectedDate, cinemaNameById])

  useEffect(() => {
    if (!selectedFilmId || !selectedDate || !selectedCinemaId) {
      setShowtimes([])
      setSelectedShowtimeId('')
      return undefined
    }

    let cancelled = false
    const ac = new AbortController()
    setShowtimesLoading(true)
    setSelectedShowtimeId('')

    ;(async () => {
      try {
        const list = await searchAllShowtimesByFilmId(
          selectedFilmId,
          buildShowtimesByFilmSearchBody({
            date: selectedDate,
            cinemaId: selectedCinemaId,
            page: 1,
            size: 12,
          }),
          { signal: ac.signal },
        )
        if (cancelled) return
        setShowtimes(list)
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        setShowtimes([])
        toast.error(e?.message || 'Không tải được suất chiếu')
      } finally {
        if (!cancelled) setShowtimesLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [selectedFilmId, selectedDate, selectedCinemaId])

  const cinemaOptions = useMemo(() => mapCinemasToSelectOptions(cinemas), [cinemas])

  const filmTitle = selectedMovie
    ? getFilmTitle(selectedMovie)
    : selectedFilmId
      ? MOVIE_FALLBACK.title
      : ''

  const selectedCinema = useMemo(
    () => cinemas.find((c) => c.id === selectedCinemaId) || null,
    [cinemas, selectedCinemaId],
  )

  const handleContinue = () => {
    if (!selectedFilmId) {
      toast.error('Vui lòng chọn phim trước')
      navigate('/movies')
      return
    }
    if (!selectedDate || !selectedCinemaId) {
      toast.error('Vui lòng chọn ngày và rạp')
      return
    }
    if (!selectedShowtimeId) {
      toast.error('Vui lòng chọn suất chiếu')
      return
    }
    navigate(
      appendStaffSellQuery(
        `/booking/seats?showtimeId=${selectedShowtimeId}&filmId=${selectedFilmId}`,
        searchParams,
      ),
    )
  }

  const pageLoading = filmLoading
  const showCinemaSection = selectedFilmId && selectedDate && !cinemasLoading
  const showShowtimeSection = selectedCinemaId

  return (
    <BookingLayout
      eyebrow={staffSellMode ? 'Bán vé tại quầy' : 'Bước 01'}
      title={staffSellMode ? 'Chọn suất cho khách' : 'Chọn Suất Chiếu'}
      subtitle={
        staffSellMode
          ? 'Chọn phim, ngày, rạp và suất chiếu để đặt vé cho khách tại quầy.'
          : filmTitle
            ? `${filmTitle} — chọn ngày chiếu, rạp và khung giờ.`
            : 'Chọn ngày chiếu, rạp và khung giờ phù hợp để bắt đầu đặt vé.'
      }
    >
      <div className="space-y-6">
          {staffSellMode ? (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              Luồng bán vé tại quầy — bạn sẽ nhập thông tin khách ở bước thanh toán.
            </div>
          ) : null}
          {!selectedFilmId ? (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-200">
              Vui lòng chọn phim từ{' '}
              <Link to="/movies" className="font-bold text-primary hover:underline">
                danh sách phim
              </Link>
              .
            </div>
          ) : null}

          {selectedFilmId ? (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <BookingFilmSummary film={selectedMovie} loading={filmLoading && !selectedMovie} />

              <div className="min-w-0 space-y-6">
              <div className="rounded-3xl border border-primary/20 bg-[#120a1a] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
                  <div className="shrink-0">
                    <div className="flex gap-2 overflow-x-auto pb-1 lg:overflow-visible">
                      {DATE_OPTIONS.map((day) => {
                        const active = selectedDate === day.value
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => setSelectedDate(day.value)}
                            className={`min-w-[4.5rem] shrink-0 rounded-2xl border px-3 py-3 text-center transition ${
                              active
                                ? 'border-primary bg-primary/15 text-white shadow-lg shadow-primary/10'
                                : 'border-white/10 bg-white/5 text-slate-300 hover:border-primary/40'
                            }`}
                          >
                            <p className="text-xs font-bold uppercase text-primary">{day.weekday}</p>
                            <p className="mt-1 text-sm font-black">{day.dayLabel}</p>
                            {day.isToday ? (
                              <p className="mt-1 text-[10px] font-semibold text-slate-400">Hôm nay</p>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="min-w-0 w-full flex-1">
                    <SearchableSelect
                      label="Chọn rạp"
                      name="cinemaId"
                      value={selectedCinemaId}
                      onChange={(e) => setSelectedCinemaId(e.target.value)}
                      options={cinemaOptions}
                      placeholder={
                        cinemasLoading
                          ? 'Đang tải rạp...'
                          : showCinemaSection && cinemaOptions.length === 0
                            ? 'Không có rạp'
                            : 'Chọn rạp'
                      }
                      searchPlaceholder="Tìm tên rạp..."
                      icon="location_on"
                      loading={cinemasLoading}
                      disabled={cinemasLoading || (showCinemaSection && cinemaOptions.length === 0)}
                      className="dark:border-primary/20 dark:bg-[#120a1a]/80 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {showShowtimeSection ? (
                <div className="rounded-3xl border border-white/10 bg-[#120a1a] p-5">
                  <div className="mb-5">
                    <Text variant="h3" className="text-lg font-black text-white">
                      Chọn suất — {selectedCinema?.name || 'Rạp chiếu'}
                    </Text>
                    <p className="mt-2 text-sm text-slate-400">
                      Chọn khung giờ phù hợp rồi bấm tiếp tục.
                    </p>
                  </div>

                  {showtimesLoading ? (
                    <p className="text-center text-slate-300">Đang tải suất chiếu...</p>
                  ) : null}

                  {!showtimesLoading && showtimes.length === 0 ? (
                    <p className="text-center text-slate-300">Chưa có suất chiếu tại rạp này.</p>
                  ) : null}

                  {!showtimesLoading && showtimes.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {showtimes.map((showtime) => {
                        const hall = getShowtimeHall(showtime)
                        const pricing = showtime.pricingPolicy || {}
                        const basePrice =
                          pricing.standardPrice || pricing.vipPrice || pricing.couplePrice || 0
                        const active = selectedShowtimeId === showtime.id
                        return (
                          <button
                            key={showtime.id}
                            type="button"
                            onClick={() => setSelectedShowtimeId(showtime.id)}
                            className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                              active
                                ? 'border-primary bg-primary/15 shadow-lg shadow-primary/10'
                                : 'border-white/10 bg-white/5 hover:border-primary/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-2xl font-black text-white">
                                  {formatShowtimeTime(showtime.startDateTime)}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">{hall?.name || 'Phòng chiếu'}</p>
                              </div>
                              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-primary">
                                {active ? 'Đã chọn' : '2D'}
                              </span>
                            </div>
                            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                              <span className="text-sm text-slate-400">
                                Từ {basePrice ? formatCurrency(basePrice) : 'đang cập nhật'}
                              </span>
                              <span className="text-sm font-bold text-primary">
                                {active ? 'Sẽ tiếp tục' : 'Chọn suất'}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex justify-end">
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <Link to={`/movies/${selectedFilmId}`}>
                    <Button variant="secondary" className="w-full rounded-full px-8 sm:w-auto">
                      <Icon name="arrow_back" />
                      Quay lại
                    </Button>
                  </Link>
                  <Button
                    className="w-full rounded-full px-8 sm:w-auto"
                    disabled={
                      pageLoading ||
                      !selectedDate ||
                      !selectedCinemaId ||
                      !selectedShowtimeId ||
                      showtimesLoading
                    }
                    onClick={handleContinue}
                  >
                    Tiếp tục
                    <Icon name="arrow_forward" />
                  </Button>
                </div>
              </div>
              </div>
            </div>
          ) : null}
      </div>
    </BookingLayout>
  )
}

export default ShowtimeSelection
