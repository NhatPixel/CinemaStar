import Button from './Button'
import Text from './Text'

/**
 * Phân trang offset (PageResponse): nút < > và "Trang x / y".
 */
function PagePagination({
  page,
  totalPages,
  hasNext,
  hasPrevious,
  loading = false,
  onPageChange,
  className = '',
}) {
  if (!totalPages || totalPages <= 1) return null

  const goPrev = () => onPageChange?.(Math.max(1, page - 1))
  const goNext = () => onPageChange?.(page + 1)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:border-primary/20 dark:text-slate-300 dark:hover:bg-primary/10"
        disabled={!hasPrevious || loading}
        onClick={goPrev}
        aria-label="Trang trước"
      >
        {'<'}
      </Button>
      <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
        Trang {page}
        {totalPages > 0 ? ` / ${totalPages}` : ''}
      </Text>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:border-primary/20 dark:text-slate-300 dark:hover:bg-primary/10"
        disabled={!hasNext || loading}
        onClick={goNext}
        aria-label="Trang sau"
      >
        {'>'}
      </Button>
    </div>
  )
}

export default PagePagination
