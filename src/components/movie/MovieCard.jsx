import Icon from '../Icon'
import Text from '../Text'

function MovieCard({
  title,
  duration,
  genres,
  ageLabel,
  ageColorClass,
  statusLabel,
  statusColorClass,
  overlayVariant = 'buy',
  posterSrc,
  posterAlt,
  muted = false,
}) {
  const cardBaseClasses = `movie-card group flex flex-col gap-4 ${
    muted ? 'opacity-50' : ''
  }`

  return (
    <div className={cardBaseClasses}>
      <div
        className={`relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ${
          muted ? 'grayscale' : ''
        }`}
      >
        <img
          alt={posterAlt}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110`}
          src={posterSrc}
        />

        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {ageLabel && (
            <span
              className={`${ageColorClass} text-white text-[10px] font-bold px-2 py-1 rounded`}
            >
              {ageLabel}
            </span>
          )}
          {statusLabel && (
            <span
              className={`${statusColorClass} text-white text-[10px] font-bold px-2 py-1 rounded uppercase`}
            >
              {statusLabel}
            </span>
          )}
        </div>

        <div className="buy-ticket-overlay absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 transition-opacity duration-300">
          {overlayVariant === 'buy' && !muted && (
            <button className="bg-primary hover:scale-105 transition-transform text-white font-bold px-8 py-3 rounded-full flex items-center gap-2">
              <Icon name="confirmation_number" />
              Mua vé
            </button>
          )}
          {overlayVariant === 'remind' && !muted && (
            <button className="bg-slate-700 text-white font-bold px-8 py-3 rounded-full flex items-center gap-2 cursor-not-allowed">
              <Icon name="notifications" />
              Nhắc tôi
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Text
          variant="h3"
          className={`leading-tight group-hover:text-primary transition-colors ${
            muted ? 'text-slate-600' : ''
          }`}
        >
          {title}
        </Text>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Icon name="schedule" className="text-sm" />
          <span>{duration}</span>
          <span className="mx-1">•</span>
          <span>{genres}</span>
        </div>
      </div>
    </div>
  )
}

export default MovieCard
