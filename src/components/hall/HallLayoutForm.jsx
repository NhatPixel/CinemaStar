import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../Icon'
import Input from '../Input'
import Text from '../Text'
import {
  COUPLE_CELL_JOIN_CLASS,
  COUPLE_CELL_SIDE,
  COUPLE_HOVER_RING_JOIN_CLASS,
  HALL_LAYOUT_BRUSH,
  HALL_LAYOUT_BRUSH_OPTIONS,
  SEAT_TYPE,
  SEAT_TYPE_CELL_CLASS,
  SEAT_TYPE_LABEL_VI,
} from '../../constants/hallStatusOptions'
import {
  MAX_LAYOUT_SIZE,
  MIN_LAYOUT_SIZE,
  applyBrushToMap,
  cellKey,
  cellKeyToSeatLabel,
  cellMapToLayoutDefinition,
  clampLayoutDimension,
  countSeatsInMap,
  createLayoutState,
  formatSeatLabel,
  getCellsForBrush,
  getCouplePaintPlan,
  getCouplePairCells,
  isCellPartOfCouple,
  parseCellKey,
  resizeLayoutState,
  resolveCoupleSide,
  seatLabelToCellKey,
} from './hallLayoutUtils'

const EMPTY_HOVER_PREVIEW = { keys: [], canPaint: false }

function labelsToKeySet(labels) {
  const set = new Set()
  if (!Array.isArray(labels)) return set
  for (const label of labels) {
    const key = seatLabelToCellKey(label)
    if (key) set.add(key)
  }
  return set
}

/**
 * Sơ đồ ghế phòng chiếu.
 * @param {{
 *   mode?: 'editor' | 'view' | 'picker' | 'booking', // booking = picker (luồng đặt vé)
 *   readOnly?: boolean,
 *   value?: object,
 *   onChange?: (layout) => void,
 *   selectedSeats?: string[],
 *   reservedSeats?: string[],
 *   onSelectedSeatsChange?: (labels: string[]) => void,
 *   className?: string,
 * }} props
 */
function HallLayoutForm({
  mode = 'editor',
  readOnly: readOnlyProp = false,
  value,
  onChange,
  selectedSeats = [],
  reservedSeats = [],
  onSelectedSeatsChange,
  className = '',
}) {
  const isEditor = mode === 'editor'
  const isBooking = mode === 'booking'
  const isPicker = mode === 'picker' || isBooking
  const readOnly = mode === 'view' || readOnlyProp || isPicker

  const [layoutInit] = useState(() => createLayoutState(value))

  const [draftRows, setDraftRows] = useState(String(value?.totalRows ?? 8))
  const [draftCols, setDraftCols] = useState(String(value?.totalCols ?? 10))
  const [totalRows, setTotalRows] = useState(layoutInit.totalRows)
  const [totalCols, setTotalCols] = useState(layoutInit.totalCols)
  const [cellMap, setCellMap] = useState(layoutInit.cellMap)
  const [coupleGrid, setCoupleGrid] = useState(layoutInit.coupleGrid)
  const [brush, setBrush] = useState(HALL_LAYOUT_BRUSH.STANDARD)
  const [hoverPreview, setHoverPreview] = useState(EMPTY_HOVER_PREVIEW)
  const isPaintingRef = useRef(false)

  const selectedKeySet = useMemo(() => labelsToKeySet(selectedSeats), [selectedSeats])
  const reservedKeySet = useMemo(() => labelsToKeySet(reservedSeats), [reservedSeats])

  useEffect(() => {
    if (!value) return
    const { cellMap: map, coupleGrid: grid, totalRows: rows, totalCols: cols } =
      createLayoutState(value)
    setTotalRows(rows)
    setTotalCols(cols)
    setDraftRows(String(rows))
    setDraftCols(String(cols))
    setCellMap(map)
    setCoupleGrid(grid)
  }, [value])

  const emitChange = useCallback(
    (map, rows, cols) => {
      onChange?.(cellMapToLayoutDefinition(rows, cols, map))
    },
    [onChange],
  )

  useEffect(() => {
    if (!isEditor) return
    if (draftRows.trim() === '' || draftCols.trim() === '') return

    const rowsRaw = Number.parseInt(draftRows, 10)
    const colsRaw = Number.parseInt(draftCols, 10)
    if (!Number.isFinite(rowsRaw) || !Number.isFinite(colsRaw)) return

    const rows = clampLayoutDimension(rowsRaw)
    const cols = clampLayoutDimension(colsRaw)

    if (String(rows) !== draftRows) {
      setDraftRows(String(rows))
      return
    }
    if (String(cols) !== draftCols) {
      setDraftCols(String(cols))
      return
    }

    if (rows === totalRows && cols === totalCols) return

    const { cellMap: nextMap, coupleGrid: nextGrid } = resizeLayoutState(
      cellMap,
      coupleGrid,
      rows,
      cols,
    )
    setCellMap(nextMap)
    setCoupleGrid(nextGrid)
    setTotalRows(rows)
    setTotalCols(cols)
    emitChange(nextMap, rows, cols)
  }, [draftRows, draftCols, isEditor, totalRows, totalCols, cellMap, coupleGrid, emitChange])

  const commitDraftDimension = (draft, setter) => {
    setter(String(clampLayoutDimension(draft)))
  }

  const paintAt = useCallback(
    (row, col) => {
      if (!isEditor) return
      const { cellMap: nextMap, coupleGrid: nextGrid } = applyBrushToMap(
        cellMap,
        coupleGrid,
        brush,
        row,
        col,
        totalCols,
      )
      setCellMap(nextMap)
      setCoupleGrid(nextGrid)
      emitChange(nextMap, totalRows, totalCols)
    },
    [isEditor, cellMap, coupleGrid, brush, totalCols, totalRows, emitChange],
  )

  const toggleSeatSelection = useCallback(
    (row, col) => {
      const key = cellKey(row, col)
      if (!cellMap.get(key)) return
      if (reservedKeySet.has(key)) return

      const pair = getCouplePairCells(row, col, coupleGrid)
      const keysToToggle =
        pair.length === 2 ? pair.map((c) => cellKey(c.row, c.col)) : [key]

      const next = new Set(selectedKeySet)
      const allSelected = keysToToggle.every((k) => next.has(k))
      if (allSelected) {
        keysToToggle.forEach((k) => next.delete(k))
      } else {
        keysToToggle.forEach((k) => next.add(k))
      }

      const labels = Array.from(next)
        .map(cellKeyToSeatLabel)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      onSelectedSeatsChange?.(labels)
    },
    [cellMap, coupleGrid, reservedKeySet, selectedKeySet, onSelectedSeatsChange],
  )

  const handlePointerDown = (row, col) => {
    if (isPicker) {
      toggleSeatSelection(row, col)
      return
    }
    if (readOnly) return
    isPaintingRef.current = true
    paintAt(row, col)
  }

  const handlePointerEnter = (row, col) => {
    if (isPicker) return
    if (readOnly) return

    let nextHoverKeys = []
    if (brush === SEAT_TYPE.COUPLE) {
      const plan = getCouplePaintPlan(row, col, totalCols)
      if (!plan?.cells?.length) {
        setHoverPreview(EMPTY_HOVER_PREVIEW)
        return
      }
      nextHoverKeys = plan.cells.map((c) => cellKey(c.row, c.col))
      setHoverPreview({
        keys: nextHoverKeys,
        canPaint: true,
      })
    } else {
      const targets = getCellsForBrush(brush, row, col, totalCols)
      if (targets.length === 0) {
        setHoverPreview(EMPTY_HOVER_PREVIEW)
        return
      }
      nextHoverKeys = targets.map((c) => cellKey(c.row, c.col))
      setHoverPreview({
        keys: nextHoverKeys,
        canPaint: true,
      })
    }

    if (isPaintingRef.current) {
      if (
        brush === SEAT_TYPE.COUPLE &&
        nextHoverKeys.some((key) => {
          const { row: hoverRow, col: hoverCol } = parseCellKey(key)
          return isCellPartOfCouple(coupleGrid, hoverRow, hoverCol)
        })
      ) {
        return
      }
      paintAt(row, col)
    }
  }

  const handlePointerLeaveCell = () => {
    setHoverPreview(EMPTY_HOVER_PREVIEW)
  }

  useEffect(() => {
    const stopPaint = () => {
      isPaintingRef.current = false
    }
    window.addEventListener('mouseup', stopPaint)
    window.addEventListener('touchend', stopPaint)
    return () => {
      window.removeEventListener('mouseup', stopPaint)
      window.removeEventListener('touchend', stopPaint)
    }
  }, [])

  const seatCount = useMemo(() => countSeatsInMap(cellMap), [cellMap])

  const hoverSet = useMemo(() => new Set(hoverPreview.keys), [hoverPreview.keys])

  const hoverMergeCouple = useMemo(() => {
    if (brush !== SEAT_TYPE.COUPLE || hoverPreview.keys.length !== 2) return null

    const cells = hoverPreview.keys.map((key) => {
      const { row, col } = parseCellKey(key)
      return { key, row, col, index: coupleGrid[row]?.[col] ?? -1 }
    })

    if (cells[0].index < 0 || cells[0].index !== cells[1].index) return null

    const sorted = [...cells].sort((a, b) => a.col - b.col)
    return { leftKey: sorted[0].key, rightKey: sorted[1].key }
  }, [brush, hoverPreview.keys, coupleGrid])

  return (
    <div className={`space-y-4 ${className}`}>
      {isEditor ? (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Số hàng"
            name="layoutRows"
            type="number"
            min={MIN_LAYOUT_SIZE}
            max={MAX_LAYOUT_SIZE}
            value={draftRows}
            onChange={(e) => setDraftRows(e.target.value)}
            onBlur={() => commitDraftDimension(draftRows, setDraftRows)}
            icon="view_module"
          />
          <Input
            label="Số cột"
            name="layoutCols"
            type="number"
            min={MIN_LAYOUT_SIZE}
            max={MAX_LAYOUT_SIZE}
            value={draftCols}
            onChange={(e) => setDraftCols(e.target.value)}
            onBlur={() => commitDraftDimension(draftCols, setDraftCols)}
            icon="view_column"
          />
        </div>
      ) : (
        <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
          Lưới {totalRows}×{totalCols} · {seatCount} ghế
          {isPicker && selectedSeats.length > 0
            ? ` · Đã chọn: ${selectedSeats.join(', ')}`
            : null}
        </Text>
      )}

      {isEditor ? (
        <div className="flex flex-wrap gap-2">
          {HALL_LAYOUT_BRUSH_OPTIONS.map((opt) => {
            const active = brush === opt.value
            const seatClass =
              opt.value !== HALL_LAYOUT_BRUSH.ERASER
                ? SEAT_TYPE_CELL_CLASS[opt.value] || ''
                : 'bg-slate-500/10 border-slate-400/40 text-slate-600'
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBrush(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  active ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-slate-900' : ''
                } ${seatClass}`}
              >
                <Icon name={opt.icon} className="text-base" />
                {opt.label}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 dark:border-primary/20 bg-slate-50/50 dark:bg-background-dark/40 p-4 overflow-x-auto">
        <div
          className="mx-auto mb-3 max-w-full rounded-md bg-slate-800 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-300"
          style={{ maxWidth: `${Math.min(totalCols * 36, 720)}px` }}
        >
          Màn hình
        </div>

        <div
          className="mx-auto grid gap-1 select-none overflow-visible"
          style={{
            gridTemplateColumns: `repeat(${totalCols}, minmax(28px, 1fr))`,
            maxWidth: `${totalCols * 36}px`,
          }}
          onMouseLeave={() => setHoverPreview(EMPTY_HOVER_PREVIEW)}
        >
          {Array.from({ length: totalRows }, (_, ri) => ri + 1).map((row) =>
            Array.from({ length: totalCols }, (_, ci) => ci + 1).map((col) => {
              const key = cellKey(row, col)
              const painted = cellMap.get(key)
              const isHover = hoverSet.has(key)
              const seatType = painted?.seatType
              const coupleIndex =
                painted && coupleGrid[row]?.[col] >= 0 ? coupleGrid[row][col] : null
              const coupleSide =
                seatType === SEAT_TYPE.COUPLE ? resolveCoupleSide(coupleGrid, row, col) : null
              const paintedClass = seatType ? SEAT_TYPE_CELL_CLASS[seatType] || '' : ''
              const canPaint = isEditor && isHover && hoverPreview.canPaint
              const showCoupleJoin =
                seatType === SEAT_TYPE.COUPLE && coupleSide && (isEditor || isBooking)
              const coupleJoinClass = showCoupleJoin
                ? COUPLE_CELL_JOIN_CLASS[coupleSide] || ''
                : ''
              const isReserved = isPicker && reservedKeySet.has(key)
              const isSelected = isPicker && selectedKeySet.has(key)
              const seatLabel = formatSeatLabel(row, col)
              const hoverMergeSide =
                hoverMergeCouple?.leftKey === key
                  ? COUPLE_CELL_SIDE.LEFT
                  : hoverMergeCouple?.rightKey === key
                    ? COUPLE_CELL_SIDE.RIGHT
                    : null

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isPicker ? !painted || isReserved : readOnly}
                  data-couple-index={coupleIndex != null && coupleIndex >= 0 ? coupleIndex : undefined}
                  data-couple-side={coupleSide || undefined}
                  title={
                    painted
                      ? isPicker
                        ? isReserved
                          ? `${seatLabel} · Đã đặt`
                          : seatLabel
                        : SEAT_TYPE_LABEL_VI[seatType] || seatType
                      : `Hàng ${row}, cột ${col}`
                  }
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handlePointerDown(row, col)
                  }}
                  onMouseEnter={() => handlePointerEnter(row, col)}
                  onMouseLeave={handlePointerLeaveCell}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    handlePointerDown(row, col)
                  }}
                  className={[
                    'aspect-square min-h-[28px] max-h-[36px] w-full min-w-0 max-w-full box-border rounded-md border flex items-center justify-center text-[10px] font-bold transition',
                    isPicker && painted
                      ? isReserved
                        ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-600'
                        : isSelected
                          ? 'border-primary bg-primary text-white shadow-lg shadow-primary/25 z-10'
                          : `${paintedClass} cursor-pointer hover:border-primary hover:ring-2 hover:ring-primary/40`
                      : painted
                        ? paintedClass
                        : isEditor
                          ? 'border-dashed border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/40 text-slate-400'
                          : 'border-transparent bg-transparent text-transparent',
                    coupleJoinClass,
                    canPaint && hoverMergeSide
                      ? COUPLE_HOVER_RING_JOIN_CLASS[hoverMergeSide]
                      : '',
                    canPaint && !hoverMergeSide
                      ? 'ring-2 ring-primary/70 ring-offset-1 dark:ring-offset-slate-900 z-10'
                      : '',
                    isEditor && !readOnly ? 'cursor-crosshair' : '',
                    isPicker && painted && !isReserved ? 'cursor-pointer' : '',
                    mode === 'view' && painted ? 'cursor-default' : '',
                  ].join(' ')}
                >
                  {painted ? (
                    <span className="leading-none">
                      {isPicker
                        ? seatLabel
                        : seatType === SEAT_TYPE.COUPLE
                          ? '♥'
                          : seatType === SEAT_TYPE.VIP
                            ? 'V'
                            : seatType === SEAT_TYPE.STANDARD
                              ? 'G'
                              : null}
                    </span>
                  ) : isEditor ? (
                    <span className="text-slate-300 dark:text-slate-600">+</span>
                  ) : null}
                </button>
              )
            }),
          )}
        </div>

        <Text variant="small" className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          {isPicker
            ? 'Nhấn ghế trống để chọn hoặc bỏ chọn. Ghế đôi chọn theo cặp.'
            : mode === 'view'
              ? 'Chế độ xem sơ đồ ghế'
              : 'Chọn loại ghế, nhấn hoặc giữ chuột để vẽ. Ghế đôi chiếm 2 ô ngang (cùng số = một cặp).'}
          {isEditor ? ` · Đã vẽ: ${seatCount} ô ghế` : null}
        </Text>

        {isPicker ? (
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="size-4 rounded border border-emerald-500/50 bg-emerald-500/20" />
              Còn trống
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-4 rounded bg-primary" />
              Đang chọn
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-4 rounded bg-slate-800" />
              Đã đặt
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default HallLayoutForm
