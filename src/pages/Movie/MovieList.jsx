import { useState } from 'react'
import { Icon, Text, Button, MovieCard, AppHeader, AppFooter, CustomSelect } from '../../components/ui'

const LIST_STATUS_OPTIONS = [
  { value: 'NOW_SHOWING', label: 'Đang chiếu' },
  { value: 'COMING_SOON', label: 'Sắp chiếu' },
  { value: 'STOP_SHOWING', label: 'Ngừng chiếu' },
]

const LIST_COUNTRY_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'VN', label: 'Việt Nam' },
  { value: 'US', label: 'Mỹ' },
  { value: 'KR', label: 'Hàn Quốc' },
  { value: 'JP', label: 'Nhật Bản' },
]

const LIST_LANGUAGE_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'subtitle', label: 'Phụ đề' },
  { value: 'dub', label: 'Thuyết minh' },
]

const MOVIES = [
  {
    id: 1,
    title: 'Chiến Binh Thiên Hà',
    duration: '120 phút',
    genres: 'Hành động, Viễn tưởng',
    ageLabel: 'T13',
    ageColorClass: 'bg-red-600',
    statusLabel: 'NOW_SHOWING',
    statusColorClass: 'bg-primary',
    overlayVariant: 'buy',
    muted: false,
    posterSrc: '/assets/movie-sample.jpg',
    posterAlt: 'Epic sci-fi movie poster featuring galaxy and stars',
  },
  {
    id: 2,
    title: 'Hào Quang Rực Rỡ',
    duration: '105 phút',
    genres: 'Tâm lý, Âm nhạc',
    ageLabel: 'P',
    ageColorClass: 'bg-green-600',
    statusLabel: 'NOW_SHOWING',
    statusColorClass: 'bg-primary',
    overlayVariant: 'buy',
    muted: false,
    posterSrc: '/assets/movie-sample.jpg',
    posterAlt: 'Modern cinematic poster with vibrant city lights',
  },
  {
    id: 3,
    title: 'Lời Nguyền Bóng Đêm',
    duration: '135 phút',
    genres: 'Kinh dị, Giật gân',
    ageLabel: 'T18',
    ageColorClass: 'bg-red-700',
    statusLabel: 'Coming_Soon',
    statusColorClass: 'bg-slate-600',
    overlayVariant: 'remind',
    muted: false,
    posterSrc: '/assets/movie-sample.jpg',
    posterAlt: 'Dark mysterious movie poster with foggy forest',
  },
  {
    id: 4,
    title: 'Gia Đình Siêu Quậy',
    duration: '95 phút',
    genres: 'Hoạt hình, Hài hước',
    ageLabel: 'P',
    ageColorClass: 'bg-green-600',
    statusLabel: 'NOW_SHOWING',
    statusColorClass: 'bg-primary',
    overlayVariant: 'buy',
    muted: false,
    posterSrc: '/assets/movie-sample.jpg',
    posterAlt: 'Colorful animated movie poster for family audience',
  },
  {
    id: 5,
    title: 'Dòng Sông Kỷ Niệm',
    duration: '112 phút',
    genres: 'Lãng mạn, Chính kịch',
    ageLabel: 'T16',
    ageColorClass: 'bg-orange-500',
    statusLabel: 'NOW_SHOWING',
    statusColorClass: 'bg-primary',
    overlayVariant: 'buy',
    muted: false,
    posterSrc: '/assets/movie-sample.jpg',
    posterAlt: 'Romantic drama movie poster with soft sunset background',
  },
  {
    id: 6,
    title: 'Cú Đấm Thép',
    duration: '118 phút',
    genres: 'Võ thuật, Thể thao',
    ageLabel: 'STOP_SHOWING',
    ageColorClass: 'bg-slate-800',
    statusLabel: '',
    statusColorClass: '',
    overlayVariant: 'buy',
    muted: true,
    posterSrc: '/assets/movie-sample.jpg',
    posterAlt: 'Sports action movie poster showing a boxer in ring',
  },
]

function MovieList() {
  const [filters, setFilters] = useState({
    status: 'NOW_SHOWING',
    country: 'all',
    language: 'all',
  })

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
            <a className="hover:text-primary" href="#">
              Trang chủ
            </a>
            <Icon name="chevron_right" className="text-xs" />
            <span className="text-primary font-medium">Danh sách phim</span>
          </nav>
          <Text variant="h1" className="text-4xl font-bold tracking-tight mb-2">
            Danh sách phim
          </Text>
          <Text variant="body" className="text-slate-500 dark:text-slate-400">
            Khám phá những siêu phẩm điện ảnh mới nhất tại CinemaStar
          </Text>
        </div>

        <section className="glass rounded-xl p-6 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Text
                variant="caption"
                className="text-xs font-bold uppercase tracking-wider text-primary"
              >
                Trạng thái
              </Text>
              <CustomSelect
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                options={LIST_STATUS_OPTIONS}
                placeholder="Chọn trạng thái"
              />
            </div>
            <div className="space-y-2">
              <Text
                variant="caption"
                className="text-xs font-bold uppercase tracking-wider text-primary"
              >
                Quốc gia
              </Text>
              <CustomSelect
                name="country"
                value={filters.country}
                onChange={handleFilterChange}
                options={LIST_COUNTRY_OPTIONS}
                placeholder="Chọn quốc gia"
              />
            </div>
            <div className="space-y-2">
              <Text
                variant="caption"
                className="text-xs font-bold uppercase tracking-wider text-primary"
              >
                Ngôn ngữ
              </Text>
              <CustomSelect
                name="language"
                value={filters.language}
                onChange={handleFilterChange}
                options={LIST_LANGUAGE_OPTIONS}
                placeholder="Chọn ngôn ngữ"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="primary"
                size="md"
                fullWidth
                className="flex items-center justify-center gap-2"
              >
                <Icon name="filter_list" className="text-lg" />
                Lọc kết quả
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {MOVIES.map((movie) => (
            <MovieCard key={movie.id} {...movie} />
          ))}
        </section>

        <div className="mt-16 flex justify-center">
          <nav className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="w-10 h-10 rounded-lg bg-primary text-white font-bold">1</button>
            <button className="w-10 h-10 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors">
              2
            </button>
            <button className="w-10 h-10 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors">
              3
            </button>
            <span className="px-2 text-slate-500">...</span>
            <button className="w-10 h-10 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors">
              12
            </button>
            <button className="p-2 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </nav>
        </div>
      </main>

      <AppFooter />
    </div>
  )
}

export default MovieList

