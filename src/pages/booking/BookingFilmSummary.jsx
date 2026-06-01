import { Icon } from '../../components'
import {
  formatFilmAgeRatingShort,
  formatFilmDurationLabel,
  formatFilmFormatLabel,
  formatFilmGenresLabel,
  getFilmRecordPoster,
  getFilmRecordTitle,
} from './bookingData'

function BookingFilmSummary({ film, loading }) {
  if (loading) {
    return (
      <div className="w-full max-w-[280px] rounded-3xl border border-white/10 bg-[#120a1a] p-5 text-center text-sm text-slate-400">
        Đang tải thông tin phim...
      </div>
    )
  }

  if (!film) return null

  const title = getFilmRecordTitle(film)
  const poster = getFilmRecordPoster(film)
  const ageLabel = formatFilmAgeRatingShort(film)
  const durationLabel = formatFilmDurationLabel(film)
  const formatLabel = formatFilmFormatLabel(film)
  const genresLabel = formatFilmGenresLabel(film)

  return (
    <div className="w-full max-w-[280px] shrink-0 self-start rounded-3xl border border-primary/20 bg-[#120a1a] p-4 shadow-xl shadow-primary/10">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-white/5">
        <img alt={title} className="h-full w-full object-cover" src={poster} />
        {ageLabel && ageLabel !== '—' ? (
          <span className="absolute left-3 top-3 rounded-md bg-red-600 px-2 py-0.5 text-xs font-black text-white">
            {ageLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <h2 className="line-clamp-3 text-lg font-black leading-snug text-white">{title}</h2>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="schedule" className="text-base text-primary" />
            {durationLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="high_quality" className="text-base text-primary" />
            {formatLabel}
          </span>
        </div>

        <p className="line-clamp-4 text-sm leading-relaxed text-slate-400">{genresLabel}</p>
      </div>
    </div>
  )
}

export default BookingFilmSummary
