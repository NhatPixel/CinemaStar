import { useEffect, useRef, useState } from 'react'
import Button from './Button'

function clampPage(value, totalPages) {
  const n = Number.parseInt(String(value).trim(), 10)
  if (!Number.isFinite(n)) return null
  return Math.min(Math.max(1, n), totalPages)
}

/**
 * Phân trang offset (PageResponse): nút < > và "Trang x / y" (bấm giữa để nhập trang).
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
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(page))
  const inputRef = useRef(null)

  useEffect(() => {
    if (!editing) {
      setDraft(String(page))
    }
  }, [page, editing])

  useEffect(() => {
    if (!editing) return undefined
    inputRef.current?.focus()
    inputRef.current?.select()
    return undefined
  }, [editing])

  if (!totalPages || totalPages <= 1) return null

  const goPrev = () => onPageChange?.(Math.max(1, page - 1))
  const goNext = () => onPageChange?.(Math.min(totalPages, page + 1))

  const commitPage = () => {
    const next = clampPage(draft, totalPages)
    setEditing(false)
    setDraft(String(page))
    if (next != null && next !== page) {
      onPageChange?.(next)
    }
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft(String(page))
  }

  const startEdit = () => {
    if (loading) return
    setDraft(String(page))
    setEditing(true)
  }

  const labelClass =
    'text-sm text-slate-500 dark:text-slate-400 tabular-nums'

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

      {editing ? (
        <span className={`inline-flex items-center gap-1.5 ${labelClass}`}>
          <span>Trang</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            disabled={loading}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitPage()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                cancelEdit()
              }
            }}
            onBlur={commitPage}
            className="w-12 rounded-md border border-primary/40 bg-white px-1.5 py-0.5 text-center text-sm font-semibold text-slate-800 outline-none ring-2 ring-primary/30 dark:bg-slate-900 dark:text-white"
            aria-label="Nhập số trang"
          />
          <span>/ {totalPages}</span>
        </span>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={startEdit}
          title="Nhập số trang"
          className={`rounded-md px-2 py-1 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-primary/10 ${labelClass}`}
        >
          Trang {page} / {totalPages}
        </button>
      )}

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
