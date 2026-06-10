import { useRef, useState } from 'react'
import Button from '../Button'
import Icon from '../Icon'
import Text from '../Text'
import { useToast } from '../useToast'
import { uploadVideoFile } from '../../api/upload'
import { isDirectVideoUrl, isYoutubeTrailerUrl, resolveMediaUrl } from '../../utils/mediaUrl'

const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.mov,.avi,.mkv'

function VideoUploadField({
  label = 'Trailer video',
  value = '',
  onChange,
  disabled = false,
  readOnly = false,
}) {
  const toast = useToast()
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedName, setSelectedName] = useState('')

  const mediaUrl = resolveMediaUrl(value)
  const hasVideo = Boolean(mediaUrl)
  const isLegacyYoutube = isYoutubeTrailerUrl(value)

  const handlePickFile = () => {
    if (disabled || readOnly || uploading) return
    inputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || readOnly || disabled) return

    setSelectedName(file.name)
    setUploading(true)
    setProgress(0)

    try {
      const url = await uploadVideoFile(file, {
        onProgress: (percent) => setProgress(Math.min(100, Math.max(0, percent))),
      })
      onChange?.(url)
      toast.success('Tải trailer video thành công')
    } catch (err) {
      toast.error(err?.message || 'Tải video thất bại')
    } finally {
      setUploading(false)
      setSelectedName('')
    }
  }

  const handleClear = () => {
    if (disabled || readOnly || uploading) return
    onChange?.('')
    setProgress(0)
    setSelectedName('')
  }

  return (
    <div className="flex flex-col gap-3">
      <Text variant="caption" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </Text>

      {readOnly ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 break-all">{value || '—'}</p>
      ) : null}

      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-black shadow-inner dark:border-primary/20">
        {hasVideo && isDirectVideoUrl(value) ? (
          <video
            key={mediaUrl}
            src={mediaUrl}
            controls
            className="h-full w-full object-contain"
            preload="metadata"
          />
        ) : hasVideo && isLegacyYoutube ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-slate-300">
            <Icon name="smart_display" className="text-4xl text-primary" />
            <p className="text-sm">Trailer YouTube (URL cũ)</p>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline break-all"
            >
              {value}
            </a>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-400">
            <Icon name="movie" className="text-5xl opacity-60" />
            <p className="text-sm">Chưa có trailer video</p>
            {!readOnly ? (
              <p className="text-xs text-slate-500">Hỗ trợ MP4, MOV, AVI, MKV</p>
            ) : null}
          </div>
        )}
      </div>

      {!readOnly ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={VIDEO_ACCEPT}
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
              {uploading ? 'Đang tải lên...' : hasVideo ? 'Đổi video' : 'Chọn video'}
            </Button>
            {hasVideo ? (
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

          {uploading ? (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.round(progress)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedName ? `${selectedName} — ` : ''}
                {Math.round(progress)}%
              </p>
            </div>
          ) : null}

          {hasVideo && !uploading ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 break-all">URL: {value}</p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export default VideoUploadField
