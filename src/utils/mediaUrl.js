import { BASE_URL } from '../api/config/transport'

const DEFAULT_API_ORIGIN = 'https://cinema-api.duckdns.org'

function getApiOrigin() {
  const configured = import.meta.env?.VITE_CINEMA_API_BASE_URL
  if (configured) {
    return String(configured).replace(/\/api\/?$/i, '')
  }
  if (import.meta.env?.DEV) {
    return ''
  }
  return String(BASE_URL).replace(/\/api\/?$/i, '') || DEFAULT_API_ORIGIN
}

export function resolveMediaUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) {
    return `${getApiOrigin()}${raw}`
  }
  return raw
}

export function isYoutubeTrailerUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return false
  return /youtu\.be\//i.test(raw) || /youtube\.com/i.test(raw)
}

export function isDirectVideoUrl(url) {
  const raw = String(url || '').trim()
  if (!raw || isYoutubeTrailerUrl(raw)) return false
  if (/\/media\//i.test(raw)) return true
  return /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(raw)
}

export function getYoutubeEmbedUrl(trailerUrl) {
  const raw = String(trailerUrl || '').trim()
  if (!raw) return ''

  const short = raw.match(/youtu\.be\/([^?&]+)/i)?.[1]
  const full = raw.match(/[?&]v=([^?&]+)/i)?.[1]
  const embed = raw.match(/youtube\.com\/embed\/([^?&]+)/i)?.[1]
  const id = short || full || embed
  if (id) {
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
  }
  return ''
}
