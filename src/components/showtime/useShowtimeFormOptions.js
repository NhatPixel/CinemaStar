import { useCallback, useEffect, useRef, useState } from 'react'
import { buildHallsSearchBody, searchHalls } from '../../api/hall'
import { getPricingPolicies } from '../../api/pricingPolicy'
import { useCursorFilmOptions } from '../../hooks/useCursorFilmOptions'
import { usePagedCinemaOptions } from '../../hooks/usePagedCinemaOptions'

const PAGE_SIZE = 12
const FILM_STATUS = 'NOW_SHOWING'
const HALL_STATUS = 'ACTIVE'

function mapHallOptions(list) {
  return (list || []).map((hall) => ({
    value: hall.id,
    label: hall.name || String(hall.id),
    cinemaId: hall.cinemaId || hall.cinemaResponse?.id,
  }))
}

function mapPricingPolicyOptions(list, cinemaId) {
  let items = Array.isArray(list) ? list : []
  if (cinemaId) {
    items = items.filter((p) => String(p.cinemaId) === String(cinemaId))
  }
  return items.map((policy) => ({
    value: policy.id,
    label: policy.name || String(policy.id),
    cinemaId: policy.cinemaId,
  }))
}

function mergeOption(options, value, label) {
  if (!value) return options
  if (options.some((o) => o.value === value)) return options
  return [{ value, label: label || value }, ...options]
}

/**
 * Phim (cursor), rạp & phòng (phân trang) — lazy load trong dropdown.
 */
export function useShowtimeFormOptions({ enabled, cinemaId, toast }) {
  const {
    options: filmOptions,
    loading: filmLoading,
    loadingMore: filmLoadingMore,
    hasMore: filmHasMore,
    onSearchChange: onFilmSearchChange,
    onLoadMore: onFilmLoadMore,
    mergeOption: mergeFilmOption,
    setOptions: setFilmOptions,
  } = useCursorFilmOptions({ enabled, status: FILM_STATUS })

  const {
    options: cinemaOptions,
    loading: cinemaLoading,
    loadingMore: cinemaLoadingMore,
    hasMore: cinemaHasMore,
    onSearchChange: onCinemaSearchChange,
    onLoadMore: onCinemaLoadMore,
    mergeOption: mergeCinemaOption,
    setOptions: setCinemaOptions,
  } = usePagedCinemaOptions({ enabled })

  const [hallOptions, setHallOptions] = useState([])
  const [hallPage, setHallPage] = useState(1)
  const [hallHasMore, setHallHasMore] = useState(false)
  const [hallLoading, setHallLoading] = useState(false)
  const [hallLoadingMore, setHallLoadingMore] = useState(false)
  const [hallKeyword, setHallKeyword] = useState('')
  const hallAbortRef = useRef(null)

  const [pricingPolicyOptions, setPricingPolicyOptions] = useState([])
  const [pricingLoading, setPricingLoading] = useState(false)
  const pricingAbortRef = useRef(null)

  const fetchHalls = useCallback(
    async ({ page, keyword, append, cinemaId: cid }) => {
      if (!cid) {
        setHallOptions([])
        setHallHasMore(false)
        return
      }

      hallAbortRef.current?.abort()
      const ac = new AbortController()
      hallAbortRef.current = ac

      if (append) setHallLoadingMore(true)
      else setHallLoading(true)

      try {
        const body = buildHallsSearchBody({
          page,
          size: PAGE_SIZE,
          keyword,
          status: HALL_STATUS,
          cinemaId: cid,
        })
        const data = await searchHalls(body, { signal: ac.signal })
        const mapped = mapHallOptions(data?.data)
        setHallOptions((prev) => (append ? [...prev, ...mapped] : mapped))
        setHallHasMore(Boolean(data?.hasNext))
        setHallPage(page)
      } catch (e) {
        if (e?.name === 'AbortError') return
        toast?.error?.(e?.message || 'Không tải được danh sách phòng chiếu')
        if (!append) setHallOptions([])
        setHallHasMore(false)
      } finally {
        if (!ac.signal.aborted) {
          setHallLoading(false)
          setHallLoadingMore(false)
        }
      }
    },
    [toast],
  )

  useEffect(() => {
    if (!enabled) {
      setPricingPolicyOptions([])
      return undefined
    }
    pricingAbortRef.current?.abort()
    const ac = new AbortController()
    pricingAbortRef.current = ac
    setPricingLoading(true)

    ;(async () => {
      try {
        const list = await getPricingPolicies({ signal: ac.signal })
        if (ac.signal.aborted) return
        setPricingPolicyOptions(mapPricingPolicyOptions(list, cinemaId))
      } catch (e) {
        if (e?.name === 'AbortError') return
        toast?.error?.(e?.message || 'Không tải được chính sách giá')
        setPricingPolicyOptions([])
      } finally {
        if (!ac.signal.aborted) setPricingLoading(false)
      }
    })()

    return () => ac.abort()
  }, [enabled, cinemaId, toast])

  useEffect(() => {
    if (!enabled) return undefined
    setHallKeyword('')
    setHallPage(1)
    fetchHalls({ page: 1, keyword: '', append: false, cinemaId })
    return () => {
      hallAbortRef.current?.abort()
    }
  }, [enabled, cinemaId, fetchHalls])

  const onHallSearchChange = useCallback(
    (keyword) => {
      if (!cinemaId) return
      setHallKeyword(keyword)
      fetchHalls({ page: 1, keyword, append: false, cinemaId })
    },
    [cinemaId, fetchHalls],
  )

  const onHallLoadMore = useCallback(() => {
    if (!hallHasMore || hallLoadingMore || hallLoading || !cinemaId) return
    fetchHalls({
      page: hallPage + 1,
      keyword: hallKeyword,
      append: true,
      cinemaId,
    })
  }, [hallHasMore, hallLoadingMore, hallLoading, cinemaId, hallPage, hallKeyword, fetchHalls])

  const injectSelectedLabels = useCallback(
    ({
      filmId,
      filmLabel,
      cinemaId: cid,
      cinemaLabel,
      hallId,
      hallLabel,
      pricingPolicyId,
      pricingPolicyLabel,
    }) => {
      if (filmId) mergeFilmOption(filmId, filmLabel)
      if (cid) mergeCinemaOption(cid, cinemaLabel)
      if (hallId) {
        setHallOptions((prev) => mergeOption(prev, hallId, hallLabel))
      }
      if (pricingPolicyId) {
        setPricingPolicyOptions((prev) => mergeOption(prev, pricingPolicyId, pricingPolicyLabel))
      }
    },
    [mergeFilmOption, mergeCinemaOption],
  )

  return {
    filmOptions,
    cinemaOptions,
    hallOptions,
    pricingPolicyOptions,
    pricingLoading,
    filmLoading,
    filmLoadingMore,
    filmHasMore,
    cinemaLoading,
    cinemaLoadingMore,
    cinemaHasMore,
    hallLoading,
    hallLoadingMore,
    hallHasMore,
    onFilmSearchChange,
    onFilmLoadMore,
    onCinemaSearchChange,
    onCinemaLoadMore,
    onHallSearchChange,
    onHallLoadMore,
    injectSelectedLabels,
  }
}
