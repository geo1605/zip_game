import type { CreateLevelData } from '#repositories/level_repository'
import type { LevelClue, LevelDifficulty } from '#models/level'
import {
  BOARD_SIZE,
  countTurns,
  DEFAULT_GRID_SIZE,
  getOrthogonalNeighbors,
  type BoardDefinition,
} from '#utils/board_utils'
import { createRng, pick, randomInt, shuffle, type Rng } from '#utils/random'
import GameValidatorService from '#services/game_validator_service'
import PathSolverService from '#services/path_solver_service'

export interface DifficultyMetrics {
  checkpointCount: number
  averageGap: number
  solutionCount: number
  searchEffort: number
  turns: number
  score: number
}

export interface GeneratedLevel extends CreateLevelData {
  gridSize: number
  clues: LevelClue[]
  checkpointCount: number
  difficultyScore: number
  metrics: DifficultyMetrics
}

export interface GenerateLevelOptions {
  name?: string
  gridSize?: number
  seed?: number
}

export const CHECKPOINT_RANGE: Record<LevelDifficulty, [number, number]> = {
  easy: [10, 13],
  medium: [7, 9],
  hard: [4, 6],
}

export const SCORE_THRESHOLDS = { medium: 45, hard: 68 }
const SOLUTION_CAP = 10
const SEARCH_NODE_CAP = 12_000

/** Generates Hamiltonian ZIP puzzles and measures their estimated difficulty. */
export default class LevelGeneratorService {
  constructor(
    private readonly solver = new PathSolverService(),
    private readonly validator = new GameValidatorService()
  ) {}

  generate(difficulty: LevelDifficulty, options: GenerateLevelOptions = {}): GeneratedLevel {
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw new RangeError(`Unsupported level difficulty: ${difficulty}`)
    }
    const size = options.gridSize ?? DEFAULT_GRID_SIZE
    if (!Number.isInteger(size) || size < 2) {
      throw new RangeError('Grid size must be an integer of at least 2')
    }

    const rng = createRng(options.seed ?? Date.now() ^ Math.floor(Math.random() * 1e9))
    let best: GeneratedLevel | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (let attempt = 0; attempt < 20; attempt++) {
      const solution = this.randomHamiltonianPath(rng, size)
      const range = CHECKPOINT_RANGE[difficulty]
      const count = randomInt(
        rng,
        Math.min(range[0], solution.length),
        Math.min(range[1], solution.length)
      )
      const checkpointCells = this.placeCheckpoints(rng, solution, count, difficulty)
      const board: BoardDefinition = { size, checkpoints: checkpointCells }
      if (!this.validator.validateSolution(board, solution).valid) continue

      const metrics = this.measure(board, solution)
      const clues = checkpointCells.map((cell, index) => ({ number: index + 1, cell }))
      const level: GeneratedLevel = {
        name: options.name ?? this.defaultName(difficulty, rng),
        difficulty,
        gridSize: size,
        clues,
        solution,
        isGenerated: true,
        checkpointCount: clues.length,
        difficultyScore: metrics.score,
        metrics,
      }

      const distance = this.distanceToBand(metrics.score, difficulty)
      if (distance === 0) return level
      if (distance < bestDistance) {
        best = level
        bestDistance = distance
      }
    }

    // The generated path is always a valid solution even if the requested score
    // band could not be reached within the bounded number of attempts.
    if (best) return best
    throw new Error('Unable to generate a valid Hamiltonian ZIP level')
  }

  /** Randomized backbite moves preserve a Hamiltonian path while varying its shape. */
  randomHamiltonianPath(rng: Rng, size = BOARD_SIZE): number[] {
    const path: number[] = []
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        path.push(row * size + (row % 2 === 0 ? column : size - 1 - column))
      }
    }

    for (let iteration = 0; iteration < size * size * 60; iteration++) {
      if (rng() < 0.5) path.reverse()
      const end = path[path.length - 1]
      const before = path[path.length - 2]
      const choices = getOrthogonalNeighbors(end, size).filter((cell) => cell !== before)
      if (choices.length === 0) continue
      const target = pick(rng, choices)
      const index = path.indexOf(target)
      if (index < 0 || index === path.length - 1) continue
      path.splice(index + 1, path.length - index - 1, ...path.slice(index + 1).reverse())
    }
    return path
  }

  placeCheckpoints(
    rng: Rng,
    solution: number[],
    count: number,
    difficulty: LevelDifficulty
  ): number[] {
    const last = solution.length - 1
    const positions = new Set<number>([0, last])

    if (difficulty === 'easy') {
      for (let index = 1; index < count - 1; index++) {
        positions.add(Math.round((index * last) / (count - 1)))
      }
    } else if (difficulty === 'medium') {
      for (let index = 1; index < count - 1; index++) {
        const base = Math.round((index * last) / (count - 1))
        positions.add(Math.min(last - 1, Math.max(1, base + randomInt(rng, -2, 2))))
      }
    } else {
      const turnPositions: number[] = []
      for (let index = 1; index < last; index++) {
        if (solution[index] - solution[index - 1] !== solution[index + 1] - solution[index]) {
          turnPositions.push(index)
        }
      }
      for (const position of shuffle(rng, turnPositions)) {
        if (positions.size >= count) break
        positions.add(position)
      }
    }

    while (positions.size < count) positions.add(randomInt(rng, 1, last - 1))
    return [...positions].sort((a, b) => a - b).map((position) => solution[position])
  }

  measure(board: BoardDefinition, solution: number[]): DifficultyMetrics {
    const solutionSearch = this.solver.solve(board, [], {
      maxSolutions: SOLUTION_CAP,
      maxNodes: SEARCH_NODE_CAP,
    })
    const effortSearch = this.solver.solve(board, [], {
      maxSolutions: 1,
      maxNodes: SEARCH_NODE_CAP,
      heuristic: false,
    })
    const averageGap = (board.size * board.size - 1) / (board.checkpoints.length - 1)
    const solutionCount = solutionSearch.solutions.length
    const searchEffort = effortSearch.nodes
    const turns = countTurns(solution)
    const gapPart = Math.min(35, (averageGap / 9) * 35)
    const decisionPart =
      solutionCount > 1 ? (Math.log2(solutionCount) / Math.log2(SOLUTION_CAP)) * 25 : 0
    const effortPart = Math.min(25, (Math.log10(searchEffort + 1) / 5) * 25)
    const turnPart = Math.min(15, (turns / 30) * 15)

    return {
      checkpointCount: board.checkpoints.length,
      averageGap: Number(averageGap.toFixed(2)),
      solutionCount,
      searchEffort,
      turns,
      score: Math.round(gapPart + decisionPart + effortPart + turnPart),
    }
  }

  classify(score: number): LevelDifficulty {
    if (score >= SCORE_THRESHOLDS.hard) return 'hard'
    if (score >= SCORE_THRESHOLDS.medium) return 'medium'
    return 'easy'
  }

  private distanceToBand(score: number, difficulty: LevelDifficulty): number {
    const bands: Record<LevelDifficulty, [number, number]> = {
      easy: [0, SCORE_THRESHOLDS.medium - 1],
      medium: [SCORE_THRESHOLDS.medium, SCORE_THRESHOLDS.hard - 1],
      hard: [SCORE_THRESHOLDS.hard, 100],
    }
    const [minimum, maximum] = bands[difficulty]
    return score < minimum ? minimum - score : score > maximum ? score - maximum : 0
  }

  private defaultName(difficulty: LevelDifficulty, rng: Rng): string {
    const words: Record<LevelDifficulty, string[]> = {
      easy: ['Sunrise', 'Meadow', 'Breeze', 'Pebble', 'Ripple'],
      medium: ['Canyon', 'Labyrinth', 'Circuit', 'Orbit', 'Delta'],
      hard: ['Vortex', 'Eclipse', 'Inferno', 'Abyss', 'Titan'],
    }
    return `${pick(rng, words[difficulty])} #${randomInt(rng, 100, 999)}`
  }
}
