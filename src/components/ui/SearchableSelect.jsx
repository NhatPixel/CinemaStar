import { useState, useMemo, useEffect, useRef } from 'react'
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
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const selectedOption = options.find((opt) => opt.value === value)

  const filteredOptions = useMemo(() => {
    if (!search) return options
    const keyword = search.toLowerCase()
    return options.filter(
      (opt) =>
        opt.label?.toLowerCase().includes(keyword) ||
        opt.value?.toLowerCase().includes(keyword)
    )
  }, [options, search])

  const handleSelect = (option) => {
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
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }

  const displayLabel = selectedOption ? selectedOption.label : ''
  const inputValue = search !== '' ? search : displayLabel

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target)) {
        setOpen(false)
        setSearch('')
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-slate-300 block ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <Icon
            name={icon}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl"
          />
        )}
        <input
          type="text"
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full border rounded-lg py-3.5 pr-12 text-white focus:outline-none focus:ring-2 transition-all ${
            icon ? 'pl-12' : 'pl-4'
          } ${className}`}
          style={{
            backgroundColor: 'rgba(25, 16, 34, 0.5)',
            borderColor: open ? '#7311d4' : 'rgba(115, 17, 212, 0.2)',
            boxShadow: open
              ? '0 0 0 2px rgba(115, 17, 212, 0.5)'
              : 'none',
          }}
          onFocusCapture={(e) => {
            e.target.style.borderColor = '#7311d4'
            e.target.style.boxShadow =
              '0 0 0 2px rgba(115, 17, 212, 0.5)'
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = 'rgba(115, 17, 212, 0.2)'
            e.target.style.boxShadow = 'none'
          }}
        />
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="absolute inset-y-0 right-0 px-3 flex items-center justify-center"
        >
          <Icon
            name="expand_more"
            className={`text-slate-500 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-slate-400">
                Không tìm thấy lựa chọn phù hợp
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-800 ${
                    value === option.value
                      ? 'bg-slate-800 text-primary'
                      : 'text-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchableSelect

