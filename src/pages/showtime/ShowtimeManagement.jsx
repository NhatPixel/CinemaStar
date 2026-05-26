import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  ConfirmModal,
  CustomSelect,
  Icon,
  Input,
  Text,
  useToast,
} from '../../components'
import { buildCinemasSearchBody, searchCinemas } from '../../api/cinema'
import { buildFilmsSearchBody, searchFilms } from '../../api/film'
import { buildHallsSearchBody, searchHalls } from '../../api/hall'
import {
  buildShowtimesSearchBody,
  deleteShowtime,
  searchShowtimes,
} from '../../api/showtime'
import ShowtimeModal from '../../components/showtime/ShowtimeModal'
import {
  SHOWTIME_STATUS_BADGE_CLASS,
  SHOWTIME_STATUS_LABEL_VI,
  SHOWTIME_STATUS_OPTIONS,
} from '../../constants/showtimeStatusOptions'

const PAGE_SIZE = 12

const MANAGEMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  ...SHOWTIME_STATUS_OPTIONS,
]

function formatShortId(id) {
  if (!id) return '—'
  const s = String(id)
  return s.length > 8 ? `${s.slice(0, 8)}…` : s
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).replace('T', ' ').slice(0, 16)
  return d.toLocaleString('vi-VN')
}

function getFilmName(showtime) {
  return (
    showtime?.filmResponse?.title ||
    showtime?.film?.title ||
    showtime?.filmTitle ||
    showtime?.movieTitle ||
    showtime?.filmId ||
    '—'
  )
}

function getCinemaName(showtime) {
  return (
    showtime?.cinemaResponse?.name ||
    showtime?.cinema?.name ||
    showtime?.cinemaName ||
    showtime?.cinemaId ||
    '—'
  )
}

function getHallName(showtime) {
  return (
    showtime?.hallResponse?.name ||
    showtime?.hall?.name ||
    showtime?.hallName ||
    showtime?.hallId ||
    '—'
  )
}

function ShowtimeManagement() {
  const toast = useToast()
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cinemaFilter, setCinemaFilter] = useState('')
  const [filmOptions, setFilmOptions] = useState([])
  const [cinemaOptions, setCinemaOptions] = useState([])
  const [hallOptions, setHallOptions] = useState([])
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingShowtimeId, setEditingShowtimeId] = useState(null)
  const [viewingShowtimeId, setViewingShowtimeId] = useState(null)
  const [pendingDeleteShowtime, setPendingDeleteShowtime] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword, statusFilter, cinemaFilter])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()

    ;(async () => {
      try {
        const [films, cinemas, halls] = await Promise.all([
          searchFilms(buildFilmsSearchBody({ size: 100 }), { signal: ac.signal }),
          searchCinemas(buildCinemasSearchBody({ page: 1, size: 100 }), { signal: ac.signal }),
          searchHalls(buildHallsSearchBody({ page: 1, size: 200 }), { signal: ac.signal }),
        ])
        if (cancelled) return
        setFilmOptions(
          (films?.data || []).map((film) => ({
            value: film.id,
            label: film.title || film.name || film.id,
          })),
        )
        setCinemaOptions(
          (cinemas?.data || []).map((cinema) => ({
            value: cinema.id,
            label: cinema.name || cinema.code || cinema.id,
          })),
        )
        setHallOptions(
          (halls?.data || []).map((hall) => ({
            value: hall.id,
            label: hall.name || hall.code || hall.id,
            cinemaId: hall.cinemaId || hall.cinemaResponse?.id || hall.cinema?.id,
          })),
        )
      } catch {
        if (!cancelled) {
          setFilmOptions([])
          setCinemaOptions([])
          setHallOptions([])
        }
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const ac = new AbortController()

    const body = buildShowtimesSearchBody({
      page,
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
      status: statusFilter,
      cinemaId: cinemaFilter,
    })

    ;(async () => {
      try {
        const data = await searchShowtimes(body, { signal: ac.signal })
        if (cancelled) return
        setRows(data?.data || [])
        setTotalPages(data?.totalPages ?? 0)
        setTotalElements(data?.totalElements ?? 0)
        setHasNext(Boolean(data?.hasNext))
        setHasPrevious(Boolean(data?.hasPrevious))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách suất chiếu')
        setRows([])
        setTotalPages(0)
        setTotalElements(0)
        setHasNext(false)
        setHasPrevious(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [page, debouncedKeyword, statusFilter, cinemaFilter, refreshTick, toast])

  const handleDeleteShowtime = useCallback(async () => {
    const showtime = pendingDeleteShowtime
    if (!showtime?.id) return

    try {
      setDeletingId(showtime.id)
      const data = await deleteShowtime(showtime.id)
      toast.success(data?.message || 'Xóa suất chiếu thành công')
      setPendingDeleteShowtime(null)
      setRefreshTick((n) => n + 1)
    } catch (e) {
      toast.error(e?.message || 'Xóa suất chiếu thất bại')
    } finally {
      setDeletingId('')
    }
  }, [pendingDeleteShowtime, toast])

  return (
    <>
      <main className="flex-1 min-w-0 p-6 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
              Quản lý suất chiếu
            </Text>
            <Text variant="small" className="text-slate-500 dark:text-slate-400 mt-1">
              Lên lịch phim theo rạp, phòng chiếu và khung giờ
            </Text>
          </div>
          <Button
            type="button"
            variant="primary"
            className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30"
            onClick={() => setCreateOpen(true)}
          >
            <Icon name="add" />
            Tạo suất chiếu
          </Button>
        </header>

        <section className="bg-white dark:bg-primary/5 p-6 rounded-2xl border border-slate-200 dark:border-primary/20 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                name="showtimeSearch"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm phim, rạp, phòng..."
                icon="search"
              />
            </div>
            <CustomSelect
              name="cinemaFilter"
              value={cinemaFilter}
              onChange={(e) => setCinemaFilter(e.target.value)}
              options={[{ value: '', label: 'Tất cả rạp' }, ...cinemaOptions]}
              placeholder="Tất cả rạp"
            />
            <CustomSelect
              name="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={MANAGEMENT_STATUS_OPTIONS}
              placeholder="Tất cả trạng thái"
            />
          </div>
        </section>

        <div className="bg-white dark:bg-primary/5 rounded-2xl border border-slate-200 dark:border-primary/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-background-dark/30 border-b border-slate-200 dark:border-primary/20">
                  <th className="px-6 py-4 font-semibold text-sm">ID</th>
                  <th className="px-6 py-4 font-semibold text-sm">Phim</th>
                  <th className="px-6 py-4 font-semibold text-sm">Rạp</th>
                  <th className="px-6 py-4 font-semibold text-sm">Phòng</th>
                  <th className="px-6 py-4 font-semibold text-sm">Bắt đầu</th>
                  <th className="px-6 py-4 font-semibold text-sm">Kết thúc</th>
                  <th className="px-6 py-4 font-semibold text-sm min-w-[150px]">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-sm text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
                {!loading &&
                  rows.map((showtime) => {
                    const statusLabel =
                      SHOWTIME_STATUS_LABEL_VI[showtime.status] || showtime.status || '—'
                    const badgeClass =
                      SHOWTIME_STATUS_BADGE_CLASS[showtime.status] ||
                      'bg-slate-500/10 text-slate-500 border-slate-500/20'
                    return (
                      <tr
                        key={showtime.id}
                        className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors"
                        onClick={() => setViewingShowtimeId(showtime.id)}
                      >
                        <td className="px-6 py-4 font-semibold">{formatShortId(showtime.id)}</td>
                        <td className="px-6 py-4">{getFilmName(showtime)}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {getCinemaName(showtime)}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {getHallName(showtime)}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {formatDateTime(showtime.startTime || showtime.startDateTime)}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {formatDateTime(showtime.endTime || showtime.endDateTime)}
                        </td>
                        <td className="px-6 py-4 min-w-[150px]">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                              onClick={() => setEditingShowtimeId(showtime.id)}
                            >
                              <Icon name="edit" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              onClick={() => setPendingDeleteShowtime(showtime)}
                              disabled={deletingId === showtime.id}
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

          <div className="px-6 py-4 bg-slate-50 dark:bg-background-dark/30 border-t border-slate-200 dark:border-primary/20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {loading && (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                Đang tải danh sách suất chiếu...
              </Text>
            )}
            {!loading && rows.length === 0 && (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                Không có suất chiếu phù hợp.
              </Text>
            )}
            {!loading && rows.length > 0 && (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                {totalElements > 0
                  ? `Hiển thị ${rows.length} / ${totalElements} suất chiếu`
                  : `Đang hiển thị ${rows.length} suất chiếu`}
              </Text>
            )}
            {!loading && totalPages > 1 && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:border-primary/20 dark:text-slate-300 dark:hover:bg-primary/10"
                  disabled={!hasPrevious || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trang trước
                </Button>
                <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                  Trang {page}
                  {totalPages > 0 ? ` / ${totalPages}` : ''}
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:border-primary/20 dark:text-slate-300 dark:hover:bg-primary/10"
                  disabled={!hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Trang sau
                </Button>
              </div>
            )}
          </div>
        </div>

        <ShowtimeModal
          isOpen={createOpen}
          mode="create"
          filmOptions={filmOptions}
          cinemaOptions={cinemaOptions}
          hallOptions={hallOptions}
          onCancel={() => setCreateOpen(false)}
          onSubmitted={() => {
            setCreateOpen(false)
            setRefreshTick((n) => n + 1)
          }}
        />

        <ShowtimeModal
          isOpen={Boolean(editingShowtimeId)}
          mode="edit"
          showtimeId={editingShowtimeId}
          filmOptions={filmOptions}
          cinemaOptions={cinemaOptions}
          hallOptions={hallOptions}
          onCancel={() => setEditingShowtimeId(null)}
          onSubmitted={() => {
            setEditingShowtimeId(null)
            setRefreshTick((n) => n + 1)
          }}
        />

        <ShowtimeModal
          isOpen={Boolean(viewingShowtimeId)}
          mode="view"
          showtimeId={viewingShowtimeId}
          filmOptions={filmOptions}
          cinemaOptions={cinemaOptions}
          hallOptions={hallOptions}
          onCancel={() => setViewingShowtimeId(null)}
        />
      </main>

      <ConfirmModal
        isOpen={Boolean(pendingDeleteShowtime)}
        title="Xác nhận xóa suất chiếu"
        message={`Bạn có chắc chắn muốn xóa suất chiếu "${getFilmName(pendingDeleteShowtime)}"?`}
        onConfirm={handleDeleteShowtime}
        onCancel={() => setPendingDeleteShowtime(null)}
        disableConfirm={deletingId === pendingDeleteShowtime?.id}
        closeOnOverlayClick={deletingId !== pendingDeleteShowtime?.id}
      />
    </>
  )
}

export default ShowtimeManagement
