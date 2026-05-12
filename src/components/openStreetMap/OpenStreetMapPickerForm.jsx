import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import {
  getCurrentPosition,
  loadLeaflet,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  searchPlaces,
} from '../../api/openStreetMap'

const DEFAULT_CENTER = { lat: 16.054407, lng: 108.202164 }
const EPSILON = 1e-6

function toNumberOrNull(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Form chọn vị trí trên OpenStreetMap, nhúng trực tiếp vào parent form.
 * Controlled qua props: `lat`, `lng`, `onChange(lat, lng)`.
 * Mọi tương tác (click bản đồ, kéo marker, search Nominatim, locate GPS) đều bắn `onChange`.
 * Nếu parent đổi `lat`/`lng` (vd user gõ tay vào form), map sẽ pan + dời marker theo.
 */
function OpenStreetMapPickerForm({ lat, lng, onChange, className = '' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [searchError, setSearchError] = useState('')
  const searchAbortRef = useRef(null)
  const skipNextSearchRef = useRef(false)

  const [locating, setLocating] = useState(false)

  const propLat = toNumberOrNull(lat)
  const propLng = toNumberOrNull(lng)

  const emitChange = (nextLat, nextLng) => {
    if (typeof onChange === 'function') onChange(nextLat, nextLng)
  }

  const moveMap = (nextLat, nextLng, zoom) => {
    if (markerRef.current) markerRef.current.setLatLng({ lat: nextLat, lng: nextLng })
    if (mapRef.current) {
      if (typeof zoom === 'number') mapRef.current.setView([nextLat, nextLng], zoom)
      else mapRef.current.panTo([nextLat, nextLng])
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    ;(async () => {
      try {
        const L = await loadLeaflet()
        if (cancelled || !containerRef.current) return

        const center = {
          lat: propLat ?? DEFAULT_CENTER.lat,
          lng: propLng ?? DEFAULT_CENTER.lng,
        }
        const hasInitial = propLat != null && propLng != null

        const map = L.map(containerRef.current, {
          center: [center.lat, center.lng],
          zoom: hasInitial ? 15 : 12,
          zoomControl: true,
          scrollWheelZoom: true,
        })
        mapRef.current = map

        L.tileLayer(OSM_TILE_URL, {
          attribution: OSM_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(map)

        const marker = L.marker([center.lat, center.lng], {
          draggable: true,
        }).addTo(map)
        markerRef.current = marker

        map.on('click', (event) => {
          const { lat: cLat, lng: cLng } = event.latlng
          marker.setLatLng({ lat: cLat, lng: cLng })
          emitChange(cLat, cLng)
        })
        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          if (!pos) return
          emitChange(pos.lat, pos.lng)
        })

        setTimeout(() => {
          if (!cancelled && mapRef.current) {
            mapRef.current.invalidateSize()
          }
        }, 100)

        if (!hasInitial) {
          setLocating(true)
          getCurrentPosition()
            .then((pos) => {
              if (cancelled || !mapRef.current || !markerRef.current) return
              markerRef.current.setLatLng({ lat: pos.lat, lng: pos.lng })
              mapRef.current.setView([pos.lat, pos.lng], 15)
              emitChange(pos.lat, pos.lng)
            })
            .catch(() => {})
            .finally(() => {
              if (!cancelled) setLocating(false)
            })
        }
      } catch (e) {
        if (cancelled) return
        setError(e?.message || 'Không tải được bản đồ')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
      }
      markerRef.current = null
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (propLat == null || propLng == null) return
    if (!markerRef.current || !mapRef.current) return
    const cur = markerRef.current.getLatLng()
    if (
      cur &&
      Math.abs(cur.lat - propLat) < EPSILON &&
      Math.abs(cur.lng - propLng) < EPSILON
    ) {
      return
    }
    markerRef.current.setLatLng({ lat: propLat, lng: propLng })
    mapRef.current.panTo([propLat, propLng])
  }, [propLat, propLng])

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false
      return undefined
    }
    const q = searchInput.trim()
    if (!q) {
      setSearchResults([])
      setSearching(false)
      setSearchError('')
      setShowResults(false)
      if (searchAbortRef.current) searchAbortRef.current.abort()
      return undefined
    }

    setShowResults(true)
    setSearching(true)
    setSearchError('')

    const controller = new AbortController()
    if (searchAbortRef.current) searchAbortRef.current.abort()
    searchAbortRef.current = controller

    const timer = setTimeout(async () => {
      try {
        const items = await searchPlaces(q, { signal: controller.signal, limit: 8 })
        if (controller.signal.aborted) return
        setSearchResults(items)
      } catch (e) {
        if (controller.signal.aborted) return
        setSearchResults([])
        setSearchError(e?.message || 'Tìm kiếm thất bại')
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [searchInput])

  const handlePickResult = (item) => {
    skipNextSearchRef.current = true
    setSearchInput(item.displayName)
    setShowResults(false)
    setSearchResults([])
    moveMap(item.lat, item.lng, 16)
    emitChange(item.lat, item.lng)
  }

  const runSearchNow = async () => {
    const q = searchInput.trim()
    if (!q) return
    if (searchAbortRef.current) searchAbortRef.current.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller
    setSearching(true)
    setSearchError('')
    setShowResults(true)
    try {
      const items = await searchPlaces(q, { signal: controller.signal, limit: 8 })
      if (controller.signal.aborted) return
      setSearchResults(items)
      if (items.length === 1) {
        handlePickResult(items[0])
      }
    } catch (e) {
      if (controller.signal.aborted) return
      setSearchResults([])
      setSearchError(e?.message || 'Tìm kiếm thất bại')
    } finally {
      if (!controller.signal.aborted) setSearching(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    runSearchNow()
  }

  const handleLocateMe = async () => {
    if (locating) return
    setLocating(true)
    setError('')
    try {
      const pos = await getCurrentPosition()
      moveMap(pos.lat, pos.lng, 16)
      emitChange(pos.lat, pos.lng)
    } catch (e) {
      setError(e?.message || 'Không lấy được vị trí hiện tại')
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className={className}>
      <div className="relative mb-3" style={{ zIndex: 200 }}>
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Icon name="search" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0 || searchError) setShowResults(true)
            }}
            placeholder="Tìm địa chỉ, tên địa điểm..."
            className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-20 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            {searchInput ? (
              <button
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => {
                  setSearchInput('')
                  setSearchResults([])
                  setShowResults(false)
                  setSearchError('')
                  if (searchAbortRef.current) searchAbortRef.current.abort()
                }}
                className="flex items-center px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon name="close" />
              </button>
            ) : null}
            <button
              type="submit"
              aria-label="Tìm kiếm"
              disabled={searching || !searchInput.trim()}
              className="flex items-center justify-center rounded-md px-2 py-1 text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? (
                <Icon name="autorenew" className="animate-spin" />
              ) : (
                <Icon name="arrow_forward" />
              )}
            </button>
          </div>
        </form>

        {showResults ? (
          <div className="absolute left-0 right-0 top-full z-[160] mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            {searching ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
                <Icon name="autorenew" className="animate-spin text-base" />
                Đang tìm trên OpenStreetMap...
              </div>
            ) : searchError ? (
              <div className="px-3 py-2 text-sm text-red-500">{searchError}</div>
            ) : searchResults.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">
                Không có kết quả cho "{searchInput}"
              </div>
            ) : (
              searchResults.map((item, idx) => {
                const title =
                  item.name || item.displayName.split(',')[0] || item.displayName
                const subtitle = item.displayName
                return (
                  <button
                    key={`${item.lat}-${item.lng}-${idx}`}
                    type="button"
                    onClick={() => handlePickResult(item)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Icon name="place" className="mt-0.5 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {title}
                        </span>
                        {item.type ? (
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {item.type}
                          </span>
                        ) : null}
                      </div>
                      <div className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {subtitle}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        ) : null}
      </div>

      <div className="relative" style={{ zIndex: 0 }}>
        <div
          ref={containerRef}
          className="w-full h-[360px] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800"
        />

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating || loading || Boolean(error)}
          title="Về vị trí hiện tại"
          aria-label="Về vị trí hiện tại"
          style={{ zIndex: 1000 }}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-black/10 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10"
        >
          {locating ? (
            <Icon name="autorenew" className="animate-spin" />
          ) : (
            <Icon name="my_location" />
          )}
        </button>

        {(loading || error) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl pointer-events-none">
            <div className="rounded-xl bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 shadow">
              {error ? (
                <span className="text-red-500">{error}</span>
              ) : (
                'Đang tải bản đồ...'
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OpenStreetMapPickerForm
