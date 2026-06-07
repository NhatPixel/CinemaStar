import { callApi, buildDelete, buildGet, buildPost, buildPut } from './config/client'
import { filmPath } from './config/paths'

const FILMS_SEARCH_URL = filmPath('search')
const FILMS_CUSTOMER_SEARCH_URL = filmPath('customer/search')
const FILMS_CREATE_URL = filmPath('')
const filmDetailUrl = (id) => filmPath(id)
const MAX_FILM_CURSOR_PAGES = 50

export function buildFilmsSearchBody({
  cursor,
  size = 12,
  title,
  status,
  statusIn,
  country,
  language,
}) {
  const filterBy = []
  const t = title?.trim()
  if (t) {
    filterBy.push({ field: 'TITLE', operator: 'LIKE', value: t })
  }
  if (Array.isArray(statusIn) && statusIn.length > 0) {
    filterBy.push({ field: 'STATUS', operator: 'IN', value: statusIn })
  } else if (status && status !== 'all') {
    filterBy.push({ field: 'STATUS', operator: 'EQ', value: status })
  }
  const c = country?.trim()
  if (c && c !== 'all') {
    filterBy.push({ field: 'COUNTRY', operator: 'LIKE', value: c })
  }
  const lang = language?.trim()
  if (lang && lang !== 'all') {
    filterBy.push({ field: 'LANGUAGE', operator: 'LIKE', value: lang })
  }
  const body = {
    size,
    filterBy,
    sortBy: [{ field: 'TIME_CREATED', direction: 'ASC' }],
  }
  if (cursor) {
    body.cursor = cursor
  }
  return body
}

/** Body POST /films/customer/search — cinemaId top-level, không lọc STATUS (BE tự scope). */
export function buildFilmsCustomerSearchBody({
  cursor,
  size = 12,
  title,
  cinemaId,
}) {
  const body = buildFilmsSearchBody({ cursor, size, title })
  const id = cinemaId?.trim()
  if (id) {
    body.cinemaId = id
  }
  return body
}

/** Gom toàn bộ trang cursor (dropdown cần danh sách đầy đủ). */
export async function searchAllFilms({
  signal,
  size = 12,
  title,
  status,
  statusIn,
} = {}) {
  const all = []
  let cursor
  for (let i = 0; i < MAX_FILM_CURSOR_PAGES; i += 1) {
    const data = await searchFilms(
      buildFilmsSearchBody({ size, cursor, title, status, statusIn }),
      { signal },
    )
    all.push(...(data?.data || []))
    if (!data?.hasNext) break
    cursor = data?.nextCursor
    if (!cursor) break
  }
  return all
}

async function postFilmsSearch(url, body, { signal } = {}) {
  const { url: requestUrl, options } = buildPost(url, body)
  const resp = await callApi({
    url: requestUrl,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được danh sách phim',
    raw: resp,
  }
}

export async function searchFilms(body, { signal } = {}) {
  return postFilmsSearch(FILMS_SEARCH_URL, body, { signal })
}

/** POST /films/customer/search — danh sách phim công khai (/movies). */
export async function searchFilmsForCustomer(body, { signal } = {}) {
  return postFilmsSearch(FILMS_CUSTOMER_SEARCH_URL, body, { signal })
}

export async function createFilm(payload) {
  const { url, options } = buildPost(FILMS_CREATE_URL, payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể tạo phim',
    raw: resp,
  }
}

export async function getFilmById(id, { signal } = {}) {
  const { url, options } = buildGet(filmDetailUrl(id))
  const resp = await callApi({
    url,
    options: { ...options, ...(signal ? { signal } : {}) },
  })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không tải được thông tin phim',
    raw: resp,
  }
}

export async function updateFilm(id, payload) {
  const { url, options } = buildPut(filmDetailUrl(id), payload)
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể cập nhật phim',
    raw: resp,
  }
}

export async function deleteFilm(id) {
  const { url, options } = buildDelete(filmDetailUrl(id))
  const resp = await callApi({ url, options })
  if (resp?.success) {
    return resp.data
  }
  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Không thể xóa phim',
    raw: resp,
  }
}
