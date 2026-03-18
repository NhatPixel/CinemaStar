import { useState } from 'react'
import { AdminSidebar, Button, Icon, Input, Text } from '../../components/ui'

function MovieCreate() {
  const [formData, setFormData] = useState({
    title: '',
    director: '',
    cast: '',
    genre: '',
    country: '',
    releaseDate: '',
    language: '',
    duration: '',
    description: '',
    ageRating: 'P',
    status: 'NOW_SHOWING',
    trailerUrl: '',
    posterUrl: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Create movie submitted:', formData)
    // TODO: call API to create movie
  }

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex text-slate-900 dark:text-slate-100">
      <AdminSidebar />

      <main className="flex-1 min-w-0 p-6 md:p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <Text variant="h1" className="text-3xl font-bold tracking-tight">
              Thêm phim mới
            </Text>
            <Text variant="small" className="text-slate-500 dark:text-slate-400">
              Nhập thông tin chi tiết để cập nhật phim vào hệ thống CinemaStar.
            </Text>
          </div>
          <div className="hidden md:flex gap-4">
            <Button variant="ghost" className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-primary/30 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-primary/10">
              Hủy
            </Button>
            <Button className="px-5 py-2.5 rounded-lg font-semibold shadow-lg shadow-primary/20 flex items-center gap-2">
              <Icon name="save" />
              Lưu phim
            </Button>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="xl:col-span-2 space-y-8">
              {/* Thông tin cơ bản */}
              <section className="bg-white dark:bg-background-dark/30 border border-slate-200 dark:border-primary/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Icon name="info" className="text-primary" />
                  Thông tin cơ bản
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Tiêu đề phim <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Nhập tiêu đề phim"
                    />
                    <span className="text-xs text-red-500 font-medium italic">
                      Trường này là bắt buộc
                    </span>
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
                      name="cast"
                      value={formData.cast}
                      onChange={handleChange}
                      placeholder="Tên các diễn viên (phân cách bằng dấu phẩy)"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Thể loại
                    </label>
                    <Input
                      name="genre"
                      value={formData.genre}
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

              {/* Chi tiết & mô tả */}
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
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Mô tả phim
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full rounded-lg bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-primary/20 focus:border-primary focus:ring-primary dark:text-white px-4 py-3 outline-none transition-all resize-none"
                    placeholder="Nhập nội dung tóm tắt phim..."
                  />
                </div>
              </section>

              {/* Media & Phân loại */}
              <section className="bg-white dark:bg-background-dark/30 border border-slate-200 dark:border-primary/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Icon name="link" className="text-primary" />
                  Media &amp; Phân loại
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Phân loại độ tuổi
                    </label>
                    <select
                      name="ageRating"
                      value={formData.ageRating}
                      onChange={handleChange}
                      className="w-full rounded-lg bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-primary/20 focus:border-primary focus:ring-primary dark:text-white px-4 py-3 outline-none transition-all appearance-none"
                    >
                      <option value="P">P - Cho mọi lứa tuổi</option>
                      <option value="K">K - Dưới 13 tuổi với người giám hộ</option>
                      <option value="T13">T13 - Trên 13 tuổi</option>
                      <option value="T16">T16 - Trên 16 tuổi</option>
                      <option value="T18">T18 - Trên 18 tuổi</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Trạng thái phim
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full rounded-lg bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-primary/20 focus:border-primary focus:ring-primary dark:text-white px-4 py-3 outline-none transition-all appearance-none"
                    >
                      <option value="COMING_SOON">Sắp chiếu (COMING SOON)</option>
                      <option value="NOW_SHOWING">Đang chiếu (NOW SHOWING)</option>
                      <option value="STOP_SHOWING">Ngừng chiếu (STOP SHOWING)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      URL Trailer
                    </label>
                    <Input
                      name="trailerUrl"
                      type="url"
                      value={formData.trailerUrl}
                      onChange={handleChange}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Media Preview Section */}
            <div className="space-y-8">
              <section className="bg-white dark:bg-background-dark/30 border border-slate-200 dark:border-primary/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Icon name="image" className="text-primary" />
                  Poster Preview
                </h3>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      URL Poster <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        name="posterUrl"
                        type="url"
                        value={formData.posterUrl}
                        onChange={handleChange}
                        placeholder="https://..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="bg-primary/20 text-primary p-3 rounded-lg hover:bg-primary/30 transition-colors"
                      >
                        <Icon name="refresh" />
                      </Button>
                    </div>
                    <span className="text-xs text-red-500 font-medium italic">
                      Trường này là bắt buộc
                    </span>
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

          {/* Mobile Footer buttons */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-primary/20 flex gap-4 md:hidden">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 py-3 rounded-lg border border-slate-200 dark:border-primary/30 text-slate-600 dark:text-slate-300 font-bold"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1 py-3 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/20"
            >
              Lưu phim
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default MovieCreate

