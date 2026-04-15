function Label({ children, className = '', ...props }) {
  return (
    <label className={`text-sm font-medium text-slate-300 block ${className}`} {...props}>
      {children}
    </label>
  )
}

export default Label
