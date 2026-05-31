import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createBooking } from '../../api/booking'
import { createPaymentSession, previewPromotion } from '../../api/payment'
import { Button, Icon, Input, Text, useToast } from '../../components'
import BookingLayout from './BookingLayout'
import {
  BOOKING_DRAFT_STORAGE_KEY,
  BOOKING_RESULT_STORAGE_KEY,
  MOMO_PAYMENT_METHOD,
  MOVIE_FALLBACK,
  formatCurrency,
  formatShowtimeTime,
  getFilmPoster,
  getFilmTitle,
  readAuthRole,
  enrichBookingWithPaymentSession,
  readJsonStorage,
  removeJsonStorage,
  writeJsonStorage,
} from './bookingData'

function getCurrentUserDefaults() {
  try {
    const raw = localStorage.getItem('currentUser')
    const user = raw ? JSON.parse(raw) : null
    return {
      fullName: user?.fullName || user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    }
  } catch {
    return { fullName: '', email: '', phone: '' }
  }
}

function validateCustomerInfo(customerInfo) {
  const fullName = customerInfo.fullName.trim()
  const email = customerInfo.email.trim()
  const phone = customerInfo.phone.trim()
  if (!fullName || !email || !phone) {
    return 'Vui lòng nhập đầy đủ thông tin khách hàng'
  }
  return null
}

function buildCreateBookingPayload(draft, customerInfo) {
  const cinemaId = draft.cinema?.id || draft.showtime?.cinemaId || draft.hall?.cinemaId
  return {
    showtimeId: draft.showtime.id,
    cinemaId,
    customerInfo: {
      fullName: customerInfo.fullName.trim(),
      email: customerInfo.email.trim(),
      phone: customerInfo.phone.trim(),
    },
    seatItems: draft.seatItems,
    productItems: draft.productItems || [],
  }
}

function computePayTotals(draft, appliedPromotion) {
  const totals = draft?.totals || {}
  const subtotal = Number(
    totals.subtotal ?? Number(totals.ticketTotal || 0) + Number(totals.foodTotal || 0),
  )
  if (appliedPromotion?.finalAmount != null) {
    return {
      subtotal,
      promotionDiscount: Number(appliedPromotion.discountAmount || 0),
      total: Number(appliedPromotion.finalAmount),
    }
  }
  return {
    subtotal,
    promotionDiscount: Number(totals.promotionDiscount || 0),
    total: Number(totals.total ?? subtotal),
  }
}

function totalsFromPromotionPreview(draft, preview) {
  const base = draft?.totals || {}
  const subtotal = Number(
    base.subtotal ?? Number(base.ticketTotal || 0) + Number(base.foodTotal || 0),
  )
  const originalAmount = Number(preview?.originalAmount ?? subtotal)
  const promotionDiscount = Number(preview?.discountAmount || 0)
  const total = Number(preview?.finalAmount ?? Math.max(0, originalAmount - promotionDiscount))
  return {
    ...base,
    subtotal,
    promotionDiscount,
    total,
  }
}

function mergeDraftWithPromotion(draft, { promotionCode, appliedPromotion }) {
  const { subtotal, promotionDiscount, total } = computePayTotals(draft, appliedPromotion)
  return {
    ...draft,
    promotionCode: promotionCode ?? '',
    promotionPreview: appliedPromotion || null,
    totals: {
      ...draft.totals,
      subtotal,
      promotionDiscount,
      total,
    },
  }
}

function Payment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const filmId = searchParams.get('filmId')
  const [draft, setDraft] = useState(() => readJsonStorage(BOOKING_DRAFT_STORAGE_KEY))
  const [customerInfo, setCustomerInfo] = useState(() => getCurrentUserDefaults())
  const [promotionInput, setPromotionInput] = useState(() => {
    const stored = readJsonStorage(BOOKING_DRAFT_STORAGE_KEY)
    return String(stored?.promotionCode || '').trim()
  })
  const [appliedPromotion, setAppliedPromotion] = useState(null)
  const [pendingBooking, setPendingBooking] = useState(null)
  const [applyingPromotion, setApplyingPromotion] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Thanh Toán - CinemaStar'
  }, [])

  useEffect(() => {
    setDraft(readJsonStorage(BOOKING_DRAFT_STORAGE_KEY))
  }, [])

  const showtime = draft?.showtime
  const hall = draft?.hall
  const cinema = draft?.cinema
  const selectedSeats = draft?.selectedSeats || []
  const { promotionDiscount, total } = useMemo(
    () => computePayTotals(draft, appliedPromotion),
    [draft, appliedPromotion],
  )
  const appliedPromotionCode = String(appliedPromotion?.promotionCode || '').trim()
  const filmTitle = showtime ? getFilmTitle(showtime) : MOVIE_FALLBACK.title
  const poster = showtime ? getFilmPoster(showtime) : MOVIE_FALLBACK.poster
  const showtimeTime = formatShowtimeTime(showtime?.startDateTime)

  const persistDraft = useCallback(
    (nextApplied, code, previewAfterClear) => {
      if (!draft) return
      let nextDraft = mergeDraftWithPromotion(draft, {
        promotionCode: code ?? promotionInput.trim(),
        appliedPromotion: nextApplied,
      })
      if (previewAfterClear && !nextApplied) {
        nextDraft = {
          ...nextDraft,
          promotionCode: '',
          promotionPreview: null,
          totals: totalsFromPromotionPreview(draft, previewAfterClear),
        }
      }
      setDraft(nextDraft)
      writeJsonStorage(BOOKING_DRAFT_STORAGE_KEY, nextDraft)
    },
    [draft, promotionInput],
  )

  const updateCustomerInfo = (field, value) => {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }))
    setPendingBooking(null)
    setAppliedPromotion(null)
  }

  const ensurePendingBooking = useCallback(async () => {
    if (pendingBooking?.id) return pendingBooking
    const customerError = validateCustomerInfo(customerInfo)
    if (customerError) {
      throw { message: customerError }
    }
    const booking = await createBooking(buildCreateBookingPayload(draft, customerInfo))
    setPendingBooking(booking)
    return booking
  }, [customerInfo, draft, pendingBooking])

  const handleApplyPromotion = async () => {
    const code = promotionInput.trim()
    if (!code) {
      toast.error('Vui lòng nhập mã khuyến mãi')
      return
    }
    if (readAuthRole() !== 'CUSTOMER') {
      toast.error('Vui lòng đăng nhập tài khoản khách hàng để dùng mã khuyến mãi')
      navigate('/login', { state: { from: '/booking/payment' } })
      return
    }
    const customerError = validateCustomerInfo(customerInfo)
    if (customerError) {
      toast.error(customerError)
      return
    }

    setApplyingPromotion(true)
    try {
      let bookingId = pendingBooking?.id
      if (!bookingId) {
        const booking = await ensurePendingBooking()
        bookingId = booking.id
      }
      const preview = await previewPromotion({
        bookingId,
        promotionCode: code,
      })
      const discount = Number(preview?.discountAmount || 0)
      if (discount <= 0) {
        const note = String(preview?.note || '').trim()
        toast.error(note || 'Mã không áp dụng được cho đơn này')
        setAppliedPromotion(null)
        persistDraft(null, code)
        return
      }
      setAppliedPromotion(preview)
      setPromotionInput(preview?.promotionCode || code)
      persistDraft(preview, preview?.promotionCode || code)
      toast.success('Đã áp dụng mã khuyến mãi')
    } catch (e) {
      setAppliedPromotion(null)
      persistDraft(null, code)
      toast.error(e?.message || 'Không áp dụng được mã khuyến mãi')
    } finally {
      setApplyingPromotion(false)
    }
  }

  const handleClearPromotion = async () => {
    setPromotionInput('')
    setAppliedPromotion(null)

    const bookingId = pendingBooking?.id
    if (!bookingId) {
      persistDraft(null, '')
      return
    }

    setApplyingPromotion(true)
    try {
      const preview = await previewPromotion({ bookingId })
      persistDraft(null, '', preview)
    } catch (e) {
      persistDraft(null, '')
      toast.error(e?.message || 'Không cập nhật được tổng tiền')
    } finally {
      setApplyingPromotion(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (readAuthRole() !== 'CUSTOMER') {
      toast.error('Vui lòng đăng nhập tài khoản khách hàng để đặt vé')
      navigate('/login', { state: { from: '/booking/payment' } })
      return
    }
    if (!draft?.showtime?.id) {
      toast.error('Vui lòng chọn suất chiếu trước khi thanh toán')
      navigate('/booking/showtimes')
      return
    }
    if (!draft?.seatItems?.length) {
      toast.error('Vui lòng chọn ghế trước khi thanh toán')
      navigate(`/booking/seats?showtimeId=${draft.showtime.id}`)
      return
    }
    const customerError = validateCustomerInfo(customerInfo)
    if (customerError) {
      toast.error(customerError)
      return
    }
    const code = promotionInput.trim()
    if (code && !appliedPromotionCode) {
      toast.error('Vui lòng bấm «Áp dụng» mã khuyến mãi (cần tạo đơn giữ ghế trước)')
      return
    }

    setSubmitting(true)
    try {
      const booking = await ensurePendingBooking()
      const paymentSession = await createPaymentSession({
        bookingId: booking.id,
        promotionCode: appliedPromotionCode || undefined,
      })
      const bookingForResult = enrichBookingWithPaymentSession(booking, paymentSession, {
        promotionCode: appliedPromotionCode || code,
      })
      writeJsonStorage(BOOKING_RESULT_STORAGE_KEY, {
        booking: bookingForResult,
        paymentSession,
        context: mergeDraftWithPromotion(draft, {
          promotionCode: appliedPromotionCode || code,
          appliedPromotion,
        }),
        paymentMethod: MOMO_PAYMENT_METHOD.code,
      })
      removeJsonStorage(BOOKING_DRAFT_STORAGE_KEY)
      toast.success('Đặt vé thành công')
      navigate(`/booking/result?bookingId=${booking.id}`)
    } catch (e) {
      toast.error(e?.message || 'Đặt vé thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const aside = (
    <div className="rounded-3xl border border-primary/20 bg-[#120a1a] p-5 shadow-xl shadow-primary/10">
      <Text variant="h3" className="mb-5 text-xl font-black text-white">
        Chi tiết đơn hàng
      </Text>
      <div className="flex gap-4">
        <img alt={filmTitle} className="h-28 w-20 rounded-xl object-cover" src={poster} />
        <div>
          <p className="font-black text-white">{filmTitle}</p>
          <p className="mt-2 text-sm text-slate-400">{cinema?.name || 'Rạp chiếu'}</p>
          <p className="text-sm text-slate-400">
            {showtimeTime || '--:--'} · {hall?.name || 'Phòng chiếu'}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>Ghế</span>
          <span className="font-bold text-white">{selectedSeats.join(', ') || 'Chưa chọn'}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Tiền vé</span>
          <span>{formatCurrency(draft?.totals?.ticketTotal || 0)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Đồ ăn</span>
          <span>{formatCurrency(draft?.totals?.foodTotal || 0)}</span>
        </div>
        {appliedPromotionCode ? (
          <div className="flex justify-between text-slate-300">
            <span>Mã KM</span>
            <span className="font-bold text-white">{appliedPromotionCode}</span>
          </div>
        ) : null}
        {promotionDiscount > 0 ? (
          <div className="flex justify-between text-emerald-400">
            <span>Giảm giá</span>
            <span>−{formatCurrency(promotionDiscount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-white/10 pt-4 text-lg font-black text-white">
          <span>Cần thanh toán</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )

  return (
    <BookingLayout
      eyebrow="Bước 03"
      title="Thanh Toán"
      subtitle="Hoàn tất giao dịch trong thời gian giữ ghế. Sau khi thanh toán thành công, vé điện tử sẽ được gửi về tài khoản của bạn."
      aside={aside}
    >
      <div className="space-y-8">
        {!draft ? (
          <section className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-red-200 md:p-8">
            Chưa có thông tin đặt vé.{' '}
            <Link to="/booking/showtimes" className="font-bold text-primary hover:underline">
              Chọn suất chiếu
            </Link>
          </section>
        ) : null}

        <section className="rounded-3xl border border-primary/20 bg-[#120a1a] p-5 md:p-8">
          <div className="mb-8">
            <Text variant="h2" className="text-2xl font-black text-white">
              Thông tin khách hàng
            </Text>
            <p className="mt-2 text-sm text-slate-400">
              Hệ thống yêu cầu họ tên, email và số điện thoại để giữ ghế.
            </p>
          </div>
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <Input
              label="Họ và tên"
              value={customerInfo.fullName}
              onChange={(e) => updateCustomerInfo('fullName', e.target.value)}
              placeholder="Nguyen Van A"
              icon="person"
            />
            <Input
              label="Email"
              type="email"
              value={customerInfo.email}
              onChange={(e) => updateCustomerInfo('email', e.target.value)}
              placeholder="email@example.com"
              icon="mail"
            />
            <Input
              label="Số điện thoại"
              value={customerInfo.phone}
              onChange={(e) => updateCustomerInfo('phone', e.target.value)}
              placeholder="0900000000"
              icon="phone"
            />
          </div>

          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <Text variant="h2" className="text-2xl font-black text-white">
                Mã khuyến mãi
              </Text>
              <p className="mt-2 text-sm text-slate-400">
                Nhập thông tin khách hàng, bấm «Áp dụng» để tạo đơn giữ ghế và kiểm tra mã theo rạp/phim.
              </p>
            </div>
            <Icon name="sell" className="text-4xl text-primary" />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="paymentPromotionCode"
              className="ml-1 block text-sm font-medium text-slate-300"
            >
              Mã khuyến mãi
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <div className="relative min-w-0 flex-1">
                <Icon
                  name="sell"
                  className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-xl text-slate-500"
                />
                <input
                  id="paymentPromotionCode"
                  name="paymentPromotionCode"
                  type="text"
                  value={promotionInput}
                  onChange={(e) => {
                    setPromotionInput(e.target.value.toUpperCase())
                    setAppliedPromotion(null)
                  }}
                  placeholder="VD: SUMMER20"
                  disabled={applyingPromotion || submitting}
                  className="h-[50px] w-full rounded-lg border border-primary/20 bg-[rgba(25,16,34,0.5)] py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-[50px] min-w-[7.5rem] shrink-0 rounded-lg px-5 py-0 text-sm"
                  disabled={applyingPromotion || submitting || !promotionInput.trim()}
                  onClick={handleApplyPromotion}
                >
                  <Icon name="check_circle" />
                  {applyingPromotion ? 'Đang kiểm tra...' : 'Áp dụng'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-[50px] min-w-[7.5rem] shrink-0 rounded-lg px-5 py-0 text-sm"
                  disabled={
                    applyingPromotion ||
                    submitting ||
                    (!promotionInput.trim() && !appliedPromotionCode)
                  }
                  onClick={handleClearPromotion}
                >
                  <Icon name="close" />
                  {applyingPromotion ? 'Đang xử lý...' : 'Bỏ mã'}
                </Button>
              </div>
            </div>
          </div>
          <div className="mb-6 mt-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Text variant="h2" className="text-2xl font-black text-white">
                Phương thức thanh toán
              </Text>
              <p className="mt-2 text-sm text-slate-400">
                Thanh toán qua {MOMO_PAYMENT_METHOD.label}.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">
              <Icon name="timer" className="text-lg" />
              Giữ ghế sau khi đặt vé
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <Icon name={MOMO_PAYMENT_METHOD.icon} className="text-3xl" />
            </span>
            <div>
              <h3 className="text-lg font-black text-white">{MOMO_PAYMENT_METHOD.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{MOMO_PAYMENT_METHOD.description}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#120a1a] p-5 md:p-8">
          <div className="space-y-5">
            <Text variant="h2" className="text-2xl font-black text-white">
              {MOMO_PAYMENT_METHOD.label}
            </Text>
            <p className="text-slate-400">
              Sau khi xác nhận, hệ thống tạo phiên thanh toán và chuyển bạn tới trang kết quả để hoàn tất
              giao dịch.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Phương thức</p>
                <p className="mt-2 font-bold text-white">{MOMO_PAYMENT_METHOD.label}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Số tiền</p>
                <p className="mt-2 font-bold text-white">{formatCurrency(total)}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link
            to={
              showtime?.id
                ? `/booking/seats?showtimeId=${showtime.id}${filmId ? `&filmId=${filmId}` : ''}`
                : '/booking/seats'
            }
          >
            <Button variant="secondary" className="w-full rounded-full px-8 sm:w-auto">
              <Icon name="arrow_back" />
              Quay lại
            </Button>
          </Link>
          <Button
            className="w-full rounded-full px-8 sm:w-auto"
            disabled={submitting || !draft}
            onClick={handleConfirmPayment}
          >
            {submitting ? 'Đang đặt vé...' : 'Xác nhận thanh toán'}
            <Icon name="lock" />
          </Button>
        </div>
      </div>
    </BookingLayout>
  )
}

export default Payment
