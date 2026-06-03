import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_PAGE_SIZE = 12

/**
 * Lazy load cho API phân trang (PageResponse) trong SearchableSelect / SearchableMultiSelect.
 */
export function usePagedSelectOptions({
  enabled = true,
  pageSize = DEFAULT_PAGE_SIZE,
  fetchPage,
  mapOption,
} = {}) {
  const [options, setOptions] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [keyword, setKeyword] = useState('')
  const abortRef = useRef(null)
  const fetchPageRef = useRef(fetchPage)
  const mapOptionRef = useRef(mapOption)

  useEffect(() => {
    fetchPageRef.current = fetchPage
    mapOptionRef.current = mapOption
  })

  const load = useCallback(
    async ({ page: nextPage, keyword: kw, append }) => {
      const fetch = fetchPageRef.current
      const map = mapOptionRef.current
      if (!enabled || !fetch || !map) return
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      if (append) setLoadingMore(true)
      else setLoading(true)

      try {
        const result = await fetch({
          page: nextPage,
          size: pageSize,
          keyword: kw ?? '',
          signal: ac.signal,
        })
        const mapped = (result?.items || []).map(map).filter(Boolean)
        setOptions((prev) => (append ? [...prev, ...mapped] : mapped))
        setPage(nextPage)
        setHasMore(Boolean(result?.hasNext))
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
    [enabled, pageSize],
  )

  useEffect(() => {
    if (!enabled) {
      setOptions([])
      setHasMore(false)
      return undefined
    }
    setKeyword('')
    load({ page: 1, keyword: '', append: false })
    return () => abortRef.current?.abort()
  }, [enabled, load])

  const onSearchChange = useCallback(
    (kw) => {
      setKeyword(kw)
      load({ page: 1, keyword: kw, append: false })
    },
    [load],
  )

  const onLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return
    load({ page: page + 1, keyword, append: true })
  }, [hasMore, loadingMore, loading, page, keyword, load])

  const mergeOption = useCallback((value, label, tagLabel) => {
    if (value === '' || value == null) return
    setOptions((prev) => {
      if (prev.some((opt) => String(opt.value) === String(value))) return prev
      const text = label || String(value)
      return [
        {
          value,
          label: text,
          ...(tagLabel != null ? { tagLabel } : {}),
        },
        ...prev,
      ]
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
