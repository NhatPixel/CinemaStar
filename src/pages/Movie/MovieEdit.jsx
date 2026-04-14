import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AdminSidebar, Button, Icon, Input, Text, CustomSelect, useToast } from '../../components/ui'
import { updateFilm } from '../../api/Film/filmApi'

const MOVIE_STATUS_OPTIONS_EDIT = [
  { value: 'COMING_SOON', label: 'Sắp chiếu' },
  { value: 'NOW_SHOWING', label: 'Đang chiếu' },
  { value: 'ENDED', label: 'Ngừng chiếu' },
  { value: 'ARCHIVED', label: 'Lưu trữ' },
]

const AGE_RATING_OPTIONS_EDIT = [
  { value: 'RATING_1', label: 'Mọi lứa tuổi (0+)' },
  { value: 'RATING_2', label: 'Cần hướng dẫn của phụ huynh (6+)' },
  { value: 'RATING_3', label: 'Trẻ em trên 13 tuổi (13+)' },
  { value: 'RATING_4', label: 'Trẻ em trên 16 tuổi (16+)' },
  { value: 'RATING_5', label: 'Chỉ dành cho người từ 18 tuổi trở lên (18+)' },
]

function MovieEdit() {
  const toast = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: 'Người Vợ Cuối Cùng',
    director: 'Victor Vũ',
    cast: 'Kaity Nguyễn, Thuận Nguyễn, NSƯT Quang Thắng, NSƯT Kim Oanh',
    genre: 'Tâm lý, Cổ trang',
    releaseDate: '2023-11-03',
    duration: '132',
    country: 'Việt Nam',
    language: 'Tiếng Việt (Phụ đề Tiếng Anh)',
    description:
      'Lấy cảm hứng từ tiểu thuyết Hồ Oán Hận của nhà văn Hồng Thái, bộ phim lấy bối cảnh Việt Nam vào thế kỷ 19. Chuyện phim xoay quanh Linh – người vợ thứ ba của một viên Quan tri huyện uy quyền. Giữa những hủ tục phong kiến khắc nghiệt, Linh vô tình gặp lại người yêu cũ của mình là Nhân, dẫn đến một chuỗi bi kịch và những lựa chọn đẫm nước mắt về tình yêu và sự tự do.',
    posterUrl: '/assets/movie-sample.jpg',
    trailerUrl: 'https://youtube.com/watch?v=TrailerNguoiVoCuoiCung',
    status: 'NOW_SHOWING',
    ageRating: 'RATING_5',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!id) {
      toast.error('Không xác định được phim cần cập nhật')
      return
    }
    if (!formData.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề phim')
      return
    }
    const duration = Number.parseInt(formData.duration, 10)
    if (!Number.isFinite(duration) || duration <= 0) {
      toast.error('Thời lượng phim phải lớn hơn 0')
      return
    }
    if (!formData.releaseDate) {
      toast.error('Vui lòng chọn ngày phát hành')
      return
    }

    const payload = {
      duration,
      country: formData.country.trim(),
      releaseDate: formData.releaseDate,
      language: formData.language.trim(),
      ageRating: formData.ageRating,
      title: formData.title.trim(),
      trailer: formData.trailerUrl.trim(),
      poster: formData.posterUrl.trim(),
      status: formData.status,
      director: formData.director.trim(),
    }

    try {
      setSubmitting(true)
      await updateFilm(id, payload)
      toast.success('Cập nhật phim thành công')
      navigate('/management/movies')
    } catch (err) {
      toast.error(err?.message || 'Cập nhật phim thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex text-slate-900 dark:text-slate-100">
      <AdminSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex justify-between items-end gap-4">
              <div>
                <Text variant="h1" className="text-3xl font-bold mb-2">
                  Chỉnh sửa phim
                </Text>
                <Text variant="small" className="text-slate-500 dark:text-slate-400">
                  Nhập thông tin chi tiết để cập nhật phim{' '}
                  <span className="text-primary font-medium">{`'${formData.title}'`}</span>.
                </Text>
              </div>
              <div className="hidden md:flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-primary/30 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-primary/10"
                >
                  Hủy
                </Button>
                <Button
                  form="movie-edit-form"
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 shadow-lg shadow-primary/20 flex items-center gap-2"
                  disabled={submitting}
                >
                  <Icon name="save" />
                  {submitting ? 'Đang cập nhật...' : 'Cập nhật phim'}
                </Button>
              </div>
            </div>

            <form
              id="movie-edit-form"
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              onSubmit={handleSubmit}
            >
              {/* Left Column: Poster & Status */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Icon name="image" className="text-primary text-lg" />
                    Poster hiện tại
                  </h3>
                  <div className="relative group aspect-[2/3] rounded-lg overflow-hidden border-2 border-primary/20 mb-4 bg-background-dark">
                    <img
                      className="w-full h-full object-cover"
                      alt="Poster phim"
                      src={formData.posterUrl}
                    />
                    <div className="absolute inset-0 bg-background-dark/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        className="bg-white text-primary px-4 py-2 rounded-full font-bold text-sm"
                      >
                        Thay đổi ảnh
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-500 mb-1">URL Poster</label>
                      <Input
                        name="posterUrl"
                        value={formData.posterUrl}
                        onChange={handleChange}
                        className="bg-primary/10 border-none text-xs py-2 px-3"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-500 mb-1">URL Trailer</label>
                      <Input
                        name="trailerUrl"
                        value={formData.trailerUrl}
                        onChange={handleChange}
                        className="bg-primary/10 border-none text-xs py-2 px-3"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Icon name="tune" className="text-primary text-lg" />
                    Trạng thái &amp; Phân loại
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <CustomSelect
                        label="Trạng thái phim"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        options={MOVIE_STATUS_OPTIONS_EDIT}
                        placeholder="Chọn trạng thái"
                      />
                    </div>
                    <div>
                      <CustomSelect
                        label="Phân loại độ tuổi"
                        name="ageRating"
                        value={formData.ageRating}
                        onChange={handleChange}
                        options={AGE_RATING_OPTIONS_EDIT}
                        placeholder="Chọn phân loại"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Form Fields */}
              <div className="lg:col-span-2 space-y-6">
                <section className="bg-primary/5 border border-primary/20 rounded-xl p-8">
                  <h3 className="text-xl font-bold mb-6 pb-4 border-b border-primary/10">
                    Thông tin cơ bản
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Tiêu đề phim</label>
                      <Input
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="bg-primary/10 border-none py-3 px-4 text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Đạo diễn</label>
                      <Input
                        name="director"
                        value={formData.director}
                        onChange={handleChange}
                        className="bg-primary/10 border-none py-3 px-4"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Ngày phát hành</label>
                      <Input
                        name="releaseDate"
                        type="date"
                        value={formData.releaseDate}
                        onChange={handleChange}
                        className="bg-primary/10 border-none py-3 px-4"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Diễn viên chính</label>
                      <Input
                        name="cast"
                        value={formData.cast}
                        onChange={handleChange}
                        className="bg-primary/10 border-none py-3 px-4"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Thể loại</label>
                      <Input
                        name="genre"
                        value={formData.genre}
                        onChange={handleChange}
                        className="bg-primary/10 border-none py-3 px-4"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Thời lượng (phút)</label>
                      <Input
                        name="duration"
                        type="number"
                        value={formData.duration}
                        onChange={handleChange}
                        className="bg-primary/10 border-none py-3 px-4"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Quốc gia</label>
                      <Input
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="bg-primary/10 border-none py-3 px-4"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Ngôn ngữ</label>
                      <Input
                        name="language"
                        value={formData.language}
                        onChange={handleChange}
                        className="bg-primary/10 border-none py-3 px-4"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Mô tả phim</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={6}
                        className="w-full bg-primary/10 border-none rounded-lg py-3 px-4 focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex justify-end gap-4 pb-12">
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-primary/30 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-primary/10"
                    onClick={() => navigate('/management/movies')}
                  >
                    Hủy thay đổi
                  </Button>
                  <Button
                    type="submit"
                    className="px-8 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 shadow-xl shadow-primary/30 flex items-center gap-2"
                    disabled={submitting}
                  >
                    <Icon name="save" />
                    {submitting ? 'Đang cập nhật...' : 'Cập nhật phim'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default MovieEdit

