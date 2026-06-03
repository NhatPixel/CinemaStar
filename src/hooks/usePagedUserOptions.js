import { usePagedSelectOptions } from './usePagedSelectOptions'

/**
 * Manager hoặc staff — POST /users/managers/search | /users/staffs/search.
 */
export function usePagedUserOptions({ enabled = true, searchFn, mapOption } = {}) {
  return usePagedSelectOptions({
    enabled: enabled && Boolean(searchFn),
    fetchPage: async ({ page, size, keyword, signal }) => {
      const data = await searchFn({ page, size, keyword }, { signal })
      return { items: data?.data || [], hasNext: data?.hasNext }
    },
    mapOption,
  })
}
