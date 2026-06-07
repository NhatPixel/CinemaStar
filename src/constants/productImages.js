/**
 * Ảnh mặc định theo loại / tên (URL công khai, dùng khi sản phẩm chưa có imageUrl).
 */
export const PRODUCT_TYPE_IMAGE_URL = {
  COMBO:
    'https://cellphones.com.vn/sforum/wp-content/uploads/2023/07/gia-bap-nuoc-cgv-1.jpg',
  POPCORN:
    'https://cellphones.com.vn/sforum/wp-content/uploads/2022/12/Cover-bap-CGV.jpg',
  DRINK:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Pepsi_can.jpg/640px-Pepsi_can.jpg',
  SNACK:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Frankfurter_Wuerstchen.jpg/640px-Frankfurter_Wuerstchen.jpg',
}

/** Gợi ý theo từ khóa trong tên (ưu tiên hơn loại) */
const NAME_IMAGE_RULES = [
  {
    test: (n) => /combo/i.test(n),
    url: PRODUCT_TYPE_IMAGE_URL.COMBO,
  },
  {
    test: (n) => /bắp|bap|popcorn/i.test(n),
    url: PRODUCT_TYPE_IMAGE_URL.POPCORN,
  },
  {
    test: (n) =>
      /coca|pepsi|nước|nuoc|trà|tra |cà phê|ca phe|red bull|suối|suoi|drink/i.test(n),
    url: PRODUCT_TYPE_IMAGE_URL.DRINK,
  },
  {
    test: (n) => /hot dog|khoai|sandwich|kẹo|keo|bánh|banh|snack|xúc xích|xuc xich/i.test(n),
    url: PRODUCT_TYPE_IMAGE_URL.SNACK,
  },
]

/**
 * @param {{ imageUrl?: string, type?: string, name?: string }} product
 * @returns {string}
 */
export function resolveProductImageUrl({ imageUrl, type, name } = {}) {
  const direct = String(imageUrl || '').trim()
  if (direct) return direct

  const n = String(name || '').toLowerCase()
  for (const rule of NAME_IMAGE_RULES) {
    if (rule.test(n)) return rule.url
  }

  const t = String(type || '').toUpperCase()
  return PRODUCT_TYPE_IMAGE_URL[t] || PRODUCT_TYPE_IMAGE_URL.COMBO
}

/** Gợi ý URL khi tạo/sửa theo loại */
export function suggestProductImageUrl(type, name) {
  return resolveProductImageUrl({ type, name })
}
