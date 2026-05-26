/** Trạng thái suất chiếu */
export const SHOWTIME_STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Đã lên lịch' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
]

export const SHOWTIME_STATUS_LABEL_VI = Object.fromEntries(
  SHOWTIME_STATUS_OPTIONS.map((opt) => [opt.value, opt.label]),
)

export const SHOWTIME_STATUS_BADGE_CLASS = {
  SCHEDULED: 'bg-green-500/10 text-green-500 border-green-500/20',
  CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
  COMPLETED: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
}
