import { useCallback, useEffect, useRef, useState } from 'react'
import { buildFilmsSearchBody, searchFilms } from '../api/film'

const PAGE_SIZE = 12

function mapFilmOption(film) {
  if (!film?.id) return null
  const label = film.title || film.name || String(film.id)
  return { value: film.id, label, tagLabel: label }
}

function mapFilmOptions(list) {
  return (list || []).map(mapFilmOption).filter(Boolean)
}

function statusInKey(statusIn) {
  if (!Array.isArray(statusIn) || statusIn.length === 0) return ''
  return statusIn.join(',')
}

/**
 * Danh sách phim cho SearchableSelect — API cursor, lazy load khi cuộn dropdown.
 */
export function useCursorFilmOptions({
  enabled = true,
  status,
  statusIn,
} = {}) {
  const [options, setOptions] = useState([])
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [keyword, setKeyword] = useState('')
  const abortRef = useRef(null)
  const statusRef = useRef(status)
  const statusInRef = useRef(statusIn)

  useEffect(() => {
    statusRef.current = status
    statusInRef.current = statusIn
  })

  const fetchFilms = useCallback(
    async ({ cursor: next, title, append }) => {
      if (!enabled) return
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      if (append) setLoadingMore(true)
      else setLoading(true)

      try {
        const data = await searchFilms(
          buildFilmsSearchBody({
            size: PAGE_SIZE,
            cursor: next || undefined,
            title,
            status: statusRef.current,
            statusIn: statusInRef.current,
          }),
          { signal: ac.signal },
        )
        const mapped = mapFilmOptions(data?.data)
        setOptions((prev) => (append ? [...prev, ...mapped] : mapped))
        setCursor(data?.nextCursor ?? null)
        setHasMore(Boolean(data?.hasNext))
      } catch (e) {
        if (e?.name === 'AbortError') return
        if (!append) setOptions([])
        setHasMore(false)
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [enabled],
  )

  const filterKey = `${status ?? ''}|${statusInKey(statusIn)}`

  useEffect(() => {
    if (!enabled) {
      setOptions([])
      setHasMore(false)
      return undefined
    }
    setKeyword('')
    fetchFilms({ title: '', append: false })
    return () => abortRef.current?.abort()
  }, [enabled, filterKey, fetchFilms])

  const onSearchChange = useCallback(
    (title) => {
      setKeyword(title)
      setCursor(null)
      fetchFilms({ title, append: false })
    },
    [fetchFilms],
  )

  const onLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading || !cursor) return
    fetchFilms({ cursor, title: keyword, append: true })
  }, [hasMore, loadingMore, loading, cursor, keyword, fetchFilms])

  const mergeOption = useCallback((value, label) => {
    if (!value) return
    setOptions((prev) => {
      if (prev.some((opt) => String(opt.value) === String(value))) return prev
      const text = label || String(value)
      return [{ value, label: text, tagLabel: text }, ...prev]
    })
  }, [])

  return {
    options,
    setOptions,
    loading,
    loadingMore,
    hasMore,
    onSearchChange,
    onLoadMore,
    mergeOption,
  }
}
