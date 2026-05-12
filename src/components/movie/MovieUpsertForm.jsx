import { useEffect, useState } from 'react'
import Button from '../Button'
import ConfirmModal from '../ConfirmModal'
import CustomSelect from '../CustomSelect'
import Icon from '../Icon'
import Input from '../Input'
import Text from '../Text'
import TextArea from '../TextArea'
import { useToast } from '../useToast'
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

/**
 * Form chung cho trang tạo và chỉnh sửa phim. Dùng bởi `MovieCreate` & `MovieEdit`.
 *
 * @param {object} props
 * @param {string} props.title - Tiêu đề trang.
 * @param {string} props.subtitle - Mô tả dưới tiêu đề.
 * @param {object|null} [props.initialData] - Dữ liệu phim ban đầu (cho edit). Null/undefined → form rỗng.
 * @param {boolean} [props.loading] - Đang tải dữ liệu ban đầu (edit). Disabled submit + show banner.
 * @param {{ title: string, message: string }|null} [props.confirm] - Cần ConfirmModal trước khi submit?
 * @param {string} [props.submitLabel] - Nhãn nút submit (default: "Lưu phim").
 * @param {(payload: object) => Promise<void>} props.onSubmit - Gọi khi submit; payload đã trim/parse.
 * @param {() => void} props.onCancel - Gọi khi user bấm "Hủy".
 */
function MovieUpsertForm({
  title,
  subtitle,
  initialData = null,
  loading = false,
  confirm = null,
  submitLabel = 'Lưu phim',
  onSubmit,
  onCancel,
}) {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formData, setFormData] = useState(() => filmToFormData(initialData))

  useEffect(() => {
    setFormData(filmToFormData(initialData))
  }, [initialData])

  const handleChange = (e) => {
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

  const runSubmit = async () => {
    if (typeof onSubmit !== 'function') return
    const payload = formDataToPayload(formData)
    try {
      setSubmitting(true)
      await onSubmit(payload)
    } catch (_e) {
      // Caller đã hiển thị toast; ta chỉ reset trạng thái nút.
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (submitting || loading) return
    if (!validate()) return
    if (confirm) {
      setShowConfirm(true)
    } else {
      runSubmit()
    }
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    runSubmit()
  }

  return (
    <>
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
              Hủy
            </Button>
            <Button
              form="movie-form"
              type="submit"
              className="px-5 py-2.5 rounded-lg font-semibold shadow-lg shadow-primary/20 flex items-center gap-2"
              disabled={submitting || loading}
            >
              <Icon name="save" />
              {submitting ? 'Đang lưu...' : submitLabel}
            </Button>
          </div>
        </header>

        {loading && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            Đang tải thông tin phim...
          </div>
        )}

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
                    <CustomSelect
                      label="Phân loại độ tuổi"
                      name="ageRating"
                      value={formData.ageRating}
                      onChange={handleChange}
                      options={AGE_RATING_OPTIONS}
                      placeholder="Chọn phân loại"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <CustomSelect
                      label="Trạng thái phim"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      options={MOVIE_STATUS_OPTIONS}
                      placeholder="Chọn trạng thái"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="URL Trailer"
                      name="trailerUrl"
                      type="url"
                      value={formData.trailerUrl}
                      onChange={handleChange}
                      placeholder="https://www.youtube.com/watch?v=..."
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
                  />
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="bg-white dark:bg-background-dark/30 border border-slate-200 dark:border-primary/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Icon name="image" className="text-primary" />
                  Poster Preview
                </h3>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      URL Poster
                    </label>
                    <Input
                      name="posterUrl"
                      type="url"
                      value={formData.posterUrl}
                      onChange={handleChange}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="aspect-[2/3] w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-primary/30 bg-slate-50 dark:bg-background-dark/50 flex flex-col items-center justify-center text-slate-400 overflow-hidden group relative">
                    {formData.posterUrl ? (
                      <>
                        <img
                          alt="Poster Preview"
                          className="absolute inset-0 w-full h-full object-cover"
                          src={formData.posterUrl}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                          <span className="text-white font-bold bg-primary px-4 py-2 rounded-lg">
                            Preview Mode
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
                        <Icon name="add_photo_alternate" className="text-5xl" />
                        <p className="text-sm">
                          Vui lòng nhập URL hợp lệ để xem trước poster
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center italic">
                    Kích thước khuyến nghị: 600x900px (Tỷ lệ 2:3)
                  </p>
                </div>
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
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1 py-3 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/20"
              disabled={submitting || loading}
            >
              {submitting ? 'Đang lưu...' : submitLabel}
            </Button>
          </div>
        </form>
      </main>

      {confirm ? (
        <ConfirmModal
          isOpen={showConfirm}
          title={confirm.title}
          message={confirm.message}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          disableConfirm={submitting}
        />
      ) : null}
    </>
  )
}

export default MovieUpsertForm
