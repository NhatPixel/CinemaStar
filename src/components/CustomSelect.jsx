import { useState, useEffect, useRef } from 'react'
import Icon from './Icon'

function CustomSelect({
  label,
  name,
  value,
  onChange,
  icon,
  options = [],
  placeholder = 'Chọn',
  className = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const selectedOption = options.find((opt) => opt.value === value)

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
  }

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
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setOpen((prev) => !prev)
          }}
          className={`w-full border rounded-lg py-3.5 pr-12 text-left text-white focus:outline-none focus:ring-2 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
            icon ? 'pl-12' : 'pl-4'
          } ${className}`}
          style={{
            backgroundColor: 'rgba(25, 16, 34, 0.5)',
            borderColor: open ? '#7311d4' : 'rgba(115, 17, 212, 0.2)',
            boxShadow: open
              ? '0 0 0 2px rgba(115, 17, 212, 0.5)'
              : 'none',
          }}
        >
          {selectedOption ? (
            <span>{selectedOption.label}</span>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </button>
        <Icon
          name="expand_more"
          className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-transform pointer-events-none ${
            open ? 'rotate-180' : ''
          }`}
        />

        {open && (
          <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur">
            {options.length === 0 ? (
              <div className="px-4 py-2 text-sm text-slate-400">
                Không có lựa chọn
              </div>
            ) : (
              options.map((option) => (
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

export default CustomSelect

