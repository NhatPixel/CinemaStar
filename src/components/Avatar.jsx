import { Link } from 'react-router-dom'

function getInitial(name) {
  const normalized = String(name || '').trim()
  if (!normalized) return '?'
  return normalized.charAt(0).toUpperCase()
}

function Avatar({
  name = '',
  className = '',
  linkClassName = '',
  src = '',
  asLink = true,
}) {
  const base =
    'rounded-full bg-slate-200 dark:bg-primary/20 text-slate-600 dark:text-primary/70 flex items-center justify-center font-bold overflow-hidden shrink-0'
  const innerClass = className ? `${base} ${className}` : `${base} w-10 h-10`

  const content = src ? (
    <img src={src} alt={name ? `Ảnh đại diện ${name}` : 'Ảnh đại diện'} className="h-full w-full object-cover" />
  ) : (
    getInitial(name)
  )

  const circle = <div className={innerClass}>{content}</div>

  if (!asLink) {
    return <div className={`inline-flex ${linkClassName}`.trim()}>{circle}</div>
  }

  return (
    <Link
      to="/profile"
      title="Hồ sơ"
      aria-label={name ? `Hồ sơ ${name}` : 'Hồ sơ'}
      className={`inline-flex items-center justify-center rounded-full p-2 hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${linkClassName}`}
    >
      {circle}
    </Link>
  )
}

export default Avatar
