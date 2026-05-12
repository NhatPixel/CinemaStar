import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  ConfirmModal,
  Icon,
  Text,
  Input,
  CustomSelect,
  useToast,
} from '../../components'
import { buildFilmsSearchBody, deleteFilm, searchFilms } from '../../api/film'
import { MOVIE_STATUS_OPTIONS } from '../../constants/movieStatusOptions'

const PAGE_SIZE = 12

const MANAGEMENT_STATUS_OPTIONS = [{ value: 'all', label: 'Tất cả trạng thái' }, ...MOVIE_STATUS_OPTIONS]
const STATUS_LABELS = Object.fromEntries(MOVIE_STATUS_OPTIONS.map((option) => [option.value, option.label]))

const STATUS_META = {
  NOW_SHOWING: {
    className: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
  COMING_SOON: {
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  ENDED: {
    className: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  },
  ARCHIVED: {
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('vi-VN')
}

function rowPoster(film) {
  return film?.poster || '/assets/movie-sample.jpg'
}

function MovieManagement() {
  const toast = useToast()
  const [titleSearch, setTitleSearch] = useState('')
  const [debouncedTitle, setDebouncedTitle] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [rows, setRows] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [pendingDeleteFilm, setPendingDeleteFilm] = useState(null)
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
    setRows([])
    setNextCursor(null)
    setHasNext(false)

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const body = buildFilmsSearchBody({
      size: PAGE_SIZE,
      title: debouncedTitle,
      status: statusFilter,
    })

    ;(async () => {
      try {
        const data = await searchFilms(body, { signal: ac.signal })
        if (cancelled) return
        setRows(data?.data || [])
        setNextCursor(data?.nextCursor ?? null)
        setHasNext(Boolean(data?.hasNext))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách phim')
        setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [debouncedTitle, statusFilter, toast])

  const loadMore = useCallback(async () => {
    if (!nextCursor || !hasNext || loadingMore || loading) return
    setLoadingMore(true)
    try {
      const body = buildFilmsSearchBody({
        cursor: nextCursor,
        size: PAGE_SIZE,
        title: debouncedTitle,
        status: statusFilter,
      })
      const data = await searchFilms(body)
      setRows((prev) => [...prev, ...(data?.data || [])])
      setNextCursor(data?.nextCursor ?? null)
      setHasNext(Boolean(data?.hasNext))
    } catch (e) {
      toast.error(e?.message || 'Không tải thêm phim')
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, hasNext, loadingMore, loading, debouncedTitle, statusFilter, toast])

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
      { root: null, rootMargin: '280px', threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [rows.length, hasNext])

  const handleDeleteFilm = useCallback(
    async () => {
      const film = pendingDeleteFilm
      if (!film?.id) return

      try {
        setDeletingId(film.id)
        const data = await deleteFilm(film.id)
        setRows((prev) => prev.filter((item) => item.id !== film.id))
        toast.success(data?.message || 'Xóa phim thành công')
        setPendingDeleteFilm(null)
      } catch (e) {
        toast.error(e?.message || 'Xóa phim thất bại')
      } finally {
        setDeletingId('')
      }
    },
    [pendingDeleteFilm, toast]
  )

  return (
    <>
      <main className="flex-1 min-w-0 p-6 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
              Quản lý phim
            </Text>
            <Text variant="small" className="text-slate-500 dark:text-slate-400 mt-1">
              Quản lý danh sách phim, trạng thái và thông tin chi tiết
            </Text>
          </div>
          <Link to="/management/movies/new">
            <Button className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30">
              <Icon name="add" />
              Tạo phim mới
            </Button>
          </Link>
        </header>

        <section className="bg-white dark:bg-primary/5 p-6 rounded-2xl border border-slate-200 dark:border-primary/20 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                name="titleSearch"
                value={titleSearch}
                onChange={(e) => setTitleSearch(e.target.value)}
                placeholder="Tìm kiếm tên phim..."
                icon="search"
              />
            </div>
            <div>
              <CustomSelect
                name="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={MANAGEMENT_STATUS_OPTIONS}
                placeholder="Tất cả trạng thái"
              />
            </div>
          </div>
        </section>

        <div className="bg-white dark:bg-primary/5 rounded-2xl border border-slate-200 dark:border-primary/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-background-dark/30 border-b border-slate-200 dark:border-primary/20">
                  <th className="px-6 py-4 font-semibold text-sm">Poster</th>
                  <th className="px-6 py-4 font-semibold text-sm">Tên phim</th>
                  <th className="px-6 py-4 font-semibold text-sm">Đạo diễn</th>
                  <th className="px-6 py-4 font-semibold text-sm">Thời lượng</th>
                  <th className="px-6 py-4 font-semibold text-sm">Phát hành</th>
                  <th className="px-6 py-4 font-semibold text-sm">Quốc gia</th>
                  <th className="px-6 py-4 font-semibold text-sm min-w-[150px]">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-sm text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
                {!loading &&
                  rows.map((film) => {
                    const statusLabel = STATUS_LABELS[film.status] || film.status || '—'
                    const meta = STATUS_META[film.status] || {
                      className: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
                    }
                    return (
                      <tr
                        key={film.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div
                            className="w-12 h-16 rounded-lg bg-slate-200 dark:bg-primary/20 bg-cover bg-center shadow-sm"
                            style={{ backgroundImage: `url('${rowPoster(film)}')` }}
                          />
                        </td>
                        <td className="px-6 py-4 font-semibold">{film.title || '—'}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {film.director || '—'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {film.duration != null ? `${film.duration} phút` : '—'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {formatDate(film.releaseDate || film.publishedAt || film.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {film.country || '—'}
                        </td>
                        <td className="px-6 py-4 min-w-[150px]">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${meta.className}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <Link to={`/movies/${film.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                              >
                                <Icon name="visibility" />
                              </Button>
                            </Link>
                            <Link to={`/management/movies/${film.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                              >
                                <Icon name="edit" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              onClick={() => setPendingDeleteFilm(film)}
                              disabled={deletingId === film.id}
                            >
                              <Icon name="delete" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50 dark:bg-background-dark/30 border-t border-slate-200 dark:border-primary/20">
            {loading && (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                Đang tải danh sách phim...
              </Text>
            )}
            {!loading && rows.length === 0 && (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                Không có phim phù hợp.
              </Text>
            )}
            {!loading && rows.length > 0 && (
              <div className="flex flex-col gap-2">
                <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                  Đang hiển thị {rows.length} phim
                </Text>
                {hasNext && (
                  <Text variant="small" className="text-xs text-slate-400 dark:text-slate-500">
                    Cuộn xuống để tải thêm.
                  </Text>
                )}
              </div>
            )}
            {loadingMore && (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Đang tải thêm phim...
              </Text>
            )}
          </div>
        </div>

        <div ref={sentinelRef} className="h-8 w-full" aria-hidden />
      </main>

      <ConfirmModal
        isOpen={Boolean(pendingDeleteFilm)}
        title="Xác nhận xóa phim"
        message={`Bạn có chắc chắn muốn xóa phim "${pendingDeleteFilm?.title || ''}"?`}
        onConfirm={handleDeleteFilm}
        onCancel={() => setPendingDeleteFilm(null)}
        disableConfirm={deletingId === pendingDeleteFilm?.id}
        closeOnOverlayClick={deletingId !== pendingDeleteFilm?.id}
      />
    </>
  )
}

export default MovieManagement

