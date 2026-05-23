import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  ConfirmModal,
  CustomSelect,
  HallModal,
  Icon,
  Input,
  Text,
  useToast,
} from '../../components'
import { buildCinemasSearchBody, searchCinemas } from '../../api/cinema'
import { buildHallsSearchBody, deleteHall, searchHalls } from '../../api/hall'
import {
  HALL_STATUS_BADGE_CLASS,
  HALL_STATUS_LABEL_VI,
  HALL_STATUS_OPTIONS,
} from '../../constants/hallStatusOptions'

const PAGE_SIZE = 12

const MANAGEMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  ...HALL_STATUS_OPTIONS,
]

function formatShortId(id) {
  if (!id) return '—'
  const s = String(id)
  return s.length > 8 ? `${s.slice(0, 8)}…` : s
}

function seatCount(hall) {
  const n = hall?.seats?.length
  return Number.isFinite(n) ? n : 0
}

function HallManagement() {
  const toast = useToast()
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cinemaFilter, setCinemaFilter] = useState('')
  const [cinemaOptions, setCinemaOptions] = useState([{ value: '', label: 'Tất cả rạp' }])
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingHallId, setEditingHallId] = useState(null)
  const [viewingHallId, setViewingHallId] = useState(null)
  const [pendingDeleteHall, setPendingDeleteHall] = useState(null)
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
        const body = buildCinemasSearchBody({ page: 1, size: 100, keyword: '' })
        const data = await searchCinemas(body, { signal: ac.signal })
        if (cancelled) return
        const list = data?.data || []
        setCinemaOptions([
          { value: '', label: 'Tất cả rạp' },
          ...list.map((c) => ({
            value: c.id,
            label: c.name || c.code || c.id,
          })),
        ])
      } catch {
        if (!cancelled) {
          setCinemaOptions([{ value: '', label: 'Tất cả rạp' }])
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

    const body = buildHallsSearchBody({
      page,
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
      status: statusFilter,
      cinemaId: cinemaFilter || undefined,
      sortBy: [{ field: 'TIME_CREATED', direction: 'DESC' }],
    })

    ;(async () => {
      try {
        const data = await searchHalls(body, { signal: ac.signal })
        if (cancelled) return
        setRows(data?.data || [])
        setTotalPages(data?.totalPages ?? 0)
        setTotalElements(data?.totalElements ?? 0)
        setHasNext(Boolean(data?.hasNext))
        setHasPrevious(Boolean(data?.hasPrevious))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách phòng chiếu')
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

  const handleDeleteHall = useCallback(async () => {
    const hall = pendingDeleteHall
    if (!hall?.id) return

    try {
      setDeletingId(hall.id)
      const data = await deleteHall(hall.id)
      toast.success(data?.message || 'Xóa phòng chiếu thành công')
      setPendingDeleteHall(null)
      setRefreshTick((n) => n + 1)
    } catch (e) {
      toast.error(e?.message || 'Xóa phòng chiếu thất bại')
    } finally {
      setDeletingId('')
    }
  }, [pendingDeleteHall, toast])

  return (
    <>
      <main className="flex-1 min-w-0 p-6 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
              Quản lý phòng chiếu
            </Text>
            <Text variant="small" className="text-slate-500 dark:text-slate-400 mt-1">
              Danh sách phòng chiếu theo rạp và trạng thái hoạt động
            </Text>
          </div>
          <Button
            type="button"
            variant="primary"
            className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30"
            onClick={() => setCreateOpen(true)}
          >
            <Icon name="add" />
            Tạo phòng mới
          </Button>
        </header>

        <section className="bg-white dark:bg-primary/5 p-6 rounded-2xl border border-slate-200 dark:border-primary/20 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Input
                name="hallSearch"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm tên phòng, ID..."
                icon="search"
              />
            </div>
            <div>
              <CustomSelect
                name="cinemaFilter"
                value={cinemaFilter}
                onChange={(e) => setCinemaFilter(e.target.value)}
                options={cinemaOptions}
                placeholder="Tất cả rạp"
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
                  <th className="px-6 py-4 font-semibold text-sm">ID</th>
                  <th className="px-6 py-4 font-semibold text-sm">Tên phòng</th>
                  <th className="px-6 py-4 font-semibold text-sm">Rạp</th>
                  <th className="px-6 py-4 font-semibold text-sm">Số ghế</th>
                  <th className="px-6 py-4 font-semibold text-sm min-w-[150px]">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-sm text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
                {!loading &&
                  rows.map((hall) => {
                    const statusLabel =
                      HALL_STATUS_LABEL_VI[hall.status] || hall.status || '—'
                    const badgeClass =
                      HALL_STATUS_BADGE_CLASS[hall.status] ||
                      'bg-slate-500/10 text-slate-500 border-slate-500/20'
                    return (
                      <tr
                        key={hall.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors"
                      >
                        <td
                          className="px-6 py-4 font-mono text-xs text-slate-500"
                          title={hall.id}
                        >
                          {formatShortId(hall.id)}
                        </td>
                        <td className="px-6 py-4 font-semibold">{hall.name || '—'}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {hall.cinemaResponse?.name || hall.cinemaId || '—'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {seatCount(hall)} ghế
                        </td>
                        <td className="px-6 py-4 min-w-[150px]">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                              onClick={() => setViewingHallId(hall.id)}
                            >
                              <Icon name="visibility" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                              onClick={() => setEditingHallId(hall.id)}
                            >
                              <Icon name="edit" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              onClick={() => setPendingDeleteHall(hall)}
                              disabled={deletingId === hall.id}
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
                Đang tải danh sách phòng chiếu...
              </Text>
            )}
            {!loading && rows.length === 0 && (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                Không có phòng chiếu phù hợp.
              </Text>
            )}
            {!loading && rows.length > 0 && (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                {totalElements > 0
                  ? `Hiển thị ${rows.length} / ${totalElements} phòng`
                  : `Đang hiển thị ${rows.length} phòng`}
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

        <HallModal
          isOpen={createOpen}
          mode="create"
          onCancel={() => setCreateOpen(false)}
          onSubmitted={() => {
            setCreateOpen(false)
            setRefreshTick((n) => n + 1)
          }}
        />

        <HallModal
          isOpen={Boolean(editingHallId)}
          mode="edit"
          hallId={editingHallId}
          onCancel={() => setEditingHallId(null)}
          onSubmitted={() => {
            setEditingHallId(null)
            setRefreshTick((n) => n + 1)
          }}
        />

        <HallModal
          isOpen={Boolean(viewingHallId)}
          mode="view"
          hallId={viewingHallId}
          onCancel={() => setViewingHallId(null)}
        />
      </main>

      <ConfirmModal
        isOpen={Boolean(pendingDeleteHall)}
        title="Xác nhận xóa phòng chiếu"
        message={`Bạn có chắc chắn muốn xóa phòng "${pendingDeleteHall?.name || ''}"?`}
        onConfirm={handleDeleteHall}
        onCancel={() => setPendingDeleteHall(null)}
        disableConfirm={deletingId === pendingDeleteHall?.id}
        closeOnOverlayClick={deletingId !== pendingDeleteHall?.id}
      />
    </>
  )
}

export default HallManagement
