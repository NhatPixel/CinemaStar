import { useCallback, useEffect, useRef, useState } from 'react'
import { getManagementCinemas } from '../../api/cinema'
import { mapCinemasToSelectOptions } from '../../api/hall'
import { buildFilmsSearchBody, searchFilms } from '../../api/film'
import { buildHallsSearchBody, searchHalls } from '../../api/hall'
import { getPricingPolicies } from '../../api/pricingPolicy'

const PAGE_SIZE = 12
const FILM_STATUS = 'NOW_SHOWING'
const HALL_STATUS = 'ACTIVE'

function mapFilmOptions(list) {
  return (list || []).map((film) => ({
    value: film.id,
    label: film.title || film.name || String(film.id),
  }))
}

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
 * Load phim (NOW_SHOWING), rạp (getManagementCinemas), phòng (ACTIVE) cho form suất chiếu.
 */
export function useShowtimeFormOptions({ enabled, cinemaId, toast }) {
  const [filmOptions, setFilmOptions] = useState([])
  const [filmCursor, setFilmCursor] = useState(null)
  const [filmHasMore, setFilmHasMore] = useState(false)
  const [filmLoading, setFilmLoading] = useState(false)
  const [filmLoadingMore, setFilmLoadingMore] = useState(false)
  const [filmKeyword, setFilmKeyword] = useState('')
  const filmAbortRef = useRef(null)

  const [cinemaOptions, setCinemaOptions] = useState([])
  const [cinemaLoading, setCinemaLoading] = useState(false)

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

  const fetchFilms = useCallback(
    async ({ cursor, keyword, append }) => {
      filmAbortRef.current?.abort()
      const ac = new AbortController()
      filmAbortRef.current = ac

      if (append) setFilmLoadingMore(true)
      else setFilmLoading(true)

      try {
        const body = buildFilmsSearchBody({
          size: PAGE_SIZE,
          cursor: cursor || undefined,
          title: keyword,
          status: FILM_STATUS,
        })
        const data = await searchFilms(body, { signal: ac.signal })
        const mapped = mapFilmOptions(data?.data)
        setFilmOptions((prev) => (append ? [...prev, ...mapped] : mapped))
        setFilmCursor(data?.nextCursor ?? null)
        setFilmHasMore(Boolean(data?.hasNext))
      } catch (e) {
        if (e?.name === 'AbortError') return
        toast?.error?.(e?.message || 'Không tải được danh sách phim')
        if (!append) setFilmOptions([])
        setFilmHasMore(false)
      } finally {
        if (!ac.signal.aborted) {
          setFilmLoading(false)
          setFilmLoadingMore(false)
        }
      }
    },
    [toast],
  )

  const fetchCinemas = useCallback(async () => {
    setCinemaLoading(true)
    try {
      const list = await getManagementCinemas()
      setCinemaOptions(mapCinemasToSelectOptions(list, { includeAll: false }))
    } catch (e) {
      toast?.error?.(e?.message || 'Không tải được danh sách rạp')
      setCinemaOptions([])
    } finally {
      setCinemaLoading(false)
    }
  }, [toast])

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
    if (!enabled) return undefined
    setFilmKeyword('')
    fetchFilms({ keyword: '', append: false })
    fetchCinemas()
    return () => {
      filmAbortRef.current?.abort()
    }
  }, [enabled, fetchFilms, fetchCinemas])

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

  const onFilmSearchChange = useCallback(
    (keyword) => {
      setFilmKeyword(keyword)
      setFilmCursor(null)
      fetchFilms({ keyword, append: false })
    },
    [fetchFilms],
  )

  const onFilmLoadMore = useCallback(() => {
    if (!filmHasMore || filmLoadingMore || filmLoading || !filmCursor) return
    fetchFilms({ cursor: filmCursor, keyword: filmKeyword, append: true })
  }, [filmHasMore, filmLoadingMore, filmLoading, filmCursor, filmKeyword, fetchFilms])

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
      if (filmId) {
        setFilmOptions((prev) => mergeOption(prev, filmId, filmLabel))
      }
      if (cid) {
        setCinemaOptions((prev) => mergeOption(prev, cid, cinemaLabel))
      }
      if (hallId) {
        setHallOptions((prev) => mergeOption(prev, hallId, hallLabel))
      }
      if (pricingPolicyId) {
        setPricingPolicyOptions((prev) => mergeOption(prev, pricingPolicyId, pricingPolicyLabel))
      }
    },
    [],
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
    hallLoading,
    hallLoadingMore,
    hallHasMore,
    onFilmSearchChange,
    onFilmLoadMore,
    onHallSearchChange,
    onHallLoadMore,
    injectSelectedLabels,
  }
}
