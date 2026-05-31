import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'

function SearchableMultiSelect({
  label,
  name,
  values = [],
  onChange,
  icon,
  options = [],
  placeholder = 'Chọn',
  searchPlaceholder = 'Nhập để tìm...',
  className = '',
  disabled = false,
  loading = false,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const selectedSet = useMemo(() => new Set((values || []).map(String)), [values])

  const selectedItems = useMemo(
    () =>
      (values || []).map((value) => {
        const id = String(value)
        const option = options.find((opt) => String(opt.value) === id)
        return {
          value: id,
          label: option?.tagLabel || option?.label || id,
        }
      }),
    [values, options],
  )

  const filteredOptions = useMemo(() => {
    const available = options.filter((opt) => !selectedSet.has(String(opt.value)))
    if (!search.trim()) return available
    const keyword = search.trim().toLowerCase()
    return available.filter(
      (opt) =>
        opt.label?.toLowerCase().includes(keyword) ||
        String(opt.value || '').toLowerCase().includes(keyword),
    )
  }, [options, search, selectedSet])

  const emitChange = useCallback(
    (nextValues) => {
      onChange?.({
        target: {
          name,
          value: nextValues,
          type: 'select-multiple',
        },
      })
    },
    [name, onChange],
  )

  const selectValue = (optionValue) => {
    if (disabled) return
    const id = String(optionValue)
    if (selectedSet.has(id)) return
    emitChange([...(values || []), id])
    setSearch('')
  }

  const removeValue = (optionValue) => {
    if (disabled) return
    const id = String(optionValue)
    emitChange((values || []).filter((value) => String(value) !== id))
  }

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

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
          value={search}
          disabled={disabled}
          onChange={(e) => {
            if (disabled) return
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (disabled) return
            setOpen(true)
          }}
          placeholder={loading ? 'Đang tải...' : open ? searchPlaceholder : placeholder}
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
                inputRef.current?.focus()
              } else {
                setSearch('')
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
          <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl">
            {loading && filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-slate-500">Đang tải...</div>
            ) : null}
            {!loading && filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-slate-500">
                {selectedSet.size > 0 && !search.trim()
                  ? 'Đã chọn hết trong danh sách'
                  : 'Không tìm thấy lựa chọn phù hợp'}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option.value === '' ? `__empty__-${option.label}` : option.value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectValue(option.value)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {selectedItems.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedItems.map((item) => (
            <span
              key={item.value}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm text-primary"
            >
              <span className="max-w-[220px] truncate">{item.label}</span>
              {!disabled ? (
                <button
                  type="button"
                  aria-label={`Gỡ ${item.label}`}
                  onClick={() => removeValue(item.value)}
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-primary/80 hover:bg-primary/20 hover:text-primary transition-colors"
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default SearchableMultiSelect
