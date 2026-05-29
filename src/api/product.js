import { callApi, buildDelete, buildGet, buildPost, buildPut } from './config/client'
import { bookingPath } from './config/paths'

const PRODUCTS_CREATE_URL = bookingPath('products')
const PRODUCTS_OPERATOR_SEARCH_URL = bookingPath('products/me/search')
const productDetailUrl = (id) => bookingPath(`products/${id}`)
const productsByCinemaUrl = (cinemaId) => bookingPath(`products/cinemas/${cinemaId}/search`)

/**
 * Body cho POST /bookings/products/me/search và .../cinemas/{cinemaId}/search
 */
export function buildProductsSearchBody({
  page = 1,
  size = 12,
  keyword,
  status,
  type,
  sortBy,
  extraFilters,
} = {}) {
  const filterBy = []
  if (status && status !== 'all') {
    filterBy.push({ field: 'STATUS', operator: 'EQ', value: status })
  }
  if (type && type !== 'all') {
    filterBy.push({ field: 'TYPE', operator: 'EQ', value: type })
  }
  if (Array.isArray(extraFilters)) {
    for (const f of extraFilters) {
      if (f && f.field) filterBy.push(f)
    }
  }
  return {
    page,
    size,
    keyword: keyword?.trim() ?? '',
    filterBy,
    sortBy: Array.isArray(sortBy) ? sortBy : [{ field: 'TIME_CREATED', direction: 'DESC' }],
  }
}

/** POST /bookings/products/me/search — sản phẩm rạp manager được quản lý */
export async function searchOperatorProducts(body, { signal } = {}) {
  const { url, options } = buildPost(PRODUCTS_OPERATOR_SEARCH_URL, body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được danh sách sản phẩm',
    raw: resp,
  }
}

/** POST /bookings/products/cinemas/{cinemaId}/search */
export async function searchProductsByCinema(cinemaId, body, { signal } = {}) {
  const { url, options } = buildPost(productsByCinemaUrl(cinemaId), body)
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được danh sách combo',
    raw: resp,
  }
}

export async function createProduct(payload) {
  const { url, options } = buildPost(PRODUCTS_CREATE_URL, payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể tạo sản phẩm',
    raw: resp,
  }
}

export async function getProductById(id, { signal } = {}) {
  const { url, options } = buildGet(productDetailUrl(id))
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được thông tin sản phẩm',
    raw: resp,
  }
}

export async function updateProduct(id, payload) {
  const { url, options } = buildPut(productDetailUrl(id), payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể cập nhật sản phẩm',
    raw: resp,
  }
}

export async function deleteProduct(id) {
  const { url, options } = buildDelete(productDetailUrl(id))
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể xóa sản phẩm',
    raw: resp,
  }
}
