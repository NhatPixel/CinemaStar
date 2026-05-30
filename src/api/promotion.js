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
export function buildPromotionsSearchBody({ page = 1, size = 100, keyword, status } = {}) {
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

export function buildPromotionWritePayload({
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
}) {
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
  if (maxDiscountAmount !== '' && maxDiscountAmount != null) {
    payload.maxDiscountAmount = Number(maxDiscountAmount)
  }
  if (status) payload.status = status
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
