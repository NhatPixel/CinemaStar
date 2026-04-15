function CustomLink({
  children,
  href = '#',
  className = '',
  size = 'sm',
  ...props
}) {
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const handleMouseEnter = (e) => {
    e.target.style.color = 'rgba(115, 17, 212, 0.8)'
  }

  const handleMouseLeave = (e) => {
    e.target.style.color = '#7311d4'
  }

  return (
    <a
      href={href}
      className={`font-bold transition-colors underline ${sizes[size]} ${className}`}
      style={{
        color: '#7311d4',
        textDecorationColor: 'rgba(115, 17, 212, 0.3)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </a>
  )
}

export default CustomLink
