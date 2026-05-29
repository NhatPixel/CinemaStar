/** Khớp booking-service ProductStatus */
export const PRODUCT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang bán' },
  { value: 'INACTIVE', label: 'Ngừng bán' },
  { value: 'OUT_OF_STOCK', label: 'Hết hàng' },
]

export const PRODUCT_STATUS_LABEL_VI = Object.fromEntries(
  PRODUCT_STATUS_OPTIONS.map((o) => [o.value, o.label]),
)

export const PRODUCT_STATUS_BADGE_CLASS = {
  ACTIVE: 'bg-green-500/10 text-green-500 border-green-500/20',
  INACTIVE: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  OUT_OF_STOCK: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
}

/** Khớp booking-service ProductType */
export const PRODUCT_TYPE_OPTIONS = [
  { value: 'POPCORN', label: 'Bắp' },
  { value: 'DRINK', label: 'Nước uống' },
  { value: 'COMBO', label: 'Combo' },
  { value: 'SNACK', label: 'Snack' },
]

export const PRODUCT_TYPE_LABEL_VI = Object.fromEntries(
  PRODUCT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
)
