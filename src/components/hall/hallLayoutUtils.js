import {
  CELL_INPUT_TYPE,
  COUPLE_CELL_SIDE,
  HALL_LAYOUT_BRUSH,
  SEAT_TYPE,
} from '../../constants/hallStatusOptions'

export const DEFAULT_LAYOUT_ROWS = 8
export const DEFAULT_LAYOUT_COLS = 10
export const MIN_LAYOUT_SIZE = 1
export const MAX_LAYOUT_SIZE = 30

/** Không thuộc cặp ghế đôi */
export const NO_COUPLE_INDEX = -1

/** Giới hạn số hàng/cột lưới (1–30). */
export function clampLayoutDimension(value) {
  const n = Number.parseInt(String(value), 10)
  if (!Number.isFinite(n)) return MIN_LAYOUT_SIZE
  return Math.min(MAX_LAYOUT_SIZE, Math.max(MIN_LAYOUT_SIZE, n))
}

export function cellKey(row, col) {
  return `${row}:${col}`
}

/** Nhãn ghế kiểu A1 (hàng = chữ, cột = số). */
export function formatSeatLabel(row, col) {
  return `${String.fromCharCode(64 + row)}${col}`
}

export function parseSeatLabel(label) {
  const match = /^([A-Z])(\d+)$/i.exec(String(label || '').trim())
  if (!match) return null
  return {
    row: match[1].toUpperCase().charCodeAt(0) - 64,
    col: Number.parseInt(match[2], 10),
  }
}

export function seatLabelToCellKey(label) {
  const parsed = parseSeatLabel(label)
  return parsed ? cellKey(parsed.row, parsed.col) : null
}

export function cellKeyToSeatLabel(key) {
  const { row, col } = parseCellKey(key)
  return formatSeatLabel(row, col)
}

export function parseCellKey(key) {
  const [row, col] = key.split(':').map(Number)
  return { row, col }
}

function getCellAt(cellMap, row, col) {
  return cellMap.get(cellKey(row, col))
}

/** Map ô đã vẽ: key -> { type, seatType } */
export function createEmptyCellMap() {
  return new Map()
}

function createSeatCell(seatType) {
  return { type: CELL_INPUT_TYPE.SEAT, seatType }
}

/** Lưới int 2D: cùng số = cùng cặp ghế đôi (0,0 rồi 1,1, …), -1 = không thuộc cặp */
export function createCoupleGrid(totalRows, totalCols) {
  return Array.from({ length: totalRows + 1 }, () =>
    Array.from({ length: totalCols + 1 }, () => NO_COUPLE_INDEX),
  )
}

export function getCoupleIndex(coupleGrid, row, col) {
  return coupleGrid[row]?.[col] ?? NO_COUPLE_INDEX
}

function clearCoupleAt(coupleGrid, row, col) {
  if (coupleGrid[row]) coupleGrid[row][col] = NO_COUPLE_INDEX
}

/** Số cặp tiếp theo (0, 1, 2, …) */
export function getNextCoupleIndex(coupleGrid) {
  let max = -1
  for (let row = 1; row < coupleGrid.length; row += 1) {
    for (let col = 1; col < (coupleGrid[row]?.length ?? 0); col += 1) {
      if (coupleGrid[row][col] > max) max = coupleGrid[row][col]
    }
  }
  return max + 1
}

/** Dựng lưới từ map ghế COUPLE kề nhau (trái → phải: 0,0, 1,1, …) */
export function rebuildCoupleGridFromCellMap(cellMap, totalRows, totalCols) {
  const grid = createCoupleGrid(totalRows, totalCols)
  let nextIndex = 0
  for (let row = 1; row <= totalRows; row += 1) {
    for (let col = 1; col < totalCols; col += 1) {
      const left = getCellAt(cellMap, row, col)
      const right = getCellAt(cellMap, row, col + 1)
      if (left?.seatType !== SEAT_TYPE.COUPLE || right?.seatType !== SEAT_TYPE.COUPLE) continue
      if (getCoupleIndex(grid, row, col) !== NO_COUPLE_INDEX) continue
      grid[row][col] = nextIndex
      grid[row][col + 1] = nextIndex
      nextIndex += 1
    }
  }
  return grid
}

export function layoutDefinitionToCellMap(layout) {
  const map = createEmptyCellMap()
  if (!layout?.cells?.length) return map
  for (const cell of layout.cells) {
    if (cell.type === CELL_INPUT_TYPE.SEAT && cell.seatType) {
      map.set(cellKey(cell.row, cell.col), createSeatCell(cell.seatType))
    }
  }
  return map
}

export function createLayoutState(layout) {
  const totalRows = clampLayoutDimension(layout?.totalRows ?? DEFAULT_LAYOUT_ROWS)
  const totalCols = clampLayoutDimension(layout?.totalCols ?? DEFAULT_LAYOUT_COLS)
  const cellMap = layoutDefinitionToCellMap(layout)
  const coupleGrid = rebuildCoupleGridFromCellMap(cellMap, totalRows, totalCols)
  return { cellMap, coupleGrid, totalRows, totalCols }
}

export function seatsToLayoutDefinition(seats, fallbackRows, fallbackCols) {
  if (!seats?.length) {
    return createEmptyLayoutDefinition(fallbackRows, fallbackCols)
  }
  const totalRows = Math.max(...seats.map((s) => s.row || 1), fallbackRows)
  const totalCols = Math.max(...seats.map((s) => s.col || 1), fallbackCols)
  const map = createEmptyCellMap()
  for (const s of seats) {
    map.set(cellKey(s.row, s.col), createSeatCell(s.seatType || SEAT_TYPE.STANDARD))
  }
  const coupleGrid = rebuildCoupleGridFromCellMap(map, totalRows, totalCols)
  return cellMapToLayoutDefinition(totalRows, totalCols, map)
}

export function createEmptyLayoutDefinition(
  totalRows = DEFAULT_LAYOUT_ROWS,
  totalCols = DEFAULT_LAYOUT_COLS,
) {
  return cellMapToLayoutDefinition(totalRows, totalCols, createEmptyCellMap())
}

/** Ô không vẽ = AISLE trong payload gửi API */
export function cellMapToLayoutDefinition(totalRows, totalCols, cellMap) {
  const cells = []
  for (let row = 1; row <= totalRows; row += 1) {
    for (let col = 1; col <= totalCols; col += 1) {
      const painted = cellMap.get(cellKey(row, col))
      if (painted?.type === CELL_INPUT_TYPE.SEAT && painted.seatType) {
        cells.push({
          row,
          col,
          type: CELL_INPUT_TYPE.SEAT,
          seatType: painted.seatType,
        })
      } else {
        cells.push({ row, col, type: CELL_INPUT_TYPE.AISLE })
      }
    }
  }
  return {
    totalRows,
    totalCols,
    screenPosition: 'TOP',
    cells,
  }
}

/** Các ô cùng coupleIndex trên một hàng */
export function getCouplePairCells(row, col, coupleGrid) {
  const index = getCoupleIndex(coupleGrid, row, col)
  if (index < 0) return []
  const cells = []
  for (let c = 1; c < (coupleGrid[row]?.length ?? 0); c += 1) {
    if (coupleGrid[row][c] === index) cells.push({ row, col: c })
  }
  cells.sort((a, b) => a.col - b.col)
  return cells
}

/** LEFT / RIGHT từ coupleGrid */
export function resolveCoupleSide(coupleGrid, row, col) {
  const pair = getCouplePairCells(row, col, coupleGrid)
  if (pair.length < 2) return null
  return pair[0].col === col ? COUPLE_CELL_SIDE.LEFT : COUPLE_CELL_SIDE.RIGHT
}

function getEraseTargets(cellMap, coupleGrid, row, col) {
  const pair = getCouplePairCells(row, col, coupleGrid)
  if (pair.length > 0) return pair
  if (getCellAt(cellMap, row, col)) return [{ row, col }]
  return [{ row, col }]
}

/** Hai ô sẽ vẽ khi chọn cọ ghế đôi */
export function getCouplePaintPlan(row, col, totalCols) {
  if (col >= 1 && col < totalCols) {
    return {
      cells: [
        { row, col },
        { row, col: col + 1 },
      ],
    }
  }
  if (col === totalCols && col > 1) {
    return {
      cells: [
        { row, col: col - 1 },
        { row, col },
      ],
    }
  }
  return null
}

export function getCoupleAnchorCells(row, col, totalCols) {
  const plan = getCouplePaintPlan(row, col, totalCols)
  if (!plan) return []
  return plan.cells
}

export function getCellsForBrush(brush, row, col, totalCols) {
  if (brush === SEAT_TYPE.COUPLE) {
    return getCoupleAnchorCells(row, col, totalCols)
  }
  return [{ row, col }]
}

export function isCellPartOfCouple(coupleGrid, row, col) {
  return getCouplePairCells(row, col, coupleGrid).length === 2
}

function cloneCoupleGrid(coupleGrid) {
  return coupleGrid.map((row) => [...row])
}

function removeCouplePartners(nextMap, nextGrid, coupleGrid, row, col, keepKeys = new Set()) {
  for (const { row: r, col: c } of getCouplePairCells(row, col, coupleGrid)) {
    const key = cellKey(r, c)
    if (!keepKeys.has(key)) {
      nextMap.delete(key)
      clearCoupleAt(nextGrid, r, c)
    }
  }
}

function clearCoupleConflictsBeforePaint(nextMap, nextGrid, coupleGrid, targets) {
  const paintKeys = new Set(targets.map(({ row, col }) => cellKey(row, col)))
  for (const { row, col } of targets) {
    removeCouplePartners(nextMap, nextGrid, coupleGrid, row, col, paintKeys)
  }
}

export function canApplyBrush(brush, row, col, totalCols) {
  return getCellsForBrush(brush, row, col, totalCols).length > 0
}

export function applyBrushToMap(cellMap, coupleGrid, brush, row, col, totalCols) {
  const nextMap = new Map(cellMap)
  const nextGrid = cloneCoupleGrid(coupleGrid)

  if (brush === HALL_LAYOUT_BRUSH.ERASER) {
    for (const { row: r, col: c } of getEraseTargets(cellMap, coupleGrid, row, col)) {
      nextMap.delete(cellKey(r, c))
      clearCoupleAt(nextGrid, r, c)
    }
    return { cellMap: nextMap, coupleGrid: nextGrid }
  }

  if (brush === SEAT_TYPE.COUPLE) {
    const plan = getCouplePaintPlan(row, col, totalCols)
    if (!plan) return { cellMap: nextMap, coupleGrid: nextGrid }

    clearCoupleConflictsBeforePaint(nextMap, nextGrid, coupleGrid, plan.cells)
    const newIndex = getNextCoupleIndex(nextGrid)
    for (const { row: r, col: c } of plan.cells) {
      nextMap.set(cellKey(r, c), createSeatCell(SEAT_TYPE.COUPLE))
      nextGrid[r][c] = newIndex
    }
    return { cellMap: nextMap, coupleGrid: nextGrid }
  }

  const targets = getCellsForBrush(brush, row, col, totalCols)
  if (targets.length === 0) return { cellMap: nextMap, coupleGrid: nextGrid }

  clearCoupleConflictsBeforePaint(nextMap, nextGrid, coupleGrid, targets)
  for (const { row: r, col: c } of targets) {
    clearCoupleAt(nextGrid, r, c)
    nextMap.set(cellKey(r, c), createSeatCell(brush))
  }

  return { cellMap: nextMap, coupleGrid: nextGrid }
}

export function countSeatsInMap(cellMap) {
  return cellMap.size
}

export function resizeLayoutState(cellMap, coupleGrid, totalRows, totalCols) {
  const nextMap = createEmptyCellMap()
  for (const [key, cell] of cellMap) {
    const { row, col } = parseCellKey(key)
    if (row >= 1 && row <= totalRows && col >= 1 && col <= totalCols) {
      nextMap.set(key, cell)
    }
  }
  const nextGrid = rebuildCoupleGridFromCellMap(nextMap, totalRows, totalCols)
  return { cellMap: nextMap, coupleGrid: nextGrid }
}
