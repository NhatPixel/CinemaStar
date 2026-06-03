import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  ConfirmModal,
  CustomSelect,
  Icon,
  Input,
  PagePagination,
  PromotionModal,
  Text,
  useToast,
} from '../../components'
import {
  buildPromotionsSearchBody,
  deletePromotion,
  searchPromotions,
} from '../../api/promotion'
import { formatCurrency } from '../booking/bookingData'
import {
  canWriteManagementOperations,
  isManagementOperationsReadOnly,
} from '../../constants/managementAccess'
import { readCurrentUserRole } from '../../constants/userRoleLabels'
import {
  PROMOTION_DISCOUNT_TYPE_LABEL_VI,
  PROMOTION_STATUS_BADGE_CLASS,
  PROMOTION_STATUS_LABEL_VI,
  PROMOTION_STATUS_OPTIONS,
} from '../../constants/promotionOptions'

const PAGE_SIZE = 12

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDiscount(row) {
  if (row.discountType === 'PERCENT') {
    return `${Number(row.discountValue || 0)}%`
  }
  return formatCurrency(Number(row.discountValue || 0))
}

function PromotionManagement() {
  const toast = useToast()
  const readOnly = isManagementOperationsReadOnly()
  const canWrite = canWriteManagementOperations(readCurrentUserRole())
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const statusFilterOptions = [{ value: 'all', label: 'Tất cả trạng thái' }, ...PROMOTION_STATUS_OPTIONS]

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
    const body = buildPromotionsSearchBody({
      page,
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
      status: statusFilter,
    })
    ;(async () => {
      try {
        const data = await searchPromotions(body, { signal: ac.signal })
        if (cancelled) return
        setRows(data?.data || [])
        setTotalPages(data?.totalPages ?? 0)
        setTotalElements(data?.totalElements ?? 0)
        setHasNext(Boolean(data?.hasNext))
        setHasPrevious(Boolean(data?.hasPrevious))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được mã giảm giá')
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

  const handleDelete = useCallback(async () => {
    const row = pendingDelete
    if (!row?.id) return
    try {
      setDeletingId(row.id)
      const data = await deletePromotion(row.id)
      toast.success(data?.message || 'Đã xóa mã giảm giá')
      setPendingDelete(null)
      setRefreshTick((n) => n + 1)
    } catch (e) {
      toast.error(e?.message || 'Xóa mã giảm giá thất bại')
    } finally {
      setDeletingId('')
    }
  }, [pendingDelete, toast])

  const closeModals = () => {
    setCreateOpen(false)
    setEditingId(null)
    setViewingId(null)
  }

  const handleSubmitted = (action) => {
    closeModals()
    if (action === 'create') {
      setPage(1)
    }
    setRefreshTick((n) => n + 1)
  }

  return (
    <>
      <main className="flex-1 min-w-0 p-6 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
              Quản lý mã giảm giá
            </Text>
            <Text variant="small" className="text-slate-500 dark:text-slate-400 mt-1">
              {readOnly
                ? 'Xem mã khuyến mãi theo phạm vi rạp được phân quyền'
                : 'Tạo và quản lý mã giảm giá cho đơn đặt vé'}
            </Text>
          </div>
          {canWrite ? (
            <Button
              type="button"
              variant="primary"
              className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30"
              onClick={() => setCreateOpen(true)}
            >
              <Icon name="add" />
              Tạo mã giảm giá
            </Button>
          ) : null}
        </header>

        <section className="bg-white dark:bg-primary/5 p-6 rounded-2xl border border-slate-200 dark:border-primary/20 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="promotionSearch"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo mã, tên..."
              icon="search"
            />
            <CustomSelect
              name="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusFilterOptions}
              placeholder="Trạng thái"
            />
          </div>
        </section>

        <div className="bg-white dark:bg-primary/5 rounded-2xl border border-slate-200 dark:border-primary/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-background-dark/30 border-b border-slate-200 dark:border-primary/20">
                  <th className="px-6 py-4 font-semibold text-sm">Mã</th>
                  <th className="px-6 py-4 font-semibold text-sm">Tên</th>
                  <th className="px-6 py-4 font-semibold text-sm">Giảm</th>
                  <th className="px-6 py-4 font-semibold text-sm">Hiệu lực</th>
                  <th className="px-6 py-4 font-semibold text-sm">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-sm">Phạm vi</th>
                  {!readOnly ? (
                    <th className="px-6 py-4 font-semibold text-sm text-center">Hành động</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
                {loading ? (
                  <tr>
                    <td colSpan={readOnly ? 6 : 7} className="px-6 py-8 text-center text-slate-500">
                      Đang tải...
                    </td>
                  </tr>
                ) : null}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={readOnly ? 6 : 7} className="px-6 py-8 text-center text-slate-500">
                      Không có mã giảm giá phù hợp.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? rows.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors"
                        onClick={() => setViewingId(row.id)}
                      >
                        <td className="px-6 py-4 font-mono font-semibold text-primary">{row.code}</td>
                        <td className="px-6 py-4 font-semibold">{row.name}</td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-primary">{formatDiscount(row)}</p>
                          <p className="text-xs text-slate-500">
                            {PROMOTION_DISCOUNT_TYPE_LABEL_VI[row.discountType] || row.discountType}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          <p>{formatDateTime(row.startAt)}</p>
                          <p>→ {formatDateTime(row.endAt)}</p>
                          {row.activeNow ? (
                            <span className="mt-1 inline-flex text-xs font-bold text-emerald-500">
                              Đang hiệu lực
                            </span>
                          ) : null}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                              PROMOTION_STATUS_BADGE_CLASS[row.status] || ''
                            }`}
                          >
                            {PROMOTION_STATUS_LABEL_VI[row.status] || row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {row.cinemaCount ?? row.cinemaIds?.length ?? 0} rạp ·{' '}
                          {(row.filmCount ?? row.filmIds?.length ?? 0) > 0
                            ? `${row.filmCount ?? row.filmIds?.length} phim`
                            : 'Tất cả phim'}
                        </td>
                        {!readOnly ? (
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg"
                                title="Chỉnh sửa"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingId(row.id)
                                }}
                              >
                                <Icon name="edit" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                                title="Xóa"
                                disabled={deletingId === row.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPendingDelete(row)
                                }}
                              >
                                <Icon name="delete" />
                              </Button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50 dark:bg-background-dark/30 border-t border-slate-200 dark:border-primary/20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!loading && rows.length > 0 && (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                {totalElements > 0
                  ? `Hiển thị ${rows.length} / ${totalElements} mã giảm giá`
                  : `Đang hiển thị ${rows.length} mã giảm giá`}
              </Text>
            )}
            <PagePagination
              page={page}
              totalPages={totalPages}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              loading={loading}
              onPageChange={setPage}
              className="self-end sm:self-auto"
            />
          </div>
        </div>
      </main>

      <PromotionModal
        isOpen={createOpen}
        mode="create"
        onCancel={closeModals}
        onSubmitted={handleSubmitted}
      />
      <PromotionModal
        isOpen={Boolean(editingId)}
        mode="edit"
        promotionId={editingId}
        onCancel={closeModals}
        onSubmitted={handleSubmitted}
      />
      <PromotionModal
        isOpen={Boolean(viewingId)}
        mode="view"
        promotionId={viewingId}
        onCancel={closeModals}
      />

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        title="Xóa mã giảm giá"
        message={`Xóa mã "${pendingDelete?.code}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        loading={Boolean(deletingId)}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}

export default PromotionManagement
