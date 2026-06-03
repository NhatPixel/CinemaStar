import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Lazy load cho API cursor (CursorPageResponse).
 * @param {() => Promise<{ items?: unknown[], nextCursor?: string|null, hasNext?: boolean }>} fetchInitial
 * @param {(cursor: string) => Promise<{ items?: unknown[], nextCursor?: string|null, hasNext?: boolean }>} fetchMore
 * @param {unknown[]} resetDeps — đổi filter → reset danh sách
 */
export function useCursorInfiniteScroll({ fetchInitial, fetchMore, resetDeps = [] }) {
  const [items, setItems] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)
  const loadMoreRef = useRef(() => {})

  const loadMore = useCallback(async () => {
    if (!nextCursor || !hasNext || loadingMore || loading) return
    setLoadingMore(true)
    try {
      const result = await fetchMore(nextCursor)
      const chunk = result?.items ?? []
      setItems((prev) => [...prev, ...chunk])
      setNextCursor(result?.nextCursor ?? null)
      setHasNext(Boolean(result?.hasNext))
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, hasNext, loadingMore, loading, fetchMore])

  loadMoreRef.current = loadMore

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setItems([])
    setNextCursor(null)
    setHasNext(false)

    ;(async () => {
      try {
        const result = await fetchInitial()
        if (cancelled) return
        setItems(result?.items ?? [])
        setNextCursor(result?.nextCursor ?? null)
        setHasNext(Boolean(result?.hasNext))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetDeps controls refetch
  }, resetDeps)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return undefined
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreRef.current()
        }
      },
      { root: null, rootMargin: '240px', threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [items.length, hasNext])

  return {
    items,
    setItems,
    loading,
    loadingMore,
    hasNext,
    sentinelRef,
    loadMore,
  }
}
