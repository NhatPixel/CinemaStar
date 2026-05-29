import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../Button'
import CustomSelect from '../CustomSelect'
import Icon from '../Icon'
import Input from '../Input'
import SearchableSelect from '../SearchableSelect'
import Text from '../Text'
import { useToast } from '../useToast'
import {
  buildCreateShowtimePayload,
  buildUpdateShowtimePayload,
  countCreatedShowtimes,
  createShowtime,
  getShowtimeById,
  updateShowtime,
} from '../../api/showtime'
import {
  getShowtimeCinemaId,
  getShowtimeFilm,
  getShowtimeHall,
} from '../../pages/booking/bookingData'
import {
  SHOWTIME_STATUS_LABEL_VI,
  SHOWTIME_STATUS_OPTIONS,
} from '../../constants/showtimeStatusOptions'
import { useShowtimeFormOptions } from './useShowtimeFormOptions'

const EMPTY_FORM = {
  filmId: '',
  cinemaId: '',
  hallId: '',
  pricingPolicyId: '',
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

function showtimeToForm(showtime) {
  if (!showtime) return { ...EMPTY_FORM }
  const hall = getShowtimeHall(showtime)
  const film = getShowtimeFilm(showtime)
  return {
    filmId: showtime.filmId || film?.id || '',
    cinemaId: getShowtimeCinemaId(showtime) || hall?.cinemaId || '',
    hallId: showtime.hallId || hall?.id || '',
    pricingPolicyId: showtime.pricingPolicyId || showtime.pricingPolicy?.id || '',
    startTime: toDateInputValue(showtime.startDateTime || showtime.startTime),
    endTime: toDateInputValue(showtime.endDateTime || showtime.endTime),
    status: showtime.status || 'SCHEDULED',
  }
}

function readLabelFromDetail(detail, cinemaNameById = {}) {
  if (!detail) return {}
  const hall = getShowtimeHall(detail)
  const film = getShowtimeFilm(detail)
  const policy = detail.pricingPolicy
  const cinemaId = getShowtimeCinemaId(detail) || hall?.cinemaId
  return {
    filmId: detail.filmId || film?.id,
    filmLabel: film?.title || film?.name || detail.filmId,
    cinemaId,
    cinemaLabel: (cinemaId && cinemaNameById[cinemaId]) || cinemaId,
    hallId: detail.hallId || hall?.id,
    hallLabel: hall?.name || detail.hallId,
    pricingPolicyId: detail.pricingPolicyId || policy?.id,
    pricingPolicyLabel: policy?.name || detail.pricingPolicyId,
  }
}

/**
 * Modal tạo / chỉnh sửa / xem suất chiếu.
 */
function ShowtimeModal({
  isOpen,
  mode = 'create',
  showtimeId,
  cinemaNameById = {},
  onCancel,
  onSubmitted,
}) {
  const toast = useToast()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isView = mode === 'view'
  const readOnly = isView
  const formEnabled = isOpen && !readOnly

  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)

  const {
    filmOptions,
    cinemaOptions,
    hallOptions,
    pricingPolicyOptions,
    pricingLoading,
    filmLoading,
    filmLoadingMore,
    filmHasMore,
    cinemaLoading,
    hallLoading,
    hallLoadingMore,
    hallHasMore,
    onFilmSearchChange,
    onFilmLoadMore,
    onHallSearchChange,
    onHallLoadMore,
    injectSelectedLabels,
  } = useShowtimeFormOptions({
    enabled: formEnabled,
    cinemaId: form.cinemaId,
    toast,
  })

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
        injectSelectedLabels(readLabelFromDetail(data, cinemaNameById))
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
  }, [isOpen, isCreate, showtimeId, toast, onCancel, injectSelectedLabels, cinemaNameById])

  const handleChange = (e) => {
    if (readOnly) return
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'cinemaId' ? { hallId: '', pricingPolicyId: '' } : {}),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (readOnly || submitting || loadingDetail) return

    if (!form.pricingPolicyId) return toast.error('Vui lòng chọn chính sách giá')
    if (!form.startTime) return toast.error('Vui lòng chọn thời gian bắt đầu')
    if (!form.endTime) return toast.error('Vui lòng chọn thời gian kết thúc')
    if (new Date(form.endTime).getTime() <= new Date(form.startTime).getTime()) {
      return toast.error('Thời gian kết thúc phải sau thời gian bắt đầu')
    }

    if (isCreate) {
      if (!form.filmId) return toast.error('Vui lòng chọn phim')
      if (!form.cinemaId) return toast.error('Vui lòng chọn rạp')
      if (!form.hallId) return toast.error('Vui lòng chọn phòng chiếu')
    }

    const startDateTime = toApiDateTime(form.startTime)
    const endDateTime = toApiDateTime(form.endTime)

    try {
      setSubmitting(true)
      let data
      if (isEdit) {
        data = await updateShowtime(
          showtimeId,
          buildUpdateShowtimePayload({
            pricingPolicyId: form.pricingPolicyId,
            startDateTime,
            endDateTime,
            status: form.status,
          }),
        )
        toast.success(
          typeof data?.message === 'string'
            ? data.message
            : 'Cập nhật suất chiếu thành công',
        )
      } else {
        data = await createShowtime(
          buildCreateShowtimePayload({
            hallId: form.hallId,
            filmId: form.filmId,
            pricingPolicyId: form.pricingPolicyId,
            startDateTime,
            endDateTime,
            status: form.status,
          }),
        )
        const createdCount = countCreatedShowtimes(data)
        toast.success(
          createdCount > 0
            ? `Đã tạo ${createdCount} suất chiếu trong khung giờ đã chọn`
            : 'Tạo suất chiếu thành công',
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

  const labels = readLabelFromDetail(detail, cinemaNameById)

  const title = isView
    ? 'Chi tiết suất chiếu'
    : isEdit
      ? 'Chỉnh sửa suất chiếu'
      : 'Tạo suất chiếu mới'
  const subtitle = isView
    ? 'Thông tin suất chiếu từ hệ thống.'
    : isEdit
      ? 'Cập nhật chính sách giá, khung giờ và trạng thái (phim/phòng không đổi).'
      : 'Chọn phim, rạp, phòng, chính sách giá và khung giờ (hệ thống tạo nhiều suất trong khung).'

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
                  value={labels.filmLabel || '—'}
                  onChange={() => {}}
                  icon="movie"
                  disabled
                  readOnly
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Rạp"
                    name="cinemaName"
                    value={labels.cinemaLabel || '—'}
                    onChange={() => {}}
                    icon="festival"
                    disabled
                    readOnly
                  />
                  <Input
                    label="Phòng chiếu"
                    name="hallName"
                    value={labels.hallLabel || '—'}
                    onChange={() => {}}
                    icon="meeting_room"
                    disabled
                    readOnly
                  />
                </div>
              </>
            ) : isEdit ? (
              <>
                <Input
                  label="Phim"
                  name="filmName"
                  value={labels.filmLabel || '—'}
                  onChange={() => {}}
                  icon="movie"
                  disabled
                  readOnly
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Rạp (ID)"
                    name="cinemaName"
                    value={labels.cinemaLabel || '—'}
                    onChange={() => {}}
                    icon="festival"
                    disabled
                    readOnly
                  />
                  <Input
                    label="Phòng chiếu"
                    name="hallName"
                    value={labels.hallLabel || '—'}
                    onChange={() => {}}
                    icon="meeting_room"
                    disabled
                    readOnly
                  />
                </div>
              </>
            ) : (
              <>
                <SearchableSelect
                  label="Phim"
                  name="filmId"
                  value={form.filmId}
                  onChange={handleChange}
                  options={filmOptions}
                  placeholder={filmLoading ? 'Đang tải phim...' : 'Chọn phim đang chiếu'}
                  searchPlaceholder="Tìm theo tên phim..."
                  icon="movie"
                  serverSearch
                  onSearchChange={onFilmSearchChange}
                  onLoadMore={onFilmLoadMore}
                  hasMore={filmHasMore}
                  loading={filmLoading}
                  loadingMore={filmLoadingMore}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SearchableSelect
                    label="Rạp"
                    name="cinemaId"
                    value={form.cinemaId}
                    onChange={handleChange}
                    options={cinemaOptions}
                    placeholder={cinemaLoading ? 'Đang tải rạp...' : 'Chọn rạp'}
                    searchPlaceholder="Tìm theo tên rạp..."
                    icon="festival"
                    loading={cinemaLoading}
                  />
                  <SearchableSelect
                    label="Phòng chiếu"
                    name="hallId"
                    value={form.hallId}
                    onChange={handleChange}
                    options={hallOptions}
                    placeholder={
                      !form.cinemaId
                        ? 'Chọn rạp trước'
                        : hallLoading
                          ? 'Đang tải phòng...'
                          : 'Chọn phòng hoạt động'
                    }
                    searchPlaceholder="Tìm theo tên phòng..."
                    icon="meeting_room"
                    disabled={!form.cinemaId}
                    serverSearch
                    onSearchChange={onHallSearchChange}
                    onLoadMore={onHallLoadMore}
                    hasMore={hallHasMore}
                    loading={hallLoading}
                    loadingMore={hallLoadingMore}
                  />
                </div>
              </>
            )}

            {!readOnly ? (
              <CustomSelect
                label="Chính sách giá"
                name="pricingPolicyId"
                value={form.pricingPolicyId}
                onChange={handleChange}
                options={
                  pricingPolicyOptions.length > 0
                    ? pricingPolicyOptions
                    : [{ value: '', label: 'Chưa có chính sách giá' }]
                }
                placeholder={
                  !form.cinemaId
                    ? 'Chọn rạp trước'
                    : pricingLoading
                      ? 'Đang tải...'
                      : 'Chọn chính sách giá'
                }
                disabled={!form.cinemaId || pricingLoading}
              />
            ) : (
              <Input
                label="Chính sách giá"
                name="pricingPolicyView"
                value={labels.pricingPolicyLabel || '—'}
                onChange={() => {}}
                icon="payments"
                disabled
                readOnly
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={isCreate ? 'Khung giờ — bắt đầu' : 'Bắt đầu'}
                name="startTime"
                type={readOnly ? 'text' : 'datetime-local'}
                value={readOnly ? formatDateTime(form.startTime) : form.startTime}
                onChange={handleChange}
                icon="event"
                disabled={readOnly}
                readOnly={readOnly}
              />
              <Input
                label={isCreate ? 'Khung giờ — kết thúc' : 'Kết thúc'}
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
