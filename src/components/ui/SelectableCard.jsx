import Icon from './Icon'

function SelectableCard({ selected, icon, label, onClick, className = '' }) {
  const baseStyle = {
    padding: '1rem',
    borderRadius: '0.75rem',
    borderWidth: '1px',
    transition: 'all 150ms ease',
  }

  const selectedStyle = {
    backgroundColor: '#7311d4',
    borderColor: '#7311d4',
  }

  const unselectedStyle = {
    backgroundColor: 'rgba(115, 17, 212, 0.05)',
    borderColor: 'rgba(115, 17, 212, 0.2)',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center group ${className}`}
      style={{ ...baseStyle, ...(selected ? selectedStyle : unselectedStyle) }}
    >
      {icon && (
        <Icon
          name={icon}
          className={`mb-1 text-xl ${
            selected ? 'text-white' : 'text-slate-300'
          }`}
        />
      )}
      <span
        className={`text-xs font-bold ${
          selected ? 'text-white' : 'text-slate-300'
        }`}
      >
        {label}
      </span>
    </button>
  )
}

export default SelectableCard

