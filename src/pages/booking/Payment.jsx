import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createBooking } from '../../api/booking'
import { Button, Icon, Input, Text, useToast } from '../../components'
import BookingLayout from './BookingLayout'
import {
  BOOKING_DRAFT_STORAGE_KEY,
  BOOKING_RESULT_STORAGE_KEY,
  MOVIE_FALLBACK,
  PAYMENT_METHODS,
  formatCurrency,
  formatShowtimeDate,
  formatShowtimeTime,
  getFilmPoster,
  getFilmTitle,
  readJsonStorage,
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

function Payment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const filmId = searchParams.get('filmId')
  const [method, setMethod] = useState('vietqr')
  const [draft, setDraft] = useState(() => readJsonStorage(BOOKING_DRAFT_STORAGE_KEY))
  const [customerInfo, setCustomerInfo] = useState(() => getCurrentUserDefaults())
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
  const combos = draft?.combos || []
  const totals = draft?.totals || { ticketTotal: 0, foodTotal: 0, total: 0 }
  const filmTitle = showtime ? getFilmTitle(showtime) : MOVIE_FALLBACK.title
  const poster = showtime ? getFilmPoster(showtime) : MOVIE_FALLBACK.poster
  const showtimeDate = formatShowtimeDate(showtime?.startDateTime)
  const showtimeTime = formatShowtimeTime(showtime?.startDateTime)

  const updateCustomerInfo = (field, value) => {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }))
  }

  const handleConfirmPayment = async () => {
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
    const fullName = customerInfo.fullName.trim()
    const email = customerInfo.email.trim()
    const phone = customerInfo.phone.trim()
    if (!fullName || !email || !phone) {
      toast.error('Vui lòng nhập đầy đủ thông tin khách hàng')
      return
    }

    setSubmitting(true)
    try {
      const booking = await createBooking({
        showtimeId: draft.showtime.id,
        cinemaId: draft.cinema?.id || draft.showtime?.cinemaId || draft.hall?.cinemaId,
        customerInfo: { fullName, email, phone },
        seatItems: draft.seatItems,
        productItems: draft.productItems || [],
      })
      writeJsonStorage(BOOKING_RESULT_STORAGE_KEY, {
        booking,
        context: draft,
        paymentMethod: method,
      })
      toast.success('Tạo booking thành công')
      navigate(`/booking/result?bookingId=${booking.id}`)
    } catch (e) {
      toast.error(e?.message || 'Tạo booking thất bại')
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
        <img
          alt={filmTitle}
          className="h-28 w-20 rounded-xl object-cover"
          src={poster}
        />
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
          <span>{formatCurrency(totals.ticketTotal)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Đồ ăn</span>
          <span>{formatCurrency(totals.foodTotal)}</span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-4 text-lg font-black text-white">
          <span>Cần thanh toán</span>
          <span className="text-primary">{formatCurrency(totals.total)}</span>
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
              Backend booking yêu cầu họ tên, email và số điện thoại để giữ ghế.
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

          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Text variant="h2" className="text-2xl font-black text-white">
                Phương thức thanh toán
              </Text>
              <p className="mt-2 text-sm text-slate-400">Chọn hình thức phù hợp để tiếp tục.</p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">
              <Icon name="timer" className="text-lg" />
              Giữ ghế sau khi tạo booking
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PAYMENT_METHODS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMethod(item.id)}
                className={`rounded-2xl border p-5 text-left transition ${
                  method === item.id
                    ? 'border-primary bg-primary/15 shadow-lg shadow-primary/10'
                    : 'border-white/10 bg-white/5 hover:border-primary/40'
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon name={item.icon} className="text-3xl" />
                  </span>
                  {method === item.id ? <Icon name="check_circle" className="text-primary" /> : null}
                </div>
                <h3 className="text-lg font-black text-white">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#120a1a] p-5 md:p-8">
          {method === 'vietqr' ? (
            <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-3xl bg-white p-5">
                <div className="grid aspect-square place-items-center rounded-2xl bg-[linear-gradient(135deg,#111827_25%,transparent_25%),linear-gradient(225deg,#111827_25%,transparent_25%),linear-gradient(45deg,#111827_25%,transparent_25%),linear-gradient(315deg,#111827_25%,#fff_25%)] bg-[length:28px_28px] bg-[position:14px_0,14px_0,0_0,0_0]">
                  <div className="rounded-xl bg-white px-4 py-2 text-sm font-black text-primary">
                    CinemaStar
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <Text variant="h2" className="text-2xl font-black text-white">
                  Quét mã QR để thanh toán
                </Text>
                <p className="text-slate-400">
                  Mở ứng dụng ngân hàng, chọn quét mã QR và kiểm tra đúng nội dung chuyển khoản trước khi xác nhận.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Ngân hàng</p>
                    <p className="mt-2 font-bold text-white">CinemaStar Bank</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Số tiền</p>
                    <p className="mt-2 font-bold text-white">{formatCurrency(totals.total)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4 sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Nội dung</p>
                    <p className="mt-2 font-mono text-sm font-bold text-white">
                      CINESTAR {selectedSeats.join('').replace(/\s/g, '') || 'BOOKING'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Tên chủ thẻ" placeholder="NGUYEN VAN A" icon="person" />
              <Input label="Số thẻ" placeholder="9704 0000 0000 0000" icon="credit_card" />
              <Input label="Ngày hết hạn" placeholder="MM/YY" icon="event" />
              <Input label="CVV" placeholder="***" icon="lock" />
            </div>
          )}
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
            {submitting ? 'Đang tạo booking...' : 'Xác nhận thanh toán'}
            <Icon name="lock" />
          </Button>
        </div>
      </div>
    </BookingLayout>
  )
}

export default Payment
