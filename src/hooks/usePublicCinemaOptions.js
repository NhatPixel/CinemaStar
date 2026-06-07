import { useMemo } from 'react'
import { buildCinemasSearchBody, searchCinemas } from '../api/cinema'
import { usePagedSelectOptions } from './usePagedSelectOptions'

function mapCinemaOption(cinema) {
  if (!cinema?.id) return null
  return {
    value: cinema.id,
    label: cinema.name || cinema.code || String(cinema.id),
    tagLabel: cinema.name || cinema.code || String(cinema.id),
  }
}

/**
 * Rạp công khai cho khách — POST /cinemas/search (ACTIVE), lazy load + tìm tên rạp.
 */
export function usePublicCinemaOptions({
  enabled = true,
  status = 'ACTIVE',
  includeAll = true,
  allLabel = 'Tất cả rạp',
} = {}) {
  const paged = usePagedSelectOptions({
    enabled,
    fetchPage: async ({ page, size, keyword, signal }) => {
      const data = await searchCinemas(
        buildCinemasSearchBody({ page, size, keyword, status }),
        { signal },
      )
      return { items: data?.data || [], hasNext: data?.hasNext }
    },
    mapOption: mapCinemaOption,
  })

  const options = useMemo(() => {
    if (!includeAll) return paged.options
    return [{ value: '', label: allLabel }, ...paged.options]
  }, [includeAll, allLabel, paged.options])

  return { ...paged, options }
}
