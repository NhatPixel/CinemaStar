/* eslint-disable react/prop-types */
function Toast({ message, variant = 'info', onDismiss }) {
  const variants = {
    success:
      'border-l-emerald-500 text-emerald-50 [&_svg]:text-emerald-400',
    error: 'border-l-red-500 text-red-50 [&_svg]:text-red-400',
    warning:
      'border-l-amber-500 text-amber-50 [&_svg]:text-amber-400',
    info: 'border-l-[#7311d4] text-slate-100 [&_svg]:text-violet-400',
  }

  return (
    <div
      role="status"
      className={`
        pointer-events-auto flex max-w-md min-w-[280px] items-start gap-3 rounded-lg border border-slate-700/80
        border-l-4 bg-slate-900/95 px-4 py-3 shadow-lg shadow-black/40 backdrop-blur-sm
        ${variants[variant] ?? variants.info}
      `}
    >
      <span className="mt-0.5 shrink-0" aria-hidden>
        {variant === 'success' && (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {variant === 'error' && (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {variant === 'warning' && (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        {variant === 'info' && (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </span>
      <p className="flex-1 text-sm leading-snug">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="-m-1 shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        aria-label="Đóng"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default Toast
