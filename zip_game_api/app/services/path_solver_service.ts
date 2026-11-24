import type { LevelClue } from '#models/level'
import {
  checkpointMap,
  DEFAULT_GRID_SIZE,
  getOrthogonalNeighbors,
  isValidCell,
  type BoardDefinition,
} from '#utils/board_utils'
import GameValidatorService from '#services/game_validator_service'

export interface SolveOptions {
  maxNodes?: number
  maxSolutions?: number
  heuristic?: boolean
}

export interface SolveResult {
  solutions: number[][]
  nodes: number
  exhausted: boolean
}

export interface FindSolutionOptions extends SolveOptions {
  gridSize?: number
}

/** Backtracking solver for Hamiltonian paths constrained by ordered checkpoints. */
export default class PathSolverService {
  constructor(private readonly validator = new GameValidatorService()) {}

  solve(board: BoardDefinition, prefix: number[] = [], options: SolveOptions = {}): SolveResult {
    const maxNodes = options.maxNodes ?? 500_000
    const maxSolutions = options.maxSolutions ?? 1
    const heuristic = options.heuristic ?? true
    const size = board.size
    const total = size * size
    const checkpointNumbers = checkpointMap(board)
    const lastNumber = board.checkpoints.length
    const lastCell = board.checkpoints[lastNumber - 1]
    const adjacency = Array.from({ length: total }, (_, cell) =>
      isValidCell(cell, size) ? getOrthogonalNeighbors(cell, size) : []
    )
    const initialPath = prefix.length > 0 ? [...prefix] : [board.checkpoints[0]]

    const prefixValidation = this.validator.validatePrefix(board, initialPath)
    if (!prefixValidation.valid || maxNodes < 1 || maxSolutions < 1) {
      return { solutions: [], nodes: 0, exhausted: true }
    }
    if (initialPath.length > total) return { solutions: [], nodes: 0, exhausted: true }

    const visited = new Array<boolean>(total).fill(false)
    for (const cell of initialPath) visited[cell] = true
    const path = initialPath
    let nextCheckpoint = prefixValidation.nextCheckpoint
    const solutions: number[][] = []
    let nodes = 0
    let aborted = false

    const isPromising = (head: number): boolean => {
      const remaining = total - path.length
      if (remaining === 0) return head === lastCell && nextCheckpoint > lastNumber

      // Any disconnected free cell or non-final dead end makes completion impossible.
      for (let cell = 0; cell < total; cell++) {
        if (visited[cell]) continue
        let degree = 0
        for (const neighbor of adjacency[cell]) {
          if (!visited[neighbor] || neighbor === head) degree++
        }
        if (degree === 0 || (degree === 1 && cell !== lastCell)) return false
      }

      const stack = [head]
      const reached = new Set<number>([head])
      let freeReached = 0
      while (stack.length > 0) {
        const cell = stack.pop()!
        for (const neighbor of adjacency[cell]) {
          if (!visited[neighbor] && !reached.has(neighbor)) {
            reached.add(neighbor)
            freeReached++
            stack.push(neighbor)
          }
        }
      }
      return freeReached === remaining
    }

    const search = (): void => {
      if (aborted || solutions.length >= maxSolutions) return
      nodes++
      if (nodes > maxNodes) {
        aborted = true
        return
      }

      const head = path[path.length - 1]
      if (path.length === total) {
        if (head === lastCell && nextCheckpoint > lastNumber) solutions.push([...path])
        return
      }

      let candidates = adjacency[head].filter((cell) => {
        if (visited[cell]) return false
        const number = checkpointNumbers.get(cell)
        if (number !== undefined && number !== nextCheckpoint) return false
        return number !== lastNumber || path.length + 1 === total
      })

      if (heuristic && candidates.length > 1) {
        candidates = candidates
          .map((cell) => ({
            cell,
            exits: adjacency[cell].filter((next) => !visited[next]).length,
          }))
          .sort((a, b) => a.exits - b.exits)
          .map(({ cell }) => cell)
      }

      for (const cell of candidates) {
        const number = checkpointNumbers.get(cell)
        visited[cell] = true
        path.push(cell)
        if (number !== undefined) nextCheckpoint++
        if (isPromising(cell)) search()
        if (number !== undefined) nextCheckpoint--
        path.pop()
        visited[cell] = false
        if (aborted || solutions.length >= maxSolutions) return
      }
    }

    if (isPromising(path[path.length - 1])) search()
    return { solutions, nodes: Math.min(nodes, maxNodes), exhausted: !aborted }
  }

  hasSolution(board: BoardDefinition, prefix?: number[], maxNodes?: number): number[] | null
  hasSolution(clues: LevelClue[], options?: FindSolutionOptions): number[] | null
  hasSolution(
    boardOrClues: BoardDefinition | LevelClue[],
    prefixOrOptions: number[] | FindSolutionOptions = [],
    maxNodes = 500_000
  ): number[] | null {
    const isBoard = !Array.isArray(boardOrClues)
    const board = isBoard
      ? boardOrClues
      : this.fromClues(boardOrClues, (prefixOrOptions as FindSolutionOptions).gridSize)
    if (!board) return null
    const prefix = isBoard ? (prefixOrOptions as number[]) : []
    const limit = isBoard
      ? maxNodes
      : ((prefixOrOptions as FindSolutionOptions).maxNodes ?? maxNodes)
    return this.solve(board, prefix, { maxNodes: limit, maxSolutions: 1 }).solutions[0] ?? null
  }

  findSolution(clues: LevelClue[], options: FindSolutionOptions = {}): number[] | null {
    return this.hasSolution(clues, options)
  }

  private fromClues(clues: LevelClue[], size = DEFAULT_GRID_SIZE): BoardDefinition | null {
    if (!Array.isArray(clues) || clues.length < 2) return null
    const ordered = [...clues].sort((a, b) => a.number - b.number)
    if (
      ordered.some((clue, index) => clue.number !== index + 1 || !isValidCell(clue.cell, size)) ||
      new Set(ordered.map((clue) => clue.cell)).size !== ordered.length
    ) {
      return null
    }
    return { size, checkpoints: ordered.map((clue) => clue.cell) }
  }
}
