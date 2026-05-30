import { callApi, buildDelete, buildGet, buildPost, buildPut } from './config/client'
import { showtimePath } from './config/paths'

const PRICING_POLICIES_URL = showtimePath('pricing-policies')
const PRICING_POLICIES_SEARCH_URL = showtimePath('pricing-policies/search')
const pricingPolicyDetailUrl = (id) => showtimePath(`pricing-policies/${id}`)

/**
 * Body POST /showtimes/pricing-policies/search
 * BE PricingPolicyField: ID, NAME, CINEMA_ID, ...
 */
export function buildPricingPoliciesSearchBody({
  page = 1,
  size = 100,
  keyword,
  cinemaId,
} = {}) {
  const filterBy = []
  if (cinemaId) {
    filterBy.push({ field: 'CINEMA_ID', operator: 'EQ', value: cinemaId })
  }
  return {
    page,
    size,
    keyword: keyword?.trim() ?? '',
    filterBy,
    sortBy: [],
  }
}

/** POST /showtimes/pricing-policies/search */
export async function searchPricingPolicies(body, { signal } = {}) {
  const { url, options } = buildPost(PRICING_POLICIES_SEARCH_URL, body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được chính sách giá',
    raw: resp,
  }
}

/** Lấy toàn bộ policy visible (helper cho select/modal). */
export async function getPricingPolicies({ cinemaId, signal } = {}) {
  const data = await searchPricingPolicies(
    buildPricingPoliciesSearchBody({ page: 1, size: 200, cinemaId }),
    { signal },
  )
  return data?.data || []
}

/** GET /showtimes/pricing-policies/{id} */
export async function getPricingPolicyById(id, { signal } = {}) {
  const { url, options } = buildGet(pricingPolicyDetailUrl(id))
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được chính sách giá',
    raw: resp,
  }
}

export function buildPricingPolicyWritePayload({
  cinemaId,
  name,
  standardPrice,
  vipPrice,
  couplePrice,
}) {
  return {
    cinemaId,
    name: String(name || '').trim(),
    standardPrice: Number(standardPrice),
    vipPrice: Number(vipPrice),
    couplePrice: Number(couplePrice),
  }
}

/** POST /showtimes/pricing-policies */
export async function createPricingPolicy(payload) {
  const { url, options } = buildPost(PRICING_POLICIES_URL, payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể tạo chính sách giá',
    raw: resp,
  }
}

/** PUT /showtimes/pricing-policies/{id} */
export async function updatePricingPolicy(id, payload) {
  const { url, options } = buildPut(pricingPolicyDetailUrl(id), payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể cập nhật chính sách giá',
    raw: resp,
  }
}

/** DELETE /showtimes/pricing-policies/{id} */
export async function deletePricingPolicy(id) {
  const { url, options } = buildDelete(pricingPolicyDetailUrl(id))
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể xóa chính sách giá',
    raw: resp,
  }
}

/** BE: standardPrice < vipPrice < couplePrice */
export function validatePricingOrder(standardPrice, vipPrice, couplePrice) {
  const s = Number(standardPrice)
  const v = Number(vipPrice)
  const c = Number(couplePrice)
  if (![s, v, c].every((n) => Number.isFinite(n) && n >= 0)) {
    return 'Giá phải là số không âm'
  }
  if (!(s < v && v < c)) {
    return 'Giá phải thỏa: Standard < VIP < Couple'
  }
  return null
}
