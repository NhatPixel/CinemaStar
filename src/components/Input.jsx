import { useState } from 'react'
import Icon from './Icon'

function Input({
  label,
  name,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  icon,
  showPasswordToggle = false,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const inputType = showPasswordToggle && type === 'password' 
    ? (showPassword ? 'text' : 'password')
    : type

  const handleFocus = (e) => {
    e.target.style.borderColor = '#7311d4'
    e.target.style.boxShadow = '0 0 0 2px rgba(115, 17, 212, 0.5)'
  }

  const handleBlur = (e) => {
    e.target.style.borderColor = 'rgba(115, 17, 212, 0.2)'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div className="space-y-2">
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
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full border rounded-lg py-3.5 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
            icon ? 'pl-12' : 'pl-4'
          } ${showPasswordToggle ? 'pr-12' : ''} ${className}`}
          style={{ 
            backgroundColor: 'rgba(25, 16, 34, 0.5)',
            borderColor: 'rgba(115, 17, 212, 0.2)'
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-xl" />
          </button>
        )}
      </div>
    </div>
  )
}

export default Input
