import { callApi, buildDelete, buildGet, buildPost, buildPut } from './config/client'
import { showtimePath } from './config/paths'

const PRICING_POLICIES_URL = showtimePath('pricing-policies')
const pricingPolicyDetailUrl = (id) => showtimePath(`pricing-policies/${id}`)

/** GET /showtimes/pricing-policies */
export async function getPricingPolicies({ signal } = {}) {
  const { url, options } = buildGet(PRICING_POLICIES_URL)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success && Array.isArray(resp.data)) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được chính sách giá',
    raw: resp,
  }
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
