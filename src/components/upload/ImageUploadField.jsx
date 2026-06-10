import { useRef, useState } from 'react'
import Button from '../Button'
import Icon from '../Icon'
import Text from '../Text'
import { useToast } from '../useToast'
import { uploadImageFile } from '../../api/upload'
import { resolveMediaUrl } from '../../utils/mediaUrl'

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif'

function ImageUploadField({
  label = 'Poster phim',
  value = '',
  onChange,
  disabled = false,
  readOnly = false,
  aspectClass = 'aspect-[2/3]',
  objectFit = 'cover',
  hint = 'Kích thước khuyến nghị: 600×900px (tỷ lệ 2:3)',
}) {
  const toast = useToast()
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const previewUrl = resolveMediaUrl(value)
  const hasImage = Boolean(previewUrl)

  const handlePickFile = () => {
    if (disabled || readOnly || uploading) return
    inputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || readOnly || disabled) return

    setUploading(true)
    try {
      const url = await uploadImageFile(file)
      onChange?.(url)
      toast.success('Tải ảnh thành công')
    } catch (err) {
      toast.error(err?.message || 'Tải ảnh thất bại')
    } finally {
      setUploading(false)
    }
  }

  const handleClear = () => {
    if (disabled || readOnly || uploading) return
    onChange?.('')
  }

  return (
    <div className="flex flex-col gap-3">
      <Text variant="caption" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </Text>

      {readOnly ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 break-all">{value || '—'}</p>
      ) : null}

      <div
        className={`relative w-full overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 dark:border-primary/30 dark:bg-background-dark/50 ${aspectClass}`}
      >
        {hasImage ? (
          <img
            key={previewUrl}
            alt="Preview"
            src={previewUrl}
            className={
              objectFit === 'contain'
                ? 'absolute inset-0 h-full w-full object-contain'
                : 'absolute inset-0 h-full w-full object-cover'
            }
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-400">
            <Icon name="add_photo_alternate" className="text-5xl opacity-60" />
            <p className="text-sm">Chưa có ảnh</p>
            {!readOnly ? (
              <p className="text-xs text-slate-500">JPEG, PNG, WebP, GIF</p>
            ) : null}
          </div>
        )}
      </div>

      {!readOnly ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="inline-flex items-center gap-2"
              onClick={handlePickFile}
              disabled={disabled || uploading}
            >
              <Icon name="upload" />
              {uploading ? 'Đang tải lên...' : hasImage ? 'Đổi ảnh' : 'Chọn ảnh'}
            </Button>
            {hasImage ? (
              <Button
                type="button"
                variant="ghost"
                className="inline-flex items-center gap-2 border border-slate-200 dark:border-primary/20"
                onClick={handleClear}
                disabled={disabled || uploading}
              >
                <Icon name="delete" />
                Xóa
              </Button>
            ) : null}
          </div>

          {hasImage && !uploading ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 break-all">URL: {value}</p>
          ) : null}
        </>
      ) : null}

      {hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center italic">{hint}</p>
      ) : null}
    </div>
  )
}

export default ImageUploadField
