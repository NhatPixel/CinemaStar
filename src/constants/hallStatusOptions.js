/** Khớp enum backend: HallEnum.HallStatus { ACTIVE, MAINTENANCE } */
export const HALL_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'MAINTENANCE', label: 'Bảo trì' },
]

export const HALL_STATUS_LABEL_VI = Object.fromEntries(
  HALL_STATUS_OPTIONS.map((opt) => [opt.value, opt.label]),
)

export const HALL_STATUS_BADGE_CLASS = {
  ACTIVE: 'bg-green-500/10 text-green-500 border-green-500/20',
  MAINTENANCE: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}

/** Khớp HallLayoutDefinitionRequest.CellInputType */
export const CELL_INPUT_TYPE = {
  SEAT: 'SEAT',
  AISLE: 'AISLE',
}

/** Khớp HallLayoutDefinitionRequest.SeatType */
export const SEAT_TYPE = {
  STANDARD: 'STANDARD',
  VIP: 'VIP',
  COUPLE: 'COUPLE',
}

export const SEAT_TYPE_OPTIONS = [
  { value: SEAT_TYPE.STANDARD, label: 'Ghế tiêu chuẩn' },
  { value: SEAT_TYPE.VIP, label: 'Ghế VIP' },
  { value: SEAT_TYPE.COUPLE, label: 'Ghế đôi' },
]

export const SEAT_TYPE_LABEL_VI = Object.fromEntries(
  SEAT_TYPE_OPTIONS.map((opt) => [opt.value, opt.label]),
)

/** Màu ô khi đã vẽ ghế */
export const SEAT_TYPE_CELL_CLASS = {
  STANDARD:
    'bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300',
  VIP: 'bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300',
  COUPLE: 'bg-pink-500/20 border-pink-500/50 text-pink-700 dark:text-pink-300',
}

/** Vị trí ô trong cặp ghế đôi (lưu trên cell map, không gửi API) */
export const COUPLE_CELL_SIDE = {
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
}

/** Bo góc / viền — hai ô COUPLE dính khối, cùng kích thước ô lưới */
export const COUPLE_CELL_JOIN_CLASS = {
  [COUPLE_CELL_SIDE.LEFT]:
    'rounded-l-md !rounded-r-none !border-r-0 z-[1] min-w-0 w-full max-w-full',
  [COUPLE_CELL_SIDE.RIGHT]:
    'rounded-r-md !rounded-l-none !border-l-0 z-[2] min-w-0 w-full max-w-full -translate-x-1',
}

/**
 * Hover cùng couple đã vẽ: một viền xanh bọc 2 ô (pseudo trên ô trái),
 * ô phải không ring — tránh 2 viền + vạch giữa.
 */
export const COUPLE_HOVER_RING_JOIN_CLASS = {
  [COUPLE_CELL_SIDE.LEFT]:
    "relative z-10 overflow-visible !rounded-r-none !ring-0 !ring-offset-0 after:pointer-events-none after:absolute after:-left-0.5 after:-top-0.5 after:z-30 after:h-[calc(100%+4px)] after:w-[calc(200%+4px)] after:rounded-lg after:shadow-[0_0_0_1.5px_rgba(115,17,212,0.7)] after:content-['']",

  [COUPLE_CELL_SIDE.RIGHT]:
    "relative z-[11] !rounded-l-none !ring-0 !ring-offset-0",
}

/** Cọ vẽ trên lưới (ERASER = xóa → ô trống, export AISLE) */
export const HALL_LAYOUT_BRUSH = {
  STANDARD: SEAT_TYPE.STANDARD,
  VIP: SEAT_TYPE.VIP,
  COUPLE: SEAT_TYPE.COUPLE,
  ERASER: 'ERASER',
}

export const HALL_LAYOUT_BRUSH_OPTIONS = [
  { value: HALL_LAYOUT_BRUSH.STANDARD, label: 'Ghế tiêu chuẩn', icon: 'event_seat' },
  { value: HALL_LAYOUT_BRUSH.VIP, label: 'Ghế VIP', icon: 'star' },
  { value: HALL_LAYOUT_BRUSH.COUPLE, label: 'Ghế đôi', icon: 'favorite' },
  { value: HALL_LAYOUT_BRUSH.ERASER, label: 'Xóa', icon: 'backspace' },
]
