import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  ConfirmModal,
  CustomSelect,
  Icon,
  Input,
  PagePagination,
  PricingPolicyModal,
  Text,
  useToast,
} from '../../components'
import { getManagementCinemas } from '../../api/cinema'
import { deletePricingPolicy, searchPricingPolicies, buildPricingPoliciesSearchBody } from '../../api/pricingPolicy'
import { mapCinemasToSelectOptions } from '../../api/hall'
import { isManagementOperationsReadOnly } from '../../constants/managementAccess'
import { formatCurrency } from '../booking/bookingData'

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

function PricingPolicyManagement() {
  const toast = useToast()
  const readOnly = isManagementOperationsReadOnly()
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [cinemaFilter, setCinemaFilter] = useState('')
  const [cinemaOptions, setCinemaOptions] = useState([{ value: '', label: 'Tất cả rạp' }])
  const [modalCinemaOptions, setModalCinemaOptions] = useState([])
  const [cinemaNameById, setCinemaNameById] = useState({})
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingPolicyId, setEditingPolicyId] = useState(null)
  const [viewingPolicyId, setViewingPolicyId] = useState(null)
  const [pendingDeletePolicy, setPendingDeletePolicy] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    ;(async () => {
      try {
        const list = await getManagementCinemas({ signal: ac.signal })
        if (cancelled) return
        const nameMap = {}
        for (const c of list || []) {
          if (c?.id) nameMap[c.id] = c.name || c.code || c.id
        }
        setCinemaNameById(nameMap)
        setCinemaOptions(mapCinemasToSelectOptions(list, { includeAll: true }))
        setModalCinemaOptions(mapCinemasToSelectOptions(list, { includeAll: false }))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách rạp')
        setCinemaOptions([{ value: '', label: 'Tất cả rạp' }])
        setModalCinemaOptions([])
      }
    })()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [toast])

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword, cinemaFilter])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const ac = new AbortController()

    const body = buildPricingPoliciesSearchBody({
      page,
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
      cinemaId: cinemaFilter,
    })

    ;(async () => {
      try {
        const data = await searchPricingPolicies(body, { signal: ac.signal })
        if (cancelled) return
        setRows(data?.data || [])
        setTotalPages(data?.totalPages ?? 0)
        setTotalElements(data?.totalElements ?? 0)
        setHasNext(Boolean(data?.hasNext))
        setHasPrevious(Boolean(data?.hasPrevious))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được chính sách giá')
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
  }, [page, debouncedKeyword, cinemaFilter, refreshTick, toast])

  const displayRows = rows

  const handleDeletePolicy = useCallback(async () => {
    const policy = pendingDeletePolicy
    if (!policy?.id) return
    try {
      setDeletingId(policy.id)
      const data = await deletePricingPolicy(policy.id)
      toast.success(data?.message || 'Xóa chính sách giá thành công')
      setPendingDeletePolicy(null)
      setRefreshTick((n) => n + 1)
    } catch (e) {
      toast.error(e?.message || 'Xóa chính sách giá thất bại (có thể đang được suất chiếu sử dụng)')
    } finally {
      setDeletingId('')
    }
  }, [pendingDeletePolicy, toast])

  return (
    <>
      <main className="flex-1 min-w-0 p-6 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
              Quản lý chính sách giá
            </Text>
            <Text variant="small" className="text-slate-500 dark:text-slate-400 mt-1">
              Bảng giá ghế Standard, VIP, Couple theo từng rạp
            </Text>
          </div>
          {!readOnly ? (
            <Button
              type="button"
              variant="primary"
              className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30"
              onClick={() => setCreateOpen(true)}
              disabled={modalCinemaOptions.length === 0}
            >
              <Icon name="add" />
              Tạo chính sách giá
            </Button>
          ) : null}
        </header>

        <section className="bg-white dark:bg-primary/5 p-6 rounded-2xl border border-slate-200 dark:border-primary/20 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="policySearch"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên chính sách..."
              icon="search"
            />
            <CustomSelect
              name="cinemaFilter"
              value={cinemaFilter}
              onChange={(e) => setCinemaFilter(e.target.value)}
              options={cinemaOptions}
              placeholder="Tất cả rạp"
            />
          </div>
        </section>

        <div className="bg-white dark:bg-primary/5 rounded-2xl border border-slate-200 dark:border-primary/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-background-dark/30 border-b border-slate-200 dark:border-primary/20">
                  <th className="px-6 py-4 font-semibold text-sm">Tên</th>
                  <th className="px-6 py-4 font-semibold text-sm">Rạp</th>
                  <th className="px-6 py-4 font-semibold text-sm">Standard</th>
                  <th className="px-6 py-4 font-semibold text-sm">VIP</th>
                  <th className="px-6 py-4 font-semibold text-sm">Couple</th>
                  <th className="px-6 py-4 font-semibold text-sm">Ngày tạo</th>
                  {!readOnly ? (
                    <th className="px-6 py-4 font-semibold text-sm text-center">Hành động</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
                {loading ? (
                  <tr>
                    <td colSpan={readOnly ? 6 : 7} className="px-6 py-8 text-center text-slate-500">
                      Đang tải danh sách...
                    </td>
                  </tr>
                ) : null}
                {!loading && displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={readOnly ? 6 : 7} className="px-6 py-8 text-center text-slate-500">
                      Không có chính sách giá phù hợp.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? displayRows.map((policy) => (
                      <tr
                        key={policy.id}
                        className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors"
                        onClick={() => setViewingPolicyId(policy.id)}
                      >
                        <td className="px-6 py-4 font-semibold">{policy.name || '—'}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {cinemaNameById[policy.cinemaId] || policy.cinemaId || '—'}
                        </td>
                        <td className="px-6 py-4 text-primary font-medium">
                          {formatCurrency(Number(policy.standardPrice || 0))}
                        </td>
                        <td className="px-6 py-4 text-primary font-medium">
                          {formatCurrency(Number(policy.vipPrice || 0))}
                        </td>
                        <td className="px-6 py-4 text-primary font-medium">
                          {formatCurrency(Number(policy.couplePrice || 0))}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                          {formatDateTime(policy.timeCreated)}
                        </td>
                        {!readOnly ? (
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg"
                                onClick={() => setEditingPolicyId(policy.id)}
                              >
                                <Icon name="edit" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                                onClick={() => setPendingDeletePolicy(policy)}
                                disabled={deletingId === policy.id}
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

          {!loading && displayRows.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-primary/20 bg-slate-50 dark:bg-background-dark/30">
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                {totalElements > 0
                  ? `Hiển thị ${displayRows.length} / ${totalElements} chính sách giá`
                  : `Hiển thị ${displayRows.length} chính sách giá`}
              </Text>
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
          )}
        </div>

        <PricingPolicyModal
          isOpen={createOpen}
          mode="create"
          cinemaOptions={modalCinemaOptions}
          cinemaNameById={cinemaNameById}
          onCancel={() => setCreateOpen(false)}
          onSubmitted={() => {
            setCreateOpen(false)
            setRefreshTick((n) => n + 1)
          }}
        />

        <PricingPolicyModal
          isOpen={Boolean(editingPolicyId)}
          mode="edit"
          policyId={editingPolicyId}
          cinemaOptions={modalCinemaOptions}
          cinemaNameById={cinemaNameById}
          onCancel={() => setEditingPolicyId(null)}
          onSubmitted={() => {
            setEditingPolicyId(null)
            setRefreshTick((n) => n + 1)
          }}
        />

        <PricingPolicyModal
          isOpen={Boolean(viewingPolicyId)}
          mode="view"
          policyId={viewingPolicyId}
          cinemaOptions={modalCinemaOptions}
          cinemaNameById={cinemaNameById}
          onCancel={() => setViewingPolicyId(null)}
        />
      </main>

      <ConfirmModal
        isOpen={Boolean(pendingDeletePolicy)}
        title="Xác nhận xóa chính sách giá"
        message={`Bạn có chắc muốn xóa "${pendingDeletePolicy?.name || ''}"? Không xóa được nếu đang gắn suất chiếu.`}
        onConfirm={handleDeletePolicy}
        onCancel={() => setPendingDeletePolicy(null)}
        disableConfirm={deletingId === pendingDeletePolicy?.id}
        closeOnOverlayClick={deletingId !== pendingDeletePolicy?.id}
      />
    </>
  )
}

export default PricingPolicyManagement
