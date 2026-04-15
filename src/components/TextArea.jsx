import Icon from './Icon'

function TextArea({
  label,
  name,
  placeholder = '',
  value,
  onChange,
  rows = 4,
  icon,
  className = '',
  ...props
}) {
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
            className="absolute left-4 top-4 text-slate-500 text-xl"
          />
        )}
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
          className={`w-full border rounded-lg py-3.5 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all resize-none ${
            icon ? 'pl-12' : 'pl-4'
          } ${className}`}
          style={{
            backgroundColor: 'rgba(25, 16, 34, 0.5)',
            borderColor: 'rgba(115, 17, 212, 0.2)',
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </div>
    </div>
  )
}
export default TextArea