import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppHeader, AppFooter, Icon, Text, Button, useToast } from '../../components'
import { getFilmById } from '../../api/Film/filmApi'

const STATUS_LABELS = {
  COMING_SOON: 'Sắp chiếu',
  NOW_SHOWING: 'Đang chiếu',
  ENDED: 'Ngừng chiếu',
  ARCHIVED: 'Lưu trữ',
}

const AGE_RATING_META = {
  RATING_1: { short: 'T0', text: 'Mọi lứa tuổi' },
  RATING_2: { short: 'T6', text: 'Từ 6 tuổi trở lên' },
  RATING_3: { short: 'T13', text: 'Từ 13 tuổi trở lên' },
  RATING_4: { short: 'T16', text: 'Từ 16 tuổi trở lên' },
  RATING_5: { short: 'T18', text: 'Từ 18 tuổi trở lên' },
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('vi-VN')
}

function trailerPoster(trailerUrl) {
  if (!trailerUrl) return ''
  const raw = String(trailerUrl)
  const short = raw.match(/youtu\.be\/([^?&]+)/i)?.[1]
  const full = raw.match(/[?&]v=([^?&]+)/i)?.[1]
  const embed = raw.match(/youtube\.com\/embed\/([^?&]+)/i)?.[1]
  const id = short || full || embed
  if (!id) return ''
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

function parseActors(actorValue) {
  if (!actorValue) return []
  if (Array.isArray(actorValue)) {
    return actorValue.map((name) => String(name).trim()).filter(Boolean)
  }
  return String(actorValue)
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
}

function MovieDetail() {
  const toast = useToast()
  const { id } = useParams()
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    const ac = new AbortController()
    ;(async () => {
      try {
        setLoading(true)
        const data = await getFilmById(id, { signal: ac.signal })
        if (!cancelled) {
          setMovie(data || null)
        }
      } catch (err) {
        if (cancelled || err?.name === 'AbortError') return
        toast.error(err?.message || 'Không tải được thông tin phim')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [id, toast])

  const actorList = useMemo(() => parseActors(movie?.actor || movie?.cast), [movie?.actor, movie?.cast])
  const ageMeta = AGE_RATING_META[movie?.ageRating] || { short: '—', text: 'Không xác định' }
  const statusLabel = STATUS_LABELS[movie?.status] || movie?.status || '—'
  const poster = movie?.poster || trailerPoster(movie?.trailer) || '/assets/movie-sample.jpg'
  const trailerPreview = trailerPoster(movie?.trailer) || poster
  const trailerHref = movie?.trailer || '#'

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-12">
        {loading && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            Đang tải thông tin phim...
          </div>
        )}

        {!loading && !movie && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">
            Không tìm thấy thông tin phim.
          </div>
        )}

        <div className="@container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            {/* Movie Poster */}
            <div className="lg:col-span-4 @[480px]:max-w-md mx-auto lg:max-w-none w-full">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl shadow-primary/20 group">
                <img
                  alt={movie?.title || 'Movie Poster'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src={poster}
                />
                <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {statusLabel}
                </div>
              </div>
            </div>

            {/* Trailer & Title Area */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Text
                  variant="h1"
                  className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white"
                >
                  {movie?.title || '—'}
                </Text>
                <Text variant="body" className="text-lg text-slate-600 dark:text-slate-400 font-medium">
                  {movie?.director
                    ? `Đạo diễn: ${movie.director}`
                    : 'Thông tin đạo diễn đang cập nhật.'}
                </Text>
              </div>

              {/* Trailer Player */}
              <a
                href={trailerHref}
                target="_blank"
                rel="noreferrer"
                className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-xl group cursor-pointer block"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-60"
                  style={{ backgroundImage: `url('${trailerPreview}')` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="size-20 bg-primary/90 hover:bg-primary text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg">
                    <Icon name="play_arrow" className="text-4xl" />
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-white uppercase tracking-widest">
                      Xem Trailer
                    </span>
                    <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="w-1/3 h-full bg-primary" />
                    </div>
                    <span className="text-xs text-white">YouTube</span>
                  </div>
                </div>
              </a>

              <div className="flex flex-wrap gap-4 mt-2">
                <Button
                  className="flex-1 sm:flex-none min-w-[200px] py-4 px-8 rounded-xl flex items-center justify-center gap-2"
                  onClick={() => toast.info('Tính năng đặt vé đang được phát triển')}
                >
                  <Icon name="confirmation_number" />
                  Đặt vé ngay
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 sm:flex-none bg-slate-200 dark:bg-white/5 hover:bg-white/10 text-slate-900 dark:text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/5"
                  onClick={() => toast.success('Đã thêm phim vào danh sách yêu thích')}
                >
                  <Icon name="favorite" />
                  Yêu thích
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Movie Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-16">
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-8 bg-primary rounded-full" />
              Thông tin chi tiết
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-8 gap-x-4 glass-panel p-8 rounded-2xl">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Đạo diễn
                </span>
                <span className="text-lg font-medium">{movie?.director || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Thể loại
                </span>
                <span className="text-lg font-medium">{movie?.type || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Thời lượng
                </span>
                <span className="text-lg font-medium">
                  {movie?.duration != null ? `${movie.duration} phút` : '—'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Khởi chiếu
                </span>
                <span className="text-lg font-medium">{formatDate(movie?.releaseDate)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Quốc gia
                </span>
                <span className="text-lg font-medium">{movie?.country || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Ngôn ngữ
                </span>
                <span className="text-lg font-medium">{movie?.language || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Độ tuổi
                </span>
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded">
                    {ageMeta.short}
                  </span>
                  <span className="text-sm">{ageMeta.text}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  Trạng thái
                </span>
                <span className="text-primary font-bold">{statusLabel}</span>
              </div>
            </div>

            <div className="mt-12">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-8 bg-primary rounded-full" />
                Nội dung phim
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
                {movie?.description || 'Nội dung phim đang được cập nhật.'}
              </p>
            </div>
          </div>

          {/* Cast Section */}
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-8 bg-primary rounded-full" />
              Diễn viên
            </h3>
            <div className="flex flex-col gap-4">
              {actorList.length > 0 ? (
                actorList.map((name) => (
                  <div key={name} className="flex items-center gap-4 glass-panel p-4 rounded-xl">
                    <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/30">
                      <Icon name="person" className="text-3xl" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{name}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-panel p-4 rounded-xl text-sm text-slate-500 dark:text-slate-400">
                  Chưa có thông tin diễn viên.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  )
}

export default MovieDetail

