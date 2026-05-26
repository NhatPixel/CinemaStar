import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  CinemaModal,
  ConfirmModal,
  CustomSelect,
  Icon,
  Input,
  Text,
  useToast,
} from '../../components'
import {
  buildCinemasSearchBody,
  deleteCinema,
  searchCinemas,
  updateCinemaStatus,
} from '../../api/cinema'
import {
  CINEMA_STATUS_BADGE_CLASS,
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
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingCinemaId, setEditingCinemaId] = useState(null)
  const [viewingCinemaId, setViewingCinemaId] = useState(null)
  const [pendingDeleteCinema, setPendingDeleteCinema] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [statusUpdatingIds, setStatusUpdatingIds] = useState({})
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword, statusFilter])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const ac = new AbortController()

    const body = buildCinemasSearchBody({
      page,
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
      status: statusFilter,
    })

    ;(async () => {
      try {
        const data = await searchCinemas(body, { signal: ac.signal })
        if (cancelled) return
        setRows(data?.data || [])
        setTotalPages(data?.totalPages ?? 0)
        setTotalElements(data?.totalElements ?? 0)
        setHasNext(Boolean(data?.hasNext))
        setHasPrevious(Boolean(data?.hasPrevious))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách rạp')
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
  }, [page, debouncedKeyword, statusFilter, refreshTick, toast])

  const handleDeleteCinema = useCallback(async () => {
    const cinema = pendingDeleteCinema
    if (!cinema?.id) return

    try {
      setDeletingId(cinema.id)
      const data = await deleteCinema(cinema.id)
      toast.success(data?.message || 'Xóa rạp thành công')
      setPendingDeleteCinema(null)
      setRefreshTick((n) => n + 1)
    } catch (e) {
      toast.error(e?.message || 'Xóa rạp thất bại')
    } finally {
      setDeletingId('')
    }
  }, [pendingDeleteCinema, toast])

  const handleStatusChange = useCallback(
    async (cinema, nextStatus) => {
      if (!cinema?.id || !nextStatus || nextStatus === cinema.status) return

      const prevStatus = cinema.status
      setRows((items) =>
        items.map((item) =>
          item.id === cinema.id ? { ...item, status: nextStatus } : item,
        ),
      )
      setStatusUpdatingIds((ids) => ({ ...ids, [cinema.id]: true }))

      try {
        await updateCinemaStatus(cinema.id, nextStatus)
        toast.success('Cập nhật trạng thái rạp thành công')
      } catch (e) {
        setRows((items) =>
          items.map((item) =>
            item.id === cinema.id ? { ...item, status: prevStatus } : item,
          ),
        )
        toast.error(e?.message || 'Cập nhật trạng thái rạp thất bại')
      } finally {
        setStatusUpdatingIds((ids) => {
          const next = { ...ids }
          delete next[cinema.id]
          return next
        })
      }
    },
    [toast],
  )

  return (
    <>
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
                <th className="px-6 py-4 font-semibold text-sm text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
              {!loading &&
                rows.map((cinema) => {
                  const badgeClass =
                    CINEMA_STATUS_BADGE_CLASS[cinema.status] ||
                    'bg-slate-500/10 text-slate-500 border-slate-500/20'
                  return (
                    <tr
                      key={cinema.id || cinema.code}
                      className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors"
                      onClick={() => setViewingCinemaId(cinema.id)}
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
                      <td className="px-6 py-4 min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={cinema.status || ''}
                          disabled={Boolean(statusUpdatingIds[cinema.id])}
                          onChange={(e) => handleStatusChange(cinema, e.target.value)}
                          className={`rounded-full border px-3 py-1 text-xs font-bold outline-none transition disabled:cursor-wait disabled:opacity-60 ${badgeClass}`}
                        >
                          {CINEMA_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                            onClick={() => setEditingCinemaId(cinema.id)}
                          >
                            <Icon name="edit" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            onClick={() => setPendingDeleteCinema(cinema)}
                            disabled={deletingId === cinema.id}
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
              Đang tải danh sách rạp...
            </Text>
          )}
          {!loading && rows.length === 0 && (
            <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
              Không có rạp phù hợp.
            </Text>
          )}
          {!loading && rows.length > 0 && (
            <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
              {totalElements > 0
                ? `Hiển thị ${rows.length} / ${totalElements} rạp`
                : `Đang hiển thị ${rows.length} rạp`}
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

      <CinemaModal
        isOpen={createOpen}
        mode="create"
        onCancel={() => setCreateOpen(false)}
        onSubmitted={() => {
          setCreateOpen(false)
          setRefreshTick((n) => n + 1)
        }}
      />

      <CinemaModal
        isOpen={Boolean(editingCinemaId)}
        mode="edit"
        cinemaId={editingCinemaId}
        onCancel={() => setEditingCinemaId(null)}
        onSubmitted={() => {
          setEditingCinemaId(null)
          setRefreshTick((n) => n + 1)
        }}
      />

      <CinemaModal
        isOpen={Boolean(viewingCinemaId)}
        mode="view"
        cinemaId={viewingCinemaId}
        onCancel={() => setViewingCinemaId(null)}
      />
    </main>

      <ConfirmModal
        isOpen={Boolean(pendingDeleteCinema)}
        title="Xác nhận xóa rạp"
        message={`Bạn có chắc chắn muốn xóa rạp "${pendingDeleteCinema?.name || pendingDeleteCinema?.code || ''}"?`}
        onConfirm={handleDeleteCinema}
        onCancel={() => setPendingDeleteCinema(null)}
        disableConfirm={deletingId === pendingDeleteCinema?.id}
        closeOnOverlayClick={deletingId !== pendingDeleteCinema?.id}
      />
    </>
  )
}

export default CinemaManagement