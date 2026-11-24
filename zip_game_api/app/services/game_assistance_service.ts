import type { LevelDifficulty } from '#models/level'
import ScoringService from '#services/scoring_service'
import { DIFFICULTIES } from '#utils/board_utils'

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

/** Server-side hints, scores, and a small performance based difficulty adjustment. */
export default class GameAssistanceService {
  private readonly scoring = new ScoringService()

  getHint(currentPath: number[], solution: number[]): HintResult | null {
    if (solution.length === 0) return null

    // Keep only the shared prefix. After a deviation, the client can undo back
    // to step - 1 and show this cell without repeats, skips, or diagonal moves.
    let step = 0
    while (
      step < currentPath.length &&
      step < solution.length &&
      currentPath[step] === solution[step]
    ) {
      step++
    }

    if (step >= solution.length) return null

    return {
      cell: solution[step],
      step: step + 1,
      reason:
        step < currentPath.length
          ? 'Undo to the shared prefix and continue from this step'
          : step === 0
            ? 'Start at the first cell'
            : 'Continue along a valid solution path',
    }
  }

  calculateScore(input: ScoreInput): number {
    return this.scoring.calculate({
      difficulty: input.difficulty,
      durationSeconds: input.elapsedSeconds,
      mistakes: input.mistakesCount,
      hintsUsed: input.hintsUsed,
    }).total
  }

  recommendDifficulty(
    currentDifficulty: LevelDifficulty,
    performance: PlayerPerformance
  ): LevelDifficulty {
    const currentIndex = DIFFICULTIES.indexOf(currentDifficulty)
    if (currentIndex < 0) return 'easy'

    const completionRate = Math.min(1, Math.max(0, performance.completionRate))
    const mistakes = Math.max(0, performance.averageMistakes)
    const hints = Math.max(0, performance.averageHints)

    const poor = completionRate < 0.45 || hints >= 3 || mistakes >= 10
    const excellent = completionRate >= 0.8 && hints === 0 && mistakes <= 2
    if (poor && currentIndex > 0) {
      return DIFFICULTIES[currentIndex - 1]
    }
    if (excellent && currentIndex < DIFFICULTIES.length - 1) {
      return DIFFICULTIES[currentIndex + 1]
    }
    return currentDifficulty
  }
}
