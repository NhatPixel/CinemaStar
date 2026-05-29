import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Icon from './Icon'

function SearchableSelect({
  label,
  name,
  value,
  onChange,
  icon,
  options = [],
  placeholder = 'Chọn',
  searchPlaceholder = 'Nhập để tìm...',
  className = '',
  disabled = false,
  /** true: không lọc client, gọi onSearchChange khi gõ */
  serverSearch = false,
  onSearchChange,
  onLoadMore,
  hasMore = false,
  loading = false,
  loadingMore = false,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const searchRef = useRef('')

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    searchRef.current = search
  }, [search])

  useEffect(() => {
    if (!serverSearch || !onSearchChange || !open) return undefined
    const t = setTimeout(() => onSearchChange(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search, serverSearch, onSearchChange, open])

  const filteredOptions = useMemo(() => {
    if (serverSearch) return options
    if (!search) return options
    const keyword = search.toLowerCase()
    return options.filter(
      (opt) =>
        opt.label?.toLowerCase().includes(keyword) ||
        opt.value?.toLowerCase().includes(keyword),
    )
  }, [options, search, serverSearch])

  const handleSelect = (option) => {
    if (disabled) return
    const fakeEvent = {
      target: {
        name,
        value: option.value,
        type: 'select-one',
      },
    }
    onChange?.(fakeEvent)
    setOpen(false)
    setSearch('')
    inputRef.current?.blur()
  }

  const displayLabel = value === '' || value == null ? '' : (selectedOption?.label ?? '')
  const inputValue = open ? search : displayLabel

  useEffect(() => {
    if (!open) return undefined

    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
        setSearch('')
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleListScroll = useCallback(() => {
    const el = listRef.current
    if (!el || !onLoadMore || !hasMore || loadingMore || loading) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    if (nearBottom) onLoadMore()
  }, [onLoadMore, hasMore, loadingMore, loading])

  return (
    <div className="space-y-2" ref={containerRef}>
      {label ? (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block ml-1">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {icon ? (
          <Icon
            name={icon}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl z-[1]"
          />
        ) : null}
        <input
          type="text"
          ref={inputRef}
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            if (disabled) return
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (disabled) return
            setOpen(true)
            setSearch('')
            searchRef.current = ''
          }}
          placeholder={loading ? 'Đang tải...' : placeholder}
          className={`w-full border rounded-lg py-3.5 pr-12 text-slate-900 dark:text-white bg-white dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary/50 border-slate-200 dark:border-primary/20 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
            icon ? 'pl-12' : 'pl-4'
          } ${className}`}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return
            setOpen((prev) => {
              const next = !prev
              if (next) {
                setSearch('')
                searchRef.current = ''
              }
              return next
            })
          }}
          className="absolute inset-y-0 right-0 px-3 flex items-center justify-center disabled:opacity-50"
        >
          <Icon
            name="expand_more"
            className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && !disabled ? (
          <div
            ref={listRef}
            onScroll={handleListScroll}
            className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl"
          >
            {loading && filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-slate-500">Đang tải...</div>
            ) : null}
            {!loading && filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-slate-500">Không tìm thấy lựa chọn phù hợp</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option.value === '' ? `__empty__-${option.label}` : option.value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    value === option.value
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
            {loadingMore ? (
              <div className="px-4 py-2 text-xs text-slate-500 text-center">Đang tải thêm...</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default SearchableSelect
