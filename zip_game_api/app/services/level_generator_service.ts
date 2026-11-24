import type { CreateLevelData } from '#repositories/level_repository'
import type { LevelClue, LevelDifficulty } from '#models/level'
import { DEFAULT_GRID_SIZE, getOrthogonalNeighbors } from '#utils/board_utils'

export interface GenerateLevelOptions {
  name?: string
  gridSize?: number
}

const CLUE_COUNTS: Record<LevelDifficulty, [number, number]> = {
  easy: [9, 12],
  medium: [6, 8],
  hard: [4, 5],
}

/** Produces 6x6 Hamiltonian-path puzzles, so every generated level has a solution. */
export default class LevelGeneratorService {
  generate(difficulty: LevelDifficulty, options: GenerateLevelOptions = {}): CreateLevelData {
    const gridSize = options.gridSize ?? DEFAULT_GRID_SIZE
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw new RangeError(`Unsupported level difficulty: ${difficulty}`)
    }
    if (!Number.isInteger(gridSize) || gridSize < 2) {
      throw new RangeError('Grid size must be an integer of at least 2')
    }

    const solution = this.createHamiltonianPath(gridSize)
    const [minimumClues, maximumClues] = CLUE_COUNTS[difficulty]
    const clueCount = this.randomInteger(
      Math.min(minimumClues, solution.length),
      Math.min(maximumClues, solution.length)
    )
    const selectedPositions = new Set<number>([0, solution.length - 1])
    while (selectedPositions.size < clueCount) {
      selectedPositions.add(this.randomInteger(1, solution.length - 2))
    }

    const orderedPositions = [...selectedPositions].sort((a, b) => a - b)
    const clues: LevelClue[] = orderedPositions.map((position, index) => ({
      number: index + 1,
      cell: solution[position],
    }))

    return {
      name: options.name ?? `Nivel ${difficulty} ${Date.now()}`,
      difficulty,
      gridSize,
      clues,
      solution,
      isGenerated: true,
    }
  }

  private createHamiltonianPath(gridSize: number): number[] {
    const cellCount = gridSize * gridSize
    // Randomized Warnsdorff search finds varied paths quickly on the standard board.
    // The serpentine fallback guarantees generation even if a bounded search stalls.
    for (let attempt = 0; attempt < 12; attempt++) {
      const start = this.randomInteger(0, cellCount - 1)
      const path = [start]
      const visited = new Set(path)
      let nodes = 0
      const search = (cell: number): boolean => {
        if (path.length === cellCount) return true
        if (++nodes > 25_000) return false
        const candidates = getOrthogonalNeighbors(cell, gridSize)
          .filter((candidate) => !visited.has(candidate))
          .map((candidate) => ({
            cell: candidate,
            exits: getOrthogonalNeighbors(candidate, gridSize).filter(
              (neighbor) => !visited.has(neighbor)
            ).length,
            tie: Math.random(),
          }))
          .sort((a, b) => a.exits - b.exits || a.tie - b.tie)

        for (const candidate of candidates) {
          path.push(candidate.cell)
          visited.add(candidate.cell)
          if (search(candidate.cell)) return true
          visited.delete(candidate.cell)
          path.pop()
        }
        return false
      }
      if (search(start)) return path
    }

    const fallback: number[] = []
    for (let row = 0; row < gridSize; row++) {
      const columns = Array.from({ length: gridSize }, (_, column) => column)
      if (row % 2 === 1) columns.reverse()
      fallback.push(...columns.map((column) => row * gridSize + column))
    }
    return fallback
  }

  private randomInteger(minimum: number, maximum: number): number {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum
  }
}
