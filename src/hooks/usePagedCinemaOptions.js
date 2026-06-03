import { useMemo } from 'react'
import { buildCinemasSearchBody, searchCinemas, searchMyManagedCinemas } from '../api/cinema'
import { readCurrentUserRole } from '../constants/userRoleLabels'
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
 * Rạp trong phạm vi quản lý — POST /cinemas/search hoặc /cinemas/me/search, lazy load dropdown.
 */
export function usePagedCinemaOptions({
  enabled = true,
  status,
  includeAll = false,
  allLabel = 'Tất cả rạp',
} = {}) {
  const isAdmin = readCurrentUserRole() === 'ADMIN'
  const searchFn = isAdmin ? searchCinemas : searchMyManagedCinemas

  const paged = usePagedSelectOptions({
    enabled,
    fetchPage: async ({ page, size, keyword, signal }) => {
      const data = await searchFn(
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
