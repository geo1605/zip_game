import { DIFFICULTIES, type Difficulty } from '#utils/board_utils'
import { TARGET_SECONDS } from '#services/scoring_service'

export interface GamePerformance {
  difficulty: Difficulty
  durationSeconds: number
  mistakes: number
  hintsUsed: number
}

export type PerformanceRating = 'excellent' | 'normal' | 'poor'

export interface AdaptiveDecision {
  current: Difficulty
  recommended: Difficulty
  change: 'increase' | 'decrease' | 'keep'
  reason: string
}

/** Recommends a future difficulty from the player's latest three games. */
export default class AdaptiveDifficultyService {
  static readonly WINDOW = 3

  rate(game: GamePerformance): PerformanceRating {
    const target = TARGET_SECONDS[game.difficulty]
    if (game.durationSeconds <= target && game.hintsUsed === 0 && game.mistakes <= 2) {
      return 'excellent'
    }
    if (game.durationSeconds > target * 2 || game.hintsUsed >= 3 || game.mistakes >= 10) {
      return 'poor'
    }
    return 'normal'
  }

  decide(current: Difficulty, recentGames: GamePerformance[]): AdaptiveDecision {
    const window = recentGames
      .filter((game) => game.difficulty === current)
      .slice(0, AdaptiveDifficultyService.WINDOW)
    const ratings = window.map((game) => this.rate(game))
    const excellent = ratings.filter((rating) => rating === 'excellent').length
    const poor = ratings.filter((rating) => rating === 'poor').length
    const index = DIFFICULTIES.indexOf(current)

    if (excellent >= 2 && index < DIFFICULTIES.length - 1) {
      return {
        current,
        recommended: DIFFICULTIES[index + 1],
        change: 'increase',
        reason: `${excellent} excellent games in the last ${window.length}`,
      }
    }
    if (poor >= 2 && index > 0) {
      return {
        current,
        recommended: DIFFICULTIES[index - 1],
        change: 'decrease',
        reason: `${poor} poor games in the last ${window.length}`,
      }
    }
    return { current, recommended: current, change: 'keep', reason: 'Performance is stable' }
  }
}
