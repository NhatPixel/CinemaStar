function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  className = '',
  ...props 
}) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98] [&_.material-symbols-outlined]:text-current'

  const variants = {
    primary: {
      className:
        'text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 disabled:opacity-60 disabled:pointer-events-none',
      style: {},
    },
    secondary: {
      className:
        'bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-white disabled:opacity-60 disabled:pointer-events-none',
      style: {},
    },
    ghost: {
      className:
        'bg-transparent text-slate-500 hover:text-slate-300 disabled:opacity-60 disabled:pointer-events-none',
      style: {},
    },
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
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
