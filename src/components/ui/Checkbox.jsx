function Checkbox({ checked, onChange, label, children, id, name, className = '' }) {
  const handleToggle = () => {
    onChange &&
      onChange({
        target: {
          name,
          checked: !checked,
          type: 'checkbox',
        },
      })
  }

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      {/* Hidden native checkbox for accessibility */}
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {/* Custom checkbox */}
      <button
        type="button"
        onClick={handleToggle}
        className="mt-1 h-5 w-5 rounded border flex items-center justify-center transition-all"
        style={
          checked
            ? {
                backgroundColor: '#7311d4',
                borderColor: '#7311d4',
                boxShadow: '0 0 0 2px rgba(115, 17, 212, 0.4)',
              }
            : {
                backgroundColor: 'rgba(15, 8, 26, 1)',
                borderColor: 'rgba(148, 163, 184, 0.6)',
              }
        }
        aria-pressed={checked}
        aria-label={label}
      >
        {checked && (
          <span className="material-symbols-outlined text-white text-base">
            check
          </span>
        )}
      </button>

      <label
        htmlFor={id}
        className="text-sm text-slate-400 leading-snug cursor-pointer"
        onClick={handleToggle}
      >
        {children}
      </label>
    </div>
  )
}

export default Checkbox

