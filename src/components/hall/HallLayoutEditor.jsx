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
  cellMapToLayoutDefinition,
  clampLayoutDimension,
  countSeatsInMap,
  createLayoutState,
  getCellsForBrush,
  getCouplePaintPlan,
  NO_COUPLE_INDEX,
  isCellPartOfCouple,
  parseCellKey,
  resizeLayoutState,
  resolveCoupleSide,
} from './hallLayoutUtils'

const EMPTY_HOVER_PREVIEW = { keys: [], canPaint: false }

/**
 * Form sơ đồ ghế phòng chiếu.
 * @param {{ mode?: 'editor' | 'view', readOnly?: boolean, value?: object, onChange?: (layout) => void, className?: string }} props
 */
function HallLayoutForm({
  mode = 'editor',
  readOnly: readOnlyProp = false,
  value,
  onChange,
  className = '',
}) {
  const readOnly = mode === 'view' || readOnlyProp
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
    if (readOnly) return
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
  }, [draftRows, draftCols, readOnly, totalRows, totalCols, cellMap, coupleGrid, emitChange])

  const commitDraftDimension = (draft, setter) => {
    setter(String(clampLayoutDimension(draft)))
  }

  const paintAt = useCallback(
    (row, col) => {
      if (readOnly) return
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
    [readOnly, cellMap, coupleGrid, brush, totalCols, totalRows, emitChange],
  )

  const handlePointerDown = (row, col) => {
    if (readOnly) return
    isPaintingRef.current = true
    paintAt(row, col)
  }

  const handlePointerEnter = (row, col) => {
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

  /** Hover 2 ô thuộc cùng couple đã vẽ → gộp ring xanh, bỏ vạch giữa */
  const hoverMergeCouple = useMemo(() => {
    if (brush !== SEAT_TYPE.COUPLE || hoverPreview.keys.length !== 2) return null

    const cells = hoverPreview.keys.map((key) => {
      const { row, col } = parseCellKey(key)
      return { key, row, col, index: coupleGrid[row]?.[col] ?? NO_COUPLE_INDEX }
    })

    if (cells[0].index < 0 || cells[0].index !== cells[1].index) return null

    const sorted = [...cells].sort((a, b) => a.col - b.col)
    return { leftKey: sorted[0].key, rightKey: sorted[1].key }
  }, [brush, hoverPreview.keys, coupleGrid])

  return (
    <div className={`space-y-4 ${className}`}>
      {!readOnly ? (
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
        </Text>
      )}

      {!readOnly ? (
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
              const canPaint = !readOnly && isHover && hoverPreview.canPaint
              const coupleJoinClass =
                seatType === SEAT_TYPE.COUPLE && coupleSide
                  ? COUPLE_CELL_JOIN_CLASS[coupleSide] || ''
                  : ''
              const showCoupleHeart = seatType === SEAT_TYPE.COUPLE
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
                  disabled={readOnly}
                  data-couple-index={coupleIndex != null && coupleIndex >= 0 ? coupleIndex : undefined}
                  data-couple-side={coupleSide || undefined}
                  title={
                    painted
                      ? SEAT_TYPE_LABEL_VI[seatType] || seatType
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
                    'aspect-square min-h-[28px] max-h-[36px] w-full min-w-0 max-w-full box-border rounded-md border flex items-center justify-center text-sm font-bold transition',
                    painted
                      ? paintedClass
                      : 'border-dashed border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/40 text-slate-400',
                    coupleJoinClass,
                    isHover && canPaint && hoverMergeSide
                      ? COUPLE_HOVER_RING_JOIN_CLASS[hoverMergeSide]
                      : '',
                    isHover && canPaint && !hoverMergeSide
                      ? 'ring-2 ring-primary/70 ring-offset-1 dark:ring-offset-slate-900 z-10'
                      : '',
                    readOnly ? 'cursor-default' : 'cursor-crosshair',
                  ].join(' ')}
                >
                  {painted ? (
                    <span className="text-[10px] leading-none">
                      {showCoupleHeart
                        ? '♥'
                        : seatType === SEAT_TYPE.VIP
                          ? 'V'
                          : seatType === SEAT_TYPE.STANDARD
                            ? 'G'
                            : null}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">+</span>
                  )}
                </button>
              )
            }),
          )}
        </div>

        <Text variant="small" className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          {readOnly
            ? 'Chế độ xem sơ đồ ghế'
            : 'Chọn loại ghế, nhấn hoặc giữ chuột để vẽ. Ghế đôi chiếm 2 ô ngang (cùng số = một cặp).'}
          {!readOnly ? ` · Đã vẽ: ${seatCount} ô ghế` : null}
        </Text>
      </div>
    </div>
  )
}

export default HallLayoutForm
