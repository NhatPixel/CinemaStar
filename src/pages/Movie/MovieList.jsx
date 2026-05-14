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
import { buildFilmsSearchBody, searchFilms } from '../../api/film'
import { AGE_RATING_META } from '../../constants/ageRatingMeta'
import { MOVIE_STATUS_OPTIONS } from '../../constants/movieStatusOptions'
import { PAGE_MAIN, PAGE_SHELL } from '../../constants/pageLayout'

const PAGE_SIZE = 12
const LIST_STATUS_OPTIONS = [{ value: 'all', label: 'Tất cả' }, ...MOVIE_STATUS_OPTIONS]

const STATUS_META = {
  COMING_SOON: { label: 'Sắp chiếu', color: 'bg-slate-600' },
  NOW_SHOWING: { label: 'Đang chiếu', color: 'bg-primary' },
  ENDED: { label: 'Ngừng chiếu', color: 'bg-slate-700' },
  ARCHIVED: { label: 'Lưu trữ', color: 'bg-slate-800' },
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
  const muted = film.status === 'ENDED' || film.status === 'ARCHIVED'
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
  const [titleSearch, setTitleSearch] = useState('')
  const [debouncedTitle, setDebouncedTitle] = useState('')
  const [filters, setFilters] = useState({
    status: 'NOW_SHOWING',
  })
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
    let cancelled = false
    setLoading(true)
    setItems([])
    setNextCursor(null)
    setHasNext(false)

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const body = buildFilmsSearchBody({
      size: PAGE_SIZE,
      title: debouncedTitle,
      status: filters.status,
    })

    ;(async () => {
      try {
        const data = await searchFilms(body, { signal: ac.signal })
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
  }, [debouncedTitle, filters.status])

  const loadMore = useCallback(async () => {
    if (!nextCursor || !hasNext || loadingMore || loading) return
    setLoadingMore(true)
    try {
      const body = buildFilmsSearchBody({
        cursor: nextCursor,
        size: PAGE_SIZE,
        title: debouncedTitle,
        status: filters.status,
      })
      const data = await searchFilms(body)
      setItems((prev) => [...prev, ...(data?.data || [])])
      setNextCursor(data?.nextCursor ?? null)
      setHasNext(Boolean(data?.hasNext))
    } catch (e) {
      toast.error(e?.message || 'Không tải thêm phim')
    } finally {
      setLoadingMore(false)
    }
  }, [
    nextCursor,
    hasNext,
    loadingMore,
    loading,
    debouncedTitle,
    filters.status,
  ])

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
                options={LIST_STATUS_OPTIONS}
                placeholder="Chọn trạng thái"
              />
            </div>
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
