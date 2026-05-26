export const BOOKING_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Đang chờ' },
  { value: 'RESERVED', label: 'Đã giữ ghế' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'EXPIRED', label: 'Hết hạn' },
]

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'UNPAID', label: 'Chưa thanh toán' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
]

export const BOOKING_STATUS_LABEL_VI = Object.fromEntries(
  BOOKING_STATUS_OPTIONS.map((opt) => [opt.value, opt.label]),
)

export const PAYMENT_STATUS_LABEL_VI = Object.fromEntries(
  PAYMENT_STATUS_OPTIONS.map((opt) => [opt.value, opt.label]),
)

export const BOOKING_STATUS_BADGE_CLASS = {
  PENDING: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
  RESERVED: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  CONFIRMED: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  CANCELLED: 'border-red-500/20 bg-red-500/10 text-red-300',
  EXPIRED: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300',
}

export const PAYMENT_STATUS_BADGE_CLASS = {
  UNPAID: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  PAID: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  FAILED: 'border-red-500/20 bg-red-500/10 text-red-300',
  REFUNDED: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
}
