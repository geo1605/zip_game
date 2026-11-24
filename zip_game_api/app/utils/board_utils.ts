/** Board and cell helpers shared by the game services. Cell indices are row-major. */
export const DEFAULT_GRID_SIZE = 6

export interface BoardPosition {
  row: number
  column: number
}

export interface BoardMove {
  from: number
  to: number
}

export function isValidCell(cell: number, gridSize = DEFAULT_GRID_SIZE): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < gridSize * gridSize
}

export function cellToPosition(cell: number, gridSize = DEFAULT_GRID_SIZE): BoardPosition {
  if (!isValidCell(cell, gridSize)) {
    throw new RangeError(`Cell ${cell} is outside a ${gridSize}x${gridSize} board`)
  }

  return { row: Math.floor(cell / gridSize), column: cell % gridSize }
}

export function positionToCell(position: BoardPosition, gridSize = DEFAULT_GRID_SIZE): number {
  const { row, column } = position
  if (
    !Number.isInteger(row) ||
    !Number.isInteger(column) ||
    row < 0 ||
    column < 0 ||
    row >= gridSize ||
    column >= gridSize
  ) {
    throw new RangeError(`Position (${row}, ${column}) is outside a ${gridSize}x${gridSize} board`)
  }

  return row * gridSize + column
}

export function getOrthogonalNeighbors(cell: number, gridSize = DEFAULT_GRID_SIZE): number[] {
  const { row, column } = cellToPosition(cell, gridSize)
  const neighbors: number[] = []
  if (row > 0) neighbors.push(cell - gridSize)
  if (column < gridSize - 1) neighbors.push(cell + 1)
  if (row < gridSize - 1) neighbors.push(cell + gridSize)
  if (column > 0) neighbors.push(cell - 1)
  return neighbors
}

export function areOrthogonallyAdjacent(
  first: number,
  second: number,
  gridSize = DEFAULT_GRID_SIZE
) {
  if (!isValidCell(first, gridSize) || !isValidCell(second, gridSize)) return false
  const a = cellToPosition(first, gridSize)
  const b = cellToPosition(second, gridSize)
  return Math.abs(a.row - b.row) + Math.abs(a.column - b.column) === 1
}

export function isValidMove(move: BoardMove, gridSize = DEFAULT_GRID_SIZE): boolean {
  return areOrthogonallyAdjacent(move.from, move.to, gridSize)
}

export function createBoard(gridSize = DEFAULT_GRID_SIZE): number[][] {
  if (!Number.isInteger(gridSize) || gridSize < 1) {
    throw new RangeError('Grid size must be a positive integer')
  }
  return Array.from({ length: gridSize }, (_, row) =>
    Array.from({ length: gridSize }, (_cell, column) => row * gridSize + column)
  )
}
