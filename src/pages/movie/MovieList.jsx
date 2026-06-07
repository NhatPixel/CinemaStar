import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Icon,
  Text,
  MovieCard,
  AppHeader,
  AppFooter,
  CustomSelect,
  Input,
  useToast,
} from '../../components'
import { searchAllCinemas } from '../../api/cinema'
import {
  buildFilmsCustomerSearchBody,
  buildFilmsSearchBody,
  searchFilms,
  searchFilmsForCustomer,
} from '../../api/film'
import { AGE_RATING_META } from '../../constants/ageRatingMeta'
import {
  MOVIE_LIST_PUBLIC_STATUSES,
  MOVIE_LIST_STATUS_OPTIONS,
} from '../../constants/movieStatusOptions'
import { isCustomerRole } from '../../constants/userRoleLabels'
import { PAGE_MAIN, PAGE_SHELL } from '../../constants/pageLayout'

const PAGE_SIZE = 12

const STATUS_META = {
  COMING_SOON: { label: 'Sắp chiếu', color: 'bg-slate-600' },
  NOW_SHOWING: { label: 'Đang chiếu', color: 'bg-primary' },
}

function formatAgeRating(rating) {
  if (!rating) return ''
  const meta = AGE_RATING_META[rating]
  if (meta?.short) return meta.short
  return String(rating).replace(/^RATING_/i, '')
}

function mapFilmToCardProps(film) {
  const meta = STATUS_META[film.status] || {
    label: film.status || '',
    color: 'bg-slate-600',
  }
  const muted = false
  const overlayVariant = film.status === 'COMING_SOON' ? 'remind' : 'buy'
  const sub = [film.country, film.language].filter(Boolean).join(' - ')
  return {
    title: film.title,
    duration: film.duration != null ? `${film.duration} phút` : '—',
    genres: sub || '—',
    ageLabel: formatAgeRating(film.ageRating),
    ageColorClass: 'bg-red-600',
    statusLabel: meta.label,
    statusColorClass: meta.color,
    overlayVariant,
    muted,
    posterSrc: film.poster || '/assets/movie-sample.jpg',
    posterAlt: film.title || 'Poster',
  }
}

function MovieList() {
  const toast = useToast()
  const isCustomer = isCustomerRole()
  const [titleSearch, setTitleSearch] = useState('')
  const [debouncedTitle, setDebouncedTitle] = useState('')
  const [filters, setFilters] = useState({
    status: 'NOW_SHOWING',
  })
  const [cinemaFilter, setCinemaFilter] = useState('')
  const [cinemaOptions, setCinemaOptions] = useState([
    { value: '', label: 'Tất cả rạp' },
  ])
  const [items, setItems] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const abortRef = useRef(null)
  const sentinelRef = useRef(null)
  const loadMoreRef = useRef(() => {})

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTitle(titleSearch), 400)
    return () => clearTimeout(t)
  }, [titleSearch])

  useEffect(() => {
    if (!isCustomer) return undefined

    let cancelled = false
    ;(async () => {
      try {
        const cinemas = await searchAllCinemas({ status: 'ACTIVE', size: 50 })
        if (cancelled) return
        setCinemaOptions([
          { value: '', label: 'Tất cả rạp' },
          ...cinemas.map((cinema) => ({
            value: cinema.id,
            label: cinema.name || cinema.code || String(cinema.id),
          })),
        ])
      } catch (e) {
        if (cancelled) return
        toast.error(e?.message || 'Không tải được danh sách rạp')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isCustomer, toast])

  const buildSearchBody = useCallback(
    (extra = {}) => {
      if (isCustomer) {
        return buildFilmsCustomerSearchBody({
          size: PAGE_SIZE,
          title: debouncedTitle,
          cinemaId: cinemaFilter || undefined,
          ...extra,
        })
      }
      const status = filters.status
      return buildFilmsSearchBody({
        size: PAGE_SIZE,
        title: debouncedTitle,
        ...(status === 'all'
          ? { statusIn: MOVIE_LIST_PUBLIC_STATUSES }
          : { status }),
        ...extra,
      })
    },
    [isCustomer, debouncedTitle, cinemaFilter, filters.status],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setItems([])
    setNextCursor(null)
    setHasNext(false)

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const body = buildSearchBody()

    ;(async () => {
      const searchFn = isCustomer ? searchFilmsForCustomer : searchFilms
      try {
        const data = await searchFn(body, { signal: ac.signal })
        if (cancelled) return
        setItems(data?.data || [])
        setNextCursor(data?.nextCursor ?? null)
        setHasNext(Boolean(data?.hasNext))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách phim')
        setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [debouncedTitle, filters.status, cinemaFilter, isCustomer, buildSearchBody, toast])

  const loadMore = useCallback(async () => {
    if (!nextCursor || !hasNext || loadingMore || loading) return
    setLoadingMore(true)
    try {
      const searchFn = isCustomer ? searchFilmsForCustomer : searchFilms
      const body = buildSearchBody({ cursor: nextCursor })
      const data = await searchFn(body)
      setItems((prev) => [...prev, ...(data?.data || [])])
      setNextCursor(data?.nextCursor ?? null)
      setHasNext(Boolean(data?.hasNext))
    } catch (e) {
      toast.error(e?.message || 'Không tải thêm phim')
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, hasNext, loadingMore, loading, buildSearchBody, isCustomer, toast])

  loadMoreRef.current = loadMore

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreRef.current()
        }
      },
      { root: null, rootMargin: '240px', threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [items.length, hasNext])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className={PAGE_SHELL}>
      <AppHeader />

      <main className={PAGE_MAIN}>
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
            <a className="hover:text-primary" href="/">
              Trang chủ
            </a>
            <Icon name="chevron_right" className="text-xs" />
            <span className="text-primary font-medium">Danh sách phim</span>
          </nav>
          <Text variant="h1" className="text-4xl font-bold tracking-tight mb-2">
            Danh sách phim
          </Text>
          <Text variant="body" className="text-slate-500 dark:text-slate-400">
            Khám phá những siêu phẩm điện ảnh mới nhất tại CinemaStar
          </Text>
        </div>

        <section className="glass rounded-xl mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Text
                variant="caption"
                className="text-xs font-bold uppercase tracking-wider text-primary"
              >
                Tìm theo tên phim
              </Text>
              <Input
                name="titleSearch"
                value={titleSearch}
                onChange={(e) => setTitleSearch(e.target.value)}
                placeholder="Nhập tên phim..."
                icon="search"
              />
            </div>
            {isCustomer ? (
              <div className="space-y-2">
                <Text
                  variant="caption"
                  className="text-xs font-bold uppercase tracking-wider text-primary"
                >
                  Rạp chiếu
                </Text>
                <CustomSelect
                  name="cinemaFilter"
                  value={cinemaFilter}
                  onChange={(e) => setCinemaFilter(e.target.value)}
                  options={cinemaOptions}
                  placeholder="Chọn rạp"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Text
                  variant="caption"
                  className="text-xs font-bold uppercase tracking-wider text-primary"
                >
                  Trạng thái
                </Text>
                <CustomSelect
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  options={MOVIE_LIST_STATUS_OPTIONS}
                  placeholder="Chọn trạng thái"
                />
              </div>
            )}
          </div>
        </section>

        {loading && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            Đang tải...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            Không có phim phù hợp.
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {!loading &&
            items.map((film) => (
              <Link key={film.id} to={`/movies/${film.id}`} className="block">
                <MovieCard {...mapFilmToCardProps(film)} />
              </Link>
            ))}
        </section>

        <div ref={sentinelRef} className="h-8 w-full" aria-hidden />

        {loadingMore && (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
            Đang tải thêm...
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  )
}

export default MovieList
