/* eslint-disable react/prop-types */
import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import Toast from './Toast'
import { ToastContext } from './toastContext'

let toastId = 0
function nextId() {
  toastId += 1
  return toastId
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())
  const baseId = useId()

  const remove = useCallback((id) => {
    const t = timersRef.current.get(id)
    if (t) {
      clearTimeout(t)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const showToast = useCallback(
    (message, options = {}) => {
      const { variant = 'info', duration = 4500 } = options

      const id = `${baseId}-${nextId()}`
      setToasts((prev) => [...prev, { id, message, variant }])

      if (duration > 0) {
        const timer = setTimeout(() => remove(id), duration)
        timersRef.current.set(id, timer)
      }

      return id
    },
    [baseId, remove],
  )

  const value = useMemo(
    () => ({
      showToast,
      success: (message, opts) =>
        showToast(message, { ...opts, variant: 'success' }),
      error: (message, opts) =>
        showToast(message, { ...opts, variant: 'error' }),
      warning: (message, opts) =>
        showToast(message, { ...opts, variant: 'warning' }),
      info: (message, opts) =>
        showToast(message, { ...opts, variant: 'info' }),
    }),
    [showToast],
  )

  const portal =
    typeof document !== 'undefined'
      ? createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {toasts.map((t) => (
              <Toast
                key={t.id}
                message={t.message}
                variant={t.variant}
                onDismiss={() => remove(t.id)}
              />
            ))}
          </div>,
          document.body,
        )
      : null

  return (
    <ToastContext.Provider value={value}>
      {children}
      {portal}
    </ToastContext.Provider>
  )
}
