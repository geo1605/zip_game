import GameValidatorService from '#services/game_validator_service'
import PathSolverService from '#services/path_solver_service'
import type { BoardDefinition } from '#utils/board_utils'

export type HintResult =
  | { status: 'next'; nextCell: number; undoSteps: 0 }
  | { status: 'backtrack'; nextCell: number; undoSteps: number }
  | { status: 'invalid'; code: string; message: string; index: number }

/** Returns one actionable move without exposing the complete stored solution. */
export default class HintService {
  constructor(
    private readonly validator = new GameValidatorService(),
    private readonly solver = new PathSolverService()
  ) {}

  getHint(board: BoardDefinition, storedSolution: number[], path: number[]): HintResult {
    if (path.length === 0) {
      return { status: 'next', nextCell: board.checkpoints[0], undoSteps: 0 }
    }

    const validation = this.validator.validatePrefix(board, path)
    if (!validation.valid) {
      return {
        status: 'invalid',
        code: validation.code ?? 'INVALID_PATH',
        message: validation.message ?? 'The current path is invalid',
        index: validation.index ?? 0,
      }
    }

    const total = board.size * board.size
    if (path.length >= total) {
      return {
        status: 'invalid',
        code: 'COMPLETE',
        message: 'The path is already complete',
        index: path.length - 1,
      }
    }

    let commonPrefix = 0
    while (commonPrefix < path.length && path[commonPrefix] === storedSolution[commonPrefix]) {
      commonPrefix++
    }
    if (commonPrefix === path.length) {
      return { status: 'next', nextCell: storedSolution[path.length], undoSteps: 0 }
    }

    const continuation = this.solver.hasSolution(board, path, 60_000)
    if (continuation) {
      return { status: 'next', nextCell: continuation[path.length], undoSteps: 0 }
    }

    for (let keep = path.length - 1; keep > commonPrefix; keep--) {
      const prefix = path.slice(0, keep)
      const solution = this.solver.hasSolution(board, prefix, 20_000)
      if (solution) {
        return {
          status: 'backtrack',
          undoSteps: path.length - keep,
          nextCell: solution[keep],
        }
      }
    }

    const keep = Math.max(commonPrefix, 1)
    return {
      status: 'backtrack',
      undoSteps: Math.max(1, path.length - keep),
      nextCell: storedSolution[keep],
    }
  }
}
