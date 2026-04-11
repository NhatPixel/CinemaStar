import { callApi, buildPost } from '../client'
import { filmPath } from '../paths'

const FILMS_SEARCH_URL = filmPath('search')

export function buildFilmsSearchBody({
  cursor,
  size = 12,
  title,
  status,
  country,
  language,
}) {
  const filterBy = []
  if (title) {
    filterBy.push({ field: 'TITLE', operator: 'LIKE', value: t })
  }
  if (status) {
    filterBy.push({ field: 'STATUS', operator: 'LIKE', value: status })
  }
  if (country) {
    filterBy.push({ field: 'COUNTRY', operator: 'LIKE', value: c })
  }
  if (language) {
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

export async function searchFilms(body, { signal } = {}) {
  const { url, options } = buildPost(FILMS_SEARCH_URL, body)
  const resp = await callApi({
    url,
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
