import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../Button'
import CustomSelect from '../CustomSelect'
import Icon from '../Icon'
import Input from '../Input'
import Text from '../Text'
import { useToast } from '../useToast'
import {
  buildHallWritePayload,
  createHall,
  getHallById,
  updateHall,
} from '../../api/hall'
import {
  HALL_STATUS_LABEL_VI,
  HALL_STATUS_OPTIONS,
} from '../../constants/hallStatusOptions'
import HallLayoutForm from './HallLayoutForm'
import {
  DEFAULT_LAYOUT_COLS,
  DEFAULT_LAYOUT_ROWS,
  createEmptyLayoutDefinition,
  seatsToLayoutDefinition,
} from './hallLayoutUtils'

const EMPTY_FORM = {
  name: '',
  status: 'ACTIVE',
  cinemaId: '',
}

function hallToForm(hall) {
  if (!hall) return { ...EMPTY_FORM }
  return {
    name: hall.name || '',
    status: hall.status || 'ACTIVE',
    cinemaId: hall.cinemaId || hall.cinemaResponse?.id || '',
  }
}

function defaultCinemaId(cinemaOptions) {
  if (!Array.isArray(cinemaOptions) || cinemaOptions.length !== 1) return ''
  return cinemaOptions[0]?.value || ''
}

function imagePathsFromHall(hall) {
  if (!hall?.images?.length) return []
  return hall.images.map((img) => img.imagePath).filter(Boolean)
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('vi-VN')
}

function countLayoutSeats(layout) {
  if (!layout?.cells?.length) return 0
  return layout.cells.filter((c) => c.type === 'SEAT').length
}

/**
 * Modal tạo / chỉnh sửa / xem phòng chiếu.
 * - `mode`: `create` | `edit` | `view`
 * - `hallId`: bắt buộc với `edit` và `view` — GET `/halls/:id`
 */
function HallModal({ isOpen, mode = 'create', hallId, cinemaOptions = [], onCancel, onSubmitted }) {
  const toast = useToast()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isView = mode === 'view'
  const readOnly = isView

  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [layoutDefinition, setLayoutDefinition] = useState(() =>
    createEmptyLayoutDefinition(DEFAULT_LAYOUT_ROWS, DEFAULT_LAYOUT_COLS),
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return undefined
    if (isCreate) {
      setDetail(null)
      setForm({ ...EMPTY_FORM, cinemaId: defaultCinemaId(cinemaOptions) })
      setLayoutDefinition(createEmptyLayoutDefinition(DEFAULT_LAYOUT_ROWS, DEFAULT_LAYOUT_COLS))
      setSubmitting(false)
      return undefined
    }
    if (!hallId) return undefined

    const controller = new AbortController()
    let cancelled = false
    setLoadingDetail(true)
    ;(async () => {
      try {
        const data = await getHallById(hallId, { signal: controller.signal })
        if (cancelled) return
        setDetail(data)
        setForm(hallToForm(data))
        setLayoutDefinition(
          seatsToLayoutDefinition(data?.seats, DEFAULT_LAYOUT_ROWS, DEFAULT_LAYOUT_COLS),
        )
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được thông tin phòng chiếu')
        onCancel?.()
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isOpen, isCreate, hallId, cinemaOptions, toast, onCancel])

  useEffect(() => {
    if (!isOpen || !isCreate || readOnly) return
    const fallbackId = defaultCinemaId(cinemaOptions)
    if (!fallbackId) return
    setForm((prev) => (prev.cinemaId ? prev : { ...prev, cinemaId: fallbackId }))
  }, [isOpen, isCreate, readOnly, cinemaOptions])

  const handleChange = (e) => {
    if (readOnly) return
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (readOnly || submitting || loadingDetail) return

    const name = form.name.trim()
    if (!name) return toast.error('Vui lòng nhập tên phòng')

    const cinemaId = String(form.cinemaId || '').trim()
    if (!cinemaId) return toast.error('Vui lòng chọn rạp')

    const seatCells = countLayoutSeats(layoutDefinition)
    if (seatCells < 1) {
      return toast.error('Vui lòng vẽ ít nhất một ghế trên sơ đồ')
    }

    const payload = buildHallWritePayload({
      name,
      status: form.status,
      layoutDefinition,
      cinemaId,
      imagePaths: imagePathsFromHall(detail),
    })

    try {
      setSubmitting(true)
      let data
      if (isEdit) {
        data = await updateHall(hallId, payload)
        toast.success(
          typeof data?.message === 'string'
            ? data.message
            : 'Cập nhật phòng chiếu thành công',
        )
      } else {
        data = await createHall(payload)
        toast.success(
          typeof data?.message === 'string' ? data.message : 'Tạo phòng chiếu thành công',
        )
      }
      onSubmitted?.(data, { isEdit })
    } catch (err) {
      toast.error(
        err?.message ||
          (isEdit ? 'Cập nhật phòng chiếu thất bại' : 'Tạo phòng chiếu thất bại'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const title = isView
    ? 'Chi tiết phòng chiếu'
    : isEdit
      ? 'Chỉnh sửa phòng chiếu'
      : 'Tạo phòng chiếu mới'
  const subtitle = isView
    ? 'Thông tin phòng chiếu từ hệ thống.'
    : isEdit
      ? 'Cập nhật thông tin và sơ đồ ghế.'
      : 'Nhập thông tin và vẽ sơ đồ ghế cho phòng mới.'

  const seatTotal = detail?.seats?.length ?? countLayoutSeats(layoutDefinition)

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
      <div className="relative z-[101] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-primary/20 dark:bg-background-dark">
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
            Đang tải thông tin phòng chiếu...
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Tên phòng"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Phòng chiếu 1"
                icon="meeting_room"
                disabled={readOnly}
                readOnly={readOnly}
              />
              {readOnly ? (
                <Input
                  label="Rạp"
                  name="cinemaName"
                  value={detail?.cinemaResponse?.name || detail?.cinemaId || '—'}
                  onChange={() => {}}
                  icon="theaters"
                  disabled
                  readOnly
                />
              ) : (
                <CustomSelect
                  label="Rạp"
                  name="cinemaId"
                  value={form.cinemaId}
                  onChange={handleChange}
                  options={
                    cinemaOptions.length > 0
                      ? cinemaOptions
                      : [{ value: '', label: 'Chưa có rạp được gán' }]
                  }
                  disabled={cinemaOptions.length === 0}
                  placeholder="Chọn rạp"
                />
              )}
            </div>

            {isView && detail ? (
              <Input
                label="Số ghế"
                name="seatCount"
                value={String(seatTotal)}
                onChange={() => {}}
                icon="event_seat"
                disabled
                readOnly
              />
            ) : null}

            <CustomSelect
              label="Trạng thái"
              name="status"
              value={form.status}
              onChange={handleChange}
              options={HALL_STATUS_OPTIONS}
              disabled={readOnly}
            />

            <div>
              <Text
                variant="small"
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block"
              >
                Sơ đồ ghế
              </Text>
              <HallLayoutForm
                mode={readOnly ? 'view' : 'editor'}
                value={layoutDefinition}
                onChange={readOnly ? undefined : setLayoutDefinition}
              />
            </div>

            {isView && detail ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <Input
                  label="Ngày tạo"
                  name="timeCreated"
                  value={formatDateTime(detail.timeCreated)}
                  onChange={() => {}}
                  icon="event"
                  disabled
                  readOnly
                />
                <Input
                  label="Cập nhật"
                  name="timeUpdated"
                  value={formatDateTime(detail.timeUpdated)}
                  onChange={() => {}}
                  icon="update"
                  disabled
                  readOnly
                />
              </div>
            ) : null}

            {isView && hallId ? (
              <Text variant="small" className="text-xs text-slate-400">
                ID: {hallId}
                {form.status
                  ? ` · ${HALL_STATUS_LABEL_VI[form.status] || form.status}`
                  : ''}
              </Text>
            ) : null}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={submitting}
              >
                {isView ? 'Đóng' : 'Hủy'}
              </Button>
              {!isView ? (
                <Button type="submit" variant="primary" disabled={submitting || loadingDetail}>
                  {submitting
                    ? 'Đang lưu...'
                    : isEdit
                      ? 'Lưu thay đổi'
                      : 'Tạo phòng'}
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

export default HallModal
