import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getFilmById } from '../../api/film'
import { Button, CustomSelect, Icon, Text, useToast } from '../../components'
import { buildShowtimesSearchBody, searchShowtimes } from '../../api/showtime'
import BookingLayout from './BookingLayout'
import {
  BOOKING_MOVIE_STORAGE_KEY,
  MOVIE_FALLBACK,
  formatCurrency,
  formatShowtimeTime,
  getFilmPoster,
  getFilmTitle,
  getShowtimeCinema,
  getShowtimeHall,
  readJsonStorage,
  writeJsonStorage,
} from './bookingData'

const CITY_OPTIONS = [
  { value: 'hcm', label: 'TP. Hồ Chí Minh' },
  { value: 'hn', label: 'Hà Nội' },
  { value: 'dn', label: 'Đà Nẵng' },
]

function ShowtimeSelection() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const filmIdFromQuery = searchParams.get('filmId')
  const storedMovie = readJsonStorage(BOOKING_MOVIE_STORAGE_KEY)
  const selectedFilmId = filmIdFromQuery || storedMovie?.id || ''
  const [selectedMovie, setSelectedMovie] = useState(() =>
    selectedFilmId && storedMovie?.id === selectedFilmId ? storedMovie : null,
  )
  const [showtimes, setShowtimes] = useState([])
  const [selectedShowtimeId, setSelectedShowtimeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Chọn Suất Chiếu - CinemaStar'
  }, [])

  useEffect(() => {
    if (!selectedFilmId) {
      setSelectedMovie(null)
      setShowtimes([])
      setSelectedShowtimeId('')
      setError('Vui lòng chọn phim trước khi chọn suất chiếu.')
      setLoading(false)
      return
    }

    let cancelled = false
    const ac = new AbortController()
    setLoading(true)
    setError('')
    setSelectedShowtimeId('')

    ;(async () => {
      try {
        const [film, data] = await Promise.all([
          getFilmById(selectedFilmId, { signal: ac.signal }),
          searchShowtimes(
            buildShowtimesSearchBody({
              page: 1,
              size: 60,
              status: 'SCHEDULED',
              filmId: selectedFilmId,
            }),
            { signal: ac.signal },
          ),
        ])
        if (cancelled) return
        setSelectedMovie(film || null)
        if (film) writeJsonStorage(BOOKING_MOVIE_STORAGE_KEY, film)
        setShowtimes(data?.data || [])
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        setError(e?.message || 'Không tải được danh sách suất chiếu')
        setSelectedMovie(null)
        setShowtimes([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [selectedFilmId])

  const featuredShowtime = showtimes[0]
  const featuredFilm = selectedMovie
    ? {
        title: selectedMovie.title || selectedMovie.name || MOVIE_FALLBACK.title,
        poster: selectedMovie.poster || MOVIE_FALLBACK.poster,
        ageRating: selectedMovie.ageRating || MOVIE_FALLBACK.ageRating,
        duration: selectedMovie.duration ? `${selectedMovie.duration} phút` : MOVIE_FALLBACK.duration,
        genres: selectedMovie.type || MOVIE_FALLBACK.genres,
        format: MOVIE_FALLBACK.format,
      }
    : featuredShowtime
    ? {
        title: getFilmTitle(featuredShowtime),
        poster: getFilmPoster(featuredShowtime),
        ageRating: featuredShowtime.film?.ageRating || MOVIE_FALLBACK.ageRating,
        duration: featuredShowtime.film?.duration
          ? `${featuredShowtime.film.duration} phút`
          : MOVIE_FALLBACK.duration,
        genres: featuredShowtime.film?.type || MOVIE_FALLBACK.genres,
        format: MOVIE_FALLBACK.format,
      }
    : MOVIE_FALLBACK

  const handleContinue = () => {
    if (!selectedFilmId) {
      toast.error('Vui lòng chọn phim trước')
      navigate('/movies')
      return
    }
    if (!selectedShowtimeId) {
      toast.error('Vui lòng chọn suất chiếu')
      return
    }
    navigate(`/booking/seats?showtimeId=${selectedShowtimeId}&filmId=${selectedFilmId}`)
  }

  const cinemaGroups = useMemo(() => {
    const map = new Map()
    for (const showtime of showtimes) {
      const cinema = getShowtimeCinema(showtime)
      const key = cinema?.id || showtime.cinemaId || 'unknown'
      const current =
        map.get(key) ||
        {
          id: key,
          name: cinema?.name || 'Rạp chiếu',
          address: cinema?.address || 'Chưa có địa chỉ',
          showtimes: [],
        }
      current.showtimes.push(showtime)
      map.set(key, current)
    }
    return Array.from(map.values())
  }, [showtimes])

  return (
    <BookingLayout
      eyebrow="Bước 01"
      title="Chọn Suất Chiếu"
      subtitle="Lựa chọn cụm rạp, ngày chiếu và khung giờ phù hợp để bắt đầu hành trình đặt vé tại CinemaStar."
    >
      <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-primary/20 bg-[#120a1a] p-5 shadow-xl shadow-primary/10">
          <div className="overflow-hidden rounded-2xl">
            <img
              alt={featuredFilm.title}
              className="aspect-[2/3] w-full object-cover"
              src={featuredFilm.poster}
            />
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <span className="mb-3 inline-flex rounded-lg bg-red-600 px-3 py-1 text-xs font-black text-white">
                {featuredFilm.ageRating}
              </span>
              <Text variant="h2" className="text-2xl font-black text-white">
                {featuredFilm.title}
              </Text>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
              <div className="rounded-2xl bg-white/5 p-4">
                <Icon name="schedule" className="mb-2 text-primary" />
                <p className="font-semibold">{featuredFilm.duration}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <Icon name="high_quality" className="mb-2 text-primary" />
                <p className="font-semibold">{featuredFilm.format}</p>
              </div>
            </div>
            <Text variant="small" className="leading-6 text-slate-400">
              {featuredFilm.genres}
            </Text>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-primary/20 bg-[#120a1a] p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-center">
              <p className="text-sm leading-6 text-slate-400">
                Chọn một suất chiếu khả dụng của phim đã chọn rồi bấm tiếp tục.
              </p>
              <CustomSelect name="city" value="hcm" options={CITY_OPTIONS} icon="location_city" />
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-[#120a1a] p-6 text-center text-slate-300">
                Đang tải suất chiếu...
              </div>
            ) : null}

            {!loading && error ? (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-200">
                {error}
              </div>
            ) : null}

            {!loading && !error && selectedFilmId && cinemaGroups.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-[#120a1a] p-6 text-center text-slate-300">
                Chưa có suất chiếu phù hợp.
              </div>
            ) : null}

            {cinemaGroups.map((cinema) => (
              <article key={cinema.id} className="rounded-3xl border border-white/10 bg-[#120a1a] p-5">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Text variant="h3" className="text-xl font-black text-white">
                      {cinema.name}
                    </Text>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                      <Icon name="location_on" className="text-lg text-primary" />
                      {cinema.address}
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {cinema.showtimes.length} suất
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cinema.showtimes.map((showtime) => {
                    const hall = getShowtimeHall(showtime)
                    const pricing = showtime.pricingPolicy || {}
                    const basePrice = pricing.standardPrice || pricing.vipPrice || pricing.couplePrice || 0
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
                            <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                              {getFilmTitle(showtime)}
                            </p>
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
                            {active ? 'Sẽ tiếp tục với suất này' : 'Chọn suất'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>

          <div className="flex justify-end">
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Link to={selectedFilmId ? `/movies/${selectedFilmId}` : '/movies'}>
                <Button variant="secondary" className="w-full rounded-full px-8 sm:w-auto">
                  <Icon name="arrow_back" />
                  Quay lại
                </Button>
              </Link>
              <Button
                className="w-full rounded-full px-8 sm:w-auto"
                disabled={!selectedFilmId || !selectedShowtimeId}
                onClick={handleContinue}
              >
                Tiếp tục
                <Icon name="arrow_forward" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </BookingLayout>
  )
}

export default ShowtimeSelection
