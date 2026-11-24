import type User from '#models/user'
import type Level from '#models/level'
import type { LevelClue, LevelDifficulty } from '#models/level'
import type GameSession from '#models/game_session'
import type { GameSessionStatus } from '#models/game_session'
import type Score from '#models/score'
import type { LevelWithStatus } from '#repositories/level_repository'

export interface SerializedUser {
  id: number
  fullName: string
  email: string
  createdAt: string | null
}

export interface SerializedLevel {
  id: number
  name: string
  difficulty: LevelDifficulty
  gridSize: number
  clues: LevelClue[]
  isGenerated: boolean
  createdAt: string | null
}

export interface SerializedLevelWithStatus extends SerializedLevel {
  completed: boolean
  bestPoints: number | null
}

export interface SerializedScore {
  id: number
  userId: number
  levelId: number
  gameSessionId: number
  points: number
  elapsedSeconds: number
  mistakesCount: number
  hintsUsed: number
  createdAt: string | null
}

export interface SerializedGameSession {
  id: number
  userId: number
  levelId: number
  status: GameSessionStatus
  startedAt: string | null
  finishedAt: string | null
  elapsedSeconds: number
  mistakesCount: number
  hintsUsed: number
  level?: SerializedLevel
  score?: SerializedScore | null
}

export function serializeUser(user: User): SerializedUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    createdAt: user.createdAt?.toISO() ?? null,
  }
}

export function serializeLevel(level: Level): SerializedLevel {
  return {
    id: level.id,
    name: level.name,
    difficulty: level.difficulty,
    gridSize: level.gridSize,
    clues: level.clues,
    isGenerated: level.isGenerated,
    createdAt: level.createdAt?.toISO() ?? null,
  }
}

export function serializeLevelWithStatus(item: LevelWithStatus): SerializedLevelWithStatus {
  return {
    ...serializeLevel(item.level),
    completed: item.completed,
    bestPoints: item.bestPoints,
  }
}

export function serializeScore(score: Score): SerializedScore {
  return {
    id: score.id,
    userId: score.userId,
    levelId: score.levelId,
    gameSessionId: score.gameSessionId,
    points: score.points,
    elapsedSeconds: score.elapsedSeconds,
    mistakesCount: score.mistakesCount,
    hintsUsed: score.hintsUsed,
    createdAt: score.createdAt?.toISO() ?? null,
  }
}

export function serializeGameSession(session: GameSession): SerializedGameSession {
  const payload: SerializedGameSession = {
    id: session.id,
    userId: session.userId,
    levelId: session.levelId,
    status: session.status,
    startedAt: session.startedAt?.toISO() ?? null,
    finishedAt: session.finishedAt?.toISO() ?? null,
    elapsedSeconds: session.elapsedSeconds,
    mistakesCount: session.mistakesCount,
    hintsUsed: session.hintsUsed,
  }

  if (session.$preloaded.level && session.level) {
    payload.level = serializeLevel(session.level)
  }

  if ('score' in session.$preloaded) {
    payload.score = session.score ? serializeScore(session.score) : null
  }

  return payload
}
