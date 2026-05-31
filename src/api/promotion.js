import { callApi, buildDelete, buildGet, buildPost, buildPut } from './config/client'
import { promotionPath } from './config/paths'

const PROMOTIONS_URL = promotionPath('')
const PROMOTIONS_SEARCH_URL = promotionPath('search')
const promotionDetailUrl = (id) => promotionPath(id)

function normalizeApiDateTime(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return `${raw}:00`
  return raw
}

/**
 * Body POST /promotions/search
 * BE PromotionField: CODE, NAME, STATUS, DISCOUNT_TYPE, ...
 */
export function buildPromotionsSearchBody({ page = 1, size = 12, keyword, status } = {}) {
  const filterBy = []
  if (status && status !== 'all') {
    filterBy.push({ field: 'STATUS', operator: 'EQ', value: status })
  }
  return {
    page,
    size,
    keyword: keyword?.trim() ?? '',
    filterBy,
    sortBy: [{ field: 'TIME_CREATED', direction: 'DESC' }],
  }
}

export function validatePromotionForm(form) {
  if (!String(form?.code || '').trim()) return 'Vui lòng nhập mã khuyến mãi'
  if (!String(form?.name || '').trim()) return 'Vui lòng nhập tên chương trình'
  if (!form?.discountValue || Number(form.discountValue) <= 0) return 'Giá trị giảm không hợp lệ'
  if (form.discountType === 'PERCENT' && Number(form.discountValue) > 100) {
    return 'Giảm % tối đa 100'
  }
  if (!form?.startAt || !form?.endAt) return 'Vui lòng chọn thời gian hiệu lực'
  if (form.startAt >= form.endAt) return 'Ngày kết thúc phải sau ngày bắt đầu'
  if (!form?.cinemaIds?.length) return 'Chọn ít nhất một rạp áp dụng'
  return null
}

export function buildPromotionWritePayload(
  {
    code,
    name,
    description,
    discountType,
    discountValue,
    minOrderAmount,
    maxDiscountAmount,
    startAt,
    endAt,
    status,
    cinemaIds,
    filmIds,
  },
  { forCreate = false } = {},
) {
  const payload = {
    code: String(code || '').trim(),
    name: String(name || '').trim(),
    description: String(description || '').trim() || undefined,
    discountType,
    discountValue: Number(discountValue),
    startAt: normalizeApiDateTime(startAt),
    endAt: normalizeApiDateTime(endAt),
    cinemaIds: Array.isArray(cinemaIds) ? cinemaIds.filter(Boolean) : [],
    filmIds: Array.isArray(filmIds) ? filmIds.filter(Boolean) : [],
  }
  if (minOrderAmount !== '' && minOrderAmount != null) {
    payload.minOrderAmount = Number(minOrderAmount)
  }
  if (
    discountType === 'PERCENT' &&
    maxDiscountAmount !== '' &&
    maxDiscountAmount != null
  ) {
    payload.maxDiscountAmount = Number(maxDiscountAmount)
  }
  if (!forCreate && status) payload.status = status
  return payload
}

/** POST /promotions/search */
export async function searchPromotions(body, { signal } = {}) {
  const { url, options } = buildPost(PROMOTIONS_SEARCH_URL, body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) return resp.data
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được danh sách mã giảm giá',
    raw: resp,
  }
}

/** GET /promotions/{id} */
export async function getPromotionById(id, { signal } = {}) {
  const { url, options } = buildGet(promotionDetailUrl(id))
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) return resp.data
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được mã giảm giá',
    raw: resp,
  }
}

/** POST /promotions */
export async function createPromotion(payload) {
  const { url, options } = buildPost(PROMOTIONS_URL, payload)
  const resp = await callApi({ url, options })
  if (resp?.success) return resp.data
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể tạo mã giảm giá',
    raw: resp,
  }
}

/** PUT /promotions/{id} */
export async function updatePromotion(id, payload) {
  const { url, options } = buildPut(promotionDetailUrl(id), payload)
  const resp = await callApi({ url, options })
  if (resp?.success) return resp.data
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể cập nhật mã giảm giá',
    raw: resp,
  }
}

/** DELETE /promotions/{id} */
export async function deletePromotion(id) {
  const { url, options } = buildDelete(promotionDetailUrl(id))
  const resp = await callApi({ url, options })
  if (resp?.success) return resp.data
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể xóa mã giảm giá',
    raw: resp,
  }
}
