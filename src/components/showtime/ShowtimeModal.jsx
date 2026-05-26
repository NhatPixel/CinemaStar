import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../Button'
import CustomSelect from '../CustomSelect'
import Icon from '../Icon'
import Input from '../Input'
import Text from '../Text'
import { useToast } from '../useToast'
import {
  createShowtime,
  getShowtimeById,
  updateShowtime,
} from '../../api/showtime'
import {
  SHOWTIME_STATUS_LABEL_VI,
  SHOWTIME_STATUS_OPTIONS,
} from '../../constants/showtimeStatusOptions'

const EMPTY_FORM = {
  filmId: '',
  cinemaId: '',
  hallId: '',
  startTime: '',
  endTime: '',
  status: 'SCHEDULED',
}

function toDateInputValue(value) {
  if (!value) return ''
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw.slice(0, 16)
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function toApiDateTime(value) {
  if (!value) return ''
  return value.length === 16 ? `${value}:00` : value
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).replace('T', ' ').slice(0, 16)
  return d.toLocaleString('vi-VN')
}

function findLabel(options, value, fallback = '—') {
  if (!value) return fallback
  return options.find((opt) => opt.value === value)?.label || value
}

function showtimeToForm(showtime) {
  if (!showtime) return { ...EMPTY_FORM }
  return {
    filmId: showtime.filmId || showtime.film?.id || showtime.filmResponse?.id || '',
    cinemaId:
      showtime.cinemaId || showtime.cinema?.id || showtime.cinemaResponse?.id || '',
    hallId: showtime.hallId || showtime.hall?.id || showtime.hallResponse?.id || '',
    startTime: toDateInputValue(showtime.startTime || showtime.startDateTime),
    endTime: toDateInputValue(showtime.endTime || showtime.endDateTime),
    status: showtime.status || 'SCHEDULED',
  }
}

/**
 * Modal tạo / chỉnh sửa / xem suất chiếu.
 * @param {{
 *   isOpen: boolean,
 *   mode?: 'create' | 'edit' | 'view',
 *   showtimeId?: string,
 *   filmOptions?: Array<{ value: string, label: string }>,
 *   cinemaOptions?: Array<{ value: string, label: string }>,
 *   hallOptions?: Array<{ value: string, label: string, cinemaId?: string }>,
 *   onCancel?: () => void,
 *   onSubmitted?: (data: unknown, meta: { isEdit: boolean }) => void,
 * }} props
 */
function ShowtimeModal({
  isOpen,
  mode = 'create',
  showtimeId,
  filmOptions = [],
  cinemaOptions = [],
  hallOptions = [],
  onCancel,
  onSubmitted,
}) {
  const toast = useToast()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isView = mode === 'view'
  const readOnly = isView

  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return undefined
    if (isCreate) {
      setDetail(null)
      setForm({ ...EMPTY_FORM })
      setSubmitting(false)
      return undefined
    }
    if (!showtimeId) return undefined

    const controller = new AbortController()
    let cancelled = false
    setLoadingDetail(true)

    ;(async () => {
      try {
        const data = await getShowtimeById(showtimeId, { signal: controller.signal })
        if (cancelled) return
        setDetail(data)
        setForm(showtimeToForm(data))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được thông tin suất chiếu')
        onCancel?.()
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isOpen, isCreate, showtimeId, toast, onCancel])

  const filteredHallOptions = form.cinemaId
    ? hallOptions.filter((opt) => !opt.cinemaId || opt.cinemaId === form.cinemaId)
    : hallOptions

  const handleChange = (e) => {
    if (readOnly) return
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'cinemaId' ? { hallId: '' } : {}),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (readOnly || submitting || loadingDetail) return

    if (!form.filmId) return toast.error('Vui lòng chọn phim')
    if (!form.hallId) return toast.error('Vui lòng chọn phòng chiếu')
    if (!form.startTime) return toast.error('Vui lòng chọn thời gian bắt đầu')
    if (!form.endTime) return toast.error('Vui lòng chọn thời gian kết thúc')
    if (new Date(form.endTime).getTime() <= new Date(form.startTime).getTime()) {
      return toast.error('Thời gian kết thúc phải sau thời gian bắt đầu')
    }

    const selectedHall = hallOptions.find((opt) => opt.value === form.hallId)
    const payload = {
      filmId: form.filmId,
      cinemaId: form.cinemaId || selectedHall?.cinemaId || undefined,
      hallId: form.hallId,
      startTime: toApiDateTime(form.startTime),
      endTime: toApiDateTime(form.endTime),
      status: form.status,
    }

    try {
      setSubmitting(true)
      let data
      if (isEdit) {
        data = await updateShowtime(showtimeId, payload)
        toast.success(
          typeof data?.message === 'string'
            ? data.message
            : 'Cập nhật suất chiếu thành công',
        )
      } else {
        data = await createShowtime(payload)
        toast.success(
          typeof data?.message === 'string' ? data.message : 'Tạo suất chiếu thành công',
        )
      }
      onSubmitted?.(data, { isEdit })
    } catch (err) {
      toast.error(
        err?.message ||
          (isEdit ? 'Cập nhật suất chiếu thất bại' : 'Tạo suất chiếu thất bại'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const title = isView
    ? 'Chi tiết suất chiếu'
    : isEdit
      ? 'Chỉnh sửa suất chiếu'
      : 'Tạo suất chiếu mới'
  const subtitle = isView
    ? 'Thông tin suất chiếu từ hệ thống.'
    : 'Chọn phim, phòng chiếu và khung giờ chiếu.'

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={`Đóng modal ${title.toLowerCase()}`}
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!submitting && !loadingDetail) onCancel?.()
        }}
      />
      <div className="relative z-[101] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-primary/20 dark:bg-background-dark">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <Text variant="h2" className="text-2xl font-bold text-slate-900 dark:text-white">
              {title}
            </Text>
            <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </Text>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            disabled={submitting}
            onClick={onCancel}
          >
            <Icon name="close" />
          </Button>
        </div>

        {loadingDetail ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 mb-5">
            Đang tải thông tin suất chiếu...
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {readOnly ? (
              <>
                <Input
                  label="Phim"
                  name="filmName"
                  value={findLabel(filmOptions, form.filmId)}
                  onChange={() => {}}
                  icon="movie"
                  disabled
                  readOnly
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Rạp"
                    name="cinemaName"
                    value={findLabel(cinemaOptions, form.cinemaId)}
                    onChange={() => {}}
                    icon="festival"
                    disabled
                    readOnly
                  />
                  <Input
                    label="Phòng chiếu"
                    name="hallName"
                    value={findLabel(hallOptions, form.hallId)}
                    onChange={() => {}}
                    icon="meeting_room"
                    disabled
                    readOnly
                  />
                </div>
              </>
            ) : (
              <>
                <CustomSelect
                  label="Phim"
                  name="filmId"
                  value={form.filmId}
                  onChange={handleChange}
                  options={filmOptions}
                  placeholder="Chọn phim"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomSelect
                    label="Rạp"
                    name="cinemaId"
                    value={form.cinemaId}
                    onChange={handleChange}
                    options={cinemaOptions}
                    placeholder="Chọn rạp"
                  />
                  <CustomSelect
                    label="Phòng chiếu"
                    name="hallId"
                    value={form.hallId}
                    onChange={handleChange}
                    options={filteredHallOptions}
                    placeholder="Chọn phòng"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Bắt đầu"
                name="startTime"
                type={readOnly ? 'text' : 'datetime-local'}
                value={readOnly ? formatDateTime(form.startTime) : form.startTime}
                onChange={handleChange}
                icon="event"
                disabled={readOnly}
                readOnly={readOnly}
              />
              <Input
                label="Kết thúc"
                name="endTime"
                type={readOnly ? 'text' : 'datetime-local'}
                value={readOnly ? formatDateTime(form.endTime) : form.endTime}
                onChange={handleChange}
                icon="schedule"
                disabled={readOnly}
                readOnly={readOnly}
              />
            </div>

            {readOnly ? (
              <Input
                label="Trạng thái"
                name="status"
                value={SHOWTIME_STATUS_LABEL_VI[form.status] || form.status || '—'}
                onChange={() => {}}
                icon="toggle_on"
                disabled
                readOnly
              />
            ) : (
              <CustomSelect
                label="Trạng thái"
                name="status"
                value={form.status}
                onChange={handleChange}
                options={SHOWTIME_STATUS_OPTIONS}
                placeholder="Chọn trạng thái"
              />
            )}

            {isView && showtimeId ? (
              <Text variant="small" className="text-xs text-slate-400">
                ID: {showtimeId}
              </Text>
            ) : null}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={submitting}
                className="px-6 py-3 rounded-xl font-bold"
              >
                {readOnly ? 'Đóng' : 'Hủy'}
              </Button>
              {!readOnly ? (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl font-bold"
                >
                  {submitting
                    ? 'Đang lưu...'
                    : isEdit
                      ? 'Lưu thay đổi'
                      : 'Tạo suất chiếu'}
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default ShowtimeModal
