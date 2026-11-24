import type User from '#models/user'
import type Level from '#models/level'
import type { LevelClue, LevelDifficulty } from '#models/level'
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
