function Icon({ name, className = '', ...props }) {
  return (
    <span className={`material-symbols-outlined text-current ${className}`} {...props}>
      {name}
    </span>
  )
}

export default Icon
