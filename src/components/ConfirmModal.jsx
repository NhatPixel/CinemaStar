import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Button from './Button'

function ConfirmModal({
  isOpen = false,
  title = 'Xác nhận',
  message = 'Bạn có chắc chắn muốn tiếp tục?',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  disableConfirm = false,
  closeOnOverlayClick = true,
}) {
  useEffect(() => {
    if (!isOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel?.()
        return
      }

      if (event.key === 'Enter' && !disableConfirm) {
        onConfirm?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onCancel, onConfirm, disableConfirm])

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Đóng modal xác nhận"
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (closeOnOverlayClick) {
            onCancel?.()
          }
        }}
      />
      <div className="relative z-[121] w-full max-w-md rounded-2xl border border-primary/20 bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={onCancel}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            size="sm"
            className="rounded-lg px-4 py-2"
            onClick={onConfirm}
            disabled={disableConfirm}
          >
            Đồng ý
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmModal
