import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  ConfirmModal,
  CustomSelect,
  Icon,
  Input,
  ProductModal,
  Text,
  useToast,
} from '../../components'
import ProductThumbnail from '../../components/product/ProductThumbnail'
import { getManagementCinemas } from '../../api/cinema'
import { mapCinemasToSelectOptions } from '../../api/hall'
import {
  buildProductsSearchBody,
  deleteProduct,
  searchOperatorProducts,
  searchProductsByCinema,
} from '../../api/product'
import {
  PRODUCT_STATUS_BADGE_CLASS,
  PRODUCT_STATUS_LABEL_VI,
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_TYPE_LABEL_VI,
} from '../../constants/productOptions'
import { isManagementOperationsReadOnly } from '../../constants/managementAccess'
import { formatCurrency } from '../booking/bookingData'

const PAGE_SIZE = 12

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  ...PRODUCT_STATUS_OPTIONS,
]

function ProductManagement() {
  const toast = useToast()
  const readOnly = isManagementOperationsReadOnly()
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
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
  const [editingProductId, setEditingProductId] = useState(null)
  const [viewingProductId, setViewingProductId] = useState(null)
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState(null)
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
    let cancelled = false
    setLoading(true)
    const ac = new AbortController()

    const body = buildProductsSearchBody({
      page,
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
      status: statusFilter,
    })

    ;(async () => {
      try {
        const data = cinemaFilter
          ? await searchProductsByCinema(cinemaFilter, body, { signal: ac.signal })
          : await searchOperatorProducts(body, { signal: ac.signal })
        if (cancelled) return
        setRows(data?.data || [])
        setTotalPages(data?.totalPages ?? 0)
        setTotalElements(data?.totalElements ?? 0)
        setHasNext(Boolean(data?.hasNext))
        setHasPrevious(Boolean(data?.hasPrevious))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách sản phẩm')
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

  const displayRows = useMemo(() => {
    const q = debouncedKeyword.toLowerCase()
    return rows.filter((product) => {
      if (statusFilter !== 'all' && product.status !== statusFilter) return false
      if (q) {
        const text = `${product.name || ''} ${product.description || ''}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [rows, debouncedKeyword, statusFilter])

  const getCinemaName = useCallback(
    (product) => cinemaNameById[product?.cinemaId] || product?.cinemaId || '—',
    [cinemaNameById],
  )

  const handleDeleteProduct = useCallback(async () => {
    const product = pendingDeleteProduct
    if (!product?.id) return
    try {
      setDeletingId(product.id)
      const data = await deleteProduct(product.id)
      toast.success(data?.message || 'Xóa sản phẩm thành công')
      setPendingDeleteProduct(null)
      setRefreshTick((n) => n + 1)
    } catch (e) {
      toast.error(e?.message || 'Xóa sản phẩm thất bại')
    } finally {
      setDeletingId('')
    }
  }, [pendingDeleteProduct, toast])

  return (
    <>
      <main className="flex-1 min-w-0 p-6 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
              Quản lý sản phẩm
            </Text>
            <Text variant="small" className="text-slate-500 dark:text-slate-400 mt-1">
              Combo, bắp, nước và snack theo rạp bạn quản lý
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
              Tạo sản phẩm
            </Button>
          ) : null}
        </header>

        <section className="bg-white dark:bg-primary/5 p-6 rounded-2xl border border-slate-200 dark:border-primary/20 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              name="productSearch"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm tên, mô tả sản phẩm..."
              icon="search"
            />
            <CustomSelect
              name="cinemaFilter"
              value={cinemaFilter}
              onChange={(e) => setCinemaFilter(e.target.value)}
              options={cinemaOptions}
              placeholder="Tất cả rạp"
            />
            <CustomSelect
              name="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>
        </section>

        <div className="bg-white dark:bg-primary/5 rounded-2xl border border-slate-200 dark:border-primary/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-background-dark/30 border-b border-slate-200 dark:border-primary/20">
                  <th className="px-6 py-4 font-semibold text-sm w-16">Ảnh</th>
                  <th className="px-6 py-4 font-semibold text-sm">Tên</th>
                  <th className="px-6 py-4 font-semibold text-sm">Rạp</th>
                  <th className="px-6 py-4 font-semibold text-sm">Loại</th>
                  <th className="px-6 py-4 font-semibold text-sm">Giá</th>
                  <th className="px-6 py-4 font-semibold text-sm min-w-[130px]">Trạng thái</th>
                  {!readOnly ? (
                    <th className="px-6 py-4 font-semibold text-sm text-center">Hành động</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
                {loading ? (
                  <tr>
                    <td colSpan={readOnly ? 6 : 7} className="px-6 py-8 text-center text-slate-500">
                      Đang tải danh sách sản phẩm...
                    </td>
                  </tr>
                ) : null}
                {!loading && displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={readOnly ? 6 : 7} className="px-6 py-8 text-center text-slate-500">
                      Không có sản phẩm phù hợp.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? displayRows.map((product) => {
                      const badgeClass =
                        PRODUCT_STATUS_BADGE_CLASS[product.status] ||
                        'bg-slate-500/10 text-slate-500 border-slate-500/20'
                      return (
                        <tr
                          key={product.id}
                          className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors"
                          onClick={() => setViewingProductId(product.id)}
                        >
                          <td className="px-6 py-4">
                            <ProductThumbnail
                              imageUrl={product.imageUrl}
                              alt={product.name || 'Sản phẩm'}
                              type={product.type}
                              className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover dark:border-primary/20 dark:bg-slate-900/50"
                              iconClassName="text-xl text-slate-400"
                            />
                          </td>
                          <td className="px-6 py-4 font-semibold">{product.name || '—'}</td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                            {getCinemaName(product)}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                            {PRODUCT_TYPE_LABEL_VI[product.type] || product.type || '—'}
                          </td>
                          <td className="px-6 py-4 font-bold text-primary">
                            {formatCurrency(Number(product.price || 0))}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${badgeClass}`}
                            >
                              {PRODUCT_STATUS_LABEL_VI[product.status] || product.status}
                            </span>
                          </td>
                          {!readOnly ? (
                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg"
                                  onClick={() => setEditingProductId(product.id)}
                                >
                                  <Icon name="edit" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                                  onClick={() => setPendingDeleteProduct(product)}
                                  disabled={deletingId === product.id}
                                >
                                  <Icon name="delete" />
                                </Button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      )
                    })
                  : null}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50 dark:bg-background-dark/30 border-t border-slate-200 dark:border-primary/20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!loading && displayRows.length > 0 && (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                {totalElements > 0
                  ? `Hiển thị ${displayRows.length} / ${totalElements} sản phẩm`
                  : `Đang hiển thị ${displayRows.length} sản phẩm`}
              </Text>
            )}
            {!loading && totalPages > 1 && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!hasPrevious || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {'<'}
                </Button>
                <Text variant="small" className="text-sm text-slate-500">
                  Trang {page}
                  {totalPages > 0 ? ` / ${totalPages}` : ''}
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {'>'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <ProductModal
          isOpen={createOpen}
          mode="create"
          cinemaOptions={modalCinemaOptions}
          onCancel={() => setCreateOpen(false)}
          onSubmitted={() => {
            setCreateOpen(false)
            setRefreshTick((n) => n + 1)
          }}
        />

        <ProductModal
          isOpen={Boolean(editingProductId)}
          mode="edit"
          productId={editingProductId}
          cinemaOptions={modalCinemaOptions}
          onCancel={() => setEditingProductId(null)}
          onSubmitted={() => {
            setEditingProductId(null)
            setRefreshTick((n) => n + 1)
          }}
        />

        <ProductModal
          isOpen={Boolean(viewingProductId)}
          mode="view"
          productId={viewingProductId}
          cinemaOptions={modalCinemaOptions}
          onCancel={() => setViewingProductId(null)}
        />
      </main>

      <ConfirmModal
        isOpen={Boolean(pendingDeleteProduct)}
        title="Xác nhận xóa sản phẩm"
        message={`Bạn có chắc chắn muốn xóa "${pendingDeleteProduct?.name || ''}"?`}
        onConfirm={handleDeleteProduct}
        onCancel={() => setPendingDeleteProduct(null)}
        disableConfirm={deletingId === pendingDeleteProduct?.id}
        closeOnOverlayClick={deletingId !== pendingDeleteProduct?.id}
      />
    </>
  )
}

export default ProductManagement
