import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  CustomSelect,
  Icon,
  Input,
  PagePagination,
  SearchableMultiSelect,
  Text,
  useToast,
} from '../../components'
import { useCursorFilmOptions } from '../../hooks/useCursorFilmOptions'
import { usePagedCinemaOptions } from '../../hooks/usePagedCinemaOptions'
import {
  buildRevenueReportBody,
  downloadBlob,
  exportBookingCinemaRevenue,
  exportPaymentCinemaRevenue,
  searchBookingCinemaRevenue,
  searchPaymentCinemaRevenue,
} from '../../api/revenue'
import { formatCurrency } from '../booking/bookingData'
import { REVENUE_REPORT_TYPE_OPTIONS } from '../../constants/revenueReportOptions'
import { readCurrentUserRole } from '../../constants/userRoleLabels'

const PAGE_SIZE = 12
function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SummaryCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-primary/20 dark:bg-white/5">
      <p className="text-xs font-bold uppercase tracking-widest text-primary/70">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p> : null}
    </div>
  )
}

function RevenueStatistics() {
  const toast = useToast()
  const role = readCurrentUserRole()
  const isAdmin = role === 'ADMIN'

  const [reportType, setReportType] = useState('payment')
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [cinemaIds, setCinemaIds] = useState([])
  const [filmIds, setFilmIds] = useState([])
  const {
    options: cinemaOptions,
    loading: cinemaOptionsLoading,
    loadingMore: cinemaOptionsLoadingMore,
    hasMore: cinemaOptionsHasMore,
    onSearchChange: onCinemaSearchChange,
    onLoadMore: onCinemaLoadMore,
    mergeOption: mergeCinemaOption,
  } = usePagedCinemaOptions({ enabled: true })

  const {
    options: filmOptions,
    loading: filmOptionsLoading,
    loadingMore: filmOptionsLoadingMore,
    hasMore: filmOptionsHasMore,
    onSearchChange: onFilmSearchChange,
    onLoadMore: onFilmLoadMore,
    mergeOption: mergeFilmOption,
  } = useCursorFilmOptions({
    statusIn: ['NOW_SHOWING', 'COMING_SOON', 'ENDED'],
  })
  const [report, setReport] = useState(null)
  const [rows, setRows] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  const cinemaMultiOptions = cinemaOptions
  const filmMultiOptions = filmOptions

  useEffect(() => {
    for (const id of cinemaIds) {
      mergeCinemaOption(id)
    }
  }, [cinemaIds, mergeCinemaOption])

  useEffect(() => {
    for (const id of filmIds) {
      mergeFilmOption(id)
    }
  }, [filmIds, mergeFilmOption])

  const isPayment = reportType === 'payment'
  const totalSummary = report?.total
  const pageSummary = report?.page

  useEffect(() => {
    document.title = 'Thống kê doanh thu - CinemaStar'
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    setPage(1)
    setSelectedIds([])
  }, [debouncedKeyword, reportType, dateFrom, dateTo, cinemaIds, filmIds])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    setLoading(true)

    const body = buildRevenueReportBody({
      page,
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
      dateFrom,
      dateTo,
      cinemaIds,
      filmIds,
    })

    ;(async () => {
      try {
        const searchFn = isPayment ? searchPaymentCinemaRevenue : searchBookingCinemaRevenue
        const data = await searchFn(body, { signal: ac.signal })
        if (cancelled) return
        setReport(data)
        setRows(data?.items || [])
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được báo cáo')
        setReport(null)
        setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [page, debouncedKeyword, reportType, dateFrom, dateTo, cinemaIds, filmIds, refreshTick, isPayment, toast])

  const toggleSelect = (cinemaId) => {
    const id = String(cinemaId)
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const toggleSelectAll = () => {
    const ids = rows.map((r) => String(r.cinemaId)).filter(Boolean)
    if (ids.length && ids.every((id) => selectedIds.includes(id))) {
      setSelectedIds([])
    } else {
      setSelectedIds(ids)
    }
  }

  const handleExport = async (onlySelected) => {
    const body = buildRevenueReportBody({
      page: 1,
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
      dateFrom,
      dateTo,
      cinemaIds,
      filmIds,
      selectedIds: onlySelected && selectedIds.length ? selectedIds : undefined,
    })
    try {
      setExporting(true)
      const exportFn = isPayment ? exportPaymentCinemaRevenue : exportBookingCinemaRevenue
      const { blob, filename } = await exportFn(body)
      downloadBlob({ blob, filename })
      toast.success('Đã tải file báo cáo')
    } catch (e) {
      toast.error(e?.message || 'Xuất báo cáo thất bại')
    } finally {
      setExporting(false)
    }
  }

  const colSpan = isPayment ? 9 : 8

  return (
    <main className="min-w-0 flex-1 p-6 md:p-8">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
            Thống kê doanh thu
          </Text>
          <Text variant="small" className="mt-1 text-slate-500 dark:text-slate-400">
            {isAdmin
              ? 'Báo cáo theo rạp — toàn hệ thống (ADMIN).'
              : 'Báo cáo theo rạp được phân quyền (MANAGER).'}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={exporting || loading}
            onClick={() => handleExport(false)}
          >
            <Icon name="download" className="mr-1" />
            {exporting ? 'Đang xuất...' : 'Xuất Excel (theo lọc)'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={exporting || loading || selectedIds.length === 0}
            onClick={() => handleExport(true)}
          >
            <Icon name="download" className="mr-1" />
            {exporting ? 'Đang xuất...' : `Xuất đã chọn (${selectedIds.length})`}
          </Button>
        </div>
      </header>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-primary/20 dark:bg-primary/5">
        <div className="space-y-4">
          <Input
            name="revenueKeyword"
            label="Tìm kiếm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tên rạp, mã rạp..."
            icon="search"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CustomSelect
              label="Loại báo cáo"
              name="reportType"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={REVENUE_REPORT_TYPE_OPTIONS}
            />
            <div className="space-y-2">
              <label className="ml-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Từ ngày
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-primary/20 dark:bg-slate-900/50 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="ml-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Đến ngày
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-primary/20 dark:bg-slate-900/50 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SearchableMultiSelect
              label="Rạp"
              name="cinemaIds"
              values={cinemaIds}
              onChange={(e) => setCinemaIds(Array.isArray(e.target.value) ? e.target.value : [])}
              options={cinemaMultiOptions}
              placeholder="Tất cả rạp trong phạm vi"
              searchPlaceholder="Tìm rạp..."
              icon="location_on"
              serverSearch
              onSearchChange={onCinemaSearchChange}
              onLoadMore={onCinemaLoadMore}
              hasMore={cinemaOptionsHasMore}
              loading={cinemaOptionsLoading}
              loadingMore={cinemaOptionsLoadingMore}
            />
            <SearchableMultiSelect
              label="Phim"
              name="filmIds"
              values={filmIds}
              onChange={(e) => setFilmIds(Array.isArray(e.target.value) ? e.target.value : [])}
              options={filmMultiOptions}
              placeholder="Tất cả phim"
              searchPlaceholder="Tìm phim..."
              icon="movie"
              serverSearch
              onSearchChange={onFilmSearchChange}
              onLoadMore={onFilmLoadMore}
              hasMore={filmOptionsHasMore}
              loading={filmOptionsLoading}
              loadingMore={filmOptionsLoadingMore}
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setKeyword('')
                setDateFrom('')
                setDateTo('')
                setCinemaIds([])
                setFilmIds([])
                setPage(1)
                setSelectedIds([])
                setRefreshTick((n) => n + 1)
              }}
            >
              <Icon name="filter_alt_off" />
              Xóa bộ lọc
            </Button>
          </div>
        </div>
        {report?.from || report?.to ? (
          <p className="mt-4 text-xs text-slate-500">
            Kỳ báo cáo: {formatDateTime(report.from)} — {formatDateTime(report.to)}
            {report.generatedAt ? ` · Tạo lúc ${formatDateTime(report.generatedAt)}` : ''}
          </p>
        ) : null}
      </section>

      {totalSummary ? (
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isPayment ? (
            <>
              <SummaryCard
                label="Tổng giao dịch"
                value={totalSummary.totalTransactions ?? 0}
              />
              <SummaryCard
                label="Đã thanh toán"
                value={totalSummary.paidCount ?? 0}
                sub={formatCurrency(Number(totalSummary.paidAmount || 0))}
              />
              <SummaryCard
                label="Đã hoàn"
                value={totalSummary.refundedCount ?? 0}
                sub={formatCurrency(Number(totalSummary.refundedAmount || 0))}
              />
              <SummaryCard
                label="Thực thu (net)"
                value={formatCurrency(Number(totalSummary.netAmount || 0))}
              />
            </>
          ) : (
            <>
              <SummaryCard label="Tổng đơn" value={totalSummary.totalBookings ?? 0} />
              <SummaryCard label="Đã xác nhận" value={totalSummary.confirmedCount ?? 0} />
              <SummaryCard
                label="Doanh số"
                value={formatCurrency(Number(totalSummary.payableAmount || 0))}
              />
              <SummaryCard
                label="Trang hiện tại"
                value={formatCurrency(Number(pageSummary?.payableAmount || 0))}
                sub={`${rows.length} rạp`}
              />
            </>
          )}
        </section>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-primary/20 dark:bg-primary/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-primary/20 dark:bg-background-dark/30">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      rows.length > 0 &&
                      rows.every((r) => selectedIds.includes(String(r.cinemaId)))
                    }
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <th className="px-4 py-3 text-sm font-semibold">Rạp</th>
                {isPayment ? (
                  <>
                    <th className="px-4 py-3 text-sm font-semibold">Giao dịch</th>
                    <th className="px-4 py-3 text-sm font-semibold">Đã thanh toán</th>
                    <th className="px-4 py-3 text-sm font-semibold">Tiền hoàn</th>
                    <th className="px-4 py-3 text-sm font-semibold">Tiền vé</th>
                    <th className="px-4 py-3 text-sm font-semibold">Tiền sản phẩm</th>
                    <th className="px-4 py-3 text-sm font-semibold">Giảm khuyến mãi</th>
                    <th className="px-4 py-3 text-sm font-semibold">Thực thu</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-sm font-semibold">Đơn</th>
                    <th className="px-4 py-3 text-sm font-semibold">Chờ / Giữ</th>
                    <th className="px-4 py-3 text-sm font-semibold">Xác nhận</th>
                    <th className="px-4 py-3 text-sm font-semibold">Tiền vé</th>
                    <th className="px-4 py-3 text-sm font-semibold">Tiền sản phẩm</th>
                    <th className="px-4 py-3 text-sm font-semibold">Thanh toán</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-500">
                    Đang tải báo cáo...
                  </td>
                </tr>
              ) : null}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-500">
                    Không có dữ liệu phù hợp.
                  </td>
                </tr>
              ) : null}
              {!loading
                ? rows.map((row) => {
                    const id = String(row.cinemaId)
                    const checked = selectedIds.includes(id)
                    return (
                      <tr
                        key={id}
                        className={checked ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-primary/5'}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(id)}
                            aria-label={`Chọn ${row.cinemaName}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold">{row.cinemaName || '—'}</td>
                        {isPayment ? (
                          <>
                            <td className="px-4 py-3">{row.totalTransactions ?? 0}</td>
                            <td className="px-4 py-3">{row.paidCount ?? 0}</td>
                            <td className="px-4 py-3">{row.refundedCount ?? 0}</td>
                            <td className="px-4 py-3 text-sm">
                              {formatCurrency(Number(row.ticketSubtotalAmount || 0))}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatCurrency(Number(row.productSubtotalAmount || 0))}
                            </td>
                            <td className="px-4 py-3 text-sm text-emerald-600">
                              {formatCurrency(Number(row.promotionDiscountAmount || 0))}
                            </td>
                            <td className="px-4 py-3 font-bold text-primary">
                              {formatCurrency(Number(row.netAmount || 0))}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3">{row.totalBookings ?? 0}</td>
                            <td className="px-4 py-3">
                              {(row.pendingCount ?? 0) + (row.reservedCount ?? 0)}
                            </td>
                            <td className="px-4 py-3">{row.confirmedCount ?? 0}</td>
                            <td className="px-4 py-3 text-sm">
                              {formatCurrency(Number(row.ticketSubtotalAmount || 0))}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatCurrency(Number(row.productSubtotalAmount || 0))}
                            </td>
                            <td className="px-4 py-3 font-bold text-primary">
                              {formatCurrency(Number(row.payableAmount || 0))}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })
                : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-primary/20">
          {!loading && report ? (
            <Text variant="small" className="text-sm text-slate-500">
              {report.totalElements > 0
                ? `Hiển thị ${rows.length} / ${report.totalElements} rạp`
                : `Đang hiển thị ${rows.length} rạp`}
            </Text>
          ) : null}
          {report ? (
            <PagePagination
              page={report.currentPage || page}
              totalPages={report.totalPages}
              hasNext={report.hasNext}
              hasPrevious={report.hasPrevious}
              loading={loading}
              onPageChange={setPage}
              className="self-end sm:self-auto"
            />
          ) : null}
        </div>
      </div>
    </main>
  )
}

export default RevenueStatistics
