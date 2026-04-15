function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  className = '',
  ...props 
}) {
  const baseStyles = 'font-bold transition-all active:scale-[0.98]'
  
  const variants = {
    primary: {
      className: 'text-white',
      style: {
        backgroundColor: '#7311d4',
        boxShadow: '0 10px 15px -3px rgba(115, 17, 212, 0.25), 0 4px 6px -2px rgba(115, 17, 212, 0.25)'
      },
      onMouseEnter: (e) => e.target.style.backgroundColor = 'rgba(115, 17, 212, 0.9)',
      onMouseLeave: (e) => e.target.style.backgroundColor = '#7311d4'
    },
    secondary: {
      className: 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-white',
      style: {},
      onMouseEnter: null,
      onMouseLeave: null
    },
    ghost: {
      className: 'bg-transparent text-slate-500 hover:text-slate-300',
      style: {},
      onMouseEnter: null,
      onMouseLeave: null
    }
  }

  const sizes = {
    sm: 'py-2 px-4 text-sm rounded-lg',
    md: 'py-4 px-6 text-base rounded-lg',
    lg: 'py-4 px-6 text-lg rounded-xl'
  }

  const variantConfig = variants[variant]
  const sizeClass = sizes[size]
  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      className={`${baseStyles} ${variantConfig.className} ${sizeClass} ${widthClass} ${className}`}
      style={variantConfig.style}
      onMouseEnter={variantConfig.onMouseEnter}
      onMouseLeave={variantConfig.onMouseLeave}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
