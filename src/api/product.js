import { callApi, buildPost } from './config/client'
import { bookingPath } from './config/paths'

const productsByCinemaUrl = (cinemaId) => bookingPath(`products/cinemas/${cinemaId}/search`)

export function buildProductsSearchBody({ page = 1, size = 30, sortBy } = {}) {
  return {
    page,
    size,
    filterBy: [],
    sortBy: Array.isArray(sortBy) ? sortBy : [],
  }
}

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
