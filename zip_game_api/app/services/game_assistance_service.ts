import type { LevelDifficulty } from '#models/level'

export interface ScoreInput {
  difficulty: LevelDifficulty
  elapsedSeconds: number
  mistakesCount: number
  hintsUsed: number
}

export interface HintResult {
  cell: number
  step: number
  reason: string
}

export interface PlayerPerformance {
  /** Completion fraction between 0 and 1 over recent games. */
  completionRate: number
  averageMistakes: number
  averageHints: number
}

const DIFFICULTY_ORDER: LevelDifficulty[] = ['easy', 'medium', 'hard']
const DIFFICULTY_BONUS: Record<LevelDifficulty, number> = {
  easy: 0,
  medium: 150,
  hard: 300,
}

/** Server-side hints, scores, and a small performance based difficulty adjustment. */
export default class GameAssistanceService {
  getHint(currentPath: number[], solution: number[]): HintResult | null {
    if (solution.length === 0 || currentPath.length >= solution.length) return null

    // Exact-prefix play gets the immediate next step. If a client asks after a
    // mistake or a stale move, anchor the hint at its most recent cell on solution.
    let step = 0
    while (
      step < currentPath.length &&
      step < solution.length &&
      currentPath[step] === solution[step]
    ) {
      step++
    }

    if (step < currentPath.length) {
      const lastCell = currentPath[currentPath.length - 1]
      const lastMatchingStep = solution.lastIndexOf(lastCell)
      step = lastMatchingStep >= 0 ? lastMatchingStep + 1 : step
    }
    if (step >= solution.length) return null

    return {
      cell: solution[step],
      step: step + 1,
      reason: step === 0 ? 'Start at the first cell' : 'Continue along a valid solution path',
    }
  }

  calculateScore(input: ScoreInput): number {
    const elapsedSeconds = this.nonNegativeInteger(input.elapsedSeconds)
    const mistakesCount = this.nonNegativeInteger(input.mistakesCount)
    const hintsUsed = this.nonNegativeInteger(input.hintsUsed)
    const base = 1000 + DIFFICULTY_BONUS[input.difficulty]
    return Math.max(0, base - elapsedSeconds * 2 - mistakesCount * 25 - hintsUsed * 75)
  }

  recommendDifficulty(
    currentDifficulty: LevelDifficulty,
    performance: PlayerPerformance
  ): LevelDifficulty {
    const currentIndex = DIFFICULTY_ORDER.indexOf(currentDifficulty)
    if (currentIndex < 0) return 'easy'

    const completionRate = Math.min(1, Math.max(0, performance.completionRate))
    const mistakes = Math.max(0, performance.averageMistakes)
    const hints = Math.max(0, performance.averageHints)

    if (completionRate < 0.45 || hints >= 2.5 || mistakes >= 8) {
      return DIFFICULTY_ORDER[Math.max(0, currentIndex - 1)]
    }
    if (completionRate >= 0.8 && hints <= 1 && mistakes <= 3) {
      return DIFFICULTY_ORDER[Math.min(DIFFICULTY_ORDER.length - 1, currentIndex + 1)]
    }
    return currentDifficulty
  }

  private nonNegativeInteger(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.max(0, Math.floor(value))
  }
}
