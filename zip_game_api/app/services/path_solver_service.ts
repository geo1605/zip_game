import type { LevelClue } from '#models/level'
import { DEFAULT_GRID_SIZE, getOrthogonalNeighbors, isValidCell } from '#utils/board_utils'

export interface PathSolverOptions {
  gridSize?: number
  /** Hard cap keeps unsolvable user supplied puzzles from monopolizing the server. */
  maxNodes?: number
}

/** Depth-first search for a Hamiltonian path that visits every clue in order. */
export default class PathSolverService {
  findSolution(clues: LevelClue[], options: PathSolverOptions = {}): number[] | null {
    const gridSize = options.gridSize ?? DEFAULT_GRID_SIZE
    const maxNodes = options.maxNodes ?? 1_000_000
    const cellCount = gridSize * gridSize
    if (!Array.isArray(clues) || clues.length < 2 || maxNodes < 1) return null

    const clueByCell = new Map<number, number>()
    const clueCells = new Set<number>()
    const numbers = new Set<number>()
    for (const clue of clues) {
      if (
        !Number.isInteger(clue.number) ||
        !isValidCell(clue.cell, gridSize) ||
        clueByCell.has(clue.cell) ||
        numbers.has(clue.number)
      ) {
        return null
      }
      clueByCell.set(clue.cell, clue.number)
      clueCells.add(clue.cell)
      numbers.add(clue.number)
    }
    if ([...numbers].sort((a, b) => a - b).some((number, index) => number !== index + 1)) return null

    const start = clues.find((clue) => clue.number === 1)?.cell
    if (start === undefined) return null

    const visited = new Set<number>([start])
    const path = [start]
    let nodesVisited = 0

    const search = (cell: number, nextClue: number): boolean => {
      nodesVisited++
      if (nodesVisited > maxNodes) return false
      if (path.length === cellCount) {
        return nextClue > clues.length && clueByCell.get(cell) === clues.length
      }

      const candidates = getOrthogonalNeighbors(cell, gridSize)
        .filter((candidate) => !visited.has(candidate))
        .filter((candidate) => {
          const number = clueByCell.get(candidate)
          return number === undefined || number === nextClue
        })
        .map((candidate) => ({
          cell: candidate,
          onward: getOrthogonalNeighbors(candidate, gridSize).filter(
            (neighbor) => !visited.has(neighbor) && neighbor !== candidate
          ).length,
        }))
        // Warnsdorff ordering tends to reach a full path quickly; random tie breaking
        // is intentionally avoided here so solving remains reproducible.
        .sort((a, b) => a.onward - b.onward)

      for (const candidate of candidates) {
        const clueNumber = clueByCell.get(candidate.cell)
        visited.add(candidate.cell)
        path.push(candidate.cell)
        if (search(candidate.cell, clueNumber === undefined ? nextClue : nextClue + 1)) return true
        path.pop()
        visited.delete(candidate.cell)
        if (nodesVisited > maxNodes) return false
      }
      return false
    }

    return search(start, 2) ? [...path] : null
  }

  hasSolution(clues: LevelClue[], options: PathSolverOptions = {}): boolean {
    return this.findSolution(clues, options) !== null
  }
}
