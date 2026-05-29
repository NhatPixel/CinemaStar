/** Khớp BE: ShowTimeEnum.ShowTimeStatus */
export const SHOWTIME_STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Đã lên lịch' },
  { value: 'ONGOING', label: 'Đang chiếu' },
  { value: 'FINISHED', label: 'Đã kết thúc' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

export const SHOWTIME_STATUS_LABEL_VI = Object.fromEntries(
  SHOWTIME_STATUS_OPTIONS.map((opt) => [opt.value, opt.label]),
)

export const SHOWTIME_STATUS_BADGE_CLASS = {
  SCHEDULED: 'bg-green-500/10 text-green-500 border-green-500/20',
  ONGOING: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  FINISHED: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
}
