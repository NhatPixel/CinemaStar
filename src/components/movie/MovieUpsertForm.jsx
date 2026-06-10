import { useEffect, useMemo, useState } from 'react'
import Button from '../Button'
import CustomSelect from '../CustomSelect'
import Icon from '../Icon'
import Input from '../Input'
import Text from '../Text'
import TextArea from '../TextArea'
import ImageUploadField from '../upload/ImageUploadField'
import VideoUploadField from '../upload/VideoUploadField'
import { useToast } from '../useToast'
import { createFilm, getFilmById, updateFilm } from '../../api/film'
import { AGE_RATING_OPTIONS } from '../../constants/ageRatingMeta'
import { MOVIE_STATUS_OPTIONS } from '../../constants/movieStatusOptions'

const EMPTY_FORM = {
  title: '',
  director: '',
  actor: '',
  type: '',
  country: '',
  releaseDate: '',
  language: '',
  duration: '',
  description: '',
  ageRating: 'RATING_1',
  status: 'NOW_SHOWING',
  trailerUrl: '',
  posterUrl: '',
}

const STATUS_LABELS = Object.fromEntries(
  MOVIE_STATUS_OPTIONS.map((option) => [option.value, option.label]),
)

function filmToFormData(film) {
  if (!film) return { ...EMPTY_FORM }
  return {
    title: film.title || '',
    director: film.director || '',
    actor: film.actor || '',
    type: film.type || '',
    country: film.country || '',
    releaseDate: film.releaseDate || '',
    language: film.language || '',
    duration: film.duration != null ? String(film.duration) : '',
    description: film.description || '',
    ageRating: film.ageRating || 'RATING_1',
    status: film.status || 'NOW_SHOWING',
    trailerUrl: film.trailer || '',
    posterUrl: film.poster || '',
  }
}

function formDataToPayload(formData) {
  return {
    duration: Number.parseInt(formData.duration, 10),
    country: formData.country.trim(),
    type: formData.type.trim(),
    releaseDate: formData.releaseDate,
    language: formData.language.trim(),
    ageRating: formData.ageRating,
    title: formData.title.trim(),
    description: formData.description.trim(),
    trailer: formData.trailerUrl.trim(),
    poster: formData.posterUrl.trim(),
    director: formData.director.trim(),
    actor: formData.actor.trim(),
    status: formData.status,
  }
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('vi-VN')
}

/**
 * Form tạo / chỉnh sửa / xem chi tiết phim.
 * - `mode`: `create` | `edit` | `view`
 * - `filmId`: bắt buộc với `edit` và `view` — gọi GET `/films/:id` khi mount.
 */
function MovieUpsertForm({ mode = 'create', filmId, onCancel, onSubmitted }) {
  const toast = useToast()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isView = mode === 'view'
  const readOnly = isView

  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ ...EMPTY_FORM })

  const ageRatingLabel = useMemo(
    () =>
      AGE_RATING_OPTIONS.find((option) => option.value === formData.ageRating)?.label ||
      formData.ageRating ||
      '—',
    [formData.ageRating],
  )

  const statusLabel = STATUS_LABELS[formData.status] || formData.status || '—'

  useEffect(() => {
    if (isCreate) {
      setDetail(null)
      setFormData({ ...EMPTY_FORM })
      setSubmitting(false)
      return undefined
    }
    if (!filmId) return undefined

    const controller = new AbortController()
    let cancelled = false
    setLoadingDetail(true)
  ;(async () => {
      try {
        const data = await getFilmById(filmId, { signal: controller.signal })
        if (cancelled) return
        setDetail(data)
        setFormData(filmToFormData(data))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được thông tin phim')
        onCancel?.()
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isCreate, filmId, toast, onCancel])

  const title = isView ? 'Chi tiết phim' : isEdit ? 'Chỉnh sửa phim' : 'Thêm phim mới'
  const subtitle = isView
    ? 'Thông tin chi tiết phim từ hệ thống.'
    : isEdit
      ? 'Cập nhật thông tin phim trong hệ thống CinemaStar.'
      : 'Nhập thông tin chi tiết để cập nhật phim vào hệ thống CinemaStar.'

  const handleChange = (e) => {
    if (readOnly) return
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    if (!formData.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề phim')
      return false
    }
    const duration = Number.parseInt(formData.duration, 10)
    if (!Number.isFinite(duration) || duration <= 0) {
      toast.error('Thời lượng phim phải lớn hơn 0')
      return false
    }
    if (!formData.releaseDate) {
      toast.error('Vui lòng chọn ngày phát hành')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (readOnly || submitting || loadingDetail) return
    if (!validate()) return

    const payload = formDataToPayload(formData)

    try {
      setSubmitting(true)
      let data
      if (isEdit) {
        data = await updateFilm(filmId, payload)
        toast.success(
          typeof data?.message === 'string'
            ? data.message
            : 'Cập nhật phim thành công',
        )
      } else {
        data = await createFilm(payload)
        toast.success(
          typeof data?.message === 'string' ? data.message : 'Tạo phim thành công',
        )
      }
      onSubmitted?.(data, { isEdit })
    } catch (err) {
      toast.error(
        err?.message || (isEdit ? 'Cập nhật phim thất bại' : 'Tạo phim thất bại'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const fieldProps = readOnly ? { disabled: true, readOnly: true } : {}

  return (
    <main className="flex-1 min-w-0 p-6 md:p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Text variant="h1" className="text-3xl font-bold tracking-tight">
            {title}
          </Text>
          <Text variant="small" className="text-slate-500 dark:text-slate-400">
            {subtitle}
          </Text>
        </div>
        <div className="hidden md:flex gap-4">
          <Button
            type="button"
            variant="ghost"
            className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-primary/30 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-primary/10"
            onClick={onCancel}
          >
            {isView ? 'Đóng' : 'Hủy'}
          </Button>
          {!isView ? (
            <Button
              form="movie-form"
              type="submit"
              className="px-5 py-2.5 rounded-lg font-semibold shadow-lg shadow-primary/20 flex items-center gap-2"
              disabled={submitting || loadingDetail}
            >
              <Icon name="save" />
              {submitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Lưu phim'}
            </Button>
          ) : null}
        </div>
      </header>

      {loadingDetail ? (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
          Đang tải thông tin phim...
        </div>
      ) : (
        <form id="movie-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              <section className="bg-white dark:bg-background-dark/30 border border-slate-200 dark:border-primary/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Icon name="info" className="text-primary" />
                  Thông tin cơ bản
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Tiêu đề phim
                    </label>
                    <Input
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Nhập tiêu đề phim"
                      {...fieldProps}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Đạo diễn
                    </label>
                    <Input
                      name="director"
                      value={formData.director}
                      onChange={handleChange}
                      placeholder="Tên đạo diễn"
                      {...fieldProps}
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Diễn viên
                    </label>
                    <Input
                      name="actor"
                      value={formData.actor}
                      onChange={handleChange}
                      placeholder="Tên diễn viên (phân cách bằng dấu phẩy)"
                      {...fieldProps}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Thể loại
                    </label>
                    <Input
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      placeholder="Hành động, Phiêu lưu..."
                      {...fieldProps}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Quốc gia
                    </label>
                    <Input
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="Việt Nam, Mỹ..."
                      {...fieldProps}
                    />
                  </div>
                </div>
              </section>

              <section className="bg-white dark:bg-background-dark/30 border border-slate-200 dark:border-primary/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Icon name="link" className="text-primary" />
                  Media &amp; Phân loại
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    {readOnly ? (
                      <Input
                        label="Phân loại độ tuổi"
                        name="ageRating"
                        value={ageRatingLabel}
                        onChange={() => {}}
                        disabled
                        readOnly
                      />
                    ) : (
                      <CustomSelect
                        label="Phân loại độ tuổi"
                        name="ageRating"
                        value={formData.ageRating}
                        onChange={handleChange}
                        options={AGE_RATING_OPTIONS}
                        placeholder="Chọn phân loại"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {readOnly ? (
                      <Input
                        label="Trạng thái phim"
                        name="status"
                        value={statusLabel}
                        onChange={() => {}}
                        disabled
                        readOnly
                      />
                    ) : (
                      <CustomSelect
                        label="Trạng thái phim"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        options={MOVIE_STATUS_OPTIONS}
                        placeholder="Chọn trạng thái"
                      />
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <VideoUploadField
                      label="Trailer video"
                      value={formData.trailerUrl}
                      onChange={(url) =>
                        setFormData((prev) => ({ ...prev, trailerUrl: url || '' }))
                      }
                      disabled={submitting || loadingDetail}
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              </section>

              <section className="bg-white dark:bg-background-dark/30 border border-slate-200 dark:border-primary/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Icon name="description" className="text-primary" />
                  Chi tiết &amp; Mô tả
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Ngày phát hành
                    </label>
                    <Input
                      name="releaseDate"
                      type="date"
                      value={formData.releaseDate}
                      onChange={handleChange}
                      {...fieldProps}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Ngôn ngữ
                    </label>
                    <Input
                      name="language"
                      value={formData.language}
                      onChange={handleChange}
                      placeholder="Phụ đề Tiếng Việt"
                      {...fieldProps}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Thời lượng (phút)
                    </label>
                    <Input
                      name="duration"
                      type="number"
                      value={formData.duration}
                      onChange={handleChange}
                      placeholder="120"
                      {...fieldProps}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <TextArea
                    label="Mô tả phim"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Nhập nội dung tóm tắt phim..."
                    {...fieldProps}
                  />
                </div>
              </section>

              {isView ? (
                <section className="bg-white dark:bg-background-dark/30 border border-slate-200 dark:border-primary/10 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Icon name="schedule" className="text-primary" />
                    Thông tin hệ thống
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Ngày tạo"
                      name="createdAt"
                      value={formatDateTime(detail?.timeCreated || detail?.createdAt)}
                      onChange={() => {}}
                      icon="event"
                      disabled
                      readOnly
                    />
                    <Input
                      label="Cập nhật lần cuối"
                      name="updatedAt"
                      value={formatDateTime(detail?.timeUpdated || detail?.updatedAt)}
                      onChange={() => {}}
                      icon="update"
                      disabled
                      readOnly
                    />
                  </div>
                </section>
              ) : null}
            </div>

            <div className="space-y-8">
              <section className="bg-white dark:bg-background-dark/30 border border-slate-200 dark:border-primary/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Icon name="image" className="text-primary" />
                  Poster Preview
                </h3>
                <ImageUploadField
                  label="Poster phim"
                  value={formData.posterUrl}
                  onChange={(url) =>
                    setFormData((prev) => ({ ...prev, posterUrl: url || '' }))
                  }
                  disabled={submitting || loadingDetail}
                  readOnly={readOnly}
                />
              </section>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-primary/20 flex gap-4 md:hidden">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 py-3 rounded-lg border border-slate-200 dark:border-primary/30 text-slate-600 dark:text-slate-300 font-bold"
              onClick={onCancel}
            >
              {isView ? 'Đóng' : 'Hủy'}
            </Button>
            {!isView ? (
              <Button
                type="submit"
                className="flex-1 py-3 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/20"
                disabled={submitting || loadingDetail}
              >
                {submitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Lưu phim'}
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </main>
  )
}

export default MovieUpsertForm
