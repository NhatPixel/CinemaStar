import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  CustomSelect,
  Input,
  PagePagination,
  SearchableSelect,
  Text,
  useToast,
} from '../../components'
import { buildOperatorBookingsSearchBody, searchOperatorBookingsByListType } from '../../api/booking'
import { useCursorFilmOptions } from '../../hooks/useCursorFilmOptions'
import { usePagedCinemaOptions } from '../../hooks/usePagedCinemaOptions'
import {
  BOOKING_STATUS_BADGE_CLASS,
  BOOKING_STATUS_LABEL_VI,
  PAYMENT_STATUS_BADGE_CLASS,
  PAYMENT_STATUS_LABEL_VI,
} from '../../constants/bookingStatusOptions'
import { isManagementOperationsReadOnly } from '../../constants/managementAccess'
import { OPERATOR_BOOKING_LIST_OPTIONS } from '../../constants/operatorBookingListOptions'
import { formatCurrency, getBookingPayableAmount } from './bookingData'

const PAGE_SIZE = 12

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatShowtimeRange(booking) {
  const start = booking?.showtimeStartDateTime
  const end = booking?.showtimeEndDateTime
  if (!start && !end) return '—'
  if (start && end) return `${formatDateTime(start)} → ${formatDateTime(end)}`
  return formatDateTime(start || end)
}

function shortId(id) {
  if (!id) return '—'
  return String(id).slice(0, 8).toUpperCase()
}

function seatsText(booking) {
  const seats = booking?.seatItems?.map((seat) => seat.seatCode).filter(Boolean) || []
  return seats.length ? seats.join(', ') : '—'
}

function productsText(booking) {
  const items = booking?.productItems || []
  if (!items.length) return '—'
  return items
    .map((item) => {
      const name = item.productNameSnapshot || item.productName || 'Sản phẩm'
      const qty = item.quantity ?? 1
      return `${name} ×${qty}`
    })
    .join(', ')
}

function BookingManagement() {
  const toast = useToast()
  const navigate = useNavigate()
  const readOnly = isManagementOperationsReadOnly()

  const [rows, setRows] = useState([])
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [listType, setListType] = useState('purchased')
  const [cinemaId, setCinemaId] = useState('')
  const [showDate, setShowDate] = useState('')
  const [filmId, setFilmId] = useState('')

  const {
    options: cinemaSelectOptions,
    loading: cinemaOptionsLoading,
    loadingMore: cinemaOptionsLoadingMore,
    hasMore: cinemaOptionsHasMore,
    onSearchChange: onCinemaSearchChange,
    onLoadMore: onCinemaLoadMore,
  } = usePagedCinemaOptions({ includeAll: true, allLabel: 'Tất cả rạp' })

  const {
    options: filmOptions,
    loading: filmOptionsLoading,
    loadingMore: filmOptionsLoadingMore,
    hasMore: filmOptionsHasMore,
    onSearchChange: onFilmSearchChange,
    onLoadMore: onFilmLoadMore,
  } = useCursorFilmOptions({
    statusIn: ['NOW_SHOWING', 'COMING_SOON', 'ENDED'],
  })

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)

  const selectedFilmTitle = useMemo(() => {
    if (!filmId) return ''
    const match = filmOptions.find((opt) => String(opt.value) === String(filmId))
    return match?.label || ''
  }, [filmId, filmOptions])

  useEffect(() => {
    document.title = 'Quản lý đơn đặt vé - CinemaStar'
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword, listType, cinemaId, showDate, filmId])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    setLoading(true)

    const body = buildOperatorBookingsSearchBody({
      page,
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
      cinemaId: cinemaId || undefined,
      showDate: showDate || undefined,
      filmTitle: selectedFilmTitle || undefined,
    })

    ;(async () => {
      try {
        const data = await searchOperatorBookingsByListType(listType, body, {
          signal: ac.signal,
        })
        if (cancelled) return
        setRows(data?.data || [])
        setTotalPages(data?.totalPages ?? 0)
        setTotalElements(data?.totalElements ?? 0)
        setHasNext(Boolean(data?.hasNext))
        setHasPrevious(Boolean(data?.hasPrevious))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách đơn đặt vé')
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
  }, [
    page,
    debouncedKeyword,
    listType,
    cinemaId,
    showDate,
    selectedFilmTitle,
    refreshTick,
    toast,
  ])

  const colSpan = 13

  return (
    <main className="min-w-0 flex-1 p-6 md:p-8">
      <header className="mb-8">
        <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
          Quản lý đơn đặt vé
        </Text>
        <Text variant="small" className="mt-1 text-slate-500 dark:text-slate-400">
          {readOnly
            ? 'Theo dõi đơn đã thanh toán / chưa thanh toán theo rạp được phân quyền (chỉ xem).'
            : 'Lọc theo rạp, ngày chiếu và phim.'}
        </Text>
      </header>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-primary/20 dark:bg-primary/5">
        <div className="space-y-4">
          <Input
            name="bookingSearch"
            label="Tìm kiếm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Mã đơn, khách hàng, SĐT, tên phim..."
            icon="search"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CustomSelect
              name="listType"
              label="Loại danh sách"
              value={listType}
              onChange={(e) => setListType(e.target.value)}
              options={OPERATOR_BOOKING_LIST_OPTIONS}
            />
            <SearchableSelect
              label="Rạp"
              name="cinemaId"
              value={cinemaId}
              onChange={(e) => setCinemaId(e.target.value)}
              options={cinemaSelectOptions}
              placeholder="Tất cả rạp"
              searchPlaceholder="Tìm rạp"
              icon="location_on"
              serverSearch
              onSearchChange={onCinemaSearchChange}
              onLoadMore={onCinemaLoadMore}
              hasMore={cinemaOptionsHasMore}
              loading={cinemaOptionsLoading}
              loadingMore={cinemaOptionsLoadingMore}
            />
            <div className="space-y-2">
              <label className="ml-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Ngày chiếu
              </label>
              <input
                name="showDate"
                type="date"
                value={showDate}
                onChange={(e) => setShowDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-primary/20 dark:bg-slate-900/50 dark:text-white"
              />
            </div>
            <SearchableSelect
              label="Phim"
              name="filmId"
              value={filmId}
              onChange={(e) => setFilmId(e.target.value)}
              options={[{ value: '', label: 'Tất cả phim' }, ...filmOptions]}
              placeholder="Tất cả phim"
              searchPlaceholder="Tìm phim"
              icon="movie"
              serverSearch
              onSearchChange={onFilmSearchChange}
              onLoadMore={onFilmLoadMore}
              hasMore={filmOptionsHasMore}
              loading={filmOptionsLoading}
              loadingMore={filmOptionsLoadingMore}
            />
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-primary/20 dark:bg-primary/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-primary/20 dark:bg-background-dark/30">
                <th className="px-4 py-3 text-sm font-semibold">Mã đơn</th>
                <th className="px-4 py-3 text-sm font-semibold">Rạp</th>
                <th className="px-4 py-3 text-sm font-semibold">Phim</th>
                <th className="px-4 py-3 text-sm font-semibold min-w-[160px]">Suất chiếu</th>
                <th className="px-4 py-3 text-sm font-semibold">Khách hàng</th>
                <th className="px-4 py-3 text-sm font-semibold">Ghế</th>
                <th className="px-4 py-3 text-sm font-semibold min-w-[120px]">Đồ ăn / combo</th>
                <th className="px-4 py-3 text-sm font-semibold min-w-[100px]">Giảm giá</th>
                <th className="px-4 py-3 text-sm font-semibold min-w-[120px]">Số tiền</th>
                <th className="px-4 py-3 text-sm font-semibold min-w-[140px]">Đặt vé</th>
                <th className="px-4 py-3 text-sm font-semibold min-w-[140px]">Thanh toán</th>
                <th className="px-4 py-3 text-sm font-semibold">Giữ đến</th>
                <th className="px-4 py-3 text-sm font-semibold">Tạo lúc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-primary/10">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={colSpan}>
                    Đang tải danh sách đơn đặt vé...
                  </td>
                </tr>
              ) : null}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={colSpan}>
                    Không có đơn đặt vé phù hợp.
                  </td>
                </tr>
              ) : null}
              {!loading
                ? rows.map((booking) => (
                    <tr
                      key={booking.id}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-primary/5"
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-sm font-bold">{shortId(booking.id)}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {booking.cinemaName || shortId(booking.cinemaId)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{booking.filmTitle || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {formatShowtimeRange(booking)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm font-semibold">
                          {booking.customerInfo?.fullName || '—'}
                        </p>
                        <p className="text-xs text-slate-500">{booking.customerInfo?.phone || '—'}</p>
                        {booking.customerInfo?.email ? (
                          <p className="text-xs text-slate-500">{booking.customerInfo.email}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm">{seatsText(booking)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {productsText(booking)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {Number(booking.promotionDiscountAmount || 0) > 0 ? (
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                            −{formatCurrency(Number(booking.promotionDiscountAmount))}
                          </p>
                        ) : (
                          <p className="text-slate-500">—</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p className="font-bold text-primary">
                          {formatCurrency(getBookingPayableAmount(booking))}
                        </p>
                        <p className="text-xs text-slate-500">
                          Vé: {formatCurrency(Number(booking.ticketSubtotal || 0))}
                        </p>
                        <p className="text-xs text-slate-500">
                          Đồ: {formatCurrency(Number(booking.productSubtotal || 0))}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                            BOOKING_STATUS_BADGE_CLASS[booking.bookingStatus] || ''
                          }`}
                        >
                          {BOOKING_STATUS_LABEL_VI[booking.bookingStatus] || booking.bookingStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                            PAYMENT_STATUS_BADGE_CLASS[booking.paymentStatus] || ''
                          }`}
                        >
                          {PAYMENT_STATUS_LABEL_VI[booking.paymentStatus] || booking.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDateTime(booking.reservedUntil)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDateTime(booking.timeCreated)}
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-primary/20">
          {!loading && rows.length > 0 && (
            <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
              {totalElements > 0
                ? `Hiển thị ${rows.length} / ${totalElements} đơn · ${
                    listType === 'purchased' ? 'Đã thanh toán' : 'Chưa thanh toán'
                  }`
                : `Đang hiển thị ${rows.length} đơn`}
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
  )
}

export default BookingManagement
