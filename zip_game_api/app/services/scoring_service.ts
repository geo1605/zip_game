import type { LevelDifficulty } from '#models/level'

export interface ScoreInput {
  difficulty: LevelDifficulty
  durationSeconds: number
  mistakes: number
  hintsUsed: number
}

export interface ScoreBreakdown {
  base: number
  timeBonus: number
  timePenalty: number
  mistakePenalty: number
  hintPenalty: number
  total: number
}

export const BASE_POINTS: Record<LevelDifficulty, number> = {
  easy: 1000,
  medium: 2000,
  hard: 3000,
}
export const TARGET_SECONDS: Record<LevelDifficulty, number> = {
  easy: 120,
  medium: 180,
  hard: 300,
}
export const MISTAKE_PENALTY = 25
export const HINT_PENALTY = 150

/** All points are computed on the server from the persisted game outcome. */
export default class ScoringService {
  calculate(input: ScoreInput): ScoreBreakdown {
    const base = BASE_POINTS[input.difficulty]
    const target = TARGET_SECONDS[input.difficulty]
    const duration = this.nonNegativeInteger(input.durationSeconds)
    const mistakes = this.nonNegativeInteger(input.mistakes)
    const hints = this.nonNegativeInteger(input.hintsUsed)
    const timeBonus = Math.max(0, target - duration) * 3
    const timePenalty = Math.max(0, duration - target) * 2
    const mistakePenalty = mistakes * MISTAKE_PENALTY
    const hintPenalty = hints * HINT_PENALTY
    const total = Math.max(Math.round(base * 0.1), base + timeBonus - timePenalty - mistakePenalty - hintPenalty)

    return { base, timeBonus, timePenalty, mistakePenalty, hintPenalty, total }
  }

  private nonNegativeInteger(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.max(0, Math.floor(value))
  }
}
