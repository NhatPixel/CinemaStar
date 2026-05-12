import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  CinemaUpsertModal,
  CustomSelect,
  Icon,
  Input,
  Text,
  useToast,
} from '../../components'
import { buildCinemasSearchBody, searchCinemas } from '../../api/cinema'
import {
  CINEMA_STATUS_BADGE_CLASS,
  CINEMA_STATUS_LABEL_VI,
  CINEMA_STATUS_OPTIONS,
} from '../../constants/cinemaStatusOptions'

const PAGE_SIZE = 12

const MANAGEMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  ...CINEMA_STATUS_OPTIONS,
]

function formatLocation(cinema) {
  return cinema?.address || '—'
}

function formatHours(cinema) {
  const open = String(cinema?.openTime || '').slice(0, 5)
  const close = String(cinema?.closeTime || '').slice(0, 5)
  if (!open && !close) return '—'
  return `${open || '—'} – ${close || '—'}`
}

function CinemaManagement() {
  const toast = useToast()
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [rows, setRows] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingCinema, setEditingCinema] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const abortRef = useRef(null)
  const sentinelRef = useRef(null)
  const loadMoreRef = useRef(() => {})

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setRows([])
    setNextCursor(null)
    setHasNext(false)

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const body = buildCinemasSearchBody({
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
      status: statusFilter,
    })

    ;(async () => {
      try {
        const data = await searchCinemas(body, { signal: ac.signal })
        if (cancelled) return
        setRows(data?.data || [])
        setNextCursor(data?.nextCursor ?? null)
        setHasNext(Boolean(data?.hasNext))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách rạp')
        setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [debouncedKeyword, statusFilter, refreshTick, toast])

  const loadMore = useCallback(async () => {
    if (!nextCursor || !hasNext || loadingMore || loading) return
    setLoadingMore(true)
    try {
      const body = buildCinemasSearchBody({
        cursor: nextCursor,
        size: PAGE_SIZE,
        keyword: debouncedKeyword,
        status: statusFilter,
      })
      const data = await searchCinemas(body)
      setRows((prev) => [...prev, ...(data?.data || [])])
      setNextCursor(data?.nextCursor ?? null)
      setHasNext(Boolean(data?.hasNext))
    } catch (e) {
      toast.error(e?.message || 'Không tải thêm rạp')
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, hasNext, loadingMore, loading, debouncedKeyword, statusFilter, toast])

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
      { root: null, rootMargin: '280px', threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [rows.length, hasNext])

  return (
    <main className="flex-1 min-w-0 p-6 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
            Quản lý rạp
          </Text>
          <Text variant="small" className="text-slate-500 dark:text-slate-400 mt-1">
            Quản lý danh sách rạp và trạng thái hoạt động
          </Text>
        </div>
        <Button
          type="button"
          variant="primary"
          className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30"
          onClick={() => setCreateOpen(true)}
        >
          <Icon name="add" />
          Tạo rạp mới
        </Button>
      </header>

      <section className="bg-white dark:bg-primary/5 p-6 rounded-2xl border border-slate-200 dark:border-primary/20 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              name="cinemaSearch"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm mã, tên hoặc địa chỉ rạp..."
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
                <th className="px-6 py-4 font-semibold text-sm">Mã rạp</th>
                <th className="px-6 py-4 font-semibold text-sm">Tên rạp</th>
                <th className="px-6 py-4 font-semibold text-sm">Địa chỉ</th>
                <th className="px-6 py-4 font-semibold text-sm">Liên hệ</th>
                <th className="px-6 py-4 font-semibold text-sm">Giờ mở cửa</th>
                <th className="px-6 py-4 font-semibold text-sm min-w-[150px]">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-sm text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
              {!loading &&
                rows.map((cinema) => {
                  const statusLabel =
                    CINEMA_STATUS_LABEL_VI[cinema.status] || cinema.status || '—'
                  const badgeClass =
                    CINEMA_STATUS_BADGE_CLASS[cinema.status] ||
                    'bg-slate-500/10 text-slate-500 border-slate-500/20'
                  return (
                    <tr
                      key={cinema.id || cinema.code}
                      className="hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold">{cinema.code || '—'}</td>
                      <td className="px-6 py-4">{cinema.name || '—'}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {formatLocation(cinema)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {cinema.phone || '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="schedule" className="text-base" />
                          {formatHours(cinema)}
                        </span>
                      </td>
                      <td className="px-6 py-4 min-w-[150px]">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-primary hover:bg-primary/10"
                          onClick={() => setEditingCinema(cinema)}
                        >
                          <Icon name="edit" className="text-base" />
                          Sửa
                        </Button>
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
              Đang tải danh sách rạp...
            </Text>
          )}
          {!loading && rows.length === 0 && (
            <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
              Không có rạp phù hợp.
            </Text>
          )}
          {!loading && rows.length > 0 && (
            <div className="flex flex-col gap-2">
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                Đang hiển thị {rows.length} rạp
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
              Đang tải thêm rạp...
            </Text>
          )}
        </div>
      </div>

      <div ref={sentinelRef} className="h-8 w-full" aria-hidden />

      <CinemaUpsertModal
        isOpen={createOpen}
        onCancel={() => setCreateOpen(false)}
        onSubmitted={() => {
          setCreateOpen(false)
          setRefreshTick((n) => n + 1)
        }}
      />

      <CinemaUpsertModal
        isOpen={Boolean(editingCinema)}
        cinema={editingCinema}
        onCancel={() => setEditingCinema(null)}
        onSubmitted={() => {
          setEditingCinema(null)
          setRefreshTick((n) => n + 1)
        }}
      />
    </main>
  )
}

export default CinemaManagement
