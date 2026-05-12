/** Khớp enum backend: CinemaStatus { ACTIVE, INACTIVE, MAINTENANCE } */
export const CINEMA_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
  { value: 'MAINTENANCE', label: 'Bảo trì' },
]

export const CINEMA_STATUS_LABEL_VI = Object.fromEntries(
  CINEMA_STATUS_OPTIONS.map((opt) => [opt.value, opt.label]),
)

/** Tailwind class cho badge trạng thái rạp */
export const CINEMA_STATUS_BADGE_CLASS = {
  ACTIVE: 'bg-green-500/10 text-green-500 border-green-500/20',
  INACTIVE: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  MAINTENANCE: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}
