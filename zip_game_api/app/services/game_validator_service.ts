import type { LevelClue } from '#models/level'
import {
  areAdjacent,
  checkpointMap,
  DEFAULT_GRID_SIZE,
  isValidCell,
  type BoardDefinition,
} from '#utils/board_utils'

export type PathErrorCode =
  | 'EMPTY_PATH'
  | 'OUT_OF_BOUNDS'
  | 'INVALID_START'
  | 'REPEATED_CELL'
  | 'NOT_ADJACENT'
  | 'CHECKPOINT_ORDER'
  | 'PREMATURE_END'
  | 'INCOMPLETE'
  | 'INVALID_END'
  | 'INVALID_BOARD'

export interface PathValidationResult {
  valid: boolean
  isValid: boolean
  isComplete: boolean
  code?: PathErrorCode
  message?: string
  index?: number
  errors: string[]
  nextCheckpoint: number
  nextClue: number | null
}

export interface PathValidationOptions {
  gridSize?: number
  requireComplete?: boolean
}

/** Server-side ZIP rule validation. Prefix checks support moves and smart hints. */
export default class GameValidatorService {
  validatePrefix(board: BoardDefinition, path: number[]): PathValidationResult {
    const total = board.size * board.size
    if (
      !Number.isInteger(board.size) ||
      board.size < 2 ||
      !Array.isArray(board.checkpoints) ||
      board.checkpoints.length < 2 ||
      board.checkpoints.some((cell) => !isValidCell(cell, board.size)) ||
      new Set(board.checkpoints).size !== board.checkpoints.length
    ) {
      return this.fail('INVALID_BOARD', 'The level contains invalid checkpoints', 0, 1)
    }
    if (!Array.isArray(path) || path.length === 0) {
      return this.fail('EMPTY_PATH', 'The path is empty', 0, 1)
    }
    for (const [index, cell] of path.entries()) {
      if (!isValidCell(cell, board.size)) {
        return this.fail('OUT_OF_BOUNDS', `Cell ${cell} is outside the board`, index, 1)
      }
    }
    if (path[0] !== board.checkpoints[0]) {
      return this.fail('INVALID_START', 'The path must start on checkpoint 1', 0, 1)
    }

    const cellsByCheckpoint = checkpointMap(board)
    const lastNumber = board.checkpoints.length
    const visited = new Set<number>()
    let nextCheckpoint = 1

    for (let index = 0; index < path.length; index++) {
      const cell = path[index]
      if (visited.has(cell)) {
        return this.fail('REPEATED_CELL', `Cell ${cell} is visited twice`, index, nextCheckpoint)
      }
      if (index > 0 && !areAdjacent(path[index - 1], cell, board.size)) {
        return this.fail(
          'NOT_ADJACENT',
          `Move ${path[index - 1]} -> ${cell} is not horizontal or vertical`,
          index,
          nextCheckpoint
        )
      }
      const checkpointNumber = cellsByCheckpoint.get(cell)
      if (checkpointNumber !== undefined) {
        if (checkpointNumber !== nextCheckpoint) {
          return this.fail(
            'CHECKPOINT_ORDER',
            `Expected checkpoint ${nextCheckpoint} but reached ${checkpointNumber}`,
            index,
            nextCheckpoint
          )
        }
        if (checkpointNumber === lastNumber && index !== total - 1) {
          return this.fail(
            'PREMATURE_END',
            'The highest checkpoint can only be reached after visiting every cell',
            index,
            nextCheckpoint
          )
        }
        nextCheckpoint++
      }
      visited.add(cell)
    }

    return this.success(nextCheckpoint)
  }

  validateSolution(board: BoardDefinition, path: number[]): PathValidationResult {
    const prefix = this.validatePrefix(board, path)
    if (!prefix.valid) return prefix
    const total = board.size * board.size
    if (path.length !== total) {
      return this.fail(
        'INCOMPLETE',
        `The path covers ${path.length} of ${total} cells`,
        path.length,
        prefix.nextCheckpoint
      )
    }
    const lastCell = board.checkpoints[board.checkpoints.length - 1]
    if (path[path.length - 1] !== lastCell) {
      return this.fail(
        'INVALID_END',
        'The path must end on the highest checkpoint',
        path.length - 1,
        prefix.nextCheckpoint
      )
    }
    return { ...prefix, isComplete: true }
  }

  /** Compatibility adapter for controllers and models using numbered clue objects. */
  validatePath(
    path: number[],
    clues: LevelClue[],
    options: PathValidationOptions = {}
  ): PathValidationResult {
    if (!Array.isArray(clues) || clues.length === 0) {
      return this.fail('INVALID_BOARD', 'The level contains no checkpoints', 0, 1)
    }
    const ordered = [...clues].sort((a, b) => a.number - b.number)
    if (ordered.some((clue, index) => clue.number !== index + 1)) {
      return this.fail('INVALID_BOARD', 'Checkpoint numbers must be consecutive from 1', 0, 1)
    }
    const board: BoardDefinition = {
      size: options.gridSize ?? DEFAULT_GRID_SIZE,
      checkpoints: ordered.map((clue) => clue.cell),
    }

    if (options.requireComplete === false) {
      const result = this.validatePrefix(board, path)
      return { ...result, isComplete: false }
    }
    return this.validateSolution(board, path)
  }

  private fail(
    code: PathErrorCode,
    message: string,
    index: number,
    nextCheckpoint: number
  ): PathValidationResult {
    return {
      valid: false,
      isValid: false,
      isComplete: false,
      code,
      message,
      index,
      errors: [message],
      nextCheckpoint,
      nextClue: nextCheckpoint,
    }
  }

  private success(nextCheckpoint: number): PathValidationResult {
    return {
      valid: true,
      isValid: true,
      isComplete: false,
      errors: [],
      nextCheckpoint,
      nextClue: nextCheckpoint,
    }
  }
}
