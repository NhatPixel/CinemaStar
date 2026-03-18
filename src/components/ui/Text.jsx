function Text({ 
  children, 
  variant = 'body',
  className = '',
  ...props 
}) {
  const variants = {
    h1: 'text-4xl font-bold tracking-tighter text-white',
    h2: 'text-3xl font-bold text-white',
    h3: 'text-2xl font-semibold text-white',
    body: 'text-base text-slate-100',
    small: 'text-sm text-slate-400',
    caption: 'text-xs text-slate-500'
  }

  const Tag = variant.startsWith('h') ? variant : 'p'

  return (
    <Tag className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export default Text
