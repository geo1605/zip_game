import type { LevelClue } from '#models/level'
import { areOrthogonallyAdjacent, DEFAULT_GRID_SIZE, isValidCell } from '#utils/board_utils'

export interface PathValidationOptions {
  gridSize?: number
  requireComplete?: boolean
}

export interface PathValidationResult {
  isValid: boolean
  isComplete: boolean
  errors: string[]
  nextClue: number | null
}

/** Validates a path independently of HTTP and persistence concerns. */
export default class GameValidatorService {
  validatePath(
    path: number[],
    clues: LevelClue[],
    options: PathValidationOptions = {}
  ): PathValidationResult {
    const gridSize = options.gridSize ?? DEFAULT_GRID_SIZE
    const requireComplete = options.requireComplete ?? true
    const errors: string[] = []
    const boardCellCount = gridSize * gridSize

    if (!Array.isArray(path)) {
      return {
        isValid: false,
        isComplete: false,
        errors: ['Path must be an array'],
        nextClue: null,
      }
    }
    if (!Array.isArray(clues) || clues.length === 0) {
      return {
        isValid: false,
        isComplete: false,
        errors: ['Level must contain numbered clues'],
        nextClue: null,
      }
    }

    const clueByCell = new Map<number, number>()
    const clueNumbers = new Set<number>()
    for (const clue of clues) {
      if (
        !Number.isInteger(clue.number) ||
        clue.number < 1 ||
        !isValidCell(clue.cell, gridSize) ||
        clueByCell.has(clue.cell) ||
        clueNumbers.has(clue.number)
      ) {
        errors.push('Level clues contain duplicate or invalid numbers/cells')
        break
      }
      clueByCell.set(clue.cell, clue.number)
      clueNumbers.add(clue.number)
    }

    const orderedNumbers = [...clueNumbers].sort((a, b) => a - b)
    if (orderedNumbers.some((number, index) => number !== index + 1)) {
      errors.push('Level clue numbers must start at 1 and be consecutive')
    }
    if (errors.length > 0) {
      return { isValid: false, isComplete: false, errors, nextClue: null }
    }

    if (path.length === 0) {
      const emptyPathErrors = requireComplete ? [`Path must visit all ${boardCellCount} cells`] : []
      return {
        isValid: emptyPathErrors.length === 0,
        isComplete: false,
        errors: emptyPathErrors,
        nextClue: 1,
      }
    }

    const startCell = clues.find((clue) => clue.number === 1)!.cell
    if (path[0] !== startCell) errors.push('Path must start at clue 1')

    const visited = new Set<number>()
    let expectedClue = 1
    for (let index = 0; index < path.length; index++) {
      const cell = path[index]
      if (!isValidCell(cell, gridSize)) {
        errors.push(`Cell at position ${index} is outside the board`)
        continue
      }
      if (visited.has(cell)) errors.push(`Cell ${cell} is repeated`)
      visited.add(cell)

      if (index > 0 && isValidCell(path[index - 1], gridSize)) {
        if (!areOrthogonallyAdjacent(path[index - 1], cell, gridSize)) {
          errors.push(`Move from ${path[index - 1]} to ${cell} is not orthogonal`)
        }
      }

      const clueNumber = clueByCell.get(cell)
      if (clueNumber !== undefined) {
        if (clueNumber !== expectedClue) {
          errors.push(`Expected clue ${expectedClue} before clue ${clueNumber}`)
        } else {
          expectedClue++
        }
      }
    }

    if (path.length > boardCellCount) errors.push('Path contains more cells than the board')
    const isComplete = path.length === boardCellCount && visited.size === boardCellCount
    if (requireComplete && !isComplete) errors.push(`Path must visit all ${boardCellCount} cells`)
    if (isComplete && expectedClue <= clues.length)
      errors.push(`Path is missing clue ${expectedClue}`)
    if (
      isComplete &&
      path[path.length - 1] !== clues.find((clue) => clue.number === clues.length)?.cell
    ) {
      errors.push(`Path must end at clue ${clues.length}`)
    }

    return {
      isValid: errors.length === 0,
      isComplete: isComplete && errors.length === 0,
      errors: [...new Set(errors)],
      nextClue: expectedClue <= clues.length ? expectedClue : null,
    }
  }
}
